// backend/src/lib/backup/export.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { hostname } from "node:os";
import { join } from "node:path";
import { stat } from "node:fs/promises";
import * as schema from "../../db/schema/index";
import { env } from "../env";
import { insertOrder, tableByName } from "./order";
import { buildManifest, fingerprintKey } from "./manifest";
import { writeArchive } from "./archive";

export class EmptyExportError extends Error {}

export interface ExportOptions {
  outPath: string;
  uploadsDir: string;
  /** Opt out of the zero-row assertion. Used only by import's pre-import safety export. */
  allowEmpty?: boolean;
}

export interface ExportResult {
  outPath: string;
  rowCounts: Record<string, number>;
  warnings: string[];
}

export async function exportData(
  db: PostgresJsDatabase<typeof schema>,
  options: ExportOptions
): Promise<ExportResult> {
  const order = insertOrder();
  const data: Record<string, unknown[]> = {};
  const rowCounts: Record<string, number> = {};

  for (const name of order) {
    const rows = await db.select().from(tableByName(name) as any);
    data[name] = rows;
    rowCounts[name] = rows.length;
  }

  const totalRows = Object.values(rowCounts).reduce((a, b) => a + b, 0);
  if (totalRows === 0 && !options.allowEmpty) {
    throw new EmptyExportError(
      "Export produced zero data rows across all tables — refusing to write an empty backup."
    );
  }

  const warnings: string[] = [];
  const docsRows = (data["docs"] ?? []) as Array<{ filePath: string }>;
  const uploadFiles: string[] = [];
  for (const doc of docsRows) {
    const filePath = join(options.uploadsDir, doc.filePath);
    try {
      await stat(filePath);
      uploadFiles.push(doc.filePath);
    } catch {
      warnings.push(`Missing upload file: ${doc.filePath}`);
    }
  }

  const manifest = buildManifest({
    hostname: hostname(),
    keyFingerprint: fingerprintKey(env.ENCRYPTION_KEY),
    rowCounts,
    warnings,
  });

  await writeArchive({
    outPath: options.outPath,
    manifest,
    data,
    uploadsDir: options.uploadsDir,
    uploadFiles,
  });

  return { outPath: options.outPath, rowCounts, warnings };
}
