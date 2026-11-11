import {
  effectiveAnnualRateFromFortnightlyLease,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "@engine/effectiveinterest";
import type { Period } from "./draft";

export type Level = "error" | "warn" | "info" | "ok";
export type Finding = {
  /** Stable id, used for analytics so we can see which mistakes readers actually make. */
  code: string;
  level: Level;
  message: string;
  link?: { href: string; label: string };
};

const GST = 1.1;
const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

// ─── Price step ─────────────────────────────────────────────────────────────

export function checkPrices(
  base: number | null,
  driveaway: number | null,
): Finding[] {
  if (!base || !driveaway) return [];
  const out: Finding[] = [];
  const ratio = driveaway / base;
  if (ratio < 1) {
    out.push({
      code: "base_exceeds_driveaway",
      level: "error",
      message: `The FBT base value (${fmt(base)}) is higher than the drive-away price (${fmt(driveaway)}). Drive-away is the bigger number because it adds stamp duty, registration and CTP on top. Check you haven't swapped the two boxes.`,
    });
  } else if (ratio < 1.01) {
    out.push({
      code: "base_equals_driveaway",
      level: "warn",
      message:
        "These two figures are almost identical. Drive-away should be noticeably higher than the FBT base value because it adds stamp duty, registration and CTP. Did you type the same number twice?",
    });
  } else if (ratio > 1.2) {
    out.push({
      code: "base_looks_ex_gst",
      level: "warn",
      message: `Drive-away is ${Math.round((ratio - 1) * 100)}% above the FBT base value, which is more than usual. The FBT base value includes GST, so check you haven't entered the price before GST.`,
    });
  }
  return out;
}

// ─── Lease step ─────────────────────────────────────────────────────────────

export function checkDocFee(fee: number | null): Finding[] {
  if (fee === null) return [];
  if (fee > 1500) {
    return [
      {
        code: "doc_fee_high",
        level: "warn",
        message: `${fmt(fee)} is a lot for a documentation fee, which is usually a few hundred dollars. Make sure this isn't the amount financed, a management fee, or an add-on.`,
      },
    ];
  }
  return [];
}

export function checkMarketValueEnd(opts: {
  value: number | null;
  driveaway: number | null;
  years: number | null;
}): Finding[] {
  const { value, driveaway, years } = opts;
  if (!value || !driveaway || !years) return [];
  if (value >= driveaway) {
    return [
      {
        code: "market_value_above_price",
        level: "error",
        message: `${fmt(value)} is not below the drive-away price of ${fmt(driveaway)}. This is what the car would be worth when the lease ends, which is less than you paid for it.`,
      },
    ];
  }
  const ratio = value / driveaway;
  if (ratio > 0.9 || ratio < 0.1) {
    return [
      {
        code: "market_value_implausible",
        level: "warn",
        message: `That is ${Math.round(ratio * 100)}% of the drive-away price after ${years} year${years > 1 ? "s" : ""}, which is an unusual amount of depreciation. Check it is the value at the end of the lease, not the amount you paid or still owe.`,
      },
    ];
  }
  return [];
}

export function checkResidual(opts: {
  entered: number | null;
  basis: "exGst" | "incGst" | "unknown" | null;
  expectedExGst: number | null;
}): Finding[] {
  const { entered, basis, expectedExGst } = opts;
  if (!entered || !expectedExGst || !basis || basis === "unknown") return [];
  const out: Finding[] = [];
  const exEntered = basis === "incGst" ? entered / GST : entered;
  const r = exEntered / expectedExGst;
  const expIncGst = expectedExGst * GST;

  if (basis === "exGst") {
    // Closer (in ratio terms) to the inc-GST figure than to the ex-GST one, and not wildly off.
    if (r > Math.sqrt(GST) && r < 1.2) {
      out.push({
        code: "residual_looks_inc_gst",
        level: "warn",
        message: `You said this is ex GST, but ${fmt(entered)} is much closer to the ATO figure including GST (about ${fmt(expIncGst)}) than excluding it (about ${fmt(expectedExGst)}). Quotes usually print the residual inc GST. Check the label, and switch to "inc GST" if that's what yours says.`,
      });
      return out;
    }
  } else if (r < 0.93 && r > 0.7) {
    out.push({
      code: "residual_looks_ex_gst",
      level: "warn",
      message: `You said this is inc GST, but ${fmt(entered)} is lower than we'd expect for an inc GST figure (about ${fmt(expIncGst)}). If your quote says "ex GST" or "plus GST", switch the selection above.`,
    });
    return out;
  }

  if (r < 0.7 || r > 1.3) {
    out.push({
      code: "residual_far_from_ato",
      level: "warn",
      message: `Leases normally use the ATO minimum residual for the term, which for this car works out to about ${fmt(expectedExGst)} ex GST (${fmt(expIncGst)} inc GST). Yours is quite different, so check the lease term and the figure you copied.`,
    });
  }
  return out;
}

// ─── Payment step ───────────────────────────────────────────────────────────

export type PaymentDiagnosis = {
  rate: number | null;
  status: "empty" | "tooLow" | "tooHigh" | "ok";
  findings: Finding[];
};

type PaymentArgs = {
  financedExGst: number;
  residualExGst: number;
  leaseYears: number;
  deferMonths: number;
};

const MIN_RATE = 0.001;
const MAX_RATE = 0.3;

function rateFor(
  a: PaymentArgs,
  perFn: number,
): { rate: number | null; status: "tooLow" | "tooHigh" | "ok" } {
  try {
    const base = {
      financedAmountExGst: a.financedExGst,
      residualValueExGst: a.residualExGst,
      leaseYears: a.leaseYears,
      deferMonths: a.deferMonths,
    };
    const minFn = fortnightlyLeaseFromEffectiveAnnualRate({
      ...base,
      effectiveAnnualRate: MIN_RATE,
    });
    const maxFn = fortnightlyLeaseFromEffectiveAnnualRate({
      ...base,
      effectiveAnnualRate: MAX_RATE,
    });
    if (perFn < minFn) return { rate: null, status: "tooLow" };
    if (perFn > maxFn) return { rate: null, status: "tooHigh" };
    const rate = effectiveAnnualRateFromFortnightlyLease({
      ...base,
      fortnightlyLeasePayment: perFn,
    });
    return { rate, status: "ok" };
  } catch {
    return { rate: null, status: "tooLow" };
  }
}

// Kept here rather than imported from draft.ts, which imports this file.
const PER_YEAR: Record<Period, number> = { perWeek: 52, perFn: 26, perMonth: 12, perYear: 1 };
const toPerFn = (v: number, p: Period) => (v * PER_YEAR[p]) / 26;
const PERIOD_ADJ: Record<Period, string> = { perWeek: "a weekly", perFn: "a fortnightly", perMonth: "a monthly", perYear: "a yearly" };
/** The periods a figure is most often mistaken for, most likely first. A yearly figure is hard to mistake. */
const LIKELY_PERIOD_SLIPS: Record<Period, Period[]> = {
  perWeek: ["perFn", "perMonth"],
  perFn: ["perMonth", "perWeek"],
  perMonth: ["perFn", "perWeek"],
  perYear: [],
};

const TYPICAL_LOW = 0.06;
const TYPICAL_HIGH = 0.14;
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

/**
 * Turns the payment into an effective interest rate and, when that rate is implausible, tests the
 * usual slips (the wrong period, e.g. monthly typed as fortnightly, or a GST-inclusive amount) to say what the
 * reader probably meant.
 */
export function diagnosePayment(
  a: PaymentArgs,
  typed: number | null,
  period: Period | null,
  basis: "exGst" | "incGst" | "unknown" | null = "exGst",
): PaymentDiagnosis {
  if (!typed || typed <= 0 || !period)
    return { rate: null, status: "empty", findings: [] };
  const incGst = basis === "incGst";
  // Per fortnight, ex GST, as the reader has labelled it.
  const perFn = toPerFn(typed, period) / (incGst ? GST : 1);
  const main = rateFor(a, perFn);
  const findings: Finding[] = [];

  const implausible =
    main.status !== "ok" ||
    (main.rate !== null && (main.rate < TYPICAL_LOW || main.rate > 0.15));
  if (implausible) {
    // What the typed figure would be per fortnight (ex GST) if the reader picked the wrong period.
    const others = LIKELY_PERIOD_SLIPS[period].map((p) => ({
      label: `${PERIOD_ADJ[p]} amount`,
      perFn: toPerFn(typed, p) / (incGst ? GST : 1),
    }));
    // The other GST reading: inc GST typed as ex (or unlabelled), or ex GST typed as inc.
    const gstFlip = incGst ? GST : 1 / GST;
    const otherGst = incGst ? "ex GST" : "inc GST";
    const tries: { label: string; code: string; perFn: number }[] = [
      ...others.map((o) => ({ label: o.label, code: "payment_wrong_period", perFn: o.perFn })),
      {
        label: otherGst,
        code: incGst ? "payment_looks_ex_gst" : "payment_looks_inc_gst",
        perFn: perFn * gstFlip,
      },
      ...others.map((o) => ({
        label: `${o.label} and ${otherGst}`,
        code: incGst ? "payment_wrong_period_ex_gst" : "payment_wrong_period_inc_gst",
        perFn: o.perFn * gstFlip,
      })),
    ];
    for (const t of tries) {
      const alt = rateFor(a, t.perFn);
      if (
        alt.rate !== null &&
        alt.rate >= TYPICAL_LOW &&
        alt.rate <= TYPICAL_HIGH
      ) {
        findings.push({
          code: t.code,
          level: main.status === "ok" ? "warn" : "error",
          message:
            main.status === "ok"
              ? `Entered as you've told us, this implies a ${pct(main.rate!)} effective rate, which is unusual. If your quote figure is actually ${t.label}, the rate would be a more typical ${pct(alt.rate)}. Please check the label on your quote.`
              : `This payment is outside any plausible range for this car. If the figure on your quote is actually ${t.label}, the rate would be a typical ${pct(alt.rate)}. Please check the label and the period and GST selections above.`,
        });
        break;
      }
    }
  }

  if (main.status === "tooLow") {
    if (findings.length === 0) {
      findings.push({
        code: "payment_too_low",
        level: "error",
        message:
          "This payment is too low to be a real lease for this car and residual (it would need an interest rate below 0.1%). It may be only part of the payment, or the price, term or residual above may be off.",
      });
    }
    return { rate: null, status: "tooLow", findings };
  }
  if (main.status === "tooHigh") {
    if (findings.length === 0) {
      findings.push({
        code: "payment_too_high",
        level: "error",
        message:
          "This payment is too high to be a real lease for this car and residual (it would need an interest rate above 30%). A common cause is typing the total package, which includes running costs, instead of the vehicle finance part only.",
      });
    }
    return { rate: null, status: "tooHigh", findings };
  }

  const rate = main.rate!;
  if (findings.length === 0) {
    if (rate < TYPICAL_LOW) {
      findings.push({
        code: "rate_unusually_low",
        level: "warn",
        message: `This implies an effective interest rate of ${pct(rate)}, which is lower than we'd expect. The lowest we have seen on a real novated lease is about 6%. Check the residual, the term and that the payment is the full finance portion.`,
      });
    } else if (rate > 0.1) {
      findings.push({
        code: "rate_high",
        level: "info",
        message: `This implies an effective interest rate of ${pct(rate)}. That's on the high side. A self-managed (BYO) novated lease from another financier often costs less.`,
        link: {
          href: "/tools/byo-employer-check/",
          label: "Check if your employer supports BYO",
        },
      });
    } else {
      findings.push({
        code: "rate_typical",
        level: "ok",
        message: `This implies an effective interest rate of ${pct(rate)}, within the range we commonly see in novated lease quotes.`,
      });
    }
  }
  return { rate, status: "ok", findings };
}

// ─── Running costs & you ────────────────────────────────────────────────────

export function checkAnnualCost(
  label: string,
  value: number | null,
  typical: number | null,
  /** The box only takes a yearly figure (the current car), so the slip is a monthly or fortnightly amount. */
  opts: { yearlyBox?: boolean; skipLow?: boolean } = {},
): Finding[] {
  if (value === null || value === 0 || !typical) return [];
  if (opts.yearlyBox) {
    if (!opts.skipLow && value < typical * 0.25)
      return [
        {
          code: `${label}_low`,
          level: "warn",
          message: `${fmt(value)} a year looks low (typical is around ${fmt(typical)}). This box takes a yearly figure, so check it isn't a monthly or fortnightly amount.`,
        },
      ];
    if (value > typical * 3)
      return [
        {
          code: `${label}_high`,
          level: "warn",
          message: `${fmt(value)} a year looks high (typical is around ${fmt(typical)}). Check the amount and that it isn't a total over several years.`,
        },
      ];
    return [];
  }
  if (value < typical * 0.25) {
    return [
      {
        code: `${label}_low`,
        level: "warn",
        message: `Over a full year that comes to ${fmt(value)}, which looks low (typical is around ${fmt(typical)}). Check the amount and that you picked the right period (fortnightly, monthly or yearly) above.`,
      },
    ];
  }
  if (value > typical * 3) {
    return [
      {
        code: `${label}_high`,
        level: "warn",
        message: `Over a full year that comes to ${fmt(value)}, which looks high (typical is around ${fmt(typical)}). Check the amount, that it isn't a multi-year total, and that you picked the right period (fortnightly, monthly or yearly) above.`,
      },
    ];
  }
  return [];
}

export function checkMileage(km: number | null): Finding[] {
  if (km === null || km === 0) return [];
  if (km < 3000) {
    return [
      {
        code: "km_low",
        level: "warn",
        message: `${km.toLocaleString("en-AU")} km a year is very low. Typical Australian driving is 10,000 to 15,000 km.`,
      },
    ];
  }
  if (km > 40000) {
    return [
      {
        code: "km_high",
        level: "warn",
        message: `${km.toLocaleString("en-AU")} km a year is very high. Check it's per year, not the lease total.`,
      },
    ];
  }
  return [];
}

export function checkIncome(income: number | null): Finding[] {
  if (income === null || income === 0) return [];
  if (income < 25000) {
    return [
      {
        code: "income_low",
        level: "warn",
        message: `${fmt(income)} looks low for an annual income. Enter the yearly amount, not a weekly, fortnightly or monthly pay.`,
      },
    ];
  }
  if (income > 1000000) {
    return [
      {
        code: "income_high",
        level: "warn",
        message: `${fmt(income)} looks very high. Check for an extra zero.`,
      },
    ];
  }
  return [];
}

export function checkRate(
  label: string,
  ratePct: number | null,
  max: number,
): Finding[] {
  if (ratePct === null || ratePct === 0) return [];
  if (ratePct > max) {
    return [
      {
        code: `${label}_rate_high`,
        level: "warn",
        message: `${ratePct}% is higher than expected. Enter the rate as a percentage, for example 6.1 for 6.1%.`,
      },
    ];
  }
  return [];
}

export function checkChargingRate(perKwh: number | null): Finding[] {
  if (perKwh === null || perKwh === 0) return [];
  if (perKwh >= 1) {
    return [
      {
        code: "charging_rate_cents",
        level: "warn",
        message: `$${perKwh} per kWh is unrealistic: charging costs well under $1 per kWh. Enter dollars, not cents, for example 0.30 for 30c per kWh.`,
      },
    ];
  }
  return [];
}

// ─── Estimate path, Smart Leasing / MillarX, current car ────────────────────

export function checkEvThresholdEstimate(
  near: { base: number; threshold: number; kind: "lct" | "cap" } | null,
): Finding[] {
  if (!near) return [];
  const what =
    near.kind === "lct"
      ? `the ${fmt(near.threshold)} Luxury Car Tax threshold for electric cars, above which the FBT exemption doesn't apply`
      : `the ${fmt(near.threshold)} cap for a full FBT exemption on leases starting from 1 April 2027`;
  return [
    {
      code: "ev_threshold_estimate",
      level: "warn",
      message: `We estimate the car's FBT base value at about ${fmt(near.base)} (drive-away ÷ 1.08), which is close to ${what}. Which side the real figure lands on changes the result a lot, so check the car's actual price before relying on this estimate.`,
    },
  ];
}

export function checkPaymentCorrected(opts: {
  smartMillarx: boolean | null;
  corrected: boolean;
  typed: number | null;
}): Finding[] {
  if (!opts.smartMillarx || opts.corrected || !opts.typed) return [];
  return [
    {
      code: "payment_not_corrected",
      level: "warn",
      message:
        "You said your lease is with Smart Leasing or MillarX, but this figure was typed rather than run through the correction tool above. Their quoted payment includes a budget buffer, so used as is it overstates the finance cost. Open the correction tool, unless you have already corrected it yourself.",
    },
  ];
}

/** Catches a dropped or extra zero in today's value of the reader's current car. */
export function checkCurrentCarValueNow(now: number | null, newCarDriveaway: number | null): Finding[] {
  if (!now) return [];
  if (now < 1000)
    return [
      {
        code: "current_value_now_low",
        level: "warn",
        message: `${fmt(now)} is very low for a car's resale value. Check for a missing zero. If the car really is worth that little, that's fine.`,
      },
    ];
  if (newCarDriveaway && now > newCarDriveaway * 1.5)
    return [
      {
        code: "current_value_now_high",
        level: "warn",
        message: `${fmt(now)} is well above the new car's drive-away price of ${fmt(newCarDriveaway)}. Check for an extra zero.`,
      },
    ];
  return [];
}

export function checkCurrentCarValueEnd(opts: {
  now: number | null;
  end: number | null;
  years: number | null;
}): Finding[] {
  const { now, end, years } = opts;
  if (!now || !end || !years) return [];
  if (end >= now) {
    return [
      {
        code: "current_value_end_not_lower",
        level: "error",
        message: `${fmt(end)} isn't below today's value of ${fmt(now)}. Cars lose value over time, so check the two boxes haven't been swapped.`,
      },
    ];
  }
  return [];
}
