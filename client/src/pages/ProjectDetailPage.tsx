import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Project, Task, TimeEntry } from "@job-tracker/shared";
import { projectsApi } from "../api/projects.ts";
import { tasksApi } from "../api/tasks.ts";
import { timeEntriesApi } from "../api/time-entries.ts"; // used for listing entries
import { TasksTable } from "../components/TasksTable.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input, Select, Textarea } from "../components/ui/Input.tsx";
import { LogTimeModal } from "../components/LogTimeModal.tsx";
import { RichTextEditor } from "../components/RichTextEditor.tsx";
import { DocsList } from "../components/DocsList.tsx";
import styles from "./ProjectDetailPage.module.css";

type Tab = "tasks" | "time-entries" | "docs";

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = parseInt(id!, 10);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tab, setTab] = useState<Tab>("tasks");
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "todo" as Task["status"], dueDate: "" });

  useEffect(() => {
    projectsApi.get(projectId).then((p) => { setProject(p); setNotes(p.notes ?? ""); }).catch(console.error);
    tasksApi.list({ projectId }).then(setTasks).catch(console.error);
    timeEntriesApi.list({ projectId }).then(setEntries).catch(console.error);
  }, [projectId]);

  const handleSaveNotes = async () => {
    setSaveStatus("saving");
    try {
      await projectsApi.update(projectId, { notes });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm({ title: "", description: "", status: "todo", dueDate: "" });
    setShowTaskForm(true);
  };

  const openEditTask = (t: Task) => {
    setEditingTask(t);
    setTaskForm({ title: t.title, description: t.description ?? "", status: t.status, dueDate: t.dueDate ?? "" });
    setShowTaskForm(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      const updated = await tasksApi.update(editingTask.id, taskForm);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await tasksApi.create({ ...taskForm, projectId, dueDate: taskForm.dueDate || null });
      setTasks((prev) => [...prev, created]);
    }
    setShowTaskForm(false);
    setEditingTask(null);
    setTaskForm({ title: "", description: "", status: "todo", dueDate: "" });
  };


  const totalHours =
    entries.reduce((sum, e) => sum + (e.durationMin ?? 0), 0) / 60;

  if (!project) return <p>Loading...</p>;

  return (
    <div className={styles.pageLayout}>
      <div className={styles.mainContent}>
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
            <button
              className={`${styles.notesToggle}${notesOpen ? ` ${styles.notesToggleActive}` : ""}`}
              onClick={() => setNotesOpen((o) => !o)}
            >
              Notes
            </button>
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
          <button
            className={`${styles.tab}${tab === "docs" ? ` ${styles.tabActive}` : ""}`}
            onClick={() => setTab("docs")}
          >
            Docs
          </button>
        </div>

        {tab === "tasks" && (
          <div>
            <div className={styles.tabHeader}>
              <Button size="sm" onClick={openNewTask}>
                Add Task
              </Button>
            </div>
            <TasksTable tasks={tasks} onRowClick={openEditTask} />
          </div>
        )}

        {tab === "time-entries" && (
          <div>
            <div className={styles.tabHeader}>
              <Button size="sm" onClick={() => { setEditingEntry(null); setShowEntryForm(true); }}>
                Log Time
              </Button>
            </div>
            {entries.map((e) => (
              <div key={e.id} className={`${styles.card} ${styles.cardClickable}`} onClick={() => { setEditingEntry(e); setShowEntryForm(true); }}>
                <span>{((e.durationMin ?? 0) / 60).toFixed(2)}h</span>
                <span className={styles.entryNotes}>{e.notes ?? "—"}</span>
              </div>
            ))}
            {entries.length === 0 && (
              <p className={styles.empty}>No time logged yet.</p>
            )}
          </div>
        )}

        {tab === "docs" && <DocsList projectId={projectId} />}
      </div>

      <div className={`${styles.notesPanel}${notesOpen ? ` ${styles.notesPanelOpen}` : ""}`}>
        <div className={styles.notesPanelHeader}>
          <span className={styles.notesPanelTitle}>Notes</span>
          <div className={styles.notesPanelActions}>
            <Button size="sm" onClick={handleSaveNotes} disabled={saveStatus === "saving"}>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : "Save"}
            </Button>
            <button className={styles.notesPanelClose} onClick={() => setNotesOpen(false)}>✕</button>
          </div>
        </div>
        <div className={styles.notesPanelBody}>
          <RichTextEditor content={notes} onChange={setNotes} />
        </div>
      </div>

      {showTaskForm && (
        <Modal title={editingTask ? "Edit Task" : "Add Task"} onClose={() => setShowTaskForm(false)}>
          <form onSubmit={handleSubmitTask}>
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
            <Input
              label="Due Date (optional)"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
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
            <Button type="submit">{editingTask ? "Save Changes" : "Add Task"}</Button>
          </form>
        </Modal>
      )}

      {showEntryForm && (
        <LogTimeModal
          projectId={projectId}
          existingEntry={editingEntry ?? undefined}
          onClose={() => { setShowEntryForm(false); setEditingEntry(null); }}
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

