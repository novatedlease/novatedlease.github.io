/**
 * Local date helpers (UTC-day semantics)
 *
 * NOTE: These are kept local to avoid relying on exports from ./dates.
 */
function toUtcDay(d: Date): Date {
  // Normalize to midnight UTC for date-only calculations
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, days: number): Date {
  const x = toUtcDay(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function inclusiveDaysBetween(start: Date, end: Date): number {
  const s = toUtcDay(start).getTime();
  const e = toUtcDay(end).getTime();
  if (e < s) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((e - s) / msPerDay) + 1;
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

export type FbtYear = {
  /** e.g. 2027 means 1 Apr 2026 .. 31 Mar 2027 */
  fbtYearEnding: number;
  start: Date; // Apr 1 (UTC day)
  end: Date;   // Mar 31 (UTC day)
  daysInYear: number; // 365 or 366
};

export function getFbtYearForDate(d: Date): FbtYear {
  const x = toUtcDay(d);
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth(); // 0=Jan ... 3=Apr

  // If date is Apr(3) or later, it's in FBT year ending next calendar year.
  const fbtYearEnding = m >= 3 ? y + 1 : y;

  const start = new Date(Date.UTC(fbtYearEnding - 1, 3, 1)); // Apr 1 of previous year
  const end = new Date(Date.UTC(fbtYearEnding, 2, 31));     // Mar 31 of ending year
  const daysInYear = inclusiveDaysBetween(start, end);

  return { fbtYearEnding, start, end, daysInYear };
}

export type FbtOverlap = {
  fbtYearEnding: number;
  fbtStart: Date;
  fbtEnd: Date;
  overlapDays: number;
  daysInFbtYear: number;
  proportion: number; // 0..1
};

export function computeFbtYearOverlaps(leaseStart: Date, leaseEnd: Date): FbtOverlap[] {
  const s = toUtcDay(leaseStart);
  const e = toUtcDay(leaseEnd);
  if (e.getTime() < s.getTime()) return [];

  // Start from the FBT year containing leaseStart
  let fy = getFbtYearForDate(s);

  const out: FbtOverlap[] = [];
  while (fy.start.getTime() <= e.getTime()) {
    const overlapStart = maxDate(s, fy.start);
    const overlapEnd = minDate(e, fy.end);
    const overlapDays = inclusiveDaysBetween(overlapStart, overlapEnd);

    const proportion = overlapDays / fy.daysInYear;

    out.push({
      fbtYearEnding: fy.fbtYearEnding,
      fbtStart: fy.start,
      fbtEnd: fy.end,
      overlapDays,
      daysInFbtYear: fy.daysInYear,
      proportion,
    });

    // Next FBT year begins the day after this one ends
    fy = getFbtYearForDate(addDaysUtc(fy.end, 1));
  }

  // You can optionally drop years with 0 overlap (shouldn’t happen with loop bounds, but safe)
  return out.filter(r => r.overlapDays > 0);
}