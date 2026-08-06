// backend/src/lib/backup/import.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { readdir, copyFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import * as schema from "../../db/schema/index";
import { env } from "../env";
import { deleteOrder, insertOrder, tableByName, hasSerialPrimaryKey } from "./order";
import { validateManifest, fingerprintKey, type Manifest } from "./manifest";
import { readArchive } from "./archive";
import {
  buildSetvalSql,
  assertRowCountsMatch,
  reviveTimestamps,
  RowCountMismatchError,
} from "./import-helpers";
import { exportData } from "./export";
import { countAllRows } from "./counts";

export class EmptyImportError extends Error {}

export interface ImportOptions {
  archivePath: string;
  uploadsDir: string;
  safetyExportDir: string;
  /** Opt out of the zero-row-archive refusal. Off by default — see EmptyImportError. */
  allowEmpty?: boolean;
}

export interface ImportResult {
  rowCounts: Record<string, number>;
  safetyExportPath: string;
  warnings: string[];
}

async function filesAreIdentical(a: string, b: string): Promise<boolean> {
  try {
    const [bufA, bufB] = await Promise.all([readFile(a), readFile(b)]);
    return bufA.equals(bufB);
  } catch {
    return false;
  }
}

async function restoreUploads(sourceDir: string, uploadsDir: string): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(sourceDir);
  } catch {
    return; // archive had no uploads/ directory
  }
  for (const name of entries) {
    const src = join(sourceDir, name);
    const dest = join(uploadsDir, name);
    if (!(await filesAreIdentical(src, dest))) {
      await copyFile(src, dest);
    }
  }
}

export async function importData(
  db: PostgresJsDatabase<typeof schema>,
  options: ImportOptions
): Promise<ImportResult> {
  const { manifest, data, extractDir } = await readArchive(options.archivePath);
  try {
    const validated = validateManifest(manifest, fingerprintKey(env.ENCRYPTION_KEY)) as Manifest;
    const typedData = data as Record<string, Record<string, unknown>[]>;

    // Refuse a zero-row archive before touching the safety export or the DB.
    // This is the counterpart to EmptyExportError: without it, a manifest
    // with all-zero rowCounts sails through assertRowCountsMatch (0 === 0)
    // after the wipe has already happened.
    const totalRows = Object.values(validated.rowCounts).reduce((a, b) => a + b, 0);
    if (totalRows === 0 && !options.allowEmpty) {
      throw new EmptyImportError(
        `Archive contains zero data rows across all tables — refusing to import "${options.archivePath}". ` +
          "Pass allowEmpty to override."
      );
    }

    const safetyExportPath = join(
      options.safetyExportDir,
      `pre-import-${new Date().toISOString().replace(/[:.]/g, "-")}.tar.gz`
    );
    await exportData(db, {
      outPath: safetyExportPath,
      uploadsDir: options.uploadsDir,
      allowEmpty: true,
    });

    try {
      await db.transaction(async (tx) => {
        for (const name of deleteOrder()) {
          await tx.delete(tableByName(name) as any);
        }
        for (const name of insertOrder()) {
          const rows = reviveTimestamps(tableByName(name), typedData[name] ?? []);
          if (rows.length > 0) {
            await tx.insert(tableByName(name) as any).values(rows as any);
          }
        }
        for (const name of insertOrder()) {
          if (hasSerialPrimaryKey(name)) {
            await tx.execute(sql.raw(buildSetvalSql(name)));
          }
        }
      });

      await restoreUploads(join(extractDir, "uploads"), options.uploadsDir);

      const liveRowCounts = await countAllRows(db);
      assertRowCountsMatch(validated.rowCounts, liveRowCounts);

      return { rowCounts: liveRowCounts, safetyExportPath, warnings: validated.warnings ?? [] };
    } catch (err) {
      // The DB has already been replaced by this point — the safety export
      // is exactly what's needed to recover, so its location must not be
      // lost on the error path.
      if (err instanceof RowCountMismatchError) {
        err.safetyExportPath = safetyExportPath;
      }
      throw err;
    }
  } finally {
    await rm(extractDir, { recursive: true, force: true });
  }
}
