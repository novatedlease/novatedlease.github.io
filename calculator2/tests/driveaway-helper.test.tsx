import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { DriveawayHelper } from "../src/guided/DriveawayHelper";
import { emptyDraft, type GuidedDraft } from "../src/guided/draft";

afterEach(cleanup);

function Harness() {
  const [d, setD] = useState<GuidedDraft>({
    ...emptyDraft(),
    vehicleCondition: "New",
    baseValue: { text: "68139", none: false, estimated: false },
  });
  return <DriveawayHelper d={d} set={(k, v) => setD((x) => ({ ...x, [k]: v }))} />;
}

/** One of the two helpers, opened. */
function open(title: string | RegExp) {
  const summary = screen.getByText(title);
  fireEvent.click(summary);
  return within(summary.closest("details")!);
}

test("tapping an ATO residual chip fills in the percentage", () => {
  render(<Harness />);
  const q = open(/Not on your quote\? Work it out from the residual/);
  fireEvent.click(q.getByRole("button", { name: /Excluding GST/ }));
  const [residual, pct] = q.getAllByRole("textbox");
  fireEvent.change(residual, { target: { value: "18025.86" } });
  const chip = q.getByRole("button", { name: /28\.13% 5 yr/ });
  fireEvent.click(chip);
  expect((pct as HTMLInputElement).value).toBe("28.13");
  expect(chip.getAttribute("aria-pressed")).toBe("true");
  // NLA quote: back to the dealer's $70,275
  expect(q.getByText(/\$70,275/)).toBeTruthy();
});

function PartsHarness({ onDraft }: { onDraft: (d: GuidedDraft) => void }) {
  const [d, setD] = useState<GuidedDraft>({ ...emptyDraft(), vehicleCondition: "New" });
  onDraft(d);
  return <DriveawayHelper d={d} set={(k, v) => setD((x) => ({ ...x, [k]: v }))} />;
}

test("adding up the parts gives NLA's printed drive-away price", () => {
  let latest = emptyDraft();
  render(<PartsHarness onDraft={(d) => (latest = d)} />);
  const q = open("Or add up the parts");
  fireEvent.click(q.getByRole("button", { name: /We'll add the GST/ }));
  const [price, duty, rego] = q.getAllByRole("textbox");
  // NLA: price $52,565 ex GST (+ $5,256.50 GST), stamp duty $1,641, rego and CTP $1,022
  fireEvent.change(price, { target: { value: "52565" } });
  fireEvent.change(duty, { target: { value: "1641" } });
  fireEvent.change(rego, { target: { value: "1022" } });
  expect(q.getByText("$60,485")).toBeTruthy();
  fireEvent.click(q.getByRole("button", { name: "Use this figure" }));
  expect(latest.driveaway).toEqual({ text: "60484.5", none: false, estimated: true });
});

test("a price including GST is used as printed", () => {
  render(<PartsHarness onDraft={() => {}} />);
  const q = open("Or add up the parts");
  fireEvent.click(q.getByRole("button", { name: /^Including GST/ }));
  const [price, duty] = q.getAllByRole("textbox");
  fireEvent.change(price, { target: { value: "45988.32" } });
  fireEvent.change(duty, { target: { value: "1385" } });
  expect(q.getByText("$47,373")).toBeTruthy();
});
