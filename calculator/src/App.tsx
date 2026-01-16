import { useEffect, useRef, useState } from "react";
import { LeaseReport } from "./components/LeaseReport";
import type { Inputs } from "./engine/types";
import { buildFyBreakdown } from "./engine/fy_breakdown";
import { FinancialReport } from "./components/FinancialReport";
import { computeFinancialSummary } from "./components/FinancialReport";
import ATI from "./components/ATI";
import SG from "./components/SG";

function num(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function audInput(n: number): string {
  return `$ ${n.toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;
}

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

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{props.title}</div>
      <div style={{ display: "grid", gap: 10 }}>{props.children}</div>
    </div>
  );
}

function MoneyField(props: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  const isEditingRef = useRef(false);
  const [draft, setDraft] = useState<string>(String(props.value));

  // When external value changes, update the draft ONLY if user isn't typing.
  useEffect(() => {
    if (!isEditingRef.current) setDraft(String(props.value));
  }, [props.value]);

  function sanitizeMoneyInput(s: string): string {
    // Keep digits and a single decimal point.
    const cleaned = s.replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot === -1) return cleaned;
    return (
      cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "")
    );
  }

  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{props.label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={isEditingRef.current ? `$ ${draft}` : audInput(props.value)}
        onFocus={() => {
          isEditingRef.current = true;
          setDraft(String(props.value));
        }}
        onChange={(e) => {
          isEditingRef.current = true;
          const raw = e.target.value.replace(/^\$\s?/, "");
          setDraft(sanitizeMoneyInput(raw));
        }}
        onBlur={() => {
          isEditingRef.current = false;
          const v = num(draft);
          props.onChange(v);
          setDraft(String(v));
        }}
        style={{ width: "100%" }}
      />
    </label>
  );
}


function NumberField(props: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{props.label}</span>
      <input
        type="number"
        value={props.value}
        step={props.step}
        min={props.min}
        onChange={(e) => props.onChange(num(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

function LeaseDurationSelect(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{props.label}</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ width: "100%" }}
      >
        {[1, 2, 3, 4, 5].map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadOnlyValue(props: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{props.label}</span>
      <div
        style={{
          width: "100%",
          padding: "6px 8px",
          border: "1px solid rgba(0,0,0,0.2)",
          borderRadius: 6,
          background: "rgba(0,0,0,0.03)",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

function DateField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{props.label}</span>
      <input
        type="date"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{ width: "100%" }}
      />
    </label>
  );
}

function SelectYesNo(props: { label: string; value: YesNo; onChange: (v: YesNo) => void }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{props.label}</span>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as YesNo)}
        style={{ width: "100%" }}
      >
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </label>
  );
}

function SelectNewUsed(props: {
  label: string;
  value:
    | "New"
    | "Used – dealer sale (GST inc)"
    | "Used – private sale (no GST)";
  onChange: (
    v:
      | "New"
      | "Used – dealer sale (GST inc)"
      | "Used – private sale (no GST)"
  ) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{props.label}</span>
      <select
        value={props.value}
        onChange={(e) =>
          props.onChange(
            e.target.value as
              | "New"
              | "Used – dealer sale (GST inc)"
              | "Used – private sale (no GST)"
          )
        }
        style={{ width: "100%" }}
      >
        <option value="New">New</option>
        <option value="Used – dealer sale (GST inc)">Used – dealer sale (GST inc)</option>
        <option value="Used – private sale (no GST)">Used – private sale (no GST)</option>
      </select>
    </label>
  );
}



function fmtAud0(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
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

    totalTaxableIncome: safeNum(partial.totalTaxableIncome, defaults.totalTaxableIncome),
    homeLoanOffsetInterestRate: safeNum(partial.homeLoanOffsetInterestRate, defaults.homeLoanOffsetInterestRate),

    vehicleLeasePerFn: safeNum(partial.vehicleLeasePerFn, defaults.vehicleLeasePerFn),
    luxuryVehicleAdjPerFn: safeNum(partial.luxuryVehicleAdjPerFn, defaults.luxuryVehicleAdjPerFn),

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
  const defaultInputs: Inputs = {
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

    totalTaxableIncome: 300000,
    homeLoanOffsetInterestRate: 6.1,

    vehicleLeasePerFn: 597.47,
    luxuryVehicleAdjPerFn: 0,

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

  const urlInitRef = useRef<{ encoded: string | null }>({ encoded: null });

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

  return (
  <div id="nl-calculator-root" style={{ width: "100%" }}>
      <h1 style={{ marginBottom: 8 }}>Novated Lease Calculator (WIP)</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        This is a development shell. The numbers are stubbed.
      </p>

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
          <h2 style={{ marginTop: 0 }}>Inputs</h2>

          <Section title="EV CALCULATIONS (FBT-EXEMPT)">
            <SelectNewUsed
              label="Vehicle condition"
              value={inputs.vehicleCondition}
              onChange={(v) => setInputs((p) => ({ ...p, vehicleCondition: v }))}
            />
            <MoneyField
              label="Vehicle Dutiable Value (aka FBT Base Value)"
              value={inputs.vehicleBaseValue}
              step={100}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, vehicleBaseValue: v }))}
            />
            <MoneyField
              label="Driveaway Cost (after on road)"
              value={inputs.driveawayCost}
              step={100}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, driveawayCost: v }))}
            />
            <MoneyField
              label={`Estimated Market Value after ${inputs.leaseDurationYears} Years`}
              value={inputs.estimatedMarketValueAtEnd}
              step={100}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, estimatedMarketValueAtEnd: v }))
              }
            />
            <NumberField
              label="Annual Mileage (km)"
              value={inputs.annualMileageKm}
              step={500}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, annualMileageKm: v }))}
            />
            <MoneyField
              label="Lease Documentation Fee"
              value={inputs.leaseDocFee}
              step={10}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, leaseDocFee: v }))}
            />
            <DateField
              label="Lease Starting Date"
              value={inputs.leaseStartDate}
              onChange={(v) => setInputs((p) => ({ ...p, leaseStartDate: v }))}
            />
            <LeaseDurationSelect
              label="Lease Duration (Years)"
              value={inputs.leaseDurationYears}
              onChange={(v) => setInputs((p) => ({ ...p, leaseDurationYears: v }))}
            />
          </Section>

          <Section title="FINANCIALS">
            <MoneyField
              label="Total Taxable Income"
              value={inputs.totalTaxableIncome}
              step={1000}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, totalTaxableIncome: v }))}
            />
            <NumberField
              label="Home Loan Offset Interest Rate (%)"
              value={inputs.homeLoanOffsetInterestRate}
              step={0.01}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, homeLoanOffsetInterestRate: v }))
              }
            />
          </Section>

          <Section title="LEASE QUOTE (PER FORTNIGHT)">
            <MoneyField
              label="Vehicle Lease (Per Fortnight)"
              value={inputs.vehicleLeasePerFn}
              step={1}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, vehicleLeasePerFn: v }))}
            />
            <MoneyField
              label="Luxury Vehicle Adjustment (Per Fortnight)"
              value={inputs.luxuryVehicleAdjPerFn}
              step={1}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, luxuryVehicleAdjPerFn: v }))
              }
            />
            <SelectYesNo
              label="Super Guarantee Calculated From Pre-NL Income"
              value={inputs.superFromPreNlIncome}
              onChange={(v) => setInputs((p) => ({ ...p, superFromPreNlIncome: v }))}
            />
          </Section>

          <Section title="ANNUAL PACKAGED RUNNING COST (ex GST)">
            <SelectYesNo
              label="GST saving passed on in NL?"
              value={inputs.gstSavingPassedOn}
              onChange={(v) => setInputs((p) => ({ ...p, gstSavingPassedOn: v }))}
            />
            <MoneyField
              label="Service / Maintenance / Tyres"
              value={inputs.serviceMaintTyresAnnual}
              step={10}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, serviceMaintTyresAnnual: v }))
              }
            />
            <MoneyField
              label="Save Share (annual)"
              value={inputs.saveShareAnnual}
              step={10}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, saveShareAnnual: v }))
              }
            />
            <MoneyField
              label="Registration"
              value={inputs.registrationAnnual}
              step={10}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, registrationAnnual: v }))}
            />
            <MoneyField
              label="Electricity (annual)"
              value={inputs.electricityAnnual}
              step={10}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, electricityAnnual: v }))}
            />
            <MoneyField
              label="Insurance"
              value={inputs.insuranceAnnual}
              step={10}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, insuranceAnnual: v }))}
            />
            <MoneyField
              label="Management / Membership Fees"
              value={inputs.managementFeesAnnual}
              step={10}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, managementFeesAnnual: v }))
              }
            />
          </Section>

          <Section title="ELECTRICITY">
            <MoneyField
              label="Average AUD per kWh"
              value={inputs.avgAudPerKwh}
              step={0.01}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, avgAudPerKwh: v }))}
            />
            <NumberField
              label="Average Wh per km"
              value={inputs.avgWhPerKm}
              step={1}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, avgWhPerKm: v }))}
            />
            <MoneyField
              label="(Override) Annual Charging Expense (set 0 to clear)"
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
                onChange={(e) =>
                  setInputs((p) => ({
                    ...p,
                    compareWithCarLoan: e.target.checked,
                  }))
                }
              />
              Enable comparison
            </label>

            {inputs.compareWithCarLoan && (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <MoneyField
                  label="Initial Deposit Amount"
                  value={inputs.carLoanInitialDeposit}
                  step={100}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, carLoanInitialDeposit: v }))
                  }
                />

                <ReadOnlyValue
                  label="Loan Term (Years)"
                  value={`${inputs.leaseDurationYears} (forced to match Lease Duration)`}
                />

                <NumberField
                  label="Interest Rate (%)"
                  value={inputs.carLoanInterestRatePct}
                  step={0.01}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, carLoanInterestRatePct: v }))
                  }
                />

                <MoneyField
                  label="Monthly Fee"
                  value={inputs.carLoanMonthlyFee}
                  step={1}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, carLoanMonthlyFee: v }))
                  }
                />
              </div>
            )}
          </Section>

          <Section title="OPTIONAL: COMPARE WITH CONTINUING WITH CURRENT CAR">
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={inputs.compareWithCurrentCar}
                onChange={(e) =>
                  setInputs((p) => ({ ...p, compareWithCurrentCar: e.target.checked }))
                }
              />
              Enable comparison
            </label>

            {inputs.compareWithCurrentCar && (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                <MoneyField
                  label="Current Market Value"
                  value={inputs.currentCarMarketValueNow}
                  step={100}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, currentCarMarketValueNow: v }))
                  }
                />
                <MoneyField
                  label={`Estimated Market Value after ${inputs.leaseDurationYears} Years`}
                  value={inputs.currentCarMarketValueAtEnd}
                  step={100}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, currentCarMarketValueAtEnd: v }))
                  }
                />

                <div style={{ fontWeight: 700, opacity: 0.85, marginTop: 6 }}>
                  ANNUAL (incl. GST)
                </div>

                <MoneyField
                  label="Service / Maintenance / Tyres"
                  value={inputs.currentServiceMaintTyresAnnual}
                  step={10}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, currentServiceMaintTyresAnnual: v }))
                  }
                />
                <MoneyField
                  label="Registration"
                  value={inputs.currentRegistrationAnnual}
                  step={10}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, currentRegistrationAnnual: v }))
                  }
                />
                <MoneyField
                  label="Fuel"
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
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, currentInsuranceAnnual: v }))
                  }
                />
              </div>
            )}
          </Section>
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
            <div style={{ fontWeight: 800 }}>Outputs</div>
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
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 12,
                padding: 16,
              }}
            >
              {(() => {
                const s = computeFinancialSummary({
                  inputs,
                  taxRateInclMedicarePct: 47,
                });

                // Summary is always framed over 5 years of ownership, regardless of lease duration.
                const years = 5;

                const titleA = "New EV via Novated Lease";
                const titleB = "New EV via Offset Cash";

                // NL vs Offset Cash
                const cashflowSaving =
                  s.offsetTotalSpentAt5 - s.nlTotalSpentAt5;

                // Home-loan interest saving: NL is better if it incurs LESS interest.
                // Use 5-year totals.
                const homeLoanInterestSaving =
                  s.irNl.total - s.irCash.total;

                const totalSaving = cashflowSaving + homeLoanInterestSaving;

                // NL vs Car Loan (optional) — over 5 years
                const cashflowSavingVsLoan = s.loanTotalSpentAt5 - s.nlTotalSpentAt5;
                const homeLoanInterestSavingVsLoan = s.irNl.total - s.irLoan.total;
                const totalSavingVsLoan = cashflowSavingVsLoan + homeLoanInterestSavingVsLoan;

                // Electricity delta over lease (benefit if positive)
                const chargingDeltaTotal = s.chargingDeltaBenefitOverLease;
                // The engine's NL 5-year cashflow totals include the charging delta adjustment.
                // For the headline “cashflow total”, we want the total WITHOUT charging delta.
                const nlTotalSpentAt5ExclChargingDelta = s.nlTotalSpentAt5 + chargingDeltaTotal;

                // Optional: compare with keeping current car
                const showCurrentCar = inputs.compareWithCurrentCar;

                // Optional: compare with traditional car loan
                const showLoan = inputs.compareWithCarLoan;

                // Use 5-year totals for interest impacts
                const nlHomeLoanInterestImpact = s.irNl.total;
                const cashHomeLoanInterestImpact = s.irCash.total;
                const currentHomeLoanInterestImpact = s.irKeep.total;

                // Asset values: use explicit 5-year values
                const evEndValue = inputs.estimatedMarketValueAtEnd; // explicit 5-year value
                const currentEndValue = inputs.currentCarMarketValueAtEnd; // explicit 5-year value

                // Selling current car now provides cash-in
                const saleProceedsNow = s.extraCashFromSaleOfOldCar;

                const keepRunningCostTotal = s.keepTotalSpentAt5;

                // Decomposition (must sum to the headline total)
                const assetDelta = evEndValue - currentEndValue;
                const cashDelta =
                  keepRunningCostTotal -
                  (s.nlTotalSpentAt5 - saleProceedsNow);
                // Home-loan interest impacts are negative costs; a “saving” should be positive when NL incurs LESS interest.
                const interestDelta =
                  nlHomeLoanInterestImpact - currentHomeLoanInterestImpact;

                // Total saving = sum of components (keeps the decomposition identity true)
                const nlVsKeepSaving = assetDelta + cashDelta + interestDelta;

                return (
                  <>
                    {/* Card 1: NL vs Offset Cash */}
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>
                      Summary — {titleA} vs {titleB}
                    </div>

                    <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.55 }}>
                      <div style={{ marginBottom: 8 }}>
                        Over <b>{years}</b> years, the novated lease option is
                        <b> {fmtAud0(totalSaving)}</b>{" "}
                        {totalSaving >= 0 ? "better" : "worse"} than buying with offset cash
                        (cashflow + estimated home-loan interest impact).
                      </div>

                      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                        <li>
                          {titleA} (cashflow over 5 years): {fmtAud0(s.leasePaymentsOverLease)} in lease payments,{" "}
                          {fmtAud0(s.residualPayableIncGst)} residual, and{" "}
                          {fmtAud0(Math.max(0, s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd))} post-lease running costs
                          = {fmtAud0(nlTotalSpentAt5ExclChargingDelta)} total (excluding charging delta).
                        </li>
                        <li>
                          {titleB} (cashflow over 5 years): {fmtAud0(inputs.driveawayCost)} driveaway, and{" "}
                          {fmtAud0(Math.max(0, s.offsetTotalSpentAt5 - inputs.driveawayCost))} running costs
                          = {fmtAud0(s.offsetTotalSpentAt5)} total.
                        </li>
                        <li>
                          Electricity: novated lease claims {fmtAud0(s.assumedChargingClaimPerYear)}{" "}
                          per year (ATO shortcut), vs you estimate {fmtAud0(s.chargingExpensePerYear)}{" "}
                          per year actual. That difference sums to {fmtAud0(chargingDeltaTotal)}{" "}
                          over the lease term.
                        </li>
                        <li>
                          Home-loan interest impact (estimated using your offset rate{" "}
                          {inputs.homeLoanOffsetInterestRate}%):{" "}
                          {titleA} adds {fmtAud0(nlHomeLoanInterestImpact)} vs{" "}
                          {titleB} adds {fmtAud0(cashHomeLoanInterestImpact)} over 5 years.
                        </li>
                        <li>
                          Decomposition: {fmtAud0(totalSaving)} total ={" "}
                          {fmtAud0(cashflowSaving)} cashflow difference +{" "}
                          {fmtAud0(homeLoanInterestSaving)} home-loan interest difference.
                        </li>
                      </ul>

                      <div style={{ marginTop: 10, fontSize: 13, opacity: 0.82 }}>
                        End EV value assumption: both options end with the same car, valued at{" "}
                        <b>{fmtAud0(evEndValue)}</b> after {years} years,
                        so it cancels out in the NL vs Offset Cash comparison.
                      </div>
                    </div>

                    {/* Card 2: NL vs Car Loan (optional) */}
                    {showLoan && (
                      <div
                        style={{
                          border: "1px solid rgba(0,0,0,0.15)",
                          borderRadius: 12,
                          padding: 16,
                          marginTop: 16,
                        }}
                      >
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>
                          Summary — {titleA} vs New EV via Car Loan
                        </div>

                        <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.55 }}>
                          <div style={{ marginBottom: 8 }}>
                            Over <b>{years}</b> years, the novated lease option is{" "}
                            <b>{fmtAud0(totalSavingVsLoan)}</b>{" "}
                            {totalSavingVsLoan >= 0 ? "better" : "worse"} than buying the same car via
                            a traditional car loan (cashflow + estimated home-loan interest impact).
                          </div>

                          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                            <li>
                              {titleA} (cashflow over 5 years): {fmtAud0(s.leasePaymentsOverLease)} in lease payments,{" "}
                              {fmtAud0(s.residualPayableIncGst)} residual, and{" "}
                              {fmtAud0(Math.max(0, s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd))} post-lease running costs
                              = {fmtAud0(nlTotalSpentAt5ExclChargingDelta)} total (excluding charging delta).
                            </li>
                            <li>
                              New EV via Car Loan (cashflow over 5 years): deposit {fmtAud0(inputs.carLoanInitialDeposit)},{" "}
                              loan repayments + fees {fmtAud0(s.loanPaymentTotalInclFees)}, and{" "}
                              running costs{" "}
                              {fmtAud0(
                                Math.max(
                                  0,
                                  s.loanTotalSpentAt5 - (inputs.carLoanInitialDeposit + s.loanPaymentTotalInclFees)
                                )
                              )}{" "}
                              = {fmtAud0(s.loanTotalSpentAt5)} total.
                            </li>
                            <li>
                              Home-loan interest impact (estimated using your offset rate {inputs.homeLoanOffsetInterestRate}%):{" "}
                              {titleA} adds {fmtAud0(nlHomeLoanInterestImpact)} vs car loan adds{" "}
                              {fmtAud0(s.irLoan.total)} over 5 years.
                            </li>
                            <li>
                              Decomposition: {fmtAud0(totalSavingVsLoan)} total ={" "}
                              {fmtAud0(cashflowSavingVsLoan)} cashflow difference +{" "}
                              {fmtAud0(homeLoanInterestSavingVsLoan)} home-loan interest difference.
                            </li>
                          </ul>

                          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.82 }}>
                            End EV value assumption: both options end with the same car, valued at{" "}
                            <b>{fmtAud0(evEndValue)}</b> after {years} years, so it cancels out in this comparison.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Card 3: NL vs Keeping Current Car (optional) */}
                    {showCurrentCar && (
                      <div
                        style={{
                          border: "1px solid rgba(0,0,0,0.15)",
                          borderRadius: 12,
                          padding: 16,
                          marginTop: 16,
                        }}
                      >
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>
                          Summary — {titleA} vs Keeping Current Car
                        </div>

                        <div style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.55 }}>
                          <div style={{ marginBottom: 8 }}>
                            Over <b>{years}</b> years (incl. end car value and selling your
                            current car now), the new EV via novated lease is{" "}
                            <b>{fmtAud0(nlVsKeepSaving)}</b>{" "}
                            {nlVsKeepSaving >= 0 ? "better" : "worse"} than keeping your current
                            car.
                          </div>

                          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                            <li>
                              End assets: EV ends at {fmtAud0(evEndValue)} vs current car ends at{" "}
                              {fmtAud0(currentEndValue)} (asset difference {fmtAud0(assetDelta)}).
                            </li>
                            <li>
                              Cashflows (over 5 years): NL spends {fmtAud0(s.nlTotalSpentAt5)} but recovers{" "}
                              {fmtAud0(saleProceedsNow)} from selling the current car now; keeping
                              the current car spends {fmtAud0(keepRunningCostTotal)} in running
                              costs.
                            </li>
                            <li>
                              Home-loan interest impact (estimated at {inputs.homeLoanOffsetInterestRate}%): NL adds{" "}
                              {fmtAud0(-nlHomeLoanInterestImpact)} vs keeping current car adds{" "}
                              {fmtAud0(-currentHomeLoanInterestImpact)} (saving {fmtAud0(interestDelta)}).
                            </li>
                            <li>
                              Decomposition: {fmtAud0(nlVsKeepSaving)} total ={" "}
                              {fmtAud0(assetDelta)} asset difference + {fmtAud0(cashDelta)} cashflow
                              difference + {fmtAud0(interestDelta)} home-loan interest difference.
                            </li>
                          </ul>

                          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
                            Note: this is now engine-driven and matches the detailed engine outputs.
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
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