// backend/src/routes/backup.ts
import { Hono } from "hono";
import { hostname } from "node:os";
import { join } from "node:path";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { db } from "../db/client";
import { UPLOADS_DIR, DEFAULT_BACKUP_DIR } from "../lib/paths";
import { exportData, EmptyExportError } from "../lib/backup/export";
import { importData } from "../lib/backup/import";
import { ManifestValidationError } from "../lib/backup/manifest";
import { RowCountMismatchError } from "../lib/backup/import-helpers";

export const backupRouter = new Hono();

backupRouter.get("/export", async (c) => {
  const stagingDir = await mkdtemp(join(tmpdir(), "job-tracker-export-"));
  const outPath = join(stagingDir, "export.tar.gz");
  try {
    const result = await exportData(db, { outPath, uploadsDir: UPLOADS_DIR });
    const fileData = await readFile(result.outPath);
    c.header("Content-Type", "application/gzip");
    c.header(
      "Content-Disposition",
      `attachment; filename="job-tracker-${new Date().toISOString().slice(0, 10)}-${hostname()}.tar.gz"`
    );
    return c.body(fileData);
  } catch (err) {
    if (err instanceof EmptyExportError) return c.json({ error: err.message }, 409);
    throw err;
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
});

backupRouter.post("/import", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"] as File;
  if (!file) return c.json({ error: "file required" }, 400);

  const stagingDir = await mkdtemp(join(tmpdir(), "job-tracker-import-"));
  const archivePath = join(stagingDir, "import.tar.gz");
  try {
    await writeFile(archivePath, Buffer.from(await file.arrayBuffer()));
    const result = await importData(db, {
      archivePath,
      uploadsDir: UPLOADS_DIR,
      safetyExportDir: DEFAULT_BACKUP_DIR,
    });
    return c.json(result);
  } catch (err) {
    if (err instanceof ManifestValidationError) return c.json({ error: err.message }, 400);
    if (err instanceof RowCountMismatchError) return c.json({ error: err.message }, 500);
    throw err;
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
});
