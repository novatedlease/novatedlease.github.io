import React, { useEffect, useRef, useState } from "react";
import type { Inputs } from "../engine/types";
import { InfoTooltip } from "./ui/InfoTooltip";

export type InputsPanelProps = {
  inputs: Inputs;
  setInputs: React.Dispatch<React.SetStateAction<Inputs>>;

  // Lease quote guard + live effective rate display
  onVehicleLeasePerFnChange: (v: number) => void;
  guardLiveRatePct: number; // e.g. 8.6 for 8.6%
  guardMessage?: string;

  // Formatting helpers (keep App.tsx as the source of truth)
  formatPct: (pct: number) => string;
  onResetDefaults?: () => void;
};

export default function InputsPanel(props: InputsPanelProps) {
  const { inputs, setInputs } = props;
    const [needsLeaseRequote, setNeedsLeaseRequote] = useState(false);
  const prevLeaseDurationRef = useRef<number>(inputs.leaseDurationYears);

  // When lease duration changes, users MUST update their per-fortnight lease quote.
  useEffect(() => {
    if (prevLeaseDurationRef.current !== inputs.leaseDurationYears) {
      prevLeaseDurationRef.current = inputs.leaseDurationYears;
      setNeedsLeaseRequote(true);
    }
  }, [inputs.leaseDurationYears]);

  const [vehicleLeasePerFnText, setVehicleLeasePerFnText] = useState<string>(
  fmtMoneyInput(inputs.vehicleLeasePerFn)
);

  useEffect(() => {
    // Keep text synced to committed value (e.g. guard accept/reject, share-link load, etc.)
    setVehicleLeasePerFnText(fmtMoneyInput(inputs.vehicleLeasePerFn));
  }, [inputs.vehicleLeasePerFn]);

  // EV FBT exemption eligibility (expanded logic for used vehicle checks)
  // If the vehicle exceeds the EV Luxury Car Tax threshold, it is NOT eligible for FBT-exempt novated leasing.
  // TODO: centralise this threshold with a shared constant once the policy module is in place.
  const EV_LCT_THRESHOLD = 91387;

  const isOverEvLctThreshold = inputs.vehicleBaseValue > EV_LCT_THRESHOLD;

  const needsUsedEligibilityChecks = inputs.vehicleCondition !== "New";
  const usedEligibilityChecksOk =
    !needsUsedEligibilityChecks ||
    (inputs.usedCarFirstHeldAfterJul2022 && inputs.usedCarLctNeverPayable);

  const isEv = inputs.vehicleType === "EV";
  const isFbtExemptEligible =
    isEv && inputs.vehicleBaseValue > 0 && !isOverEvLctThreshold && usedEligibilityChecksOk;
  const evEligibilityCriteriaSatisfied =
    isEv && inputs.vehicleBaseValue > 0 && !isOverEvLctThreshold && usedEligibilityChecksOk;
  const leaseFbtTypeLabel = evEligibilityCriteriaSatisfied ? "FBT-Exempt" : "FBT-Applicable";

  return (
    <div style={{ flex: 1, minWidth: 360, maxWidth: 560, fontSize: 14, lineHeight: 1.35 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 18 }}>Inputs</div>
        <button
          type="button"
          onClick={() => {
            setNeedsLeaseRequote(false);
            props.onResetDefaults?.();
          }}
          style={{
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            background: "#fff",
            padding: "8px 12px",
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            minHeight: 34,
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <Section title="FBT-EXEMPTION ELIGIBILITY">
          {/* EV/NON-EV Toggle */}
          <FieldRow
            label="Vehicle Type"
            tooltip={
              <InfoTooltip text="FBT exemption applies only to eligible EVs: first held and used after 1 July 2022, and Luxury Car Tax (LCT) was not payable at any point." />
            }
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 34,
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.18)",
                background: "rgba(0,0,0,0.04)",
                overflow: "hidden",
                userSelect: "none",
              }}
            >
              {/* Sliding knob */}
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  bottom: 2,
                  left: 2,
                  width: "calc(50% - 2px)",
                  borderRadius: 999,
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  transform: inputs.vehicleType === "EV" ? "translateX(0)" : "translateX(100%)",
                  transition: "transform 180ms ease",
                }}
              />

              {/* Click targets + labels */}
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  height: "100%",
                }}
              >
                <button
                  type="button"
                  onClick={() => setInputs((p) => ({ ...p, vehicleType: "EV" }))}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: inputs.vehicleType === "EV" ? 900 : 750,
                    opacity: inputs.vehicleType === "EV" ? 1 : 0.85,
                  }}
                  aria-pressed={inputs.vehicleType === "EV"}
                >
                  EV
                </button>
                <button
                  type="button"
                  onClick={() => setInputs((p) => ({ ...p, vehicleType: "Non-EV" }))}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: inputs.vehicleType === "Non-EV" ? 900 : 750,
                    opacity: inputs.vehicleType === "Non-EV" ? 1 : 0.85,
                  }}
                  aria-pressed={inputs.vehicleType === "Non-EV"}
                >
                  Non-EV
                </button>
              </div>
            </div>
          </FieldRow>
          {/* Eligibility cue (only show when EV but not eligible) */}
          {isEv && !evEligibilityCriteriaSatisfied ? (
            <ReadOnlyValue
              label="Eligible for FBT exemption"
              tooltip={<InfoTooltip text="Automatically determined from the next section" />}
              value="No"
            />
          ) : null}
          <FieldRow label="Novated lease type">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 800,
                background: evEligibilityCriteriaSatisfied
                  ? "rgba(46, 125, 50, 0.12)"
                  : "rgba(255, 143, 0, 0.18)",
                color: evEligibilityCriteriaSatisfied
                  ? "rgb(27, 94, 32)"
                  : "rgb(230, 81, 0)",
                border: evEligibilityCriteriaSatisfied
                  ? "1px solid rgba(46, 125, 50, 0.35)"
                  : "1px solid rgba(255, 143, 0, 0.45)",
              }}
            >
              {leaseFbtTypeLabel}
            </div>
          </FieldRow>
        </Section>

        <Section
          title="VEHICLE DETAILS"
          highlight={!isFbtExemptEligible}
          banner={
            !isFbtExemptEligible ? (
              <div
                style={{
                  padding: "10px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(200,0,0,0.28)",
                  background: "rgba(200,0,0,0.06)",
                  fontSize: 12,
                  lineHeight: 1.35,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 4 }}>
                  This vehicle may not be eligible for FBT-exempt (EV) novated leasing.
                </div>
                <div style={{ opacity: 0.92 }}>
                  {!isEv ? (
                    <>
                      You selected <b>Non‑EV</b>. Only eligible EVs can use the <b>FBT‑exempt</b> pathway.
                      The calculator will assume this to be an <b>FBT-applicable</b> novated lease.
                    </>
                  ) : !usedEligibilityChecksOk ? (
                    <>
                      For used vehicles, you must confirm the vehicle was first held and used after <b>1 July 2022</b>,
                      and that <b>Luxury Car Tax (LCT)</b> was never payable. Please tick both checkboxes below, otherwise
                      this will be treated as an <b>FBT-applicable</b> lease.
                    </>
                  ) : (
                    <>
                      Your vehicle dutiable value appears to exceed the EV Luxury Car Tax threshold ($
                      {EV_LCT_THRESHOLD.toLocaleString("en-AU")}). This will be treated as an <b>FBT-applicable</b> lease.
                    </>
                  )}
                </div>
              </div>
            ) : null
          }
        >
          <SelectNewUsed
            label="Vehicle condition"
            tooltip={
              <InfoTooltip text="This determines FBT-exemption eligibility as well as GST treatment for initial purchase." />
            }
            value={inputs.vehicleCondition}
            onChange={(v) =>
              setInputs((p) => ({
                ...p,
                vehicleCondition: v,
                usedCarFirstHeldAfterJul2022: v === "New" ? false : p.usedCarFirstHeldAfterJul2022,
                usedCarLctNeverPayable: v === "New" ? false : p.usedCarLctNeverPayable,
              }))
            }
          />

          {inputs.vehicleCondition !== "New" ? (
            <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, opacity: 0.92 }}>
                <input
                  type="checkbox"
                  checked={inputs.usedCarFirstHeldAfterJul2022}
                  onChange={(e) =>
                    setInputs((p) => ({ ...p, usedCarFirstHeldAfterJul2022: e.target.checked }))
                  }
                  style={{ marginTop: 2 }}
                />
                <span>The car was first held and used after <b>1 July 2022</b></span>
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, opacity: 0.92 }}>
                <input
                  type="checkbox"
                  checked={inputs.usedCarLctNeverPayable}
                  onChange={(e) => setInputs((p) => ({ ...p, usedCarLctNeverPayable: e.target.checked }))}
                  style={{ marginTop: 2 }}
                />
                <span>
                  <b>Luxury Car Tax (LCT)</b> was never payable for this car
                </span>
              </label>
            </div>
          ) : null}

          <MoneyField
            label="Vehicle Dutiable Value (aka FBT Base Value)"
            tooltip={
              <InfoTooltip text="Listed on car invoice prior to stamp duty, rego, CTP insurance etc. Tesla calls it Vehicle Subtotal." />
            }
            value={inputs.vehicleBaseValue}
            step={100}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, vehicleBaseValue: v }))}
          />

          <MoneyField
            label="Driveaway Cost (after on road)"
            tooltip={
              <InfoTooltip text="Total price that you would have paid to drive away if you paid cash. Careful to NOT include any EV rebate for this number." />
            }
            value={inputs.driveawayCost}
            step={100}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, driveawayCost: v }))}
          />

          <MoneyField
            label={`Estimated Market Value after ${inputs.leaseDurationYears} Years`}
            tooltip={
                <InfoTooltip text="Suggest ~40% of driveaway cost (and is automatically filled with this estimate), adjust as you see fit." />
            }
            value={inputs.estimatedMarketValueAtEnd}
            step={100}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, estimatedMarketValueAtEnd: v }))}
          />

          <NumberField
            label="Annual Mileage (km)"
            tooltip={
                <InfoTooltip text="In km - most people's mileage is around 10,000 - 20,000km. Used to estimate charging." />
            }
            value={inputs.annualMileageKm}
            step={500}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, annualMileageKm: v }))}
          />

            
        </Section>

        <Section title="FINANCIALS">
          <MoneyField
            label="Total Taxable Income"
            tooltip={
                <InfoTooltip text="The sum of ALL incomes MINUS deductions; not just the portion of income of the workplace via which you are arranging this NL." />
              
            }
            value={inputs.totalTaxableIncome}
            step={1000}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, totalTaxableIncome: v }))}
          />

          <NumberField
            label="Home Loan Offset Interest Rate (%)"
            tooltip={
              <InfoTooltip
                text={
                  <>
                    <p style={{ margin: "0 0 10px 0" }}>
                      If your outright cash source is not &quot;cash from PPOR offset&quot;, write the post-tax income of your cash source.
                    </p>
                    <p style={{ margin: "0 0 10px 0" }}>
                      eg cash is in HISA with 5%, and tax bracket 37+2%, then 5*(1-0.39)=3.05% here.
                    </p>
                    <p style={{ margin: 0 }}>
                      If cash is sitting in non-income producing account (why?), set as 0.
                    </p>
                  </>
                }
              />
            }
            value={inputs.homeLoanOffsetInterestRate}
            step={0.01}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, homeLoanOffsetInterestRate: v }))}
          />

          <SelectYesNo
            label="Super Guarantee Calculated From Pre-NL Income"
            tooltip={
                <InfoTooltip text="Usually YES, but in ~10% cases the employer will calculate SG on post-NL amount. Check with your payroll - significant impact on saving!" />
            }
            value={inputs.superFromPreNlIncome}
            onChange={(v) => setInputs((p) => ({ ...p, superFromPreNlIncome: v }))}
          />
        </Section>

        <Section title="VEHICLE LEASE DETAILS">
          <MoneyField
            label="Lease Documentation Fee"
            tooltip={
              <InfoTooltip text="The initial financier start up fee. Will be listed on your NL estimate if applicable, otherwise leave as 0." />
            }
            value={inputs.leaseDocFee}
            step={10}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, leaseDocFee: v }))}
          />

          <DateField
            label="Lease Starting Date"
            tooltip={
              <InfoTooltip text='Automatically populated with "30 days from today", manually modify to suit.' />
            }
            value={inputs.leaseStartDate}
            onChange={(v) => setInputs((p) => ({ ...p, leaseStartDate: v }))}
          />

          <LeaseDurationSelect
            label="Lease Duration (Years)"
            tooltip={<InfoTooltip text="Integer, choose 1 to 5 years." />}
            value={inputs.leaseDurationYears}
            onChange={(v) => {
  setInputs((p) => ({ ...p, leaseDurationYears: v }));
  setNeedsLeaseRequote(true);
}}
          />

