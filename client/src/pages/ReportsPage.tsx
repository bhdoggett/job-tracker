import { TasksPage } from "./TasksPage";
import { TimesheetsPage } from "./TimesheetsPage";
import { InvoicesPage } from "./InvoicesPage";
import { ExpensesPage } from "./ExpensesPage";
import { useTabParam } from "../lib/useTabParam";
import styles from "./ReportsPage.module.css";

type Tab = "tasks" | "timesheets" | "invoices" | "expenses";

const TABS: { key: Tab; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "timesheets", label: "Timesheets" },
  { key: "invoices", label: "Invoices" },
  { key: "expenses", label: "Expenses" },
];

const TAB_KEYS = TABS.map((t) => t.key);

export function ReportsPage() {
  const [tab, setTab] = useTabParam<Tab>(TAB_KEYS, "tasks");

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Reports</h1>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab}${tab === t.key ? ` ${styles.tabActive}` : ""}`}
              aria-current={tab === t.key ? "page" : undefined}
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
