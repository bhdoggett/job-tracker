// backend/src/lib/backup/inspect.ts
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { rm } from "node:fs/promises";
import * as schema from "../../db/schema/index";
import { env } from "../env";
import { readArchive } from "./archive";
import { validateManifest, fingerprintKey } from "./manifest";
import { countAllRows } from "./counts";

/** The file could not be opened as a job-tracker archive at all. */
export class ArchiveUnreadableError extends Error {}

/**
 * The manifest's claimed row counts don't match the row counts actually
 * present in the archive's data.json — e.g. a truncated archive with an
 * intact (stale) manifest. The preview must never vouch for a count it
 * hasn't verified, since the user relies on it to decide whether it's safe
 * to wipe the live database. Such an archive is corrupt either way, and
 * `importData` would fail its own post-commit check after the wipe has
 * already happened — refusing here catches it before anything is touched.
 */
export class ArchiveDataMismatchError extends Error {}

function verifyRowCounts(rowCounts: Record<string, number>, data: unknown): void {
  const typedData = (data ?? {}) as Record<string, unknown>;
  const mismatches: string[] = [];
  for (const [table, claimed] of Object.entries(rowCounts)) {
    const rows = typedData[table];
    const actual = Array.isArray(rows) ? rows.length : 0;
    if (actual !== claimed) {
      mismatches.push(`"${table}" (manifest claims ${claimed}, archive data has ${actual})`);
    }
  }
  if (mismatches.length > 0) {
    throw new ArchiveDataMismatchError(
      `Archive manifest row counts do not match its data — refusing to trust this archive: ` +
        mismatches.join(", ")
    );
  }
}

export interface InspectResult {
  manifest: {
    createdAt: string;
    hostname: string;
    rowCounts: Record<string, number>;
    warnings: string[];
  };
  current: Record<string, number>;
}

/**
 * Read an archive's manifest and report it next to the current database's row
 * counts. Never writes to the database — this powers the restore preview, so
 * a bad key or a wrong file is caught before anything is replaced.
 */
export async function inspectArchive(
  db: PostgresJsDatabase<typeof schema>,
  options: { archivePath: string }
): Promise<InspectResult> {
  let archive: Awaited<ReturnType<typeof readArchive>>;
  try {
    archive = await readArchive(options.archivePath);
  } catch (err) {
    throw new ArchiveUnreadableError(
      `Could not read "${options.archivePath}" as a backup archive: ${(err as Error).message}`
    );
  }

  try {
    const manifest = validateManifest(archive.manifest, fingerprintKey(env.ENCRYPTION_KEY));
    verifyRowCounts(manifest.rowCounts, archive.data);
    const current = await countAllRows(db);
    return {
      manifest: {
        createdAt: manifest.createdAt,
        hostname: manifest.hostname,
        rowCounts: manifest.rowCounts,
        warnings: manifest.warnings ?? [],
      },
      current,
    };
  } finally {
    await rm(archive.extractDir, { recursive: true, force: true });
  }
}
