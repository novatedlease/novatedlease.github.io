import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, missingForStep, type GuidedDraft } from "../src/guided/draft";
import { pointersFor } from "../src/guided/providerGuide";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const KEY = "nlc2-guided-draft-v3";

function quoteDraft(): GuidedDraft {
  return { ...emptyDraft(), hasQuote: true, vehicleType: "EV", vehicleCondition: "New" };
}

function on(step: "lease" | "payment", d: GuidedDraft | Record<string, unknown>) {
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ draft: d, step, visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
  );
  render(<App />);
}

const saved = () => JSON.parse(window.localStorage.getItem(KEY)!).draft as GuidedDraft;
const picker = () => screen.getByLabelText(/Who is your quote from/) as HTMLSelectElement;

describe("provider picker", () => {
  test("is optional, on the lease screen, and the choice is saved", () => {
    on("lease", quoteDraft());
    expect(picker().value).toBe("");
    expect(missingForStep("lease", saved()).join()).not.toMatch(/quote from/);
    fireEvent.change(picker(), { target: { value: "sgfleet" } });
    expect(saved().provider).toBe("sgfleet");
  });

  test("Smart Leasing / MillarX answer follows the named provider", () => {
    on("lease", quoteDraft());
    fireEvent.change(picker(), { target: { value: "millarx" } });
    expect(saved().smartMillarx).toBe(true);
    fireEvent.change(picker(), { target: { value: "sgfleet" } });
    expect(saved().smartMillarx).toBe(false);
    // Back to "Other": the answer was ours, so the question is asked again
    fireEvent.change(picker(), { target: { value: "other" } });
    expect(saved().smartMillarx).toBeNull();
  });

  test("a named provider hides the Smart Leasing / MillarX question", () => {
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    expect(screen.queryByText("Is your lease with Smart Leasing or MillarX?")).toBeNull();
    expect(missingForStep("payment", { ...quoteDraft(), provider: "sgfleet" }).join()).not.toMatch(/Smart Leasing/);
  });

  test("a draft saved before the picker still shows the old question with its answer", () => {
    const old = { ...quoteDraft(), smartMillarx: true } as Record<string, unknown>;
    delete old.provider;
    on("payment", old);
    expect(screen.getByText("Is your lease with Smart Leasing or MillarX?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Yes/ }).getAttribute("aria-pressed")).toBe("true");
    expect(missingForStep("payment", { ...emptyDraft(), smartMillarx: null }).join()).toMatch(/Smart Leasing or MillarX/);
  });
});

describe("provider pointers", () => {
  test("SG Fleet's deferral pointer sits under the deferral question", () => {
    on("lease", { ...quoteDraft(), provider: "sgfleet" });
    const pointer = screen.getByText(/payable as 34 payments/);
    const deferField = document.querySelector('[data-field="monthsDeferred"]')!;
    // The pointer comes straight after the deferral question
    expect(deferField.nextElementSibling?.contains(pointer)).toBe(true);
    expect(screen.getAllByText(/As seen on SG Fleet quotes, Nov 2026/).length).toBeGreaterThan(0);
  });

  test("SG Fleet's payment pointer shows on the payment screen", () => {
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    expect(screen.getByText(/“Monthly lease rental”, either works/)).toBeTruthy();
  });

  test("no pointers without a provider, or for one we have none for", () => {
    on("lease", quoteDraft());
    expect(screen.queryByText(/As seen on/)).toBeNull();
    expect(pointersFor("paywise", "payment")).toEqual([]);
    expect(pointersFor(null, "payment")).toEqual([]);
  });
});
