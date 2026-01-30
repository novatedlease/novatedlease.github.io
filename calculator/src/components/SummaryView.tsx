import React, { useMemo } from "react";
import type { Inputs } from "../engine/types";
import { computeFinancialSummary } from "./FinancialReport";
import { InfoTooltip } from "./ui/InfoTooltip";

type Props = {
  inputs: Inputs;
  /**
   * Optional override for marginal tax rate incl. Medicare (percentage).
   * If omitted, Summary defaults to 47% (common top bracket) until we wire this from the engine.
   */
  taxRateInclMedicarePct?: number;
  summaryHorizon?: "five_year" | "lease_end";
};

function fmtAud0(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

export default function SummaryView({ inputs, taxRateInclMedicarePct, summaryHorizon }: Props) {
  // Single source of truth for all summary numbers used in this view
  const s = useMemo(
    () =>
      computeFinancialSummary({
        inputs,
        taxRateInclMedicarePct: taxRateInclMedicarePct ?? 47,
      }),
    [inputs, taxRateInclMedicarePct]
  );

  const electricityTooltipText =
    "Why is electricity treated separately?\n\n" +
    "For most running costs under a novated lease (for example servicing, insurance, or car washes), the amount you spend and the amount you claim are the same — so the analysis can treat them as one effective cost.\n\n" +
    "Electricity is different: under the ATO EV home‑charging claim rule, the claimable amount (based on 4.2c/km) can differ materially from your actual out‑of‑pocket electricity cost. You first pay the real bill, then claim a distance‑based amount using pre‑tax income. That gap can create a genuine net gain or loss, so it needs to be shown explicitly.";
  // Summary is always framed over {years} years of ownership
  const horizon: "five_year" | "lease_end" = summaryHorizon ?? "five_year";
  const isLeaseEnd = horizon === "lease_end";
  const years = isLeaseEnd ? s.yearsLease : 5;

  const nlTotalSpent = isLeaseEnd ? s.nlTotalSpentAtLeaseEnd : s.nlTotalSpentAt5;
  const offsetTotalSpent = isLeaseEnd ? s.offsetTotalSpentAtLeaseEnd : s.offsetTotalSpentAt5;
  const loanTotalSpent = isLeaseEnd ? s.loanTotalSpentAtLeaseEnd : s.loanTotalSpentAt5;
  const keepTotalSpent = isLeaseEnd ? s.keepTotalSpentAtLeaseEnd : s.keepTotalSpentAt5;

  const nlInterestTotal = isLeaseEnd ? s.irNl.first : s.irNl.total;
  const cashInterestTotal = isLeaseEnd ? s.irCash.first : s.irCash.total;
  const loanInterestTotal = isLeaseEnd ? s.irLoan.first : s.irLoan.total;
  const keepInterestTotal = isLeaseEnd ? s.irKeep.first : s.irKeep.total;

  const evEndValue = isLeaseEnd ? s.newEvValueAtLeaseEnd : inputs.estimatedMarketValueAtEnd;
  const currentEndValue = isLeaseEnd ? s.currentCarValueAtLeaseEnd : inputs.currentCarMarketValueAtEnd;

  const titleA = "Novated Lease";
  const titleB = "Offset Cash";
  const titleLoan = "Car Loan";

  // NL vs Offset Cash (horizon-aware)
  const cashflowSaving = offsetTotalSpent - nlTotalSpent;


  // Home-loan interest: amounts are negative (costs). “Saving” is positive when NL incurs LESS interest.
  const homeLoanInterestSaving = nlInterestTotal - cashInterestTotal;

  const totalSaving = cashflowSaving + homeLoanInterestSaving;

  // NL vs Car Loan (optional) — horizon-aware
  const cashflowSavingVsLoan = loanTotalSpent - nlTotalSpent;
  const homeLoanInterestSavingVsLoan = nlInterestTotal - loanInterestTotal;
  const totalSavingVsLoan = cashflowSavingVsLoan + homeLoanInterestSavingVsLoan;

  // Electricity delta over the lease (benefit if positive)
  const chargingDeltaTotal = s.chargingDeltaBenefitOverLease;

  // Post-lease running costs component (only applicable in 5-year horizon). This component should not be affected by charging delta.
  const nlPostLeaseRunningCosts = isLeaseEnd ? 0 : Math.max(0, s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd);

  // Headline NL cashflow total (exclude charging delta): lease payments + residual + post-lease running costs only.
  const nlCashflowTotalExclChargingDelta =
    s.leasePaymentsOverLease + s.residualPayableIncGst + nlPostLeaseRunningCosts;

  // Optional: compare with keeping current car / car loan
  const showCurrentCar = inputs.compareWithCurrentCar;
  const showLoan = inputs.compareWithCarLoan;

  // Interest impacts shown as positive dollar magnitudes in prose (they are stored as negative costs)
  const nlHomeLoanInterestImpact = nlInterestTotal;
  const cashHomeLoanInterestImpact = cashInterestTotal;
  const loanHomeLoanInterestImpact = loanInterestTotal;
  const currentHomeLoanInterestImpact = keepInterestTotal;


  // Selling current car now provides cash-in
  const saleProceedsNow = s.extraCashFromSaleOfOldCar;

  const keepRunningCostTotal = keepTotalSpent;

  // NL vs Keep decomposition (must sum to headline)
  const assetDelta = evEndValue - currentEndValue;

  // Cash delta: compare 5-year cash outlays (NL is reduced by sale proceeds now)
  const cashDelta = keepRunningCostTotal - (nlTotalSpent - saleProceedsNow);

  // Interest delta: positive when NL incurs LESS interest than keeping
  const interestDelta = nlHomeLoanInterestImpact - currentHomeLoanInterestImpact;

  const nlVsKeepSaving = assetDelta + cashDelta + interestDelta;

  const DisclaimerLine = () => (
    <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75, fontStyle: "italic" }}>
      <div>
        ⚠️ Some effects are not accounted for (for example, changes in government subsidies), as these are too complex to fully
        calculate. {" "}
<button
  type="button"
  onClick={() => {
    window.dispatchEvent(
      new CustomEvent("nlguide:navigate", {
        detail: { tab: "Details", anchorId: "details-section-4-ati" },
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
  }}
>
  <b>Explore further in Details – Section 4: Adjusted Taxable Income</b>
</button>
..
      </div>



      {inputs.superFromPreNlIncome === "No" ? (
        <div style={{ marginTop: 8 }}>
          ⚠️ Because your employer calculates Super Guarantee based on your post-novated-lease income, your super contributions may be materially reduced and are not reflected in the figures above.{" "}
<button
  type="button"
  onClick={() => {
    window.dispatchEvent(
      new CustomEvent("nlguide:navigate", {
        detail: { tab: "Details", anchorId: "details-section-5-sg" },
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
  }}
>
  <b>See Details – Section 5: Super Guarantee</b>
</button>
{" "}
for the estimated impact.
        </div>
      ) : null}

      <div style={{ marginTop: 8 }}>
      ⚠️ Novated leasing is a complex financial instrument with many caveats. Beyond the numerical outcomes shown here, it is
      important to consider the broader risks and trade-offs discussed here:{" "}
      <a
        href="https://novatedlease.guide/start-here/is-it-worth-it/#start-with-a-holistic-view-rather-than-the-savings-figure"
        target="_blank"
        rel="noopener noreferrer"
      >
        <b>Start with a holistic view rather than the savings figure</b>
      </a>
      .
    </div>

    </div>
  );

  const NoteBox = (p: { title: string; children: React.ReactNode }) => (
    <div
      style={{
        marginTop: 10,
        fontSize: 13,
        opacity: 0.85,
        fontStyle: "italic",
        padding: "10px 12px",
        borderLeft: "4px solid rgba(11, 92, 171, 0.55)",
        background: "rgba(11, 92, 171, 0.06)",
        borderRadius: 8,
      }}
    >
      <strong>{p.title}</strong> {p.children}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Card 1: NL vs Offset Cash */}
      <div style={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>
          Summary — {titleA} vs {titleB}
        </div>

        <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.55, fontVariantNumeric: "tabular-nums" }}>
          <div style={{ marginBottom: 8 }}>
            Over <b>{years}</b> years of ownership, the novated lease option costs{" "}
            <b>
              {fmtAud0(Math.abs(totalSaving))} {totalSaving >= 0 ? "less" : "more"}
            </b>{" "}
            compared to buying the car outright using offset cash.
          </div>

          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>
              {titleA} (cashflow over {years} years): {fmtAud0(s.leasePaymentsOverLease)} in lease payments,{" "}
              {fmtAud0(s.residualPayableIncGst)} residual
              {nlPostLeaseRunningCosts > 0 ? <> and {fmtAud0(nlPostLeaseRunningCosts)} post-lease running costs</> : null} ={" "}
              <b>{fmtAud0(nlCashflowTotalExclChargingDelta)} total</b>.
            </li>
            <li>
              {titleB} (cashflow over {years} years): {fmtAud0(inputs.driveawayCost)} driveaway, and{" "}
              {fmtAud0(Math.max(0, offsetTotalSpent - inputs.driveawayCost))} running costs ={" "}
              <b>{fmtAud0(offsetTotalSpent)} total</b>.
            </li>
            {inputs.vehicleType === "EV" ? (
            <li>
              Electricity: novated lease&apos;s calculation assumes {fmtAud0(s.assumedChargingClaimPerYear)} per year (ATO claiming
              rule) but the actual expense is {fmtAud0(s.chargingExpensePerYear)} per year. That difference accounts for an
              additional{" "}
              <b>
                {fmtAud0(Math.abs(chargingDeltaTotal))} {chargingDeltaTotal >= 0 ? "gain" : "loss"}
              </b>{" "}
              in the NL pathway over the lease term. <InfoTooltip text={electricityTooltipText} width={420} />
            </li>
            ) : null}
            <li>
              Besides, your car ownership and running costs result in about <b>{fmtAud0(-nlHomeLoanInterestImpact)}</b> of additional
              home-loan interest under the novated lease, compared with about <b>{fmtAud0(-cashHomeLoanInterestImpact)}</b> if you buy
              using offset cash.{" "}
              <span style={{ opacity: 0.85, fontStyle: "italic" }}>
                (This saving is less visible but is reflected as a difference in your loan balance, hence is a genuine effect on your
                financial position.)
              </span>
            </li>
            <li>
              The{" "}
              <b>
                {fmtAud0(Math.abs(totalSaving))} dollar {totalSaving >= 0 ? "saving" : "loss"}
              </b>{" "}
              consists of{" "}
              <b>
                {fmtAud0(Math.abs(cashflowSaving))} dollars {cashflowSaving >= 0 ? "lower" : "higher"} cashflow
              </b>{" "}
              and{" "}
              <b>
                {fmtAud0(Math.abs(homeLoanInterestSaving))} dollars {homeLoanInterestSaving >= 0 ? "less" : "more"} home-loan interest
              </b>{" "}
              when you opt for the novated lease.
            </li>
          </ul>

          <DisclaimerLine />
        </div>
      </div>

      {/* Card 2: NL vs Car Loan (optional) */}
      {showLoan && (
        <div style={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            Summary — {titleA} vs {titleLoan}
          </div>

          <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.55, fontVariantNumeric: "tabular-nums" }}>
            <div style={{ marginBottom: 8 }}>
              Over <b>{years}</b> years of ownership, the novated lease option costs{" "}
              <b>
                {fmtAud0(Math.abs(totalSavingVsLoan))} {totalSavingVsLoan >= 0 ? "less" : "more"}
              </b>{" "}
              compared to buying the same car using a traditional car loan.
            </div>

            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>
                {titleA} (cashflow over {years} years): {fmtAud0(s.leasePaymentsOverLease)} in lease payments,{" "}
                {fmtAud0(s.residualPayableIncGst)} residual
                {nlPostLeaseRunningCosts > 0 ? <> and {fmtAud0(nlPostLeaseRunningCosts)} post-lease running costs</> : null} ={" "}
                <b>{fmtAud0(nlCashflowTotalExclChargingDelta)} total</b>.
              </li>
              {inputs.vehicleType === "EV" ? (
              <li>
                Electricity: novated lease&apos;s calculation assumes {fmtAud0(s.assumedChargingClaimPerYear)} per year (ATO claiming
                rule) but the actual expense is {fmtAud0(s.chargingExpensePerYear)} per year. That difference accounts for an
                additional{" "}
                <b>
                  {fmtAud0(Math.abs(chargingDeltaTotal))} {chargingDeltaTotal >= 0 ? "gain" : "loss"}
                </b>{" "}
                in the NL pathway over the lease term. <InfoTooltip text={electricityTooltipText} width={420} />
              </li>
              ) : null}
              <li>
                {titleLoan} (cashflow over {years} years): deposit {fmtAud0(inputs.carLoanInitialDeposit)}, loan repayments + fees{" "}
                {fmtAud0(s.loanPaymentTotalInclFees)}, and running costs{" "}
                {fmtAud0(Math.max(0, loanTotalSpent - (inputs.carLoanInitialDeposit + s.loanPaymentTotalInclFees)))} ={" "}
                <b>{fmtAud0(loanTotalSpent)} total</b>.
              </li>
              <li>
                Besides, your car ownership and running costs result in about <b>{fmtAud0(-nlHomeLoanInterestImpact)}</b> of additional
                home-loan interest under the novated lease, compared with about <b>{fmtAud0(-loanHomeLoanInterestImpact)}</b> if you use
                a traditional car loan.{" "}
                <span style={{ opacity: 0.85, fontStyle: "italic" }}>
                  (This saving is less visible but is reflected as a difference in your loan balance, hence is a genuine effect on your
                  financial position.)
                </span>
              </li>
              <li>
                The{" "}
                <b>
                  {fmtAud0(Math.abs(totalSavingVsLoan))} dollar {totalSavingVsLoan >= 0 ? "saving" : "loss"}
                </b>{" "}
                consists of{" "}
                <b>
                  {fmtAud0(Math.abs(cashflowSavingVsLoan))} dollars {cashflowSavingVsLoan >= 0 ? "lower" : "higher"} cashflow
                </b>{" "}
                and{" "}
                <b>
                  {fmtAud0(Math.abs(homeLoanInterestSavingVsLoan))} dollars {homeLoanInterestSavingVsLoan >= 0 ? "less" : "more"}{" "}
                  home-loan interest
                </b>{" "}
                when you opt for the novated lease.
              </li>
            </ul>

            <DisclaimerLine />
          </div>
        </div>
      )}

      {/* Card 3: NL vs Keeping Current Car (optional) */}
      {showCurrentCar && (
        <div style={{ border: "1px solid rgba(0,0,0,0.15)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            Summary — {titleA} vs Keeping Current Car
          </div>

          <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.55, fontVariantNumeric: "tabular-nums" }}>
            <div style={{ marginBottom: 8 }}>
              Over <b>{years}</b> years of ownership, leasing a car costs{" "}
              <b>
                {fmtAud0(Math.abs(nlVsKeepSaving))} {nlVsKeepSaving >= 0 ? "less" : "more"}
              </b>{" "}
              compared to keeping your current car.
            </div>

            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>
                End assets: leased car ends at <b>{fmtAud0(evEndValue)}</b> vs current car ends at <b>{fmtAud0(currentEndValue)}</b> (asset
                difference <b>{fmtAud0(assetDelta)}</b>).
              </li>
              <li>
                Cashflows (over {years} years): NL spends <b>{fmtAud0(nlTotalSpent)}</b> but recovers <b>{fmtAud0(saleProceedsNow)}</b>{" "}
                from selling the current car now; keeping the current car spends <b>{fmtAud0(keepRunningCostTotal)}</b> in running
                costs.
              </li>
              <li>
                Besides, your car ownership and running costs result in about <b>{fmtAud0(-nlHomeLoanInterestImpact)}</b> of additional
                home-loan interest under the novated lease, compared with about <b>{fmtAud0(-currentHomeLoanInterestImpact)}</b> if you
                keep your current car.{" "}
                <span style={{ opacity: 0.85, fontStyle: "italic" }}>
                  (This saving is less visible but is reflected as a difference in your loan balance, hence is a genuine effect on your
                  financial position.)
                </span>
              </li>
              <li>
                The{" "}
                <b>
                  {fmtAud0(Math.abs(nlVsKeepSaving))} dollar {nlVsKeepSaving >= 0 ? "saving" : "loss"}
                </b>{" "}
                consists of <b>{fmtAud0(Math.abs(assetDelta))}</b> dollars {assetDelta >= 0 ? "more" : "less"} in car asset value,{" "}
                <b>{fmtAud0(Math.abs(cashDelta))}</b> dollars {cashDelta >= 0 ? "lower" : "higher"} cashflow, and{" "}
                <b>{fmtAud0(Math.abs(interestDelta))}</b> dollars {interestDelta >= 0 ? "less" : "more"} home-loan interest when you
                opt for the novated lease.
              </li>
            </ul>

            <DisclaimerLine />
          </div>
        </div>
      )}

      <NoteBox title="Modelling assumption:">
        this modelling for novated leasing explicitly includes the final residual payout, and therefore assumes you fully own the car at
        the end of the lease. This addresses a common misconception that novated leasing is expensive simply because you “don’t own the
        car” at the end.
      </NoteBox>

      <NoteBox title="Interpretation:">
        all “additional home-loan interest” figures shown above are computed relative to a reference scenario of having no car and no
        running costs over the same duration. This reference is chosen as it allows a clean comparison of any two scenarios in this tool.
      </NoteBox>

    </div>
  );
}