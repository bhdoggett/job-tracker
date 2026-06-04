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
