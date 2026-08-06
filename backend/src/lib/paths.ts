// backend/src/lib/paths.ts
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = join(__dirname, "../../uploads");
export const DEFAULT_BACKUP_DIR = join(homedir(), "job-tracker-backups");
