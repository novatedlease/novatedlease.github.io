// engine/lease_schedule.ts

export function parseISODate(iso: string): Date {
  // Expect YYYY-MM-DD (from <input type="date">)
  const [y, m, d] = iso.split("-").map((x) => Number(x));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

// FY named after second year. If month >= July, FY = year + 1 else FY = year.
export function fyForDate(d: Date): number {
  return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
}

export function buildFortnightSchedule(startIso: string, count: number): Date[] {
  const start = parseISODate(startIso);
  const out: Date[] = [];
  for (let k = 0; k < count; k++) out.push(addDays(start, 14 * k));
  return out;
}

export function countFortnightsByFY(dates: Date[]): Array<{ fy: number; count: number }> {
  const map = new Map<number, number>();
  for (const d of dates) {
    const fy = fyForDate(d);
    map.set(fy, (map.get(fy) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([fy, count]) => ({ fy, count }));
}