import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupSection } from "./BackupSection";
import { backupApi, BackupApiError, type InspectResponse, type RestoreResponse } from "../api/backup";

vi.mock("../api/backup", async () => {
  const actual = await vi.importActual<typeof import("../api/backup")>("../api/backup");
  return {
    ...actual,
    backupApi: {
      inspect: vi.fn(),
      restore: vi.fn(),
      download: vi.fn(),
    },
  };
});

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
    // Assert by cell position, not row-wide text: "Projects 2 1" and a
    // swapped "Projects 1 2" both satisfy toHaveTextContent("2") /
    // toHaveTextContent("1") on the whole row, so that style of assertion
    // can't tell a correct archive/current layout from a swapped one.
    const cells = within(projectsRow).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("2"); // Archive
    expect(cells[1]).toHaveTextContent("1"); // Current
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
    restoreMock.mockRejectedValue(
      new BackupApiError(
        'Row count mismatch for "projects": expected 2, got 1',
        "/Users/me/job-tracker-backups/pre-import/pre-import-y.tar.gz"
      )
    );
    render(<BackupSection />);
    await selectFile();

    await userEvent.click(await screen.findByRole("button", { name: /replace my data/i }));

    expect(await screen.findByText(/row count mismatch/i)).toBeInTheDocument();
    expect(
      screen.getByText(/pre-import\/pre-import-y\.tar\.gz/)
    ).toBeInTheDocument();
  });

  it("ignores a superseded inspect response when a second file is selected first", async () => {
    let resolveFirst!: (v: InspectResponse) => void;
    let resolveSecond!: (v: InspectResponse) => void;
    const firstPromise = new Promise<InspectResponse>((resolve) => {
      resolveFirst = resolve;
    });
    const secondPromise = new Promise<InspectResponse>((resolve) => {
      resolveSecond = resolve;
    });

    inspectMock.mockImplementationOnce(() => firstPromise);
    inspectMock.mockImplementationOnce(() => secondPromise);

    render(<BackupSection />);
    const input = screen.getByLabelText(/choose a backup file/i);

    const staleFile = new File(["a"], "stale-archive.tar.gz", { type: "application/gzip" });
    const freshFile = new File(["b"], "fresh-archive.tar.gz", { type: "application/gzip" });

    await userEvent.upload(input, staleFile);
    // The file input is disabled while the modal is open (see the
    // disabled-input test), so a second file can only be picked after
    // cancelling — Cancel isn't gated on the inspect still being in flight,
    // only on a restore being in flight, so this closes the modal and
    // re-enables the input while the first inspect() call is still pending.
    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    await userEvent.upload(input, freshFile);

    // The fresh (second) request wins the race and resolves first; the stale
    // (first) request arrives late, as it would over a slow network. Without
    // a staleness guard, the late arrival would clobber the fresh preview.
    resolveSecond(PREVIEW);
    await screen.findByText("MacBook-Air");

    // Give the late (stale) resolution's continuation a chance to run before
    // asserting it had no effect, wrapped in act() since (when the guard is
    // working) it produces no state update at all.
    await act(async () => {
      resolveFirst({
        manifest: {
          createdAt: "2020-01-01T00:00:00.000Z",
          hostname: "StaleHost",
          rowCounts: { projects: 999 },
          warnings: [],
        },
        current: { projects: 1 },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText("MacBook-Air")).toBeInTheDocument();
    expect(screen.queryByText("StaleHost")).not.toBeInTheDocument();
    expect(screen.getByText(/fresh-archive\.tar\.gz/)).toBeInTheDocument();
  });

  it("disables the file input while the modal is open and while a restore is in flight", async () => {
    let resolveRestore!: (v: RestoreResponse) => void;
    restoreMock.mockImplementation(
      () =>
        new Promise<RestoreResponse>((resolve) => {
          resolveRestore = resolve;
        })
    );

    render(<BackupSection />);
    const input = screen.getByLabelText(/choose a backup file/i);
    expect(input).not.toBeDisabled();

    await selectFile();
    expect(input).toBeDisabled();

    await userEvent.click(await screen.findByRole("button", { name: /replace my data/i }));
    expect(await screen.findByRole("button", { name: /restoring/i })).toBeInTheDocument();
    expect(input).toBeDisabled();

    resolveRestore({ rowCounts: { projects: 2 }, safetyExportPath: "/tmp/x.tar.gz", warnings: [] });

    await waitFor(() => expect(input).not.toBeDisabled());
  });

  it("ignores Escape while a restore is in flight", async () => {
    let resolveRestore!: (v: RestoreResponse) => void;
    restoreMock.mockImplementation(
      () =>
        new Promise<RestoreResponse>((resolve) => {
          resolveRestore = resolve;
        })
    );

    render(<BackupSection />);
    await selectFile();
    await userEvent.click(await screen.findByRole("button", { name: /replace my data/i }));

    // Restore is now in flight (button shows the pending label).
    expect(await screen.findByRole("button", { name: /restoring/i })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    // The modal must still be open — Escape must not act as an implicit cancel mid-restore.
    expect(screen.getByText(/restore from backup/i)).toBeInTheDocument();
    expect(restoreMock).toHaveBeenCalledOnce();

    resolveRestore({ rowCounts: { projects: 2 }, safetyExportPath: "/tmp/x.tar.gz", warnings: [] });

    await waitFor(() =>
      expect(screen.queryByText(/restore from backup/i)).not.toBeInTheDocument()
    );
  });
});
