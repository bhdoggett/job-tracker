import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

type Entry = string | { pathname: string; state?: unknown };

// These pages fetch on mount. This suite is about navigation — which URL shows
// which page, and where "back" lands — so the network layer is stubbed out.
// vi.mock factories are hoisted above module scope, so fixtures live inside them.
vi.mock("./api/invoices", () => ({
  invoicesApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({
      id: 1,
      projectId: 7,
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
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
    autoDraft: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("./api/projects", () => ({
  projectsApi: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({
      id: 7,
      name: "Acme Rebuild",
      clientName: "Acme",
      rate: "100.00",
      status: "active",
      rateType: "hourly",
      startDate: "2026-01-01",
    }),
    create: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("./api/tasks", () => ({
  tasksApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), delete: vi.fn(), update: vi.fn() },
}));
vi.mock("./api/time-entries", () => ({
  timeEntriesApi: { list: vi.fn().mockResolvedValue([]) },
}));
vi.mock("./api/expenses", () => ({
  expensesApi: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn() },
}));
vi.mock("./api/docs", () => ({ docsApi: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("./api/profile", () => ({ profileApi: { get: vi.fn().mockResolvedValue(null) } }));

function renderAt(entry: Entry) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <App />
    </MemoryRouter>
  );
}

describe("App routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the projects list at /projects", async () => {
    renderAt("/projects");
    expect(await screen.findByRole("heading", { name: /projects/i })).toBeInTheDocument();
  });

  it("renders a single invoice at /invoices/:id", async () => {
    renderAt("/invoices/1");
    expect(await screen.findByText("INV-2026-001")).toBeInTheDocument();
  });

  // The four report pages are rendered as tabs inside /reports, not as standalone
  // routes. An old bookmark to one of them must not present as a crash.
  it.each(["/invoices", "/tasks", "/timesheets", "/expenses", "/no-such-page"])(
    "redirects %s to projects instead of rendering blank",
    async (path) => {
      renderAt(path);
      expect(await screen.findByRole("heading", { name: /projects/i })).toBeInTheDocument();
    }
  );
});

describe("Reports tab is driven by the URL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the invoices tab when ?tab=invoices", async () => {
    renderAt("/reports?tab=invoices");
    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invoices" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("falls back to the default tab for an unknown tab value", async () => {
    renderAt("/reports?tab=nonsense");
    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-current", "page");
  });
});

describe("Project detail tab is driven by the URL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the invoices tab when ?tab=invoices", async () => {
    renderAt("/projects/7?tab=invoices");
    expect(await screen.findByRole("button", { name: "Invoices" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});

describe("Invoice detail back button", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns to Reports on the invoices tab when that is where you came from", async () => {
    renderAt({
      pathname: "/invoices/1",
      state: { from: "/reports?tab=invoices", label: "Reports" },
    });

    const back = await screen.findByRole("button", { name: /← reports/i });
    await userEvent.click(back);

    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invoices" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("returns to the project on its invoices tab when that is where you came from", async () => {
    renderAt({
      pathname: "/invoices/1",
      state: { from: "/projects/7?tab=invoices", label: "Acme Rebuild" },
    });

    const back = await screen.findByRole("button", { name: /← acme rebuild/i });
    await userEvent.click(back);

    expect(await screen.findByRole("button", { name: "Invoices" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  // Opening an invoice URL directly carries no origin, so it must still lead
  // somewhere real — the project that owns the invoice.
  it("falls back to the owning project when there is no origin", async () => {
    renderAt("/invoices/1");

    const back = await screen.findByRole("button", { name: /←/ });
    await userEvent.click(back);

    expect(await screen.findByRole("button", { name: "Invoices" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
