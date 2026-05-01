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
  const [sortCol, setSortCol] = useState<"name" | "clientName" | "status" | "rateType" | "rate">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const arrow = (col: typeof sortCol) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const sorted = [...projects].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortCol === "name") { av = a.name; bv = b.name; }
    else if (sortCol === "clientName") { av = a.clientName; bv = b.clientName; }
    else if (sortCol === "status") { av = a.status; bv = b.status; }
    else if (sortCol === "rateType") { av = a.rateType; bv = b.rateType; }
    else if (sortCol === "rate") { av = parseFloat(a.rate); bv = parseFloat(b.rate); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

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
            <th className={styles.sortable} onClick={() => toggleSort("name")}>Name{arrow("name")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("clientName")}>Client{arrow("clientName")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("status")}>Status{arrow("status")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("rateType")}>Rate Type{arrow("rateType")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("rate")}>Rate{arrow("rate")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.id}
              className={styles.row}
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <td>{p.name}</td>
              <td>{p.clientName}</td>
              <td><Badge value={p.status} /></td>
              <td>{p.rateType === "hourly" ? "Hourly" : "Fixed"}</td>
              <td>${parseFloat(p.rate).toFixed(2)}{p.rateType === "hourly" ? "/hr" : ""}</td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={5} className={styles.empty}>
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
