import { afterEach, describe, expect, test } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DriveawayHelper } from "../src/guided/DriveawayHelper";
import { emptyDraft, type GuidedDraft } from "../src/guided/draft";

afterEach(cleanup);

function Harness({ start, onDraft }: { start: GuidedDraft; onDraft: (d: GuidedDraft) => void }) {
  const [d, setD] = useState(start);
  onDraft(d);
  return (
    <DriveawayHelper
      d={d}
      set={(k, v) => setD((prev) => ({ ...prev, [k]: v }))}
    />
  );
}

// Smart Leasing final quote: FBT base value $67,604.95, residual $17,930.10 ex GST, 5 years -> about $69,886.
const base: GuidedDraft = {
  ...emptyDraft(),
  vehicleType: "EV",
  vehicleCondition: "New",
  baseValue: { text: "67604.95", none: false, estimated: false },
  leaseYears: null,
};

function setup(start: GuidedDraft) {
  let latest = start;
  render(<Harness start={start} onDraft={(d) => (latest = d)} />);
  fireEvent.click(screen.getByText("Excluding GST"));
  fireEvent.change(screen.getByLabelText(/Residual value/), { target: { value: "17930.10" } });
  return () => latest;
}

describe("drive-away helper: tapping a percentage fills the drive-away field", () => {
  test("tapping 28.13% fills it without 'Use this figure'", () => {
    const latest = setup(base);
    expect(latest().driveaway.text).toBe("");
    fireEvent.click(screen.getByText("28.13%"));
    expect(latest().driveaway.text).toBe("69886");
    expect(latest().driveaway.estimated).toBe(true);
  });

  test("typing the percentage by hand does not fill it", () => {
    const latest = setup(base);
    fireEvent.change(screen.getByLabelText(/Residual percentage/), { target: { value: "28.13" } });
    expect(latest().driveaway.text).toBe("");
  });

  test("a drive-away the reader typed is never overwritten", () => {
    const typed = { ...base, driveaway: { text: "70275", none: false, estimated: false } };
    const latest = setup(typed);
    fireEvent.click(screen.getByText("28.13%"));
    expect(latest().driveaway.text).toBe("70275");
    expect(latest().driveaway.estimated).toBe(false);
  });

  test("changing the percentage after a tap updates the figure", () => {
    const latest = setup(base);
    fireEvent.click(screen.getByText("28.13%"));
    fireEvent.click(screen.getByText("37.5%"));
    expect(latest().driveaway.text).not.toBe("69886");
    expect(latest().driveaway.estimated).toBe(true);
  });
});
