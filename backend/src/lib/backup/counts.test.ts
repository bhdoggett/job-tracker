import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb } from "./test-db";
import { countAllRows } from "./counts";
import { projects, tasks } from "../../db/schema/index";

describe("countAllRows", () => {
  let ctx: Awaited<ReturnType<typeof setupTestDb>>;

  beforeAll(async () => {
    ctx = await setupTestDb();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  beforeEach(async () => {
    await ctx.truncateAll();
  });

  it("reports zero for every table when the database is empty", async () => {
    const counts = await countAllRows(ctx.db);
    expect(counts.projects).toBe(0);
    expect(counts.tasks).toBe(0);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });

  it("counts rows per table", async () => {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Counted", clientName: "Client", rate: "10.00" })
      .returning();
    await ctx.db.insert(tasks).values([
      { projectId: project.id, title: "One" },
      { projectId: project.id, title: "Two" },
    ]);

    const counts = await countAllRows(ctx.db);
    expect(counts.projects).toBe(1);
    expect(counts.tasks).toBe(2);
    expect(counts.invoices).toBe(0);
  });

  it("includes an entry for every table in the export set", async () => {
    const counts = await countAllRows(ctx.db);
    for (const name of [
      "projects", "tasks", "time_entries", "time_entry_tasks", "invoices",
      "invoice_line_items", "invoice_time_entries", "expenses", "docs", "profile",
    ]) {
      expect(counts).toHaveProperty(name);
    }
  });
});
