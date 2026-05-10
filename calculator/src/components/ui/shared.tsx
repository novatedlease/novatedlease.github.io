/**
 * Shared UI atoms for the calculator's Details output sections.
 * Keep this file free of engine imports — presentational only.
 */
import React from "react";

// ─── colour helpers ────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function tint(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

/** A visually prominent key-metric tile. */
export function Stat({
  label,
  value,
  note,
  color = "#0b5cab",
}: {
  label: string;
  value: string;
  note?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: tint(color, 0.055),
        border: `1px solid ${tint(color, 0.22)}`,
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: tint(color, 0.75),
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color,
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {note && (
        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.5)", marginTop: 5, lineHeight: 1.35 }}>
          {note}
        </div>
      )}
    </div>
  );
}

/** Responsive grid wrapper for Stat cards. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 8,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

// ─── Sub-header ────────────────────────────────────────────────────────────────

/** Section sub-header inside a collapsible card. */
export function SubHead({
  children,
  color = "rgba(0,0,0,0.45)",
  mt = 16,
}: {
  children: React.ReactNode;
  color?: string;
  mt?: number;
}) {
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: 10.5,
        letterSpacing: "0.055em",
        textTransform: "uppercase",
        color,
        marginTop: mt,
        marginBottom: 8,
        paddingBottom: 5,
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Key-Value row ─────────────────────────────────────────────────────────────

/** A single label → value row used inside KV groups. */
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
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 8,
        padding: "5px 0",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ fontSize: 13, opacity: bold ? 1 : 0.75, flex: "1 1 0", lineHeight: 1.3, fontWeight: bold ? 700 : 400 }}>
        {label}
        {tooltip && <span style={{ marginLeft: 6 }}>{tooltip}</span>}
      </div>
      <div
        style={{
          fontWeight: bold || highlight ? 700 : 500,
          fontSize: 13,
          whiteSpace: "nowrap",
          color: color ?? (highlight ? "#0b5cab" : "inherit"),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Note / callout box ────────────────────────────────────────────────────────

/** Inline note or callout with a coloured left-border. */
export function NoteBox({
  children,
  color = "#0b5cab",
  mt = 12,
}: {
  children: React.ReactNode;
  color?: string;
  mt?: number;
}) {
  return (
    <div
      style={{
        background: tint(color, 0.055),
        border: `1px solid ${tint(color, 0.22)}`,
        borderLeft: `3px solid ${tint(color, 0.65)}`,
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 12.5,
        lineHeight: 1.5,
        color: "rgba(0,0,0,0.82)",
        marginTop: mt,
      }}
    >
      {children}
    </div>
  );
}

// ─── Styled table ──────────────────────────────────────────────────────────────

const TH_STYLE: React.CSSProperties = {
  textAlign: "left",
  padding: "7px 10px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  background: "#0b5cab",
  color: "#fff",
  whiteSpace: "nowrap",
};

const TH_RIGHT: React.CSSProperties = { ...TH_STYLE, textAlign: "right" };

const TD_STYLE: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 13,
  borderTop: "1px solid rgba(0,0,0,0.07)",
  verticalAlign: "top",
};

const TD_RIGHT: React.CSSProperties = {
  ...TD_STYLE,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

/** Pass colour-coded accents to override the default blue header for a column. */
export const th = (extra?: React.CSSProperties): React.CSSProperties => ({ ...TH_STYLE, ...extra });
export const thR = (extra?: React.CSSProperties): React.CSSProperties => ({ ...TH_RIGHT, ...extra });
export const td = (extra?: React.CSSProperties): React.CSSProperties => ({ ...TD_STYLE, ...extra });
export const tdR = (extra?: React.CSSProperties): React.CSSProperties => ({ ...TD_RIGHT, ...extra });

/** Styled table wrapper — applies consistent border-radius + shadow. */
export function Table({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.09)",
          fontSize: 13,
          ...style,
        }}
      >
        {children}
      </table>
    </div>
  );
}

/** Striped row background for even tbody rows. */
export function stripe(index: number): React.CSSProperties {
  return index % 2 === 0 ? {} : { background: "rgba(0,0,0,0.025)" };
}

/** A bold summary/total row inside a Table. */
export const TOTAL_ROW: React.CSSProperties = {
  background: "rgba(11,92,171,0.06)",
  borderTop: "2px solid rgba(11,92,171,0.2)",
};
