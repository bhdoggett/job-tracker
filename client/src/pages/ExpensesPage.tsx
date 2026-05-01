import { useEffect, useState } from "react";
import type { Expense, Project } from "@job-tracker/shared";
import { expensesApi } from "../api/expenses.ts";
import { projectsApi } from "../api/projects.ts";
import { Button } from "../components/ui/Button.tsx";
import { Modal } from "../components/ui/Modal.tsx";
import { Input, Select, Textarea } from "../components/ui/Input.tsx";
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

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [sortCol, setSortCol] = useState<"description" | "project" | "category" | "date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    projectId: "",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    category: "",
    notes: "",
  });

  const BLANK_FORM = { projectId: "", description: "", amount: "", date: new Date().toISOString().slice(0, 10), category: "", notes: "" };

  const openNew = () => {
    setEditingExpense(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      projectId: expense.projectId ? String(expense.projectId) : "",
      description: expense.description,
      amount: parseFloat(expense.amount).toString(),
      date: expense.date,
      category: expense.category ?? "",
      notes: expense.notes ?? "",
    });
    setShowForm(true);
  };

  useEffect(() => {
    expensesApi.list().then(setExpenses).catch(console.error);
    projectsApi.list().then(setProjects).catch(console.error);
  }, []);

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      projectId: form.projectId ? parseInt(form.projectId, 10) : null,
      description: form.description,
      amount: form.amount,
      date: form.date,
      category: form.category || null,
      notes: form.notes || null,
    };
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
              <td>{e.description}</td>
              <td>{e.projectId ? (projects.find((p) => p.id === e.projectId)?.name ?? `#${e.projectId}`) : "—"}</td>
              <td>{e.category ?? "—"}</td>
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
            <Select label="Project (optional)" value={form.projectId} onChange={set("projectId")}>
              <option value="">No project — general business</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>
              ))}
            </Select>
            <Input label="Description" value={form.description} onChange={set("description")} required />
            <Input label="Amount ($)" type="number" step="0.01" min="0" value={form.amount} onChange={set("amount")} required />
            <Input label="Date" type="date" value={form.date} onChange={set("date")} required />
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
                {SUGGESTED_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <Textarea label="Notes" value={form.notes} onChange={set("notes")} />
            <Button type="submit">{editingExpense ? "Save Changes" : "Add Expense"}</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
