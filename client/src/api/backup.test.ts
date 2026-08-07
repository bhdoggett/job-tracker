import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { backupApi } from "./backup";

describe("backupApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const archive = () => new File(["archive-bytes"], "backup.tar.gz", { type: "application/gzip" });

  describe("inspect", () => {
    it("posts the file to /api/backup/inspect and returns the parsed body", async () => {
      const payload = {
        manifest: { createdAt: "2026-08-05T12:00:00.000Z", hostname: "TestMac", rowCounts: { projects: 2 }, warnings: [] },
        current: { projects: 1 },
      };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => payload,
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await backupApi.inspect(archive());

      expect(result).toEqual(payload);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/backup/inspect");
      expect(options.method).toBe("POST");
      expect(options.body).toBeInstanceOf(FormData);
      expect((options.body as FormData).get("file")).toBeInstanceOf(File);
    });

    it("throws with the server's error message when the response is not ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          statusText: "Bad Request",
          json: async () => ({ error: "ENCRYPTION_KEY mismatch: ..." }),
        })
      );

      await expect(backupApi.inspect(archive())).rejects.toThrow("ENCRYPTION_KEY mismatch: ...");
    });
  });

  describe("restore", () => {
    it("posts the file to /api/backup/import", async () => {
      const payload = { rowCounts: { projects: 2 }, safetyExportPath: "/tmp/pre-import.tar.gz", warnings: [] };
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
      vi.stubGlobal("fetch", fetchMock);

      const result = await backupApi.restore(archive());

      expect(result).toEqual(payload);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/backup/import");
    });

    it("throws with the server's error message when the response is not ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          statusText: "Conflict",
          json: async () => ({ error: "Archive contains zero data rows" }),
        })
      );

      await expect(backupApi.restore(archive())).rejects.toThrow("Archive contains zero data rows");
    });
  });

  describe("download", () => {
    it("throws with the server's error message when the export is refused", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          statusText: "Conflict",
          json: async () => ({ error: "Export produced zero data rows" }),
        })
      );

      await expect(backupApi.download()).rejects.toThrow("Export produced zero data rows");
    });

    it("triggers a blob download on success", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          blob: async () => new Blob(["archive"]),
          headers: { get: () => 'attachment; filename="job-tracker-2026-08-05-TestMac.tar.gz"' },
        })
      );
      const createObjectURL = vi.fn(() => "blob:fake-url");
      const revokeObjectURL = vi.fn();
      vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
      let downloadAtClick: string | undefined;
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(function (this: HTMLAnchorElement) {
          // Capture at click-time so this also proves `download` was set
          // before the click fired, not just at some point afterward.
          downloadAtClick = this.download;
        });

      await backupApi.download();

      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(clickSpy).toHaveBeenCalledOnce();
      // A regex bug in filenameFromDisposition would go undetected without
      // this — createObjectURL/click/revokeObjectURL firing proves nothing
      // about whether the parsed filename actually made it onto the link.
      expect(downloadAtClick).toBe("job-tracker-2026-08-05-TestMac.tar.gz");
      // revokeObjectURL is deferred to the next tick (not called synchronously
      // alongside click()), so a browser that hasn't finished acting on the
      // click yet doesn't have the blob URL yanked out from under it.
      expect(revokeObjectURL).not.toHaveBeenCalled();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
    });
  });
});
