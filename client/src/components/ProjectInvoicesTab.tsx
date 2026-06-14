import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Invoice } from "@job-tracker/shared";
import { invoicesApi } from "../api/invoices";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import styles from "./ProjectInvoicesTab.module.css";

interface Props {
  projectId: number;
}

function emptyForm() {
  return {
    issuedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    periodStart: "",
    periodEnd: "",
    taxRate: "0",
  };
}

export function ProjectInvoicesTab({ projectId }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const navigate = useNavigate();

  useEffect(() => {
    invoicesApi.list({ projectId }).then(setInvoices).catch(console.error);
  }, [projectId]);

  const openCreate = () => {
    setCreateError(null);
    setForm(emptyForm());
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const inv = await invoicesApi.create({
        projectId,
        issuedDate: form.issuedDate,
        dueDate: form.dueDate || undefined,
        periodStart: form.periodStart || undefined,
        periodEnd: form.periodEnd || undefined,
        taxRate: form.taxRate,
      });
      navigate(`/invoices/${inv.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create invoice");
    }
  };

  return (
    <div>
      <div className={styles.tabHeader}>
        <Button size="sm" onClick={openCreate}>
          New Invoice
        </Button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Status</th>
            <th>Issued</th>
            <th>Due</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className={styles.row} onClick={() => navigate(`/invoices/${inv.id}`)}>
              <td>{inv.invoiceNumber}</td>
              <td><Badge value={inv.status} /></td>
              <td>{inv.issuedDate}</td>
              <td>{inv.dueDate ?? "—"}</td>
              <td>${parseFloat(inv.total).toFixed(2)}</td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={5} className={styles.empty}>
                No invoices yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showCreate && (
        <Modal title="New Invoice" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <Input
              label="Issued Date"
              type="date"
              value={form.issuedDate}
              onChange={(e) => setForm((f) => ({ ...f, issuedDate: e.target.value }))}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
            <Input
              label="Period Start"
              type="date"
              value={form.periodStart}
              onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
            />
            <Input
              label="Period End"
              type="date"
              value={form.periodEnd}
              onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
            />
            <Input
              label="Tax Rate (e.g. 0.0875 for 8.75%)"
              type="number"
              step="0.0001"
              value={form.taxRate}
              onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
            />
            {createError && <p className={styles.error}>{createError}</p>}
            <Button type="submit">Generate Invoice</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
