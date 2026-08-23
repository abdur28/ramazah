"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { heroImage } from "@/constants/demo";
import type { HomeContent } from "@/lib/content";

/**
 * The landing image, and the page's thesis: a market in Egypt, which is where
 * everything in the shop comes from.
 *
 * Sticky, so the page scrolls over it — the effect that carried the old hero,
 * kept. What is gone is the carousel (three images for one message) and the six
 * navigation links that used to drop in one at a time; navigation lives in the
 * bar above, on every page.
 *
 * The photograph is dark, so the navbar renders its inverse variant over it.
 */
/**
 * The staircase indent, one entry per line. Written out rather than computed,
 * because Tailwind only ships classes it can see in the source — a template
 * string like `pl-[${n}em]` compiles to nothing.
 *
 * The step is in `em`, so it holds its proportion as the type grows from 44px
 * on a phone to 72px on desktop.
 */
const stepIndent = ["", "pl-[1.8em] lg:pl-[3em]", "pl-[3.6em] lg:pl-[6em]"];

/**
 * The words and the photograph come from `site_content`, edited at
 * /admin/pages/home. The staircase indent, the parallax and the timing stay in
 * code — those are the design, not copy, and an editor that could change them
 * would be an editor that could produce a page that is not this shop.
 *
 * An unset image falls back to the demo placeholder, so a half-filled row never
 * renders an empty frame.
 */
export default function Hero({ content }: { content: HomeContent["hero"] }) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // The image drifts a little slower than the page, and the words leave first.
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <>
      <section
        ref={sectionRef}
        id="home-hero"
        className="sticky top-0 flex h-[88vh] w-full items-end overflow-hidden md:h-[90vh]"
    >
      <motion.div style={{ y: imageY }} className="absolute inset-0 -top-[9%] -bottom-[9%]">
        <Image
          src={content.imageUrl || heroImage.src}
          alt={content.imageAlt || heroImage.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      {/* Scrim: the words sit at the foot of the frame, so the weight goes there. */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/45 to-foreground/25" />

      <motion.div
        style={{ opacity: textOpacity, y: textY }}
        className="relative mx-auto w-full px-6 pb-16 md:px-10 md:pb-24"
      >
        {/* Three lines, each stepped further in than the last — the indent is
            the whole idea, so it scales with the type rather than sitting at a
            fixed pixel value. Each line arrives after the one above it, so the
            staircase builds instead of appearing. */}
        <h1 className="font-heading text-[44px] font-light leading-[1.06] text-background sm:text-6xl md:text-7xl">
          {content.lines.map((line, index) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 + index * 0.14, ease: "easeOut" }}
              className={`block ${stepIndent[index]}`}
            >
              {line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.62 }}
          className="mt-6 max-w-[46ch] font-body text-base text-background/80 md:text-lg"
        >
          {content.body}
        </motion.p>

        {/* Not a matched pair of pills. One block that reads as the action, one
            bare link that does not compete with it — the same hairline
            underline the navbar uses. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.75 }}
          className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4"
        >
          <Link
            href="/categories/veils-scarves"
            className="group inline-flex items-center gap-3 rounded-sm bg-background px-8 py-4 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-sage-deep hover:text-background"
          >
            Start shopping
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <Link
            href="/contact"
            className="group relative py-2 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-background/80 transition-colors hover:text-background"
          >
            How ordering works
            <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-100 bg-background/30 transition-transform duration-300" />
            <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-background transition-transform duration-300 group-hover:scale-x-100" />
          </Link>
        </motion.div>
      </motion.div>

      <motion.div
        style={{ opacity: textOpacity }}
        className="absolute bottom-6 right-6 hidden md:block"
        aria-hidden
      >
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-5 w-5 text-background/60" />
        </motion.div>
      </motion.div>
      </section>

      {/* Where the hero *would* end, if it were not pinned there.
          The navbar switches from transparent to solid when this passes under
          it. It cannot watch the hero itself: the hero is sticky, so it stays
          glued to the top of the viewport — and therefore stays "visible" — for
          the entire length of the page, which is why the bar only changed once
          you reached the footer. This sits in normal flow and scrolls away on
          time. Height is cancelled by the negative margin, so it changes
          nothing about the layout. */}
      <div id="home-hero-end" aria-hidden className="-mb-px h-px w-full" />
    </>
  );
}
