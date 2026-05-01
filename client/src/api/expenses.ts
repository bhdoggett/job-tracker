import type { Expense } from "@job-tracker/shared";
import { api } from "./client.ts";

export const expensesApi = {
  list: (projectId?: number) => {
    const q = projectId ? `?projectId=${projectId}` : "";
    return api.get<Expense[]>(`/api/expenses${q}`);
  },
  create: (data: Partial<Expense>) => api.post<Expense>("/api/expenses", data),
  update: (id: number, data: Partial<Expense>) =>
    api.patch<Expense>(`/api/expenses/${id}`, data),
  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/api/expenses/${id}`),
};
