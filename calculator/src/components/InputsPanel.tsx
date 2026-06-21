import React, { useEffect, useRef, useState } from "react";
import type { Inputs } from "../engine/types";
import { getLeaseFbtCategory, getEvLctThresholdForLeaseStart, EV_TRANSITIONAL_FULL_EXEMPT_CAP } from "../engine/types";
import { InfoTooltip } from "./ui/InfoTooltip";
import { financedAmountExGstFromInputs } from "../engine/effectiveinterest";

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
  onUserInput?: (field: string) => void;
  vehicleLeasePeriodMode: "perFn" | "perMonth";
  setVehicleLeasePeriodMode: (m: "perFn" | "perMonth") => void;
};

export default function InputsPanel(props: InputsPanelProps) {
  const { inputs, setInputs } = props;
  const touch = (field: string) => props.onUserInput?.(field);
  // Auto-fill for packaged Electricity (ATO shortcut method: 5.47c/km) until user manually overrides
  const ATO_EV_HOME_CHARGING_RATE_PER_KM = 0.0547;
  const [electricityAnnualTouched, setElectricityAnnualTouched] = useState<boolean>(false);
  const lastAutoElectricityAnnualRef = useRef<number | null>(null);
  const [needsLeaseRequote, setNeedsLeaseRequote] = useState(false);
  const prevLeaseDurationRef = useRef<number>(inputs.leaseDurationYears);
  const [leaseAdjModalOpen, setLeaseAdjModalOpen] = useState(false);


  // When lease duration changes, users MUST update their per-fortnight lease quote.
  useEffect(() => {
    if (prevLeaseDurationRef.current !== inputs.leaseDurationYears) {
      prevLeaseDurationRef.current = inputs.leaseDurationYears;
      setNeedsLeaseRequote(true);
    }
  }, [inputs.leaseDurationYears]);

  // Auto-populate EV packaged Electricity annual field from annual mileage, unless manually overridden
  useEffect(() => {
    if (inputs.vehicleType !== "EV") {
      // Reset touch state when switching away from EV
      setElectricityAnnualTouched(false);
      lastAutoElectricityAnnualRef.current = null;
      return;
    }

    const auto = inputs.annualMileageKm * ATO_EV_HOME_CHARGING_RATE_PER_KM;
    const current = inputs.electricityAnnual;
    const lastAuto = lastAutoElectricityAnnualRef.current;

    // IMPORTANT: When arriving via a share-link, `electricityAnnualTouched` will start as false.
    // If the shared payload contains a user-overridden Electricity value, do NOT clobber it
    // with the auto-filled ATO shortcut on the first render.
    if (lastAuto === null) {
      // First run after mount (or after switching back to EV)
      lastAutoElectricityAnnualRef.current = auto;

      // If the current value differs from the ATO auto value, assume it is an intentional override
      // (e.g. loaded from a shared URL / saved quote) and mark as touched.
      if (Math.abs(current - auto) >= 0.01) {
        setElectricityAnnualTouched(true);
        return;
      }

      // Otherwise keep it in sync with auto.
      if (Math.abs(current - auto) >= 0.01) {
        setInputs((p) => ({ ...p, electricityAnnual: auto }));
      }
      return;
    }

    const currentMatchesLastAuto =
      lastAuto !== null && Math.abs(current - lastAuto) < 0.01;

    if (!electricityAnnualTouched || currentMatchesLastAuto) {
      if (Math.abs(current - auto) >= 0.01) {
        lastAutoElectricityAnnualRef.current = auto;
        setInputs((p) => ({ ...p, electricityAnnual: auto }));
      } else {
        lastAutoElectricityAnnualRef.current = auto;
      }
    }
  }, [inputs.vehicleType, inputs.annualMileageKm]);

  const { vehicleLeasePeriodMode, setVehicleLeasePeriodMode } = props;
  const [vehicleLeasePerFnText, setVehicleLeasePerFnText] = useState<string>(
    fmtMoneyInput(inputs.vehicleLeasePerFn)
  );

  const GST_RATE = 0.1;
  const [residualGstMode, setResidualGstMode] = useState<"exGst" | "incGst">("exGst");
  const [residualText, setResidualText] = useState<string>(
    fmtMoneyInput(inputs.residualValueExGst)
  );

  useEffect(() => {
    const displayed =
      residualGstMode === "incGst"
        ? inputs.residualValueExGst * (1 + GST_RATE)
        : inputs.residualValueExGst;
    setResidualText(fmtMoneyInput(displayed));
  }, [inputs.residualValueExGst, residualGstMode]);

  const [hoveredRateArrow, setHoveredRateArrow] = useState<"up" | "down" | null>(null);

  // Press-and-hold repeat for rate nudge arrows
  const rateNudgeTimeoutRef = useRef<number | null>(null);
  const rateNudgeIntervalRef = useRef<number | null>(null);

  const clearRateNudgeTimers = () => {
    if (rateNudgeTimeoutRef.current !== null) {
      window.clearTimeout(rateNudgeTimeoutRef.current);
      rateNudgeTimeoutRef.current = null;
    }
    if (rateNudgeIntervalRef.current !== null) {
      window.clearInterval(rateNudgeIntervalRef.current);
      rateNudgeIntervalRef.current = null;
    }
  };

  const dispatchRateNudge = (direction: 1 | -1) => {
    window.dispatchEvent(
      new CustomEvent("nlguide:nudgeEffectiveRate", {
        detail: { direction },
      })
    );
  };

  const startRateNudgeRepeat = (direction: 1 | -1) => {
    // fire once immediately
    dispatchRateNudge(direction);

    // then after a short delay, repeat rapidly while held
    clearRateNudgeTimers();
    rateNudgeTimeoutRef.current = window.setTimeout(() => {
      rateNudgeIntervalRef.current = window.setInterval(() => {
        dispatchRateNudge(direction);
      }, 110);
    }, 320);
  };

  const stopRateNudgeRepeat = () => {
    clearRateNudgeTimers();
    setHoveredRateArrow(null);
  };

  useEffect(() => {
    // cleanup on unmount
    return () => clearRateNudgeTimers();
  }, []);

  useEffect(() => {
    // Keep text synced to committed value (e.g. guard accept/reject, share-link load, etc.)
    const displayed = vehicleLeasePeriodMode === "perMonth"
      ? inputs.vehicleLeasePerFn * 26 / 12
      : inputs.vehicleLeasePerFn;
    setVehicleLeasePerFnText(fmtMoneyInput(displayed));
  }, [inputs.vehicleLeasePerFn, vehicleLeasePeriodMode]);

  // FBT category: derives the full tier (exempt / discounted / applicable) from vehicle + lease start date.
  const leaseFbtCategory = getLeaseFbtCategory(inputs);
  const effectiveLctThreshold = getEvLctThresholdForLeaseStart(inputs.leaseStartDate);

  const isEv = inputs.vehicleType === "EV";
  const needsUsedEligibilityChecks = inputs.vehicleCondition !== "New";
  const usedEligibilityChecksOk =
    !needsUsedEligibilityChecks ||
    (inputs.usedCarFirstHeldAfterJul2022 && inputs.usedCarLctNeverPayable);

  const evEligibilityCriteriaSatisfied = leaseFbtCategory === "EV_FBT_EXEMPT";

  const leaseFbtTypeLabel =
    leaseFbtCategory === "EV_FBT_EXEMPT"
      ? "FBT-Exempt"
      : leaseFbtCategory === "EV_FBT_DISCOUNTED"
      ? "75% FBT Applicable"
      : "FBT-Applicable";

  // Lease start date milestone checks (for phase-out banner)
  const leaseStartMs = new Date(inputs.leaseStartDate + "T00:00:00Z").getTime();
  const isTransitionalLease =
    leaseStartMs >= Date.UTC(2027, 3, 1) && leaseStartMs < Date.UTC(2029, 3, 1);
  const isPostPhaseoutLease = leaseStartMs >= Date.UTC(2029, 3, 1);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        width: "100%",
        maxWidth: 560,
        fontSize: 14,
        lineHeight: 1.35,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: 8,
          columnGap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.1, paddingTop: 4, letterSpacing: "-0.02em" }}>Inputs</div>
        <button
          type="button"
          onClick={() => {
            touch("reset");
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
            flexShrink: 0,
            alignSelf: "flex-start",
          }}
        >
          🔄 Reset
        </button>
      </div>


      <div style={{ display: "grid", gap: 12 }}>
        <Section title="FBT-EXEMPTION ELIGIBILITY" className="nl-input-subcard" accent="#0b5cab">
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
                  onClick={() => {
                    touch("vehicleType");
                    setInputs((p) => ({ ...p, vehicleType: "EV" }));
                  }}
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
                  onClick={() => {
                    touch("vehicleType");
                    setInputs((p) => ({ ...p, vehicleType: "Non-EV" }));
                  }}
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
          {/* Eligibility cue (only show when EV but not fully exempt) */}
          {isEv && !evEligibilityCriteriaSatisfied ? (
            <ReadOnlyValue
              label="Eligible for FBT Exemption"
              tooltip={<InfoTooltip text="Automatically determined from the next section" />}
              value={leaseFbtCategory === "EV_FBT_DISCOUNTED" ? "Partial (75% of FBT applies)" : "No"}
            />
          ) : null}
          <FieldRow label="Novated Lease Type">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 800,
                background:
                  leaseFbtCategory === "EV_FBT_EXEMPT"
                    ? "rgba(46, 125, 50, 0.12)"
                    : leaseFbtCategory === "EV_FBT_DISCOUNTED"
                    ? "rgba(255, 193, 7, 0.18)"
                    : "rgba(255, 143, 0, 0.18)",
                color:
                  leaseFbtCategory === "EV_FBT_EXEMPT"
                    ? "rgb(27, 94, 32)"
                    : leaseFbtCategory === "EV_FBT_DISCOUNTED"
                    ? "rgb(130, 90, 0)"
                    : "rgb(230, 81, 0)",
                border:
                  leaseFbtCategory === "EV_FBT_EXEMPT"
                    ? "1px solid rgba(46, 125, 50, 0.35)"
                    : leaseFbtCategory === "EV_FBT_DISCOUNTED"
                    ? "1px solid rgba(255, 193, 7, 0.55)"
                    : "1px solid rgba(255, 143, 0, 0.45)",
              }}
            >
              {leaseFbtTypeLabel}
            </div>
          </FieldRow>

          {/* May 2026 phase-out info note — shown when lease start date is in the new regime */}
          {isEv && (isTransitionalLease || isPostPhaseoutLease) && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgba(11, 92, 171, 0.28)",
                background: "rgba(11, 92, 171, 0.05)",
                fontSize: 12,
                lineHeight: 1.4,
                marginTop: 4,
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 3 }}>
                May 2026 FBT phase-out rules apply to this lease start date
              </div>
              <div style={{ opacity: 0.9 }}>
                {isTransitionalLease ? (
                  <>
                    Leases starting <b>1 Apr 2027 – 31 Mar 2029</b>: full FBT exemption only for cars ≤ $
                    {EV_TRANSITIONAL_FULL_EXEMPT_CAP.toLocaleString("en-AU")}; cars $
                    {(EV_TRANSITIONAL_FULL_EXEMPT_CAP + 1).toLocaleString("en-AU")}–$
                    {effectiveLctThreshold.toLocaleString("en-AU")} have 75% of FBT apply; above the LCT threshold is fully applicable.
                  </>
                ) : (
                  <>
                    Leases starting <b>from 1 Apr 2029</b>: full FBT exemption is no longer available.
                    Cars at or below the LCT threshold (${effectiveLctThreshold.toLocaleString("en-AU")}) receive
                    75% of FBT applies; above the LCT threshold is fully applicable.
                  </>
                )}
              </div>
            </div>
          )}
        </Section>

        <Section
          title="VEHICLE DETAILS"
          className="nl-input-subcard"
          highlight={isEv && leaseFbtCategory === "EV_FBT_APPLICABLE"}
          banner={
            isEv && leaseFbtCategory === "EV_FBT_APPLICABLE" ? (
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
                  {!usedEligibilityChecksOk ? (
                    <>
                      For used vehicles, you must confirm the vehicle was first held and used after <b>1 July 2022</b>,
                      and that <b>Luxury Car Tax (LCT)</b> was never payable. Please tick both checkboxes below, otherwise
                      this will be treated as an <b>FBT-applicable</b> lease.
                    </>
                  ) : (
                    <>
                      Your vehicle dutiable value appears to exceed the EV Luxury Car Tax threshold ($
                      {effectiveLctThreshold.toLocaleString("en-AU")}). This will be treated as an <b>FBT-applicable</b> lease.
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
            onChange={(v) => {
              touch("vehicleCondition");
              setInputs((p) => ({
                ...p,
                vehicleCondition: v,
                usedCarFirstHeldAfterJul2022: v === "New" ? false : p.usedCarFirstHeldAfterJul2022,
                usedCarLctNeverPayable: v === "New" ? false : p.usedCarLctNeverPayable,
              }));
            }}
          />

          {inputs.vehicleType === "EV" && inputs.vehicleCondition !== "New" ? (
            <div style={{ display: "grid", gap: 8, marginTop: 2 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, opacity: 0.92 }}>
                <input
                  type="checkbox"
                  checked={inputs.usedCarFirstHeldAfterJul2022}
                  onChange={(e) => {
                    touch("usedCarFirstHeldAfterJul2022");
                    setInputs((p) => ({ ...p, usedCarFirstHeldAfterJul2022: e.target.checked }));
                  }}
                  style={{ marginTop: 2 }}
                />
                <span>The car was first held and used after <b>1 July 2022</b></span>
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 14, opacity: 0.92 }}>
                <input
                  type="checkbox"
                  checked={inputs.usedCarLctNeverPayable}
                  onChange={(e) => {
                    touch("usedCarLctNeverPayable");
                    setInputs((p) => ({ ...p, usedCarLctNeverPayable: e.target.checked }));
                  }}
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
            onChange={(v) => {
              touch("vehicleBaseValue");
              setInputs((p) => ({ ...p, vehicleBaseValue: v }));
            }}
          />

          <MoneyField
            label="Driveaway Cost (after on road)"
            tooltip={
              <InfoTooltip text="Total price that you would have paid to drive away if you paid cash. Careful to NOT include any EV rebate for this number." />
            }
            value={inputs.driveawayCost}
            step={100}
            min={0}
            onChange={(v) => {
              touch("driveawayCost");
              setInputs((p) => ({ ...p, driveawayCost: v }));
            }}
          />

          <MoneyField
            label={`Estimated Market Value after 5 Years`}
            tooltip={
              <InfoTooltip
                text={
                  <>
                    <p style={{ margin: "0 0 10px 0" }}>
                      <b>Rule of thumb:</b> suggest ~40% of the driveaway cost (auto-filled). Adjust as you see fit.
                    </p>
                    <p style={{ margin: "0 0 10px 0" }}>
                      <b>If your lease is shorter than 5 years</b>, please still enter the 5-year estimated value; the calculator will estimate the value for the interim time using an
                      exponential decay model (a constant percentage drop each year until it reaches the 5-year value.
                    </p>
                    <p style={{ margin: 0 }}>
                      This is intended to better match typical market depreciation than a straight-line model.
                    </p>
                  </>
                }
              />
            }
            value={inputs.estimatedMarketValueAtEnd}
            step={100}
            min={0}
            onChange={(v) => {
              touch("estimatedMarketValueAtEnd");
              setInputs((p) => ({ ...p, estimatedMarketValueAtEnd: v }));
            }}
          />

          <NumberField
            label="Annual Mileage (km)"
            tooltip={
                <InfoTooltip text="In km - most people's mileage is around 10,000 - 20,000km. Used to estimate charging." />
            }
            value={inputs.annualMileageKm}
            step={500}
            min={0}
            onChange={(v) => {
              touch("annualMileageKm");
              setInputs((p) => ({ ...p, annualMileageKm: v }));
            }}
          />

            
        </Section>

        <Section title="FINANCIALS" className="nl-input-subcard" accent="#1b5e20">
          <MoneyField
            label="Total Taxable Income"
            tooltip={
                <InfoTooltip text="The sum of ALL incomes MINUS deductions; not just the portion of income of the workplace via which you are arranging this NL." />
            }
            value={inputs.totalTaxableIncome}
            step={1000}
            min={0}
            onChange={(v) => {
              touch("totalTaxableIncome");
              setInputs((p) => ({ ...p, totalTaxableIncome: v }));
            }}
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
            onChange={(v) => {
              touch("homeLoanOffsetInterestRate");
              setInputs((p) => ({ ...p, homeLoanOffsetInterestRate: v }));
            }}
          />

          <SelectYesNo
            label="Super Guarantee Calculated From Pre-NL Income"
            tooltip={
                <InfoTooltip text="Usually YES, but in ~10% cases the employer will calculate SG on post-NL amount. Check with your payroll - significant impact on saving!" />
            }
            value={inputs.superFromPreNlIncome}
            onChange={(v) => {
              touch("superFromPreNlIncome");
              setInputs((p) => ({ ...p, superFromPreNlIncome: v }));
            }}
          />
        </Section>

        <Section title="VEHICLE LEASE DETAILS" className="nl-input-subcard" accent="#4527a0">
          <MoneyField
            label="Lease Documentation Fee"
            tooltip={
              <InfoTooltip text="The initial financier start up fee. Will be listed on your NL estimate if applicable, otherwise leave as 0." />
            }
            value={inputs.leaseDocFee}
            step={10}
            min={0}
            onChange={(v) => {
              touch("leaseDocFee");
              setInputs((p) => ({ ...p, leaseDocFee: v }));
            }}
          />

          <DateField
            label="Lease Starting Date"
            tooltip={
              <InfoTooltip text='Automatically populated with "30 days from today", manually modify to suit.' />
            }
            value={inputs.leaseStartDate}
            onChange={(v) => {
              touch("leaseStartDate");
              setInputs((p) => ({ ...p, leaseStartDate: v }));
            }}
          />

          {/* Date-triggered FBT phase-out warning — only shown for EV when lease date puts it in the new regime */}
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
              }}
            >
              75% FBT Applicable — May 2026 phase-out rules apply to this lease start date
            </div>
          )}

          <LeaseDurationSelect
            label="Lease Duration (Years)"
            tooltip={<InfoTooltip text="Integer, choose 1 to 5 years." />}
            value={inputs.leaseDurationYears}
            onChange={(v) => {
              touch("leaseDurationYears");
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
            label={
              <div>
                <div>Residual Value</div>
                <div style={{ display: "flex", gap: 6, marginTop: 3, fontSize: 11 }}>
                  {(["exGst", "incGst"] as const).map((mode, idx) => (
                    <React.Fragment key={mode}>
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
                    </React.Fragment>
                  ))}
                </div>
              </div>
            }
            tooltip={
              <InfoTooltip text={
                <>
                  <p style={{ margin: "0 0 8px 0" }}>Default calculated value based on lease duration and ATO rule, however can be manually modified.</p>
                  <p style={{ margin: "0 0 4px 0" }}>ATO statutory residual values for novated leases:</p>
                  <ul style={{ margin: "0 0 12px 0", paddingLeft: 18 }}>
                    <li>1 year lease → 65.63% residual</li>
                    <li>2 year lease → 56.25% residual</li>
                    <li>3 year lease → 46.88% residual</li>
                    <li>4 year lease → 37.50% residual</li>
                    <li>5 year lease → 28.13% residual</li>
                  </ul>
                  <p style={{ margin: "0 0 4px 0" }}><b>Method 1</b> (most common): applies the residual % to <i>financed amount minus documentation fee</i> as the capital cost. This is the pre-filled value in this calculator.</p>
                  <p style={{ margin: 0 }}><b>Method 2</b> (used by some financiers, e.g. CBA): applies the residual % to <i>the car's cost before on-road costs</i> (i.e. vehicle base value ÷ 1.1) as the capital cost.</p>
                </>
              } />
            }
          >
            <MoneyInputWrapper>
              <input
                type="text"
                inputMode="decimal"
                style={moneyInputStyle()}
                value={residualText}
                onChange={(e) => setResidualText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                }}
                onBlur={() => {
                  const parsed = parseMoneyInput(residualText);
                  if (!Number.isFinite(parsed)) {
                    const displayed =
                      residualGstMode === "incGst"
                        ? inputs.residualValueExGst * (1 + GST_RATE)
                        : inputs.residualValueExGst;
                    setResidualText(fmtMoneyInput(displayed));
                    return;
                  }
                  const exGst =
                    residualGstMode === "incGst" ? parsed / (1 + GST_RATE) : parsed;
                  const clamped = Math.max(0, exGst);
                  touch("residualValueExGst");
                  setInputs((p) => ({ ...p, residualValueExGst: clamped }));
                }}
              />
            </MoneyInputWrapper>
          </FieldRow>
          {(() => {
            const financed = financedAmountExGstFromInputs(inputs);
            const base1 = financed - inputs.leaseDocFee;
            const pct1 = base1 > 0 ? (inputs.residualValueExGst / base1) * 100 : null;
            const base2 = inputs.vehicleBaseValue / 1.1;
            const pct2 = base2 > 0 ? (inputs.residualValueExGst / base2) * 100 : null;
            const parts = [
              pct1 !== null ? `M1: ${pct1.toFixed(2)}%` : null,
              pct2 !== null ? `M2: ${pct2.toFixed(2)}%` : null,
            ].filter(Boolean).join("  ·  ");
            return parts ? (
              <div style={{ textAlign: "right", fontSize: 11, color: "rgba(0,0,0,0.35)", marginTop: -4 }}>
                {parts}
              </div>
            ) : null;
          })()}

          <FieldRow
  label={
    <div>
      <div>Vehicle Lease</div>
      <div style={{ display: "flex", gap: 6, marginTop: 3, fontSize: 11 }}>
        {(["perFn", "perMonth"] as const).map((mode, idx) => (
          <React.Fragment key={mode}>
            {idx > 0 && <span style={{ opacity: 0.3 }}>/</span>}
            <button
              type="button"
              onClick={() => setVehicleLeasePeriodMode(mode)}
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: vehicleLeasePeriodMode === mode ? 800 : 400,
                opacity: vehicleLeasePeriodMode === mode ? 0.9 : 0.45,
                textDecoration: vehicleLeasePeriodMode === mode ? "underline" : "none",
              }}
            >
              {mode === "perFn" ? "per fortnight" : "per month"}
            </button>
          </React.Fragment>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setLeaseAdjModalOpen(true)}
        style={{
          marginTop: 5,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 10,
          color: "rgba(11,92,171,0.85)",
          textDecoration: "underline",
          textUnderlineOffset: 2,
          fontWeight: 700,
          display: "block",
          textAlign: "left",
        }}
      >
        Smart Leasing / MillarX customer?
      </button>
    </div>
  }
  tooltip={<InfoTooltip text={<>
    <p style={{ margin: "0 0 8px 0" }}>Pre-tax, ex GST figure. Include ONLY the vehicle lease portion, not the total packaged amount that includes running costs.</p>
    <p style={{ margin: 0 }}>You can enter the figure per fortnight or per month depending on how your quote is presented — the correct conversion of 12 months = 26 fortnights is applied automatically.</p>
  </>} />}
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
          const displayed = vehicleLeasePeriodMode === "perMonth"
            ? inputs.vehicleLeasePerFn * 26 / 12
            : inputs.vehicleLeasePerFn;
          setVehicleLeasePerFnText(fmtMoneyInput(displayed));
          return;
        }
        const perFn = vehicleLeasePeriodMode === "perMonth" ? parsed * 12 / 26 : parsed;
        touch("vehicleLeasePerFn");
        props.onVehicleLeasePerFnChange(perFn);
        setVehicleLeasePerFnText(fmtMoneyInput(vehicleLeasePeriodMode === "perMonth" ? parsed : perFn));
        setNeedsLeaseRequote(false);
      }}
    />
  </MoneyInputWrapper>
