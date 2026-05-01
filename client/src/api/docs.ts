import type { Doc } from "@job-tracker/shared";

const BASE = "/api/docs";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const docsApi = {
  list: (params: { projectId?: number; business?: boolean }) => {
    const qs = new URLSearchParams();
    if (params.projectId) qs.set("projectId", String(params.projectId));
    if (params.business) qs.set("business", "true");
    return request<Doc[]>(`${BASE}?${qs}`);
  },
  upload: (file: File, title: string, projectId?: number) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    if (projectId != null) fd.append("projectId", String(projectId));
    return request<Doc>(BASE, { method: "POST", body: fd });
  },
  downloadUrl: (id: number) => `${BASE}/${id}/download`,
  delete: (id: number) => request<{ success: boolean }>(`${BASE}/${id}`, { method: "DELETE" }),
};
