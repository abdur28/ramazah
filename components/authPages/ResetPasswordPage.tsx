'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle, Eye, EyeClosed, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthShell, { AuthNotice } from '@/components/authPages/AuthShell';
import CodeInput from '@/components/authPages/CodeInput';
import { resetPassword, updateUserPassword, verifyRecoveryCode } from '@/lib/supabase/auth';

/**
 * Resetting a password, end to end.
 *
 * It did not have an end before. The page sent an email whose link pointed back
 * at this same page — the request form — so following it showed you the thing
 * you had just done, and there was no screen anywhere in the site that set a new
 * password. Anyone who forgot theirs was locked out permanently.
 *
 * Three steps now: ask, confirm, choose. Confirming the code leaves a live
 * session, which is the thing that makes the password change legal — without it
 * `updateUser` would be an anonymous request and refused.
 */
type Step = 'request' | 'code' | 'password' | 'done';

const MIN_PASSWORD = 6;

export default function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const request = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const { error: failed } = await resetPassword(email);
    setLoading(false);

    // Deliberately the same outcome whether or not the address has an account:
    // saying "no such account" turns this form into a way of testing whether
    // somebody shops here.
    if (failed && !/not found/i.test(failed)) {
      setError(failed);
      return;
    }
    setStep('code');
  };

  const confirmCode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (loading || code.length !== 6) return;

    setError('');
    setLoading(true);

    const { error: failed } = await verifyRecoveryCode(email, code);
    setLoading(false);

    if (failed) {
      setError(
        /expired|invalid/i.test(failed)
          ? 'That code is wrong or has expired. Ask for a new one.'
          : failed
      );
      setCode('');
      return;
    }
    setStep('password');
  };

  const choose = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Those two do not match.');
      return;
    }

    setLoading(true);
    const { error: failed } = await updateUserPassword(password);
    setLoading(false);

    if (failed) {
      setError(failed);
      return;
    }
    setStep('done');
  };

  const field =
    'h-12 pl-10 bg-card/5 border-background/45 text-background placeholder:text-background/50 focus:border-sage focus:ring-sage-deep';

  return (
    <AuthShell
      eyebrow={step === 'done' ? 'All set' : 'Account recovery'}
      title="RESET"
      description={
        step === 'request'
          ? 'Enter your email and we will send you a six-digit code.'
          : step === 'code'
            ? `We sent a code to ${email}. Enter it below.`
            : step === 'password'
              ? 'Choose something you have not used here before.'
              : undefined
      }
      footer={
        step === 'done' ? undefined : (
          <>
            Remember it?{' '}
            <Link
              href="/auth/login"
              className="font-body font-medium text-sage-light underline-offset-4 transition-colors hover:text-background hover:underline"
            >
              Log in
            </Link>
          </>
        )
      }
    >
      {error && (
        <AuthNotice tone="error" icon={AlertCircle}>
          {error}
        </AuthNotice>
      )}

      {step === 'request' && (
        <form onSubmit={request} className="space-y-5">
          <div>
            <Label htmlFor="email" className="mb-2 block font-body text-sm text-background/80">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-background/60" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="your@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className={field}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-sage-deep font-body font-semibold text-background transition-colors hover:bg-sage-deep/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Send the code
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={confirmCode} className="space-y-5">
          <CodeInput value={code} onChange={setCode} onComplete={confirmCode} disabled={loading} />

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="h-12 w-full bg-sage-deep font-body font-semibold text-background transition-colors hover:bg-sage-deep/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setCode('');
              setError('');
              setStep('request');
            }}
            className="w-full font-body text-xs text-background/70 underline-offset-4 transition-colors hover:text-background hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={choose} className="space-y-5">
          {/* Named for the account being changed, so a password manager offers
              to update the right entry rather than saving a second one. */}
          <input type="hidden" name="username" autoComplete="username" value={email} readOnly />

          <div>
            <Label htmlFor="password" className="mb-2 block font-body text-sm text-background/80">
              New password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-background/60" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className={`${field} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-background/60 transition-colors hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-light"
              >
                {showPassword ? <Eye className="h-4 w-4" /> : <EyeClosed className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 font-body text-xs text-background/60">
              At least {MIN_PASSWORD} characters
            </p>
          </div>

          <div>
            <Label htmlFor="confirm" className="mb-2 block font-body text-sm text-background/80">
              Again
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-background/60" />
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                className={field}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full bg-sage-deep font-body font-semibold text-background transition-colors hover:bg-sage-deep/90 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Save the new password
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      )}

      {step === 'done' && (
        <div className="text-center">
          <AuthNotice tone="success" icon={CheckCircle}>
            Your password is changed, and you are signed in.
          </AuthNotice>
          <Button
            onClick={() => {
              router.push('/dashboard');
              router.refresh();
            }}
            className="h-12 w-full bg-sage-deep font-body font-semibold text-background transition-colors hover:bg-sage-deep/90"
          >
            <span className="flex items-center gap-2">
              Go to your account
              <ArrowRight className="h-4 w-4" />
            </span>
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
