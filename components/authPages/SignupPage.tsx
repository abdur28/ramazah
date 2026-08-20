'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signUp, signInWithGoogle } from '@/lib/supabase/auth';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Chrome, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import CrossedLink from '@/components/ui/crossed-link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

const backgroundImages = [
  '/banner/Ramazah_банер 1 _resized.jpg',
  '/banner/Ramazah_банер правка.jpg',
  '/banner/Ramazah_банер 2 копия_resized.jpg',
];

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

  // Cycle background images
  useState(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  });

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
        <div className="absolute inset-0 bg-foreground/70" />
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
          className="bg-foreground/40 backdrop-blur-md border border-background/10 rounded-lg p-8"
        >
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-destructive/10 border border-destructive/50 rounded-md flex items-center gap-2 text-destructive text-sm"
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
              className="mb-6 p-3 bg-success/10 border border-success/50 rounded-md flex items-center gap-2 text-success text-sm"
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
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/40" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="pl-10 bg-card/5 border-background/20 text-background placeholder:text-background/40 focus:border-sage focus:ring-sage-deep h-12"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <Label htmlFor="email" className="text-background/80 text-sm mb-2 block">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-card/5 border-background/20 text-background placeholder:text-background/40 focus:border-sage focus:ring-sage-deep h-12"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <Label htmlFor="password" className="text-background/80 text-sm mb-2 block">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/40" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-card/5 border-background/20 text-background placeholder:text-background/40 focus:border-sage focus:ring-sage-deep h-12"
                />
              </div>
              <p className="text-xs text-background/40 mt-1">
                At least 6 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-background/80 text-sm mb-2 block">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-background/40" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10 bg-card/5 border-background/20 text-background placeholder:text-background/40 focus:border-sage focus:ring-sage-deep h-12"
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
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-background/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-foreground/40 px-2 text-background/40">Or continue with</span>
            </div>
          </div>

          {/* Google Sign Up */}
          <Button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading || success}
            variant="outline"
            className="w-full h-12 border-background/20 text-background font-body font-semibold hover:bg-card/5 disabled:opacity-50"
          >
            <Image src="/google-icon.svg" alt="Google Logo" width={20} height={20} className="mr-2" />
            Sign up with Google
          </Button>

          {/* Terms */}
          <p className="mt-4 text-xs text-background/40 text-center">
            By signing up, you agree to our{' '}
            <a href="/terms" className="text-sage-light hover:underline">
              Terms
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-sage-light hover:underline">
              Privacy Policy
            </a>
          </p>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-background/60">
            Already have an account?{' '}
            <CrossedLink href={`/auth/login?redirect=${redirect}`} lineColor="#5C6647" lineWidth={1}>
              <span className="text-sage-light font-medium">Login</span>
            </CrossedLink>
          </div>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-6"
        >
          <CrossedLink href="/" lineColor="gold" lineWidth={1}>
            <span className="text-background/60 text-sm hover:text-background transition-colors">
              ← Back to Home
            </span>
          </CrossedLink>
        </motion.div>
      </motion.div>
    </div>
  );
}