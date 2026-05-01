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
  notes: string | null;
  status: ProjectStatus;
  rateType: RateType;
  rate: string; // numeric returned as string from postgres
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  projectId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: number;
  projectId: number;
  taskId: number | null;
  taskIds?: number[];
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

export interface Expense {
  id: number;
  projectId: number | null;
  description: string;
  amount: string;
  date: string;
  category: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Doc {
  id: number;
  projectId: number | null;
  title: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: number;
  businessName: string | null;
  yourName: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  ein: string | null;       // decrypted by API, never stored raw in frontend
  website: string | null;
  defaultTaxRate: string | null;
  defaultPaymentTerms: string | null;
  paymentInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}
