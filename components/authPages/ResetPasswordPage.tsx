'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { resetPassword } from '@/lib/supabase/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import CrossedLink from '@/components/ui/crossed-link';

const backgroundImages = [
  '/banner/Ramazah_банер 1 _resized.jpg',
  '/banner/Ramazah_банер правка.jpg',
  '/banner/Ramazah_банер 2 копия_resized.jpg',
];

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Cycle background images
  useState(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  });

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await resetPassword(email);

      if (error) {
        setError(error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
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
            Password Recovery
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-heading text-4xl md:text-5xl tracking-wider text-background"
          >
            RESET PASSWORD
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-sm text-background/60"
          >
            Enter your email and we'll send you a link to reset your password
          </motion.p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="mb-4 p-4 bg-success/10 border border-success/50 rounded-md">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                <h3 className="text-background font-body font-semibold mb-2">Check Your Email</h3>
                <p className="text-sm text-background/60">
                  We've sent a password reset link to <span className="text-background">{email}</span>
                </p>
              </div>
              <Button
                onClick={() => setSuccess(false)}
                variant="outline"
                className="w-full h-12 bg-sage-deep text-background font-body font-semibold hover:bg-sage-deep/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Another Email
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* Email Field */}
              <div>
                <Label htmlFor="email" className="text-background/80 text-sm mb-2 block">
                  Email Address
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

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-sage-deep text-background font-body font-semibold hover:bg-sage-deep/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full"
                    />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send Reset Link
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center text-sm text-background/60">
            Remember your password?{' '}
            <CrossedLink href="/auth/login" lineColor="#5C6647" lineWidth={1}>
              <span className="text-sage-light font-medium">Login</span>
            </CrossedLink>
          </div>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
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