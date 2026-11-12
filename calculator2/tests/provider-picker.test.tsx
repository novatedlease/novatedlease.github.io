import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";
import { emptyDraft, missingForStep, type GuidedDraft } from "../src/guided/draft";
import { PROVIDERS, cropFor, exampleFor, pdfFor, guideFor, guideMayHaveChanged, pointersFor, templateFor } from "../src/guided/providerGuide";

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

  test("each named provider explains where to get the drive-away price", () => {
    for (const provider of PROVIDERS.filter((p) => p.id !== "other")) {
      expect(pointersFor(provider.id, "driveaway").length, provider.id).toBeGreaterThan(0);
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

  test("Smart Leasing explains the missing drive-away total beside that field", () => {
    on("price", { ...quoteDraft(), provider: "smartleasing" });
    const pointer = screen.getByText(/two available Smart Leasing pages do not print a drive-away total/);
    const driveawayField = document.querySelector('[data-field="driveaway"]')!;
    expect(driveawayField.nextElementSibling?.contains(pointer)).toBe(true);
    expect(screen.getByText("Not on your quote? Work it out from the residual")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show both available Smart Leasing pages" }));
    const image = screen.getByAltText(/Smart Leasing quote page 1 of two available pages/) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/assets/images/quote-guide/smartleasing/redacted-quote-page-1.png");
    fireEvent.click(screen.getByRole("button", { name: "Show page 2" }));
    expect(image.getAttribute("src")).toBe("/assets/images/quote-guide/smartleasing/redacted-quote.png");
    expect(screen.getByRole("link", { name: "Open PDF" }).getAttribute("href"))
      .toBe("/assets/images/quote-guide/smartleasing/redacted-quote.pdf");
  });

  test("Smart Leasing's documentation fee opens the separate terms page", () => {
    on("lease", { ...quoteDraft(), provider: "smartleasing" });
    expect(screen.getByText(/Look in the small print on Smart Leasing's terms page/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show Smart Leasing terms page" }));
    const image = screen.getByAltText(/Redacted terms page from another Smart Leasing quote/) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/assets/images/quote-guide/smartleasing/terms-example.png");
    expect(screen.getByRole("link", { name: "Open PDF" }).getAttribute("href"))
      .toBe("/assets/images/quote-guide/smartleasing/terms-example.pdf");
  });

  test("SG Fleet's payment pointer shows on the payment screen", () => {
    on("payment", { ...quoteDraft(), provider: "sgfleet", smartMillarx: false });
    expect(screen.getByText(/“Monthly lease rental”, either works/)).toBeTruthy();
    expect(screen.queryByAltText(/redacted SG Fleet quote/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show where it is on a SG Fleet quote/ }));
    const image = screen.getByAltText(/redacted SG Fleet quote, with the line for this question numbered/) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/assets/images/quote-guide/sgfleet/field-payment.webp");
    fireEvent.click(screen.getByRole("button", { name: "Switch to full page view" }));
    expect(image.getAttribute("src")).toBe("/assets/images/quote-guide/sgfleet/redacted-quote.png");
    expect(image.getAttribute("alt")).toMatch(/Full redacted SG Fleet quote page/);
    fireEvent.click(screen.getByRole("button", { name: "Switch to crop view" }));
    expect(image.getAttribute("src")).toBe("/assets/images/quote-guide/sgfleet/field-payment.webp");
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

  test("SG Fleet drive-away opens the marked on-road cost line", () => {
    on("price", { ...quoteDraft(), provider: "sgfleet" });
    expect(screen.getByText(/marked 2 on page 2/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show SG Fleet drive-away line" }));
    const image = screen.getByAltText(/number 2 marking Vehicle on-road cost/) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/assets/images/quote-guide/sgfleet/driveaway-example.png");
    expect(screen.getByRole("link", { name: "Open PDF" }).getAttribute("href"))
      .toBe("/assets/images/quote-guide/sgfleet/driveaway-example.pdf");
    expect(screen.getByRole("link", { name: "My quote looks different" }).getAttribute("href"))
      .toBe("/about/contact/#quote-layout-feedback");
  });

  test("newly reviewed providers expose their redacted quote template", () => {
    expect(templateFor("paywise", "fees")).toBe("/assets/images/quote-guide/paywise/field-fees.webp");
    expect(templateFor("fleetpartners", "defer")).toBe("/assets/images/quote-guide/fleetpartners/field-defer.webp");
    expect(templateFor("remserv", "payment")).toBe("/assets/images/quote-guide/remserv/field-payment.webp");
  });

  test("fields use a focused crop when one exists; insurance shares the running-costs crop", () => {
    expect(cropFor("maxxia", "insurance")).toBe("/assets/images/quote-guide/maxxia/field-running.webp");
    expect(cropFor("easi", "luxAdj")).toBe("/assets/images/quote-guide/easi/field-luxAdj.webp");
    // SG Fleet keeps its hand-made FBT and drive-away examples
    expect(templateFor("sgfleet", "baseValue")).toBe("/assets/images/quote-guide/sgfleet/fbt-example.png");
    expect(templateFor("sgfleet", "driveaway")).toBe("/assets/images/quote-guide/sgfleet/driveaway-example.png");
  });

  test("a marked crop is offered even where there's no written pointer", () => {
    on("payment", { ...quoteDraft(), provider: "maxxia", smartMillarx: false });
    fireEvent.click(screen.getByRole("button", { name: /Show where it is on a Maxxia quote/ }));
    expect((screen.getByAltText(/redacted Maxxia quote/) as HTMLImageElement).getAttribute("src"))
      .toBe("/assets/images/quote-guide/maxxia/field-payment.webp");
  });

  test("Oly's residual and Alliance's entry fee open their own marked example pages", () => {
    on("lease", { ...quoteDraft(), provider: "oly" });
    expect(screen.getByText(/Your total residual value \(after lease term\)”.*Including GST/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Show where Oly prints the residual" }));
    expect((screen.getByAltText(/Your total residual value marked 6/) as HTMLImageElement).getAttribute("src"))
      .toBe("/assets/images/quote-guide/oly/residual-example.png");
    expect(screen.getByRole("link", { name: "Open PDF" }).getAttribute("href"))
      .toBe("/assets/images/quote-guide/oly/residual-example.pdf");
    cleanup();
    window.localStorage.clear();
    on("lease", { ...quoteDraft(), provider: "alliance" });
    fireEvent.click(screen.getByRole("button", { name: "Show Alliance's fees page" }));
    expect((screen.getByAltText(/Entry Fee marked 5/) as HTMLImageElement).getAttribute("src"))
      .toBe("/assets/images/quote-guide/alliance/page2-fees.png");
    expect(pdfFor("alliance", "/assets/images/quote-guide/alliance/page2-fees.png"))
      .toBe("/assets/images/quote-guide/alliance/page2-example.pdf");
  });

  test("every field example's image and PDF exist on disk", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    for (const [id, field] of [["oly", "residual"], ["alliance", "docFee"]] as const) {
      const e = exampleFor(id, field)!;
      for (const f of [e.image, e.pdf]) expect(fs.existsSync(path.join(__dirname, "../../docs", f))).toBe(true);
    }
  });

  test("fields missing from a provider's example get a short what-to-do line, without a picture", () => {
    expect(pointersFor("paywise", "defer")[0]).toMatchObject({ notShown: true });
    expect(pointersFor("paywise", "defer")[0].text).toMatch(/Paywise example checked doesn't say how many months/);
    expect(pointersFor("fleetpartners", "baseValue")[0].text).toMatch(/Total column of the “Vehicle” line/);
    // a field the example does show keeps its own pointer
    expect(pointersFor("sgfleet", "defer")[0].notShown).toBeUndefined();
    on("lease", { ...quoteDraft(), provider: "remserv" });
    const line = screen.getByText(/RemServ example checked shows no documentation or establishment fee/);
    expect(line.closest(".gd-pointer")!.querySelector("button")).toBeNull();
  });

  test("every crop listed exists on disk", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fields = ["baseValue", "driveaway", "term", "defer", "docFee", "residual", "payment", "luxAdj", "running", "insurance", "fees"] as const;
    for (const p of PROVIDERS) {
      for (const f of fields) {
        const src = cropFor(p.id, f);
        if (src) expect(fs.existsSync(path.join(__dirname, "../../docs", src))).toBe(true);
      }
    }
  });

  test("no pointers without a named provider", () => {
    on("lease", quoteDraft());
    expect(screen.queryByText(/As seen on/)).toBeNull();
    expect(pointersFor("other", "payment")).toEqual([]);
    expect(pointersFor(null, "payment")).toEqual([]);
  });
});
