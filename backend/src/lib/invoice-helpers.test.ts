import { describe, it, expect } from "vitest";
import { groupTimeEntriesByDay, getMostRecentCompletedPeriod } from "./invoice-helpers";

describe("groupTimeEntriesByDay", () => {
  it("groups multiple entries on the same day into one row", () => {
    const result = groupTimeEntriesByDay([
      { startedAt: "2026-06-01T09:00:00Z", durationMin: 120, notes: "Morning work", taskTitles: ["Bug fix"] },
      { startedAt: "2026-06-01T13:00:00Z", durationMin: 120, notes: "Afternoon work", taskTitles: ["Code review"] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-06-01");
    expect(result[0].totalMinutes).toBe(240);
    expect(result[0].tasks).toBe("Bug fix, Code review");
    expect(result[0].description).toBe("Morning work; Afternoon work");
  });

  it("produces separate rows for different days, sorted ascending", () => {
    const result = groupTimeEntriesByDay([
      { startedAt: "2026-06-02T09:00:00Z", durationMin: 90, notes: "Day 2", taskTitles: [] },
      { startedAt: "2026-06-01T09:00:00Z", durationMin: 60, notes: "Day 1", taskTitles: [] },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-06-01");
    expect(result[1].date).toBe("2026-06-02");
  });

  it("skips entries without startedAt", () => {
    const result = groupTimeEntriesByDay([
      { startedAt: null, durationMin: 60, notes: "No date", taskTitles: [] },
      { startedAt: "2026-06-01T09:00:00Z", durationMin: 60, notes: "With date", taskTitles: [] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-06-01");
  });

  it("deduplicates task titles within a day", () => {
    const result = groupTimeEntriesByDay([
      { startedAt: "2026-06-01T09:00:00Z", durationMin: 60, notes: null, taskTitles: ["Bug fix"] },
      { startedAt: "2026-06-01T13:00:00Z", durationMin: 60, notes: null, taskTitles: ["Bug fix"] },
    ]);
    expect(result[0].tasks).toBe("Bug fix");
  });

  it("omits null and empty notes from description", () => {
    const result = groupTimeEntriesByDay([
      { startedAt: "2026-06-01T09:00:00Z", durationMin: 60, notes: null, taskTitles: [] },
      { startedAt: "2026-06-01T13:00:00Z", durationMin: 60, notes: "Some notes", taskTitles: [] },
    ]);
    expect(result[0].description).toBe("Some notes");
  });

  it("returns empty array when all entries have no startedAt", () => {
    const result = groupTimeEntriesByDay([
      { startedAt: null, durationMin: 60, notes: "x", taskTitles: [] },
    ]);
    expect(result).toHaveLength(0);
  });
});

describe("getMostRecentCompletedPeriod", () => {
  it("returns null before the first period has ended", () => {
    expect(getMostRecentCompletedPeriod("2026-06-01", 14, "2026-06-10")).toBeNull();
  });

  it("returns null on the last day of the first period", () => {
    // period 0 = [2026-06-01, 2026-06-14]; not "completed" until the 15th
    expect(getMostRecentCompletedPeriod("2026-06-01", 14, "2026-06-14")).toBeNull();
  });

  it("returns period 0 the day after it ends", () => {
    expect(getMostRecentCompletedPeriod("2026-06-01", 14, "2026-06-15")).toEqual({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-14",
    });
  });

  it("returns the latest completed period when multiple have elapsed", () => {
    // periods: [06-01,06-14], [06-15,06-28], [06-29,07-12]
    expect(getMostRecentCompletedPeriod("2026-06-01", 14, "2026-07-01")).toEqual({
      periodStart: "2026-06-15",
      periodEnd: "2026-06-28",
    });
  });

  it("handles a frequency that crosses a month boundary", () => {
    // period0 = [06-20,06-29], period1 = [06-30,07-09]
    expect(getMostRecentCompletedPeriod("2026-06-20", 10, "2026-07-10")).toEqual({
      periodStart: "2026-06-30",
      periodEnd: "2026-07-09",
    });
  });
});
