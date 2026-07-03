import { useEffect, useState } from "react";
import type { Inputs } from "@engine/types";
import {
  effectiveAnnualRateFromFortnightlyLease,
  financedAmountExGstFromInputs,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "@engine/effectiveinterest";
import { CurrencyField } from "./ui/Field";

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
 * checking whether a BYO lease is available" even when accepted. The nudge
 * (±0.1%) stepper buttons from v1 are not ported — a smaller feature than the
 * guard itself and lower priority for this pass.
 */
export function LeaseRateGuard(props: { inputs: Inputs; setInputs: React.Dispatch<React.SetStateAction<Inputs>> }) {
  const { inputs, setInputs } = props;
  const [guardMsg, setGuardMsg] = useState("");

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

  function handleChange(next: number) {
    const clamped = Math.max(0, next);

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

  return (
    <div>
      <CurrencyField label="Fortnightly lease payment" value={inputs.vehicleLeasePerFn} onChange={handleChange} error={guardMsg || undefined} />
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
        <span style={{ fontWeight: 700 }}>Effective interest rate: </span>
        <span style={{ fontWeight: 900 }}>{formatPct(liveRate)}</span>

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
