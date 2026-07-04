import React, { useId, useState } from "react";

type FieldWrapperProps = {
  label: React.ReactNode;
  tooltip?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor: string;
  children: React.ReactNode;
};

export function FieldWrapper({ label, tooltip, hint, error, htmlFor, children }: FieldWrapperProps) {
  return (
    <div className="nlc-field">
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
 * onChange on blur. Clamps to [min, max] on commit if provided.
 */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
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

  const displayValue = focused ? draft : formatNumber(value, decimals);

  function commit(raw: string) {
    const cleaned = raw.replace(/[^0-9.\-]/g, "");
    let n = cleaned === "" || cleaned === "-" ? 0 : parseFloat(cleaned);
    if (!Number.isFinite(n)) n = 0;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    onChange(n);
  }

  return (
    <FieldWrapper label={label} tooltip={tooltip} hint={hint} error={error} htmlFor={fieldId}>
      <div className="nlc-field__control">
        {prefix && <span className="nlc-field__prefix">{prefix}</span>}
        <input
          id={fieldId}
          className="nlc-input nlc-num"
          type="text"
          inputMode="decimal"
          value={displayValue}
          placeholder={placeholder}
          aria-invalid={!!error}
          onFocus={() => {
            setFocused(true);
            setDraft(Number.isFinite(value) ? String(round(value, decimals)) : "");
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setFocused(false);
            commit(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "ArrowUp" && step) onChange(round(value + step, decimals));
            if (e.key === "ArrowDown" && step) onChange(round(value - step, decimals));
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
  options: { value: T; label: string }[];
  tooltip?: React.ReactNode;
  hint?: React.ReactNode;
  id?: string;
}) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrapper label={label} tooltip={tooltip} hint={hint} htmlFor={fieldId}>
      <select
        id={fieldId}
        className="nlc-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
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
