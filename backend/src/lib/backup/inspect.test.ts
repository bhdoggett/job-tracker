// backend/src/lib/backup/inspect.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { create } from "tar";
import { setupTestDb } from "./test-db";
import { exportData } from "./export";
import { readArchive } from "./archive";
import { inspectArchive, ArchiveUnreadableError } from "./inspect";
import { ManifestValidationError } from "./manifest";
import { projects, tasks } from "../../db/schema/index";

describe("inspectArchive", () => {
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

  async function seedAndExport(archiveName: string) {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Inspect Co", clientName: "Client", rate: "99.00" })
      .returning();
    await ctx.db.insert(tasks).values({ projectId: project.id, title: "A task" });
    const archivePath = join(ctx.workDir, archiveName);
    await exportData(ctx.db, { outPath: archivePath, uploadsDir: ctx.uploadsDir });
    return archivePath;
  }

  it("returns the archive manifest alongside current database counts", async () => {
    const archivePath = await seedAndExport("inspect.tar.gz");

    const result = await inspectArchive(ctx.db, { archivePath });

    expect(result.manifest.rowCounts.projects).toBe(1);
    expect(result.manifest.rowCounts.tasks).toBe(1);
    expect(typeof result.manifest.createdAt).toBe("string");
    expect(typeof result.manifest.hostname).toBe("string");
    expect(result.manifest.warnings).toEqual([]);
    expect(result.current.projects).toBe(1);
    expect(result.current.tasks).toBe(1);
  });

  it("reports current counts that differ from the archive's", async () => {
    const archivePath = await seedAndExport("diff.tar.gz");
    await ctx.db.insert(projects).values({ name: "Added Later", clientName: "C", rate: "1.00" });

    const result = await inspectArchive(ctx.db, { archivePath });

    expect(result.manifest.rowCounts.projects).toBe(1);
    expect(result.current.projects).toBe(2);
  });

  it("does not modify the database", async () => {
    const archivePath = await seedAndExport("readonly.tar.gz");
    const before = await ctx.db.select().from(projects);

    await inspectArchive(ctx.db, { archivePath });

    const after = await ctx.db.select().from(projects);
    expect(after).toEqual(before);
  });

  it("rejects an archive whose manifest fails validation", async () => {
    const archivePath = await seedAndExport("good.tar.gz");
    const { manifest, extractDir } = await readArchive(archivePath);
    await writeFile(
      join(extractDir, "manifest.json"),
      JSON.stringify({ ...(manifest as object), formatVersion: 999 })
    );
    const corruptPath = join(ctx.workDir, "corrupt.tar.gz");
    await create({ gzip: true, file: corruptPath, cwd: extractDir }, [
      "manifest.json",
      "data.json",
      "uploads",
    ]);

    await expect(inspectArchive(ctx.db, { archivePath: corruptPath })).rejects.toThrow(
      ManifestValidationError
    );
  });

  it("rejects a file that is not a readable archive", async () => {
    const notAnArchive = join(ctx.workDir, "notanarchive.tar.gz");
    await writeFile(notAnArchive, "this is definitely not a gzip archive");

    await expect(inspectArchive(ctx.db, { archivePath: notAnArchive })).rejects.toThrow(
      ArchiveUnreadableError
    );
  });
});
