import { useEffect, useState } from "react";

/**
 * True when the viewport is at or below `maxWidthPx`. Used sparingly, only for
 * the handful of places where a layout needs to switch shape (e.g. a fixed
 * 3-column grid collapsing to 1 column) rather than just reflowing via CSS.
 */
export function useIsMobile(maxWidthPx = 640): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [maxWidthPx]);

  return isMobile;
}
