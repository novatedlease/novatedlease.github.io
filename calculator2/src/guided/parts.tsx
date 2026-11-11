import { useContext, useId, type ReactNode } from "react";
import { MissingFields } from "./missing";
import { FieldWrapper } from "../components/ui/Field";
import { InfoTooltip } from "../components/ui/InfoTooltip";
import type { Finding } from "./checks";
import { amountProblem, moneyValue, type Money } from "./draft";

function NotAnswered() {
  // Text as well as the red outline, so it doesn't rely on colour alone.
  return <div className="gd-missing-note">Not answered yet</div>;
}

/** Text input for a dollar amount. Starts empty; an optional "none" tick records an explicit zero. */
export function MoneyInput({
  label,
  value,
  onChange,
  hint,
  where,
  prefix = "$",
  suffix,
  noneLabel,
  suggestion,
  tooltip,
  estimatedNote,
  placeholder,
  findings,
  row,
  extra,
  field,
}: {
  /** The answer this box fills in (a GuidedDraft key), so it can be marked when left unanswered. */
  field?: string;
  label: ReactNode;
  value: Money;
  onChange: (m: Money) => void;
  hint?: ReactNode;
  /** Where to find this on the quote. Shown as a distinct line so it reads as an instruction. */
  where?: ReactNode;
  prefix?: string;
  suffix?: string;
  /** When set, shows a checkbox that records an explicit 0 ("no documentation fee on my quote"). */
  noneLabel?: string;
  /** A typical figure the reader can accept with one tap. Never applied automatically. */
  suggestion?: number | null;
  /** Longer explanation behind an info icon next to the label. */
  tooltip?: ReactNode;
  /** Replaces the default "not from your quote" note shown under an accepted typical figure. */
  estimatedNote?: ReactNode;
  placeholder?: string;
  findings?: Finding[];
  /** Label on the left, box on the right: for lists of like amounts, so they scan as a table. */
  row?: boolean;
  /** Shown under the box, before any findings: preset buttons and the like. */
  extra?: ReactNode;
}) {
  const id = useId();
  const missing = useContext(MissingFields).has(field ?? "");
  const v = moneyValue(value);
  // A "none" saved before its tickbox was removed shows as an editable 0.
  const lockedNone = value.none && !!noneLabel;
  // Typed but unreadable ("85k a year"): say so here, not just "Still to answer" at the bottom.
  const problem = value.none ? null : amountProblem(value.text);
  const shown: Finding[] = problem
    ? [{ code: "unreadable", level: "error", message: problem }, ...(findings ?? [])]
    : (findings ?? []);
  const worst =
    shown.find((f) => f.level === "error") ??
    shown.find((f) => f.level === "warn");
  const control = (
    <>
      <div className="nlc-field__control gd-money">
        {prefix && <span className="nlc-field__prefix">{prefix}</span>}
        <input
          id={id}
          className="nlc-input"
          inputMode="decimal"
          autoComplete="off"
          placeholder={lockedNone ? "0" : (placeholder ?? "Type the amount")}
          disabled={lockedNone}
          aria-invalid={worst?.level === "error" || missing ? true : undefined}
          value={value.none ? (lockedNone ? "" : "0") : value.text}
          onChange={(e) =>
            onChange({ text: e.target.value, none: false, estimated: false })
          }
        />
        {suffix && <span className="nlc-field__suffix">{suffix}</span>}
      </div>
      {noneLabel && (
        <label className="gd-none">
          <input
            type="checkbox"
            checked={value.none}
            onChange={(e) =>
              onChange({ text: "", none: e.target.checked, estimated: false })
            }
          />
          <span>{noneLabel}</span>
        </label>
      )}
      {suggestion != null && suggestion > 0 && !value.none && v === null && (
        <button
          type="button"
          className="gd-suggest"
          onClick={() =>
            onChange({
              text: String(Math.round(suggestion)),
              none: false,
              estimated: true,
            })
          }
        >
          Not sure? Use a typical figure (about $
          {Math.round(suggestion).toLocaleString("en-AU")})
        </button>
      )}
      {value.estimated && !value.none && (
        <div className="gd-estimated">
          {estimatedNote ??
            "Typical estimate, not from your quote. Replace it if you have the real figure."}
        </div>
      )}
      {missing && <NotAnswered />}
      {extra}
      <FindingList findings={shown} />
    </>
  );
  if (row)
    return (
      <div className={`nlc-field gd-row${missing ? " gd-field--missing" : ""}`} data-field={field}>
        <div className="gd-row__head">
          <label className="nlc-field__label" htmlFor={id}>
            {label}
            {tooltip}
          </label>
          {where && <div className="gd-where">{where}</div>}
        </div>
        <div className="gd-row__body">
          {control}
          {hint && <div className="nlc-field__hint">{hint}</div>}
        </div>
      </div>
    );
  return (
    <FieldWrapper
      label={label}
      tooltip={tooltip}
      htmlFor={id}
      hint={hint}
      dataField={field}
      className={missing ? "gd-field--missing" : undefined}
    >
      {where && <div className="gd-where">{where}</div>}
      {control}
    </FieldWrapper>
  );
}

export type Choice<T> = { value: T; label: ReactNode; sub?: ReactNode };

/** Big tappable answer buttons, one tap per question. */
export function Choices<T extends string | number | boolean>({
  label,
  value,
  onChange,
  options,
  hint,
  where,
  columns,
  tooltip,
  field,
}: {
  /** The answer this question fills in (a GuidedDraft key), so it can be marked when left unanswered. */
  field?: string;
  label: ReactNode;
  value: T | null;
  onChange: (v: T) => void;
  options: Choice<T>[];
  hint?: ReactNode;
  where?: ReactNode;
  columns?: number;
  /** Background behind an ⓘ next to the label: anything not needed to answer correctly. */
  tooltip?: ReactNode;
}) {
  const id = useId();
  const missing = useContext(MissingFields).has(field ?? "");
  return (
    <FieldWrapper
      label={label}
      tooltip={tooltip}
      htmlFor={id}
      hint={hint}
      dataField={field}
      className={missing ? "gd-field--missing" : undefined}
    >
      {where && <div className="gd-where">{where}</div>}
      <div
        id={id}
        className="gd-choices"
        role="group"
        style={
          columns
            ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className="gd-choice"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            <span className="gd-choice__label">{o.label}</span>
            {o.sub && <span className="gd-choice__sub">{o.sub}</span>}
          </button>
        ))}
      </div>
      {missing && <NotAnswered />}
    </FieldWrapper>
  );
}

export function FindingList({ findings }: { findings?: Finding[] }) {
  if (!findings || findings.length === 0) return null;
  return (
    <div className="gd-findings">
      {findings.map((f) => (
        <div
          key={f.code}
          className={`gd-finding gd-finding--${f.level}`}
          role={f.level === "error" ? "alert" : undefined}
        >
          <span className="gd-finding__icon" aria-hidden="true">
            {f.level === "ok" ? "✓" : f.level === "info" ? "i" : "!"}
          </span>
          <div>
            {f.message}
            {f.link && (
              <>
                {" "}
                <a href={f.link.href} target="_blank" rel="noreferrer">
                  {f.link.label}
                </a>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Help({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="gd-help">
      <summary>{title}</summary>
      <div className="gd-help__body">{children}</div>
    </details>
  );
}

/** An ⓘ with background text: progressive disclosure for anything not needed to answer correctly. */
export function Tip({ children, width }: { children: ReactNode; width?: number }) {
  return <InfoTooltip text={children} width={width} />;
}
