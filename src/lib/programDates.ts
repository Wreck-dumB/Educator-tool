// Shared date math for the program planner's day-columns views (the editable
// grid, the printable calendar, and the Today room guide) so weekday
// resolution stays identical across all three instead of drifting apart.

export function isWeekday(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day >= 1 && day <= 5;
}

export function eachDateInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const endD = new Date(`${end}T00:00:00`);
  while (cur <= endD) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}
