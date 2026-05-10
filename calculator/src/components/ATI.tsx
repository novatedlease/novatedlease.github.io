import { useMemo, useState } from "react";
import { InfoTooltip } from "./ui/InfoTooltip";
import type { Inputs } from "../engine/types";
import { isFbtApplicable, getLeaseFbtCategory, getEcmStatutoryRate, getEcmMultiplierForFy } from "../engine/types";
import { computeDerived } from "../engine/derived";
import { Stat, StatGrid, SubHead, KV, NoteBox, Table, th, thR, td, tdR, stripe } from "./ui/shared";

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
  /** Full calculator inputs, so ATI can use canonical truth helpers (e.g. isFbtApplicable). */
  inputs: Inputs;
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
  const fbtApplicable = isFbtApplicable(props.inputs);
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

  const taxableIncomePostNlByFinancialYearEnding = useMemo(() => {
    // Mirror LeaseReport.tsx: treat LV adjustment as part of vehicle lease per fortnight.
    const i = props.inputs;
    const vehicleLeaseFn = i.vehicleLeasePerFn + i.luxuryVehicleAdjPerFn;
    const inputsWithLv: Inputs = { ...i, vehicleLeasePerFn: vehicleLeaseFn };

    const d = computeDerived(inputsWithLv);
    const fbtApplies = isFbtApplicable(i);

    // ECM / Employee contribution method (assumed when FBT applies)
    const vehicleDutiableValue = Math.max(0, i.vehicleBaseValue);
    const fbtStatutoryRate = getEcmStatutoryRate(getLeaseFbtCategory(i));
    const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
    const ecmPerFn = ecmAnnual / 26;

    const out = new Map<number, number>();
    for (const r of d.fyRows as any[]) {
      const fy = (r as any).fy;
      const originalTaxableIncome = (r as any).originalTaxableIncome;
      const count = (r as any).count;

      // Apply ECM base-value multiplier: 1 before, 11/12 in the transition FY, 2/3 after.
      const ecmMultiplier = fbtApplies ? getEcmMultiplierForFy(fy, rfbaTwoThirdsFromYear) : 1;
      const ecmPerFnFy = ecmPerFn * ecmMultiplier;
      const actualPreTaxDeductionFnFy = d.preTaxTotalFn + (fbtApplies ? -(ecmPerFnFy) + ecmPerFnFy / 11 : 0);

      const preTaxDeductionThisFy = actualPreTaxDeductionFnFy * count;
      const postNlTaxableIncome = originalTaxableIncome - preTaxDeductionThisFy;
      out.set(fy, postNlTaxableIncome);
    }

    return out;
  }, [props.inputs, rfbaTwoThirdsFromYear]);

  const computedRows = useMemo(() => {
    return props.rows
      .slice()
      .sort((a, b) => a.financialYearEnding - b.financialYearEnding)
      .map(r => {
        const rfba = fbtApplicable ? 0 : (rfbaByFinancialYearEnding.get(r.financialYearEnding) ?? 0);

        // For some means tests (e.g. CCS) when employed by certain FBT-exempt employers,
        // the reportable fringe benefits amount may be assessed at a reduced proportion.
        // This calculator applies a simple 53% factor when the childcare option is selected.
        let rfbaAdjusted = purpose === "fbtExemptChildcare" ? rfba * 0.53 : rfba;

        // Additional rule: from a threshold year onwards, RFBA is further reduced to 2/3
        if (r.financialYearEnding >= rfbaTwoThirdsFromYear) {
          rfbaAdjusted = rfbaAdjusted * (2 / 3);
        }

        const rfbaForAti = rfbaAdjusted;

        const taxableIncomePostNL = taxableIncomePostNlByFinancialYearEnding.get(r.financialYearEnding) ?? r.taxableIncomePostNL;
        const adjusted = taxableIncomePostNL + rfbaForAti;
        return {
          ...r,
          taxableIncomePostNL,
          rfba: rfbaForAti,
          adjustedTaxableIncome: adjusted,
        };
      });
  }, [props.rows, taxableIncomePostNlByFinancialYearEnding, rfbaByFinancialYearEnding, purpose, rfbaTwoThirdsFromYear, fbtApplicable]);

  const firstRow = computedRows[0];
  const lastRow = computedRows[computedRows.length - 1];

  const worstRow = computedRows.length > 0
    ? computedRows.reduce((min, r) => r.taxableIncomePostNL < min.taxableIncomePostNL ? r : min, computedRows[0])
    : firstRow;

  // Full FBT year RFBA (proportion = 1), with purpose factor applied but not the 2/3 reduction
  const fullYearRfba = fbtApplicable
    ? 0
    : grossUp * statutoryRate * props.fbtBaseValue * (purpose === "fbtExemptChildcare" ? 0.53 : 1);

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>

      {/* ── Top stat cards ── */}
      {firstRow && (
        <StatGrid>
          <Stat
            label="Original taxable income (pre-NL)"
            value={formatMoney(props.originalTaxableIncomePreNL)}
            color="#0b5cab"
          />
          <Stat
            label="Taxable income post-NL"
            value={formatMoney(worstRow.taxableIncomePostNL)}
            color="#1b5e20"
            note={`FY ${worstRow.financialYearEnding} – lowest year`}
          />
          {lastRow && lastRow.financialYearEnding !== firstRow.financialYearEnding && (
            <Stat
              label="RFBA (per FBT year)"
              value={formatMoney(fullYearRfba)}
              color="#6a1b9a"
              note="Full year; added back to get ATI"
            />
          )}
        </StatGrid>
      )}

      {/* ── Purpose selector ── */}
      <SubHead mt={4}>Calculation Purpose</SubHead>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ display: "inline-flex", border: "1px solid rgba(11,92,171,0.28)", borderRadius: 999, overflow: "hidden", background: "rgba(11,92,171,0.04)" }}>
          {([
            { value: "standard" as const, label: "Standard" },
            { value: "fbtExemptChildcare" as const, label: "FBT-exempt (childcare)" },
          ] as { value: AtiCalculationPurpose; label: string }[]).map(({ value, label }) => {
            const active = purpose === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setPurpose(value)}
                style={{
                  appearance: "none",
                  border: "none",
                  background: active ? "#0b5cab" : "transparent",
                  color: active ? "#fff" : "#0b5cab",
                  padding: "5px 14px",
                  cursor: "pointer",
                  fontWeight: active ? 800 : 600,
                  fontSize: 12,
                  lineHeight: 1,
                  transition: "all 120ms ease",
                  whiteSpace: "nowrap",
                }}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
        <InfoTooltip text="When the FBT‑exempt employer option is selected, the Reportable Fringe Benefits Amount (RFBA) is reduced to 53% for childcare subsidy means‑testing." />
      </div>
      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", fontStyle: "italic", marginBottom: 12 }}>
        Choose the second option if you work for an FBT-exempt organisation (e.g. hospital) and are assessing childcare subsidy.
      </div>

      {/* ── Summary KV ── */}
      <KV label="Original taxable income (pre-NL)" value={formatMoney(props.originalTaxableIncomePreNL)} />
      <KV label="Novated lease period" value={`${formatDateAU(props.leaseStartDate)} → ${formatDateAU(leaseEndDate)}`} />

      {/* ── Year-by-year table ── */}
      <SubHead mt={14}>Year-by-Year ATI Breakdown</SubHead>
      <Table>
        <thead>
          <tr>
            <th style={th()}>Financial Year</th>
            <th style={thR()}>Taxable Income Post-NL</th>
            <th style={thR()}>RFBA</th>
            <th style={thR()}>Adjusted Taxable Income</th>
          </tr>
        </thead>
        <tbody>
          {computedRows.map((r, i) => (
            <tr key={r.financialYearEnding} style={stripe(i)}>
              <td style={td()}>
                {r.financialYearEnding === rfbaTwoThirdsFromYear && (
                  <span style={{ marginRight: 6 }}>
                    <InfoTooltip
                      text={`From FY ${rfbaTwoThirdsFromYear} onwards, the RFBA is further reduced to two‑thirds (2/3) due to base-value adjustment rule after 4 years.`}
                    />
                  </span>
                )}
                {r.financialYearEnding}
              </td>
              <td style={tdR()}>{formatMoney(r.taxableIncomePostNL)}</td>
              <td style={tdR()}>{formatMoney(r.rfba)}</td>
              <td style={tdR({ fontWeight: 700, color: "#6a1b9a" })}>{formatMoney(r.adjustedTaxableIncome)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {fbtApplicable && (
        <NoteBox color="#e65100" mt={10}>
          RFBA is shown as $0 because this is an FBT-applicable lease — we assume the Employee Contribution Method (ECM)
          is used to reduce FBT to zero.
        </NoteBox>
      )}

      {getLeaseFbtCategory(props.inputs) === "EV_FBT_DISCOUNTED" && (
        <NoteBox color="#f57c00" mt={10}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>25% FBT discount — RFBA treatment</div>
          Your vehicle is in the <b>25% FBT discount band</b> (base value above the full-exempt cap but below the LCT
          threshold). The discount reduces the ECM statutory rate from 20% to 15% — your salary-packaged ECM
          contribution covers only that 15% portion. Once ECM eliminates the 15% taxable value, the taxable fringe
          benefit amount is $0, and therefore <b>RFBA = $0</b>.{" "}
          The remaining 5% is a rate reduction, not a separately identifiable exempt benefit, so it does not generate
          any additional RFBA.{" "}
          <span style={{ opacity: 0.8, fontStyle: "italic" }}>
            This reflects the author's best interpretation of the Treasurer's press release and existing FBT
            legislation. The final treatment is subject to the enacting legislation, which is pending.
          </span>
        </NoteBox>
      )}

      <NoteBox color="#1b5e20" mt={10}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Next step: see what ATI changes might affect</div>
        <div style={{ marginBottom: 8 }}>
          Take your <b>RFBA</b> and updated <b>ATI</b> figures above and run them through these calculators:
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <a href="https://paycalculator.com.au/" target="_blank" rel="noreferrer">paycalculator.com.au</a>{" "}
            — tax, Medicare levy surcharge, HELP, CCS etc.
          </li>
          <li>
            <a href="https://www.ccschecker.com.au/" target="_blank" rel="noreferrer">ccschecker.com.au</a>{" "}
            — childcare subsidy (CCS) estimates
          </li>
        </ul>
      </NoteBox>

      <NoteBox color="#0b5cab" mt={10}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Notes</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Please refer to the <a href="https://novatedlease.guide/special-and-policy/childcare-subsidy/">Adjusted Taxable Income</a> article for detail on downstream impacts.</li>
          <li>ATI is the figure tested for childcare subsidy, Medicare levy surcharge, child support, etc.</li>
          <li>RFBA calculation uses the statutory formula method; the operating cost method is not covered here.</li>
          <li>Figures are indicative only — some components are not accounted for.</li>
        </ul>
      </NoteBox>
    </div>
  );
}