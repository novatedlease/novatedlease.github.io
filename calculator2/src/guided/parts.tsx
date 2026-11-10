import { useId, type ReactNode } from "react";
import { FieldWrapper } from "../components/ui/Field";
import { InfoTooltip } from "../components/ui/InfoTooltip";
import type { Finding } from "./checks";
import { moneyValue, type Money } from "./draft";

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
}: {
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
}) {
  const id = useId();
  const v = moneyValue(value);
  const worst =
    findings?.find((f) => f.level === "error") ??
    findings?.find((f) => f.level === "warn");
  return (
    <FieldWrapper label={label} tooltip={tooltip} htmlFor={id} hint={hint}>
      {where && <div className="gd-where">{where}</div>}
      <div className="nlc-field__control gd-money">
        {prefix && <span className="nlc-field__prefix">{prefix}</span>}
        <input
          id={id}
          className="nlc-input"
          inputMode="decimal"
          autoComplete="off"
          placeholder={value.none ? "0" : (placeholder ?? "Type the amount")}
          disabled={value.none}
          aria-invalid={worst?.level === "error" ? true : undefined}
          value={value.none ? "" : value.text}
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
      <FindingList findings={findings} />
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
}: {
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
  return (
    <FieldWrapper label={label} tooltip={tooltip} htmlFor={id} hint={hint}>
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
