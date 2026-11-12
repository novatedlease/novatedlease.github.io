import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, missingForStep, type GuidedDraft } from "../src/guided/draft";
import { PROVIDERS, guideFor, guideMayHaveChanged, pointersFor, templateFor } from "../src/guided/providerGuide";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const KEY = "nlc2-guided-draft-v3";

function quoteDraft(): GuidedDraft {
  return { ...emptyDraft(), hasQuote: true, vehicleType: "EV", vehicleCondition: "New" };
}

function on(step: "price" | "lease" | "payment", d: GuidedDraft | Record<string, unknown>) {
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ draft: d, step, visited: ["intro", "car", "compare", "price", "lease", "payment"] }),
  );
  render(<App />);
}

const saved = () => JSON.parse(window.localStorage.getItem(KEY)!).draft as GuidedDraft;
const picker = () => screen.getByLabelText(/Who is your quote from/) as HTMLSelectElement;

describe("provider picker", () => {
  test("is optional, on the first quote-figure screen, and the choice is saved", () => {
    on("price", quoteDraft());
    expect(picker().value).toBe("");
    expect(missingForStep("price", saved()).join()).not.toMatch(/quote from/);
    fireEvent.change(picker(), { target: { value: "sgfleet" } });
    expect(saved().provider).toBe("sgfleet");
  });

  test("Smart Leasing / MillarX answer follows the named provider", () => {
    on("price", quoteDraft());
    fireEvent.change(picker(), { target: { value: "millarx" } });
    expect(saved().smartMillarx).toBe(true);
    fireEvent.change(picker(), { target: { value: "sgfleet" } });
    expect(saved().smartMillarx).toBe(false);
    // Back to "Other": the answer was ours, so the question is asked again
    fireEvent.change(picker(), { target: { value: "other" } });
    expect(saved().smartMillarx).toBeNull();
  });

  test("changing provider clears a payment corrected for the previous provider", () => {
    on("price", {
      ...quoteDraft(),
      provider: "smartleasing",
      smartMillarx: true,
      payment: { text: "400", none: false, estimated: false },
      paymentCorrected: true,
    });
    fireEvent.change(picker(), { target: { value: "millarx" } });
    expect(saved().paymentCorrected).toBe(false);
    expect(saved().payment.text).toBe("");
  });

  test("switching a corrected Smart Leasing draft to Other clears its correction", () => {
    on("price", {
      ...quoteDraft(),
      provider: "smartleasing",
      smartMillarx: true,
      payment: { text: "400", none: false, estimated: false },
      paymentCorrected: true,
    });
    fireEvent.change(picker(), { target: { value: "other" } });
    expect(saved().smartMillarx).toBeNull();
    expect(saved().paymentCorrected).toBe(false);
    expect(saved().payment.text).toBe("");
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
  test("warns when a quote layout has not been checked for over six months", () => {
    const now = new Date(2026, 10, 12);
    expect(guideMayHaveChanged("2026-05", now)).toBe(false);
    expect(guideMayHaveChanged("2026-04", now)).toBe(true);
  });

  test("each named provider has dated pointers and a recorded quote source", () => {
    for (const provider of PROVIDERS.filter((p) => p.id !== "other")) {
      const guide = guideFor(provider.id);
      expect(guide, provider.id).not.toBeNull();
      expect(guide!.sources.length, provider.id).toBeGreaterThan(0);
      expect(guide!.pointers.length, provider.id).toBeGreaterThan(0);
      expect(guide!.seen, provider.id).toMatch(/^20\d\d-(0[1-9]|1[0-2])$/);
    }
  });

  test("new providers have evidence-backed pointers on the appropriate fields", () => {
    expect(pointersFor("autopia", "baseValue")[0].text).toMatch(/base price/);
    expect(pointersFor("customfleet", "luxAdj")[0].text).toMatch(/Non-Deductible Depreciation/);
    expect(pointersFor("leaselab", "payment")[0].text).toMatch(/Per week/);
    expect(pointersFor("spa", "driveaway")[0].text).toMatch(/excluding GST/);
  });

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
    expect(screen.queryByAltText(/Redacted SG Fleet quote pages/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show on a SG Fleet quote page/ }));
    const image = screen.getByAltText(/Redacted SG Fleet quote pages/) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe(templateFor("sgfleet", "payment"));
    expect(screen.getByRole("link", { name: /numbered field guide/ }).getAttribute("href"))
      .toBe("/start-here/how-to-read-sgfleet-quote/");
    expect(screen.getByRole("link", { name: "Open PDF" }).getAttribute("href"))
      .toBe("/assets/images/quote-guide/sgfleet/redacted-quote.pdf");
  });

  test("SG Fleet FBT opens the marked later-page example instead of the unmarked first pages", () => {
    on("price", { ...quoteDraft(), provider: "sgfleet" });
    expect(screen.getByText(/first two pages do not show the FBT base value/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show where SG Fleet prints FBT base value" }));
    const image = screen.getByAltText(/number 1 marking FBT Base Value/) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/assets/images/quote-guide/sgfleet/fbt-example.png");
    expect(screen.getByText(/different SG Fleet quote layout/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open PDF" }).getAttribute("href"))
      .toBe("/assets/images/quote-guide/sgfleet/fbt-example.pdf");
  });

  test("only providers with reviewed redacted pages expose a quote template", () => {
    expect(templateFor("paywise", "fees")).toBe("/assets/images/quote-guide/paywise/redacted-quote.png");
    expect(templateFor("fleetpartners", "defer")).toBe("/assets/images/quote-guide/fleetpartners/redacted-quote.png");
    expect(templateFor("remserv", "payment")).toBeNull();
  });

  test("no pointers without a named provider", () => {
    on("lease", quoteDraft());
    expect(screen.queryByText(/As seen on/)).toBeNull();
    expect(pointersFor("other", "payment")).toEqual([]);
    expect(pointersFor(null, "payment")).toEqual([]);
  });
});
