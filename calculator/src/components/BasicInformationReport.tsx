import type { Inputs } from "../engine/types";
import { isFbtApplicable } from "../engine/types";
import { residualPercentForYears } from "../engine/ato";
import { taxSummaryAUResident } from "../engine/tax_au";
import { gstSaved } from "../engine/ato";
import {
  financedAmountExGstFromInputs,
  effectiveAnnualRateFromFortnightlyLease,
} from "../engine/effectiveinterest";
import { estimateAnnualChargingExpense } from "../engine/charging";
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

  const fbtApplicable = isFbtApplicable(i);

  // ECM / FBT delta (only relevant when FBT applies)
  const vehicleDutiableValue = Math.max(0, i.vehicleBaseValue);
  const fbtStatutoryRate = 0.2;
  const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
  const ecmPerFn = ecmAnnual / 26;

  // FBT delta (fortnightly):
  // = [ECM_fn × taxRate] + [ECM_fn/11 × (1 - taxRate)]
  // where taxRate is the marginal rate incl. Medicare Levy.
  const fbtDeltaPerFn = ecmPerFn * taxRate + (ecmPerFn / 11) * (1 - taxRate);


  // Vehicle GST saved
  const vehicleGstSaved = gstSaved(i);

  // Amount financed (simple approximation)
  const amountFinanced = financedAmountExGstFromInputs(i);

  const residualPct = residualPercentForYears(i.leaseDurationYears);
  const residualPayableIncGst = i.residualValueExGst * 1.1;

  // Effective interest rate (Definition 1)
  // Use the shared engine solver (same as the live hint in App.tsx).
  const effectiveInterestRatePct = (() => {
    try {
      const leaseYears = Math.max(1, Math.min(5, Math.round(i.leaseDurationYears)));
      const deferMonths = Math.max(0, Math.round(i.monthsDeferred));

      const financedAmountExGst = amountFinanced;
      const residualValueExGst = i.residualValueExGst;

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

  // Charging: actual spend (best estimate) and packaged claim (from InputsPanel, user-adjustable).
  // InputsPanel may default this to the ATO 5.47c/km shortcut, but users can override it.
  const chargingEstimate = estimateAnnualChargingExpense(i);
  const chargingExpensePerYear = chargingEstimate.annualChargingExpense;
  const kwhPerYear = chargingEstimate.kwhPerYear;
  const assumedChargingClaimPerYear = i.vehicleType === "EV" ? i.electricityAnnual : 0;
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

      <KeyValue label="Vehicle condition" value={i.vehicleCondition} />
      <KeyValue
        label="Vehicle GST saved"
        tooltip={
          <InfoTooltip
            text="GST saving on the vehicle purchase is calculated as dutiable value ÷ 11 but is capped at $6,334. Note that part of this initial GST saving is negated during the final residual payment if the vehicle is paid out at lease end."
          />
        }
        value={
          i.vehicleCondition === "Used – private sale (no GST)"
            ? `$ ${aud(vehicleGstSaved)} (not eligible — private sale)`
            : `$ ${aud(vehicleGstSaved)}`
        }
      />

      <KeyValue
        label="Amount Financed"
        tooltip={<InfoTooltip text="= Drive-away cost + documentation fee − GST saved. If the amount differs, then it may be due to inflation with brokerage, or contains insurance, repair package etc. Peruse your lease quote fineprints to find these potential source."/>}
        value={`$ ${aud(amountFinanced)}`}
      />
      <KeyValue
        label={`ATO-Mandated Residual Value % for ${Math.round(i.leaseDurationYears)} Years`}
        tooltip={
          <InfoTooltip
            text={
              <>
                <p style={{ margin: "0 0 6px 0" }}>ATO statutory residual values for novated leases:</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>1 year lease → 65.63% residual</li>
                  <li>2 year lease → 56.25% residual</li>
                  <li>3 year lease → 46.88% residual</li>
                  <li>4 year lease → 37.50% residual</li>
                  <li>5 year lease → 28.13% residual</li>
                </ul>
              </>
            }
          />
        }
        value={pct(residualPct)}
      />
      <KeyValue
        label={`Residual Value Payable after ${Math.round(i.leaseDurationYears)} Years (inc GST)`}
        tooltip={<InfoTooltip text="The amount you must pay at the end of the lease to own the vehicle, including GST. Derived by (Amount financed - documentation fee) x residual value %."/>}
        value={`$ ${aud(residualPayableIncGst)}`}
      />

      <KeyValue
        label={
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("nlguide:navigate", {
                  detail: {
                    tab: "Details",
                    anchorId: "details-section-3-effective-interest-rate",
                  },
                })
              );
            }}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              color: "rgba(11, 92, 171, 0.95)",
              cursor: "pointer",
              font: "inherit",
              textDecoration: "underline",
              textAlign: "left",
            }}
          >
            Effective Interest Rate (Definition 1)
          </button>
        }
        value={
          effectiveInterestRatePct == null
            ? "—"
            : `${Math.round(effectiveInterestRatePct * 100) / 100}%`
        }
      />

      <Spacer />

      {fbtApplicable ? (
        <>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              margin: "10px 0 6px",
              paddingLeft: 8,
              borderLeft: "3px solid rgba(0,0,0,0.08)",
            }}
          >
            Employee Contribution Method (ECM)
          </div>

          <KeyValue label="Vehicle Dutiable Value" value={`$ ${aud(vehicleDutiableValue)}`} />
          <KeyValue label="FBT Statutory Rate" value={`${Math.round(fbtStatutoryRate * 100)}%`} />
          <KeyValue
            label="Annual Employee Contribution (Post Tax)"
            tooltip={<InfoTooltip text="Calculated as vehicle dutiable value × 20% (statutory method)." />}
            value={`$ ${aud(ecmAnnual)}`}
          />
          <KeyValue
            label="↳ Fortnightly"
            value={`$ ${aud(ecmPerFn)}`}
          />
          <KeyValue
            label="FBT Delta (Fortnightly)"
            tooltip={<InfoTooltip text="How much more this lease costs per fortnight post‑tax compared with an FBT‑exempt EV lease. Formula: (ECM_fn × taxRate) + (ECM_fn ÷ 11 × (1 − taxRate)), where taxRate is your marginal rate incl. Medicare." />}
            value={`$ ${aud(fbtDeltaPerFn)}`}
          />

          <Spacer />
        </>
      ) : null}

      {i.vehicleType === "EV" ? (
      <>
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
        <>Annual Electricity Report (<a
  href="https://novatedlease.guide/running-costs/ato-42c-per-km-shortcut/"
  target="_blank"
  rel="noopener noreferrer"
  style={{ textDecoration: "underline" }}
>Learn More</a>)</>
      </div>
      <KeyValue
        label="kWh per year"
        tooltip={<InfoTooltip text="Calculated as estimated annual mileage × efficiency (Wh/km)." />}
        value={aud0(kwhPerYear)}
      />

      <KeyValue
        label="Charging Expense per year"
        tooltip={<InfoTooltip text="Your estimated real out-of-pocket charging cost based on your tariff (or your override, if provided)." />}
        value={`$ ${aud(chargingExpensePerYear)}`}
      />

      <KeyValue
        label="Assumed Charging per year (NL claim method)"
        tooltip={<InfoTooltip text="The packaged (claimable) electricity amount used in the novated lease. This value comes from the Electricity input in the Inputs Panel (it may default to the ATO 5.47c/km shortcut, but you can override it)." />}
        value={`$ ${aud(assumedChargingClaimPerYear)}`}
      />

      <KeyValue
        label="Charging Delta"
        tooltip={<InfoTooltip text="Difference between the claimable amount and your actual charging expense. Positive = claim exceeds actual cost; negative = you spent more than you can claim." />}
        value={`$ ${aud(chargingDelta)}`}
      />

      <KeyValue
        label="Post-Reimbursement Effective Charging Expense"
        tooltip={
          <InfoTooltip
            text={
              <>
                <p style={{ margin: "0 0 10px 0" }}>
                  A simplified estimate of your effective charging cost after the tax benefit of the claim: actual expense − (claim ×
                  marginal tax rate). A negative value means you effectively profit from charging cheaply and claiming via the distance
                  method.
                </p>
                <p style={{ margin: 0 }}>
                  <b>Example:</b> In the default example, we spent $371.25 in charging in reality; however ATO&apos;s 5.47c/km rule allowed us
                  to claim $820.50. This $820.50 effectively translates to $820.50 * 47% (default example&apos;s tax bracket) = $385.64 in tax
                  refund. Once all is accounted for, this is equivalent to $371.25 - $385.64 = -$14.39 net charging expense (i.e. a net gain). Note 14.38 in default output is from rounding error. 
                </p>
              </>
            }
          />
        }
        value={`$ ${aud(postReimbursementEffectiveChargingExpense)}`}
        highlight
      />
      </>
      ) : null}
    </div>
  );
}

function Spacer() {
  return <div style={{ height: 10 }} />;
}

function KeyValue(props: {
  label: React.ReactNode;
  tooltip?: React.ReactNode;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        // Match InputsPanel: label | tooltip | value
        // Keep labels close to values on desktop but wrap on mobile.
        gridTemplateColumns: "minmax(0, 300px) 24px minmax(110px, max-content)",
        columnGap: 10,
        rowGap: 2,
        padding: "2px 0",
        alignItems: "center",
      }}
    >
      <div style={{ opacity: 0.85, minWidth: 0, lineHeight: 1.25, overflowWrap: "anywhere" }}>
        {props.label}
      </div>
      <div style={{ width: 24, display: "flex", justifyContent: "center" }}>
        {props.tooltip ?? null}
      </div>
      <div
        style={{
          fontWeight: props.highlight ? 700 : 600,
          color: props.highlight ? "#0b5cab" : "inherit",
          justifySelf: "start",
          textAlign: "left",
          whiteSpace: "nowrap",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}