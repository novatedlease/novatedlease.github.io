import type { Inputs } from "../engine/types";
import { calcResidualPayableIncGst } from "../engine/types";
import { taxSummaryAUResident } from "../engine/tax_au";
import { residualPercentForYears, residualFractionForYears, gstSaved } from "../engine/ato";
import {
  financedAmountExGstFromInputs,
  effectiveAnnualRateFromFortnightlyLease,
} from "../engine/effectiveinterest";
import { estimateAnnualChargingExpense, atoChargingClaimAnnual } from "../engine/charging";
import { aud, aud0, pct } from "../utils/format";
import { InfoTooltip } from "./ui/InfoTooltip";

export default function BasicInformationReport(props: {
  inputs: Inputs;
  // Optional override for marginal rate incl. Medicare (percentage). If omitted, derived from Australian brackets.
  taxRateInclMedicarePct?: number; // e.g. 47
}) {
  const i = props.inputs;

  const t = taxSummaryAUResident(i.totalTaxableIncome);

  const taxRatePct =
    props.taxRateInclMedicarePct ?? t.marginalRateInclMedicare * 100;
  const taxRate = taxRatePct / 100;

  const fortnights = Math.round(i.leaseDurationYears * 26);

  // Vehicle GST saved
  const vehicleGstSaved = gstSaved(i);

  // Amount financed (simple approximation)
  const amountFinanced = financedAmountExGstFromInputs(i);

  // Residual
  const residualPct = residualPercentForYears(i.leaseDurationYears);

  // Residual payable (inc GST) — single source of truth (engine/types)
  const residualPayableIncGst = calcResidualPayableIncGst({
    amountFinancedExGst: amountFinanced,
    leaseDocFeeExGst: i.leaseDocFee,
    residualPct,
  });

  // Effective interest rate (Definition 1)
  // Use the shared engine solver (same as the live hint in App.tsx).
  const effectiveInterestRatePct = (() => {
    try {
      const leaseYears = Math.max(1, Math.min(5, Math.round(i.leaseDurationYears)));
      const deferMonths = Math.max(0, Math.round(i.monthsDeferred));

      // Definition-1 basis: financed amount ex GST, and residual value ex GST.
      // (Matches the approach used elsewhere in the app.)
      const financedAmountExGst = amountFinanced;
      const residualFraction = residualFractionForYears(leaseYears);
      const residualValueExGst = Math.max(0, financedAmountExGst - i.leaseDocFee) * residualFraction;

      // IMPORTANT: keep this aligned with the InputsPanel live hint.
      // We intentionally use vehicleLeasePerFn only (not LV adj) for the “effective rate” display.
      const fortnightlyLeasePayment = Math.max(0, i.vehicleLeasePerFn);

      if (financedAmountExGst <= 0 || leaseYears <= 0 || fortnightlyLeasePayment <= 0) return null;

      const annualEffRate = effectiveAnnualRateFromFortnightlyLease({
        financedAmountExGst,
        residualValueExGst,
        leaseYears,
        deferMonths,
        fortnightlyLeasePayment,
      });

      return Number.isFinite(annualEffRate) ? annualEffRate * 100 : null;
    } catch {
      return null;
    }
  })();

  // Charging: actual spend (best estimate) and packaged claim (ATO shortcut)
  const chargingEstimate = estimateAnnualChargingExpense(i);
  const chargingExpensePerYear = chargingEstimate.annualChargingExpense;
  const kwhPerYear = chargingEstimate.kwhPerYear;
  const assumedChargingClaimPerYear = atoChargingClaimAnnual(i);
  const chargingDelta = assumedChargingClaimPerYear - chargingExpensePerYear;

  // “post-reimbursement effective charging expense”
  // Simple model: actual charging expense minus (assumed claim * marginal tax rate)
  const postReimbursementEffectiveChargingExpense =
    chargingExpensePerYear - assumedChargingClaimPerYear * taxRate;

  return (
    <div style={{ fontSize: 14, lineHeight: 1.35 }}>
      <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
        BASIC INFORMATION
      </div>

      <KeyValue
        label="Income Tax Bracket (inc. Medicare Levy)"
        value={`${Math.round(taxRatePct)}%`}
      />
      <KeyValue
        label="Lease Duration (Years)"
        value={String(i.leaseDurationYears)}
      />
      <KeyValue label="Fortnights" value={String(fortnights)} />

      <Spacer />

      <KeyValue label="Vehicle condition" value={i.vehicleCondition} />
      <KeyValue label="GST Saving Passed On" value={i.gstSavingPassedOn} />
      <KeyValue
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Vehicle GST saved
            <InfoTooltip
              text="GST saving on the vehicle purchase is calculated as dutiable value ÷ 11 but is capped at $6,334. Note that part of this initial GST saving is negated during the final residual payment if the vehicle is paid out at lease end."
            />
          </span>
        }
        value={
          i.vehicleCondition === "Used – private sale (no GST)"
            ? `$ ${aud(vehicleGstSaved)} (not eligible — private sale)`
            : `$ ${aud(vehicleGstSaved)}`
        }
      />

      <KeyValue
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Amount Financed
            <InfoTooltip text="= Drive-away cost + documentation fee − GST saved" />
          </span>
        }
        value={`$ ${aud(amountFinanced)}`}
      />
      <KeyValue
        label={`ATO-Mandated Residual Value % for ${Math.round(i.leaseDurationYears)} Years`}
        value={pct(residualPct)}
      />
      <KeyValue
        label={`Residual Value Payable after ${Math.round(i.leaseDurationYears)} Years (inc GST)`}
        value={`$ ${aud(residualPayableIncGst)}`}
      />

      <KeyValue
        label="Effective Interest Rate (Definition 1)"
        value={
          effectiveInterestRatePct == null
            ? "—"
            : `${Math.round(effectiveInterestRatePct * 100) / 100}%`
        }
      />

      <Spacer />

      <div
        style={{
          fontWeight: 800,
          fontSize: 14,
          margin: "10px 0 6px",
          paddingLeft: 8,
          borderLeft: "3px solid rgba(0,0,0,0.08)",
          fontStyle: "italic",
        }}
      >
        Electricity Report (Annual)
      </div>
      <KeyValue
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            kWh per year
            <InfoTooltip text="Calculated as estimated annual mileage × efficiency (Wh/km)." />
          </span>
        }
        value={aud0(kwhPerYear)}
      />

      <KeyValue
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Charging Expense per year
            <InfoTooltip text="Your estimated real out-of-pocket charging cost based on your tariff (or your override, if provided)." />
          </span>
        }
        value={`$ ${aud(chargingExpensePerYear)}`}
      />

      <KeyValue
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Assumed Charging per year (NL claim method)
            <InfoTooltip text="How much the ATO lets you claim for home charging using the 4.2c/km shortcut (0.042 × km). This can be higher or lower than what you truly spent." />
          </span>
        }
        value={`$ ${aud(assumedChargingClaimPerYear)}`}
      />

      <KeyValue
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Charging Delta
            <InfoTooltip text="Difference between the claimable amount and your actual charging expense. Positive = claim exceeds actual cost; negative = you spent more than you can claim." />
          </span>
        }
        value={`$ ${aud(chargingDelta)}`}
      />

      <KeyValue
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Post-Reimbursement Effective Charging Expense
            <InfoTooltip text="A simplified estimate of your effective charging cost after the tax benefit of the claim: actual expense − (claim × marginal tax rate). A negative value means you effectively profit from charging cheaply and claiming via the distance method." />
          </span>
        }
        value={`$ ${aud(postReimbursementEffectiveChargingExpense)}`}
        highlight
      />
    </div>
  );
}

function Spacer() {
  return <div style={{ height: 10 }} />;
}

function KeyValue(props: {
  label: React.ReactNode;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: 12,
        padding: "2px 0",
      }}
    >
      <div style={{ opacity: 0.85 }}>{props.label}</div>
      <div
        style={{
          fontWeight: props.highlight ? 700 : 600,
          color: props.highlight ? "#0b5cab" : "inherit",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}