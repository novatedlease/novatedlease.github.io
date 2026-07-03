import type { Inputs } from "@engine/types";

/**
 * Saved-quotes local storage. Uses the EXACT same key and shape as
 * calculator/src/App.tsx ("nl_saved_quotes_v1", { v: 1, quotes: [...] }) so quotes
 * saved in v1 show up in v2 and vice versa — see CALCULATOR2_REDESIGN_PROMPT.md §2.5.
 */
export type SavedQuoteV1 = {
  v: 1;
  id: string;
  name: string;
  createdAtIso: string;
  inputs: Partial<Inputs>;
};

type SavedQuotesStoreV1 = { v: 1; quotes: SavedQuoteV1[] };

export const QUOTES_STORE_KEY = "nl_saved_quotes_v1";

export function safeLoadQuotes(): SavedQuoteV1[] {
  try {
    const raw = window.localStorage.getItem(QUOTES_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedQuotesStoreV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.quotes)) return [];
    return parsed.quotes.filter((q) => q && q.v === 1 && typeof q.id === "string" && typeof q.name === "string").slice(0, 50);
  } catch {
    return [];
  }
}

export function safeSaveQuotes(quotes: SavedQuoteV1[]) {
  try {
    const payload: SavedQuotesStoreV1 = { v: 1, quotes: quotes.slice(0, 50) };
    window.localStorage.setItem(QUOTES_STORE_KEY, JSON.stringify(payload));
  } catch {
    // ignore (private browsing / storage full)
  }
}

export function newQuoteId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Merges a saved (possibly partial / old-schema) Inputs object over defaults,
 * coercing each field to the default's primitive type. Mirrors the per-field
 * coercion in engine/urlState.ts's decodeInputsFromUrlParam so quotes saved
 * under an older Inputs schema still load safely.
 */
export function coerceInputs(partial: Partial<Inputs>, defaults: Inputs): Inputs {
  const merged: Inputs = { ...defaults };

  (Object.keys(defaults) as (keyof Inputs)[]).forEach((k) => {
    if (!(k in partial)) return;
    const incoming = partial[k];
    const def = defaults[k];
    if (incoming === null || incoming === undefined) return;

    if (typeof def === "number") {
      const n = typeof incoming === "number" ? incoming : Number(incoming);
      if (Number.isFinite(n)) (merged[k] as unknown as number) = n;
      return;
    }
    if (typeof def === "string") {
      (merged[k] as unknown as string) = String(incoming);
      return;
    }
    if (typeof def === "boolean") {
      if (typeof incoming === "boolean") (merged[k] as unknown as boolean) = incoming;
      else if (incoming === "true") (merged[k] as unknown as boolean) = true;
      else if (incoming === "false") (merged[k] as unknown as boolean) = false;
      return;
    }
    if (typeof incoming === typeof def) {
      (merged as Record<string, unknown>)[k] = incoming as unknown;
    }
  });

  return merged;
}

export function exportQuotesFile(quotes: SavedQuoteV1[]) {
  const payload: SavedQuotesStoreV1 = { v: 1, quotes };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `nl-quotes-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImportedQuotesFile(text: string): SavedQuoteV1[] | null {
  try {
    const parsed = JSON.parse(text) as SavedQuotesStoreV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.quotes)) return null;
    return parsed.quotes.filter((q) => q && q.v === 1 && typeof q.id === "string" && typeof q.name === "string");
  } catch {
    return null;
  }
}