</FieldRow>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 2, justifyContent: "flex-end" }}>
            <div
              aria-hidden
              style={{
                userSelect: "none",
                fontSize: 14,
                lineHeight: 1,
                marginTop: 6,
                opacity: 0.35,
              }}
            >
              ↳
            </div>

            <div
              style={{
                width: "80%",
                fontSize: 12,
                padding: "8px 10px",
                borderRadius: 10,
                border: "none",
                borderLeft: props.guardMessage
                  ? "5px solid rgba(200,0,0,0.55)"
                  : "5px solid rgba(11, 92, 171, 0.45)",
                background: props.guardMessage ? "rgba(200,0,0,0.035)" : "rgba(0,0,0,0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
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
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                    fontWeight: 800,
                    opacity: 0.85,
                    color: "rgba(11, 92, 171, 0.95)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  Effective interest rate:
                </button>

                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontWeight: 900 }}>{props.formatPct(props.guardLiveRatePct)}</span>
                  <span
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 0.9,
                      marginLeft: 2,
                    }}
                  >
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        // Helps iOS Safari avoid text-selection/callout on long-press.
                        try {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        } catch {
                          // ignore
                        }
                        setHoveredRateArrow("up");
                        startRateNudgeRepeat(1);
                      }}
                      onPointerUp={stopRateNudgeRepeat}
                      onPointerCancel={stopRateNudgeRepeat}
                      onPointerLeave={stopRateNudgeRepeat}
                      onMouseEnter={() => setHoveredRateArrow("up")}
                      onMouseLeave={() => setHoveredRateArrow(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          dispatchRateNudge(1);
                        }
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      title="Increase effective interest rate by 0.1%"
                      aria-label="Increase effective interest rate"
                      style={{
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 12,
                        lineHeight: 1,
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        WebkitTouchCallout: "none",
                        touchAction: "none",
                      }}
                    >
                      {hoveredRateArrow === "up" ? "▲" : "△"}
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        // Helps iOS Safari avoid text-selection/callout on long-press.
                        try {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        } catch {
                          // ignore
                        }
                        setHoveredRateArrow("down");
                        startRateNudgeRepeat(-1);
                      }}
                      onPointerUp={stopRateNudgeRepeat}
                      onPointerCancel={stopRateNudgeRepeat}
                      onPointerLeave={stopRateNudgeRepeat}
                      onMouseEnter={() => setHoveredRateArrow("down")}
                      onMouseLeave={() => setHoveredRateArrow(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          dispatchRateNudge(-1);
                        }
                      }}
                      onContextMenu={(e) => e.preventDefault()}
                      title="Decrease effective interest rate by 0.1%"
                      aria-label="Decrease effective interest rate"
                      style={{
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 12,
                        lineHeight: 1,
                        userSelect: "none",
                        WebkitUserSelect: "none",
                        WebkitTouchCallout: "none",
                        touchAction: "none",
                      }}
                    >
                      {hoveredRateArrow === "down" ? "▼" : "▽"}
                    </button>
                  </span>
                </span>

                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: 0.7 }}>
                  <InfoTooltip
                    text="You can adjust the effective interest rate manually using the △ / ▽ arrows. Each click changes the rate by 0.1% intervals (press-and-hold to adjust continuously)."
                  />
                </span>
              </div>

              {props.guardMessage ? (
                <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.95 }}>{props.guardMessage}</div>
              ) : null}

              {Number.isFinite(props.guardLiveRatePct) && props.guardLiveRatePct > 0.10 && (
                <div style={{
                  marginTop: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(217,119,6,0.35)",
                  borderLeft: "3px solid #d97706",
                  background: "rgba(217,119,6,0.06)",
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: "rgba(0,0,0,0.75)",
                }}>
                  <div style={{ fontWeight: 800, marginBottom: 3, color: "#92400e" }}>
                    💡 High rate — is a BYO lease available?
                  </div>
                  <div>
                    At {props.formatPct(props.guardLiveRatePct)}, it may be worth checking whether your employer supports a{" "}
                    <a href="/tools/byo-employer-check/" target="_blank" rel="noopener" style={{ color: "#b45309" }}>
                      self-managed (BYO) novated lease
                    </a>
                    {" "}— these let you choose your own financier and typically carry a lower effective rate.
                  </div>
                </div>
              )}

              <InterestRateCaveats />
            </div>
          </div>

          <MoneyField
            label="Luxury Vehicle Adjustment (Per Fortnight)"
            tooltip={
                <InfoTooltip text="Pre-tax. For vehicle valued > $69, 674, some leases incur this ON TOP OF regular lease figure. It is normally listed as a separate item. 0 if irrelevant." />
            }
            value={inputs.luxuryVehicleAdjPerFn}
            step={1}
            min={0}
            onChange={(v) => {
              touch("luxuryVehicleAdjPerFn");
              setInputs((p) => ({ ...p, luxuryVehicleAdjPerFn: v }));
            }}
          />


