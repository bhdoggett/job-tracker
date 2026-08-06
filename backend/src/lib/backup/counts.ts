import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../../db/schema/index";
import { insertOrder, tableByName } from "./order";

/** Live row count for every exported table, keyed by database table name. */
export async function countAllRows(
  db: PostgresJsDatabase<typeof schema>
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const name of insertOrder()) {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tableByName(name) as any);
    counts[name] = row?.count ?? 0;
  }
  return counts;
}
