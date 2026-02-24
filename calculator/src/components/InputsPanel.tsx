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
  onUserInput?: (field: string) => void;
};

export default function InputsPanel(props: InputsPanelProps) {
  const { inputs, setInputs } = props;
  const touch = (field: string) => props.onUserInput?.(field);
  // Auto-fill for packaged Electricity (ATO shortcut method: 4.2c/km) until user manually overrides
  const ATO_EV_HOME_CHARGING_RATE_PER_KM = 0.042;
  const [electricityAnnualTouched, setElectricityAnnualTouched] = useState<boolean>(false);
  const lastAutoElectricityAnnualRef = useRef<number | null>(null);
  const [needsLeaseRequote, setNeedsLeaseRequote] = useState(false);
  const prevLeaseDurationRef = useRef<number>(inputs.leaseDurationYears);


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

  const [vehicleLeasePerFnText, setVehicleLeasePerFnText] = useState<string>(
    fmtMoneyInput(inputs.vehicleLeasePerFn)
  );

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
        <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1, paddingTop: 4 }}>Inputs</div>
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
        <Section title="FBT-EXEMPTION ELIGIBILITY" className="nl-input-subcard">
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
          {/* Eligibility cue (only show when EV but not eligible) */}
          {isEv && !evEligibilityCriteriaSatisfied ? (
            <ReadOnlyValue
              label="Eligible for FBT Exemption"
              tooltip={<InfoTooltip text="Automatically determined from the next section" />}
              value="No"
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
          className="nl-input-subcard"
          highlight={isEv && !isFbtExemptEligible}
          banner={
            (isEv && !isFbtExemptEligible) ? (
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

          {inputs.vehicleCondition !== "New" ? (
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

        <Section title="FINANCIALS" className="nl-input-subcard">
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

        <Section title="VEHICLE LEASE DETAILS" className="nl-input-subcard">
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
        touch("vehicleLeasePerFn");
        props.onVehicleLeasePerFnChange(parsed);
        setVehicleLeasePerFnText(fmtMoneyInput(parsed));
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
                    text={
                      <>
                        <p style={{ margin: "0 0 8px 0" }}>
                          You can adjust the effective interest rate manually using the △ / ▽ arrows. Each click changes the rate by <b>0.1%</b> intervals (press-and-hold to adjust continuously).
                        </p>
                        <p style={{ margin: 0 }}>
                          <b>WARNING:</b> The calculated effective interest rate is invalid if the financed figure contains insurance, repair package or other vehicle add-ons that are not part of the FBT base value, as the financed amount used in this calculator does not consider these add-ons. The presence of these add-ons also make comparison with other financiers invalid if they do not contain equivalent add-ons.
                        </p>
                      </>
                    }
                  />
                </span>
              </div>

              {props.guardMessage ? (
                <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.95 }}>{props.guardMessage}</div>
              ) : null}
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
                    Annual figure. Auto-filled from Annual Mileage × 4.2c/km (ATO shortcut method). You can override if you choose other claim methods. <b>Note:</b> this is the allowed claim amount by ATO, not your true out-of-pocket electricity expense (which should be entered in the Electricity section below).
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
          <Section title="ELECTRICITY" className="nl-input-subcard">
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
}) {
  return (
    <div
      className={props.className}
      style={{
        border: props.highlight ? "2px solid rgba(200,0,0,0.45)" : "1px solid rgba(0,0,0,0.12)",
        borderRadius: "var(--nl-subcard-radius, 12px)",
        padding: "var(--nl-subcard-padding, 12px)",
        width: "100%",
        background: props.highlight ? "rgba(200,0,0,0.04)" : undefined,
        boxShadow: props.highlight ? "0 0 0 4px rgba(200,0,0,0.08)" : "none",
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
          style={{
            fontWeight: 900,
            fontSize: 14,
            lineHeight: 1.2,
            flex: "1 1 auto",
            paddingTop: 1,
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