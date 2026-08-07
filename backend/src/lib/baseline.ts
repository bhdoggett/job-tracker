import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as schema from "../db/schema/index";

export type BaselineOutcome = "already-tracked" | "empty-database" | "baselined";

export interface BaselineResult {
  outcome: BaselineOutcome;
  inserted: number;
  tags: string[];
}

type Db = PostgresJsDatabase<typeof schema>;

/**
 * Mirrors the DDL drizzle's own migrator runs before it reads the ledger, so
 * baselining works whether or not migrate() has ever been attempted here.
 */
async function ensureLedger(db: Db): Promise<void> {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function ledgerCount(db: Db): Promise<number> {
  const rows = await db.execute<{ count: string }>(
    sql`select count(*)::text as count from "drizzle"."__drizzle_migrations"`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function publicTableCount(db: Db): Promise<number> {
  const rows = await db.execute<{ count: string }>(
    sql`select count(*)::text as count from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function journalTags(migrationsFolder: string): Promise<string[]> {
  const raw = await readFile(join(migrationsFolder, "meta", "_journal.json"), "utf8");
  const journal = JSON.parse(raw) as { entries: { tag: string }[] };
  return journal.entries.map((e) => e.tag);
}

/**
 * Records every migration as already applied WITHOUT executing any of its DDL.
 *
 * For databases whose schema was built with `drizzle-kit push` (which creates
 * tables but writes no ledger rows). Once auto-migrate runs at startup, such a
 * database replays from 0000: `CREATE TABLE IF NOT EXISTS` no-ops, then the
 * first `ALTER TABLE ... ADD COLUMN` fails on a column push already created,
 * and the backend never boots.
 *
 * Refuses to act in the two cases where it would be wrong:
 *  - ledger already populated  -> migrations are tracked; nothing to do
 *  - no tables in public       -> genuinely fresh; run migrations normally
 *
 * ASSUMES the existing schema matches the final migration state. That holds
 * when push was run from this same schema definition. If the schema drifted,
 * baselining hides the drift rather than fixing it -- verify with
 * `drizzle-kit check` if unsure.
 */
export async function baselineMigrations(
  db: Db,
  migrationsFolder: string,
): Promise<BaselineResult> {
  await ensureLedger(db);

  if ((await ledgerCount(db)) > 0) {
    return { outcome: "already-tracked", inserted: 0, tags: [] };
  }

  if ((await publicTableCount(db)) === 0) {
    return { outcome: "empty-database", inserted: 0, tags: [] };
  }

  // drizzle's own reader: keeps the hash format in lockstep with the library
  // rather than reimplementing sha256-of-file here.
  const migrations = readMigrationFiles({ migrationsFolder });
  const tags = await journalTags(migrationsFolder);

  await db.transaction(async (tx) => {
    for (const migration of migrations) {
      await tx.execute(
        sql`insert into "drizzle"."__drizzle_migrations" ("hash", "created_at")
            values (${migration.hash}, ${migration.folderMillis})`,
      );
    }
  });

  return { outcome: "baselined", inserted: migrations.length, tags };
}
