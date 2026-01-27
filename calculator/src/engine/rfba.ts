import { computeFbtYearOverlaps, type FbtOverlap } from "./fbt";

export type RfbaByFbtYear = FbtOverlap & { rfba: number };

export function computeRfbaSchedule(params: {
  leaseStart: Date;
  leaseEnd: Date;
  fbtBaseValue: number; // from App.tsx
  grossUp: number;      // 1.8868
  statutoryRate: number; // 0.2
}): RfbaByFbtYear[] {
  const overlaps = computeFbtYearOverlaps(params.leaseStart, params.leaseEnd);

  return overlaps.map(o => ({
    ...o,
    rfba: params.statutoryRate * params.fbtBaseValue * params.grossUp * o.proportion,
  }));
}