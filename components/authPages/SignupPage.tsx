'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowRight, Eye, EyeClosed, Loader2, Lock, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthShell, { AuthNotice } from '@/components/authPages/AuthShell';
import { signUp, signInWithGoogle } from '@/lib/supabase/auth';
import { useAuth } from '@/contexts/AuthContext';

const MIN_PASSWORD = 6;

/**
 * Signing up.
 *
 * The confirmation branch here was dead code for as long as it existed: the
 * project had `mailer_autoconfirm` on, so `signUp` always returned a session and
 * `needsEmailConfirmation` was always false. With confirmation on it leads to
 * `/auth/verify`, and the code arrives through our own mailer.
 */
export default function SignupPage({ redirect }: { redirect: string }) {
  const router = useRouter();
  const { refetch } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.');
      return;
    }

    setLoading(true);
    const { user, needsEmailConfirmation, error: failed } = await signUp(
      email,
      password,
      displayName || undefined
    );

    if (failed) {
      setError(failed);
      setLoading(false);
      return;
    }

    if (needsEmailConfirmation) {
      router.push(
        `/auth/verify?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}`
      );
      return;
    }

    // Confirmation turned off — a session already exists, so go straight in.
    await refetch(user!);
    router.push(redirect);
    router.refresh();
  };

  const google = async () => {
    setError('');
    setLoading(true);

    const { error: failed } = await signInWithGoogle(redirect);
    if (failed) {
      setError(failed);
      setLoading(false);
    }
  };

  const field =
    'h-12 pl-10 bg-card/5 border-background/45 text-background placeholder:text-background/50 focus:border-sage focus:ring-sage-deep';

  return (
    <AuthShell
      eyebrow="Join us"
      title="SIGN UP"
      footer={
        <>
          Already have an account?{' '}
          <Link
            href={`/auth/login?redirect=${redirect}`}
            className="font-body font-medium text-sage-light underline-offset-4 transition-colors hover:text-background hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      {error && (
        <AuthNotice tone="error" icon={AlertCircle}>
          {error}
        </AuthNotice>
      )}

      <form onSubmit={create} className="space-y-5">
        <div>
          <Label htmlFor="displayName" className="mb-2 block font-body text-sm text-background/80">
            Your name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-background/60" />
            <Input
              id="displayName"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className={field}
            />
          </div>
        </div>

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
          <p className="mt-1 font-body text-xs text-background/60">
            We send a code here to confirm it — invoices go to this address.
          </p>
        </div>

        <div>
          <Label htmlFor="password" className="mb-2 block font-body text-sm text-background/80">
            Password
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
              Creating your account…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Create account
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-background/40" />
        <span className="font-body text-xs uppercase tracking-[0.14em] text-background/60">
          Or continue with
        </span>
        <span className="h-px flex-1 bg-background/40" />
      </div>

      {/* See LoginPage: the outline variant carries `bg-background`. */}
      <Button
        type="button"
        onClick={google}
        disabled={loading}
        className="h-12 w-full rounded-sm border border-background/45 bg-transparent font-body font-semibold text-background transition-colors hover:bg-background/10 disabled:opacity-50"
      >
        <Image src="/google-icon.svg" alt="" width={20} height={20} className="mr-2" />
        Sign up with Google
      </Button>

      <p className="mt-4 text-center font-body text-xs text-background/60">
        By signing up, you agree to our{' '}
        <Link href="/terms" className="text-sage-light underline-offset-4 hover:underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-sage-light underline-offset-4 hover:underline">
          Privacy Policy
        </Link>
      </p>
    </AuthShell>
  );
}
