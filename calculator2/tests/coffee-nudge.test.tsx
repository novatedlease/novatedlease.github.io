import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  COFFEE_NUDGE_MIN_ACTIVE_MS,
  COFFEE_NUDGE_MIN_CHANGES,
  COFFEE_NUDGE_SHOWN_KEY,
  _resetInputChangeCountForTests,
  getInputChangeCount,
  noteInputChange,
  shouldShowCoffeeNudge,
  subscribeInputChanges,
} from "../src/state/engagement";
import { useCoffeeNudge } from "../src/hooks/useCoffeeNudge";
import { CoffeeNudgeModal } from "../src/components/CoffeeNudgeModal";

describe("engagement counter", () => {
  beforeEach(() => _resetInputChangeCountForTests());

  test("counts distinct fields (not keystrokes) and notifies subscribers", () => {
    const seen: number[] = [];
    const unsub = subscribeInputChanges((n) => seen.push(n));
    noteInputChange("driveawayCost"); // "6"
    noteInputChange("driveawayCost"); // "65"
    noteInputChange("driveawayCost"); // "650" — same field, no new count
    noteInputChange("totalTaxableIncome");
    unsub();
    noteInputChange("leaseDurationYears");
    expect(getInputChangeCount()).toBe(3);
    expect(seen).toEqual([1, 2]);
  });

  test("shouldShowCoffeeNudge requires both thresholds and not-already-shown", () => {
    const t = COFFEE_NUDGE_MIN_ACTIVE_MS;
    const c = COFFEE_NUDGE_MIN_CHANGES;
    expect(shouldShowCoffeeNudge({ activeMs: t, changes: c, alreadyShown: false })).toBe(true);
    expect(shouldShowCoffeeNudge({ activeMs: t - 1, changes: c, alreadyShown: false })).toBe(false);
    expect(shouldShowCoffeeNudge({ activeMs: t, changes: c - 1, alreadyShown: false })).toBe(false);
    expect(shouldShowCoffeeNudge({ activeMs: t * 10, changes: c * 10, alreadyShown: true })).toBe(false);
  });
});

function Harness(props: { paused?: boolean }) {
  const { open, close } = useCoffeeNudge({ paused: props.paused });
  return open ? <CoffeeNudgeModal onClose={close} /> : <div data-testid="closed" />;
}

describe("useCoffeeNudge + CoffeeNudgeModal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetInputChangeCountForTests();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test("does not open before the time threshold even with many changes", () => {
    render(<Harness />);
    act(() => {
      for (let i = 0; i < 10; i++) noteInputChange(`f${i}`);
      vi.advanceTimersByTime(COFFEE_NUDGE_MIN_ACTIVE_MS - 10_000);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("does not open after the time threshold with fewer than 4 distinct fields", () => {
    render(<Harness />);
    act(() => {
      for (let i = 0; i < COFFEE_NUDGE_MIN_CHANGES - 1; i++) noteInputChange(`f${i}`);
      vi.advanceTimersByTime(COFFEE_NUDGE_MIN_ACTIVE_MS + 10_000);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("opens once both thresholds are met, sets the localStorage flag, and dismisses", () => {
    render(<Harness />);
    act(() => {
      vi.advanceTimersByTime(COFFEE_NUDGE_MIN_ACTIVE_MS);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => {
      for (let i = 0; i < COFFEE_NUDGE_MIN_CHANGES; i++) noteInputChange(`f${i}`);
    });
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("a coffee is genuinely appreciated");
    expect(window.localStorage.getItem(COFFEE_NUDGE_SHOWN_KEY)).toBe("1");
    const link = screen.getByRole("link", { name: /buy me a coffee/i });
    expect(link.getAttribute("href")).toBe("https://buymeacoffee.com/changyang1230");

    fireEvent.click(screen.getByRole("button", { name: "No thanks" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("does not open when only one field is edited many times (keystrokes)", () => {
    render(<Harness />);
    act(() => {
      for (let i = 0; i < 30; i++) noteInputChange("driveawayCost");
      vi.advanceTimersByTime(COFFEE_NUDGE_MIN_ACTIVE_MS + 10_000);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("never opens again once the flag is set", () => {
    window.localStorage.setItem(COFFEE_NUDGE_SHOWN_KEY, "1");
    render(<Harness />);
    act(() => {
      for (let i = 0; i < 20; i++) noteInputChange(`f${i}`);
      vi.advanceTimersByTime(COFFEE_NUDGE_MIN_ACTIVE_MS * 3);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("defers while paused (tour open) and shows when unpaused", () => {
    const { rerender } = render(<Harness paused />);
    act(() => {
      for (let i = 0; i < COFFEE_NUDGE_MIN_CHANGES; i++) noteInputChange(`f${i}`);
      vi.advanceTimersByTime(COFFEE_NUDGE_MIN_ACTIVE_MS + 10_000);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<Harness paused={false} />);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
