import { useMemo, useState } from "react";
import { InfoTooltip } from "../ui/InfoTooltip";
import type { Inputs } from "@engine/types";
import { isFbtApplicable, getLeaseFbtCategory, getEcmStatutoryRate, getEcmMultiplierForFy } from "@engine/types";
import { computeDerived } from "@engine/derived";
import { computeRfbaSchedule } from "@engine/rfba";
import { Stat, StatGrid, SubHead, KV, NoteBox, Table, th, thR, td, tdR } from "../ui/shared";

/**
 * Ported from calculator/src/components/ATI.tsx. v1 re-implemented the RFBA
 * day-proration logic locally instead of importing engine/fbt.ts + engine/rfba.ts
 * (the file even had a comment noting this was meant to be temporary) — this port
 * uses the canonical engine functions instead. Same formula, so no behaviour change.
 *
 * Note for anyone continuing the maths audit: RFBA is intentionally zeroed
 * whenever isFbtApplicable() is true (see `rfba` below) — the calculator assumes
 * the Employee Contribution Method reduces the FBT taxable value (and therefore
 * the reportable fringe benefit) to nil. Full RFBA is only computed for the
 * EV_FBT_EXEMPT category, reflecting the documented "double-counting" quirk where
 * RFBA still applies at the notional pre-exemption value despite $0 FBT payable
 * (see new-site/src/content/docs/special-and-policy/fbt-exemption-double-counting.md).
 * This is deliberate, not the bug it might look like from the RFBA schedule helper alone.
 */

export type AtiCalculationPurpose = "standard" | "fbtExemptChildcare";

export type AtiYearRow = {
  financialYearEnding: number;
  taxableIncomePostNL: number;
};

export type AtiProps = {
  originalTaxableIncomePreNL: number;
  leaseStartDate: Date;
  leaseTermYears: number;
  inputs: Inputs;
  fbtBaseValue: number;
  grossUpRate?: number;
  statutoryRate?: number;
  rows: AtiYearRow[];
};

function toUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDaysUtc(d: Date, days: number): Date {
  const x = toUtcDay(d);
  return new Date(x.getTime() + days * 24 * 60 * 60 * 1000);
}
function computeLeaseEndDate(leaseStart: Date, durationYears: number): Date {
  const s = toUtcDay(leaseStart);
  const endSameDay = new Date(Date.UTC(s.getUTCFullYear() + durationYears, s.getUTCMonth(), s.getUTCDate()));
  return addDaysUtc(endSameDay, -1);
}
function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatDateAU(d: Date): string {
  const x = toUtcDay(d);
  return `${String(x.getUTCDate()).padStart(2, "0")}/${String(x.getUTCMonth() + 1).padStart(2, "0")}/${x.getUTCFullYear()}`;
}

