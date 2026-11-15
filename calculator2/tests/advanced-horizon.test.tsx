import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import App from "../src/App";
import { encodeInputsToUrlParam, URL_STATE_PARAM } from "@engine/urlState";
import { advancedDefaultInputs } from "../src/state/defaultInputs";

/** Advanced's summary opens on the lease's own term when it is shorter than 5 years (15 Nov 2026). */
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
});

describe("Advanced horizon", () => {
  test("a 3-year lease opens '@ 3y'; '@ 5y' is still offered", () => {
    const c = encodeInputsToUrlParam({ ...advancedDefaultInputs, leaseDurationYears: 3 });
    window.history.replaceState(null, "", `/?${URL_STATE_PARAM}=${c}`);
    render(<App />);
    expect(screen.getByRole("button", { name: "@ 3y" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "@ 5y" }).getAttribute("aria-pressed")).toBe("false");
  });
});
