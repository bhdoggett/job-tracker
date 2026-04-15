import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Invoice } from "@job-tracker/shared";
import { invoicesApi } from "../api/invoices.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input } from "../components/ui/Input.tsx";
import styles from "./InvoicesPage.module.css";

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    issuedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    periodStart: "",
    periodEnd: "",
    taxRate: "0",
  });
  const navigate = useNavigate();

  useEffect(() => {
    invoicesApi.list().then(setInvoices).catch(console.error);
  }, []);

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
            <th>Invoice #</th>
            <th>Issued</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className={styles.row}
              onClick={() => navigate(`/invoices/${inv.id}`)}
            >
              <td>{inv.invoiceNumber}</td>
              <td>{inv.issuedDate}</td>
              <td>${parseFloat(inv.total).toFixed(2)}</td>
              <td>
                <Badge value={inv.status} />
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={4} className={styles.empty}>
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
              label="Project ID"
              type="number"
              value={form.projectId}
              onChange={(e) =>
                setForm((f) => ({ ...f, projectId: e.target.value }))
              }
              required
            />
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
