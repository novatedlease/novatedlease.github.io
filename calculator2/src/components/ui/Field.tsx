import React, { useId, useState } from "react";

type FieldWrapperProps = {
  label: React.ReactNode;
  tooltip?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Omitted when the control isn't a form field (a button group labelled with aria-labelledby). */
  htmlFor?: string;
  children: React.ReactNode;
  /** Extra class on the field, e.g. to mark it as not yet answered. */
  className?: string;
  /** Names the answer this field holds, so a screen can find it (Guided's "Still to answer"). */
  dataField?: string;
};

export function FieldWrapper({ label, tooltip, hint, error, htmlFor, children, className, dataField }: FieldWrapperProps) {
  return (
    <div className={className ? `nlc-field ${className}` : "nlc-field"} data-field={dataField}>
      <label className="nlc-field__label" htmlFor={htmlFor}>
        {label}
        {tooltip}
      </label>
      {children}
      {error ? (
        <div className="nlc-field__error" role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="nlc-field__hint">{hint}</div>
      ) : null}
    </div>
  );
}

type NumberFieldProps = {
  label: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  /** Defaults to 0: no figure in this calculator can be negative. */
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  tooltip?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  id?: string;
  placeholder?: string;
};

function formatNumber(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-AU", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Number input that shows a formatted, locale-grouped value when not focused
 * (e.g. "65,000") and a raw editable value while focused, committing via
 * onChange on blur. Clamps to [min, max] on commit (min defaults to 0), and says so
 * under the box, so a typed figure is never changed silently.
 */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  max,
  step,
  decimals = 2,
  tooltip,
  hint,
  error,
  id,
  placeholder,
}: NumberFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  /** Set when the last typed figure was outside [min, max] and got pulled back in. */
  const [clampNote, setClampNote] = useState<string | null>(null);

  const displayValue = focused ? draft : formatNumber(value, decimals);

  function commit(raw: string) {
    const cleaned = raw.replace(/[^0-9.\-]/g, "");
    let n = cleaned === "" || cleaned === "-" ? 0 : parseFloat(cleaned);
    if (!Number.isFinite(n)) n = 0;
    // "52.4k" means 52,400, not 52.4 (letters are otherwise dropped).
    if (/^\s*\$?\s*-?[\d.,]+\s*k\s*$/i.test(raw)) n *= 1000;
    const typed = n;
    n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    setClampNote(
      typed < min
        ? min === 0
          ? "This can't be negative, so it's been set to 0."
          : `The lowest allowed is ${formatNumber(min, decimals)}.`
        : n < typed
          ? `The highest allowed is ${formatNumber(n, decimals)}.`
          : null,
    );
    onChange(n);
  }

  return (
    <FieldWrapper label={label} tooltip={tooltip} hint={hint} error={error ?? clampNote} htmlFor={fieldId}>
      <div className="nlc-field__control">
        {prefix && <span className="nlc-field__prefix">{prefix}</span>}
        <input
          id={fieldId}
          className="nlc-input nlc-num"
          type="text"
          inputMode="decimal"
          value={displayValue}
          placeholder={placeholder}
          aria-invalid={!!(error ?? clampNote)}
          onFocus={() => {
            setFocused(true);
            setDraft(Number.isFinite(value) ? String(round(value, decimals)) : "");
          }}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => {
            setFocused(false);
            commit(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if ((e.key === "ArrowUp" || e.key === "ArrowDown") && step) {
              // While focused the box shows the typed text, so update that too, not just the value.
              e.preventDefault();
              const next = Math.min(max ?? Infinity, Math.max(min, round(value + (e.key === "ArrowUp" ? step : -step), decimals)));
              setDraft(String(next));
              setClampNote(null);
              onChange(next);
            }
          }}
        />
        {suffix && <span className="nlc-field__suffix">{suffix}</span>}
      </div>
    </FieldWrapper>
  );
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function CurrencyField(props: Omit<NumberFieldProps, "prefix" | "decimals"> & { decimals?: number }) {
  return <NumberField {...props} prefix="$" decimals={props.decimals ?? 2} />;
}

export function PercentField(props: Omit<NumberFieldProps, "suffix" | "decimals"> & { decimals?: number }) {
  return <NumberField {...props} suffix="%" decimals={props.decimals ?? 2} step={props.step ?? 0.1} />;
}

type PillOption<T extends string> = { value: T; label: string };

export function PillGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  tooltip,
  hint,
}: {
  label: React.ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: PillOption<T>[];
  tooltip?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  const autoId = useId();
  return (
    <FieldWrapper label={label} tooltip={tooltip} hint={hint} htmlFor={autoId}>
      <div className="nlc-pill-group" id={autoId} role="group">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="nlc-pill-group__btn"
            aria-pressed={value === opt.value}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </FieldWrapper>
  );
}

export function YesNoToggle({
  label,
  value,
  onChange,
  tooltip,
  hint,
}: {
  label: React.ReactNode;
  value: "Yes" | "No";
  onChange: (v: "Yes" | "No") => void;
  tooltip?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <PillGroup
      label={label}
      value={value}
      onChange={onChange}
      tooltip={tooltip}
      hint={hint}
      options={[
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
      ]}
    />
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  tooltip,
  hint,
  id,
}: {
  label: React.ReactNode;
  value: T;
  onChange: (v: T) => void;
  /** Options sharing a `group` are shown under that heading (consecutive options only). */
  options: { value: T; label: string; group?: string }[];
  tooltip?: React.ReactNode;
  hint?: React.ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const runs: { group?: string; opts: { value: T; label: string }[] }[] = [];
  for (const o of options) {
    const last = runs[runs.length - 1];
    if (last && last.group === o.group) last.opts.push(o);
    else runs.push({ group: o.group, opts: [o] });
  }
  const render = (opts: { value: T; label: string }[], key: string) =>
    opts.map((opt, i) => (
      <option key={`${key}-${i}`} value={opt.value}>
        {opt.label}
      </option>
    ));
  return (
    <FieldWrapper label={label} tooltip={tooltip} hint={hint} htmlFor={fieldId}>
      <select
        id={fieldId}
        className="nlc-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {runs.map((r, i) =>
          r.group ? (
            <optgroup key={i} label={r.group}>
              {render(r.opts, String(i))}
            </optgroup>
          ) : (
            render(r.opts, String(i))
          ),
        )}
      </select>
    </FieldWrapper>
  );
}

export function DateField({
  label,
  value,
  onChange,
  tooltip,
  hint,
  id,
}: {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  tooltip?: React.ReactNode;
  hint?: React.ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrapper label={label} tooltip={tooltip} hint={hint} htmlFor={fieldId}>
      <input
        id={fieldId}
        className="nlc-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldWrapper>
  );
}
