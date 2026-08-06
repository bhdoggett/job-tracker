// backend/src/lib/backup/import.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { create } from "tar";
import { setupTestDb } from "./test-db";
import { exportData } from "./export";
import { readArchive } from "./archive";
import { importData } from "./import";
import { ManifestValidationError } from "./manifest";
import { projects, tasks, timeEntries } from "../../db/schema/index";

describe("importData", () => {
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

  it("round-trips data through export and import, preserving FK integrity and resetting sequences", async () => {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Round Trip Co", clientName: "Client A", rate: "150.00" })
      .returning();

    const [task] = await ctx.db
      .insert(tasks)
      .values({ projectId: project.id, title: "Do the thing" })
      .returning();

    await ctx.db.insert(timeEntries).values({
      projectId: project.id,
      taskId: task.id,
      durationMin: 90,
      notes: "Round trip entry",
      startedAt: new Date("2026-06-01T09:00:00.000Z"),
    });

    const archivePath = join(ctx.workDir, "roundtrip.tar.gz");
    await exportData(ctx.db, { outPath: archivePath, uploadsDir: ctx.uploadsDir });

    await ctx.truncateAll();

    const result = await importData(ctx.db, {
      archivePath,
      uploadsDir: ctx.uploadsDir,
      safetyExportDir: ctx.workDir,
    });

    expect(result.rowCounts.projects).toBe(1);
    expect(result.rowCounts.tasks).toBe(1);
    expect(result.rowCounts.time_entries).toBe(1);

    const restoredEntries = await ctx.db.select().from(timeEntries);
    expect(restoredEntries[0].projectId).toBe(project.id);
    expect(restoredEntries[0].taskId).toBe(task.id);
    expect(restoredEntries[0].startedAt).toBeInstanceOf(Date);
    expect(restoredEntries[0].startedAt?.toISOString()).toBe("2026-06-01T09:00:00.000Z");

    // Sequence must have been reset past the imported id, not left at 1.
    const [newProject] = await ctx.db
      .insert(projects)
      .values({ name: "After Import", clientName: "Client B", rate: "50.00" })
      .returning();
    expect(newProject.id).toBeGreaterThan(project.id);
  });

  it("leaves the database untouched when the archive fails manifest validation", async () => {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Untouched Co", clientName: "Client", rate: "1.00" })
      .returning();
    void project;

    const goodArchivePath = join(ctx.workDir, "good.tar.gz");
    await exportData(ctx.db, { outPath: goodArchivePath, uploadsDir: ctx.uploadsDir });

    const { manifest, extractDir } = await readArchive(goodArchivePath);
    const corrupted = { ...(manifest as object), formatVersion: 999 };
    await writeFile(join(extractDir, "manifest.json"), JSON.stringify(corrupted));

    const corruptArchivePath = join(ctx.workDir, "corrupt.tar.gz");
    await create(
      { gzip: true, file: corruptArchivePath, cwd: extractDir },
      ["manifest.json", "data.json", "uploads"]
    );

    await expect(
      importData(ctx.db, {
        archivePath: corruptArchivePath,
        uploadsDir: ctx.uploadsDir,
        safetyExportDir: ctx.workDir,
      })
    ).rejects.toThrow(ManifestValidationError);

    const rows = await ctx.db.select().from(projects);
    expect(rows).toHaveLength(1);
  });
});
