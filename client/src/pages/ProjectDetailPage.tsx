import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Project, Task, TimeEntry } from "@job-tracker/shared";
import { projectsApi } from "../api/projects.ts";
import { tasksApi } from "../api/tasks.ts";
import { timeEntriesApi } from "../api/time-entries.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input, Select, Textarea } from "../components/ui/Input.tsx";
import styles from "./ProjectDetailPage.module.css";

type Tab = "tasks" | "time-entries";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = parseInt(id!, 10);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tab, setTab] = useState<Tab>("tasks");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "todo" as const });
  const [entryForm, setEntryForm] = useState({ durationMin: "", notes: "" });

  useEffect(() => {
    projectsApi.get(projectId).then(setProject).catch(console.error);
    tasksApi.list({ projectId }).then(setTasks).catch(console.error);
    timeEntriesApi.list({ projectId }).then(setEntries).catch(console.error);
  }, [projectId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = await tasksApi.create({ ...taskForm, projectId });
    setTasks((prev) => [...prev, t]);
    setShowTaskForm(false);
    setTaskForm({ title: "", description: "", status: "todo" });
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const en = await timeEntriesApi.create({
      projectId,
      durationMin: parseInt(entryForm.durationMin, 10),
      notes: entryForm.notes || null,
    });
    setEntries((prev) => [en, ...prev]);
    setShowEntryForm(false);
    setEntryForm({ durationMin: "", notes: "" });
  };

  const totalHours =
    entries.reduce((sum, e) => sum + (e.durationMin ?? 0), 0) / 60;

  if (!project) return <p>Loading...</p>;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <button className={styles.back} onClick={() => navigate("/projects")}>
            ← Projects
          </button>
          <h1 className={styles.title}>{project.name}</h1>
          <p className={styles.client}>{project.clientName}</p>
        </div>
        <div className={styles.meta}>
          <Badge value={project.status} />
          <span className={styles.rate}>
            ${parseFloat(project.rate).toFixed(2)}
            {project.rateType === "hourly" ? "/hr" : " fixed"}
          </span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab}${tab === "tasks" ? ` ${styles.tabActive}` : ""}`}
          onClick={() => setTab("tasks")}
        >
          Tasks ({tasks.length})
        </button>
        <button
          className={`${styles.tab}${tab === "time-entries" ? ` ${styles.tabActive}` : ""}`}
          onClick={() => setTab("time-entries")}
        >
          Time Entries — {totalHours.toFixed(1)}h
        </button>
      </div>

      {tab === "tasks" && (
        <div>
          <div className={styles.tabHeader}>
            <Button size="sm" onClick={() => setShowTaskForm(true)}>
              Add Task
            </Button>
          </div>
          {tasks.map((t) => (
            <div key={t.id} className={styles.card}>
              <span>{t.title}</span>
              <Badge value={t.status} />
            </div>
          ))}
          {tasks.length === 0 && (
            <p className={styles.empty}>No tasks yet.</p>
          )}
        </div>
      )}

      {tab === "time-entries" && (
        <div>
          <div className={styles.tabHeader}>
            <Button size="sm" onClick={() => setShowEntryForm(true)}>
              Log Time
            </Button>
          </div>
          {entries.map((e) => (
            <div key={e.id} className={styles.card}>
              <span>{((e.durationMin ?? 0) / 60).toFixed(2)}h</span>
              <span className={styles.entryNotes}>{e.notes ?? "—"}</span>
            </div>
          ))}
          {entries.length === 0 && (
            <p className={styles.empty}>No time logged yet.</p>
          )}
        </div>
      )}

      {showTaskForm && (
        <Modal title="Add Task" onClose={() => setShowTaskForm(false)}>
          <form onSubmit={handleCreateTask}>
            <Input
              label="Title"
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, title: e.target.value }))
              }
              required
            />
            <Textarea
              label="Description"
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, description: e.target.value }))
              }
            />
            <Select
              label="Status"
              value={taskForm.status}
              onChange={(e) =>
                setTaskForm((f) => ({
                  ...f,
                  status: e.target.value as Task["status"],
                }))
              }
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </Select>
            <Button type="submit">Add Task</Button>
          </form>
        </Modal>
      )}

      {showEntryForm && (
        <Modal title="Log Time" onClose={() => setShowEntryForm(false)}>
          <form onSubmit={handleCreateEntry}>
            <Input
              label="Duration (minutes)"
              type="number"
              min="1"
              value={entryForm.durationMin}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, durationMin: e.target.value }))
              }
              required
            />
            <Textarea
              label="Notes"
              value={entryForm.notes}
              onChange={(e) =>
                setEntryForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
            <Button type="submit">Log Time</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
