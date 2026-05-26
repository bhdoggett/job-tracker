import { useEffect, useState } from "react";
import type { Project, Task, TimeEntry, Profile } from "@job-tracker/shared";
import { projectsApi } from "../api/projects.ts";
import { tasksApi } from "../api/tasks.ts";
import { timeEntriesApi } from "../api/time-entries.ts";
import { profileApi } from "../api/profile.ts";
import { Button } from "../components/ui/Button.tsx";
import { Select, Input } from "../components/ui/Input.tsx";
import styles from "./TimesheetsPage.module.css";

export function TimesheetsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projectId, setProjectId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(console.error);
    tasksApi.list().then(setTasks).catch(console.error);
    profileApi.get().then(setProfile).catch(console.error);
  }, []);

  useEffect(() => {
    if (!projectId) { setEntries([]); return; }
    timeEntriesApi
      .list({
        projectId: parseInt(projectId, 10),
        from: dateFrom || undefined,
        to: dateTo || undefined,
      })
      .then((rows) =>
        [...rows].sort((a, b) => {
          const da = a.startedAt ?? a.createdAt;
          const db = b.startedAt ?? b.createdAt;
          return da < db ? -1 : da > db ? 1 : 0;
        })
      )
      .then(setEntries)
      .catch(console.error);
  }, [projectId, dateFrom, dateTo]);

  const selectedProject = projects.find((p) => p.id === parseInt(projectId, 10));
  const totalHours = entries.reduce((sum, e) => sum + (e.durationMin ?? 0), 0) / 60;

  const taskNamesFor = (entry: TimeEntry): string => {
    const ids = entry.taskIds ?? (entry.taskId ? [entry.taskId] : []);
    if (ids.length === 0) return "—";
    return ids
      .map((id) => `- ${tasks.find((t) => t.id === id)?.title ?? `#${id}`}`)
      .join("\n");
  };

  const formatDate = (entry: TimeEntry) =>
    new Date(entry.startedAt ?? entry.createdAt).toLocaleDateString();

  const period =
    dateFrom && dateTo
      ? `${dateFrom} – ${dateTo}`
      : dateFrom
      ? `From ${dateFrom}`
      : dateTo
      ? `Through ${dateTo}`
      : "All dates";

  return (
    <div>
      {/* Print header — hidden on screen, visible when printing */}
      <div className={styles.printHeader}>
        {(profile?.yourName || profile?.businessName) && (
          <div className={styles.printFrom}>
            {profile.yourName && <strong>{profile.yourName}</strong>}
            {profile.businessName && <span>{profile.businessName}</span>}
          </div>
        )}
        {selectedProject && (
          <div className={styles.printTo}>
            <span>Client: {selectedProject.clientName}</span>
            <span>Project: {selectedProject.name}</span>
          </div>
        )}
        <div className={styles.printPeriod}>Period: {period}</div>
      </div>

      {/* Screen controls — hidden when printing */}
      <div className={styles.controls}>
        <h1 className={styles.title}>Timesheets</h1>
        <div className={styles.filters}>
          <Select
            label="Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.clientName}
              </option>
            ))}
          </Select>
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Button
            onClick={() => window.print()}
            disabled={!projectId}
          >
            Print / Save PDF
          </Button>
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Task</th>
            <th>Notes</th>
            <th className={styles.right}>Hours</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className={styles.empty}>
                {projectId
                  ? "No time logged for this period."
                  : "Select a project to view time entries."}
              </td>
            </tr>
          ) : (
            entries.map((e) => (
              <tr key={e.id}>
                <td className={styles.dateCell}>{formatDate(e)}</td>
                <td className={styles.taskCell}>{taskNamesFor(e)}</td>
                <td className={styles.notes}>{e.notes ?? "—"}</td>
                <td className={styles.right}>
                  {((e.durationMin ?? 0) / 60).toFixed(2)}h
                </td>
              </tr>
            ))
          )}
        </tbody>
        {entries.length > 0 && (
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={3}>Total</td>
              <td className={styles.right}>{totalHours.toFixed(2)}h</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
