import { PgColumn, type PgTable } from "drizzle-orm/pg-core";

export class RowCountMismatchError extends Error {}

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
