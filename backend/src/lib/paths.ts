// backend/src/lib/paths.ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = join(__dirname, "../../uploads");
export const DEFAULT_BACKUP_DIR = join(homedir(), "job-tracker-backups");
// Pre-import safety exports go in their own subdirectory, distinct from
// restorable snapshots, so they can never be confused with (or accidentally
// picked as) a real backup to restore from — see EmptyImportError in
// backup/import.ts for why that confusion is dangerous.
export const SAFETY_EXPORT_DIR = join(DEFAULT_BACKUP_DIR, "pre-import");
