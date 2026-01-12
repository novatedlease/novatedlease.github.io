import { useEffect, useRef, useState } from "react";
import { LeaseReport } from "./components/LeaseReport";
import type { Inputs } from "./engine/types";
import { FinancialReport } from "./components/FinancialReport";

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


type YesNo = "Yes" | "No";

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

export default function App() {
  const [inputs, setInputs] = useState<Inputs>({
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
    currentFuelAnnual: 2362.50,
    currentInsuranceAnnual: 1000,
  });

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

        {/* Report */}
        <div
          className="nl-col nl-right"
          style={{
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
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
        </div>
      </div>
    </div>
  );
}