<ExpandToggle title="Advanced info for interest calculation">
  <MoneyField
    label="Financed amount reported in your quote"
    tooltip={
      <InfoTooltip
        text={
          <>
            <p style={{ margin: "0 0 8px 0" }}>
              This is only used for interest calculation.
            </p>
            <p style={{ margin: "0 0 8px 0" }}>
              <b>
                If you don't know this figure, leave it as this pre-calculated figure. If you have a financed amount figure, make sure it does not contain first year insurance or other after-market add-ons.
              </b>
            </p>
            <p style={{ margin: 0 }}>
              <b>WARNING:</b> The calculated effective interest rate is invalid if the financed figure contains insurance, repair package or other vehicle add-ons that are not part of the FBT base value, as the financed amount used in this calculator does not consider these add-ons. The presence of these add-ons also make comparison with other financiers invalid if they do not contain equivalent add-ons.
            </p>
          </>
        }
      />
    }
    value={inputs.financedAmountForInterestCalcExGst}
    step={100}
    min={0}
    onChange={(v) => {
      touch("financedAmountForInterestCalcExGst");
      setInputs((p) => ({ ...p, financedAmountForInterestCalcExGst: v }));
    }}
  />

  <NumberField
    label="Months Deferred"
    tooltip={<InfoTooltip text="Typically 2 months, but occasionally 1 month with some financiers." />}
    value={inputs.monthsDeferred}
    step={1}
    min={0}
    onChange={(v) => {
      touch("monthsDeferred");
      setInputs((p) => ({ ...p, monthsDeferred: Math.max(0, Math.round(v)) }));
    }}
  />
