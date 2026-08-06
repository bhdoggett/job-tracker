import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import * as schema from "../../db/schema/index";

// Derived (not hand-maintained) so that a table added to db/schema/ is
// automatically included in every export/import/delete, with no separate
// entry to remember to add here. See order.test.ts for a test that asserts
// this set covers every PgTable exported from the schema module.
function deriveTables(): Record<string, PgTable> {
  const tables: Record<string, PgTable> = {};
  for (const value of Object.values(schema)) {
    if (is(value, PgTable)) {
      tables[getTableConfig(value).name] = value;
    }
  }
  return tables;
}

const TABLES: Record<string, PgTable> = deriveTables();

export function tableByName(name: string): PgTable {
  const table = TABLES[name];
  if (!table) throw new Error(`Unknown table "${name}"`);
  return table;
}

export function hasSerialPrimaryKey(name: string): boolean {
  const config = getTableConfig(tableByName(name));
  return config.columns.some((col) => col.name === "id" && col.primary);
}

export function insertOrder(): string[] {
  const dependsOn = new Map<string, Set<string>>();
  for (const name of Object.keys(TABLES)) dependsOn.set(name, new Set());

  for (const [name, table] of Object.entries(TABLES)) {
    const { foreignKeys } = getTableConfig(table);
    for (const fk of foreignKeys) {
      const refTable = fk.reference().foreignTable;
      const refName = getTableConfig(refTable).name;
      if (refName !== name && TABLES[refName]) {
        dependsOn.get(name)!.add(refName);
      }
    }
  }

  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular foreign key dependency involving "${name}"`);
    }
    visiting.add(name);
    for (const dep of dependsOn.get(name)!) visit(dep);
    visiting.delete(name);
    visited.add(name);
    sorted.push(name);
  }

  for (const name of Object.keys(TABLES).sort()) visit(name);
  return sorted;
}

export function deleteOrder(): string[] {
  return [...insertOrder()].reverse();
}
