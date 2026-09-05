/**
 * Lightweight engagement tracking for the "buy me a coffee" nudge.
 *
 * Tracks the number of DISTINCT fields the user has touched (Simple-mode answers,
 * Advanced-mode fields, the lease-rate guard's commit path). Distinct fields rather
 * than raw change events because numeric fields commit on every keystroke — typing
 * "65000" would otherwise count as ~6 changes. Programmatic updates — the auto-fill
 * effects in AdvancedMode, saved-quote loads, share-link hydration — deliberately do
 * NOT go through here, so the count reflects genuine hands-on use.
 */

export const COFFEE_NUDGE_MIN_ACTIVE_MS = 4 * 60 * 1000;
export const COFFEE_NUDGE_MIN_CHANGES = 4;
export const COFFEE_NUDGE_SHOWN_KEY = "nlc2-coffee-nudge-shown";

type Listener = (count: number) => void;

const touchedFields = new Set<string>();
const listeners = new Set<Listener>();

/** Record that the user edited `field`. Repeat edits of the same field don't increase the count. */
export function noteInputChange(field: string): void {
  if (touchedFields.has(field)) return;
  touchedFields.add(field);
  const count = touchedFields.size;
  for (const l of listeners) {
    try {
      l(count);
    } catch {
      // never let a listener break input handling
    }
  }
}

/** Number of distinct fields the user has edited this page load. */
export function getInputChangeCount(): number {
  return touchedFields.size;
}

export function subscribeInputChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: reset the module-level counter between cases. */
export function _resetInputChangeCountForTests(): void {
  touchedFields.clear();
}

export function shouldShowCoffeeNudge(args: { activeMs: number; changes: number; alreadyShown: boolean }): boolean {
  if (args.alreadyShown) return false;
  return args.activeMs >= COFFEE_NUDGE_MIN_ACTIVE_MS && args.changes >= COFFEE_NUDGE_MIN_CHANGES;
}

export function hasCoffeeNudgeBeenShown(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(COFFEE_NUDGE_SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markCoffeeNudgeShown(): void {
  try {
    window.localStorage.setItem(COFFEE_NUDGE_SHOWN_KEY, "1");
  } catch {
    // storage unavailable (private mode, quota) — the nudge may show again next visit; acceptable
  }
}
