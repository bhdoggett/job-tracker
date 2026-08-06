import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeArchive, readArchive } from "./archive";

const EXTRACT_DIR_PREFIX = "job-tracker-import-";

async function extractDirCount(): Promise<number> {
  const entries = await readdir(tmpdir());
  return entries.filter((name) => name.startsWith(EXTRACT_DIR_PREFIX)).length;
}

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

  it("does not corrupt either archive when two writes to the same outPath run concurrently", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "job-tracker-archive-test-"));
    cleanupDirs.push(workDir);
    const uploadsDir = join(workDir, "uploads-src");
    await mkdir(uploadsDir, { recursive: true });

    const outPath = join(workDir, "concurrent.tar.gz");

    // Simulates the 23:00 launchd run overlapping a manual `npm run export`:
    // both write to the same outPath. Before the fix, both used the same
    // literal `${outPath}.tmp`, so their writes could interleave into one
    // corrupt temp file that both renames then "succeed" on.
    await Promise.all([
      writeArchive({
        outPath,
        manifest: { formatVersion: 1, run: "a" },
        data: { projects: [{ id: 1 }] },
        uploadsDir,
        uploadFiles: [],
      }),
      writeArchive({
        outPath,
        manifest: { formatVersion: 1, run: "b" },
        data: { projects: [{ id: 2 }] },
        uploadsDir,
        uploadFiles: [],
      }),
    ]);

    // Whichever write won the final rename, the result must be one of the
    // two complete, valid archives — never a corrupt merge of both.
    const result = await readArchive(outPath);
    cleanupDirs.push(result.extractDir);
    const run = (result.manifest as { run: string }).run;
    expect(["a", "b"]).toContain(run);
    if (run === "a") {
      expect(result.data).toEqual({ projects: [{ id: 1 }] });
    } else {
      expect(result.data).toEqual({ projects: [{ id: 2 }] });
    }
  });

  it("does not leak its extraction temp directory when the archive cannot be extracted", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "job-tracker-archive-test-"));
    cleanupDirs.push(workDir);
    const notAnArchive = join(workDir, "corrupt.tar.gz");
    await writeFile(notAnArchive, "this is definitely not a gzip archive");

    // Not an assertion on the absolute count in $TMPDIR — other tests/processes
    // may have their own job-tracker-import-* dirs (including pre-existing,
    // pre-fix leftovers). This only asserts readArchive doesn't add a new one
    // of its own when it fails.
    const before = await extractDirCount();

    await expect(readArchive(notAnArchive)).rejects.toThrow();

    const after = await extractDirCount();
    expect(after).toBe(before);
  });
});
