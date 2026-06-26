import { useEffect, useRef, useState } from "react";
import type { Invoice, Project, Task, TimeEntry } from "@job-tracker/shared";
import { projectsApi } from "../api/projects";
import { tasksApi } from "../api/tasks";
import { timeEntriesApi } from "../api/time-entries";
import { Modal } from "./ui/Modal";
import { Input, Select, Textarea } from "./ui/Input";
import { Button } from "./ui/Button";
import styles from "./LogTimeModal.module.css";

interface Props {
  /** Pre-set when logging from a project page — hides the project selector. */
  projectId?: number;
  /** When provided, opens in edit mode pre-filled with this entry's data. */
  existingEntry?: TimeEntry;
  /** Invoice that includes this entry, if any. */
  existingEntryInvoice?: Invoice;
  /** Ordered list of entries for prev/next navigation (edit mode only). */
  allEntries?: TimeEntry[];
  onClose: () => void;
  onSaved: (entry: TimeEntry) => void;
  /** Called when user navigates to a different entry. */
  onNavigate?: (entry: TimeEntry) => void;
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function LogTimeModal({ projectId, existingEntry, existingEntryInvoice, allEntries, onClose, onSaved, onNavigate }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editMode, setEditMode] = useState(!existingEntry);
  const [showDone, setShowDone] = useState(false);
  const [markDoneIds, setMarkDoneIds] = useState<number[]>([]);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  const initForm = () => {
    if (existingEntry) {
      const totalMin = existingEntry.durationMin ?? 0;
      return {
        projectId: String(existingEntry.projectId),
        taskIds: existingEntry.taskIds ?? (existingEntry.taskId ? [existingEntry.taskId] : []),
        date: existingEntry.startedAt
          ? existingEntry.startedAt.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        hours: String(Math.floor(totalMin / 60)),
        minutes: String(totalMin % 60),
        notes: existingEntry.notes ?? "",
      };
    }
    return {
      projectId: projectId ? String(projectId) : "",
      taskIds: [] as number[],
      date: new Date().toISOString().slice(0, 10),
      hours: "",
      minutes: "",
      notes: "",
    };
  };

  const [form, setForm] = useState(initForm);

  const activeProjectId = form.projectId ? parseInt(form.projectId, 10) : null;

  useEffect(() => {
    if (!projectId) {
      projectsApi.list().then(setProjects).catch(console.error);
    }
  }, [projectId]);

  // Load tasks whenever the selected project changes
  useEffect(() => {
    if (activeProjectId) {
      tasksApi.list({ projectId: activeProjectId }).then(setTasks).catch(console.error);
    } else {
      setTasks([]);
      setForm((f) => ({ ...f, taskIds: [] }));
    }
  }, [activeProjectId]);

  // Focus new task input when it appears
  useEffect(() => {
    if (addingTask) newTaskInputRef.current?.focus();
  }, [addingTask]);

