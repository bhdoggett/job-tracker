import { create, extract } from "tar";
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

export async function writeArchive(params: {
  outPath: string;
  manifest: unknown;
  data: unknown;
  uploadsDir: string;
  uploadFiles: string[];
}): Promise<void> {
  const stagingDir = await mkdtemp(join(tmpdir(), "job-tracker-export-"));
  try {
    await writeFile(join(stagingDir, "manifest.json"), JSON.stringify(params.manifest, null, 2));
    await writeFile(join(stagingDir, "data.json"), JSON.stringify(params.data));

    const stagedUploads = join(stagingDir, "uploads");
    await mkdir(stagedUploads, { recursive: true });
    for (const file of params.uploadFiles) {
      await copyFile(join(params.uploadsDir, file), join(stagedUploads, file));
    }

    await mkdir(dirname(params.outPath), { recursive: true });
    // Include the pid and a random suffix so two concurrent exports to the
    // same outPath (e.g. the nightly launchd run overlapping a manual `npm
    // run export`) never interleave writes into one shared temp file.
    const tmpOut = `${params.outPath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    await create({ gzip: true, file: tmpOut, cwd: stagingDir }, ["manifest.json", "data.json", "uploads"]);
    await rename(tmpOut, params.outPath);
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

export async function readArchive(
  archivePath: string
): Promise<{ manifest: unknown; data: unknown; extractDir: string }> {
  const extractDir = await mkdtemp(join(tmpdir(), "job-tracker-import-"));
  // Ownership of extractDir only passes to the caller once every step below
  // has succeeded. If extraction or parsing throws — e.g. the uploaded file
  // isn't a valid tar.gz at all — this function must clean up the directory
  // it created itself, since the caller was never handed the path to do so.
  try {
    await extract({ file: archivePath, cwd: extractDir });
    const manifest = JSON.parse(await readFile(join(extractDir, "manifest.json"), "utf8"));
    const data = JSON.parse(await readFile(join(extractDir, "data.json"), "utf8"));
    return { manifest, data, extractDir };
  } catch (err) {
    await rm(extractDir, { recursive: true, force: true });
    throw err;
  }
}
