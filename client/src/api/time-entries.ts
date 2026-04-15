import type { TimeEntry } from "@job-tracker/shared";
import { api } from "./client.ts";

export const timeEntriesApi = {
  list: (params?: { projectId?: number; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("projectId", String(params.projectId));
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const q = qs.toString();
    return api.get<TimeEntry[]>(`/api/time-entries${q ? `?${q}` : ""}`);
  },
  get: (id: number) => api.get<TimeEntry>(`/api/time-entries/${id}`),
  create: (data: Partial<TimeEntry>) =>
    api.post<TimeEntry>("/api/time-entries", data),
  update: (id: number, data: Partial<TimeEntry>) =>
    api.patch<TimeEntry>(`/api/time-entries/${id}`, data),
  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/api/time-entries/${id}`),
};