  // Prev/next navigation helpers
  const currentIdx = allEntries && existingEntry
    ? allEntries.findIndex((e) => e.id === existingEntry.id)
    : -1;
  const prevEntry = currentIdx > 0 ? allEntries![currentIdx - 1] : null;
  const nextEntry = currentIdx >= 0 && currentIdx < (allEntries?.length ?? 0) - 1
    ? allEntries![currentIdx + 1]
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const durationMin =
      (parseInt(form.hours || "0", 10) * 60) +
      parseInt(form.minutes || "0", 10);
    const data = {
      projectId: parseInt(form.projectId, 10),
      taskId: form.taskIds[0] ?? null,
      taskIds: form.taskIds,
      durationMin,
      startedAt: form.date ? new Date(form.date).toISOString() : null,
      notes: form.notes || null,
    };
    const entry = existingEntry
      ? await timeEntriesApi.update(existingEntry.id, data)
      : await timeEntriesApi.create(data);
    await Promise.all(
      markDoneIds.map((id) => tasksApi.update(id, { status: "done" }))
    );
    onSaved(entry);
    onClose();
  };

  const handleAddTask = async () => {
    const title = newTaskTitle.trim();
    if (!title || !activeProjectId) return;
    try {
      const task = await tasksApi.create({ projectId: activeProjectId, title, status: "todo" });
      setTasks((prev) => [...prev, task]);
      setForm((f) => ({ ...f, taskIds: [...f.taskIds, task.id] }));
      setNewTaskTitle("");
      setAddingTask(false);
    } catch (err) {
      console.error("Failed to create task:", err);
      alert("Failed to create task. Please try again.");
    }
  };

  const entryTaskIds = existingEntry?.taskIds ?? (existingEntry?.taskId ? [existingEntry.taskId] : []);
  const taskTitles = entryTaskIds.map((id) => tasks.find((t) => t.id === id)?.title).filter(Boolean) as string[];

  const navButtons = existingEntry && onNavigate ? (
    <>
      <button
        type="button"
        className={styles.navBtn}
        disabled={!prevEntry}
        onClick={() => prevEntry && onNavigate(prevEntry)}
        title="Previous entry"
      >
        ←
      </button>
      <button
        type="button"
        className={styles.navBtn}
        disabled={!nextEntry}
        onClick={() => nextEntry && onNavigate(nextEntry)}
        title="Next entry"
      >
        →
      </button>
    </>
  ) : null;

  const editToggle = existingEntry ? (
    <button type="button" className={styles.editToggle} onClick={() => setEditMode((v) => !v)}>
      {editMode ? "Done" : "Edit"}
    </button>
  ) : null;

  const headerSlot = (
    <>
      {navButtons}
      {editToggle}
    </>
  );

  return (
    <Modal
      title={existingEntry ? (editMode ? "Edit Time Entry" : "Time Entry") : "Log Time"}
      onClose={onClose}
      headerSlot={headerSlot}
    >
      {existingEntry && !editMode ? (
        <div className={styles.detailView}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Date</span>
            <span>{existingEntry.startedAt ? new Date(existingEntry.startedAt).toLocaleDateString(undefined, { timeZone: "UTC" }) : "—"}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Duration</span>
            <span className={styles.detailDuration}>{formatDuration(existingEntry.durationMin ?? 0)}</span>
          </div>
          {taskTitles.length > 0 && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Tasks</span>
              <span className={styles.detailTasks}>{taskTitles.join(", ")}</span>
            </div>
          )}
          {existingEntry.notes && (
            <div className={styles.detailNotesRow}>
              <span className={styles.detailLabel}>Notes</span>
              <p className={styles.detailNotesText}>{existingEntry.notes}</p>
            </div>
          )}
          {existingEntryInvoice && (existingEntryInvoice.status === "sent" || existingEntryInvoice.status === "paid") && (
            <div className={styles.invoiceNotice}>
              <span className={styles.invoiceNoticeLabel}>Invoice</span>
              <span className={styles.invoiceNoticeNumber}>{existingEntryInvoice.invoiceNumber}</span>
              <span className={`${styles.invoiceNoticeBadge} ${styles[`invoiceNoticeBadge_${existingEntryInvoice.status}`]}`}>{existingEntryInvoice.status}</span>
            </div>
          )}
        </div>
      ) : (
      <form onSubmit={handleSubmit}>
        {!projectId && (
          <Select
            label="Project"
            value={form.projectId}
            onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
            required
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.clientName}
              </option>
            ))}
          </Select>
        )}
        {(tasks.length > 0 || activeProjectId) && (
          <div className={styles.taskGroup}>
            <div className={styles.taskGroupHeader}>
              <label className={styles.taskGroupLabel}>Tasks (optional)</label>
              <div className={styles.taskGroupActions}>
                {tasks.some((t) => t.status === "done") && (
                  <button type="button" className={styles.taskGroupToggle} onClick={() => setShowDone((v) => !v)}>
                    {showDone ? "Hide completed" : "Show completed"}
                  </button>
                )}
                {activeProjectId && (
                  <button
                    type="button"
                    className={styles.addTaskBtn}
                    onClick={() => setAddingTask(true)}
                    title="Add a new task"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
            {tasks
              .filter((t) => showDone || t.status !== "done" || form.taskIds.includes(t.id))
              .map((t) => {
                const checked = form.taskIds.includes(t.id);
                const alreadyDone = t.status === "done";
                return (
                  <div key={t.id} className={styles.taskRow}>
                    <label className={styles.taskCheckbox}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            taskIds: e.target.checked
                              ? [...f.taskIds, t.id]
                              : f.taskIds.filter((id) => id !== t.id),
                          }));
                          if (!e.target.checked) {
                            setMarkDoneIds((ids) => ids.filter((id) => id !== t.id));
                          }
                        }}
                      />
                      {t.title}
                    </label>
                    {checked && !alreadyDone && (
                      <label className={styles.markDone}>
                        <input
                          type="checkbox"
                          checked={markDoneIds.includes(t.id)}
                          onChange={(e) =>
                            setMarkDoneIds((ids) =>
                              e.target.checked ? [...ids, t.id] : ids.filter((id) => id !== t.id)
                            )
                          }
                        />
                        mark done
                      </label>
                    )}
                  </div>
                );
              })}
            {addingTask && (
              <div className={styles.addTaskRow}>
                <input
                  ref={newTaskInputRef}
                  className={styles.addTaskInput}
                  type="text"
                  placeholder="New task title…"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddTask(); }
                    if (e.key === "Escape") { setAddingTask(false); setNewTaskTitle(""); }
                  }}
                />
                <button type="button" className={styles.addTaskConfirm} onClick={handleAddTask}>
                  Add
                </button>
                <button
                  type="button"
                  className={styles.addTaskCancel}
                  onClick={() => { setAddingTask(false); setNewTaskTitle(""); }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          required
        />
        <div className={styles.durationRow}>
          <Input
            label="Hours"
            type="number"
            min="0"
            value={form.hours}
            onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
            placeholder="0"
          />
          <Input
            label="Minutes"
            type="number"
            min="0"
            max="59"
            value={form.minutes}
            onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
            placeholder="0"
          />
        </div>
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
        {existingEntryInvoice && (existingEntryInvoice.status === "sent" || existingEntryInvoice.status === "paid") && (
          <div className={styles.invoiceNotice}>
            <span className={styles.invoiceNoticeLabel}>Invoice</span>
            <span className={styles.invoiceNoticeNumber}>{existingEntryInvoice.invoiceNumber}</span>
            <span className={`${styles.invoiceNoticeBadge} ${styles[`invoiceNoticeBadge_${existingEntryInvoice.status}`]}`}>{existingEntryInvoice.status}</span>
          </div>
        )}
        <Button type="submit">{existingEntry ? "Save Changes" : "Log Time"}</Button>
      </form>
      )}
    </Modal>
  );
}
