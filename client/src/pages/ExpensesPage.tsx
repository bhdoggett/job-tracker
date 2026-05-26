import { useEffect, useState } from "react";
import type { Expense, Project } from "@job-tracker/shared";
import { expensesApi } from "../api/expenses";
import { projectsApi } from "../api/projects";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Input, Select, Textarea } from "../components/ui/Input";
import {
  IRS_MILEAGE_RATE_2026,
  calcMileageAmount,
  fetchDrivingDistance,
  hasOrsKey,
} from "../lib/mileage";
import styles from "./ExpensesPage.module.css";

const SUGGESTED_CATEGORIES = [
  "General Business Operations",
  "Software",
  "Hardware",
  "Travel",
  "Meals & Entertainment",
  "Office Supplies",
  "Professional Services",
  "Other",
];

function truncate(s: string | null | undefined, max = 28): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sortCol, setSortCol] = useState<"description" | "project" | "category" | "date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Shared form fields (both expense and mileage)
  const [form, setForm] = useState({
    projectId: "",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    category: "",
    notes: "",
  });

  // Mileage-specific state
  const [entryType, setEntryType] = useState<"expense" | "mileage">("expense");
  const [mileageForm, setMileageForm] = useState({
    fromAddress: "",
    toAddress: "",
    miles: "",
    rate: String(IRS_MILEAGE_RATE_2026),
  });
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [routeError, setRouteError] = useState("");

  const BLANK_FORM = {
    projectId: "",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    category: "",
    notes: "",
  };
  const BLANK_MILEAGE = {
    fromAddress: "",
    toAddress: "",
    miles: "",
    rate: String(IRS_MILEAGE_RATE_2026),
  };

  const openNew = () => {
    setEditingExpense(null);
    setForm(BLANK_FORM);
    setEntryType("expense");
    setMileageForm(BLANK_MILEAGE);
    setRouteStatus("idle");
    setRouteError("");
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    const type = expense.type ?? "expense";
    setEntryType(type);
    setForm({
      projectId: expense.projectId ? String(expense.projectId) : "",
      description: expense.description,
      amount: parseFloat(expense.amount).toString(),
      date: expense.date,
      category: expense.category ?? "",
      notes: expense.notes ?? "",
    });
    if (type === "mileage") {
      setMileageForm({
        fromAddress: expense.fromAddress ?? "",
        toAddress: expense.toAddress ?? "",
        miles: expense.miles ?? "",
        rate: String(IRS_MILEAGE_RATE_2026),
      });
      setRouteStatus("done");
    } else {
      setMileageForm(BLANK_MILEAGE);
      setRouteStatus("idle");
    }
    setRouteError("");
    setShowForm(true);
  };

  useEffect(() => {
    expensesApi.list().then(setExpenses).catch(console.error);
    projectsApi.list().then(setProjects).catch(console.error);
  }, []);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const setMileage = (field: keyof typeof mileageForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setMileageForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCalcRoute = async () => {
    setRouteStatus("loading");
    setRouteError("");
    try {
      const miles = await fetchDrivingDistance(mileageForm.fromAddress, mileageForm.toAddress);
      setMileageForm((f) => ({ ...f, miles: String(miles) }));
      setRouteStatus("done");
    } catch (err) {
      setRouteStatus("error");
      setRouteError(err instanceof Error ? err.message : "Route calculation failed");
    }
  };

  const mileageTotal = calcMileageAmount(
    parseFloat(mileageForm.miles || "0"),
    parseFloat(mileageForm.rate || String(IRS_MILEAGE_RATE_2026))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let data: Partial<Expense>;
    if (entryType === "mileage") {
      data = {
        projectId: form.projectId ? parseInt(form.projectId, 10) : null,
        description: form.description,
        amount: mileageTotal.toFixed(2),
        date: form.date,
        category: null,
        notes: form.notes || null,
        type: "mileage",
        fromAddress: mileageForm.fromAddress,
        toAddress: mileageForm.toAddress,
        miles: mileageForm.miles,
      };
    } else {
      data = {
        projectId: form.projectId ? parseInt(form.projectId, 10) : null,
        description: form.description,
        amount: form.amount,
        date: form.date,
        category: form.category || null,
        notes: form.notes || null,
        type: "expense",
        fromAddress: null,
        toAddress: null,
        miles: null,
      };
    }
    if (editingExpense) {
      const updated = await expensesApi.update(editingExpense.id, data);
      setExpenses((prev) => prev.map((ex) => (ex.id === updated.id ? updated : ex)));
    } else {
      const created = await expensesApi.create(data);
      setExpenses((prev) => [created, ...prev]);
    }
    setShowForm(false);
    setEditingExpense(null);
  };

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const sorted = [...expenses].sort((a, b) => {
    let av: string | number = "";
    let bv: string | number = "";
    if (sortCol === "description") { av = a.description; bv = b.description; }
    else if (sortCol === "project") {
      av = a.projectId ? (projects.find((p) => p.id === a.projectId)?.name ?? "") : "";
      bv = b.projectId ? (projects.find((p) => p.id === b.projectId)?.name ?? "") : "";
    }
    else if (sortCol === "category") { av = a.category ?? ""; bv = b.category ?? ""; }
    else if (sortCol === "date") { av = a.date; bv = b.date; }
    else if (sortCol === "amount") { av = parseFloat(a.amount); bv = parseFloat(b.amount); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const arrow = (col: typeof sortCol) =>
    sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const calcBtnLabel = () => {
    if (routeStatus === "loading") return "Calculating…";
    if (routeStatus === "done") return `✓ Route calculated — ${mileageForm.miles} mi`;
    if (routeStatus === "error") return routeError;
    if (!hasOrsKey) return "Calculate Route (add VITE_ORS_API_KEY to .env)";
    return "Calculate Route";
  };

  const calcBtnClass = [
    styles.calcBtn,
    routeStatus === "done" ? styles.calcBtnDone : "",
    routeStatus === "error" ? styles.calcBtnError : "",
  ].filter(Boolean).join(" ");

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Expenses <span className={styles.total}>${total.toFixed(2)} total</span>
        </h1>
        <Button onClick={openNew}>Add Expense</Button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.sortable} onClick={() => toggleSort("description")}>Description{arrow("description")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("project")}>Project{arrow("project")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("category")}>Category{arrow("category")}</th>
            <th className={styles.sortable} onClick={() => toggleSort("date")}>Date{arrow("date")}</th>
            <th className={`${styles.right} ${styles.sortable}`} onClick={() => toggleSort("amount")}>Amount{arrow("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => (
            <tr key={e.id} className={styles.row} onClick={() => openEdit(e)}>
              <td>
                {e.type === "mileage" ? (
                  <>
                    <span className={styles.tagMileage}>Mileage</span>
                    <div>{e.description}</div>
                    <span className={styles.routeHint}>
                      {truncate(e.fromAddress)} → {truncate(e.toAddress)} · {e.miles} mi
                    </span>
                  </>
                ) : e.description}
              </td>
              <td>{e.projectId ? (projects.find((p) => p.id === e.projectId)?.name ?? `#${e.projectId}`) : "—"}</td>
              <td>{e.type === "mileage" ? "—" : (e.category ?? "—")}</td>
              <td>{e.date}</td>
              <td className={styles.right}>${parseFloat(e.amount).toFixed(2)}</td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr>
              <td colSpan={5} className={styles.empty}>No expenses yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <Modal title={editingExpense ? "Edit Expense" : "Add Expense"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit}>
            {/* Type toggle */}
            <div className={styles.typeToggle}>
              <button
                type="button"
                className={`${styles.typeBtn} ${entryType === "expense" ? styles.typeBtnActive : ""}`}
                onClick={() => { setEntryType("expense"); setRouteStatus("idle"); setRouteError(""); }}
              >
                Expense
              </button>
              <button
                type="button"
                className={`${styles.typeBtn} ${entryType === "mileage" ? styles.typeBtnActive : ""}`}
                onClick={() => { setEntryType("mileage"); setRouteStatus("idle"); setRouteError(""); }}
              >
                Mileage
              </button>
            </div>

            {/* Shared: project + date */}
            <Select label="Project (optional)" value={form.projectId} onChange={set("projectId")}>
              <option value="">No project — general business</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>
              ))}
            </Select>
            <Input label="Date" type="date" value={form.date} onChange={set("date")} required />

            {entryType === "expense" ? (
              /* ── Expense fields ── */
              <>
                <Input label="Description" value={form.description} onChange={set("description")} required />
                <Input label="Amount ($)" type="number" step="0.01" min="0" value={form.amount} onChange={set("amount")} required />
                <div>
                  <label className={styles.categoryLabel}>Category</label>
                  <input
                    list="expense-categories"
                    className={styles.categoryInput}
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="Select or type a category…"
                  />
                  <datalist id="expense-categories">
                    {SUGGESTED_CATEGORIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </>
            ) : (
              /* ── Mileage fields ── */
              <>
                {/* Address group */}
                <div style={{ marginBottom: "0.25rem", fontSize: "0.8rem", fontWeight: 500, color: "var(--color-text-muted)" }}>
                  Route
                </div>
                <div className={styles.addressGroup}>
                  <div className={styles.addrRow}>
                    <span className={styles.addrLabel}>From</span>
                    <input
                      className={styles.addrInput}
                      value={mileageForm.fromAddress}
                      onChange={setMileage("fromAddress")}
                      placeholder="123 Main St, Chicago, IL"
                      required
                    />
                  </div>
                  <div className={styles.addrRow}>
                    <span className={styles.addrLabel}>To</span>
                    <input
                      className={styles.addrInput}
                      value={mileageForm.toAddress}
                      onChange={setMileage("toAddress")}
                      placeholder="456 Oak Ave, Evanston, IL"
                      required
                    />
                  </div>
                </div>

                {/* Calculate route button */}
                <button
                  type="button"
                  className={calcBtnClass}
                  onClick={handleCalcRoute}
                  disabled={
                    !hasOrsKey ||
                    routeStatus === "loading" ||
                    !mileageForm.fromAddress.trim() ||
                    !mileageForm.toAddress.trim()
                  }
                >
                  {calcBtnLabel()}
                </button>

                {/* Miles / Rate / Total */}
                <div className={styles.calcSummary}>
                  <div className={styles.calcItem}>
                    <label>Miles</label>
                    <input
                      className={styles.calcItemInput}
                      type="number"
                      step="0.1"
                      min="0"
                      value={mileageForm.miles}
                      onChange={setMileage("miles")}
                      placeholder="0.0"
                      required
                    />
                  </div>
                  <div className={styles.calcItem}>
                    <label>Rate / mi</label>
                    <input
                      className={styles.calcItemInput}
                      type="number"
                      step="0.01"
                      min="0"
                      value={mileageForm.rate}
                      onChange={setMileage("rate")}
                    />
                  </div>
                  <div className={styles.calcItem}>
                    <label>Total</label>
                    <div className={styles.calcTotal}>${mileageTotal.toFixed(2)}</div>
                  </div>
                </div>

                <Input
                  label="Purpose"
                  value={form.description}
                  onChange={set("description")}
                  placeholder="Client site visit"
                  required
                />
              </>
            )}

            {/* Shared: notes */}
            <Textarea label="Notes" value={form.notes} onChange={set("notes")} />

            <Button type="submit">
              {editingExpense
                ? (entryType === "mileage" ? "Save Mileage" : "Save Changes")
                : (entryType === "mileage" ? "Add Mileage" : "Add Expense")}
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
