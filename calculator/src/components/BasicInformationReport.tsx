
import type { Inputs } from "../engine/types";
import { calcResidualPayableIncGst } from "../engine/types";
import { taxSummaryAUResident } from "../engine/tax_au";
import { residualPercentForYears, gstSaved } from "../engine/ato";
import { financedAmountExGstFromInputs } from "../engine/effectiveinterest";
import { aud, aud0, pct } from "../utils/format";

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

  // Electricity model
  const kwhPerYear = (i.annualMileageKm * i.avgWhPerKm) / 1000;
  const chargingExpensePerYear =
    i.overrideAnnualChargingExpense ?? kwhPerYear * i.avgAudPerKwh;

  // ATO EV home charging shortcut (4.2c / km)
  const assumedChargingClaimPerYear = i.annualMileageKm * 0.042;
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
      <KeyValue
        label="Vehicle GST saved"
        value={
          i.vehicleCondition === "Used – private sale (no GST)"
            ? `$ ${aud(vehicleGstSaved)} (not eligible — private sale)`
            : `$ ${aud(vehicleGstSaved)} (cap $ ${aud(6334)}; based on dutiable value / 11)`
        }
      />

      <KeyValue label="Amount Financed" value={`$ ${aud(amountFinanced)}`} />
      <KeyValue
        label={`ATO-Mandated Residual Value % for ${Math.round(
          i.leaseDurationYears
        )} Years`}
        value={pct(residualPct)}
      />
      <KeyValue
        label={`Residual Value Payable after ${Math.round(
          i.leaseDurationYears
        )} Years (inc GST)`}
        value={`$ ${aud(residualPayableIncGst)}`}
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
        Electricity
      </div>
      <KeyValue label="kWh per year" value={aud0(kwhPerYear)} />
      <KeyValue
        label="Charging Expense per year"
        value={`$ ${aud(chargingExpensePerYear)}`}
      />
      <KeyValue
        label="Assumed Charging per year (NL claim method)"
        value={`$ ${aud(assumedChargingClaimPerYear)}`}
      />
      <KeyValue label="Charging Delta" value={`$ ${aud(chargingDelta)}`} />
      <KeyValue
        label="Post-Reimbursement Effective Charging Expense"
        value={`$ ${aud(postReimbursementEffectiveChargingExpense)}`}
        highlight
      />
    </div>
  );
}

function Spacer() {
  return <div style={{ height: 10 }} />;
}

function KeyValue(props: { label: string; value: string; highlight?: boolean }) {
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