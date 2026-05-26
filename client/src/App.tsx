import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { TasksPage } from "./pages/TasksPage";
import { TimeEntriesPage } from "./pages/TimeEntriesPage";
import { TimesheetsPage } from "./pages/TimesheetsPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { BusinessPage } from "./pages/BusinessPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="time-entries" element={<TimeEntriesPage />} />
        <Route path="timesheets" element={<TimesheetsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="business" element={<BusinessPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
