import { useEffect, useState } from "react";
import type { Project } from "@job-tracker/shared";
import { projectsApi } from "../api/projects.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input, Select, Textarea } from "../components/ui/Input.tsx";
import { useNavigate } from "react-router-dom";
import styles from "./ProjectsPage.module.css";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    clientName: "",
    description: "",
    rateType: "hourly" as const,
    rate: "",
    status: "active" as const,
  });
  const navigate = useNavigate();

  useEffect(() => {
    projectsApi.list().then(setProjects).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = await projectsApi.create(form);
    setProjects((prev) => [p, ...prev]);
    setShowCreate(false);
    setForm({ name: "", clientName: "", description: "", rateType: "hourly", rate: "", status: "active" });
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <Button onClick={() => setShowCreate(true)}>New Project</Button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Client</th>
            <th>Rate</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr
              key={p.id}
              className={styles.row}
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <td>{p.name}</td>
              <td>{p.clientName}</td>
              <td>
                ${parseFloat(p.rate).toFixed(2)}
                {p.rateType === "hourly" ? "/hr" : " fixed"}
              </td>
              <td>
                <Badge value={p.status} />
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={4} className={styles.empty}>
                No projects yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showCreate && (
        <Modal title="New Project" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <Input
              label="Project Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Input
              label="Client Name"
              value={form.clientName}
              onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
              required
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Select
              label="Rate Type"
              value={form.rateType}
              onChange={(e) =>
                setForm((f) => ({ ...f, rateType: e.target.value as "hourly" | "fixed" }))
              }
            >
              <option value="hourly">Hourly</option>
              <option value="fixed">Fixed</option>
            </Select>
            <Input
              label="Rate ($)"
              type="number"
              step="0.01"
              value={form.rate}
              onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              required
            />
            <Button type="submit">Create Project</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
