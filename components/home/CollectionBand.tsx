"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * One collection, as a full-bleed banner.
 *
 * The shape is hoodskool's `Banner` — a tall section, the photograph drifting
 * behind at ±20%, and the words centred over it fading and scaling in as it
 * passes. That band is the strongest thing on that home page and it is what a
 * collection wants: the picture *is* the argument for why these things belong
 * together, so it gets the whole width rather than half of a split.
 *
 * What changed on the way across is colour, type, the scrim and the buttons —
 * not the structure. The heading is Cormorant at weight 300 rather than tracked
 * uppercase, because the original was shouting for a streetwear shop and this
 * one is not. The accent went with it: `--sage-light` is the accent for *ink*
 * grounds and over a scrim measures 2.59:1, so cream carries the eyebrow. And
 * the CTAs are plain arrow links — the style the first pass used — rather than
 * `CrossedLink`, which strikes the label through at the moment someone is
 * deciding to click it.
 *
 * One at a time. Three of these would be three heroes in a row.
 */
export default function CollectionBand({
  name,
  description,
  bannerUrl,
  bannerAlt,
  slug,
  productCount,
}: {
  name: string;
  description?: string;
  bannerUrl?: string;
  bannerAlt?: string;
  slug: string;
  productCount: number;
}) {
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 1], [0.85, 1, 1]);

  return (
    /*
      `relative z-10` and an opaque ground, like every band below the hero:
      `CategoryTable` is `sticky top-0 z-0`, so a static sibling paints beneath
      the pinned table and reads as transparent.
    */
    <section
      ref={containerRef}
      className="relative z-10 flex min-h-[60vh] w-full items-center justify-center overflow-hidden bg-foreground md:min-h-[70vh]"
    >
      <motion.div style={{ y }} className="absolute inset-0 z-0">
        {/* Taller than the frame so the drift never exposes an edge. */}
        <div className="relative -top-[10%] h-[120%] w-full">
          {bannerUrl && (
            <Image
              src={bannerUrl}
              alt={bannerAlt ?? ""}
              fill
              sizes="100vw"
              className="object-cover"
            />
          )}
          {/*
            75%, not the 40% the original used. That banner sat over a
            deliberately dark photograph on a black section; this one sits over
            whatever the shopkeeper uploaded. Measured against the worst case —
            a white photograph — 55% left cream at 3.22:1 and 75% brings it to
            5.89:1, with the softened body copy at 4.79:1.
          */}
          <div aria-hidden className="absolute inset-0 bg-foreground/75" />
        </div>
      </motion.div>

      <motion.div
        style={{ opacity, scale }}
        className="relative z-20 mx-auto max-w-4xl px-6 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          // `--sage-light` is the accent for *ink* grounds, where it measures
          // 5.78:1. Over this scrim it reaches 2.59:1, so the eyebrow is cream.
          className="mb-3 font-body text-[11px] uppercase tracking-[0.3em] text-background md:mb-4"
        >
          Collection
          <span className="mx-2 text-background/40">&middot;</span>
          {productCount} {productCount === 1 ? "piece" : "pieces"}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-5 font-heading text-4xl font-light leading-[1.05] tracking-[0.02em] text-background md:mb-6 md:text-6xl lg:text-7xl"
        >
          {name}
        </motion.h2>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mb-9 max-w-xl font-body text-sm leading-relaxed text-background/85 md:mb-12 md:text-base"
          >
            {description}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
        >
          {/*
            The arrow links from the first pass, not a solid block and not
            hoodskool's `CrossedLink` — which strikes the label through at the
            moment someone is deciding to click it.

            Cream rather than sage-deep, which is the one thing that could not
            carry over: `--sage-deep` is the interactive colour on the cream
            ground, and against this scrim it measures 1.02:1 — the same value as
            the background it sits on. The arrow's travel is the affordance here;
            the colour cannot be.
          */}
          <Link
            href={`/collections/${slug}`}
            className="group inline-flex items-center gap-2 font-body text-sm font-medium text-background transition-opacity hover:opacity-80 md:text-base"
          >
            Shop the collection
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          {/* Quieter, but not below 4.5:1 — 85% is the floor over this scrim. */}
          <Link
            href="/collections"
            className="group inline-flex items-center gap-2 font-body text-sm text-background/85 transition-colors hover:text-background md:text-base"
          >
            All collections
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
