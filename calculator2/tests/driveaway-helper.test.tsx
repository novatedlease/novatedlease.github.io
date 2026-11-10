import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

test("tapping an ATO residual chip fills in the percentage", () => {
  render(<Harness />);
  fireEvent.click(screen.getByText(/Not on your quote\? Work it out from the residual/));
  fireEvent.click(screen.getByRole("button", { name: /Excluding GST/ }));
  const [residual, pct] = screen.getAllByRole("textbox");
  fireEvent.change(residual, { target: { value: "18025.86" } });
  const chip = screen.getByRole("button", { name: /28\.13% 5 yr/ });
  fireEvent.click(chip);
  expect((pct as HTMLInputElement).value).toBe("28.13");
  expect(chip.getAttribute("aria-pressed")).toBe("true");
  // NLA quote: back to the dealer's $70,275
  expect(screen.getByText(/\$70,275/)).toBeTruthy();
});
