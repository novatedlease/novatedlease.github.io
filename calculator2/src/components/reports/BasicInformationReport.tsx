import type { Inputs } from "@engine/types";
import { isFbtApplicable, getLeaseFbtCategory, getEcmStatutoryRate } from "@engine/types";
import { residualPercentForYears, gstSaved } from "@engine/ato";
import { taxSummaryAUResident } from "@engine/tax_au";
import { financedAmountExGstFromInputs, effectiveAnnualRateFromFortnightlyLease } from "@engine/effectiveinterest";
import { estimateAnnualChargingExpense } from "@engine/charging";
import { aud, aud0, pct } from "../../utils/format";
import { InfoTooltip } from "../ui/InfoTooltip";
import { Stat, StatGrid, SubHead, KV, NoteBox } from "../ui/shared";

/**
 * Ported from calculator/src/components/BasicInformationReport.tsx — same
 * maths/structure, import paths and colour tokens adjusted for calculator2.
 */
export function BasicInformationReport(props: { inputs: Inputs; taxRateInclMedicarePct?: number; onNavigateToDetails?: (anchorId?: string) => void }) {
  const i = props.inputs;

  const t = taxSummaryAUResident(i.totalTaxableIncome);
  const taxRatePct = props.taxRateInclMedicarePct ?? t.marginalRateInclMedicare * 100;
  const taxRate = taxRatePct / 100;

  const fbtApplicable = isFbtApplicable(i);

  const vehicleDutiableValue = Math.max(0, i.vehicleBaseValue);
  const fbtStatutoryRate = getEcmStatutoryRate(getLeaseFbtCategory(i));
  const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
  const ecmPerFn = ecmAnnual / 26;
  const fbtDeltaPerFn = ecmPerFn * taxRate + (ecmPerFn / 11) * (1 - taxRate);

  const vehicleGstSaved = gstSaved(i);
  const amountFinanced = financedAmountExGstFromInputs(i);
  const residualPct = residualPercentForYears(i.leaseDurationYears);
  const residualPayableIncGst = i.residualValueExGst * 1.1;

  const effectiveInterestRatePct = (() => {
    try {
      const leaseYears = Math.max(1, Math.min(5, Math.round(i.leaseDurationYears)));
      const deferMonths = Math.max(0, Math.round(i.monthsDeferred));
      const fortnightlyLeasePayment = Math.max(0, i.vehicleLeasePerFn);
      if (amountFinanced <= 0 || leaseYears <= 0 || fortnightlyLeasePayment <= 0) return null;
      const rate = effectiveAnnualRateFromFortnightlyLease({
        financedAmountExGst: amountFinanced,
        residualValueExGst: i.residualValueExGst,
        leaseYears,
        deferMonths,
        fortnightlyLeasePayment,
      });
      return Number.isFinite(rate) ? rate * 100 : null;
    } catch {
      return null;
    }
  })();

  const chargingEstimate = estimateAnnualChargingExpense(i);
  const chargingExpensePerYear = chargingEstimate.annualChargingExpense;
  const kwhPerYear = chargingEstimate.kwhPerYear;
  const assumedChargingClaimPerYear = i.vehicleType === "EV" ? i.electricityAnnual : 0;
  const chargingDelta = assumedChargingClaimPerYear - chargingExpensePerYear;
  const postReimbursementEffectiveChargingExpense = chargingExpensePerYear - assumedChargingClaimPerYear * taxRate;

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
      <StatGrid>
        <Stat label="Amount Financed" value={`$${aud(amountFinanced)}`} color="#0b5cab" note="Drive-away + doc fee − GST saved" />
        <Stat label={`ATO Residual (${Math.round(i.leaseDurationYears)}y)`} value={pct(residualPct)} color="#37474f" />
        <Stat label="Residual Payable (inc GST)" value={`$${aud(residualPayableIncGst)}`} color="#37474f" />
        <Stat
          label="Effective Interest Rate"
          value={effectiveInterestRatePct == null ? "—" : `${(Math.round(effectiveInterestRatePct * 100) / 100).toFixed(2)}%`}
          color="#1b5e20"
          note="Definition 1 — see Effective Interest Rate section"
        />
      </StatGrid>

      <SubHead mt={4}>Lease Overview</SubHead>
      <KV label="Vehicle condition" value={i.vehicleCondition} />
      <KV
        label="Vehicle GST saved"
        tooltip={<InfoTooltip text="GST saving on vehicle purchase = dutiable value ÷ 11, capped at $6,353. Part of this saving is reversed during the final residual GST payment." />}
        value={
          i.vehicleCondition === "Used – private sale (no GST)"
            ? `$${aud(vehicleGstSaved)} (not eligible — private sale)`
            : `$${aud(vehicleGstSaved)}`
        }
      />
      <KV
        label="Amount financed (ex GST)"
        value={`$${aud(amountFinanced)}`}
        tooltip={<InfoTooltip text="= Drive-away cost + documentation fee − GST saved. Differences may indicate brokerage or add-ons bundled into the financed amount." />}
      />
      <KV
        label={`ATO-mandated residual % (${Math.round(i.leaseDurationYears)} years)`}
        tooltip={
          <InfoTooltip
            text={
              <>
                <p style={{ margin: "0 0 6px 0" }}>ATO statutory residual values:</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li>1y → 65.63%</li>
                  <li>2y → 56.25%</li>
                  <li>3y → 46.88%</li>
                  <li>4y → 37.50%</li>
                  <li>5y → 28.13%</li>
                </ul>
              </>
            }
          />
        }
        value={pct(residualPct)}
      />
      <KV
        label={`Residual payable after ${Math.round(i.leaseDurationYears)} years (inc GST)`}
        tooltip={<InfoTooltip text="The amount you pay at lease end to own the vehicle, including GST." />}
        value={`$${aud(residualPayableIncGst)}`}
      />
      <KV
        label={
          props.onNavigateToDetails ? (
            <button
              type="button"
              onClick={() => props.onNavigateToDetails!("details-section-3-effective-interest-rate")}
              style={{ padding: 0, border: "none", background: "none", color: "#0b5cab", cursor: "pointer", font: "inherit", textDecoration: "underline", textAlign: "left" }}
            >
              Effective Interest Rate (Definition 1)
            </button>
          ) : (
            "Effective Interest Rate (Definition 1)"
          )
        }
        value={effectiveInterestRatePct == null ? "—" : `${(Math.round(effectiveInterestRatePct * 100) / 100).toFixed(2)}%`}
        highlight
      />

      {fbtApplicable && (
        <div style={{ marginTop: 16, background: "rgba(230,81,0,0.04)", border: "1px solid rgba(230,81,0,0.18)", borderRadius: 10, padding: "10px 14px" }}>
          <SubHead color="#e65100" mt={0}>Employee Contribution Method (ECM)</SubHead>
          <StatGrid>
            <Stat label="Annual ECM (post-tax)" value={`$${aud(ecmAnnual)}`} color="#e65100" note={`${Math.round(fbtStatutoryRate * 100)}% of dutiable value`} />
            <Stat label="ECM per fortnight" value={`$${aud(ecmPerFn)}`} color="#e65100" />
            <Stat label="FBT delta per fortnight" value={`$${aud(fbtDeltaPerFn)}`} color="#b71c1c" note="Extra cost vs FBT-exempt EV" />
          </StatGrid>
          <KV label="Vehicle dutiable value" value={`$${aud(vehicleDutiableValue)}`} />
          <KV label="FBT statutory rate" value={`${Math.round(fbtStatutoryRate * 100)}%`} />
          <KV label="Annual ECM" value={`$${aud(ecmAnnual)}`} />
          <KV label="Fortnightly ECM" value={`$${aud(ecmPerFn)}`} />
          <KV
            label="FBT delta (fortnight)"
            bold
            highlight
            color="#b71c1c"
            tooltip={<InfoTooltip text="How much more this lease costs per fortnight vs an FBT-exempt EV. Formula: (ECM_fn × taxRate) + (ECM_fn ÷ 11 × (1 − taxRate))." />}
            value={`$${aud(fbtDeltaPerFn)}`}
          />
        </div>
      )}

      {i.vehicleType === "EV" && (
        <div style={{ marginTop: 16, background: "rgba(245,124,0,0.04)", border: "1px solid rgba(245,124,0,0.18)", borderRadius: 10, padding: "10px 14px" }}>
          <SubHead color="#e65100" mt={0}>
            Annual Electricity Report{" "}
            <a
              href="https://novatedlease.guide/running-costs/ev-home-charging-shortcut/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 500, textTransform: "none", letterSpacing: 0, color: "#0b5cab", textDecoration: "underline" }}
            >
              (learn more)
            </a>
          </SubHead>
          <StatGrid>
            <Stat label="kWh per year" value={aud0(kwhPerYear)} color="#e65100" note="Annual mileage × efficiency" />
            <Stat label="Actual charging cost" value={`$${aud(chargingExpensePerYear)}`} color="#e65100" />
            <Stat
              label="Net charging expense"
              value={`$${aud(postReimbursementEffectiveChargingExpense)}`}
              color={postReimbursementEffectiveChargingExpense <= 0 ? "#1b5e20" : "#b71c1c"}
              note={postReimbursementEffectiveChargingExpense <= 0 ? "Net gain after tax benefit" : "After tax reimbursement"}
            />
          </StatGrid>
          <KV label="kWh per year" value={aud0(kwhPerYear)} tooltip={<InfoTooltip text="Annual mileage × efficiency (Wh/km)." />} />
          <KV label="Actual charging expense per year" value={`$${aud(chargingExpensePerYear)}`} tooltip={<InfoTooltip text="Real out-of-pocket cost based on your tariff." />} />
          <KV label="NL claim amount per year" value={`$${aud(assumedChargingClaimPerYear)}`} tooltip={<InfoTooltip text="The packaged electricity amount. May default to ATO 5.47c/km shortcut — you can override in the Inputs panel." />} />
          <KV
            label="Charging delta"
            value={`$${aud(chargingDelta)}`}
            color={chargingDelta >= 0 ? "#1b5e20" : "#b71c1c"}
            tooltip={<InfoTooltip text="Claim minus actual cost. Positive = claim exceeds actual expense." />}
          />
          <KV
            label="Net charging expense (after tax reimbursement)"
            value={`$${aud(postReimbursementEffectiveChargingExpense)}`}
            bold
            highlight
            color={postReimbursementEffectiveChargingExpense <= 0 ? "#1b5e20" : "#b71c1c"}
            tooltip={
              <InfoTooltip
                text={
                  <>
                    <p style={{ margin: "0 0 8px 0" }}>Actual expense − (claim × marginal tax rate). Negative = net gain.</p>
                  </>
                }
              />
            }
          />
          {chargingDelta < 0 && (
            <NoteBox color="#b71c1c" mt={10}>
              Your actual charging expense exceeds the ATO claim amount. Consider switching to actual cost method if it's higher than 5.47c/km.
            </NoteBox>
          )}
        </div>
      )}
    </div>
  );
}
