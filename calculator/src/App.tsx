import { useEffect, useRef, useState } from "react";
import { LeaseReport } from "./components/LeaseReport";
import type { Inputs } from "./engine/types";
import { buildFyBreakdown } from "./engine/fy_breakdown";
import { FinancialReport } from "./components/FinancialReport";
import ATI from "./components/ATI";
import SG from "./components/SG";
import SummaryView from "./components/SummaryView";
import InputsPanel from "./components/InputsPanel";
import {
  effectiveAnnualRateFromFortnightlyLease,
  financedAmountExGstFromInputs,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "./engine/effectiveinterest";
import { residualPercentForYears } from "./engine/ato";


function estMarketValueFromDriveaway(driveawayCost: number): number {
  return Math.round((driveawayCost * 0.4) / 1000) * 1000;
}

function buildAtiRowsFromFyBreakdown(inputs: Inputs) {
  // Match LeaseReport's FY breakdown so ATI's "Taxable Income Post NL" aligns.
  const fortnights = Math.round(inputs.leaseDurationYears * 26);

  // LeaseReport includes ATO EV home charging shortcut (4.2c / km) in running costs.
  const assumedChargingClaimPerYear = inputs.annualMileageKm * 0.042;

  const runningCostAnnual =
    inputs.serviceMaintTyresAnnual +
    inputs.saveShareAnnual +
    inputs.registrationAnnual +
    inputs.insuranceAnnual +
    inputs.managementFeesAnnual +
    assumedChargingClaimPerYear;

  const runningCostFn = runningCostAnnual / 26;

  // LeaseReport's pre-tax total per fortnight used for FY allocation.
  const preTaxTotalFn = inputs.vehicleLeasePerFn + runningCostFn;

  const fyRows = buildFyBreakdown({
    inputs,
    fortnights,
    preTaxTotalFn,
  });

  return fyRows.map((r) => ({
    financialYearEnding: r.fy,
    taxableIncomePostNL: r.postNlTaxableIncome,
  }));
}

function buildSgRowsFromFyBreakdown(inputs: Inputs) {
  const fortnights = Math.round(inputs.leaseDurationYears * 26);

  const assumedChargingClaimPerYear = inputs.annualMileageKm * 0.042;

  const runningCostAnnual =
    inputs.serviceMaintTyresAnnual +
    inputs.saveShareAnnual +
    inputs.registrationAnnual +
    inputs.insuranceAnnual +
    inputs.managementFeesAnnual +
    assumedChargingClaimPerYear;

  const runningCostFn = runningCostAnnual / 26;
  const preTaxTotalFn = inputs.vehicleLeasePerFn + runningCostFn;

  const fyRows = buildFyBreakdown({
    inputs,
    fortnights,
    preTaxTotalFn,
  });

  return fyRows.map((r) => ({
    financialYearEnding: r.fy,
    reducedPretaxIncome: r.originalTaxableIncome - r.postNlTaxableIncome,
  }));
}



type YesNo = "Yes" | "No";

type OutputTab = "Summary" | "Details";

function TabButton(props: {
  label: OutputTab;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.18)",
        background: props.active ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.02)",
        fontWeight: props.active ? 800 : 600,
        cursor: "pointer",
      }}
    >
      {props.label}
    </button>
  );
}




// ------------------------------
// URL state (shareable scenarios)
// ------------------------------

const URL_STATE_KEY = "c";
const URL_STATE_VERSION = 1;

type UrlStateV1 = { v: 1; inputs: Partial<Inputs> };

function toBase64Url(str: string): string {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padLen);
  return decodeURIComponent(escape(atob(padded)));
}

function isValidIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function safeNum(x: unknown, fallback: number): number {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function safeBool(x: unknown, fallback: boolean): boolean {
  return typeof x === "boolean" ? x : fallback;
}

function safeYesNo(x: unknown, fallback: YesNo): YesNo {
  return x === "Yes" || x === "No" ? x : fallback;
}

function safeVehicleCondition(
  x: unknown,
  fallback: Inputs["vehicleCondition"]
): Inputs["vehicleCondition"] {
  return x === "New" ||
    x === "Used – dealer sale (GST inc)" ||
    x === "Used – private sale (no GST)"
    ? x
    : fallback;
}

function coerceInputsFromUrl(partial: Partial<Inputs>, defaults: Inputs): Inputs {
  return {
    ...defaults,

    vehicleCondition: safeVehicleCondition(partial.vehicleCondition, defaults.vehicleCondition),
    vehicleBaseValue: safeNum(partial.vehicleBaseValue, defaults.vehicleBaseValue),
    driveawayCost: safeNum(partial.driveawayCost, defaults.driveawayCost),
    estimatedMarketValueAtEnd: safeNum(partial.estimatedMarketValueAtEnd, defaults.estimatedMarketValueAtEnd),
    annualMileageKm: safeNum(partial.annualMileageKm, defaults.annualMileageKm),

    leaseDocFee: safeNum(partial.leaseDocFee, defaults.leaseDocFee),
    leaseStartDate: isValidIsoDate(partial.leaseStartDate) ? partial.leaseStartDate : defaults.leaseStartDate,
    leaseDurationYears: safeNum(partial.leaseDurationYears, defaults.leaseDurationYears),
    monthsDeferred: safeNum((partial as any).monthsDeferred, defaults.monthsDeferred),

    totalTaxableIncome: safeNum(partial.totalTaxableIncome, defaults.totalTaxableIncome),
    homeLoanOffsetInterestRate: safeNum(partial.homeLoanOffsetInterestRate, defaults.homeLoanOffsetInterestRate),

    vehicleLeasePerFn: safeNum(partial.vehicleLeasePerFn, defaults.vehicleLeasePerFn),
    luxuryVehicleAdjPerFn: safeNum(partial.luxuryVehicleAdjPerFn, defaults.luxuryVehicleAdjPerFn),
    financedAmountForInterestCalcExGst: safeNum(
      (partial as any).financedAmountForInterestCalcExGst,
      defaults.financedAmountForInterestCalcExGst
    ),

    superFromPreNlIncome: safeYesNo(partial.superFromPreNlIncome, defaults.superFromPreNlIncome),
    gstSavingPassedOn: safeYesNo(partial.gstSavingPassedOn, defaults.gstSavingPassedOn),

    serviceMaintTyresAnnual: safeNum(partial.serviceMaintTyresAnnual, defaults.serviceMaintTyresAnnual),
    saveShareAnnual: safeNum(partial.saveShareAnnual, defaults.saveShareAnnual),
    registrationAnnual: safeNum(partial.registrationAnnual, defaults.registrationAnnual),
    electricityAnnual: safeNum(partial.electricityAnnual, defaults.electricityAnnual),
    insuranceAnnual: safeNum(partial.insuranceAnnual, defaults.insuranceAnnual),
    managementFeesAnnual: safeNum(partial.managementFeesAnnual, defaults.managementFeesAnnual),

    avgAudPerKwh: safeNum(partial.avgAudPerKwh, defaults.avgAudPerKwh),
    avgWhPerKm: safeNum(partial.avgWhPerKm, defaults.avgWhPerKm),
    overrideAnnualChargingExpense:
      partial.overrideAnnualChargingExpense === undefined || partial.overrideAnnualChargingExpense === null
        ? undefined
        : safeNum(partial.overrideAnnualChargingExpense, defaults.overrideAnnualChargingExpense ?? 0),

    compareWithCarLoan: safeBool(partial.compareWithCarLoan, defaults.compareWithCarLoan),
    carLoanInitialDeposit: safeNum(partial.carLoanInitialDeposit, defaults.carLoanInitialDeposit),
    carLoanInterestRatePct: safeNum(partial.carLoanInterestRatePct, defaults.carLoanInterestRatePct),
    carLoanMonthlyFee: safeNum(partial.carLoanMonthlyFee, defaults.carLoanMonthlyFee),

    compareWithCurrentCar: safeBool(partial.compareWithCurrentCar, defaults.compareWithCurrentCar),
    currentCarMarketValueNow: safeNum(partial.currentCarMarketValueNow, defaults.currentCarMarketValueNow),
    currentCarMarketValueAtEnd: safeNum(partial.currentCarMarketValueAtEnd, defaults.currentCarMarketValueAtEnd),

    currentServiceMaintTyresAnnual: safeNum(partial.currentServiceMaintTyresAnnual, defaults.currentServiceMaintTyresAnnual),
    currentRegistrationAnnual: safeNum(partial.currentRegistrationAnnual, defaults.currentRegistrationAnnual),
    currentFuelAnnual: safeNum(partial.currentFuelAnnual, defaults.currentFuelAnnual),
    currentInsuranceAnnual: safeNum(partial.currentInsuranceAnnual, defaults.currentInsuranceAnnual),
  };
}

function readInputsFromUrl(defaults: Inputs): { inputs: Inputs; encoded: string | null } {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(URL_STATE_KEY);
    if (!encoded) return { inputs: defaults, encoded: null };

    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json) as UrlStateV1;

    if (!parsed || parsed.v !== URL_STATE_VERSION || typeof parsed.inputs !== "object" || parsed.inputs === null) {
      return { inputs: defaults, encoded: null };
    }

    const next = coerceInputsFromUrl(parsed.inputs as Partial<Inputs>, defaults);
    return { inputs: next, encoded };
  } catch {
    return { inputs: defaults, encoded: null };
  }
}

