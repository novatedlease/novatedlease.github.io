import { useEffect, useRef, useState } from "react";
import type { Inputs } from "@engine/types";
import { getLeaseFbtCategory, getEvLctThresholdForLeaseStart, EV_TRANSITIONAL_FULL_EXEMPT_CAP } from "@engine/types";
import { Section } from "./ui/Section";
import { CurrencyField, PercentField, NumberField, PillGroup, YesNoToggle, SelectField, DateField } from "./ui/Field";
import { InfoTooltip } from "./ui/InfoTooltip";
import { LeaseRateGuard } from "./LeaseRateGuard";
import { NoteBox } from "./ui/shared";
import { Button } from "./ui/Button";
import { trackEvent, trackOncePerSession } from "../utils/analytics";

/**
 * Full Advanced-mode input form — every field in the engine's `Inputs` type,
 * ported from calculator/src/components/InputsPanel.tsx (2,326 lines). Field
 * grouping matches v1's sections (FBT eligibility, vehicle details, financials,
 * lease details, running costs, electricity, car loan comparator, keep-current-car
 * comparator). Not ported: the effective-rate nudge (±0.1%) buttons — a
 * secondary convenience around a field that already works without it.
 */
export function InputsPanel(props: {
  inputs: Inputs;
  setInputs: React.Dispatch<React.SetStateAction<Inputs>>;
  vehicleLeasePeriodMode: "perFn" | "perMonth";
  onVehicleLeasePeriodModeChange: (mode: "perFn" | "perMonth") => void;
  onResetDefaults?: () => void;
  onNavigateToDetails?: (anchorId?: string) => void;
}) {
  const { inputs, setInputs, vehicleLeasePeriodMode, onVehicleLeasePeriodModeChange } = props;

  // Mirrors v1 App.tsx's handleUserInput: first field touch is the primary
  // engagement conversion; every change also fires a lightweight debug event.
  function touch(field: string) {
    trackOncePerSession("calculator_started", "calculator_started", { field });
    trackEvent("input_changed", { field });
  }

  // Lease-duration re-quote warning — mirrors v1 InputsPanel.tsx (~lines 36-42, 676-713):
  // changing lease duration (by any means — field edit, saved-quote load, share link) usually
  // invalidates the per-fortnight quote, so nudge the user to re-check it.
  const [needsLeaseRequote, setNeedsLeaseRequote] = useState(false);
  const prevLeaseDurationRef = useRef<number>(inputs.leaseDurationYears);
  useEffect(() => {
    if (prevLeaseDurationRef.current !== inputs.leaseDurationYears) {
      prevLeaseDurationRef.current = inputs.leaseDurationYears;
      setNeedsLeaseRequote(true);
    }
  }, [inputs.leaseDurationYears]);

  // Residual ex/inc-GST display toggle — mirrors v1 InputsPanel.tsx (~lines 97-108, 715-743):
  // the field displays/accepts either ex-GST or inc-GST, but storage stays canonically ex-GST.
  const GST_RATE = 0.1;
  const [residualGstMode, setResidualGstMode] = useState<"exGst" | "incGst">("exGst");

  function set<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    touch(key);
    setInputs((p) => ({ ...p, [key]: value }));
  }

  const isEv = inputs.vehicleType === "EV";
  const leaseFbtCategory = getLeaseFbtCategory(inputs);
  const needsUsedEligibilityChecks = inputs.vehicleCondition !== "New";
  const usedEligibilityChecksOk = !needsUsedEligibilityChecks || (inputs.usedCarFirstHeldAfterJul2022 && inputs.usedCarLctNeverPayable);
  const effectiveLctThreshold = getEvLctThresholdForLeaseStart(inputs.leaseStartDate);

  const fbtCategoryLabel =
    leaseFbtCategory === "EV_FBT_EXEMPT" ? "FBT-exempt" : leaseFbtCategory === "EV_FBT_DISCOUNTED" ? "75% FBT applicable" : "FBT-applicable";
  const fbtCategoryColor = leaseFbtCategory === "EV_FBT_EXEMPT" ? "#1b5e20" : leaseFbtCategory === "EV_FBT_DISCOUNTED" ? "#92400e" : "#b71c1c";

  // Lease start date milestone checks (for the May-2026 phase-out info banner) —
  // mirrors v1 InputsPanel.tsx (~lines 369-402, 648-663).
  const leaseStartMs = new Date(inputs.leaseStartDate + "T00:00:00Z").getTime();
  const isTransitionalLease = leaseStartMs >= Date.UTC(2027, 3, 1) && leaseStartMs < Date.UTC(2029, 3, 1);
  const isPostPhaseoutLease = leaseStartMs >= Date.UTC(2029, 3, 1);

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", rowGap: 8, columnGap: 12, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.1, paddingTop: 4, letterSpacing: "-0.02em" }}>Inputs</div>
        <Button
          size="sm"
          onClick={() => {
            touch("reset");
            setNeedsLeaseRequote(false);
            props.onResetDefaults?.();
          }}
        >
          🔄 Reset
        </Button>
      </div>

      <Section title="Vehicle & FBT eligibility" description="Determines whether the EV FBT exemption (or the 2027-29 phase-out discount) applies." defaultOpen>
        <PillGroup
          label="Vehicle type"
          value={inputs.vehicleType}
          onChange={(v: Inputs["vehicleType"]) => set("vehicleType", v)}
          options={[
            { value: "EV", label: "EV" },
            { value: "Non-EV", label: "Petrol / diesel / hybrid" },
          ]}
          tooltip={<InfoTooltip text="FBT exemption applies only to eligible EVs: first held and used after 1 July 2022, and Luxury Car Tax (LCT) was not payable at any point." />}
        />

        <SelectField
          label="Vehicle condition"
          value={inputs.vehicleCondition}
          onChange={(v: Inputs["vehicleCondition"]) => {
            touch("vehicleCondition");
            setInputs((p) => ({
              ...p,
              vehicleCondition: v,
              usedCarFirstHeldAfterJul2022: v === "New" ? false : p.usedCarFirstHeldAfterJul2022,
              usedCarLctNeverPayable: v === "New" ? false : p.usedCarLctNeverPayable,
            }));
          }}
          options={[
            { value: "New", label: "New" },
            { value: "Used – dealer sale (GST inc)", label: "Used – dealer sale (GST inc)" },
            { value: "Used – private sale (no GST)", label: "Used – private sale (no GST)" },
          ]}
          tooltip={<InfoTooltip text="Determines FBT-exemption eligibility as well as GST treatment for initial purchase." />}
        />

        {isEv && needsUsedEligibilityChecks && (
          <div style={{ display: "grid", gap: 8, marginBottom: 16, fontSize: 13 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <input type="checkbox" checked={inputs.usedCarFirstHeldAfterJul2022} onChange={(e) => set("usedCarFirstHeldAfterJul2022", e.target.checked)} style={{ marginTop: 2 }} />
              <span>The car was first held and used after <b>1 July 2022</b></span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <input type="checkbox" checked={inputs.usedCarLctNeverPayable} onChange={(e) => set("usedCarLctNeverPayable", e.target.checked)} style={{ marginTop: 2 }} />
              <span><b>Luxury Car Tax (LCT)</b> was never payable for this car</span>
            </label>
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 800, color: fbtCategoryColor, marginBottom: 12 }}>
          {fbtCategoryLabel}
        </div>

        {isEv && (isTransitionalLease || isPostPhaseoutLease) && (
          <NoteBox color="#0b5cab" mt={-8}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>May 2026 FBT phase-out rules apply to this lease start date</div>
            <div style={{ opacity: 0.9 }}>
              {isTransitionalLease ? (
                <>
                  Leases starting <b>1 Apr 2027 – 31 Mar 2029</b>: full FBT exemption only for cars ≤ $
                  {EV_TRANSITIONAL_FULL_EXEMPT_CAP.toLocaleString("en-AU")}; cars ${(EV_TRANSITIONAL_FULL_EXEMPT_CAP + 1).toLocaleString("en-AU")}–$
                  {effectiveLctThreshold.toLocaleString("en-AU")} have 75% of FBT apply; above the LCT threshold is fully applicable.
                </>
              ) : (
                <>
                  Leases starting <b>from 1 Apr 2029</b>: full FBT exemption is no longer available. Cars at or below the LCT threshold
                  (${effectiveLctThreshold.toLocaleString("en-AU")}) receive 75% of FBT applies; above the LCT threshold is fully applicable.
                </>
              )}{" "}
              <a href="/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/" target="_blank" rel="noopener">
                Read more about the phase-out rules
              </a>
              .
            </div>
          </NoteBox>
        )}
      </Section>

      <Section title="Vehicle details" defaultOpen>
        {isEv && leaseFbtCategory === "EV_FBT_APPLICABLE" && (
          <NoteBox color="#c81e1e">
            <div style={{ fontWeight: 800, marginBottom: 4 }}>This vehicle may not be eligible for FBT-exempt (EV) novated leasing.</div>
            <div style={{ opacity: 0.92 }}>
              {!usedEligibilityChecksOk ? (
                <>
                  For used vehicles, you must confirm the vehicle was first held and used after <b>1 July 2022</b>, and that{" "}
                  <b>Luxury Car Tax (LCT)</b> was never payable. Please tick both checkboxes in the Vehicle &amp; FBT eligibility
                  section above, otherwise this will be treated as an <b>FBT-applicable</b> lease.
                </>
              ) : (
                <>
                  Your vehicle dutiable value appears to exceed the EV Luxury Car Tax threshold (${effectiveLctThreshold.toLocaleString("en-AU")}).
                  This will be treated as an <b>FBT-applicable</b> lease.
                </>
              )}
            </div>
          </NoteBox>
        )}
        <CurrencyField
          label="Vehicle dutiable value (FBT base value)"
          value={inputs.vehicleBaseValue}
          onChange={(v) => set("vehicleBaseValue", v)}
          tooltip={
            <InfoTooltip
              text={
                "Listed on the car invoice prior to stamp duty, rego, and CTP insurance. Many invoices label this vehicle subtotal.\n\n" +
                "✅ Included: the car's RRP, GST on the car, delivery fee, optional add-ons (e.g. floor mats, tow bar).\n\n" +
                "❌ Not included: compulsory third party (CTP) insurance, registration, stamp duty, Luxury Car Tax (LCT)."
              }
            />
          }
        />
        <CurrencyField
          label="Drive-away cost"
          value={inputs.driveawayCost}
          onChange={(v) => set("driveawayCost", v)}
          tooltip={<InfoTooltip text="Total price you'd pay to drive away if paying cash." />}
        />
        <CurrencyField
          label="Estimated market value after 5 years"
          value={inputs.estimatedMarketValueAtEnd}
          onChange={(v) => set("estimatedMarketValueAtEnd", v)}
          hint="Suggestion: ~40% of drive-away cost (auto-filled). Enter the 5-year value even for shorter leases — the calculator interpolates."
        />
        <NumberField label="Annual mileage" value={inputs.annualMileageKm} onChange={(v) => set("annualMileageKm", v)} suffix="km/yr" step={500} />
      </Section>

      <Section title="Financials" defaultOpen>
        <CurrencyField
          label="Total taxable income"
          value={inputs.totalTaxableIncome}
          onChange={(v) => set("totalTaxableIncome", v)}
          tooltip={<InfoTooltip text="The sum of ALL income minus deductions — not just the portion via the workplace arranging this lease." />}
        />
        <PercentField
          label="Home loan offset interest rate"
          value={inputs.homeLoanOffsetInterestRate}
          onChange={(v) => set("homeLoanOffsetInterestRate", v)}
          decimals={2}
          tooltip={
            <InfoTooltip
              width={440}
              text={
                "The spirit of this question: what is the opportunity cost of your cash — i.e. what would it otherwise be earning if it wasn't spent on buying the car outright?\n\n" +
                "If your cash sits in your home loan offset account, use that loan's interest rate directly — the benefit (interest avoided) isn't taxable, so no adjustment is needed.\n\n" +
                "If you don't have a home loan, use the next-best alternative you'd otherwise use, e.g. a High-Interest Savings Account (HISA) rate.\n\n" +
                "If your cash would instead sit in an investment property's loan offset, or a HISA, the interest earned there IS taxable — so use the post-tax equivalent: rate × (1 − your marginal tax rate incl. Medicare levy). Example: a 6% HISA/investment-offset rate at a 45% + 2% Medicare marginal rate → 6% × (1 − 0.47) = 6% × 0.53 = 3.18%.\n\n" +
                "Set to 0 if the cash would otherwise sit in a non-income-producing account."
              }
            />
          }
        />
        <YesNoToggle
          label="Super Guarantee calculated from pre-NL income"
          value={inputs.superFromPreNlIncome}
          onChange={(v) => set("superFromPreNlIncome", v)}
          tooltip={
            <InfoTooltip
              text={
                "Usually Yes, but in ~10% of cases the employer calculates SG on the post-NL amount — check with payroll, it has a significant impact.\n\n" +
                "[Read more about how novated leases affect your Super Guarantee](https://novatedlease.guide/special-and-policy/super-guarantee/)"
              }
            />
          }
        />
      </Section>

      <Section title="Lease details" defaultOpen>
        <CurrencyField label="Lease documentation fee" value={inputs.leaseDocFee} onChange={(v) => set("leaseDocFee", v)} hint="Initial financier setup fee, if any. Set as 0 if not applicable." />
        <DateField
          label="Lease start date"
          value={inputs.leaseStartDate}
          onChange={(v) => set("leaseStartDate", v)}
          hint={
            <>
              Matters for the{" "}
              <a href="/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/" target="_blank" rel="noopener">
                EV FBT phase-out tiers
              </a>
              .
            </>
          }
        />
        {isEv && leaseFbtCategory === "EV_FBT_DISCOUNTED" && (
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid rgba(180, 130, 0, 0.35)",
              background: "rgba(255, 193, 7, 0.08)",
              fontSize: 12,
              fontWeight: 800,
              color: "rgb(120, 80, 0)",
              marginBottom: 12,
            }}
          >
            75% FBT Applicable —{" "}
            <a href="/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/" target="_blank" rel="noopener" style={{ color: "inherit" }}>
              May 2026 phase-out rules
            </a>{" "}
            apply to this lease start date
          </div>
        )}
        <NumberField label="Lease duration" value={inputs.leaseDurationYears} onChange={(v) => set("leaseDurationYears", Math.max(1, Math.min(5, Math.round(v))))} suffix="years" min={1} max={5} decimals={0} />
        {needsLeaseRequote && (
          <NoteBox color="#c81e1e">
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Heads up: changing lease duration usually changes your per-fortnight lease quote.</div>
            <div style={{ opacity: 0.92 }}>
              Please update <b>Vehicle finance</b> (and <b>all other quote-dependent fields</b>) to match the new duration, otherwise the outputs may be misleading.
            </div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
              <Button size="sm" onClick={() => setNeedsLeaseRequote(false)}>
                I've updated the quote
              </Button>
            </div>
          </NoteBox>
        )}
        <LeaseRateGuard
          inputs={inputs}
          setInputs={setInputs}
          vehicleLeasePeriodMode={vehicleLeasePeriodMode}
          onVehicleLeasePeriodModeChange={onVehicleLeasePeriodModeChange}
          onNavigateToDetails={props.onNavigateToDetails}
        />
        <CurrencyField
          label={
            <div>
              <div>Residual value</div>
              <div style={{ display: "flex", gap: 6, marginTop: 3, fontSize: 11 }}>
                {(["exGst", "incGst"] as const).map((mode, idx) => (
                  <span key={mode} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {idx > 0 && <span style={{ opacity: 0.3 }}>/</span>}
                    <button
                      type="button"
                      onClick={() => setResidualGstMode(mode)}
                      style={{
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: residualGstMode === mode ? 800 : 400,
                        opacity: residualGstMode === mode ? 0.9 : 0.45,
                        textDecoration: residualGstMode === mode ? "underline" : "none",
                      }}
                    >
                      {mode === "exGst" ? "ex GST" : "inc GST"}
                    </button>
                  </span>
                ))}
              </div>
            </div>
          }
          value={residualGstMode === "incGst" ? inputs.residualValueExGst * (1 + GST_RATE) : inputs.residualValueExGst}
          onChange={(v) => set("residualValueExGst", residualGstMode === "incGst" ? v / (1 + GST_RATE) : v)}
          hint="Auto-filled from the ATO minimum for your lease term until you override it. Real quotes usually state the residual inc GST."
        />
        <CurrencyField
          label="Luxury vehicle adjustment (per fortnight)"
          value={inputs.luxuryVehicleAdjPerFn}
          onChange={(v) => set("luxuryVehicleAdjPerFn", v)}
          hint="Pre-tax. 0 if not applicable."
          tooltip={
            <InfoTooltip
              text={
                "Only applies above $69,883, due to complex employer accounting reasons (a separate concept from the Luxury Car Tax (LCT) threshold). Listed separately on some quotes.\n\n" +
                "[Read sgfleet's explainer on the luxury vehicle adjustment](https://www.sgfleet.com/docs/australialibraries/novated/novated-support/7-sgf-oct2024-luxury-vehicle-adjustment.pdf)"
              }
            />
          }
        />
        <CurrencyField label="Financed amount reported in your quote" value={inputs.financedAmountForInterestCalcExGst} onChange={(v) => set("financedAmountForInterestCalcExGst", v)} hint="Only used for the effective interest rate calculation — leave as the pre-calculated figure unless you have a specific quoted amount without add-ons." />
        <NumberField label="Months deferred" value={inputs.monthsDeferred} onChange={(v) => set("monthsDeferred", Math.max(0, Math.round(v)))} hint="Typically 2 months, occasionally 1." decimals={0} />
      </Section>

      <Section title={`Annual packaged running cost (${inputs.gstSavingPassedOn === "Yes" ? "ex GST" : "inc GST"})`} defaultOpen>
        <YesNoToggle
          label="GST saving passed on in NL"
          value={inputs.gstSavingPassedOn}
          onChange={(v) => set("gstSavingPassedOn", v)}
          hint={inputs.gstSavingPassedOn === "Yes" ? "Use ex-GST figures in the fields below." : "Use inc-GST figures in the fields below."}
          tooltip={
            <InfoTooltip
              text={
                "Usually Yes, but some employers (Victorian hospitals in particular) do not pass on the GST saving — check.\n\n" +
                "[Read more about what happens if the GST saving isn't passed on](https://novatedlease.guide/running-costs/failure-to-pass-gst-saving/)"
              }
            />
          }
        />
        <CurrencyField label="Service / maintenance / tyres" value={inputs.serviceMaintTyresAnnual} onChange={(v) => set("serviceMaintTyresAnnual", v)} hint="Annual figure." />
        <CurrencyField
          label="NSW Health save share"
          value={inputs.saveShareAnnual}
          onChange={(v) => set("saveShareAnnual", v)}
          hint="Leave as 0 unless you're an NSW Health employee."
          tooltip={
            <InfoTooltip
              text={
                "NSW Health employees receive an employer-shared saving through their salary packaging arrangement, credited as an offset to running costs.\n\n" +
                "[Read more about the NSW Health employer share](https://novatedlease.guide/special-and-policy/nsw-health-employer-share/)"
              }
            />
          }
        />
        <CurrencyField label="Registration" value={inputs.registrationAnnual} onChange={(v) => set("registrationAnnual", v)} />
        {isEv ? (
          <CurrencyField
            label="Electricity"
            value={inputs.electricityAnnual}
            onChange={(v) => set("electricityAnnual", v)}
            hint="The packaged claim amount (ATO shortcut: 5.47c/km) — not your actual charging cost, which goes in the Electricity section below."
          />
        ) : (
          <CurrencyField label="Fuel" value={inputs.fuelAnnual} onChange={(v) => set("fuelAnnual", v)} hint="Expected annual petrol/diesel cost." />
        )}
        <CurrencyField label="Insurance" value={inputs.insuranceAnnual} onChange={(v) => set("insuranceAnnual", v)} hint="Comprehensive insurance — shop around and compare with your provider's quote." />
        <CurrencyField label="Management fees" value={inputs.managementFeesAnnual} onChange={(v) => set("managementFeesAnnual", v)} hint="Sum of all novated lease membership/management fees." />
      </Section>

      {isEv && (
        <Section title="Electricity" defaultOpen>
          <CurrencyField label="Average AUD per kWh" value={inputs.avgAudPerKwh} onChange={(v) => set("avgAudPerKwh", v)} decimals={2} hint="~0.08 off-peak, ~0.30 regular tariff, ~0.40–0.60 public chargers." />
          <NumberField label="Average Wh per km" value={inputs.avgWhPerKm} onChange={(v) => set("avgWhPerKm", Math.round(v))} hint="Typically 120–200 Wh/km." decimals={0} />
          <CurrencyField
            label="Annual charging expense override"
            value={inputs.overrideAnnualChargingExpense ?? 0}
            onChange={(v) => set("overrideAnnualChargingExpense", v === 0 ? undefined : v)}
            hint="Only set this if you have a better real-world estimate (e.g. frequent public charging). Leave at 0 to use the calculated figure."
          />
        </Section>
      )}

      <Section title="Compare with car loan" description="Turn on to add a car-loan pathway to the comparison." defaultOpen>
        <YesNoToggle label="Enable car loan comparison" value={inputs.compareWithCarLoan ? "Yes" : "No"} onChange={(v) => set("compareWithCarLoan", v === "Yes")} />
        {inputs.compareWithCarLoan && (
          <>
            <CurrencyField label="Initial deposit amount" value={inputs.carLoanInitialDeposit} onChange={(v) => set("carLoanInitialDeposit", v)} />
            <div style={{ fontSize: 12, color: "var(--nlc-text-muted)", marginBottom: 12 }}>
              <b>Loan term</b> is forced to match lease duration ({inputs.leaseDurationYears} years) above. If you want to compare a
              different loan term to the lease term, set up two separate quotes with the lengths you want, save them, and use the{" "}
              <b>Compare</b> tab to juxtapose the outcomes.
            </div>
            <PercentField label="Interest rate" value={inputs.carLoanInterestRatePct} onChange={(v) => set("carLoanInterestRatePct", v)} decimals={2} hint="Use the actual interest rate, not the comparison rate." />
            <CurrencyField label="Monthly fee" value={inputs.carLoanMonthlyFee} onChange={(v) => set("carLoanMonthlyFee", v)} />
          </>
        )}
      </Section>

      <Section title="Compare with keeping current car" description="Turn on to add a keep-current-car pathway to the comparison." defaultOpen>
        <YesNoToggle label="Enable keep-current-car comparison" value={inputs.compareWithCurrentCar ? "Yes" : "No"} onChange={(v) => set("compareWithCurrentCar", v === "Yes")} />
        {inputs.compareWithCurrentCar && (
          <>
            <CurrencyField label="Current market value" value={inputs.currentCarMarketValueNow} onChange={(v) => set("currentCarMarketValueNow", v)} hint="Look up carsales.com.au or similar." />
            <CurrencyField label="Estimated market value after 5 years" value={inputs.currentCarMarketValueAtEnd} onChange={(v) => set("currentCarMarketValueAtEnd", v)} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--nlc-text-muted)", marginBottom: 10 }}>Annual running cost (inc GST)</div>
            <CurrencyField label="Service / maintenance / tyres" value={inputs.currentServiceMaintTyresAnnual} onChange={(v) => set("currentServiceMaintTyresAnnual", v)} />
            <CurrencyField label="Registration" value={inputs.currentRegistrationAnnual} onChange={(v) => set("currentRegistrationAnnual", v)} />
            <CurrencyField label="Fuel" value={inputs.currentFuelAnnual} onChange={(v) => set("currentFuelAnnual", v)} />
            <CurrencyField label="Insurance" value={inputs.currentInsuranceAnnual} onChange={(v) => set("currentInsuranceAnnual", v)} />
          </>
        )}
      </Section>
    </>
  );
}
