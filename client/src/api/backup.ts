const BASE = "/api/backup";

export interface InspectResponse {
  manifest: {
    createdAt: string;
    hostname: string;
    rowCounts: Record<string, number>;
    warnings: string[];
  };
  current: Record<string, number>;
}

export interface RestoreResponse {
  rowCounts: Record<string, number>;
  safetyExportPath: string;
  warnings: string[];
}

/**
 * Thrown by `postFile` on a non-OK response. Carries `safetyExportPath` when
 * the server reports one — e.g. a restore that failed after already
 * replacing the database, where that path is the user's only way back.
 */
export class BackupApiError extends Error {
  safetyExportPath?: string;

  constructor(message: string, safetyExportPath?: string) {
    super(message);
    this.name = "BackupApiError";
    this.safetyExportPath = safetyExportPath;
  }
}

async function postFile<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(path, { method: "POST", body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new BackupApiError(err.error ?? res.statusText, err.safetyExportPath);
  }
  return res.json() as Promise<T>;
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="([^"]+)"/.exec(header);
  return match ? match[1] : null;
}

export const backupApi = {
  inspect: (file: File) => postFile<InspectResponse>(`${BASE}/inspect`, file),

  restore: (file: File) => postFile<RestoreResponse>(`${BASE}/import`, file),

  /**
   * Fetch the archive and save it. Uses fetch rather than a plain link so a
   * refused export (409 on an empty database) surfaces as an error the UI can
   * display instead of navigating to a JSON error page.
   */
  async download(): Promise<void> {
    const res = await fetch(`${BASE}/export`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? res.statusText);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filenameFromDisposition(res.headers.get("Content-Disposition")) ?? "job-tracker-backup.tar.gz";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
