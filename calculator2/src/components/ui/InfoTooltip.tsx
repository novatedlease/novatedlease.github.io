import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function InfoTooltip(props: { text: React.ReactNode; width?: number }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const [hoverCapable, setHoverCapable] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  });

  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Delayed-close (hover-intent) pattern: closing on mouseleave is deferred by a short
  // grace period, cancelled if the cursor re-enters either the trigger or the popup within
  // that window. This is needed because the popup is portalled to document.body and
  // positioned independently of the trigger icon — a straight-line cursor path from the
  // icon to a link inside the popup usually passes over unrelated page elements first, so
  // relatedTarget-based containment checks (checking whether the cursor moved directly onto
  // the other element) fail and the popup was closing before a link inside it could be clicked.
  const closeTimerRef = useRef<number | null>(null);

  function cancelClose() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, 250);
  }

  useEffect(() => () => cancelClose(), []);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePos = () => {
      const el = wrapRef.current;
      if (!el) return;

      const r = el.getBoundingClientRect();
      const margin = 10;

      const width = props.width ?? 380;
      const maxWidth = Math.min(window.innerWidth * 0.86, 520);
      const finalWidth = Math.min(width, maxWidth);

      let left = r.left;
      let top = r.bottom + 8;

      left = Math.max(margin, Math.min(left, window.innerWidth - finalWidth - margin));

      const approxHeight = 140;
      if (top + approxHeight > window.innerHeight - margin) {
        top = Math.max(margin, r.top - 8 - approxHeight);
      }

      setPos({ top, left });
    };

    updatePos();

    const onScroll = () => updatePos();
    const onResize = () => updatePos();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, props.width]);

  useEffect(() => {
    if (!open) setPos(null);
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setHoverCapable(mq.matches);

    update();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyMq: any = mq;

    if (mq.addEventListener) mq.addEventListener("change", update);
    else if (anyMq.addListener) anyMq.addListener(update);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", update);
      else if (anyMq.removeListener) anyMq.removeListener(update);
    };
  }, []);

  useEffect(() => {
    if (hoverCapable) return;
    if (!open) return;

    function onDocPointerDown(e: PointerEvent) {
      const wrap = wrapRef.current;
      const popup = popupRef.current;

      if (!(e.target instanceof Node)) return;

      const inWrap = wrap ? wrap.contains(e.target) : false;
      const inPopup = popup ? popup.contains(e.target) : false;

      if (!inWrap && !inPopup) setOpen(false);
    }

    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [hoverCapable, open]);

  function renderInline(s: string): React.ReactNode {
    const parts: React.ReactNode[] = [];

    const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;

    const pushWithBareUrls = (chunk: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      let i = 0;
      let u: RegExpExecArray | null;
      while ((u = urlRegex.exec(chunk)) !== null) {
        const before = chunk.slice(i, u.index);
        if (before) parts.push(before);
        const url = u[1];
        parts.push(
          <a key={`${u.index}-${url}`} href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        );
        i = u.index + url.length;
      }
      const rest = chunk.slice(i);
      if (rest) parts.push(rest);
    };

    while ((m = mdRegex.exec(s)) !== null) {
      const before = s.slice(last, m.index);
      if (before) pushWithBareUrls(before);

      const label = m[1];
      const url = m[2];
      parts.push(
        <a key={`${m.index}-${url}`} href={url} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );

      last = m.index + m[0].length;
    }

    const tail = s.slice(last);
    if (tail) pushWithBareUrls(tail);

    return <>{parts}</>;
  }

  function renderTooltipBody(): React.ReactNode {
    if (typeof props.text !== "string") return props.text;

    const paras = props.text
      .split(/\n+/g)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paras.length <= 1) return <>{renderInline(props.text.trim())}</>;

    return (
      <>
        {paras.map((p, idx) => (
          <p key={idx} style={{ margin: idx === paras.length - 1 ? 0 : "0 0 10px 0" }}>
            {renderInline(p)}
          </p>
        ))}
      </>
    );
  }

  const icon = (
    <span
      className="nlc-info-trigger"
      aria-label="More information"
      role="button"
      tabIndex={0}
      onMouseEnter={() => {
        if (hoverCapable) {
          cancelClose();
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (hoverCapable) scheduleClose();
      }}
      onClick={(e) => {
        if (hoverCapable) return;
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
        if (e.key === "Escape") setOpen(false);
      }}
    >
      i
    </span>
  );

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => {
        if (hoverCapable) {
          cancelClose();
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (hoverCapable) scheduleClose();
      }}
    >
      {icon}

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            role="tooltip"
            className="nlc-info-popup"
            onMouseEnter={() => {
              if (hoverCapable) cancelClose();
            }}
            onMouseLeave={() => {
              if (hoverCapable) scheduleClose();
            }}
            style={{
              top: pos.top,
              left: pos.left,
              width: props.width ?? 380,
              maxWidth: "min(86vw, 520px)",
            }}
          >
            {renderTooltipBody()}
          </div>,
          document.body
        )}
    </span>
  );
}
