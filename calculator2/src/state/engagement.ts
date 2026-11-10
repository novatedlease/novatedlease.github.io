/**
 * Lightweight engagement tracking for the "buy me a coffee" nudge.
 *
 * Tracks the number of DISTINCT fields the user has touched (Guided-mode answers,
 * Advanced-mode fields, the lease-rate guard's commit path). In Guided mode the nudge
 * additionally waits until the reader has spent COFFEE_NUDGE_GUIDED_RESULTS_DWELL_MS on
 * their results (GuidedMode.tsx reports it; App.tsx holds the nudge until then). Distinct fields rather
 * than raw change events because numeric fields commit on every keystroke — typing
 * "65000" would otherwise count as ~6 changes. Programmatic updates — the auto-fill
 * effects in AdvancedMode, saved-quote loads, share-link hydration — deliberately do
 * NOT go through here, so the count reflects genuine hands-on use.
 */

export const COFFEE_NUDGE_MIN_ACTIVE_MS = 4 * 60 * 1000;
export const COFFEE_NUDGE_MIN_CHANGES = 4;
export const COFFEE_NUDGE_SHOWN_KEY = "nlc2-coffee-nudge-shown";
/** Guided mode: visible time on the results page before the nudge may show, so the reader takes in their result first. */
export const COFFEE_NUDGE_GUIDED_RESULTS_DWELL_MS = 30 * 1000;
/** After switching between Guided and Advanced, visible time before the nudge may show, so it doesn't greet the new screen. */
export const COFFEE_NUDGE_AFTER_MODE_SWITCH_MS = 30 * 1000;

/** Where the reader was when the nudge fired, sent with its analytics events so conversion can be split by group. */
export type CoffeeNudgeContext = { mode: "guided" | "advanced"; guided_path: "quote" | "exploring" | "" };

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

/**
 * Wording test (started 2026-11-10): "a" is the original nudge; "b" adds a social-proof line
 * ("More than 130 readers have already bought one to keep it free."). Assigned 50/50 per browser and kept, so a
 * reader always sees the same version. Compare coffee_nudge_clicked_a / _b against
 * coffee_nudge_shown_a / _b in GA4.
 */
export type CoffeeNudgeVariant = "a" | "b";
export const COFFEE_NUDGE_VARIANT_KEY = "nlc2-coffee-nudge-variant";
let variantCache: CoffeeNudgeVariant | null = null;
export function coffeeNudgeVariant(): CoffeeNudgeVariant {
  if (variantCache) return variantCache;
  try {
    const stored = window.localStorage.getItem(COFFEE_NUDGE_VARIANT_KEY);
    if (stored === "a" || stored === "b") return (variantCache = stored);
  } catch {
    // storage unavailable — fall through to a per-page-load assignment
  }
  variantCache = Math.random() < 0.5 ? "a" : "b";
  try {
    window.localStorage.setItem(COFFEE_NUDGE_VARIANT_KEY, variantCache);
  } catch {
    // ignore
  }
  return variantCache;
}
/** Tests only. */
export function resetCoffeeNudgeVariantForTests(): void {
  variantCache = null;
}

export function markCoffeeNudgeShown(): void {
  try {
    window.localStorage.setItem(COFFEE_NUDGE_SHOWN_KEY, "1");
  } catch {
    // storage unavailable (private mode, quota) — the nudge may show again next visit; acceptable
  }
}
