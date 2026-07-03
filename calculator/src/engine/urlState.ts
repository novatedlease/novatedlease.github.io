

import type { Inputs } from "./types";

/**
 * URL state parameter used by the calculator (e.g. ?c=...).
 */
export const URL_STATE_PARAM = "c";

/**
 * Increment this if you ever change the encoding format in a breaking way.
 */
export const URL_STATE_VERSION = 1;

// Payload key is `inputs` (not `i`) to match calculator/src/App.tsx's own inline
// encoder/decoder verbatim — v1 never imports this module, so this is the only
// thing that makes a v2-generated share link actually load correctly in v1 and
// vice versa (both were previously silently falling back to defaults on a
// cross-version link, since the two payload shapes didn't match).
type UrlPayloadV1 = {
  v: 1;
  inputs: Partial<Inputs>;
};

// --- base64 helpers ---------------------------------------------------------

function toBase64(plainUtf8: string): string {
  // Browser first
  if (typeof btoa === "function") {
    // btoa expects latin1; encode as UTF-8 safely.
    const bytes = new TextEncoder().encode(plainUtf8);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // Node / build tooling fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B: any = (globalThis as any).Buffer;
  if (B) return B.from(plainUtf8, "utf8").toString("base64");

  throw new Error("No base64 encoder available in this environment");
}

function fromBase64(b64: string): string {
  if (typeof atob === "function") {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B: any = (globalThis as any).Buffer;
  if (B) return B.from(b64, "base64").toString("utf8");

  throw new Error("No base64 decoder available in this environment");
}

/**
 * Convert base64 to URL-safe variant (RFC 4648 base64url-ish).
 */
function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  // pad to 4
  const padLen = (4 - (b64.length % 4)) % 4;
  return b64 + "=".repeat(padLen);
}

// --- public API -------------------------------------------------------------

/**
 * Encode a full Inputs object into a compact URL parameter value.
 *
 * We store only the raw inputs. Derived values must always be recomputed.
 */
export function encodeInputsToUrlParam(inputs: Inputs): string {
  const payload: UrlPayloadV1 = { v: URL_STATE_VERSION, inputs };
  const json = JSON.stringify(payload);
  return toBase64Url(toBase64(json));
}

/**
 * Try to decode Inputs from a URL param value.
 *
 * - Returns `defaults` if the payload is missing/invalid.
 * - Merges decoded values over defaults.
 * - Coerces values to the same primitive types as defaults where possible.
 */
export function decodeInputsFromUrlParam(
  paramValue: string | null | undefined,
  defaults: Inputs
): Inputs {
  if (!paramValue) return defaults;

  try {
    const json = fromBase64(fromBase64Url(paramValue));
    const parsed = JSON.parse(json) as Partial<UrlPayloadV1>;

    if (!parsed || parsed.v !== 1 || !parsed.inputs || typeof parsed.inputs !== "object") {
      return defaults;
    }

    // Coerce each key to the same primitive type as the default.
    const merged: Inputs = { ...defaults };

    (Object.keys(defaults) as (keyof Inputs)[]).forEach((k) => {
      if (!(k in parsed.inputs!)) return;
      const incoming = (parsed.inputs as Partial<Inputs>)[k];
      const def = defaults[k];

      // Preserve null/undefined by falling back to default.
      if (incoming === null || incoming === undefined) return;

      // Coerce primitives
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

      // For other shapes (rare in Inputs), only accept if it matches the default's typeof.
      if (typeof incoming === typeof def) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (merged as any)[k] = incoming as any;
      }
    });

    return merged;
  } catch {
    return defaults;
  }
}

/**
 * Convenience helpers for working with window.location / search strings.
 */
export function getInputsFromLocationSearch(search: string, defaults: Inputs): Inputs {
  const sp = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  return decodeInputsFromUrlParam(sp.get(URL_STATE_PARAM), defaults);
}

export function setUrlParamForInputs(search: string, inputs: Inputs): string {
  const sp = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  sp.set(URL_STATE_PARAM, encodeInputsToUrlParam(inputs));
  const next = sp.toString();
  return next ? `?${next}` : "";
}