function encodeInputsToUrlParam(inputs: Inputs): string {
  const payload: UrlStateV1 = { v: 1, inputs };
  return toBase64Url(JSON.stringify(payload));
}

export default function App() {
  const defaultInputs: Inputs = (() => {
    const base: Inputs = {
    vehicleCondition: "New",
    vehicleBaseValue: 75500,
    driveawayCost: 81422.5,
    estimatedMarketValueAtEnd: estMarketValueFromDriveaway(81422.5),
    annualMileageKm: 15000,

    leaseDocFee: 450,
    leaseStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    leaseDurationYears: 5,
    monthsDeferred: 2,

    totalTaxableIncome: 300000,
    homeLoanOffsetInterestRate: 6.1,

    vehicleLeasePerFn: 597.47,
    luxuryVehicleAdjPerFn: 0,
    financedAmountForInterestCalcExGst: 0,

    superFromPreNlIncome: "Yes",
    gstSavingPassedOn: "Yes",

    serviceMaintTyresAnnual: 100,
    saveShareAnnual: 0,
    registrationAnnual: 984.88,
    electricityAnnual: 630,
    insuranceAnnual: 1300,
    managementFeesAnnual: 516.88,

    avgAudPerKwh: 0.15,
    avgWhPerKm: 165,
    overrideAnnualChargingExpense: undefined,

    compareWithCarLoan: false,
    carLoanInitialDeposit: 10000,
    carLoanInterestRatePct: 6.0,
    carLoanMonthlyFee: 25,

    compareWithCurrentCar: false,
    currentCarMarketValueNow: 25000,
    currentCarMarketValueAtEnd: 14000,

    currentServiceMaintTyresAnnual: 800,
    currentRegistrationAnnual: 900,
    currentFuelAnnual: 2362.5,
    currentInsuranceAnnual: 1000,
    };

    return {
      ...base,
      financedAmountForInterestCalcExGst: financedAmountExGstFromInputs(base),
    };
  })();

  const urlInitRef = useRef<{ encoded: string | null }>({ encoded: null });
  const lastAutoFinancedRef = useRef<number | null>(null);

  const [inputs, setInputs] = useState<Inputs>(() => {
    const { inputs: initial, encoded } = readInputsFromUrl(defaultInputs);
    urlInitRef.current.encoded = encoded;
    return initial;
  });



  // If user arrived via a share URL (?c=...), we load it on first render via the useState initializer,
  // then immediately clean the address bar (remove only the `c` param).
  useEffect(() => {
    if (!urlInitRef.current.encoded) return;

    const params = new URLSearchParams(window.location.search);
    if (!params.has(URL_STATE_KEY)) return;

    params.delete(URL_STATE_KEY);

    const qs = params.toString();
    const nextUrl =
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;

    window.history.replaceState({}, "", nextUrl);
  }, []);

  const [outputTab, setOutputTab] = useState<OutputTab>("Summary");


  const [copiedLink, setCopiedLink] = useState(false);

  async function copyShareLink() {
    try {
      const encoded = encodeInputsToUrlParam(inputs);

      const params = new URLSearchParams(window.location.search);
      params.set(URL_STATE_KEY, encoded);

      const shareUrl =
        window.location.origin +
        window.location.pathname +
        "?" +
        params.toString() +
        window.location.hash;

      const url = shareUrl;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1200);
    } catch {
      // If clipboard fails, do nothing (silent)
    }
  }

  useEffect(() => {
    const desired = estMarketValueFromDriveaway(inputs.driveawayCost);
    if (inputs.estimatedMarketValueAtEnd !== desired) {
      setInputs((p) => ({ ...p, estimatedMarketValueAtEnd: desired }));
    }
  }, [inputs.driveawayCost]);

  // Keep "Financed amount (for interest calc)" in sync with the standard calculation,
  // but only until the user manually overrides it.
  useEffect(() => {
    const auto = financedAmountExGstFromInputs(inputs);
    const cur = inputs.financedAmountForInterestCalcExGst;
    const lastAuto = lastAutoFinancedRef.current;

    const withinCent = (a: number, b: number) => Math.abs(a - b) < 0.01;

    const shouldSync =
      cur === 0 ||
      (lastAuto !== null && withinCent(cur, lastAuto)) ||
      (lastAuto === null && withinCent(cur, auto));

    if (shouldSync && !withinCent(cur, auto)) {
      setInputs((p) => ({ ...p, financedAmountForInterestCalcExGst: auto }));
    }

    lastAutoFinancedRef.current = auto;
  }, [
    inputs.vehicleCondition,
    inputs.vehicleBaseValue,
    inputs.driveawayCost,
    inputs.leaseDocFee,
    inputs.financedAmountForInterestCalcExGst,
  ]);

  // ------------------------------
  // Lease quote safeguard + live hint (Definition 1)
  // ------------------------------

  const [leaseQuoteGuardMsg, setLeaseQuoteGuardMsg] = useState<string>("");

  function normalizedResidualPctForYears(years: number): number {
    const residualPctRaw = residualPercentForYears(years);
    let residualPct = residualPctRaw > 1 ? residualPctRaw / 100 : residualPctRaw;
    // Guard against double scaling (e.g. 0.002813 instead of 0.2813)
    if (residualPct > 0 && residualPct < 0.01) residualPct *= 100;
    return residualPct;
  }

  // Definition 1 basis (same idea as Section 4)
  const guardLeaseYears = Math.max(1, Math.min(5, Math.round(inputs.leaseDurationYears)));
  const guardDeferMonths = Math.max(0, Math.round(inputs.monthsDeferred));

  const guardFinancedStandardExGst = financedAmountExGstFromInputs(inputs);
  const guardResidualPct = normalizedResidualPctForYears(guardLeaseYears);
  const guardResidualStandardExGst =
    Math.max(0, guardFinancedStandardExGst - inputs.leaseDocFee) * guardResidualPct;

  // Compute the live “equivalent effective rate” from the current input (Definition 1)
  const guardTotalLeaseFn = Math.max(0, inputs.vehicleLeasePerFn);

  const guardLiveRate = (() => {
    try {
      return effectiveAnnualRateFromFortnightlyLease({
        financedAmountExGst: guardFinancedStandardExGst,
        residualValueExGst: guardResidualStandardExGst,
        leaseYears: guardLeaseYears,
        deferMonths: guardDeferMonths,
        fortnightlyLeasePayment: guardTotalLeaseFn,
      });
    } catch {
      return NaN;
    }
  })();

  // Allowed range: based on Definition 1 and total lease per fn (vehicle only)
  // Min rate 0.1% p.a. and max rate 30% p.a.
  const guardMinTotalLeaseFn = (() => {
    try {
      return fortnightlyLeaseFromEffectiveAnnualRate({
        financedAmountExGst: guardFinancedStandardExGst,
        residualValueExGst: guardResidualStandardExGst,
        leaseYears: guardLeaseYears,
        deferMonths: guardDeferMonths,
        effectiveAnnualRate: 0.001,
      });
    } catch {
      return NaN;
    }
  })();

  const guardMaxTotalLeaseFn = (() => {
    try {
      return fortnightlyLeaseFromEffectiveAnnualRate({
        financedAmountExGst: guardFinancedStandardExGst,
        residualValueExGst: guardResidualStandardExGst,
        leaseYears: guardLeaseYears,
        deferMonths: guardDeferMonths,
        effectiveAnnualRate: 0.3,
      });
    } catch {
      return NaN;
    }
  })();

  // Convert total range to a range for *vehicleLeasePerFn* (no luxury adj)
  const guardMinVehicleLeaseFn = guardMinTotalLeaseFn;
  const guardMaxVehicleLeaseFn = guardMaxTotalLeaseFn;

  function formatPct(x: number): string {
    return Number.isFinite(x) ? `${(x * 100).toFixed(2)}%` : "—";
  }

  function formatMoney(x: number): string {
    return `$ ${x.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function handleVehicleLeasePerFnChange(nextVehicleLeasePerFn: number) {
    const next = Math.max(0, nextVehicleLeasePerFn);

    // If we cannot compute bounds, allow the change.
    if (!Number.isFinite(guardMinVehicleLeaseFn) || !Number.isFinite(guardMaxVehicleLeaseFn)) {
      setInputs((p) => ({ ...p, vehicleLeasePerFn: next }));
      setLeaseQuoteGuardMsg("");
      return;
    }

    if (next < guardMinVehicleLeaseFn || next > guardMaxVehicleLeaseFn) {
      // Reject change and keep previous value.
      setLeaseQuoteGuardMsg(
        `Rejected: outside plausible range (${formatMoney(guardMinVehicleLeaseFn)} to ${formatMoney(
          guardMaxVehicleLeaseFn
        )}) given 0.1%–30% effective rate (Definition 1).`
      );
      return;
    }

    setInputs((p) => ({ ...p, vehicleLeasePerFn: next }));
    setLeaseQuoteGuardMsg("");
  }

  return (
  <div
    id="nl-calculator-root"
    style={{
      width: "100%",
      fontFamily:
        '"Roboto","Helvetica Neue",Helvetica,Arial,sans-serif',
      fontSize: 16,
      lineHeight: 1.65,
      color: "rgba(0,0,0,0.9)",
    }}
  >
      <h1 style={{ marginBottom: 8 }}>Novated Lease Calculator</h1>

      <div
        className="nl-layout"
        style={{
          display: "grid",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Inputs */}
        <div
          className="nl-col nl-left"
          style={{
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <InputsPanel
            inputs={inputs}
            setInputs={setInputs}
            onVehicleLeasePerFnChange={handleVehicleLeasePerFnChange}
            guardLiveRatePct={Number.isFinite(guardLiveRate) ? guardLiveRate  : NaN}
            guardMessage={leaseQuoteGuardMsg}
            formatPct={formatPct}
          />
        </div>

        {/* Outputs */}
        <div
          className="nl-col nl-right"
          style={{
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          {/* Output tabs */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              Outputs
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={copyShareLink}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: copiedLink ? "rgba(11, 92, 171, 0.12)" : "rgba(0,0,0,0.02)",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Copy a link that includes all your inputs"
              >
                {copiedLink ? "Copied!" : "Copy share link"}
              </button>

              <TabButton
                label="Summary"
                active={outputTab === "Summary"}
                onClick={() => setOutputTab("Summary")}
              />
              <TabButton
                label="Details"
                active={outputTab === "Details"}
                onClick={() => setOutputTab("Details")}
              />
            </div>
          </div>

          {outputTab === "Summary" ? (
            <SummaryView inputs={inputs} />
          ) : (
            <>
              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <LeaseReport inputs={inputs} taxRateInclMedicarePct={47} />
              </div>

              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                }}
              >
                <FinancialReport inputs={inputs} taxRateInclMedicarePct={47} />
              </div>

              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                }}
              >
                <ATI
                  originalTaxableIncomePreNL={inputs.totalTaxableIncome}
                  leaseStartDate={new Date(inputs.leaseStartDate)}
                  leaseTermYears={inputs.leaseDurationYears}
                  fbtBaseValue={inputs.vehicleBaseValue}
                  rows={buildAtiRowsFromFyBreakdown(inputs)}
                />
              </div>

              <div
                style={{
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>
                  SECTION 4: WHAT IS MY EFFECTIVE INTEREST RATE?
                </div>

                {(() => {
  let debug: any = null;
  try {
    const years = Math.round(inputs.leaseDurationYears);

    const residualPctRaw = residualPercentForYears(years);
    let residualPct = residualPctRaw > 1 ? residualPctRaw / 100 : residualPctRaw;
    // Defensive normalisation: guard against double-scaling (e.g. 0.002813 instead of 0.2813)
    if (residualPct > 0 && residualPct < 0.01) residualPct = residualPct * 100;

    // GST saved (cap $6,334; no GST if private used)
    const gstSavedLocal = (() => {
      const cap = 6334;
      if (inputs.vehicleCondition === "Used – private sale (no GST)") return 0;
      const gross = Math.max(0, inputs.vehicleBaseValue);
      return Math.min(cap, gross / 11);
    })();

    const money = (n: number) =>
      `$ ${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const pct = (rAnnual: number) =>
      Number.isFinite(rAnnual) ? `${(rAnnual * 100).toFixed(2)}%` : "—";

    // Definition 1 uses "standard financed" based on driveaway + doc fee - gst saved
    const financedStandardExGst = financedAmountExGstFromInputs(inputs);

    // IMPORTANT: For Section 4, we want the residual value payable **ex GST**.
    // Keep the residual % scaling consistent with Definition 2 (which is already correct).
    // financedStandardExGst is treated as the financed amount INCLUDING doc fee (ex GST),
    // so the residual is computed off (financed - doc fee), per the existing pattern.
    const residualStandardExGst =
      Math.max(0, financedStandardExGst - inputs.leaseDocFee) * residualPct;

    // Definition 2 uses a "brokerage-inflated financed amount reported by NL providers" 
    const financedInflatedProxyExGst = Math.max(0, inputs.driveawayCost - gstSavedLocal) + inputs.leaseDocFee;

    const financedInflatedExGst =
      inputs.financedAmountForInterestCalcExGst > 0
      ? Math.max(0, inputs.financedAmountForInterestCalcExGst)
      : financedInflatedProxyExGst;
    const residualInflatedExGst = Math.max(0, financedStandardExGst - inputs.leaseDocFee) * residualPct;

    const leaseFn = Math.max(0, inputs.vehicleLeasePerFn);
    const mgmtFeeFn = Math.max(0, inputs.managementFeesAnnual / 26);

    // Wired from inputs.monthsDeferred
    const deferMonths = Math.max(0, Math.round(inputs.monthsDeferred));
    const noSolutionNote = "(no numerical solution for these inputs)";

    // Debug helper and debug object
    const n2 = (n: number) =>
      Number.isFinite(n) ? Number(n.toFixed(2)) : n;

    debug = {
      leaseYears: years,
      deferMonths,
      residualPct,
      vehicleCondition: inputs.vehicleCondition,
      gstSavedLocal: n2(gstSavedLocal),
      leaseFn: n2(leaseFn),
      mgmtFeeFn: n2(mgmtFeeFn),
      definition1: {
        financedAmountExGst: n2(financedStandardExGst),
        residualValueExGst: n2(residualStandardExGst),
        fortnightlyLeasePayment: n2(leaseFn),
      },
      definition1a: {
        financedAmountExGst: n2(financedStandardExGst),
        residualValueExGst: n2(residualStandardExGst),
        fortnightlyLeasePayment: n2(leaseFn + mgmtFeeFn),
      },
      definition2: {
        usedUserProvidedFinancedAmount: inputs.financedAmountForInterestCalcExGst > 0,
        financedAmountExGst: n2(financedInflatedExGst),
        residualValueExGst: n2(residualInflatedExGst),
        fortnightlyLeasePayment: n2(leaseFn),
      },
    };

    const DebugPanel = () => (
      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, opacity: 0.9 }}>
          Show variables used in the effective-interest calculation
        </summary>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
          <div style={{ marginBottom: 8, opacity: 0.75 }}>
            Tip: if you see “Payment too low (even at 0% rate)”, compare your payment against these values.
          </div>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
              padding: 10,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "rgba(0,0,0,0.03)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            }}
          >
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      </details>
    );

    const rateDef1 = effectiveAnnualRateFromFortnightlyLease({
      financedAmountExGst: financedStandardExGst,
      residualValueExGst: residualStandardExGst,
      leaseYears: years,
      deferMonths,
      fortnightlyLeasePayment: leaseFn,
    });

    const rateDef1a = effectiveAnnualRateFromFortnightlyLease({
      financedAmountExGst: financedStandardExGst,
      residualValueExGst: residualStandardExGst,
      leaseYears: years,
      deferMonths,
      fortnightlyLeasePayment: leaseFn + mgmtFeeFn,
    });

    const rateDef2 = effectiveAnnualRateFromFortnightlyLease({
      financedAmountExGst: financedInflatedExGst,
      residualValueExGst: residualInflatedExGst,
      leaseYears: years,
      deferMonths,
      fortnightlyLeasePayment: leaseFn,
    });

    const BlockTitle = (p: { children: React.ReactNode }) => (
      <div
        style={{
          fontWeight: 800,
          marginTop: 14,
          marginBottom: 6,
          background: "rgba(0,0,0,0.06)",
          padding: "6px 10px",
        }}
      >
        {p.children}
      </div>
    );

    const Row = (p: { label: string; value: string; note?: string }) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "baseline",
          padding: "3px 0",
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {p.label}
          {p.note ? (
            <span
              style={{
                marginLeft: 8,
                fontWeight: 400,
                opacity: 0.7,
                fontStyle: "italic",
              }}
            >
              {p.note}
            </span>
          ) : null}
        </div>
        <div style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{p.value}</div>
      </div>
    );

    return (
      <div>
        <BlockTitle>
          Definition 1: Using standard calculations, not considering management fees (most common definition)
        </BlockTitle>
        <div style={{ fontSize: 12, opacity: 0.75, fontStyle: "italic", marginTop: 4 }}>
          * This is the closest approximation of "if we pretend this as a loan; what interest rate would result in an amortisation schedule that starts from financed amount and ends with residual value"
        </div>
        <div style={{ marginTop: 8 }}>
          <Row label="Financed Amount from standard calculations" value={money(financedStandardExGst)} />
          <Row label="Residual Value Payable (ex GST)" value={money(residualStandardExGst)} />
          <Row label="Fortnightly lease" value={money(leaseFn)} />
        </div>
        <div style={{ marginTop: 8, fontWeight: 900 }}>
          Effective interest rate&nbsp;&nbsp;{pct(rateDef1)}
          {!Number.isFinite(rateDef1) ? (
            <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.75, fontStyle: "italic" }}>
              {noSolutionNote}
            </span>
          ) : null}
        </div>

        <BlockTitle>
          Definition 1a: Standard calculations, but treat fortnightly lease + management fee as the “true lease amount"
        </BlockTitle>
        <div style={{ fontSize: 12, opacity: 0.75, fontStyle: "italic", marginTop: 4 }}>
          * Useful for comparing quotes because it captures fees embedded as “running cost”.
        </div>
        <div style={{ marginTop: 8 }}>
          <Row label="Financed Amount from standard calculations" value={money(financedStandardExGst)} />
          <Row label="Residual Value Payable (ex GST)" value={money(residualStandardExGst)} />
          <Row label="Fortnightly lease + Management fee" value={money(leaseFn + mgmtFeeFn)} />
        </div>
        <div style={{ marginTop: 8, fontWeight: 900 }}>
          Effective interest rate (incorporating fees)&nbsp;&nbsp;{pct(rateDef1a)}
          {!Number.isFinite(rateDef1a) ? (
            <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.75, fontStyle: "italic" }}>
              {noSolutionNote}
            </span>
          ) : null}
        </div>

        <BlockTitle>
          Definition 2: Using brokerage-inflated financed amount, not considering management fees
        </BlockTitle>
        <div style={{ fontSize: 12, opacity: 0.75, fontStyle: "italic", marginTop: 4 }}>
          * This can look misleadingly low if the financed amount is inflated (a common quoting trick).
        </div>
        <div style={{ marginTop: 8 }}>
          <Row
            label="Financed Amount that includes brokerage inflation"
            value={money(financedInflatedExGst)}
          />
          <Row label="Residual Value Payable (ex GST)" value={money(residualInflatedExGst)} />
          <Row label="Fortnightly lease" value={money(leaseFn)} />
        </div>
        <div style={{ marginTop: 8, fontWeight: 900 }}>
          Effective interest rate (using inflated financed amount)&nbsp;&nbsp;{pct(rateDef2)}
          {!Number.isFinite(rateDef2) ? (
            <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.75, fontStyle: "italic" }}>
              {noSolutionNote}
            </span>
          ) : null}
        </div>
        {/* Debug panel at the very end */}
        <DebugPanel />
      </div>
    );
  } catch (e) {
    console.error("Section 4 effective interest render failed", e);
    const msg =
      e instanceof Error
        ? e.message
        : typeof e === "string"
          ? e
          : JSON.stringify(e);

    return (
      <div
        style={{
          padding: 10,
          border: "1px solid rgba(200,0,0,0.35)",
          borderRadius: 10,
          background: "rgba(200,0,0,0.06)",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Section 4 error</div>
        <div style={{ opacity: 0.9, marginBottom: 6 }}>
          Something went wrong while computing the effective interest rate.
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85 }}>
          {msg}
        </div>
        {debug ? (
          <details style={{ marginTop: 10 }} open>
            <summary style={{ cursor: "pointer", fontWeight: 700, opacity: 0.9 }}>
              Variables used in Section 4
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                marginTop: 8,
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.15)",
                background: "rgba(0,0,0,0.03)",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: 12,
                opacity: 0.9,
              }}
            >
              {JSON.stringify(debug, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }
})()}
              </div>

              {inputs.superFromPreNlIncome === "No" && (
                <div
                  style={{
                    border: "1px solid rgba(0,0,0,0.15)",
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 16,
                  }}
                >
                  <SG rows={buildSgRowsFromFyBreakdown(inputs)} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}