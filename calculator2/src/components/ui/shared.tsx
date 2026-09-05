/**
 * Shared UI atoms for report/output sections. CSS classes (styles/components.css)
 * carry structural styling; only the per-instance accent colour is inline, since
 * each report section picks its own arbitrary accent (e.g. "var(--nlc-acc-red)" for risk
 * sections) that a fixed set of CSS classes can't parametrise.
 *
 * API intentionally mirrors calculator/src/components/ui/shared.tsx so v1 report
 * logic (LeaseReport, FinancialReport, ATI, SG, WhatIf, WorstCase, ...) can be
 * ported with minimal changes beyond swapping the import.
 */
import React from "react";

function hexToRgb(hex: string) {
  // Callers occasionally pass a CSS var() reference by mistake (e.g. "var(--nlc-blue)")
  // instead of a literal hex colour — that isn't parseable here (no DOM access to
  // resolve it), so fall back to the default accent rather than emitting NaN into
  // the rgba() string, which browsers silently drop, leaving cards unstyled.
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  const safeHex = match ? hex : "var(--nlc-blue)";
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  return { r, g, b };
}

function tint(color: string, alpha: number) {
  // Accents are now CSS custom properties (so they can swap in dark mode); mix them in CSS.
  if (color.startsWith("var(")) return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Stat card ─────────────────────────────────────────────────────────────

export function Stat({
  label,
  value,
  note,
  color = "var(--nlc-blue)",
}: {
  label: string;
  value: string;
  note?: string;
  color?: string;
}) {
  return (
    <div className="nlc-stat" style={{ background: tint(color, 0.055), borderColor: tint(color, 0.22) }}>
      <div className="nlc-stat__label" style={{ color: tint(color, 0.85) }}>
        {label}
      </div>
      <div className="nlc-stat__value nlc-num" style={{ color }}>
        {value}
      </div>
      {note && <div className="nlc-stat__note">{note}</div>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="nlc-stat-grid">{children}</div>;
}

// ─── Sub-header ────────────────────────────────────────────────────────────

export function SubHead({
  children,
  color,
  mt,
}: {
  children: React.ReactNode;
  color?: string;
  mt?: number;
}) {
  return (
    <div className="nlc-subhead" style={{ color, marginTop: mt }}>
      {children}
    </div>
  );
}

// ─── Key-Value row ─────────────────────────────────────────────────────────

export function KV({
  label,
  value,
  tooltip,
  bold,
  highlight,
  color,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tooltip?: React.ReactNode;
  bold?: boolean;
  highlight?: boolean;
  color?: string;
}) {
  const cls = ["nlc-kv", bold && "nlc-kv--bold", highlight && "nlc-kv--highlight"].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className="nlc-kv__label">{label}</div>
      <div className="nlc-kv__value nlc-num" style={color ? { color } : undefined}>
        {value}
        {tooltip && <span style={{ marginLeft: 6 }}>{tooltip}</span>}
      </div>
    </div>
  );
}

// ─── Note / callout box ──────────────────────────────────────────────────

export function NoteBox({
  children,
  color = "var(--nlc-blue)",
  mt,
}: {
  children: React.ReactNode;
  color?: string;
  mt?: number;
}) {
  return (
    <div
      className="nlc-notebox"
      style={{
        background: tint(color, 0.055),
        borderColor: tint(color, 0.22),
        borderLeftColor: tint(color, 0.65),
        marginTop: mt,
      }}
    >
      {children}
    </div>
  );
}

// ─── Styled table ──────────────────────────────────────────────────────────
// th/td carry no inline style (base look comes from the .nlc-table CSS rules);
// thR/tdR add the right-align + tabular-nums overrides Table cells need for
// numeric columns. `extra` lets call sites layer one-off overrides, same as v1.

export function th(extra?: React.CSSProperties): React.CSSProperties {
  return { ...extra };
}
export function thR(extra?: React.CSSProperties): React.CSSProperties {
  return { textAlign: "right", ...extra };
}
export function td(extra?: React.CSSProperties): React.CSSProperties {
  return { ...extra };
}
export function tdR(extra?: React.CSSProperties): React.CSSProperties {
  return { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", ...extra };
}

export function Table({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="nlc-table-wrap">
      <table className="nlc-table" style={style}>
        {children}
      </table>
    </div>
  );
}

export function stripe(_index: number): React.CSSProperties {
  return {};
}

/** Bold summary/total row inside a Table — matches v1's TOTAL_ROW export. */
export const TOTAL_ROW: React.CSSProperties = {
  background: "var(--nlc-blue-light)",
  borderTop: "2px solid var(--nlc-blue-mid)",
};
