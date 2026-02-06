// src/utils/analytics.ts
type Params = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function trackEvent(name: string, params: Params = {}) {
  try {
    if (typeof window === "undefined") return;
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, params);
  } catch {
    // ignore
  }
}

// Fire once per session (tab session) using sessionStorage
export function trackOncePerSession(key: string, name: string, params: Params = {}) {
  try {
    if (typeof window === "undefined") return;
    const storageKey = `nl_evt_${key}`;
    if (window.sessionStorage.getItem(storageKey) === "1") return;
    window.sessionStorage.setItem(storageKey, "1");
    trackEvent(name, params);
  } catch {
    // ignore
  }
}