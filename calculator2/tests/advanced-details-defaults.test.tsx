import { afterEach, describe, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "../src/App";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

function expectDetailsClosed() {
  expect(screen.getByRole("tab", { name: /Details/ }).getAttribute("aria-selected")).toBe("true");
  const sections = document.querySelectorAll(".nlc-output-col > div:last-child .nlc-section");
  expect(sections.length).toBe(8);
  for (const section of sections) expect(section.getAttribute("data-open")).toBe("false");
}

describe("Advanced Details opening state", () => {
  test("opening Details directly starts with every report collapsed", () => {
    window.localStorage.setItem("nlc2-mode", "advanced");
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: /Details/ }));
    expectDetailsClosed();
    fireEvent.click(screen.getByRole("button", { name: /Section 2: Financial summary/ }));
    expect(document.getElementById("details-section-2-financial-summary")?.getAttribute("data-open")).toBe("true");
  });

  test("switching from Guided with the header opens Details", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expectDetailsClosed();
  });

  test("skipping Guided opens Details", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Go to Advanced mode" }));
    expectDetailsClosed();
  });
});
