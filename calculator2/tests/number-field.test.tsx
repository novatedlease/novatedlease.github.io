import { afterEach, expect, test } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { CurrencyField } from "../src/components/ui/Field";

afterEach(cleanup);

function Harness({ start = 500 }: { start?: number }) {
  const [v, setV] = useState(start);
  return (
    <>
      <CurrencyField label="Insurance" value={v} onChange={setV} step={100} />
      <output data-testid="value">{v}</output>
    </>
  );
}

function type(text: string) {
  const box = screen.getByLabelText("Insurance");
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: text } });
  fireEvent.blur(box);
}

test("Advanced boxes never take a negative figure, and say so", () => {
  render(<Harness />);
  type("-500");
  expect(screen.getByTestId("value").textContent).toBe("0");
  expect(screen.getByRole("alert").textContent).toMatch(/can't be negative/);
  type("1200");
  expect(screen.getByTestId("value").textContent).toBe("1200");
  expect(screen.queryByRole("alert")).toBeNull();
});

test("shorthand like 52.4k means thousands", () => {
  render(<Harness />);
  type("52.4k");
  expect(screen.getByTestId("value").textContent).toBe("52400");
});

test("the down arrow stops at zero", () => {
  render(<Harness start={50} />);
  fireEvent.keyDown(screen.getByLabelText("Insurance"), { key: "ArrowDown" });
  expect(screen.getByTestId("value").textContent).toBe("0");
});

test("the arrow keys update the number shown in the box, not just the result", () => {
  render(<Harness start={500} />);
  const box = screen.getByLabelText("Insurance") as HTMLInputElement;
  fireEvent.focus(box);
  fireEvent.keyDown(box, { key: "ArrowUp" });
  fireEvent.keyDown(box, { key: "ArrowUp" });
  expect(box.value).toBe("700");
  expect(screen.getByTestId("value").textContent).toBe("700");
});