{needsLeaseRequote ? (
  <div
    style={{
      marginTop: 6,
      padding: "10px 10px",
      borderRadius: 10,
      border: "1px solid rgba(200,0,0,0.28)",
      background: "rgba(200,0,0,0.06)",
      fontSize: 12,
      lineHeight: 1.35,
    }}
  >
    <div style={{ fontWeight: 800, marginBottom: 4 }}>
      Heads up: changing lease duration usually changes your per-fortnight lease quote.
    </div>
    <div style={{ opacity: 0.92 }}>
      Please update <b>Vehicle Lease (Per Fortnight)</b> (and <b>all other quote-dependent fields</b>) to match the new duration,
      otherwise the outputs may be misleading.
    </div>
    <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={() => setNeedsLeaseRequote(false)}
        style={{
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.18)",
          background: "#fff",
          padding: "6px 10px",
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        I’ve updated the quote
      </button>
    </div>
  </div>
) : null}

          <FieldRow
  label="Vehicle Lease (Per Fortnight)"
  tooltip={<InfoTooltip text="Pre-tax, ex GST figure, include ONLY the vehicle lease portion, not the total packaged amount that includes running cost." />}
  >
    
  <MoneyInputWrapper>
    <input
      type="text"
      inputMode="decimal"
      style={moneyInputStyle({ highlight: needsLeaseRequote })}
      value={vehicleLeasePerFnText}
      onChange={(e) => setVehicleLeasePerFnText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
      }}
      onBlur={() => {
        const raw = vehicleLeasePerFnText.trim();
        const parsed = parseMoneyInput(raw);
        if (!Number.isFinite(parsed)) {
          setVehicleLeasePerFnText(String(inputs.vehicleLeasePerFn));
          return;
        }
        props.onVehicleLeasePerFnChange(parsed);
        setVehicleLeasePerFnText(fmtMoneyInput(parsed));
        setNeedsLeaseRequote(false);
      }}
    />
  </MoneyInputWrapper>
