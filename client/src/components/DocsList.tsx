import { useEffect, useRef, useState } from "react";
import type { Doc } from "@job-tracker/shared";
import { docsApi } from "../api/docs.ts";
import { Button } from "./ui/Button.tsx";
import styles from "./DocsList.module.css";

interface Props {
  projectId?: number;
  business?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocsList({ projectId, business }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    docsApi.list({ projectId, business }).then(setDocs).catch(console.error);
  }, [projectId, business]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingFile(f);
    setTitleInput(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFile || !titleInput) return;
    setUploading(true);
    try {
      const doc = await docsApi.upload(pendingFile, titleInput, projectId);
      setDocs((prev) => [doc, ...prev]);
      setPendingFile(null);
      setTitleInput("");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await docsApi.delete(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div>
      <form className={styles.uploadForm} onSubmit={handleUpload}>
        <input
          ref={fileRef}
          type="file"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
        {pendingFile && (
          <>
            <input
              className={styles.titleInput}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Document title"
              required
            />
            <Button type="submit" size="sm" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </>
        )}
      </form>

      {docs.length === 0 && !pendingFile && (
        <p className={styles.empty}>No documents yet.</p>
      )}

      {docs.map((doc) => (
        <div key={doc.id} className={styles.row}>
          <div className={styles.info}>
            <a
              href={docsApi.downloadUrl(doc.id)}
              className={styles.title}
              download={doc.fileName}
            >
              {doc.title}
            </a>
            <span className={styles.meta}>
              {doc.fileName}{doc.size ? ` · ${formatBytes(doc.size)}` : ""}
            </span>
          </div>
          <button className={styles.deleteBtn} onClick={() => handleDelete(doc.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
