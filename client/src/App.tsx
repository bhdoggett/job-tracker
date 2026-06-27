import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { TimeEntriesPage } from "./pages/TimeEntriesPage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { BusinessPage } from "./pages/BusinessPage";
import { ReportsPage } from "./pages/ReportsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="time-entries" element={<TimeEntriesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="business" element={<BusinessPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
