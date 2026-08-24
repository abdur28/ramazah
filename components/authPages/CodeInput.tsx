'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * The code field.
 *
 * One input, not six boxes. Six boxes look tidier and break everything that
 * matters: pasting a code puts all six characters in the first box, a screen
 * reader announces six unlabelled fields, and `autocomplete="one-time-code"`
 * — which is what makes a phone offer the code above the keyboard — only works
 * on a single field.
 *
 * `inputMode="numeric"` rather than `type="number"`: a number input strips
 * leading zeros, and a code beginning 0 is a perfectly ordinary code.
 *
 * **The length is not fixed at six.** It was, and the project turned out to be
 * issuing eight — so the field truncated the code and the button never enabled.
 * Every signup would have dead-ended here. Supabase allows six to ten and it is
 * a dashboard setting, so this accepts the range rather than a number that has
 * to be kept in step with a screen nobody will remember to check.
 *
 * Because the length is unknown, submitting on completion only happens for a
 * paste — which is unambiguous, and is how a code arrives from an email
 * anyway. Typing ends with the button.
 */
const MIN = 6;
const MAX = 10;
export default function CodeInput({
  value,
  onChange,
  onComplete,
  label = 'Confirmation code',
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Fired on a pasted code, so nobody hunts for the button. */
  onComplete?: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const handle = (raw: string, pasted = false) => {
    const digits = raw.replace(/\D/g, '').slice(0, MAX);
    onChange(digits);
    if (pasted && digits.length >= MIN) onComplete?.();
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
          handle(event.clipboardData.getData('text'), true);
        }}
        disabled={disabled}
        required
        autoFocus
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={MAX}
        placeholder="••••••"
        aria-describedby="code-hint"
        className="h-14 border-background/45 bg-card/5 text-center font-body text-2xl tracking-[0.4em] text-background placeholder:text-background/30 focus:border-sage focus:ring-sage-deep"
      />
      <p id="code-hint" className="mt-2 font-body text-xs text-background/60">
        From the email we just sent.
      </p>
    </div>
  );
}
