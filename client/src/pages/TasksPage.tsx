import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Project, Task, TimeEntry } from "@job-tracker/shared";
import { tasksApi } from "../api/tasks";
import { projectsApi } from "../api/projects";
import { timeEntriesApi } from "../api/time-entries";
import { TasksTable } from "../components/TasksTable";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input, Select, Textarea } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import styles from "./TasksPage.module.css";

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "todo" as Task["status"], projectId: "", dueDate: "" });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskTimeLogs, setTaskTimeLogs] = useState<TimeEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    tasksApi.list().then(setTasks).catch(console.error);
    projectsApi.list().then(setProjects).catch(console.error);
  }, []);

  const getProjectName = (projectId: number) =>
    projects.find((p) => p.id === projectId)?.name ?? `#${projectId}`;

  const BLANK = { title: "", description: "", status: "todo" as Task["status"], projectId: "", dueDate: "" };

  const handleDelete = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await tasksApi.delete(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await tasksApi.create({
      title: form.title,
      description: form.description || null,
      status: form.status,
      projectId: form.projectId ? parseInt(form.projectId, 10) : null,
      dueDate: form.dueDate || null,
    });
    setTasks((prev) => [...prev, created]);
    setShowForm(false);
    setForm(BLANK);
  };

  const handleRowClick = async (task: Task) => {
    setSelectedTask(task);
    setLoadingLogs(true);
    try {
      const logs = await timeEntriesApi.list({ taskId: task.id });
      setTaskTimeLogs(logs);
    } catch {
      setTaskTimeLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const totalMinutes = taskTimeLogs.reduce((sum, e) => sum + (e.durationMin ?? 0), 0);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>All Tasks</h1>
        <Button onClick={() => { setForm(BLANK); setShowForm(true); }}>Add Task</Button>
      </div>

      <TasksTable
        tasks={tasks}
        showProject
        getProjectName={getProjectName}
        onRowClick={handleRowClick}
        onDelete={handleDelete}
      />

      {selectedTask && (
        <Modal title={selectedTask.title} onClose={() => setSelectedTask(null)}>
          <div className={styles.taskDetail}>
            <div className={styles.taskMeta}>
              <Badge value={selectedTask.status} />
              {selectedTask.projectId && (
                <button
                  className={styles.projectLink}
                  onClick={() => navigate(`/projects/${selectedTask.projectId}`)}
                >
                  {getProjectName(selectedTask.projectId)}
                </button>
              )}
              {selectedTask.dueDate && (
                <span className={styles.dueDate}>Due {selectedTask.dueDate}</span>
              )}
            </div>
            {selectedTask.description && (
              <p className={styles.description}>{selectedTask.description}</p>
            )}

            <div className={styles.timeLogsSection}>
              <div className={styles.timeLogsHeader}>
                <span className={styles.timeLogsTitle}>Time Logs</span>
                {taskTimeLogs.length > 0 && (
                  <span className={styles.totalTime}>{formatDuration(totalMinutes)}</span>
                )}
              </div>
              {loadingLogs ? (
                <p className={styles.emptyLogs}>Loading…</p>
              ) : taskTimeLogs.length === 0 ? (
                <p className={styles.emptyLogs}>No time logged for this task.</p>
              ) : (
                <table className={styles.logsTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th className={styles.right}>Duration</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskTimeLogs.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                        <td className={styles.right}>
                          {entry.durationMin != null ? formatDuration(entry.durationMin) : "—"}
                        </td>
                        <td className={styles.notes}>{entry.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title="Add Task" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit}>
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Select
              label="Project (optional)"
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
            >
              <option value="">General — no specific project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>
              ))}
            </Select>
            <Input
              label="Due Date (optional)"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Task["status"] }))}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </Select>
            <Button type="submit">Add Task</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
