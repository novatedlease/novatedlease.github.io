
import { useMemo, useState } from "react";

/**
 * ATI = Adjusted Taxable Income (secondary to novated lease)
 *
 * This component is intentionally self-contained for now.
 * Once your date/RFBA helpers are finalized under src/engine/, you can
 * swap the internal helper functions for imports.
 */

export type AtiCalculationPurpose = "standard" | "fbtExemptChildcare";

export type AtiYearRow = {
  /** Financial year ending (e.g. 2027 for FY 2026-27). */
  financialYearEnding: number;
  taxableIncomePostNL: number;
};

export type AtiProps = {
  originalTaxableIncomePreNL: number;
  leaseStartDate: Date;
  leaseTermYears: number;
  /** FBT base value used for RFBA (you mentioned this lives in App.tsx). */
  fbtBaseValue: number;
  /** 1.8868 by default (Type 2 gross-up). */
  grossUpRate?: number;
  /** 0.2 by default (statutory formula percentage). */
  statutoryRate?: number;
  /** Rows for each financial year you want to display in the table. */
  rows: AtiYearRow[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, days: number): Date {
  const x = toUtcDay(d);
  return new Date(x.getTime() + days * MS_PER_DAY);
}

function inclusiveDaysBetween(start: Date, end: Date): number {
  const s = toUtcDay(start).getTime();
  const e = toUtcDay(end).getTime();
  if (e < s) return 0;
  return Math.floor((e - s) / MS_PER_DAY) + 1;
}

function minDate(a: Date, b: Date): Date {
  return toUtcDay(a).getTime() <= toUtcDay(b).getTime() ? toUtcDay(a) : toUtcDay(b);
}

function maxDate(a: Date, b: Date): Date {
  return toUtcDay(a).getTime() >= toUtcDay(b).getTime() ? toUtcDay(a) : toUtcDay(b);
}

/**
 * FBT year runs 1 Apr -> 31 Mar.
 * We label it by its ending year (e.g. FBT 2027 = 1 Apr 2026 .. 31 Mar 2027).
 */
function getFbtYearForDate(d: Date) {
  const x = toUtcDay(d);
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth(); // 0=Jan ... 3=Apr
  const fbtYearEnding = m >= 3 ? y + 1 : y;

  const start = new Date(Date.UTC(fbtYearEnding - 1, 3, 1)); // Apr 1
  const end = new Date(Date.UTC(fbtYearEnding, 2, 31)); // Mar 31
  const daysInYear = inclusiveDaysBetween(start, end);

  return { fbtYearEnding, start, end, daysInYear };
}

function computeLeaseEndDate(leaseStart: Date, durationYears: number): Date {
  const s = toUtcDay(leaseStart);
  const endSameDay = new Date(Date.UTC(s.getUTCFullYear() + durationYears, s.getUTCMonth(), s.getUTCDate()));
  return addDaysUtc(endSameDay, -1);
}

type RfbaRow = {
  fbtYearEnding: number;
  fbtStart: Date;
  fbtEnd: Date;
  overlapDays: number;
  daysInFbtYear: number;
  proportion: number;
  rfba: number;
};

function computeRfbaSchedule(params: {
  leaseStart: Date;
  leaseEnd: Date;
  fbtBaseValue: number;
  grossUp: number;
  statutoryRate: number;
}): RfbaRow[] {
  const s = toUtcDay(params.leaseStart);
  const e = toUtcDay(params.leaseEnd);
  if (e.getTime() < s.getTime()) return [];

  let fy = getFbtYearForDate(s);
  const out: RfbaRow[] = [];

  while (fy.start.getTime() <= e.getTime()) {
    const overlapStart = maxDate(s, fy.start);
    const overlapEnd = minDate(e, fy.end);
    const overlapDays = inclusiveDaysBetween(overlapStart, overlapEnd);
    const proportion = overlapDays / fy.daysInYear;

    if (overlapDays > 0) {
      out.push({
        fbtYearEnding: fy.fbtYearEnding,
        fbtStart: fy.start,
        fbtEnd: fy.end,
        overlapDays,
        daysInFbtYear: fy.daysInYear,
        proportion,
        rfba: params.statutoryRate * params.fbtBaseValue * params.grossUp * proportion,
      });
    }

    fy = getFbtYearForDate(addDaysUtc(fy.end, 1));
  }

  return out;
}

function formatMoney(n: number): string {
  // Keep it simple; if you already have a shared formatter, swap this out.
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateAU(d: Date): string {
  const x = toUtcDay(d);
  const dd = String(x.getUTCDate()).padStart(2, "0");
  const mm = String(x.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = x.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function ATI(props: AtiProps) {
  const [purpose, setPurpose] = useState<AtiCalculationPurpose>("standard");

  const grossUp = props.grossUpRate ?? 1.8868;
  const statutoryRate = props.statutoryRate ?? 0.2;

  const leaseEndDate = useMemo(
    () => computeLeaseEndDate(props.leaseStartDate, props.leaseTermYears),
    [props.leaseStartDate, props.leaseTermYears]
  );

  const rfbaTwoThirdsFromYear = useMemo(() => {
    const m = props.leaseStartDate.getMonth() + 1; // 1-12
    const y = props.leaseStartDate.getFullYear();
    return m < 4 ? y + 5 : y + 6;
  }, [props.leaseStartDate]);

  const rfbaByFinancialYearEnding = useMemo(() => {
    const schedule = computeRfbaSchedule({
      leaseStart: props.leaseStartDate,
      leaseEnd: leaseEndDate,
      fbtBaseValue: props.fbtBaseValue,
      grossUp,
      statutoryRate,
    });

    // In AU practice, the RFBA for the FBT year ending 31 March YYYY
    // is reported in the income year ending 30 June YYYY.
    const map = new Map<number, number>();
    for (const row of schedule) {
      map.set(row.fbtYearEnding, (map.get(row.fbtYearEnding) ?? 0) + row.rfba);
    }
    return map;
  }, [props.leaseStartDate, leaseEndDate, props.fbtBaseValue, grossUp, statutoryRate]);

  const computedRows = useMemo(() => {
    return props.rows
      .slice()
      .sort((a, b) => a.financialYearEnding - b.financialYearEnding)
      .map(r => {
        const rfba = rfbaByFinancialYearEnding.get(r.financialYearEnding) ?? 0;

        // For some means tests (e.g. CCS) when employed by certain FBT-exempt employers,
        // the reportable fringe benefits amount may be assessed at a reduced proportion.
        // This calculator applies a simple 53% factor when the childcare option is selected.
        let rfbaAdjusted = purpose === "fbtExemptChildcare" ? rfba * 0.53 : rfba;

        // Additional rule: from a threshold year onwards, RFBA is further reduced to 2/3
        if (r.financialYearEnding >= rfbaTwoThirdsFromYear) {
          rfbaAdjusted = rfbaAdjusted * (2 / 3);
        }

        const rfbaForAti = rfbaAdjusted;

        const adjusted = r.taxableIncomePostNL + rfbaForAti;
        return {
          ...r,
          rfba: rfbaForAti,
          adjustedTaxableIncome: adjusted,
        };
      });
  }, [props.rows, rfbaByFinancialYearEnding, purpose, rfbaTwoThirdsFromYear]);

  return (
    <div style={{ padding: "12px 0" }}>
      <h3 style={{ margin: "0 0 12px 0" }}>SECTION 3: ADJUSTED TAXABLE INCOME SECONDARY TO NOVATED LEASE</h3>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ minWidth: 180 }}>Calculation Purpose</div>
        <select value={purpose} onChange={e => setPurpose(e.target.value as AtiCalculationPurpose)}>
          <option value="standard">Standard</option>
          <option value="fbtExemptChildcare">FBT-exempt employer (childcare subsidy)</option>
        </select>
        <div style={{ fontStyle: "italic", opacity: 0.8, display: "flex", alignItems: "center", gap: 6 }}>
          <span>
            * Choose second option for childcare subsidy consideration if you work for FBT-exempt organisation (e.g. hospital)
          </span>
          <span
            title={
              "When the FBT‑exempt employer option is selected, the Reportable Fringe Benefits Amount (RFBA) is reduced to 53% for childcare subsidy means‑testing."
            }
            style={{ cursor: "help", borderBottom: "1px dotted currentColor" }}
          >
            ⓘ
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", rowGap: 6, columnGap: 12, marginBottom: 14 }}>
        <div>Original Taxable Income Pre-NL</div>
        <div>{formatMoney(props.originalTaxableIncomePreNL)}</div>

        <div>Novated Lease Period (Start : End)</div>
        <div>
          {formatDateAU(props.leaseStartDate)} <span style={{ margin: "0 10px" }}>to</span> {formatDateAU(leaseEndDate)}
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.15)", paddingTop: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "right", padding: "6px 6px" }}>Financial Year</th>
              <th style={{ textAlign: "right", padding: "6px 6px" }}>Taxable Income Post NL</th>
              <th style={{ textAlign: "right", padding: "6px 6px" }}>Reportable Fringe Benefit Amt</th>
              <th style={{ textAlign: "right", padding: "6px 6px" }}>Adjusted Taxable Income</th>
            </tr>
          </thead>
          <tbody>
            {computedRows.map(r => (
              <tr key={r.financialYearEnding}>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>
                  {r.financialYearEnding}
                  {r.financialYearEnding === rfbaTwoThirdsFromYear && (
                    <span
                      title={
                        `From FY ${rfbaTwoThirdsFromYear} onwards, the RFBA is further reduced to two‑thirds (2/3) due to base-value adjustment rule after 4 years.`
                      }
                      style={{ marginLeft: 6, cursor: "help", borderBottom: "1px dotted currentColor" }}
                    >
                      ⓘ
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>{formatMoney(r.taxableIncomePostNL)}</td>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>{formatMoney(r.rfba)}</td>
                <td style={{ textAlign: "right", padding: "4px 6px" }}>{formatMoney(r.adjustedTaxableIncome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.35 }}>
        <div style={{ fontStyle: "italic" }}>Please refer to "Adjusted Taxable Income" tab for elaboration on how this affects you.</div>
        <div style={{ fontStyle: "italic" }}>
          In short, the adjusted taxable income is THE figure that childcare subsidy, medicare levy surcharge, child support etc are tested on, rather than original taxable income.
        </div>
        <div style={{ fontStyle: "italic" }}>
          The RFBA calculation here uses the "statutory formula method"; an alternative is to use the operating cost method which is not covered.
        </div>
        <div style={{ fontStyle: "italic" }}>
          The adjusted taxable income is indicative only, some components are not accounted for.
        </div>
        <div style={{ fontStyle: "italic", color: "#0b6fa4" }}>
          Also note the reduced value of RFBA for the purpose of childcare subsidy means-testing when it comes to FBT-exempt organisation e.g. hospital.
        </div>
      </div>
    </div>
  );
}