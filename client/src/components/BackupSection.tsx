import { useState } from "react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { backupApi, type InspectResponse, type RestoreResponse } from "../api/backup";
import styles from "./BackupSection.module.css";

/** Display order and labels for the preview table. */
const TABLE_LABELS: [key: string, label: string][] = [
  ["projects", "Projects"],
  ["tasks", "Tasks"],
  ["time_entries", "Time entries"],
  ["time_entry_tasks", "Time entry tasks"],
  ["invoices", "Invoices"],
  ["invoice_line_items", "Invoice line items"],
  ["invoice_time_entries", "Invoice time entries"],
  ["expenses", "Expenses"],
  ["docs", "Documents"],
  ["profile", "Profile"],
];

function total(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

export function BackupSection() {
  const [exportError, setExportError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<InspectResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState(false);

  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<RestoreResponse | null>(null);

  const modalOpen = selectedFile !== null;

  const handleDownload = async () => {
    setExportError(null);
    setDownloading(true);
    try {
      await backupApi.download();
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after cancelling
    if (!file) return;

    setSelectedFile(file);
    setPreview(null);
    setPreviewError(null);
    setRestoreError(null);
    setRestoreResult(null);
    setInspecting(true);
    try {
      setPreview(await backupApi.inspect(file));
    } catch (err) {
      setPreviewError((err as Error).message);
    } finally {
      setInspecting(false);
    }
  };

  const closeModal = () => {
    setSelectedFile(null);
    setPreview(null);
    setPreviewError(null);
    setInspecting(false);
  };

  const handleConfirmRestore = async () => {
    if (!selectedFile) return;
    setRestoring(true);
    setRestoreError(null);
    try {
      const result = await backupApi.restore(selectedFile);
      setRestoreResult(result);
      closeModal();
    } catch (err) {
      setRestoreError((err as Error).message);
      closeModal();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Backup &amp; Restore</h2>

      <div className={styles.block}>
        <p className={styles.blurb}>
          Download a complete copy of your data — projects, tasks, time entries, invoices,
          expenses and uploaded documents — as a single archive.
        </p>
        <Button type="button" onClick={handleDownload} disabled={downloading}>
          {downloading ? "Preparing…" : "Download backup"}
        </Button>
        {exportError && <p className={styles.error}>{exportError}</p>}
      </div>

      <div className={styles.block}>
        <p className={styles.blurb}>
          Restoring replaces <strong>everything</strong> currently in the app with the contents of
          a backup archive. You&rsquo;ll see what the archive contains before anything changes.
        </p>
        <label className={styles.fileLabel} htmlFor="backup-restore-file">
          Choose a backup file
        </label>
        <input
          id="backup-restore-file"
          className={styles.fileInput}
          type="file"
          accept=".gz,.tgz,application/gzip"
          onChange={handleFileChange}
        />
        {restoreError && <p className={styles.error}>{restoreError}</p>}
        {restoreResult && (
          <div className={styles.result}>
            <p className={styles.success}>
              Restored {total(restoreResult.rowCounts)} rows.
            </p>
            <p className={styles.detail}>
              Previous data saved to <code>{restoreResult.safetyExportPath}</code>
            </p>
            {restoreResult.warnings.map((w) => (
              <p key={w} className={styles.warning}>
                {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <Modal title="Restore from backup" onClose={closeModal}>
          <div className={styles.modalBody}>
            <p className={styles.fileName}>{selectedFile?.name}</p>

            {inspecting && <p className={styles.detail}>Reading archive…</p>}

            {previewError && <p className={styles.error}>{previewError}</p>}

            {preview && (
              <>
                <dl className={styles.meta}>
                  <dt>Created</dt>
                  <dd>{new Date(preview.manifest.createdAt).toLocaleString()}</dd>
                  <dt>From</dt>
                  <dd>{preview.manifest.hostname}</dd>
                </dl>

                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">&nbsp;</th>
                      <th scope="col">Archive</th>
                      <th scope="col">Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TABLE_LABELS.filter(([key]) => key in preview.manifest.rowCounts).map(
                      ([key, label]) => (
                        <tr key={key} data-testid={`preview-row-${key}`}>
                          <th scope="row">{label}</th>
                          <td>{preview.manifest.rowCounts[key]}</td>
                          <td>{preview.current[key] ?? 0}</td>
                        </tr>
                      )
                    )}
                    <tr className={styles.totalRow} data-testid="preview-row-total">
                      <th scope="row">Total</th>
                      <td>{total(preview.manifest.rowCounts)}</td>
                      <td>{total(preview.current)}</td>
                    </tr>
                  </tbody>
                </table>

                {preview.manifest.warnings.map((w) => (
                  <p key={w} className={styles.warning}>
                    {w}
                  </p>
                ))}

                <p className={styles.danger}>
                  This replaces all current data. A safety snapshot is saved first.
                </p>
              </>
            )}

            <div className={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={closeModal} disabled={restoring}>
                Cancel
              </Button>
              {preview && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleConfirmRestore}
                  disabled={restoring}
                >
                  {restoring ? "Restoring…" : "Replace my data"}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
