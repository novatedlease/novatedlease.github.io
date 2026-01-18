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

  // Measure and position tooltip (viewport-relative) when opened.
  useLayoutEffect(() => {
    if (!open) return;

    const updatePos = () => {
      const el = wrapRef.current;
      if (!el) return;

      const r = el.getBoundingClientRect();
      const margin = 10;

      // Prefer below-left; clamp to viewport.
      const width = props.width ?? 380;
      const maxWidth = Math.min(window.innerWidth * 0.86, 520);
      const finalWidth = Math.min(width, maxWidth);

      let left = r.left;
      let top = r.bottom + 8;

      // Clamp horizontally
      left = Math.max(margin, Math.min(left, window.innerWidth - finalWidth - margin));

      // If it would go below viewport, try above.
      const approxHeight = 140; // good-enough estimate; avoids needing a second measure pass
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

    // Safari < 14 uses addListener/removeListener
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
    // Supports [label](url) and bare https://... URLs
    const parts: React.ReactNode[] = [];

    // First, expand markdown links.
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
          <a
            key={`${u.index}-${url}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0b5cab", fontWeight: 700, textDecoration: "underline" }}
          >
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
        <a
          key={`${m.index}-${url}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0b5cab", fontWeight: 700, textDecoration: "underline" }}
        >
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

    // Split into paragraphs by newlines; blank lines act as separators too.
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
      aria-label="Info"
      role="button"
      tabIndex={0}
      onMouseEnter={() => {
        if (hoverCapable) setOpen(true);
      }}
      onMouseLeave={() => {
        if (hoverCapable) setOpen(false);
      }}
      onFocus={() => {
        // Keyboard users should still open regardless of hover capability
        setOpen(true);
      }}
      onBlur={() => {
        // Keyboard users should still close
        setOpen(false);
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
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        marginLeft: 6,
        borderRadius: 999,
        border: "1px solid rgba(11, 92, 171, 0.55)",
        color: "#0b5cab",
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
        cursor: "pointer",
        userSelect: "none",
        background: "#ffffff",
      }}
    >
      i
    </span>
  );

  return (
    <span
      ref={wrapRef}
      onMouseEnter={() => {
        if (hoverCapable) setOpen(true);
      }}
      onMouseLeave={(e) => {
        if (!hoverCapable) return;
        const next = e.relatedTarget as Node | null;
        const popup = popupRef.current;
        if (next && popup && popup.contains(next)) return;
        setOpen(false);
      }}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {icon}

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-modal="false"
            onMouseEnter={() => {
              if (hoverCapable) setOpen(true);
            }}
            onMouseLeave={(e) => {
              if (!hoverCapable) return;
              const next = e.relatedTarget as Node | null;
              const wrap = wrapRef.current;
              if (next && wrap && wrap.contains(next)) return;
              setOpen(false);
            }}
            style={{
              position: "fixed",
              zIndex: 2147483647,
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: props.width ?? 380,
              maxWidth: "min(86vw, 520px)",
              padding: 14,
              borderRadius: 14,
              border: "1px solid rgba(11, 92, 171, 0.35)",
              background: "#eef5ff",
              backgroundColor: "#eef5ff",
              opacity: 1,
              boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
              fontSize: 14,
              lineHeight: 1.45,
              pointerEvents: "auto",
              backdropFilter: "none",
              filter: "none",
              isolation: "isolate",
            }}
          >
            {renderTooltipBody()}
          </div>,
          document.body
        )}
    </span>
  );
}
