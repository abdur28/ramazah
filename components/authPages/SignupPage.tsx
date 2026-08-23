'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signUp, signInWithGoogle } from '@/lib/supabase/auth';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Mail, Lock, User, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { authImages as backgroundImages } from '@/constants/demo';



export default function SignupPage({redirect}: {redirect: string}) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const router = useRouter();
  const { refetch } = useAuth();

  /**
   * Cycle the background.
   *
   * Was `useState(() => …)`, which runs its argument once to compute an initial
   * value — so the interval was started during render and the cleanup it
   * returned was stored as state rather than ever being called. It rotated the
   * photographs correctly and leaked the timer on every unmount.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { user, session, needsEmailConfirmation, error } = await signUp(
        email, password, displayName
      );

      if (error) {
        setError(error);
      } else if (needsEmailConfirmation) {
        // No session yet — the account is not usable until the email is confirmed,
        // so do not load the profile or redirect into protected pages.
        setSuccess(true);
        setAwaitingConfirmation(true);
      } else {
        setSuccess(true);
        setTimeout(async () => {
          if (user && session) await refetch(user);
          router.push(redirect);
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      const { user, error } = await signInWithGoogle();

      if (error) {
        setError(error);
      } else {
        await refetch(user!);
        router.push(redirect);
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden py-20">
      {/* Animated Background */}
      <div className="fixed h-screen inset-0 z-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentImageIndex}
            className="absolute inset-0"
            style={{
              backgroundImage: `url('${backgroundImages[currentImageIndex]}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          />
        </AnimatePresence>
        {/* The scrim and the card together decide whether anything on this
            page is readable, because the photograph behind them is not fixed.
            At /70 and /40 the card came out at rgb(80,84,75) over a light
            photograph, where sage-light measured 3.24:1. At /80 and /70 it is
            rgb(55,59,49) and the same colour measures 4.81:1. */}
        <div className="absolute inset-0 bg-foreground/80" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-xs tracking-[0.3em] text-sage-light mb-2 uppercase"
          >
            Join The Hood
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-heading text-5xl md:text-6xl tracking-wider text-background"
          >
            SIGN UP
          </motion.h1>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-foreground/70 backdrop-blur-md border border-background/20 rounded-sm p-8"
        >
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-danger-light/10 border border-danger-light/40 rounded-sm flex items-center gap-2 text-danger-light text-sm"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-3 bg-sage-light/10 border border-sage-light/40 rounded-sm flex items-center gap-2 text-sage-light text-sm"
            >
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                {awaitingConfirmation
                  ? `Account created. Check ${email} for a confirmation link, then sign in.`
                  : 'Account created! Redirecting...'}
              </span>
            </motion.div>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Display Name */}
            <div>
              <Label htmlFor="displayName" className="text-background/80 text-sm mb-2 block">
                Display Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/60" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 bg-card/5 border-background/45 text-background placeholder:text-background/50 focus:border-sage focus:ring-sage-deep h-12"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <Label htmlFor="email" className="text-background/80 text-sm mb-2 block">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-card/5 border-background/45 text-background placeholder:text-background/50 focus:border-sage focus:ring-sage-deep h-12"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <Label htmlFor="password" className="text-background/80 text-sm mb-2 block">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-card/5 border-background/45 text-background placeholder:text-background/50 focus:border-sage focus:ring-sage-deep h-12"
                />
              </div>
              <p className="text-xs text-background/60 mt-1">
                At least 6 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-background/80 text-sm mb-2 block">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/60" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10 bg-card/5 border-background/45 text-background placeholder:text-background/50 focus:border-sage focus:ring-sage-deep h-12"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || success}
              className="w-full h-12 bg-sage-deep text-background font-body font-semibold hover:bg-sage-deep/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full"
                  />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          {/* Two rules and a label, rather than one rule with a label painted
              over it. The masking version needed the label's background to
              match the card — but the card is a translucent ink layer over a
              scrim over a photograph, so any solid value is wrong and any
              translucent one darkens the patch it is meant to hide. */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-background/40" />
            <span className="font-body text-xs uppercase tracking-[0.14em] text-background/60">
              Or continue with
            </span>
            <span className="h-px flex-1 bg-background/40" />
          </div>

          {/* Google Sign Up */}
          {/* See LoginPage: the outline variant carries `bg-background`. */}
          <Button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || success}
            className="w-full h-12 rounded-sm border border-background/45 bg-transparent text-background font-body font-semibold transition-colors hover:bg-background/10 disabled:opacity-50"
          >
            <Image src="/google-icon.svg" alt="Google Logo" width={20} height={20} className="mr-2" />
            Sign up with Google
          </Button>

          {/* Terms */}
          <p className="mt-4 text-xs text-background/60 text-center">
            By signing up, you agree to our{' '}
            <Link href="/terms" className="text-sage-light underline-offset-4 hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-sage-light underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
          </p>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-background/70">
            Already have an account?{' '}
            <Link
              href={`/auth/login?redirect=${redirect}`}
              className="font-body font-medium text-sage-light underline-offset-4 transition-colors hover:text-background hover:underline"
            >
              Log in
            </Link>
          </div>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <Link
            href="/"
            className="group inline-flex items-center gap-2 font-body text-sm text-background/85 transition-colors hover:text-background"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}