// Enums as string unions
export type ProjectStatus = "active" | "completed" | "archived";
export type RateType = "hourly" | "fixed";
export type TaskStatus = "todo" | "in_progress" | "done";
export type InvoiceStatus = "draft" | "sent" | "paid";

export interface Project {
  id: number;
  name: string;
  clientName: string;
  description: string | null;
  status: ProjectStatus;
  rateType: RateType;
  rate: string; // numeric returned as string from postgres
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: number;
  projectId: number;
  taskId: number | null;
  startedAt: string | null;
  endedAt: string | null;
  durationMin: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: number;
  projectId: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  timeEntryId: number | null;
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  createdAt: string;
}

export interface ProjectSummary {
  projectId: number;
  totalMinutes: number;
  totalHours: number;
  amountOwed: string;
  unbilledMinutes: number;
  unbilledHours: number;
  unbilledAmount: string;
}
