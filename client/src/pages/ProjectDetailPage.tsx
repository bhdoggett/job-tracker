import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Project, Task, TimeEntry } from "@job-tracker/shared";
import { projectsApi } from "../api/projects";
import { tasksApi } from "../api/tasks";
import { timeEntriesApi } from "../api/time-entries"; // used for listing entries
import { TasksTable } from "../components/TasksTable";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input, Select, Textarea } from "../components/ui/Input";
import { LogTimeModal } from "../components/LogTimeModal";
import { RichTextEditor } from "../components/RichTextEditor";
import { DocsList } from "../components/DocsList";
import { ProjectInvoicesTab } from "../components/ProjectInvoicesTab";
import styles from "./ProjectDetailPage.module.css";

type Tab = "tasks" | "time-entries" | "docs" | "invoices";

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
  const [showEditProject, setShowEditProject] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", clientName: "", description: "", status: "active" as Project["status"], rateType: "hourly" as Project["rateType"], rate: "", startDate: "", autoInvoiceEnabled: false, autoInvoiceFrequencyDays: "14" });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "todo" as Task["status"], dueDate: "" });

  useEffect(() => {
    projectsApi.get(projectId).then((p) => {
      setProject(p);
      setNotes(p.notes ?? "");
      setEditForm({ name: p.name, clientName: p.clientName, description: p.description ?? "", status: p.status, rateType: p.rateType, rate: p.rate, startDate: p.startDate, autoInvoiceEnabled: p.autoInvoiceEnabled, autoInvoiceFrequencyDays: String(p.autoInvoiceFrequencyDays) });
    }).catch(console.error);
    tasksApi.list({ projectId }).then(setTasks).catch(console.error);
    timeEntriesApi.list({ projectId }).then(setEntries).catch(console.error);
  }, [projectId]);

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await projectsApi.update(projectId, {
      ...editForm,
      autoInvoiceFrequencyDays: parseInt(editForm.autoInvoiceFrequencyDays || "14", 10),
    });
    setProject(updated);
    setShowEditProject(false);
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Delete "${project?.name}"? This cannot be undone.`)) return;
    setDeleteError(null);
    try {
      await projectsApi.delete(projectId);
      navigate("/projects");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

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

  const handleDeleteTask = async (t: Task) => {
    if (!confirm(`Delete "${t.title}"?`)) return;
    await tasksApi.delete(t.id);
    setTasks((prev) => prev.filter((task) => task.id !== t.id));
    setShowTaskForm(false);
    setEditingTask(null);
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
              className={styles.notesToggle}
              onClick={() => setShowEditProject(true)}
            >
              Edit
            </button>
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
          <button
            className={`${styles.tab}${tab === "invoices" ? ` ${styles.tabActive}` : ""}`}
            onClick={() => setTab("invoices")}
          >
            Invoices
          </button>
        </div>

        {tab === "tasks" && (
          <div>
            <div className={styles.tabHeader}>
              <Button size="sm" onClick={openNewTask}>
                Add Task
              </Button>
            </div>
            <TasksTable tasks={tasks} onRowClick={openEditTask} onDelete={handleDeleteTask} />
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
                <span className={styles.entryDate}>{e.startedAt ? new Date(e.startedAt).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}</span>
                <span className={styles.entryHours}>{((e.durationMin ?? 0) / 60).toFixed(2)}h</span>
                <span className={styles.entryNotes}>{e.notes ?? "—"}</span>
              </div>
            ))}
            {entries.length === 0 && (
              <p className={styles.empty}>No time logged yet.</p>
            )}
          </div>
        )}

        {tab === "docs" && <DocsList projectId={projectId} />}
        {tab === "invoices" && <ProjectInvoicesTab projectId={projectId} />}
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
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
              <Button type="submit">{editingTask ? "Save Changes" : "Add Task"}</Button>
              {editingTask && (
                <Button type="button" onClick={() => handleDeleteTask(editingTask)}>Delete</Button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {showEditProject && (
        <Modal title="Edit Project" onClose={() => { setShowEditProject(false); setDeleteError(null); }}>
          <form onSubmit={handleEditProject}>
            <Input
              label="Project Name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Client Name"
              value={editForm.clientName}
              onChange={(e) => setEditForm((f) => ({ ...f, clientName: e.target.value }))}
              required
            />
            <Textarea
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Select
              label="Status"
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as Project["status"] }))}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
            <Select
              label="Rate Type"
              value={editForm.rateType}
              onChange={(e) => setEditForm((f) => ({ ...f, rateType: e.target.value as Project["rateType"] }))}
            >
              <option value="hourly">Hourly</option>
              <option value="fixed">Fixed</option>
            </Select>
            <Input
              label="Rate ($)"
              type="number"
              step="0.01"
              value={editForm.rate}
              onChange={(e) => setEditForm((f) => ({ ...f, rate: e.target.value }))}
              required
            />
            <Input
              label="Start Date"
              type="date"
              value={editForm.startDate}
              onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={editForm.autoInvoiceEnabled}
                onChange={(e) => setEditForm((f) => ({ ...f, autoInvoiceEnabled: e.target.checked }))}
              />
              Auto-draft invoices
            </label>
            {editForm.autoInvoiceEnabled && (
              <Input
                label="Invoice every N days"
                type="number"
                min="1"
                value={editForm.autoInvoiceFrequencyDays}
                onChange={(e) => setEditForm((f) => ({ ...f, autoInvoiceFrequencyDays: e.target.value }))}
                required
              />
            )}
            {deleteError && (
              <p style={{ color: "var(--color-danger, #e53e3e)", fontSize: "0.8rem", margin: "0.5rem 0" }}>{deleteError}</p>
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
              <Button type="submit">Save Changes</Button>
              <Button type="button" onClick={handleDeleteProject}>Delete Project</Button>
            </div>
          </form>
        </Modal>
      )}

      {showEntryForm && (
        <LogTimeModal
          key={editingEntry?.id ?? "new"}
          projectId={projectId}
          existingEntry={editingEntry ?? undefined}
          allEntries={editingEntry ? entries : undefined}
          onNavigate={(entry) => setEditingEntry(entry)}
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

