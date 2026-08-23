'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { authImages } from '@/constants/demo';

/**
 * The frame every auth page sits in.
 *
 * Was copied into each of them. That is how the contrast problem came to exist
 * three times over: the scrim and the card are not decoration here, they are
 * the only thing deciding whether the text on top can be read, and the
 * photograph behind them changes every five seconds. Sizing that correctly is
 * a calculation, and a calculation belongs in one place.
 *
 * `bg-foreground/80` over `bg-foreground/70` puts the card at rgb(55,59,49)
 * against the worst case — a white photograph — where `--sage-light` measures
 * 4.81:1. At the /70 and /40 this replaced it was rgb(80,84,75) and 3.24:1.
 * `scripts/check-auth-contrast.mjs` checks the whole set; run it before
 * lightening anything here.
 */
export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  /** Cormorant, and never below 28px — see the design system. */
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((prev) => (prev + 1) % authImages.length),
      5000
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      <div className="fixed inset-0 z-0 h-screen">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${authImages[index]}')` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-foreground/80" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mx-4 w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-2 font-body text-xs uppercase tracking-[0.3em] text-sage-light"
          >
            {eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="font-heading text-5xl tracking-wider text-background md:text-6xl"
          >
            {title}
          </motion.h1>
          {description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mx-auto mt-4 max-w-[38ch] font-body text-sm text-background/70"
            >
              {description}
            </motion.p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-sm border border-background/20 bg-foreground/70 p-8 backdrop-blur-md"
        >
          {children}
        </motion.div>

        {footer && (
          <div className="mt-6 text-center font-body text-sm text-background/70">{footer}</div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
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

/** The two states every auth form can be in, worded the same way everywhere. */
export function AuthNotice({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'error' | 'success';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  // `--danger` and `--success` are both measured against cream, so both vanish
  // on this card. These are their on-dark counterparts.
  const styles =
    tone === 'error'
      ? 'bg-danger-light/10 border-danger-light/40 text-danger-light'
      : 'bg-sage-light/10 border-sage-light/40 text-sage-light';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      role={tone === 'error' ? 'alert' : 'status'}
      className={`mb-6 flex items-start gap-2 rounded-sm border p-3 font-body text-sm ${styles}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </motion.div>
  );
}
