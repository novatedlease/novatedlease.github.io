// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { LeaseRateGuard } from "../src/components/LeaseRateGuard";
import { InputsPanel } from "../src/components/InputsPanel";
import { baseEvInputs } from "./fixtures";

afterEach(cleanup);

test("Advanced finance safeguard waits for the completed amount", () => {
  function Harness() {
    const [inputs, setInputs] = useState(baseEvInputs);
    return <LeaseRateGuard inputs={inputs} setInputs={setInputs} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />;
  }
  const { container } = render(<Harness />);
  const box = container.querySelector<HTMLInputElement>(".nlc-num")!;
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: "5" } });
  expect(screen.queryByText(/Rejected: outside plausible range/)).toBeNull();
  fireEvent.change(box, { target: { value: "5000" } });
  expect(screen.queryByText(/Rejected: outside plausible range/)).toBeNull();
  fireEvent.blur(box);
  expect(screen.getByText(/Rejected: outside plausible range/)).toBeTruthy();
});

test("lease-duration requote note waits until the amount loses focus", () => {
  function Harness() {
    const [inputs, setInputs] = useState(baseEvInputs);
    return <InputsPanel inputs={inputs} setInputs={setInputs} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />;
  }
  render(<Harness />);
  const box = screen.getByLabelText("Lease duration");
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: "3" } });
  expect(screen.queryByText(/changing lease duration usually changes/)).toBeNull();
  fireEvent.blur(box);
  expect(screen.getByText(/changing lease duration usually changes/)).toBeTruthy();
});
