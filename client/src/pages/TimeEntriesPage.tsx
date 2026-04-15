import { useEffect, useState } from "react";
import type { TimeEntry } from "@job-tracker/shared";
import { timeEntriesApi } from "../api/time-entries.ts";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input, Textarea } from "../components/ui/Input.tsx";
import styles from "./TimeEntriesPage.module.css";

export function TimeEntriesPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ projectId: "", durationMin: "", notes: "" });

  useEffect(() => {
    timeEntriesApi.list().then(setEntries).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const en = await timeEntriesApi.create({
      projectId: parseInt(form.projectId, 10),
      durationMin: parseInt(form.durationMin, 10),
      notes: form.notes || null,
    });
    setEntries((prev) => [en, ...prev]);
    setShowForm(false);
    setForm({ projectId: "", durationMin: "", notes: "" });
  };

  const totalHours =
    entries.reduce((sum, e) => sum + (e.durationMin ?? 0), 0) / 60;

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Time Entries{" "}
          <span className={styles.total}>{totalHours.toFixed(1)}h total</span>
        </h1>
        <Button onClick={() => setShowForm(true)}>Log Time</Button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Duration</th>
            <th>Project</th>
            <th>Notes</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{((e.durationMin ?? 0) / 60).toFixed(2)}h</td>
              <td>#{e.projectId}</td>
              <td>{e.notes ?? "—"}</td>
              <td>{new Date(e.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={4} className={styles.empty}>
                No time logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <Modal title="Log Time" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate}>
            <Input
              label="Project ID"
              type="number"
              value={form.projectId}
              onChange={(e) =>
                setForm((f) => ({ ...f, projectId: e.target.value }))
              }
              required
            />
            <Input
              label="Duration (minutes)"
              type="number"
              min="1"
              value={form.durationMin}
              onChange={(e) =>
                setForm((f) => ({ ...f, durationMin: e.target.value }))
              }
              required
            />
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
            <Button type="submit">Log Time</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
