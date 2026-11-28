import type { Inputs } from "@engine/types";
import { effectiveAnnualRateFromFortnightlyLease, financedAmountExGstFromInputs } from "@engine/effectiveinterest";

/**
 * The finance payment and GST.
 *
 * `vehicleLeasePerFn` is what the reader actually has taken from pre-tax pay for the finance. When the
 * employer passes on GST that is the ex GST payment. When it doesn't ("GST saving passed on: No"),
 * the reader pays the GST too, so the payment is held inc GST: the engine's totals then match what
 * leaves their pay.
 *
 * The financier still receives only the ex GST amount, so the finance rate itself is worked out from
 * the payment ÷ 1.1. The inc GST payment, read as though it were ex GST, gives a second, higher rate:
 * the rate at which a reader whose employer does pass on GST would pay the same amount.
 */
export function gstNotPassedOn(i: Pick<Inputs, "gstSavingPassedOn">): boolean {
  return i.gstSavingPassedOn === "No";
}

/** 1.1 when the finance payment is held inc GST, otherwise 1. */
export function paymentGstMult(i: Pick<Inputs, "gstSavingPassedOn">): number {
  return gstNotPassedOn(i) ? 1.1 : 1;
}

/** The finance payment per fortnight as the financier receives it (ex GST). */
export function financePaymentExGstPerFn(i: Inputs): number {
  return Math.max(0, i.vehicleLeasePerFn) / paymentGstMult(i);
}

function rateFor(i: Inputs, perFn: number): number {
  try {
    if (perFn <= 0) return NaN;
    return effectiveAnnualRateFromFortnightlyLease({
      financedAmountExGst: financedAmountExGstFromInputs(i),
      residualValueExGst: i.residualValueExGst,
      leaseYears: Math.max(1, Math.min(5, Math.round(i.leaseDurationYears))),
      deferMonths: Math.max(0, Math.round(i.monthsDeferred)),
      fortnightlyLeasePayment: perFn,
    });
  } catch {
    return NaN;
  }
}

/**
 * `rate`: the finance rate (from the ex GST payment).
 * `asIfPassedOn`: only when GST isn't passed on — the rate a reader whose employer passes on GST
 * would be paying for the same out-of-pocket amount; null otherwise or when it can't be worked out.
 */
export function leaseRates(i: Inputs): { rate: number; asIfPassedOn: number | null } {
  const rate = rateFor(i, financePaymentExGstPerFn(i));
  const asIf = gstNotPassedOn(i) ? rateFor(i, Math.max(0, i.vehicleLeasePerFn)) : NaN;
  return { rate, asIfPassedOn: Number.isFinite(asIf) ? asIf : null };
}

export const GST_NOT_PASSED_ARTICLE = "https://novatedlease.guide/costs-and-savings/gst-not-passed-on-inflates-eir/";
