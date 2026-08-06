import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeArchive, readArchive } from "./archive";

describe("writeArchive / readArchive", () => {
  const cleanupDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      cleanupDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
    );
  });

  it("round-trips manifest, data, and uploaded files through a .tar.gz archive", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "job-tracker-archive-test-"));
    cleanupDirs.push(workDir);

    const uploadsDir = join(workDir, "uploads-src");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, "a.pdf"), "pdf-a-content");

    const outPath = join(workDir, "out.tar.gz");
    const manifest = { formatVersion: 1, foo: "bar" };
    const data = { projects: [{ id: 1, name: "Test" }] };

    await writeArchive({ outPath, manifest, data, uploadsDir, uploadFiles: ["a.pdf"] });

    const result = await readArchive(outPath);
    cleanupDirs.push(result.extractDir);

    expect(result.manifest).toEqual(manifest);
    expect(result.data).toEqual(data);
    const restored = await readFile(join(result.extractDir, "uploads", "a.pdf"), "utf8");
    expect(restored).toBe("pdf-a-content");
  });

  it("produces an archive with no uploads entries when uploadFiles is empty", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "job-tracker-archive-test-"));
    cleanupDirs.push(workDir);
    const uploadsDir = join(workDir, "uploads-src");
    await mkdir(uploadsDir, { recursive: true });

    const outPath = join(workDir, "out-empty.tar.gz");
    await writeArchive({
      outPath,
      manifest: { formatVersion: 1 },
      data: {},
      uploadsDir,
      uploadFiles: [],
    });

    const result = await readArchive(outPath);
    cleanupDirs.push(result.extractDir);
    expect(result.manifest).toEqual({ formatVersion: 1 });
    expect(result.data).toEqual({});
  });
});
