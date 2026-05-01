import { useEffect, useState } from "react";
import type { Task } from "@job-tracker/shared";
import { tasksApi } from "../api/tasks.ts";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input, Select, Textarea } from "../components/ui/Input.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { DocsList } from "../components/DocsList.tsx";
import styles from "./BusinessPage.module.css";

const BLANK = { title: "", description: "", status: "todo" as Task["status"], dueDate: "" };

export function BusinessPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => {
    tasksApi.list({ business: true }).then(setTasks).catch(console.error);
  }, []);

  const openNew = () => { setEditingTask(null); setForm(BLANK); setShowForm(true); };
  const openEdit = (t: Task) => {
    setEditingTask(t);
    setForm({ title: t.title, description: t.description ?? "", status: t.status, dueDate: t.dueDate ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      const updated = await tasksApi.update(editingTask.id, form);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const created = await tasksApi.create({ ...form, projectId: null, dueDate: form.dueDate || null });
      setTasks((prev) => [...prev, created]);
    }
    setShowForm(false);
    setEditingTask(null);
    setForm(BLANK);
  };

  const handleDelete = async (id: number) => {
    await tasksApi.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Business</h1>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tasks</h2>
          <Button size="sm" onClick={openNew}>Add Task</Button>
        </div>
        {tasks.map((t) => (
          <div key={t.id} className={`${styles.card} ${styles.cardClickable}`} onClick={() => openEdit(t)}>
            <span>{t.title}</span>
            <div className={styles.cardMeta}>
              {t.dueDate && <span className={styles.dueDate}>Due {t.dueDate}</span>}
              <Badge value={t.status} />
              <button
                className={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
              >✕</button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className={styles.empty}>No tasks yet.</p>}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Docs</h2>
        </div>
        <DocsList business />
      </section>

      {showForm && (
        <Modal title={editingTask ? "Edit Task" : "Add Task"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit}>
            <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            <Textarea label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Due Date (optional)" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Task["status"] }))}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </Select>
            <Button type="submit">{editingTask ? "Save Changes" : "Add Task"}</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
