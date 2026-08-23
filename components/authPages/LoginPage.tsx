'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowRight, Eye, EyeClosed, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthShell, { AuthNotice } from '@/components/authPages/AuthShell';
import { signIn, signInWithGoogle } from '@/lib/supabase/auth';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage({ redirect }: { redirect: string }) {
  const router = useRouter();
  const { refetch } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const { user, error: failed } = await signIn(email, password);

    if (failed) {
      // Supabase says "Email not confirmed" for an account that never finished
      // signing up. Sending them back to the form they abandoned is more use
      // than repeating the error at them.
      if (/not confirmed/i.test(failed)) {
        router.push(
          `/auth/verify?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirect)}`
        );
        return;
      }
      setError(failed);
      setLoading(false);
      return;
    }

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
    // On success the browser navigates away; nothing to do here.
  };

  const field =
    'h-12 pl-10 bg-card/5 border-background/45 text-background placeholder:text-background/50 focus:border-sage focus:ring-sage-deep';

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="LOGIN"
      footer={
        <>
          Don&rsquo;t have an account?{' '}
          <Link
            href={`/auth/signup?redirect=${redirect}`}
            className="font-body font-medium text-sage-light underline-offset-4 transition-colors hover:text-background hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      {error && (
        <AuthNotice tone="error" icon={AlertCircle}>
          {error}
        </AuthNotice>
      )}

      <form onSubmit={login} className="space-y-5">
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="password" className="font-body text-sm text-background/80">
              Password
            </Label>
            <Link
              href="/auth/reset-password"
              className="font-body text-xs text-sage-light underline-offset-4 transition-colors hover:text-background hover:underline"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-background/60" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full bg-sage-deep font-body font-semibold text-background transition-colors hover:bg-sage-deep/90 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Login
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Two rules and a label, rather than one rule with a label painted over
          it — the card is translucent ink over a scrim over a photograph, so no
          solid masking value is right. */}
      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-background/40" />
        <span className="font-body text-xs uppercase tracking-[0.14em] text-background/60">
          Or continue with
        </span>
        <span className="h-px flex-1 bg-background/40" />
      </div>

      {/* No `variant="outline"` — that variant carries `bg-background`, which on
          this dark card is a cream block. It rendered as a white button. */}
      <Button
        type="button"
        onClick={google}
        disabled={loading}
        className="h-12 w-full rounded-sm border border-background/45 bg-transparent font-body font-semibold text-background transition-colors hover:bg-background/10 disabled:opacity-50"
      >
        <Image src="/google-icon.svg" alt="" width={20} height={20} className="mr-2" />
        Sign in with Google
      </Button>
    </AuthShell>
  );
}
