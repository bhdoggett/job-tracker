import type { Invoice, InvoiceLineItem } from "@job-tracker/shared";
import { api } from "./client.ts";

export const invoicesApi = {
  list: (params?: { projectId?: number; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set("projectId", String(params.projectId));
    if (params?.status) qs.set("status", params.status);
    const q = qs.toString();
    return api.get<Invoice[]>(`/api/invoices${q ? `?${q}` : ""}`);
  },
  get: (id: number) => api.get<Invoice>(`/api/invoices/${id}`),
  create: (data: Partial<Invoice> & { projectId: number; issuedDate: string }) =>
    api.post<Invoice>("/api/invoices", data),
  update: (id: number, data: Partial<Invoice>) =>
    api.patch<Invoice>(`/api/invoices/${id}`, data),
  delete: (id: number) =>
    api.delete<{ success: boolean }>(`/api/invoices/${id}`),
  addLineItem: (invoiceId: number, data: Partial<InvoiceLineItem>) =>
    api.post<InvoiceLineItem>(`/api/invoices/${invoiceId}/line-items`, data),
  updateLineItem: (
    invoiceId: number,
    itemId: number,
    data: Partial<InvoiceLineItem>
  ) =>
    api.patch<InvoiceLineItem>(
      `/api/invoices/${invoiceId}/line-items/${itemId}`,
      data
    ),
  deleteLineItem: (invoiceId: number, itemId: number) =>
    api.delete<{ success: boolean }>(
      `/api/invoices/${invoiceId}/line-items/${itemId}`
    ),
};
