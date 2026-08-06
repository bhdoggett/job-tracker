// backend/src/lib/backup/export.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setupTestDb } from "./test-db";
import { exportData, EmptyExportError } from "./export";
import { readArchive } from "./archive";
import { projects, docs } from "../../db/schema/index";

describe("exportData", () => {
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

  it("refuses to export an empty database", async () => {
    const outPath = join(ctx.workDir, "empty.tar.gz");
    await expect(exportData(ctx.db, { outPath, uploadsDir: ctx.uploadsDir })).rejects.toThrow(
      EmptyExportError
    );
  });

  it("exports a non-empty database with correct manifest counts and uploaded files", async () => {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Test Project", clientName: "Test Client", rate: "100.00" })
      .returning();

    await writeFile(join(ctx.uploadsDir, "doc1.pdf"), "fake pdf content");
    await ctx.db.insert(docs).values({
      projectId: project.id,
      title: "Doc 1",
      fileName: "doc1.pdf",
      filePath: "doc1.pdf",
      mimeType: "application/pdf",
      size: 17,
    });

    const outPath = join(ctx.workDir, "export.tar.gz");
    const result = await exportData(ctx.db, { outPath, uploadsDir: ctx.uploadsDir });

    expect(result.rowCounts.projects).toBe(1);
    expect(result.rowCounts.docs).toBe(1);
    expect(result.warnings).toEqual([]);

    const { manifest, data, extractDir } = await readArchive(outPath);
    expect((manifest as { rowCounts: Record<string, number> }).rowCounts.projects).toBe(1);
    expect((data as Record<string, unknown[]>).projects).toHaveLength(1);
    const restoredFile = await readFile(join(extractDir, "uploads", "doc1.pdf"), "utf8");
    expect(restoredFile).toBe("fake pdf content");
  });

  it("warns instead of failing when a doc's file is missing from uploadsDir", async () => {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Test Project", clientName: "Test Client", rate: "100.00" })
      .returning();

    await ctx.db.insert(docs).values({
      projectId: project.id,
      title: "Missing Doc",
      fileName: "missing.pdf",
      filePath: "missing.pdf",
      mimeType: "application/pdf",
      size: 0,
    });

    const outPath = join(ctx.workDir, "export-warn.tar.gz");
    const result = await exportData(ctx.db, { outPath, uploadsDir: ctx.uploadsDir });
    expect(result.warnings).toEqual(["Missing upload file: missing.pdf"]);
  });
});
