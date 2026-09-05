import { useEffect, useRef, useState } from "react";
import {
  getInputChangeCount,
  hasCoffeeNudgeBeenShown,
  markCoffeeNudgeShown,
  shouldShowCoffeeNudge,
  subscribeInputChanges,
} from "../state/engagement";
import { trackEvent } from "../utils/analytics";

const TICK_MS = 5000;

/**
 * Decides when to surface the one-time "buy me a coffee" message: after the user has
 * spent >= 4 minutes of *visible* time on the page (background tabs don't count) AND
 * has edited at least 4 distinct fields. Shown at most once per browser (localStorage flag).
 *
 * `paused` defers the nudge while something else owns the screen (the quick tour);
 * it re-evaluates as soon as the pause lifts.
 */
export function useCoffeeNudge(opts: { paused?: boolean } = {}): { open: boolean; close: () => void } {
  const { paused = false } = opts;
  const [open, setOpen] = useState(false);
  const activeMsRef = useRef(0);
  const firedRef = useRef<boolean>(hasCoffeeNudgeBeenShown());

  // Accumulate visible time for the life of the app, independent of pause state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") activeMsRef.current += TICK_MS;
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Evaluate on every tick and on every input change while not paused. Re-runs when
  // `paused` flips so conditions met during the tour fire the moment it closes.
  useEffect(() => {
    if (typeof window === "undefined" || paused || firedRef.current) return;

    const evaluate = () => {
      if (firedRef.current) return;
      const changes = getInputChangeCount();
      if (!shouldShowCoffeeNudge({ activeMs: activeMsRef.current, changes, alreadyShown: false })) return;
      firedRef.current = true;
      markCoffeeNudgeShown();
      trackEvent("coffee_nudge_shown", { changes, active_minutes: Math.round(activeMsRef.current / 60000) });
      setOpen(true);
    };

    const timer = window.setInterval(evaluate, TICK_MS);
    const unsubscribe = subscribeInputChanges(evaluate);
    const raf = window.requestAnimationFrame(evaluate);
    return () => {
      window.clearInterval(timer);
      window.cancelAnimationFrame(raf);
      unsubscribe();
    };
  }, [paused]);

  return { open, close: () => setOpen(false) };
}
