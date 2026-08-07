// backend/src/lib/backup/import.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { create } from "tar";
import { setupTestDb } from "./test-db";
import { exportData } from "./export";
import { readArchive, writeArchive } from "./archive";
import { importData, EmptyImportError } from "./import";
import { ManifestValidationError } from "./manifest";
import { RowCountMismatchError } from "./import-helpers";
import { access } from "node:fs/promises";
import { projects, tasks, timeEntries, docs } from "../../db/schema/index";

/**
 * Builds a well-formed but all-zero archive (valid fingerprint, valid
 * rowCounts shape, every count 0) directly from a real export's manifest, so
 * the zero-row tests don't need a second physical database — setupTestDb()
 * always points at the same shared job_tracker_test database, so calling it
 * twice within one test would corrupt ctx's own state instead of providing
 * an isolated empty DB.
 */
async function buildZeroRowArchive(
  templateArchivePath: string,
  outPath: string,
  uploadsDir: string
): Promise<void> {
  const { manifest } = await readArchive(templateArchivePath);
  const tableNames = Object.keys((manifest as { rowCounts: Record<string, number> }).rowCounts);
  const zeroManifest = {
    ...(manifest as object),
    rowCounts: Object.fromEntries(tableNames.map((name) => [name, 0])),
  };
  const emptyData = Object.fromEntries(tableNames.map((name) => [name, []]));
  await writeArchive({
    outPath,
    manifest: zeroManifest,
    data: emptyData,
    uploadsDir,
    uploadFiles: [],
  });
}

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

  it("refuses to import a zero-row archive and leaves the database untouched", async () => {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Must Survive Co", clientName: "Client", rate: "1.00" })
      .returning();

    const templateArchivePath = join(ctx.workDir, "template-for-zero.tar.gz");
    await exportData(ctx.db, { outPath: templateArchivePath, uploadsDir: ctx.uploadsDir });

    const emptyArchivePath = join(ctx.workDir, "empty.tar.gz");
    await buildZeroRowArchive(templateArchivePath, emptyArchivePath, ctx.uploadsDir);

    await expect(
      importData(ctx.db, {
        archivePath: emptyArchivePath,
        uploadsDir: ctx.uploadsDir,
        safetyExportDir: ctx.workDir,
      })
    ).rejects.toThrow(EmptyImportError);

    const rows = await ctx.db.select().from(projects);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(project.id);
    expect(rows[0].name).toBe("Must Survive Co");
  });

  it("permits importing a zero-row archive when allowEmpty is explicitly set", async () => {
    await ctx.db
      .insert(projects)
      .values({ name: "Will Be Wiped Co", clientName: "Client", rate: "1.00" })
      .returning();

    const templateArchivePath = join(ctx.workDir, "template-for-zero-allowed.tar.gz");
    await exportData(ctx.db, { outPath: templateArchivePath, uploadsDir: ctx.uploadsDir });

    const emptyArchivePath = join(ctx.workDir, "empty-allowed.tar.gz");
    await buildZeroRowArchive(templateArchivePath, emptyArchivePath, ctx.uploadsDir);

    const result = await importData(ctx.db, {
      archivePath: emptyArchivePath,
      uploadsDir: ctx.uploadsDir,
      safetyExportDir: ctx.workDir,
      allowEmpty: true,
    });

    const total = Object.values(result.rowCounts).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);

    const rows = await ctx.db.select().from(projects);
    expect(rows).toHaveLength(0);
  });

  it("surfaces manifest warnings on the ImportResult", async () => {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Warn Co", clientName: "Client", rate: "1.00" })
      .returning();

    // A doc row whose file is missing from uploadsDir produces a warning
    // (see export.test.ts). Import must surface that warning back out, not
    // swallow it.
    await ctx.db.insert(docs).values({
      projectId: project.id,
      title: "Missing Doc",
      fileName: "gone.pdf",
      filePath: "gone.pdf",
      mimeType: "application/pdf",
      size: 0,
    });

    const archivePath = join(ctx.workDir, "warn.tar.gz");
    await exportData(ctx.db, { outPath: archivePath, uploadsDir: ctx.uploadsDir });

    await ctx.truncateAll();

    const result = await importData(ctx.db, {
      archivePath,
      uploadsDir: ctx.uploadsDir,
      safetyExportDir: ctx.workDir,
    });

    expect(result.warnings).toEqual(["Missing upload file: gone.pdf"]);
  });

  it("attaches the safety export path to RowCountMismatchError so it can be surfaced after a post-commit failure", async () => {
    await ctx.db
      .insert(projects)
      .values({ name: "Mismatch Setup Co", clientName: "Client", rate: "1.00" })
      .returning();

    const goodArchivePath = join(ctx.workDir, "good-for-mismatch.tar.gz");
    await exportData(ctx.db, { outPath: goodArchivePath, uploadsDir: ctx.uploadsDir });

    // Lie about the row count for a table so the post-import verification
    // (which runs after the DB has already been replaced) fails.
    const { manifest, extractDir } = await readArchive(goodArchivePath);
    const lyingManifest = {
      ...(manifest as { rowCounts: Record<string, number> }),
      rowCounts: {
        ...(manifest as { rowCounts: Record<string, number> }).rowCounts,
        projects: ((manifest as { rowCounts: Record<string, number> }).rowCounts.projects ?? 0) + 1,
      },
    };
    await writeFile(join(extractDir, "manifest.json"), JSON.stringify(lyingManifest));
    const lyingArchivePath = join(ctx.workDir, "lying.tar.gz");
    await create(
      { gzip: true, file: lyingArchivePath, cwd: extractDir },
      ["manifest.json", "data.json", "uploads"]
    );

    let caught: unknown;
    try {
      await importData(ctx.db, {
        archivePath: lyingArchivePath,
        uploadsDir: ctx.uploadsDir,
        safetyExportDir: ctx.workDir,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(RowCountMismatchError);
    const mismatchErr = caught as RowCountMismatchError;
    expect(mismatchErr.safetyExportPath).toBeTruthy();
    // The safety export must actually exist on disk at the reported path.
    await expect(access(mismatchErr.safetyExportPath!)).resolves.toBeUndefined();
  });

  it("attaches the safety export path to a post-commit failure that is NOT a row-count mismatch (e.g. restoreUploads failing)", async () => {
    const [project] = await ctx.db
      .insert(projects)
      .values({ name: "Uploads Fail Co", clientName: "Client", rate: "1.00" })
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

    const archivePath = join(ctx.workDir, "uploads-fail.tar.gz");
    await exportData(ctx.db, { outPath: archivePath, uploadsDir: ctx.uploadsDir });

    // A destination uploads directory that was never created: readdir() on
    // the archive's uploads/ succeeds (there's a file to restore), but
    // copyFile() into this nonexistent directory fails with ENOENT — a
    // plain Node fs error, not a RowCountMismatchError. This runs after the
    // transaction has already committed, so the DB has been replaced by the
    // time this throws.
    const missingUploadsDir = join(ctx.workDir, "never-created-uploads-dir");

    let caught: unknown;
    try {
      await importData(ctx.db, {
        archivePath,
        uploadsDir: missingUploadsDir,
        safetyExportDir: ctx.workDir,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).not.toBeInstanceOf(RowCountMismatchError);
    expect(caught).toBeInstanceOf(Error);
    const err = caught as Error & { safetyExportPath?: string };
    expect(err.safetyExportPath).toBeTruthy();
    await expect(access(err.safetyExportPath!)).resolves.toBeUndefined();

    // Confirm the DB really was replaced (not rolled back) — this is exactly
    // why the safety path must not be lost on this error path.
    const rows = await ctx.db.select().from(projects);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Uploads Fail Co");
  });
});