export function ATI(props: AtiProps) {
  const fbtApplicable = isFbtApplicable(props.inputs);
  const [purpose, setPurpose] = useState<AtiCalculationPurpose>("standard");

  const grossUp = props.grossUpRate ?? 1.8868;
  const statutoryRate = props.statutoryRate ?? 0.2;

  const leaseEndDate = useMemo(() => computeLeaseEndDate(props.leaseStartDate, props.leaseTermYears), [props.leaseStartDate, props.leaseTermYears]);

  const rfbaTwoThirdsFromYear = useMemo(() => {
    const m = props.leaseStartDate.getMonth() + 1;
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
    const map = new Map<number, number>();
    for (const row of schedule) {
      map.set(row.fbtYearEnding, (map.get(row.fbtYearEnding) ?? 0) + row.rfba);
    }
    return map;
  }, [props.leaseStartDate, leaseEndDate, props.fbtBaseValue, grossUp, statutoryRate]);

  const taxableIncomePostNlByFinancialYearEnding = useMemo(() => {
    const i = props.inputs;
    const vehicleLeaseFn = i.vehicleLeasePerFn + i.luxuryVehicleAdjPerFn;
    const inputsWithLv: Inputs = { ...i, vehicleLeasePerFn: vehicleLeaseFn };

    const d = computeDerived(inputsWithLv);
    const fbtApplies = isFbtApplicable(i);

    const vehicleDutiableValue = Math.max(0, i.vehicleBaseValue);
    const fbtStatutoryRate = getEcmStatutoryRate(getLeaseFbtCategory(i));
    const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
    const ecmPerFn = ecmAnnual / 26;

    const out = new Map<number, number>();
    for (const r of d.fyRows) {
      const fy = r.fy;
      const originalTaxableIncome = r.originalTaxableIncome;
      const count = r.count;

      const ecmMultiplier = fbtApplies ? getEcmMultiplierForFy(fy, rfbaTwoThirdsFromYear) : 1;
      const ecmPerFnFy = ecmPerFn * ecmMultiplier;
      const actualPreTaxDeductionFnFy = d.preTaxTotalFn + (fbtApplies ? -ecmPerFnFy + ecmPerFnFy / 11 : 0);

      const preTaxDeductionThisFy = actualPreTaxDeductionFnFy * count;
      out.set(fy, originalTaxableIncome - preTaxDeductionThisFy);
    }
    return out;
  }, [props.inputs, rfbaTwoThirdsFromYear]);

  const computedRows = useMemo(() => {
    return props.rows
      .slice()
      .sort((a, b) => a.financialYearEnding - b.financialYearEnding)
      .map((r) => {
        const rfba = fbtApplicable ? 0 : rfbaByFinancialYearEnding.get(r.financialYearEnding) ?? 0;
        let rfbaAdjusted = purpose === "fbtExemptChildcare" ? rfba * 0.53 : rfba;
        if (r.financialYearEnding >= rfbaTwoThirdsFromYear) rfbaAdjusted = rfbaAdjusted * (2 / 3);
        const rfbaForAti = rfbaAdjusted;

        const taxableIncomePostNL = taxableIncomePostNlByFinancialYearEnding.get(r.financialYearEnding) ?? r.taxableIncomePostNL;
        return { ...r, taxableIncomePostNL, rfba: rfbaForAti, adjustedTaxableIncome: taxableIncomePostNL + rfbaForAti };
      });
  }, [props.rows, taxableIncomePostNlByFinancialYearEnding, rfbaByFinancialYearEnding, purpose, rfbaTwoThirdsFromYear, fbtApplicable]);

  const firstRow = computedRows[0];
  const lastRow = computedRows[computedRows.length - 1];
  const worstRow = computedRows.length > 0 ? computedRows.reduce((min, r) => (r.taxableIncomePostNL < min.taxableIncomePostNL ? r : min), computedRows[0]) : firstRow;

  const fullYearRfba = fbtApplicable ? 0 : grossUp * statutoryRate * props.fbtBaseValue * (purpose === "fbtExemptChildcare" ? 0.53 : 1);

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
      {firstRow && (
        <StatGrid>
          <Stat label="Original taxable income (pre-NL)" value={formatMoney(props.originalTaxableIncomePreNL)} color="var(--nlc-blue)" />
          <Stat label="Taxable income post-NL" value={formatMoney(worstRow.taxableIncomePostNL)} color="var(--nlc-acc-green)" note={`FY ${worstRow.financialYearEnding} – lowest year`} />
          {lastRow && lastRow.financialYearEnding !== firstRow.financialYearEnding && (
            <Stat label="RFBA (per FBT year)" value={formatMoney(fullYearRfba)} color="var(--nlc-purple)" note="Full year; added back to get ATI" />
          )}
        </StatGrid>
      )}

      <SubHead mt={4}>Calculation Purpose</SubHead>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "inline-flex", border: "1px solid var(--nlc-blue-mid)", borderRadius: 999, overflow: "hidden", background: "var(--nlc-blue-light)" }}>
          {(
            [
              { value: "standard" as const, label: "Standard" },
              { value: "fbtExemptChildcare" as const, label: "FBT-exempt (childcare)" },
            ] as { value: AtiCalculationPurpose; label: string }[]
          ).map(({ value, label }) => {
            const active = purpose === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setPurpose(value)}
                style={{ appearance: "none", border: "none", background: active ? "var(--nlc-blue-solid)" : "transparent", color: active ? "#fff" : "var(--nlc-blue)", padding: "5px 14px", cursor: "pointer", fontWeight: active ? 800 : 600, fontSize: 12, lineHeight: 1, whiteSpace: "nowrap" }}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
        <InfoTooltip text="When the FBT-exempt (childcare) option is selected, the Reportable Fringe Benefits Amount (RFBA) is multiplied by 53%. This 'adjusted fringe benefits total' applies to Child Care Subsidy and Family Tax Benefit income tests for employees of FBT-exempt employers (public hospitals, PBIs, charities). It does not apply to HELP/HECS repayment income, which uses the full RFBA." />
      </div>
      <div style={{ fontSize: 12, color: "var(--nlc-text-muted)", fontStyle: "italic", marginBottom: 12 }}>
        Choose the second option if you work for an FBT-exempt organisation (e.g. hospital) and are assessing childcare subsidy.
      </div>

      <KV label="Original taxable income (pre-NL)" value={formatMoney(props.originalTaxableIncomePreNL)} />
      <KV label="Novated lease period" value={`${formatDateAU(props.leaseStartDate)} → ${formatDateAU(leaseEndDate)}`} />

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
          {computedRows.map((r) => (
            <tr key={r.financialYearEnding}>
              <td style={td()}>
                {r.financialYearEnding === rfbaTwoThirdsFromYear && (
                  <span style={{ marginRight: 6 }}>
                    <InfoTooltip text={`From FY ${rfbaTwoThirdsFromYear} onwards the RFBA is further reduced to two-thirds, because a car's FBT base value drops by one-third once it has been held for four full FBT years (1 April to 31 March).`} />
                  </span>
                )}
                {r.financialYearEnding}
              </td>
              <td style={tdR()}>{formatMoney(r.taxableIncomePostNL)}</td>
              <td style={tdR()}>{formatMoney(r.rfba)}</td>
              <td style={tdR({ fontWeight: 700, color: "var(--nlc-purple)" })}>{formatMoney(r.adjustedTaxableIncome)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {fbtApplicable && (
        <NoteBox color="var(--nlc-acc-orange)" mt={10}>
          RFBA is shown as $0 because this is an FBT-applicable lease — we assume the Employee Contribution Method (ECM)
          is used to reduce FBT to zero.
        </NoteBox>
      )}

      {getLeaseFbtCategory(props.inputs) === "EV_FBT_DISCOUNTED" && (
        <NoteBox color="var(--nlc-acc-amber)" mt={10}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>25% FBT discount — RFBA treatment</div>
          Your vehicle is in the <b>25% FBT discount band</b> (base value above the full-exempt cap but below the LCT
          threshold). The discount reduces the ECM statutory rate from 20% to 15% — your salary-packaged ECM
          contribution covers only that 15% portion. Once ECM eliminates the 15% taxable value, the taxable fringe
          benefit amount is $0, and therefore <b>RFBA = $0</b>. The remaining 5% is a rate reduction, not a separately
          identifiable exempt benefit, so it does not generate any additional RFBA.{" "}
          <span style={{ opacity: 0.8, fontStyle: "italic" }}>
            This reflects the author's best interpretation of the Treasurer's press release and existing FBT
            legislation. The final treatment is subject to the enacting legislation, which is pending.
          </span>
        </NoteBox>
      )}

      <NoteBox color="var(--nlc-acc-green)" mt={10}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Next step: see what ATI changes might affect</div>
        <div style={{ marginBottom: 8 }}>
          Take your <b>RFBA</b> and updated <b>ATI</b> figures above and run them through these calculators:
        </div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <a href="https://paycalculator.com.au/" target="_blank" rel="noreferrer">paycalculator.com.au</a> — tax,
            Medicare levy surcharge, HELP, CCS etc.
          </li>
          <li>
            <a href="https://www.ccschecker.com.au/" target="_blank" rel="noreferrer">ccschecker.com.au</a> — childcare
            subsidy (CCS) estimates
          </li>
        </ul>
      </NoteBox>

      <NoteBox color="var(--nlc-blue)" mt={10}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Notes</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            Please refer to the{" "}
            <a href="https://novatedlease.guide/special-and-policy/childcare-subsidy/">Adjusted Taxable Income</a>{" "}
            article for detail on downstream impacts.
          </li>
          <li>ATI is the figure tested for childcare subsidy, Medicare levy surcharge, child support, etc.</li>
          <li>RFBA calculation uses the statutory formula method; the operating cost method is not covered here.</li>
          <li>Figures are indicative only — some components are not accounted for.</li>
        </ul>
      </NoteBox>
    </div>
  );
}
