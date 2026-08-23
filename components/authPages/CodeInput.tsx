'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The six-digit code field.
 *
 * One input, not six boxes. Six boxes look tidier and break everything that
 * matters: pasting a code puts all six characters in the first box, a screen
 * reader announces six unlabelled fields, and `autocomplete="one-time-code"`
 * — which is what makes a phone offer the code above the keyboard — only works
 * on a single field.
 *
 * `inputMode="numeric"` rather than `type="number"`: a number input strips
 * leading zeros, and a code beginning 0 is a perfectly ordinary code.
 */
export default function CodeInput({
  value,
  onChange,
  onComplete,
  label = 'Six-digit code',
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Fired once six digits are in, so nobody hunts for the button. */
  onComplete?: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    onChange(digits);
    if (digits.length === 6) onComplete?.();
  };

  return (
    <div>
      <Label htmlFor="code" className="mb-2 block font-body text-sm text-background/80">
        {label}
      </Label>
      <Input
        id="code"
        name="code"
        value={value}
        onChange={(event) => handle(event.target.value)}
        onPaste={(event) => {
          event.preventDefault();
          handle(event.clipboardData.getData('text'));
        }}
        disabled={disabled}
        required
        autoFocus
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="000000"
        aria-describedby="code-hint"
        className="h-14 border-background/45 bg-card/5 text-center font-body text-2xl tracking-[0.5em] text-background placeholder:text-background/30 focus:border-sage focus:ring-sage-deep"
      />
      <p id="code-hint" className="mt-2 font-body text-xs text-background/60">
        Six digits, from the email we just sent.
      </p>
    </div>
  );
}
