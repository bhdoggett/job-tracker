import { useEffect, useState } from "react";
import type { Project, Task, TimeEntry } from "@job-tracker/shared";
import { projectsApi } from "../api/projects.ts";
import { tasksApi } from "../api/tasks.ts";
import { timeEntriesApi } from "../api/time-entries.ts";
import { Button } from "../components/ui/Button.tsx";
import { LogTimeModal } from "../components/LogTimeModal.tsx";
import styles from "./TimeEntriesPage.module.css";

export function TimeEntriesPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [sortCol, setSortCol] = useState<"duration" | "project" | "task" | "date">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    timeEntriesApi.list().then(setEntries).catch(console.error);
    projectsApi.list().then(setProjects).catch(console.error);
    tasksApi.list().then(setTasks).catch(console.error);
  }, []);

  const totalHours =
    entries.reduce((sum, e) => sum + (e.durationMin ?? 0), 0) / 60;

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const arrow = (col: typeof sortCol) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const sorted = [...entries].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortCol === "duration") { av = a.durationMin ?? 0; bv = b.durationMin ?? 0; }
    else if (sortCol === "project") {
      av = projects.find((p) => p.id === a.projectId)?.name ?? "";
      bv = projects.find((p) => p.id === b.projectId)?.name ?? "";
    }
    else if (sortCol === "task") {
      av = a.taskId ? (tasks.find((t) => t.id === a.taskId)?.title ?? "") : "";
      bv = b.taskId ? (tasks.find((t) => t.id === b.taskId)?.title ?? "") : "";
    }
    else if (sortCol === "date") {
      av = a.startedAt ?? a.createdAt;
      bv = b.startedAt ?? b.createdAt;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const openNew = () => { setEditingEntry(null); setShowForm(true); };
  const openEdit = (e: TimeEntry) => { setEditingEntry(e); setShowForm(true); };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Time Entries{" "}
          <span className={styles.total}>{totalHours.toFixed(1)}h total</span>
        </h1>
        <Button onClick={openNew}>Log Time</Button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.sortable} onClick={() => toggleSort("duration")}>Duration{arrow("duration")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("project")}>Project{arrow("project")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("task")}>Task{arrow("task")}</th>
            <th>Notes</th>
            <th className={styles.sortable} onClick={() => toggleSort("date")}>Date{arrow("date")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
            <tr key={e.id} className={styles.row} onClick={() => openEdit(e)}>
              <td>{((e.durationMin ?? 0) / 60).toFixed(2)}h</td>
              <td>{projects.find((p) => p.id === e.projectId)?.name ?? `#${e.projectId}`}</td>
              <td>{e.taskId ? (tasks.find((t) => t.id === e.taskId)?.title ?? "—") : "—"}</td>
              <td className={styles.notes}>{e.notes ?? "—"}</td>
              <td>{new Date(e.startedAt ?? e.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className={styles.empty}>
                No time logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <LogTimeModal
          existingEntry={editingEntry ?? undefined}
          onClose={() => { setShowForm(false); setEditingEntry(null); }}
          onSaved={(entry) => {
            if (editingEntry) {
              setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
            } else {
              setEntries((prev) => [entry, ...prev]);
            }
          }}
        />
      )}
    </div>
  );
}
