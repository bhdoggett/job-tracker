export interface TimeEntryForGrouping {
  startedAt: string | null;
  durationMin: number | null;
  notes: string | null;
  taskTitles: string[];
}

export interface DayGroup {
  date: string;
  totalMinutes: number;
  tasks: string;
  description: string;
}

export function groupTimeEntriesByDay(entries: TimeEntryForGrouping[]): DayGroup[] {
  const byDate = new Map<string, TimeEntryForGrouping[]>();

  for (const entry of entries) {
    if (!entry.startedAt) continue;
    const date = entry.startedAt.slice(0, 10);
    const group = byDate.get(date) ?? [];
    group.push(entry);
    byDate.set(date, group);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEntries]) => {
      const totalMinutes = dayEntries.reduce((sum, e) => sum + (e.durationMin ?? 0), 0);
      const allTasks = [...new Set(dayEntries.flatMap((e) => e.taskTitles))];
      const allNotes = dayEntries
        .map((e) => e.notes)
        .filter((n): n is string => n !== null && n.trim() !== "");
      return {
        date,
        totalMinutes,
        tasks: allTasks.join(", "),
        description: allNotes.join("; "),
      };
    });
}

export function getMostRecentCompletedPeriod(
  startDate: string,
  frequencyDays: number,
  today: string
): { periodStart: string; periodEnd: string } | null {
  const start = new Date(`${startDate}T00:00:00Z`);
  const now = new Date(`${today}T00:00:00Z`);
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000);

  if (diffDays < frequencyDays) return null;

  const k = Math.floor(diffDays / frequencyDays) - 1;
  const periodStart = addDays(start, k * frequencyDays);
  const periodEnd = addDays(start, (k + 1) * frequencyDays - 1);

  return {
    periodStart: toDateString(periodStart),
    periodEnd: toDateString(periodEnd),
  };
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
