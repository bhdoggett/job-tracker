import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupSection } from "./BackupSection";
import { backupApi } from "../api/backup";

vi.mock("../api/backup", () => ({
  backupApi: {
    inspect: vi.fn(),
    restore: vi.fn(),
    download: vi.fn(),
  },
}));

const inspectMock = vi.mocked(backupApi.inspect);
const restoreMock = vi.mocked(backupApi.restore);
const downloadMock = vi.mocked(backupApi.download);

const PREVIEW = {
  manifest: {
    createdAt: "2026-08-05T22:37:10.000Z",
    hostname: "MacBook-Air",
    rowCounts: { projects: 2, tasks: 55 },
    warnings: [],
  },
  current: { projects: 1, tasks: 40 },
};

function archiveFile() {
  return new File(["archive-bytes"], "2026-08-05-MacBook-Air.tar.gz", { type: "application/gzip" });
}

async function selectFile() {
  const input = screen.getByLabelText(/choose a backup file/i);
  await userEvent.upload(input, archiveFile());
}

describe("BackupSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inspectMock.mockResolvedValue(PREVIEW);
    restoreMock.mockResolvedValue({
      rowCounts: { projects: 2, tasks: 55 },
      safetyExportPath: "/Users/me/job-tracker-backups/pre-import/pre-import-x.tar.gz",
      warnings: [],
    });
    downloadMock.mockResolvedValue(undefined);
  });

  it("downloads a backup when the export button is clicked", async () => {
    render(<BackupSection />);

    await userEvent.click(screen.getByRole("button", { name: /download backup/i }));

    await waitFor(() => expect(downloadMock).toHaveBeenCalledOnce());
  });

  it("shows an error when the export is refused", async () => {
    downloadMock.mockRejectedValue(new Error("Export produced zero data rows"));
    render(<BackupSection />);

    await userEvent.click(screen.getByRole("button", { name: /download backup/i }));

    expect(await screen.findByText(/export produced zero data rows/i)).toBeInTheDocument();
  });

  it("shows archive counts beside current counts after selecting a file", async () => {
    render(<BackupSection />);

    await selectFile();

    expect(await screen.findByText(/2026-08-05-MacBook-Air\.tar\.gz/)).toBeInTheDocument();
    expect(screen.getByText("MacBook-Air")).toBeInTheDocument();
    const projectsRow = screen.getByTestId("preview-row-projects");
    expect(projectsRow).toHaveTextContent("2");
    expect(projectsRow).toHaveTextContent("1");
  });

  it("does NOT restore when the preview is cancelled", async () => {
    render(<BackupSection />);
    await selectFile();
    await screen.findByRole("button", { name: /replace my data/i });

    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(restoreMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /replace my data/i })).not.toBeInTheDocument()
    );
  });

  it("restores exactly once with the selected file when confirmed", async () => {
    render(<BackupSection />);
    await selectFile();

    await userEvent.click(await screen.findByRole("button", { name: /replace my data/i }));

    await waitFor(() => expect(restoreMock).toHaveBeenCalledOnce());
    expect(restoreMock.mock.calls[0][0]).toBeInstanceOf(File);
    expect((restoreMock.mock.calls[0][0] as File).name).toBe("2026-08-05-MacBook-Air.tar.gz");
  });

  it("shows the inspect error and offers no confirm action", async () => {
    inspectMock.mockRejectedValue(
      new Error('ENCRYPTION_KEY mismatch: this archive was created on host "OtherMac"')
    );
    render(<BackupSection />);

    await selectFile();

    expect(await screen.findByText(/encryption_key mismatch/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /replace my data/i })).not.toBeInTheDocument();
    expect(restoreMock).not.toHaveBeenCalled();
  });

  it("displays warnings reported by a successful restore", async () => {
    restoreMock.mockResolvedValue({
      rowCounts: { projects: 2 },
      safetyExportPath: "/tmp/pre-import.tar.gz",
      warnings: ["Missing upload file: gone.pdf"],
    });
    render(<BackupSection />);
    await selectFile();

    await userEvent.click(await screen.findByRole("button", { name: /replace my data/i }));

    expect(await screen.findByText(/missing upload file: gone\.pdf/i)).toBeInTheDocument();
  });

  it("shows the safety snapshot path when a restore fails after committing", async () => {
    restoreMock.mockRejectedValue(new Error("Row count mismatch for \"projects\": expected 2, got 1"));
    render(<BackupSection />);
    await selectFile();

    await userEvent.click(await screen.findByRole("button", { name: /replace my data/i }));

    expect(await screen.findByText(/row count mismatch/i)).toBeInTheDocument();
  });
});
