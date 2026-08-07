// backend/src/routes/backup.ts
import { Hono } from "hono";
import { hostname } from "node:os";
import { join } from "node:path";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { db } from "../db/client";
import { env } from "../lib/env";
import { UPLOADS_DIR, SAFETY_EXPORT_DIR } from "../lib/paths";
import { exportData, EmptyExportError } from "../lib/backup/export";
import { importData, EmptyImportError } from "../lib/backup/import";
import { inspectArchive, ArchiveUnreadableError, ArchiveDataMismatchError } from "../lib/backup/inspect";
import { ManifestValidationError } from "../lib/backup/manifest";
import { RowCountMismatchError } from "../lib/backup/import-helpers";

export const backupRouter = new Hono();

// backup.sh matches archives with `hostname -s` (the short name); Node's
// os.hostname() returns the FQDN. Use the short form here too so a download
// from this route lands in the same naming convention backup.sh prunes.
const shortHostname = hostname().split(".")[0];

backupRouter.get("/export", async (c) => {
  const stagingDir = await mkdtemp(join(tmpdir(), "job-tracker-export-"));
  const outPath = join(stagingDir, "export.tar.gz");
  try {
    const result = await exportData(db, { outPath, uploadsDir: UPLOADS_DIR });
    const fileData = await readFile(result.outPath);
    c.header("Content-Type", "application/gzip");
    c.header(
      "Content-Disposition",
      `attachment; filename="job-tracker-${new Date().toISOString().slice(0, 10)}-${shortHostname}.tar.gz"`
    );
    return c.body(fileData);
  } catch (err) {
    if (err instanceof EmptyExportError) return c.json({ error: err.message }, 409);
    throw err;
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
});

// Read-only preview of an archive, used by the restore confirmation UI.
// Validates the ENCRYPTION_KEY fingerprint here so a key mismatch is reported
// before the user commits to replacing their data.
backupRouter.post("/inspect", async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) return c.json({ error: "file required" }, 400);

  const stagingDir = await mkdtemp(join(tmpdir(), "job-tracker-inspect-"));
  const archivePath = join(stagingDir, "inspect.tar.gz");
  try {
    await writeFile(archivePath, Buffer.from(await file.arrayBuffer()));
    return c.json(await inspectArchive(db, { archivePath }));
  } catch (err) {
    if (err instanceof ArchiveUnreadableError) return c.json({ error: err.message }, 400);
    if (err instanceof ManifestValidationError) return c.json({ error: err.message }, 400);
    if (err instanceof ArchiveDataMismatchError) return c.json({ error: err.message }, 400);
    throw err;
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
});

// The import endpoint is destructive (it replaces the entire database), and
// a cross-origin HTML form posting multipart/form-data is a CORS-"simple"
// request — the browser sends it regardless of CORS policy, which only hides
// the response from the attacking page. So any page open in the user's
// browser could otherwise trigger a full wipe just by having the app running
// locally. Reject anything that isn't same-origin (or has no Origin/
// Sec-Fetch-Site at all, which covers curl/CLI usage).
const ALLOWED_LOCAL_ORIGINS = new Set([
  `http://localhost:${env.PORT}`,
  `http://127.0.0.1:${env.PORT}`,
]);

function isSameOriginRequest(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const secFetchSite = c.req.header("Sec-Fetch-Site");
  if (secFetchSite !== undefined) {
    return secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none";
  }

  const origin = c.req.header("Origin");
  if (origin === undefined) return true; // no Origin/Sec-Fetch-Site: curl/CLI-style request

  return ALLOWED_LOCAL_ORIGINS.has(origin);
}

backupRouter.post("/import", async (c) => {
  if (!isSameOriginRequest(c)) {
    return c.json({ error: "Cross-origin import requests are not allowed" }, 403);
  }

  const body = await c.req.parseBody();
  const file = body["file"];
  if (!(file instanceof File)) return c.json({ error: "file required" }, 400);

  const stagingDir = await mkdtemp(join(tmpdir(), "job-tracker-import-"));
  const archivePath = join(stagingDir, "import.tar.gz");
  try {
    await writeFile(archivePath, Buffer.from(await file.arrayBuffer()));
    const result = await importData(db, {
      archivePath,
      uploadsDir: UPLOADS_DIR,
      safetyExportDir: SAFETY_EXPORT_DIR,
    });
    return c.json(result);
  } catch (err) {
    if (err instanceof EmptyImportError) return c.json({ error: err.message }, 409);
    if (err instanceof ManifestValidationError) return c.json({ error: err.message }, 400);
    if (err instanceof RowCountMismatchError) {
      return c.json({ error: err.message, safetyExportPath: err.safetyExportPath }, 500);
    }
    throw err;
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
});
