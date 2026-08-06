import { PgColumn, type PgTable } from "drizzle-orm/pg-core";

export class RowCountMismatchError extends Error {
  /**
   * Path to the pre-import safety export written just before the DB was
   * replaced. Set by import.ts once known — this is the one moment the
   * safety archive matters most, so its location must not be lost.
   */
  safetyExportPath?: string;
}

/**
 * Attach `safetyExportPath` to any error object so it survives to the route
 * handler. Used for every failure that can occur after the transaction has
 * committed (RowCountMismatchError, but also whatever `restoreUploads` or
 * `countAllRows` throw) — at that point the DB has already been replaced, so
 * the safety export's location must never be lost on the error path. Errors
 * that aren't plain objects (e.g. a thrown string) are left alone.
 */
export function attachSafetyExportPath(err: unknown, safetyExportPath: string): void {
  if (typeof err === "object" && err !== null) {
    (err as { safetyExportPath?: string }).safetyExportPath = safetyExportPath;
  }
}

export function buildSetvalSql(tableName: string): string {
  return (
    `SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), ` +
    `COALESCE((SELECT MAX(id) FROM ${tableName}), 1), ` +
    `(SELECT MAX(id) FROM ${tableName}) IS NOT NULL)`
  );
}

export function assertRowCountsMatch(
  expected: Record<string, number>,
  actual: Record<string, number>
): void {
  for (const [table, expectedCount] of Object.entries(expected)) {
    const actualCount = actual[table] ?? 0;
    if (actualCount !== expectedCount) {
      throw new RowCountMismatchError(
        `Row count mismatch for "${table}": expected ${expectedCount}, got ${actualCount}`
      );
    }
  }
}

function timestampFieldNames(table: PgTable): string[] {
  return Object.entries(table as unknown as Record<string, unknown>)
    .filter((entry): entry is [string, PgColumn] => entry[1] instanceof PgColumn)
    .filter(([, col]) => col.getSQLType().startsWith("timestamp"))
    .map(([key]) => key);
}

export function reviveTimestamps(
  table: PgTable,
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  const fields = timestampFieldNames(table);
  if (fields.length === 0) return rows;

  return rows.map((row) => {
    const revived = { ...row };
    for (const field of fields) {
      const value = revived[field];
      if (typeof value === "string") revived[field] = new Date(value);
    }
    return revived;
  });
}
