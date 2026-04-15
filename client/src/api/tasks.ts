import type { Task } from "@job-tracker/shared";
import { api } from "./client.ts";

export const tasksApi = {
  list: (params?: { projectId?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("projectId", String(params.projectId));
    if (params?.status) qs.set("status", params.status);
    const q = qs.toString();
    return api.get<Task[]>(`/api/tasks${q ? `?${q}` : ""}`);
  },
  get: (id: number) => api.get<Task>(`/api/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<Task>("/api/tasks", data),
  update: (id: number, data: Partial<Task>) =>
    api.patch<Task>(`/api/tasks/${id}`, data),
  delete: (id: number) => api.delete<{ success: boolean }>(`/api/tasks/${id}`),
};
