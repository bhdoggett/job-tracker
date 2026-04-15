import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Invoice } from "@job-tracker/shared";
import { invoicesApi } from "../api/invoices.ts";
import { Badge } from "../components/ui/Badge.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Select } from "../components/ui/Input.tsx";
import styles from "./InvoiceDetailPage.module.css";

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceId = parseInt(id!, 10);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    invoicesApi.get(invoiceId).then(setInvoice).catch(console.error);
  }, [invoiceId]);

  const handleStatusChange = async (status: string) => {
    const updated = await invoicesApi.update(invoiceId, { status: status as Invoice["status"] });
    setInvoice(updated);
  };

  if (!invoice) return <p>Loading...</p>;

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <button className={styles.back} onClick={() => navigate("/invoices")}>
          ← Invoices
        </button>
        <div className={styles.actionBtns}>
          <Select
            label=""
            value={invoice.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
          </Select>
          <Button variant="secondary" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      </div>

      <div className={styles.invoice}>
        <div className={styles.invoiceHeader}>
          <div>
            <h1 className={styles.invoiceNumber}>{invoice.invoiceNumber}</h1>
            <Badge value={invoice.status} />
          </div>
          <div className={styles.dates}>
            <div>
              <span className={styles.dateLabel}>Issued</span>
              <span>{invoice.issuedDate}</span>
            </div>
            {invoice.dueDate && (
              <div>
                <span className={styles.dateLabel}>Due</span>
                <span>{invoice.dueDate}</span>
              </div>
            )}
          </div>
        </div>

        <table className={styles.lineItems}>
          <thead>
            <tr>
              <th>Description</th>
              <th className={styles.right}>Qty</th>
              <th className={styles.right}>Unit Price</th>
              <th className={styles.right}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lineItems ?? []).map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td className={styles.right}>{item.quantity}</td>
                <td className={styles.right}>${parseFloat(item.unitPrice).toFixed(2)}</td>
                <td className={styles.right}>${parseFloat(item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal</span>
            <span>${parseFloat(invoice.subtotal).toFixed(2)}</span>
          </div>
          {parseFloat(invoice.taxRate) > 0 && (
            <div className={styles.totalRow}>
              <span>Tax ({(parseFloat(invoice.taxRate) * 100).toFixed(2)}%)</span>
              <span>${parseFloat(invoice.taxAmount).toFixed(2)}</span>
            </div>
          )}
          <div className={`${styles.totalRow} ${styles.grandTotal}`}>
            <span>Total</span>
            <span>${parseFloat(invoice.total).toFixed(2)}</span>
          </div>
        </div>

        {invoice.notes && <p className={styles.notes}>{invoice.notes}</p>}
      </div>
    </div>
  );
}