</FieldRow>

          <div
            style={{
              fontSize: 12,
              opacity: 0.95,
              padding: "8px 10px",
              borderRadius: 10,
              border: props.guardMessage
                ? "1px solid rgba(200,0,0,0.25)"
                : "1px solid rgba(0,0,0,0.12)",
              background: props.guardMessage ? "rgba(200,0,0,0.05)" : "rgba(11, 92, 171, 0.06)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Equivalent to {props.formatPct(props.guardLiveRatePct)} effective interest rate (Definition 1)
            </div>
            {props.guardMessage ? (
              <div style={{ marginTop: 6, fontWeight: 700, opacity: 0.95 }}>{props.guardMessage}</div>
            ) : null}
          </div>

          <MoneyField
            label="Luxury Vehicle Adjustment (Per Fortnight)"
            tooltip={
                <InfoTooltip text="Pre-tax. For vehicle valued > $68,108, some leases incur this ON TOP OF regular lease figure. It is normally listed as a separate item. 0 if irrelevant." />
            }
            value={inputs.luxuryVehicleAdjPerFn}
            step={1}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, luxuryVehicleAdjPerFn: v }))}
          />


          <details style={{ marginTop: 6 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700, opacity: 0.85 }}>
              Advanced info for interest calculation
            </summary>

            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <MoneyField
                label="Financed amount reported in your quote"
                tooltip={<InfoTooltip text="This is only used for interest calculation. If you don't know this figure, leave it as this pre-calculated figure. If you have a financed amount figure, make sure it does not contain first year insurance, otherwise the calculation will in interest-rate section will be invalid." />}
                value={inputs.financedAmountForInterestCalcExGst}
                step={100}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, financedAmountForInterestCalcExGst: v }))}
              />
              

              <NumberField
                label="Months Deferred"
                tooltip={<InfoTooltip text="Typically 2 months, but occasionally 1 month with some financiers." />}
                value={inputs.monthsDeferred}
                step={1}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, monthsDeferred: Math.max(0, Math.round(v)) }))}
              />
            </div>
          </details>
        </Section>

        <Section title="ANNUAL PACKAGED RUNNING COST (ex GST)">
          <SelectYesNo
            label="GST Saving Passed On in NL"
            tooltip={<InfoTooltip text="Usually YES, however some employers (Victorian Hospitals in particular!) do NOT pass on GST saving. Important: Check. Read more in GST tab." />}
            value={inputs.gstSavingPassedOn}
            onChange={(v) => setInputs((p) => ({ ...p, gstSavingPassedOn: v }))}
          />

          <MoneyField
            label="Service / Maintenance / Tyres"
            tooltip={<InfoTooltip text="Annual figure, combined as individual breakdowns do not matter." />}
            value={inputs.serviceMaintTyresAnnual}
            step={10}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, serviceMaintTyresAnnual: v }))}
          />

          <MoneyField
            label="NSW Health Save Share"
            tooltip={
              <>
                <InfoTooltip text="Annual figure, specific for NSW Health employees, leave as 0 for everyone else." />
              </>
            }
            value={inputs.saveShareAnnual}
            step={10}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, saveShareAnnual: v }))}
          />

          <MoneyField
            label="Registration"
            tooltip=    {
              <>
                <InfoTooltip text="Annual figure, different by state, NL companies generally provide state-specific estimate." />
              </>
            }
            value={inputs.registrationAnnual}
            step={10}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, registrationAnnual: v }))}
          />

          <MoneyField
            label="Electricity (annual)"
            tooltip={
              <>
                <InfoTooltip text="Annual figure, automatically populated with 0.042/km calculation (ATO rule); manually change if you choose other claim methods." />
              </>
            }
            value={inputs.electricityAnnual}
            step={10}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, electricityAnnual: v }))}
          />

          <MoneyField
            label="Insurance"
            tooltip={
              <>
                <InfoTooltip text="Annual figure, comprehensive insurance required. Do shop around for your own quotes for insurance and compare with NL company's quote." />
              </>
            }
            value={inputs.insuranceAnnual}
            step={10}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, insuranceAnnual: v }))}
          />

          <MoneyField
            label="Management / Membership Fees"
            tooltip={
              <>
                <InfoTooltip text="Annual figure, sum of all novated lease membership / management fees." />
              </>
            }
            value={inputs.managementFeesAnnual}
            step={10}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, managementFeesAnnual: v }))}
          />
        </Section>

        <Section title="ELECTRICITY">
          <MoneyField
            label="Average AUD per kWh"
            tooltip={
              <>
                <InfoTooltip text="Can range from 0 (unreimbursable solar excess), ~0.08 for off peak, ~0.30 for regular tariff, ~0.40-0.60 for public chargers. Leave unchanged if unsure." />
              </>
            }
            value={inputs.avgAudPerKwh}
            step={0.01}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, avgAudPerKwh: v }))}
          />

          <NumberField
            label="Average Wh per km"
            tooltip={
              <>
                <InfoTooltip text="The electric car efficiency. Can range from 120 to 200 Wh/km. Leave unchanged if unsure." />
              </>
            }
            value={inputs.avgWhPerKm}
            step={1}
            min={0}
            onChange={(v) => setInputs((p) => ({ ...p, avgWhPerKm: v }))}
          />

          <MoneyField
            label="Override Annual Charging Expense (set 0 to clear)"
            tooltip={
              <>
                <InfoTooltip text="If you have a better estimate of annual charging expense, override average estimation here (e.g. you charge outside often). Otherwise leave as blank." />
              </>
            }
            value={inputs.overrideAnnualChargingExpense ?? 0}
            step={10}
            min={0}
            onChange={(v) =>
              setInputs((p) => ({
                ...p,
                overrideAnnualChargingExpense: v === 0 ? undefined : v,
              }))
            }
          />
        </Section>

        <Section title="OPTIONAL: COMPARE WITH TRADITIONAL CAR LOAN">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={inputs.compareWithCarLoan}
              onChange={(e) => setInputs((p) => ({ ...p, compareWithCarLoan: e.target.checked }))}
            />
            Enable comparison{" "}
            <InfoTooltip text="Skip section and leave unchanged if not comparing financial position with taking up a traditional car loan." />
          </label>

          {inputs.compareWithCarLoan && (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <MoneyField
                label="Initial Deposit Amount"
                value={inputs.carLoanInitialDeposit}
                step={100}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, carLoanInitialDeposit: v }))}
              />

              <ReadOnlyValue
                label="Loan Term (Years)"
                tooltip={
                  <>
                    <InfoTooltip text='This is forced to be equal to "Lease Duration" above to simplify accounting. Therefore change the original value above to change this.' />
                  </>
                }
                value={`${inputs.leaseDurationYears} (forced to match Lease Duration)`}
              />

              <NumberField
                label="Interest Rate (%)"
                tooltip={
                  <>
                    <InfoTooltip text='Use the actual interest rate rather than the "comparison rate", as the comparison rate is reflected as effect of fees, amount and duration.' />
                  </>
                }
                value={inputs.carLoanInterestRatePct}
                step={0.01}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, carLoanInterestRatePct: v }))}
              />

              <MoneyField
                label="Monthly Fee"
                tooltip={
                  <>
                 <InfoTooltip text="Most loans split up the fees over the duration of loan, and are expressed as monthly fees." />
                  </>
                }
                value={inputs.carLoanMonthlyFee}
                step={1}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, carLoanMonthlyFee: v }))}
              />
            </div>
          )}
        </Section>

        <Section title="OPTIONAL: COMPARE WITH CONTINUING WITH CURRENT CAR">
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={inputs.compareWithCurrentCar}
              onChange={(e) => setInputs((p) => ({ ...p, compareWithCurrentCar: e.target.checked }))}
            />
            Enable comparison{" "}
            <InfoTooltip text='Skip section and leave unchanged if not comparing financial position with "keeping current car".' />
          </label>

          {inputs.compareWithCurrentCar && (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <MoneyField
                label="Current Market Value Now"
                tooltip={
                  <>
                    <InfoTooltip text="Tips: look up carsales.com.au or equivalent website." />
                  </>
                }
                value={inputs.currentCarMarketValueNow}
                step={100}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, currentCarMarketValueNow: v }))}
              />

              <MoneyField
                label={`Estimated Market Value after ${inputs.leaseDurationYears} Years`}
                tooltip={
                  <>
                    <InfoTooltip text="e.g. simulate using carsales.com.au by comparing 4yo car and 9yo car, for example." />
                  </>
                }
                value={inputs.currentCarMarketValueAtEnd}
                step={100}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, currentCarMarketValueAtEnd: v }))}
              />

              <div style={{ fontWeight: 700, opacity: 0.85, marginTop: 6 }}>ANNUAL (incl. GST)</div>

              <MoneyField
                label="Service / Maintenance / Tyres"
                value={inputs.currentServiceMaintTyresAnnual}
                step={10}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, currentServiceMaintTyresAnnual: v }))}
              />

              <MoneyField
                label="Registration"
                value={inputs.currentRegistrationAnnual}
                step={10}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, currentRegistrationAnnual: v }))}
              />

              <MoneyField
                label="Fuel"
                tooltip={
                  <>
                    <InfoTooltip text="Most vehicles are around 10-20c per km, but use your own records!" />
                  </>
                }
                value={inputs.currentFuelAnnual}
                step={10}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, currentFuelAnnual: v }))}
              />

              <MoneyField
                label="Insurance"
                value={inputs.currentInsuranceAnnual}
                step={10}
                min={0}
                onChange={(v) => setInputs((p) => ({ ...p, currentInsuranceAnnual: v }))}
              />
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ---------- UI helpers (local to inputs panel) ---------- */

