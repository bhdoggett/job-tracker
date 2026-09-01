import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// These pages fetch on mount. This suite is about routing — which URL resolves to
// which page — so the network layer is stubbed out to keep the assertions about
// navigation rather than data loading.
// vi.mock factories are hoisted above module scope, so fixtures live inside them.
vi.mock("./api/invoices", () => ({
  invoicesApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({
      id: 1,
      projectId: 1,
      invoiceNumber: "INV-2026-001",
      status: "draft",
      issuedDate: "2026-08-01",
      dueDate: "2026-08-31",
      subtotal: "0",
      taxRate: "0",
      taxAmount: "0",
      total: "0",
      lineItems: [],
      timeEntryIds: [],
    }),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    autoDraft: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("./api/projects", () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({
      id: 1,
      name: "A Project",
      clientName: "A Client",
      rate: "100.00",
    }),
    create: vi.fn(),
  },
}));
vi.mock("./api/tasks", () => ({
  tasksApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), delete: vi.fn() },
}));
vi.mock("./api/time-entries", () => ({
  timeEntriesApi: { list: vi.fn().mockResolvedValue([]) },
}));
vi.mock("./api/expenses", () => ({
  expensesApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn() },
}));
vi.mock("./api/docs", () => ({ docsApi: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("./api/profile", () => ({ profileApi: { get: vi.fn().mockResolvedValue(null) } }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe("App routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Regression: InvoiceDetailPage's back button calls navigate("/invoices").
  // With no such route and no catch-all, React Router rendered nothing and the
  // user landed on a blank screen.
  it("renders the invoices list at /invoices", async () => {
    renderAt("/invoices");
    expect(await screen.findByRole("heading", { name: "Invoices" })).toBeInTheDocument();
  });

  it("renders the tasks page at /tasks", async () => {
    renderAt("/tasks");
    expect(await screen.findByRole("heading", { name: /tasks/i })).toBeInTheDocument();
  });

  it("renders the timesheets page at /timesheets", async () => {
    renderAt("/timesheets");
    expect(await screen.findByRole("heading", { name: /timesheets/i })).toBeInTheDocument();
  });

  it("renders the expenses page at /expenses", async () => {
    renderAt("/expenses");
    expect(await screen.findByRole("heading", { name: /expenses/i })).toBeInTheDocument();
  });

  // Defense in depth: any unmatched path should land somewhere real rather than
  // rendering an empty <main>, which is indistinguishable from a crash.
  it("redirects an unknown path to projects instead of rendering blank", async () => {
    renderAt("/no-such-page");
    expect(await screen.findByRole("heading", { name: /projects/i })).toBeInTheDocument();
  });

  it("still renders a single invoice at /invoices/:id", async () => {
    renderAt("/invoices/1");
    // The detail page owns the back control that started this bug.
    expect(await screen.findByRole("button", { name: /invoices/i })).toBeInTheDocument();
  });
});
