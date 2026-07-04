import { useEffect, useRef, useState } from "react";
import type { Inputs } from "@engine/types";
import {
  effectiveAnnualRateFromFortnightlyLease,
  financedAmountExGstFromInputs,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "@engine/effectiveinterest";
import { CurrencyField } from "./ui/Field";
import { InfoTooltip } from "./ui/InfoTooltip";
import { LeaseAdjustModal } from "./LeaseAdjustModal";
import { trackEvent, trackOncePerSession } from "../utils/analytics";

function formatMoney(x: number): string {
  return `$ ${x.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPct(x: number): string {
  return Number.isFinite(x) ? `${(x * 100).toFixed(2)}%` : "—";
}

/**
 * Pure guard-bounds calculation, exported for direct unit testing (see
 * tests/lease-rate-guard.test.ts) — the plausible fortnightly-payment range
 * (0.1%-30% p.a. effective rate) and the live rate implied by the current
 * vehicleLeasePerFn.
 */
export function computeLeaseGuardBounds(inputs: Inputs): { minFn: number; maxFn: number; liveRate: number } {
  const leaseYears = Math.max(1, Math.min(5, Math.round(inputs.leaseDurationYears)));
  const deferMonths = Math.max(0, Math.round(inputs.monthsDeferred));
  const financedExGst = financedAmountExGstFromInputs(inputs);
  const residualExGst = inputs.residualValueExGst;

  const liveRate = (() => {
    try {
      return effectiveAnnualRateFromFortnightlyLease({
        financedAmountExGst: financedExGst,
        residualValueExGst: residualExGst,
        leaseYears,
        deferMonths,
        fortnightlyLeasePayment: Math.max(0, inputs.vehicleLeasePerFn),
      });
    } catch {
      return NaN;
    }
  })();

  const minFn = (() => {
    try {
      return fortnightlyLeaseFromEffectiveAnnualRate({ financedAmountExGst: financedExGst, residualValueExGst: residualExGst, leaseYears, deferMonths, effectiveAnnualRate: 0.001 });
    } catch {
      return NaN;
    }
  })();
  const maxFn = (() => {
    try {
      return fortnightlyLeaseFromEffectiveAnnualRate({ financedAmountExGst: financedExGst, residualValueExGst: residualExGst, leaseYears, deferMonths, effectiveAnnualRate: 0.3 });
    } catch {
      return NaN;
    }
  })();

  return { minFn, maxFn, liveRate };
}

/**
 * Ported from calculator/src/App.tsx's "lease quote safeguard" (lines ~800-919)
 * and the matching display block in InputsPanel.tsx (~lines 905-1083): rejects a
 * fortnightly lease payment that implies an effective rate outside 0.1%-30% p.a.
 * (almost certainly a typo or unit mistake — e.g. entering the monthly amount
 * instead of fortnightly), and separately flags rates above 10% as "worth
 * checking whether a BYO lease is available" even when accepted. Also ports the
 * ±0.1% rate-nudge steppers (v1 InputsPanel.tsx ~110-156, 948-1051 + App.tsx's
 * recompute handler ~949-1010) — implemented locally here rather than via v1's
 * cross-component CustomEvent, since this component already owns both the rate
 * display and setInputs.
 */
export function LeaseRateGuard(props: {
  inputs: Inputs;
  setInputs: React.Dispatch<React.SetStateAction<Inputs>>;
  vehicleLeasePeriodMode: "perFn" | "perMonth";
  onVehicleLeasePeriodModeChange: (mode: "perFn" | "perMonth") => void;
  onNavigateToDetails?: (anchorId?: string) => void;
}) {
  const { inputs, setInputs, vehicleLeasePeriodMode, onVehicleLeasePeriodModeChange } = props;
  const [guardMsg, setGuardMsg] = useState("");
  const isMonthly = vehicleLeasePeriodMode === "perMonth";

  const { minFn, maxFn, liveRate } = computeLeaseGuardBounds(inputs);

  // If the guard basis changes (lease term, defer months, financed amount...), refresh a
  // currently-shown rejection message so it doesn't quote a stale plausible range.
  useEffect(() => {
    setGuardMsg((prev) => {
      if (!prev || !prev.startsWith("Rejected:")) return prev;
      if (!Number.isFinite(minFn) || !Number.isFinite(maxFn)) return "";
      return `Rejected: outside plausible range (${formatMoney(minFn)} to ${formatMoney(maxFn)}) given 0.1%–30% effective rate.`;
    });
  }, [minFn, maxFn]);

  // Shared commit path for both direct field edits and rate-nudge steps — `perFn` is always
  // in canonical per-fortnight units by this point.
  function commitPerFn(perFn: number) {
    const clamped = Math.max(0, perFn);
    trackOncePerSession("calculator_started", "calculator_started", { field: "vehicleLeasePerFn" });
    trackEvent("input_changed", { field: "vehicleLeasePerFn" });

    if (!Number.isFinite(minFn) || !Number.isFinite(maxFn)) {
      setInputs((p) => ({ ...p, vehicleLeasePerFn: clamped }));
      setGuardMsg("");
      return;
    }

    if (clamped < minFn || clamped > maxFn) {
      setGuardMsg(`Rejected: outside plausible range (${formatMoney(minFn)} to ${formatMoney(maxFn)}) given 0.1%–30% effective rate.`);
      return;
    }

    setInputs((p) => ({ ...p, vehicleLeasePerFn: clamped }));
    setGuardMsg("");
  }

  // `next` arrives in whichever period the field is currently displaying — convert to the
  // canonical per-fortnight figure (12 months = 26 fortnights) before validating/storing.
  function handleChange(next: number) {
    commitPerFn(isMonthly ? (next * 12) / 26 : next);
  }

  // ── Rate-nudge steppers (±0.1%) ──────────────────────────────────────────
  const [hoveredArrow, setHoveredArrow] = useState<"up" | "down" | null>(null);
  const nudgeTimeoutRef = useRef<number | null>(null);
  const nudgeIntervalRef = useRef<number | null>(null);
  const guardSnapRef = useRef({ liveRate, minFn, maxFn, inputs });
  guardSnapRef.current = { liveRate, minFn, maxFn, inputs };

  function clearNudgeTimers() {
    if (nudgeTimeoutRef.current !== null) {
      window.clearTimeout(nudgeTimeoutRef.current);
      nudgeTimeoutRef.current = null;
    }
    if (nudgeIntervalRef.current !== null) {
      window.clearInterval(nudgeIntervalRef.current);
      nudgeIntervalRef.current = null;
    }
  }

  // Steps the live rate to the next 0.1% grid point in `dir`'s direction (with float-drift
  // epsilon handling — mirrors v1 App.tsx's nlguide:nudgeEffectiveRate handler exactly) and
  // recomputes vehicleLeasePerFn from it.
  function nudgeRate(dir: 1 | -1) {
    const snap = guardSnapRef.current;
    if (!Number.isFinite(snap.liveRate)) return;

    const curTimes10 = snap.liveRate * 1000;
    const EPS = 1e-3;
    const nearest = Math.round(curTimes10);
    const onGrid = Math.abs(curTimes10 - nearest) < EPS;
    const baseTimes10 = onGrid ? nearest : dir > 0 ? Math.floor(curTimes10) : Math.ceil(curTimes10);
    const nextPct = (baseTimes10 + dir) / 10;
    const clampedPct = Math.max(0.1, Math.min(30, nextPct));
    const nextRate = clampedPct / 100;

    try {
      const financedExGst = financedAmountExGstFromInputs(snap.inputs);
      const leaseYears = Math.max(1, Math.min(5, Math.round(snap.inputs.leaseDurationYears)));
      const deferMonths = Math.max(0, Math.round(snap.inputs.monthsDeferred));
      const nextTotalLeaseFn = fortnightlyLeaseFromEffectiveAnnualRate({
        financedAmountExGst: financedExGst,
        residualValueExGst: snap.inputs.residualValueExGst,
        leaseYears,
        deferMonths,
        effectiveAnnualRate: nextRate,
      });
      const nextVehicleOnly = Math.max(0, nextTotalLeaseFn - snap.inputs.luxuryVehicleAdjPerFn);
      commitPerFn(nextVehicleOnly);
    } catch {
      // ignore engine errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  function startNudgeRepeat(dir: 1 | -1) {
    nudgeRate(dir);
    clearNudgeTimers();
    nudgeTimeoutRef.current = window.setTimeout(() => {
      nudgeIntervalRef.current = window.setInterval(() => nudgeRate(dir), 110);
    }, 320);
  }

  function stopNudgeRepeat() {
    clearNudgeTimers();
    setHoveredArrow(null);
  }

  useEffect(() => () => clearNudgeTimers(), []);

  const displayValue = isMonthly ? (inputs.vehicleLeasePerFn * 26) / 12 : inputs.vehicleLeasePerFn;
  const [leaseAdjModalOpen, setLeaseAdjModalOpen] = useState(false);

  return (
    <div>
      <CurrencyField
        label={
          <div>
            <div>Vehicle finance (ex GST)</div>
            <div style={{ display: "flex", gap: 6, marginTop: 3, fontSize: 11, alignItems: "center" }}>
              {(["perFn", "perMonth"] as const).map((mode, idx) => (
                <span key={mode} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {idx > 0 && <span style={{ opacity: 0.3 }}>/</span>}
                  <button
                    type="button"
                    onClick={() => onVehicleLeasePeriodModeChange(mode)}
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
                </span>
              ))}
            </div>
          </div>
        }
        tooltip={
          <InfoTooltip
            text={
              "Pre-tax, ex-GST amount. Include ONLY the vehicle finance/lease portion of your quote — not the total packaged amount, which also includes running costs (fuel/electricity, insurance, rego, servicing, management fees, etc).\n\n" +
              "Enter the figure per fortnight or per month, whichever matches your quote — the conversion (12 months = 26 fortnights) is applied automatically."
            }
          />
        }
        value={displayValue}
        onChange={handleChange}
        error={guardMsg || undefined}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -10, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setLeaseAdjModalOpen(true)}
          style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", fontSize: 10, color: "var(--nlc-text-muted)", opacity: 0.7, textDecoration: "underline", textUnderlineOffset: 2, fontWeight: 500 }}
        >
          Smart Leasing / MillarX customer?
        </button>
      </div>
      {leaseAdjModalOpen && (
        <LeaseAdjustModal
          leaseDurationYears={inputs.leaseDurationYears}
          onClose={() => setLeaseAdjModalOpen(false)}
          onApply={(adjustedFn) => {
            commitPerFn(adjustedFn);
            setLeaseAdjModalOpen(false);
          }}
        />
      )}
      <div
        style={{
          marginTop: -8,
          marginBottom: 16,
          padding: "8px 10px",
          borderRadius: "var(--nlc-radius-md)",
          borderLeft: guardMsg ? "3px solid var(--nlc-bad)" : "3px solid var(--nlc-blue-mid)",
          background: guardMsg ? "var(--nlc-bad-light)" : "var(--nlc-bg-sunken)",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {props.onNavigateToDetails ? (
          <button
            type="button"
            onClick={() => props.onNavigateToDetails!("details-section-3-effective-interest-rate")}
            style={{ padding: 0, border: "none", background: "none", cursor: "pointer", font: "inherit", fontWeight: 700, color: "inherit", textDecoration: "underline" }}
          >
            Effective interest rate:{" "}
          </button>
        ) : (
          <span style={{ fontWeight: 700 }}>Effective interest rate: </span>
        )}
        <span style={{ fontWeight: 900 }}>{formatPct(liveRate)}</span>
        <InfoTooltip
          width={440}
          text={
            "Calculation caveats:\n\n" +
            "1. Financed amount includes add-ons: the effective interest rate is invalid if the financed figure contains insurance, repair package or other vehicle add-ons not part of the FBT base value. Their presence also makes comparison with other financiers invalid if they do not contain equivalent add-ons.\n\n" +
            "2. Residual value method mismatch: the two common residual value methods (Method 1: financed amount minus doc fee; Method 2: vehicle base cost before on-road) produce different dollar residuals for the same percentage. This means two financiers quoting the same effective interest rate are not directly comparable if they use different residual methods — a 9% rate under Method 1 is economically different from a 9% rate under Method 2.\n\n" +
            "3. GST not passed on: when GST is not passed on by the employer, the fortnightly lease charged is inc GST; however the effective interest rate calculation assumes this is the ex GST figure, which results in an inconsistent rate. This will be addressed in a future update.\n\n" +
            "4. Atypical lease structure (Smart Leasing / MillarX): this calculator assumes averaged payroll deductions across the lease term. Some providers structure quotes differently — for example, on a 5-year term there may be 59 actual lease rentals but 60 payroll deductions, with the extra deduction held as a refundable budget reserve for running costs. Entering the quoted figure directly will produce a misleading effective interest rate. Smart Leasing and MillarX customers: use the \"Smart Leasing / MillarX customer?\" adjustment tool above the lease input — it scales your quoted figure to the finance-only amount this calculator expects."
          }
        />

        <span style={{ display: "inline-flex", flexDirection: "column", marginLeft: 6, verticalAlign: "middle" }}>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              setHoveredArrow("up");
              startNudgeRepeat(1);
            }}
            onPointerUp={stopNudgeRepeat}
            onPointerCancel={stopNudgeRepeat}
            onPointerLeave={stopNudgeRepeat}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                nudgeRate(1);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
            title="Increase effective interest rate by 0.1%"
            aria-label="Increase effective interest rate"
            style={{
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              lineHeight: 0.8,
              fontSize: 11,
              color: hoveredArrow === "up" ? "var(--nlc-blue)" : "var(--nlc-text-muted)",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
            }}
          >
            ▲
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
              setHoveredArrow("down");
              startNudgeRepeat(-1);
            }}
            onPointerUp={stopNudgeRepeat}
            onPointerCancel={stopNudgeRepeat}
            onPointerLeave={stopNudgeRepeat}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                nudgeRate(-1);
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
            title="Decrease effective interest rate by 0.1%"
            aria-label="Decrease effective interest rate"
            style={{
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              lineHeight: 0.8,
              fontSize: 11,
              color: hoveredArrow === "down" ? "var(--nlc-blue)" : "var(--nlc-text-muted)",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
            }}
          >
            ▼
          </button>
        </span>

        {Number.isFinite(liveRate) && liveRate > 0.1 && (
          <div style={{ marginTop: 6, color: "var(--nlc-warn)", fontWeight: 600 }}>
            High rate — it may be worth checking whether your employer supports a{" "}
            <a href="/tools/byo-employer-check/" target="_blank" rel="noopener">
              self-managed (BYO) novated lease
            </a>
            , which typically carries a lower effective rate.
          </div>
        )}
      </div>
    </div>
  );
}