function Section(props: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  banner?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: props.highlight ? "2px solid rgba(200,0,0,0.45)" : "1px solid rgba(0,0,0,0.12)",
        borderRadius: 12,
        padding: 12,
        background: props.highlight ? "rgba(200,0,0,0.04)" : undefined,
        boxShadow: props.highlight ? "0 0 0 4px rgba(200,0,0,0.08)" : "none",
        transition: "box-shadow 220ms ease, border-color 220ms ease, background 220ms ease",
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 10 }}>{props.title}</div>
      {props.banner ? <div style={{ marginBottom: 10 }}>{props.banner}</div> : null}
      <div style={{ display: "grid", gap: 10 }}>{props.children}</div>
    </div>
  );
}

function FieldRow(props: { label: React.ReactNode; tooltip?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: 10, alignItems: "center" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          alignItems: "center",
          columnGap: 8,
          fontSize: 14,
          opacity: 0.9,
        }}
      >
        <div>{props.label}</div>
        <div style={{ display: "inline-flex", justifyContent: "flex-end" }}>
          {props.tooltip ?? null}
        </div>
      </div>

      <div>{props.children}</div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.18)",
    fontSize: 14,
  };
}

function moneyInputStyle(opts?: { highlight?: boolean }): React.CSSProperties {
  return {
    ...inputStyle(),
    paddingLeft: 28, // makes room for the $ inside the input
    border: opts?.highlight ? "2px solid rgba(200,0,0,0.45)" : "1px solid rgba(0,0,0,0.18)",
    boxShadow: opts?.highlight ? "0 0 0 4px rgba(200,0,0,0.10)" : "none",
    background: opts?.highlight ? "rgba(255, 235, 235, 0.55)" : "#fff",
    transition: "box-shadow 220ms ease, border-color 220ms ease, background 220ms ease",
  };
}

