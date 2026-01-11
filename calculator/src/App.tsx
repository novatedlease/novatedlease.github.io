import { useState } from "react";
import { LeaseReport } from "./components/LeaseReport";
import type { Inputs } from "./engine/types";

function num(v: string): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
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

function Field(props: {
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
        step={props.step ?? 100}
        min={props.min}
        onChange={(e) => props.onChange(num(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
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

export default function App() {
  const [inputs, setInputs] = useState<Inputs>({
    vehicleBaseValue: 75000,
    driveawayCost: 81423,
    estimatedMarketValueAtEnd: 33000,
    annualMileageKm: 15000,

    leaseDocFee: 500,
    leaseStartDate: new Date().toISOString().slice(0, 10),
    leaseDurationYears: 5,

    totalTaxableIncome: 250000,
    homeLoanOffsetInterestRate: 6.2,

    vehicleLeasePerFn: 597.47,
    luxuryVehicleAdjPerFn: 0,

    superFromPreNlIncome: "Yes",
    gstSavingPassedOn: "Yes",

    serviceMaintTyresAnnual: 1200,
    saveSharePerFn: 0,
    registrationAnnual: 900,
    electricityAnnual: 900,
    insuranceAnnual: 1500,
    managementFeesAnnual: 360,

    avgAudPerKwh: 0.35,
    avgWhPerKm: 165,
    overrideAnnualChargingExpense: undefined,

    compareWithCurrentCar: false,
    currentCarMarketValueNow: 25000,
    currentCarMarketValueAtEnd: 14000,

    currentServiceMaintTyresAnnual: 800,
    currentRegistrationAnnual: 900,
    currentFuelAnnual: 2500,
    currentInsuranceAnnual: 1200,
  });

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Novated Lease Calculator (WIP)</h1>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        This is a development shell. The numbers are stubbed.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Inputs */}
        <div
          style={{
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Inputs</h2>

          <Section title="EV CALCULATIONS (FBT-EXEMPT)">
            <Field
              label="Vehicle Dutiable Value (aka FBT Base Value)"
              value={inputs.vehicleBaseValue}
              step={100}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, vehicleBaseValue: v }))}
            />
            <Field
              label="Driveaway Cost (after on road)"
              value={inputs.driveawayCost}
              step={100}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, driveawayCost: v }))}
            />
            <Field
              label={`Estimated Market Value after ${inputs.leaseDurationYears} Years`}
              value={inputs.estimatedMarketValueAtEnd}
              step={100}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, estimatedMarketValueAtEnd: v }))
              }
            />
            <Field
              label="Annual Mileage (km)"
              value={inputs.annualMileageKm}
              step={500}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, annualMileageKm: v }))}
            />
            <Field
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
            <Field
              label="Lease Duration (Years)"
              value={inputs.leaseDurationYears}
              step={1}
              min={1}
              onChange={(v) => setInputs((p) => ({ ...p, leaseDurationYears: v }))}
            />
          </Section>

          <Section title="FINANCIALS">
            <Field
              label="Total Taxable Income"
              value={inputs.totalTaxableIncome}
              step={1000}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, totalTaxableIncome: v }))}
            />
            <Field
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
            <Field
              label="Vehicle Lease (Per Fortnight)"
              value={inputs.vehicleLeasePerFn}
              step={1}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, vehicleLeasePerFn: v }))}
            />
            <Field
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
            <Field
              label="Service / Maintenance / Tyres"
              value={inputs.serviceMaintTyresAnnual}
              step={10}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, serviceMaintTyresAnnual: v }))
              }
            />
            <Field
              label="Save Share (annual)"
              value={inputs.saveSharePerFn * 26}
              step={10}
              min={0}
              onChange={(v) =>
                setInputs((p) => ({ ...p, saveSharePerFn: v / 26 }))
              }
            />
            <Field
              label="Registration"
              value={inputs.registrationAnnual}
              step={10}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, registrationAnnual: v }))}
            />
            <Field
              label="Electricity (annual)"
              value={inputs.electricityAnnual}
              step={10}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, electricityAnnual: v }))}
            />
            <Field
              label="Insurance"
              value={inputs.insuranceAnnual}
              step={10}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, insuranceAnnual: v }))}
            />
            <Field
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
            <Field
              label="Average AUD per kWh"
              value={inputs.avgAudPerKwh}
              step={0.01}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, avgAudPerKwh: v }))}
            />
            <Field
              label="Average Wh per km"
              value={inputs.avgWhPerKm}
              step={1}
              min={0}
              onChange={(v) => setInputs((p) => ({ ...p, avgWhPerKm: v }))}
            />
            <Field
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
                <Field
                  label="Current Market Value"
                  value={inputs.currentCarMarketValueNow}
                  step={100}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, currentCarMarketValueNow: v }))
                  }
                />
                <Field
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

                <Field
                  label="Service / Maintenance / Tyres"
                  value={inputs.currentServiceMaintTyresAnnual}
                  step={10}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, currentServiceMaintTyresAnnual: v }))
                  }
                />
                <Field
                  label="Registration"
                  value={inputs.currentRegistrationAnnual}
                  step={10}
                  min={0}
                  onChange={(v) =>
                    setInputs((p) => ({ ...p, currentRegistrationAnnual: v }))
                  }
                />
                <Field
                  label="Fuel"
                  value={inputs.currentFuelAnnual}
                  step={10}
                  min={0}
                  onChange={(v) => setInputs((p) => ({ ...p, currentFuelAnnual: v }))}
                />
                <Field
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
          style={{
            border: "1px solid rgba(0,0,0,0.15)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <LeaseReport inputs={inputs} taxRateInclMedicarePct={47} />
        </div>
      </div>
    </div>
  );
}