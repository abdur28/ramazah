'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthShell, { AuthNotice } from '@/components/authPages/AuthShell';
import CodeInput from '@/components/authPages/CodeInput';
import { resendSignupCode, verifySignupCode } from '@/lib/supabase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { nudgeMyMail } from '@/lib/nudge';

/**
 * Where a new account is confirmed.
 *
 * Until this existed nothing verified an address at all: the project had
 * `mailer_autoconfirm` on, so anyone could sign up as anyone. That matters more
 * here than on most shops, because the invoice *is* how this one gets paid — an
 * address nobody owns is an order that can never be settled.
 */
export default function VerifyEmailPage({
  email,
  redirect,
}: {
  email: string;
  redirect: string;
}) {
  const router = useRouter();
  const { refetch } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // A code is single-use, so resending is rate-limited by Supabase. Counting
  // down is friendlier than letting someone press it and be refused.
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (loading || code.length < 6) return;

    setError('');
    setNotice('');
    setLoading(true);

    const { user, error: failed } = await verifySignupCode(email, code);

    if (failed) {
      setError(
        /expired|invalid/i.test(failed)
          ? 'That code is wrong or has expired. Ask for a new one below.'
          : failed
      );
      setCode('');
      setLoading(false);
      return;
    }

    // Confirming leaves a live session, so the profile can be read now — before
    // this the client was `anon` and every query would have been denied.
    await refetch(user!);

    // The welcome email is queued by a trigger the moment the profile row is
    // written, and `/auth/callback` used to be what nudged it. Email signups no
    // longer pass through there — the code is verified here instead — so
    // without this the welcome would sit in the queue until the hourly run.
    nudgeMyMail();

    router.push(redirect);
    router.refresh();
  };

  const resend = async () => {
    setError('');
    setResending(true);

    const { error: failed } = await resendSignupCode(email);
    setResending(false);

    if (failed) {
      setError(failed);
      return;
    }

    setNotice(`A new code is on its way to ${email}.`);
    setCooldown(60);
  };

  return (
    <AuthShell
      eyebrow="Nearly there"
      title="CONFIRM"
      description={`We sent a six-digit code to ${email}. Enter it here to finish setting up your account.`}
      footer={
        <>
          Wrong address?{' '}
          <Link
            href="/auth/signup"
            className="font-body font-medium text-sage-light underline-offset-4 transition-colors hover:text-background hover:underline"
          >
            Start again
          </Link>
        </>
      }
    >
      {error && (
        <AuthNotice tone="error" icon={AlertCircle}>
          {error}
        </AuthNotice>
      )}
      {notice && (
        <AuthNotice tone="success" icon={CheckCircle}>
          {notice}
        </AuthNotice>
      )}

      <form onSubmit={submit} className="space-y-5">
        <CodeInput value={code} onChange={setCode} onComplete={submit} disabled={loading} />

        <Button
          type="submit"
          disabled={loading || code.length < 6}
          className="h-12 w-full bg-sage-deep font-body font-semibold text-background transition-colors hover:bg-sage-deep/90 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Confirm
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center font-body text-sm text-background/70">
        Nothing arrived?{' '}
        <button
          type="button"
          onClick={resend}
          disabled={resending || cooldown > 0}
          className="font-medium text-sage-light underline-offset-4 transition-colors hover:text-background hover:underline disabled:text-background/40 disabled:no-underline"
        >
          {cooldown > 0 ? `Send another in ${cooldown}s` : resending ? 'Sending…' : 'Send another'}
        </button>
        <span className="mt-1 block text-xs text-background/60">
          Check the spam folder first — it is usually there.
        </span>
      </div>
    </AuthShell>
  );
}