function MoneyInputWrapper(props: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0.75,
          fontWeight: 700,
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        $
      </div>
      {props.children}
    </div>
  );
}

function MoneyField(props: {
  label: React.ReactNode;
  tooltip?: React.ReactNode;
  value: number;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState<string>(fmtMoneyInput(props.value));

  useEffect(() => {
    setText(fmtMoneyInput(props.value));
  }, [props.value]);

  return (
    <FieldRow
      label={props.label} tooltip={props.tooltip}
    >
      <MoneyInputWrapper>
        <input
          type="text"
          inputMode="decimal"
          style={moneyInputStyle()}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          }}
          onBlur={() => {
            const n = parseMoneyInput(text);
            const clamped = Math.max(props.min ?? 0, n);
            props.onChange(clamped);
            setText(fmtMoneyInput(clamped));
          }}
        />
      </MoneyInputWrapper>
    </FieldRow>
  );
}

function NumberField(props: {
  label: React.ReactNode;
  tooltip?: React.ReactNode;
  value: number;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <FieldRow label={props.label} tooltip={props.tooltip}>
      <input
        type="number"
        style={inputStyle()}
        value={Number.isFinite(props.value) ? props.value : 0}
        step={props.step ?? 1}
        min={props.min ?? 0}
        onChange={(e) => props.onChange(safeNum(e.target.value))}
      />
    </FieldRow>
  );
}

