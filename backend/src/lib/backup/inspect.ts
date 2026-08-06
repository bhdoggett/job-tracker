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