</ExpandToggle>

        </Section>

        <Section
          title={`ANNUAL PACKAGED RUNNING COST (${inputs.gstSavingPassedOn === "Yes" ? "ex GST" : "inc GST"})`}
           className="nl-input-subcard"
        >
          <SelectYesNo
            label="GST Saving Passed On in NL"
            tooltip={
              <InfoTooltip
                text={
                  <>
                    Usually YES, however some employers (Victorian Hospitals in particular!) do NOT pass on GST saving.
                    Important: Check. Read more in Running costs & claiming - Some employers do not pass on GST saving. 
                    .
                  </>
                }
              />
            }
            value={inputs.gstSavingPassedOn}
            onChange={(v) => {
              touch("gstSavingPassedOn");
              setInputs((p) => ({ ...p, gstSavingPassedOn: v }));
            }}
          />
          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
              marginTop: -4,
              paddingLeft: 2,
            }}
          >
            {inputs.gstSavingPassedOn === "Yes"
              ? "Please use ex GST figures in the following fields."
              : "Please use inc GST figures in the following fields."}
          <a href="https://novatedlease.guide/running-costs/failure-to-pass-gst-saving/" target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>
              (Learn more)
            </a>
          </div>

          <MoneyField
            label="Service / Maintenance / Tyres"
            tooltip={<InfoTooltip text="Annual figure, combined as individual breakdowns do not matter." />}
            value={inputs.serviceMaintTyresAnnual}
            step={10}
            min={0}
            onChange={(v) => {
              touch("serviceMaintTyresAnnual");
              setInputs((p) => ({ ...p, serviceMaintTyresAnnual: v }));
            }}
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
            onChange={(v) => {
              touch("saveShareAnnual");
              setInputs((p) => ({ ...p, saveShareAnnual: v }));
            }}
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
            onChange={(v) => {
              touch("registrationAnnual");
              setInputs((p) => ({ ...p, registrationAnnual: v }));
            }}
          />

          {inputs.vehicleType === "EV" ? (
            <MoneyField
              label="Electricity"
              tooltip={
                <InfoTooltip text={
                  <>
                    Annual figure. Auto-filled from Annual Mileage × 5.47c/km (ATO shortcut method). You can override if you choose other claim methods. <b>Note:</b> this is the allowed claim amount by ATO, not your true out-of-pocket electricity expense (which should be entered in the Electricity section below).
                  </>
                } />
              }
              value={inputs.electricityAnnual}
              step={10}
              min={0}
              onChange={(v) => {
                touch("electricityAnnual");
                setElectricityAnnualTouched(true);
                setInputs((p) => ({ ...p, electricityAnnual: v }));
              }}
            />
          ) : (
            <MoneyField
              label="Fuel"
              tooltip={
                <>
                  <InfoTooltip text="Annual figure. Enter your expected fuel cost for the year (petrol/diesel)." />
                </>
              }
              value={inputs.fuelAnnual}
              step={10}
              min={0}
              onChange={(v) => {
                touch("fuelAnnual");
                setInputs((p) => ({ ...p, fuelAnnual: v }));
              }}
            />
          )}

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
            onChange={(v) => {
              touch("insuranceAnnual");
              setInputs((p) => ({ ...p, insuranceAnnual: v }));
            }}
          />

          <MoneyField
            label="Management Fees"
            tooltip={
              <>
                <InfoTooltip text="Annual figure, sum of all novated lease membership / management fees." />
              </>
            }
            value={inputs.managementFeesAnnual}
            step={10}
            min={0}
            onChange={(v) => {
              touch("managementFeesAnnual");
              setInputs((p) => ({ ...p, managementFeesAnnual: v }));
            }}
          />
        </Section>

        {inputs.vehicleType === "EV" ? (
          <Section title="ELECTRICITY" className="nl-input-subcard" accent="#e65100">
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
              onChange={(v) => {
                touch("avgAudPerKwh");
                setInputs((p) => ({ ...p, avgAudPerKwh: v }));
              }}
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
              onChange={(v) => {
                touch("avgWhPerKm");
                setInputs((p) => ({ ...p, avgWhPerKm: v }));
              }}
            />

  <ExpandToggle
    title="Use an alternate annual charging cost"
    defaultOpen={Boolean(inputs.overrideAnnualChargingExpense)}
  >
    <MoneyField
      label="Annual Charging Expense"
      tooltip={
        <>
          <InfoTooltip text="If you have a better estimate of annual charging expense, enter it here (e.g. frequent public charging). Otherwise leave it as 0." />
        </>
      }
      value={inputs.overrideAnnualChargingExpense ?? 0}
      step={10}
      min={0}
      onChange={(v) => {
        touch("overrideAnnualChargingExpense");
        setInputs((p) => ({
          ...p,
          overrideAnnualChargingExpense: v === 0 ? undefined : v,
        }));
      }}
    />

    {inputs.overrideAnnualChargingExpense ? (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => {
            touch("overrideAnnualChargingExpense");
            setInputs((p) => ({ ...p, overrideAnnualChargingExpense: undefined }));
          }}
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
          Remove alternate cost
        </button>
      </div>
    ) : null}
  </ExpandToggle>

          </Section>
        ) : null}

