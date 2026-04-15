import { useEffect, useState } from "react";
import type { Task } from "@job-tracker/shared";
import { tasksApi } from "../api/tasks.ts";
import { Badge } from "../components/ui/Badge.tsx";
import styles from "./TasksPage.module.css";

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    tasksApi.list().then(setTasks).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className={styles.title}>All Tasks</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>
                <Badge value={t.status} />
              </td>
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={2} className={styles.empty}>
                No tasks yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
