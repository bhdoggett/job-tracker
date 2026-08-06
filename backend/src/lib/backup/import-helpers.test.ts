// backend/src/lib/backup/import-helpers.test.ts
import { describe, it, expect } from "vitest";
import {
  buildSetvalSql,
  assertRowCountsMatch,
  reviveTimestamps,
  RowCountMismatchError,
} from "./import-helpers";
import { timeEntries, timeEntryTasks } from "../../db/schema/index";

describe("buildSetvalSql", () => {
  it("generates a setval call guarded against an empty table", () => {
    const generated = buildSetvalSql("projects");
    expect(generated).toContain("setval(pg_get_serial_sequence('projects', 'id')");
    expect(generated).toContain("SELECT MAX(id) FROM projects");
  });
});

describe("assertRowCountsMatch", () => {
  it("passes silently when counts match exactly", () => {
    expect(() =>
      assertRowCountsMatch({ projects: 2, tasks: 1 }, { projects: 2, tasks: 1 })
    ).not.toThrow();
  });

  it("throws with expected vs actual when a table's count differs", () => {
    expect(() => assertRowCountsMatch({ projects: 2 }, { projects: 1 })).toThrow(
      RowCountMismatchError
    );
  });

  it("throws when an expected table is missing from actual counts", () => {
    expect(() =>
      assertRowCountsMatch({ projects: 1, tasks: 1 }, { projects: 1 })
    ).toThrow(/tasks/);
  });
});

describe("reviveTimestamps", () => {
  it("converts ISO timestamp strings back into Date objects for timestamp columns", () => {
    const rows = reviveTimestamps(timeEntries, [
      { id: 1, startedAt: "2026-06-01T09:00:00.000Z", notes: "x" },
    ]);
    expect(rows[0].startedAt).toBeInstanceOf(Date);
    expect((rows[0].startedAt as Date).toISOString()).toBe("2026-06-01T09:00:00.000Z");
  });

  it("leaves non-timestamp fields untouched", () => {
    const rows = reviveTimestamps(timeEntries, [{ id: 1, notes: "unchanged" }]);
    expect(rows[0].notes).toBe("unchanged");
  });

  it("passes rows through unmodified for tables with no timestamp columns", () => {
    const rows = reviveTimestamps(timeEntryTasks, [{ timeEntryId: 1, taskId: 2 }]);
    expect(rows).toEqual([{ timeEntryId: 1, taskId: 2 }]);
  });
});
