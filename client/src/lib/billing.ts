import type { Invoice, TimeEntry } from "@job-tracker/shared";

export interface BillingSplit {
  /** Entries linked to no invoice, in the order given. */
  unbilled: TimeEntry[];
  /** Entries linked to some invoice, in the order given. */
  billed: TimeEntry[];
  /** The invoice an entry was billed on, keyed by entry id. */
  entryInvoices: Map<number, Invoice>;
  /** Hours across `unbilled`. */
  unbilledHours: number;
}

/**
 * Splits time entries by whether an invoice actually claims them.
 *
 * Deliberately linkage-based rather than date-based: an entry logged before the
 * last invoice's issue date but left off that invoice is still unbilled. Both
 * the "unbilled" total and the entry list read from this one split so they can
 * never disagree.
 */
export function splitByBilling(entries: TimeEntry[], invoices: Invoice[]): BillingSplit {
  const entryInvoices = new Map<number, Invoice>();
  for (const inv of invoices) {
    for (const entryId of inv.timeEntryIds ?? []) {
      entryInvoices.set(entryId, inv);
    }
  }

  const unbilled = entries.filter((e) => !entryInvoices.has(e.id));
  const billed = entries.filter((e) => entryInvoices.has(e.id));
  const unbilledHours = unbilled.reduce((sum, e) => sum + (e.durationMin ?? 0), 0) / 60;

  return { unbilled, billed, entryInvoices, unbilledHours };
}
