import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as schema from "../db/schema/index";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_FOLDER = join(__dirname, "../db/migrations");

export async function runMigrations(db: PostgresJsDatabase<typeof schema>): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