function DateField(props: { label: React.ReactNode;   tooltip?: React.ReactNode;  value: string; onChange: (v: string) => void }) {
  return (
    <FieldRow label={props.label} tooltip={props.tooltip}>
      <input type="date" style={inputStyle()} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </FieldRow>
  );
}

function ReadOnlyValue(props: { label: React.ReactNode;   tooltip?: React.ReactNode;
value: string }) {
  return (
    <FieldRow label={props.label} tooltip={props.tooltip}>
      <div style={{ ...inputStyle(), background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.10)" }}>
        {props.value}
      </div>
    </FieldRow>
  );
}

function LeaseDurationSelect(props: {
  label: React.ReactNode;
    tooltip?: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <FieldRow label={props.label} tooltip={props.tooltip}>
      <select
        style={inputStyle()}
        value={String(props.value)}
        onChange={(e) => props.onChange(safeNum(e.target.value))}
      >
        {[1, 2, 3, 4, 5].map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </FieldRow>
  );
}

function SelectYesNo(props: { label: React.ReactNode;   tooltip?: React.ReactNode;
value: "Yes" | "No"; onChange: (v: "Yes" | "No") => void }) {
  return (
    <FieldRow label={props.label} tooltip={props.tooltip}>
      <select style={inputStyle()} value={props.value} onChange={(e) => props.onChange(e.target.value as "Yes" | "No")}>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </FieldRow>
  );
}

function SelectNewUsed(props: {
  label: React.ReactNode;
    tooltip?: React.ReactNode;
  value: "New" | "Used – dealer sale (GST inc)" | "Used – private sale (no GST)";
  onChange: (v: "New" | "Used – dealer sale (GST inc)" | "Used – private sale (no GST)") => void;
}) {
  return (
    <FieldRow label={props.label} tooltip={props.tooltip}>
      <select
        style={inputStyle()}
        value={props.value}
        onChange={(e) =>
          props.onChange(e.target.value as "New" | "Used – dealer sale (GST inc)" | "Used – private sale (no GST)")
        }
      >
        <option value="New">New</option>
        <option value="Used – dealer sale (GST inc)">Used – dealer sale (GST inc)</option>
        <option value="Used – private sale (no GST)">Used – private sale (no GST)</option>
      </select>
    </FieldRow>
  );
}

function fmtMoneyInput(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const isInt = Math.abs(n - Math.round(n)) < 1e-9;
  return n.toLocaleString("en-AU", {
    minimumFractionDigits: isInt ? 0 : 2,
    maximumFractionDigits: isInt ? 0 : 2,
  });
}

function parseMoneyInput(s: string): number {
  const cleaned = String(s).trim().replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function safeNum(v: string | number): number {
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}