<Section
  title="COMPARE WITH CAR LOAN"
   className="nl-input-subcard"
  headerRight={
    <>
      <InfoTooltip text="Skip this section and leave it off if you are not comparing against a traditional car loan." />
      <OnOffSwitch
        value={inputs.compareWithCarLoan}
        onChange={(v) => {
          touch("compareWithCarLoan");
          setInputs((p) => ({ ...p, compareWithCarLoan: v }));
        }}
      />
    </>
  }
>
  {inputs.compareWithCarLoan && (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <MoneyField
                label="Initial Deposit Amount"
                value={inputs.carLoanInitialDeposit}
                step={100}
                min={0}
                onChange={(v) => {
                  touch("carLoanInitialDeposit");
                  setInputs((p) => ({ ...p, carLoanInitialDeposit: v }));
                }}
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
                onChange={(v) => {
                  touch("carLoanInterestRatePct");
                  setInputs((p) => ({ ...p, carLoanInterestRatePct: v }));
                }}
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
                onChange={(v) => {
                  touch("carLoanMonthlyFee");
                  setInputs((p) => ({ ...p, carLoanMonthlyFee: v }));
                }}
              />
            </div>
          )}
        </Section>

        <Section
  title="COMPARE WITH KEEPING CURRENT CAR"
   className="nl-input-subcard"
  headerRight={
    <>
      <InfoTooltip text='Skip this section and leave it off if you are not comparing against "keeping current car".' />
      <OnOffSwitch
        value={inputs.compareWithCurrentCar}
        onChange={(v) => {
          touch("compareWithCurrentCar");
          setInputs((p) => ({ ...p, compareWithCurrentCar: v }));
        }}
      />
    </>
  }
