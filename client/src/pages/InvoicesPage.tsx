import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Invoice, Project } from "@job-tracker/shared";
import { invoicesApi } from "../api/invoices.ts";
import { projectsApi } from "../api/projects.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input, Select } from "../components/ui/Input.tsx";
import styles from "./InvoicesPage.module.css";

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [sortCol, setSortCol] = useState<"invoiceNumber" | "project" | "status" | "issuedDate" | "dueDate" | "total">("issuedDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [form, setForm] = useState({
    projectId: "",
    issuedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    periodStart: "",
    periodEnd: "",
    taxRate: "0",
  });
  const [editForm, setEditForm] = useState({
    status: "draft" as Invoice["status"],
    issuedDate: "",
    dueDate: "",
    periodStart: "",
    periodEnd: "",
    taxRate: "",
    notes: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    invoicesApi.list().then(setInvoices).catch(console.error);
    projectsApi.list().then(setProjects).catch(console.error);
  }, []);

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const arrow = (col: typeof sortCol) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const sorted = [...invoices].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortCol === "invoiceNumber") { av = a.invoiceNumber; bv = b.invoiceNumber; }
    else if (sortCol === "project") {
      av = projects.find((p) => p.id === a.projectId)?.name ?? "";
      bv = projects.find((p) => p.id === b.projectId)?.name ?? "";
    }
    else if (sortCol === "status") { av = a.status; bv = b.status; }
    else if (sortCol === "issuedDate") { av = a.issuedDate; bv = b.issuedDate; }
    else if (sortCol === "dueDate") { av = a.dueDate ?? ""; bv = b.dueDate ?? ""; }
    else if (sortCol === "total") { av = parseFloat(a.total); bv = parseFloat(b.total); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const openEdit = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingInvoice(inv);
    setEditForm({
      status: inv.status,
      issuedDate: inv.issuedDate,
      dueDate: inv.dueDate ?? "",
      periodStart: inv.periodStart ?? "",
      periodEnd: inv.periodEnd ?? "",
      taxRate: inv.taxRate,
      notes: inv.notes ?? "",
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    const updated = await invoicesApi.update(editingInvoice.id, {
      status: editForm.status,
      issuedDate: editForm.issuedDate,
      dueDate: editForm.dueDate || null,
      periodStart: editForm.periodStart || null,
      periodEnd: editForm.periodEnd || null,
      taxRate: editForm.taxRate,
      notes: editForm.notes || null,
    });
    setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setEditingInvoice(null);
  };

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    await invoicesApi.delete(deletingInvoice.id);
    setInvoices((prev) => prev.filter((i) => i.id !== deletingInvoice.id));
    setDeletingInvoice(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = await invoicesApi.create({
      projectId: parseInt(form.projectId, 10),
      issuedDate: form.issuedDate,
      dueDate: form.dueDate || undefined,
      periodStart: form.periodStart || undefined,
      periodEnd: form.periodEnd || undefined,
      taxRate: form.taxRate,
    });
    setInvoices((prev) => [inv, ...prev]);
    setShowCreate(false);
    navigate(`/invoices/${inv.id}`);
  };

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Invoices</h1>
        <Button onClick={() => setShowCreate(true)}>New Invoice</Button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.sortable} onClick={() => toggleSort("invoiceNumber")}>Invoice #{arrow("invoiceNumber")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("project")}>Project{arrow("project")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("status")}>Status{arrow("status")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("issuedDate")}>Issued{arrow("issuedDate")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("dueDate")}>Due{arrow("dueDate")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("total")}>Total{arrow("total")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((inv) => (
            <tr
              key={inv.id}
              className={styles.row}
              onClick={() => navigate(`/invoices/${inv.id}`)}
            >
              <td>{inv.invoiceNumber}</td>
              <td>{projects.find((p) => p.id === inv.projectId)?.name ?? `#${inv.projectId}`}</td>
              <td><Badge value={inv.status} /></td>
              <td>{inv.issuedDate}</td>
              <td>{inv.dueDate ?? "—"}</td>
              <td>${parseFloat(inv.total).toFixed(2)}</td>
              <td className={styles.actions} onClick={(e) => e.stopPropagation()}>
                <button className={styles.actionBtn} onClick={(e) => openEdit(inv, e)}>Edit</button>
                <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={(e) => { e.stopPropagation(); setDeletingInvoice(inv); }}>Delete</button>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={6} className={styles.empty}>
                No invoices yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editingInvoice && (
        <Modal title={`Edit Invoice ${editingInvoice.invoiceNumber}`} onClose={() => setEditingInvoice(null)}>
          <form onSubmit={handleEdit}>
            <Select
              label="Status"
              value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as Invoice["status"] }))}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </Select>
            <Input label="Issued Date" type="date" value={editForm.issuedDate} onChange={(e) => setEditForm((f) => ({ ...f, issuedDate: e.target.value }))} required />
            <Input label="Due Date" type="date" value={editForm.dueDate} onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))} />
            <Input label="Period Start" type="date" value={editForm.periodStart} onChange={(e) => setEditForm((f) => ({ ...f, periodStart: e.target.value }))} />
            <Input label="Period End" type="date" value={editForm.periodEnd} onChange={(e) => setEditForm((f) => ({ ...f, periodEnd: e.target.value }))} />
            <Input label="Tax Rate" type="number" step="0.0001" value={editForm.taxRate} onChange={(e) => setEditForm((f) => ({ ...f, taxRate: e.target.value }))} />
            <Input label="Notes" value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
            <Button type="submit">Save Changes</Button>
          </form>
        </Modal>
      )}

      {deletingInvoice && (
        <Modal title="Delete Invoice" onClose={() => setDeletingInvoice(null)}>
          <p style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
            Delete invoice <strong>{deletingInvoice.invoiceNumber}</strong>? This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button onClick={handleDelete}>Delete</Button>
            <Button onClick={() => setDeletingInvoice(null)}>Cancel</Button>
          </div>
        </Modal>
      )}

      {showCreate && (
        <Modal title="New Invoice" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
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
            <Input
              label="Issued Date"
              type="date"
              value={form.issuedDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, issuedDate: e.target.value }))
              }
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, dueDate: e.target.value }))
              }
            />
            <Input
              label="Period Start"
              type="date"
              value={form.periodStart}
              onChange={(e) =>
                setForm((f) => ({ ...f, periodStart: e.target.value }))
              }
            />
            <Input
              label="Period End"
              type="date"
              value={form.periodEnd}
              onChange={(e) =>
                setForm((f) => ({ ...f, periodEnd: e.target.value }))
              }
            />
            <Input
              label="Tax Rate (e.g. 0.0875 for 8.75%)"
              type="number"
              step="0.0001"
              value={form.taxRate}
              onChange={(e) =>
                setForm((f) => ({ ...f, taxRate: e.target.value }))
              }
            />
            <Button type="submit">Generate Invoice</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
