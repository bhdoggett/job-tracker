import { hostname } from "node:os";
import { join } from "node:path";
import { db, queryClient } from "../db/client";
import { runMigrations } from "../lib/migrate";
import { UPLOADS_DIR, DEFAULT_BACKUP_DIR } from "../lib/paths";
import { exportData, EmptyExportError } from "../lib/backup/export";
import { importData } from "../lib/backup/import";
import { ManifestValidationError } from "../lib/backup/manifest";
import { RowCountMismatchError } from "../lib/backup/import-helpers";

async function main(): Promise<number> {
  const [, , command, ...rest] = process.argv;

  if (command === "export") {
    const outPath =
      rest[0] ??
      join(DEFAULT_BACKUP_DIR, `${new Date().toISOString().slice(0, 10)}-${hostname()}.tar.gz`);
    try {
      const result = await exportData(db, { outPath, uploadsDir: UPLOADS_DIR });
      const total = Object.values(result.rowCounts).reduce((a, b) => a + b, 0);
      console.log(`Exported ${total} rows to ${result.outPath}`);
      if (result.warnings.length > 0) {
        console.warn(`Warnings:\n${result.warnings.join("\n")}`);
      }
      return 0;
    } catch (err) {
      if (err instanceof EmptyExportError) {
        console.error(`Export refused: ${err.message}`);
      } else {
        console.error(`Export failed: ${(err as Error).message}`);
      }
      return 1;
    }
  }

  if (command === "import") {
    const archivePath = rest[0];
    if (!archivePath) {
      console.error("Usage: npm run import -- <path-to-archive>");
      return 1;
    }
    try {
      await runMigrations(db);
      const result = await importData(db, {
        archivePath,
        uploadsDir: UPLOADS_DIR,
        safetyExportDir: DEFAULT_BACKUP_DIR,
      });
      const total = Object.values(result.rowCounts).reduce((a, b) => a + b, 0);
      console.log(
        `Imported ${total} rows. Safety export of the previous state: ${result.safetyExportPath}`
      );
      return 0;
    } catch (err) {
      if (err instanceof ManifestValidationError || err instanceof RowCountMismatchError) {
        console.error(`Import failed: ${err.message}`);
      } else {
        console.error(`Import failed: ${(err as Error).message}`);
      }
      return 1;
    }
  }

  console.error("Usage: npm run export -- [path]  |  npm run import -- <path>");
  return 1;
}

main()
  .then(async (code) => {
    await queryClient.end();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(err);
    await queryClient.end();
    process.exit(1);
  });