>
  {inputs.compareWithCurrentCar && (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <MoneyField
                label="Current Market Value"
                tooltip={
                  <>
                    <InfoTooltip text="Tips: look up carsales.com.au or equivalent website." />
                  </>
                }
                value={inputs.currentCarMarketValueNow}
                step={100}
                min={0}
                onChange={(v) => {
                  touch("currentCarMarketValueNow");
                  setInputs((p) => ({ ...p, currentCarMarketValueNow: v }));
                }}
              />

              <MoneyField
                label={`Estimated Market Value after 5 Years`}
                tooltip={
                  <InfoTooltip
                text={
                  <>
                    <p style={{ margin: "0 0 10px 0" }}>
                      <b>Suggest:</b>  Simulate using carsales.com.au by comparing 4yo car and 9yo car, for example.
                    </p>
                    <p style={{ margin: "0 0 10px 0" }}>
                      <b>If your lease is shorter than 5 years</b>, please still enter the 5-year estimated value; the calculator will estimate the value for the interim time using an
                      exponential decay model (a constant percentage drop each year until it reaches the 5-year value.
                    </p>
                    <p style={{ margin: 0 }}>
                      This is intended to better match typical market depreciation than a straight-line model.
                    </p>
                  </>
                }
              />
                }
                value={inputs.currentCarMarketValueAtEnd}
                step={100}
                min={0}
                onChange={(v) => {
                  touch("currentCarMarketValueAtEnd");
                  setInputs((p) => ({ ...p, currentCarMarketValueAtEnd: v }));
                }}
              />

              <div style={{ fontWeight: 700, opacity: 0.85, marginTop: 6 }}>ANNUAL RUNNING COST (inc GST)</div>

              <MoneyField
                label="Service / Maintenance / Tyres"
                value={inputs.currentServiceMaintTyresAnnual}
                step={10}
                min={0}
                onChange={(v) => {
                  touch("currentServiceMaintTyresAnnual");
                  setInputs((p) => ({ ...p, currentServiceMaintTyresAnnual: v }));
                }}
              />

              <MoneyField
                label="Registration"
                value={inputs.currentRegistrationAnnual}
                step={10}
                min={0}
                onChange={(v) => {
                  touch("currentRegistrationAnnual");
                  setInputs((p) => ({ ...p, currentRegistrationAnnual: v }));
                }}
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
                onChange={(v) => {
                  touch("currentFuelAnnual");
                  setInputs((p) => ({ ...p, currentFuelAnnual: v }));
                }}
              />

              <MoneyField
                label="Insurance"
                value={inputs.currentInsuranceAnnual}
                step={10}
                min={0}
                onChange={(v) => {
                  touch("currentInsuranceAnnual");
                  setInputs((p) => ({ ...p, currentInsuranceAnnual: v }));
                }}
              />
            </div>
          )}
        </Section>
      </div>

      {leaseAdjModalOpen && (
        <LeaseAdjustModal
          leaseDurationYears={inputs.leaseDurationYears}
          onClose={() => setLeaseAdjModalOpen(false)}
          onApply={(adjustedFn) => {
            touch("vehicleLeasePerFn");
            props.onVehicleLeasePerFnChange(adjustedFn);
            setNeedsLeaseRequote(false);
            setLeaseAdjModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* ---------- UI helpers (local to inputs panel) ---------- */

function Section(props: {
  title: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
  banner?: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  /** Hex colour for the left-accent strip and header tint, e.g. "#0b5cab" */
  accent?: string;
}) {
  const accent = props.accent ?? "#0b5cab";
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const tint = (a: number) => `rgba(${r},${g},${b},${a})`;

  return (
    <div
      className={props.className}
      style={{
        borderRadius: "var(--nl-subcard-radius, 12px)",
        padding: "var(--nl-subcard-padding, 12px)",
        width: "100%",
        background: props.highlight ? "rgba(200,0,0,0.04)" : `rgba(${r},${g},${b},0.04)`,
        boxShadow: props.highlight
          ? "0 0 0 2px rgba(200,0,0,0.45), 0 2px 10px rgba(200,0,0,0.08)"
          : "0 1px 3px rgba(0,0,0,0.05), 0 3px 12px rgba(0,0,0,0.06)",
        borderLeft: props.highlight ? "4px solid rgba(200,0,0,0.55)" : `4px solid ${tint(0.5)}`,
        transition: "box-shadow 220ms ease, border-color 220ms ease, background 220ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          data-section-title
          style={{
            fontWeight: 800,
            fontSize: 11,
            lineHeight: 1.2,
            flex: "1 1 auto",
            paddingTop: 1,
            paddingLeft: 8,
            letterSpacing: "0.06em",
            color: props.highlight ? "rgba(200,0,0,0.8)" : tint(0.85),
          }}
        >
          {props.title}
        </div>
        {props.headerRight ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
              paddingTop: 1,
              flexShrink: 0,
            }}
          >
            {props.headerRight}
          </div>
        ) : null}
      </div>
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

      <div style={{ minWidth: 0 }}>{props.children}</div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.16)",
    fontSize: 14,
    fontWeight: 500,
    background: "rgba(0,0,0,0.015)",
    transition: "border-color 150ms ease, box-shadow 150ms ease",
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

function InterestRateCaveats() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8, fontSize: 11, color: "rgba(0,0,0,0.6)", lineHeight: 1.45 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 10,
          color: "rgba(0,0,0,0.4)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        {open ? "▾" : "▸"} Calculation caveats
      </button>
      {open && (
        <ol style={{ margin: "6px 0 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>
            <b>Financed amount includes add-ons:</b> The effective interest rate is invalid if the financed figure contains insurance, repair package or other vehicle add-ons not part of the FBT base value. Their presence also makes comparison with other financiers invalid if they do not contain equivalent add-ons.
          </li>
          <li>
            <b>Residual value method mismatch:</b> The two common residual value methods (Method 1: financed amount minus doc fee; Method 2: vehicle base cost before on-road) produce different dollar residuals for the same percentage. This means two financiers quoting the same effective interest rate are <em>not</em> directly comparable if they use different residual methods — a 9% rate under Method 1 is economically different from a 9% rate under Method 2.
          </li>
          <li>
            <b>GST not passed on:</b> When GST is not passed on by the employer, the fortnightly lease charged is inc GST; however the effective interest rate calculation assumes this is the ex GST figure, which results in an inconsistent rate. This will be addressed in a future update.
          </li>
          <li>
            <b>Atypical lease structure (Smart Leasing / MillarX):</b> This calculator assumes averaged payroll deductions across the lease term. Some providers structure quotes differently — for example, on a 5-year term there may be 59 actual lease rentals but 60 payroll deductions, with the extra deduction held as a refundable budget reserve for running costs. Entering the quoted figure directly will produce a misleading effective interest rate. <b>Smart Leasing and MillarX customers: use the "Smart Leasing / MillarX customer?" adjustment tool above the lease input — it scales your quoted figure to the finance-only amount this calculator expects.</b>
          </li>
        </ol>
      )}
    </div>
  );
}

function ExpandToggle(props: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(props.defaultOpen));

  useEffect(() => {
    if (props.defaultOpen) setOpen(true);
  }, [props.defaultOpen]);

  return (
    <div style={{ marginTop: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: 0,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 800,
          opacity: 0.85,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 16,
            textAlign: "center",
            fontWeight: 900,
          }}
        >
          {open ? "−" : "+"}
        </span>
        <span>{props.title}</span>
      </button>

      {open ? (
        <div style={{ display: "grid", gap: 10, marginTop: 10, paddingLeft: 22 }}>
          {props.children}
        </div>
      ) : null}
    </div>
  );
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
      <input
        type="date"
        style={{ ...inputStyle(), minWidth: 0, maxWidth: "100%" }}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
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

function LeaseAdjustModal(props: {
  leaseDurationYears: number;
  onClose: () => void;
  onApply: (adjustedFnPerFn: number) => void;
}) {
  const [provider, setProvider] = useState<"smart" | "millarx">("smart");
  const [quotedText, setQuotedText] = useState<string>("");

  const totalMonths = props.leaseDurationYears * 12;
  const bufferMonths = provider === "smart" ? 2 : 1;
  const quotedNum = parseFloat(String(quotedText).trim().replace(/[$,]/g, ""));
  const hasQuoted = Number.isFinite(quotedNum) && quotedNum > 0;
  const factor = totalMonths > 0 ? (totalMonths - bufferMonths) / totalMonths : null;
  const adjustedFn = hasQuoted && factor !== null ? quotedNum * factor : null;

  const fmtResult = (n: number) =>
    n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000 }}
        onClick={props.onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          background: "#fff",
          borderRadius: 18,
          padding: "28px 30px 24px",
          maxWidth: 420,
          width: "calc(100vw - 32px)",
          boxShadow: "0 12px 56px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 20,
            lineHeight: 1,
            color: "rgba(0,0,0,0.3)",
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4, paddingRight: 24 }}>
          Adjust your quoted finance figure
        </div>
        <div style={{ fontSize: 13, color: "rgba(0,0,0,0.5)", marginBottom: 20, lineHeight: 1.45 }}>
          {provider === "smart" ? "Smart Leasing" : "MillarX"} derives your regular payment as though you are paying for all {totalMonths} monthly lease payments — but only {totalMonths - bufferMonths} of those are actual lease rentals paid to the financier. The remainder is held as a budget reserve (refundable if unused at lease end). The calculator needs the figure based on the {totalMonths - bufferMonths} true lease payments, which is ~{factor !== null ? ((1 - factor) * 100).toFixed(1) : "?"}% lower than your quoted figure.
        </div>

        {/* Provider toggle — compact pill */}
        <div
          style={{
            display: "inline-flex",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.14)",
            background: "rgba(0,0,0,0.04)",
            padding: 3,
            marginBottom: 24,
            gap: 2,
          }}
        >
          {(["smart", "millarx"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: provider === p ? "#fff" : "transparent",
                boxShadow: provider === p ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                cursor: "pointer",
                fontWeight: provider === p ? 800 : 500,
                fontSize: 13,
                color: provider === p ? "rgba(11,92,171,0.95)" : "rgba(0,0,0,0.5)",
                transition: "all 140ms ease",
                whiteSpace: "nowrap",
              }}
            >
              {p === "smart" ? "Smart Leasing" : "MillarX"}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.45)", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
          Your quoted finance figure (per fortnight, ex GST)
        </div>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontWeight: 700,
              fontSize: 16,
              color: "rgba(0,0,0,0.4)",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            $
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={quotedText}
            placeholder="e.g. 650.00"
            autoFocus
            onChange={(e) => setQuotedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            }}
            onBlur={() => {
              const n = parseFloat(String(quotedText).trim().replace(/[$,]/g, ""));
              if (Number.isFinite(n) && n > 0) setQuotedText(fmtResult(n));
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px 12px 32px",
              borderRadius: 10,
              border: "1.5px solid rgba(0,0,0,0.18)",
              fontSize: 20,
              fontWeight: 700,
              background: "#fff",
              outline: "none",
            }}
          />
        </div>

        {/* Formula hint */}
        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", textAlign: "right", marginBottom: 16 }}>
          × {totalMonths - bufferMonths} / {totalMonths}{factor !== null ? ` = ${(factor * 100).toFixed(3)}%` : ""}
        </div>

        {/* Result */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.45)", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
          Enter this into the calculator
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: adjustedFn !== null ? "rgba(27,94,32,0.06)" : "rgba(0,0,0,0.025)",
            border: adjustedFn !== null ? "1.5px solid rgba(46,125,50,0.3)" : "1.5px solid rgba(0,0,0,0.1)",
            fontSize: 20,
            fontWeight: 800,
            color: adjustedFn !== null ? "rgb(27,94,32)" : "rgba(0,0,0,0.2)",
            letterSpacing: "-0.01em",
            marginBottom: 24,
            minHeight: 46,
            display: "flex",
            alignItems: "center",
          }}
        >
          {adjustedFn !== null ? `$${fmtResult(adjustedFn)}` : "—"}
        </div>

        {/* MillarX caveat */}
        {provider === "millarx" && (
          <div style={{ fontSize: 11, color: "rgba(0,0,0,0.45)", lineHeight: 1.5, marginTop: -16, marginBottom: 20, fontStyle: "italic" }}>
            MillarX's exact buffer may vary by quote — confirm the number of payroll deductions vs. lease rentals with MillarX directly.
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={props.onClose}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.16)",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "rgba(0,0,0,0.6)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={adjustedFn === null}
            onClick={() => {
              if (adjustedFn !== null) props.onApply(Math.round(adjustedFn * 100) / 100);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: adjustedFn !== null ? "rgba(11,92,171,0.88)" : "rgba(0,0,0,0.07)",
              color: adjustedFn !== null ? "#fff" : "rgba(0,0,0,0.25)",
              cursor: adjustedFn !== null ? "pointer" : "default",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Use this value →
          </button>
        </div>
      </div>
    </>
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
  const cleaned = String(s).trim().replace(/[$,]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function safeNum(v: string | number): number {
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

function OnOffSwitch(props: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.value}
      onClick={() => props.onChange(!props.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onChange(!props.value);
        }
      }}
      style={{
        position: "relative",
        width: 54,
        height: 30,
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.18)",
        background: props.value ? "rgba(46, 125, 50, 0.18)" : "rgba(0,0,0,0.06)",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          bottom: 2,
          left: 2,
          width: 26,
          borderRadius: 999,
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          transform: props.value ? "translateX(24px)" : "translateX(0)",
          transition: "transform 180ms ease",
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 8px",
          fontSize: 11,
          fontWeight: 900,
          opacity: 0.55,
          userSelect: "none",
        }}
      >
        <span>Off</span>
        <span>On</span>
      </span>
    </button>
  );
}