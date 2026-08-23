"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * One labelled field, with room for the sentence that explains it.
 *
 * Every setting here changes something a customer sees — an account number on an
 * invoice, a lead time in an email — so the hint is not decoration. Most of these
 * were constants marked PLACEHOLDER, and the hint is where the screen says what
 * a real value looks like.
 */
export function Field({
  label,
  hint,
  required,
  warn,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  /** Shown in terracotta — for a value that is wrong rather than merely unset. */
  warn?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-body text-xs text-ink-muted">
        {label}
        {required && <span className="ml-1 text-terra-ink">*</span>}
      </Label>
      {children}
      {warn ? (
        <p className="font-body text-xs leading-relaxed text-terra-ink">{warn}</p>
      ) : hint ? (
        <p className="font-body text-xs leading-relaxed text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({
  label, hint, required, warn, value, onChange, placeholder, type = "text",
}: {
  label: string; hint?: string; required?: boolean; warn?: string;
  value: string; onChange: (next: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <Field label={label} hint={hint} required={required} warn={warn}>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={type === "number" ? "tabular-nums" : undefined}
      />
    </Field>
  );
}

export function NumberField({
  label, hint, value, onChange, placeholder, step,
}: {
  label: string; hint?: string; value: number;
  onChange: (next: number) => void; placeholder?: string; step?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        placeholder={placeholder}
        className="tabular-nums"
      />
    </Field>
  );
}

export function AreaField({
  label, hint, value, onChange, placeholder, rows = 3,
}: {
  label: string; hint?: string; value: string;
  onChange: (next: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <Textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </Field>
  );
}

export function ToggleField({
  label, hint, checked, onChange,
}: {
  label: string; hint: string; checked: boolean; onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 accent-[var(--sage-deep)]"
      />
      <span className="min-w-0">
        <span className="block font-body text-sm text-foreground">{label}</span>
        <span className="mt-1 block font-body text-xs leading-relaxed text-ink-muted">
          {hint}
        </span>
      </span>
    </label>
  );
}
