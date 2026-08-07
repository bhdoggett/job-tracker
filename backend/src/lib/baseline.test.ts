import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";
import { runMigrations, MIGRATIONS_FOLDER } from "./migrate";
import { baselineMigrations } from "./baseline";
import { setupTestDb } from "./backup/test-db";
import * as schema from "../db/schema/index";

type Db = PostgresJsDatabase<typeof schema>;

async function ledgerCount(db: Db): Promise<number> {
  const rows = await db.execute<{ count: string }>(
    sql`select count(*)::text as count from "drizzle"."__drizzle_migrations"`,
  );
  return Number(rows[0]?.count ?? 0);
}

describe("baselineMigrations", () => {
  let db: Db;
  let teardown: () => Promise<void>;

  beforeAll(async () => {
    const ctx = await setupTestDb();
    db = ctx.db;
    teardown = ctx.teardown;
  });

  afterAll(async () => {
    await teardown();
  });

  it("records every migration without running its DDL, so migrate() then boots", async () => {
    // Simulate a schema built by `drizzle-kit push`: tables present, ledger empty.
    await db.execute(sql`delete from "drizzle"."__drizzle_migrations"`);
    expect(await ledgerCount(db)).toBe(0);

    const result = await baselineMigrations(db, MIGRATIONS_FOLDER);

    expect(result.outcome).toBe("baselined");
    expect(result.inserted).toBeGreaterThan(0);
    expect(result.tags[0]).toBe("0000_real_menace");
    expect(await ledgerCount(db)).toBe(result.inserted);

    // The regression this exists to prevent: before baselining, this call dies
    // with 'column "notes" of relation "projects" already exists' and the
    // backend never starts.
    await expect(runMigrations(db)).resolves.toBeUndefined();
  });

  it("is a no-op when migrations are already tracked", async () => {
    const before = await ledgerCount(db);
    expect(before).toBeGreaterThan(0);

    const result = await baselineMigrations(db, MIGRATIONS_FOLDER);

    expect(result.outcome).toBe("already-tracked");
    expect(result.inserted).toBe(0);
    expect(await ledgerCount(db)).toBe(before);
  });

  it("refuses to baseline a database with no tables", async () => {
    // A fresh database must run migrations normally. Baselining one would
    // leave a populated ledger over a schema that does not exist.
    const dbName = "job_tracker_baseline_empty_test";
    const adminUrl = new URL(env.DATABASE_URL);
    adminUrl.pathname = "/postgres";
    const admin = postgres(adminUrl.toString(), { max: 1 });
    try {
      await admin.unsafe(`DROP DATABASE IF EXISTS ${dbName}`);
      await admin.unsafe(`CREATE DATABASE ${dbName}`);
    } finally {
      await admin.end();
    }

    const emptyUrl = new URL(env.DATABASE_URL);
    emptyUrl.pathname = `/${dbName}`;
    const client = postgres(emptyUrl.toString());
    const emptyDb = drizzle(client, { schema });

    try {
      const result = await baselineMigrations(emptyDb, MIGRATIONS_FOLDER);
      expect(result.outcome).toBe("empty-database");
      expect(result.inserted).toBe(0);
      expect(await ledgerCount(emptyDb)).toBe(0);
    } finally {
      await client.end();
    }
  });
});
