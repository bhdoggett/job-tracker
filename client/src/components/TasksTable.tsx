import { useState } from "react";
import type { Task } from "@job-tracker/shared";
import { Badge } from "./ui/Badge.tsx";
import styles from "./TasksTable.module.css";

type SortCol = "title" | "status" | "dueDate";

interface Props {
  tasks: Task[];
  onRowClick: (task: Task) => void;
  showProject?: boolean;
  getProjectName?: (projectId: number) => string;
}

export function TasksTable({ tasks, onRowClick, showProject, getProjectName }: Props) {
  const [sortCol, setSortCol] = useState<SortCol>("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const arrow = (col: SortCol) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const sorted = [...tasks].sort((a, b) => {
    let av = "", bv = "";
    if (sortCol === "title") { av = a.title; bv = b.title; }
    else if (sortCol === "status") { av = a.status; bv = b.status; }
    else if (sortCol === "dueDate") { av = a.dueDate ?? ""; bv = b.dueDate ?? ""; }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.sortable} onClick={() => toggleSort("title")}>Title{arrow("title")}</th>
          {showProject && <th>Project</th>}
          <th className={styles.sortable} onClick={() => toggleSort("dueDate")}>Due{arrow("dueDate")}</th>
          <th className={styles.sortable} onClick={() => toggleSort("status")}>Status{arrow("status")}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((t) => (
          <tr key={t.id} className={styles.row} onClick={() => onRowClick(t)}>
            <td>{t.title}</td>
            {showProject && <td>{t.projectId ? (getProjectName?.(t.projectId) ?? `#${t.projectId}`) : "General"}</td>}
            <td>{t.dueDate ?? "—"}</td>
            <td><Badge value={t.status} /></td>
          </tr>
        ))}
        {tasks.length === 0 && (
          <tr>
            <td colSpan={showProject ? 4 : 3} className={styles.empty}>No tasks yet.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
