import type { Project, ProjectSummary } from "@job-tracker/shared";
import { api } from "./client.ts";

export const projectsApi = {
  list: (status?: string) =>
    api.get<Project[]>(`/api/projects${status ? `?status=${status}` : ""}`),
  get: (id: number) => api.get<Project>(`/api/projects/${id}`),
  create: (data: Partial<Project>) => api.post<Project>("/api/projects", data),
  update: (id: number, data: Partial<Project>) =>
    api.patch<Project>(`/api/projects/${id}`, data),
  delete: (id: number) => api.delete<{ success: boolean }>(`/api/projects/${id}`),
  summary: (id: number) => api.get<ProjectSummary>(`/api/projects/${id}/summary`),
};
