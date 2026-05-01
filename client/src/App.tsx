import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout.tsx";
import { ProjectsPage } from "./pages/ProjectsPage.tsx";
import { ProjectDetailPage } from "./pages/ProjectDetailPage.tsx";
import { TasksPage } from "./pages/TasksPage.tsx";
import { TimeEntriesPage } from "./pages/TimeEntriesPage.tsx";
import { InvoicesPage } from "./pages/InvoicesPage.tsx";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { ExpensesPage } from "./pages/ExpensesPage.tsx";
import { BusinessPage } from "./pages/BusinessPage.tsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="time-entries" element={<TimeEntriesPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="business" element={<BusinessPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
