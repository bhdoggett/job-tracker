import { useState } from "react";
import { TasksPage } from "./TasksPage";
import { TimesheetsPage } from "./TimesheetsPage";
import { InvoicesPage } from "./InvoicesPage";
import { ExpensesPage } from "./ExpensesPage";
import styles from "./ReportsPage.module.css";

type Tab = "tasks" | "timesheets" | "invoices" | "expenses";

const TABS: { key: Tab; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "timesheets", label: "Timesheets" },
  { key: "invoices", label: "Invoices" },
  { key: "expenses", label: "Expenses" },
];

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("tasks");

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Reports</h1>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab}${tab === t.key ? ` ${styles.tabActive}` : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {tab === "tasks" && <TasksPage embedded />}
        {tab === "timesheets" && <TimesheetsPage embedded />}
        {tab === "invoices" && <InvoicesPage embedded />}
        {tab === "expenses" && <ExpensesPage embedded />}
      </div>
    </div>
  );
}
