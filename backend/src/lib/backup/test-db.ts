// backend/src/lib/backup/test-db.ts
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "../env";
import { runMigrations } from "../migrate";
import * as schema from "../../db/schema/index";
import { insertOrder } from "./order";

function withDatabaseName(url: string, dbName: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${dbName}`;
  return parsed.toString();
}

export async function setupTestDb(): Promise<{
  db: PostgresJsDatabase<typeof schema>;
  uploadsDir: string;
  workDir: string;
  truncateAll: () => Promise<void>;
  teardown: () => Promise<void>;
}> {
  const adminClient = postgres(withDatabaseName(env.DATABASE_URL, "postgres"), { max: 1 });
  try {
    await adminClient.unsafe("CREATE DATABASE job_tracker_test");
  } catch (err) {
    if ((err as { code?: string }).code !== "42P04") throw err; // 42P04 = database already exists
  } finally {
    await adminClient.end();
  }

  const testClient = postgres(withDatabaseName(env.DATABASE_URL, "job_tracker_test"));
  const db = drizzle(testClient, { schema });
  await runMigrations(db);

  const workDir = await mkdtemp(join(tmpdir(), "job-tracker-test-"));
  const uploadsDir = join(workDir, "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const truncateAll = async () => {
    const tables = insertOrder().join(", ");
    await testClient.unsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  };

  const teardown = async () => {
    await testClient.end();
    await rm(workDir, { recursive: true, force: true });
  };

  return { db, uploadsDir, workDir, truncateAll, teardown };
}
