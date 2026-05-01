import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Project, Task } from "@job-tracker/shared";
import { tasksApi } from "../api/tasks.ts";
import { projectsApi } from "../api/projects.ts";
import { TasksTable } from "../components/TasksTable.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input, Select, Textarea } from "../components/ui/Input.tsx";
import styles from "./TasksPage.module.css";

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", status: "todo" as Task["status"], projectId: "", dueDate: "" });
  const navigate = useNavigate();

  useEffect(() => {
    tasksApi.list().then(setTasks).catch(console.error);
    projectsApi.list().then(setProjects).catch(console.error);
  }, []);

  const getProjectName = (projectId: number) =>
    projects.find((p) => p.id === projectId)?.name ?? `#${projectId}`;

  const BLANK = { title: "", description: "", status: "todo" as Task["status"], projectId: "", dueDate: "" };

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
        onRowClick={(t) => { if (t.projectId) navigate(`/projects/${t.projectId}`); }}
      />

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
