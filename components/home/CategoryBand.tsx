"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { DemoImage } from "@/constants/demo";

/**
 * A full-width band for one lead category: photograph on one side, a short
 * case for it on the other, alternating down the page.
 *
 * The parallax is the same technique the old home page ran on five sections at
 * once. Here it runs on two, which is what makes it read as craft rather than
 * as a template.
 */
interface CategoryBandProps {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  image: DemoImage;
  /** "left" puts the photograph first on desktop. Alternate down the page. */
  imageSide?: "left" | "right";
}

export default function CategoryBand({
  eyebrow,
  title,
  body,
  href,
  image,
  imageSide = "right",
}: CategoryBandProps) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Contained parallax: the frame clips, the picture drifts inside it.
  const imageY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);

  return (
    <section ref={sectionRef} className="relative bg-background">
      {/* Full bleed: no gap, no radius, no page padding. The photograph runs to
          the screen edge on a phone and takes an exact half on desktop, so the
          bands butt straight up against whatever sits above them. Only the
          words are inset. */}
      <div className="grid md:grid-cols-2">
        <div
          className={`relative aspect-[4/3] overflow-hidden bg-wash sm:aspect-[16/10] md:aspect-auto md:min-h-[30rem] lg:min-h-[32rem] ${
            imageSide === "left" ? "md:order-1" : "md:order-2"
          }`}
        >
          <motion.div style={{ y: imageY }} className="absolute inset-0 -top-[8%] -bottom-[8%]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className={`flex flex-col justify-center px-6 py-14 md:px-12 md:py-20 lg:px-20 ${
            imageSide === "left" ? "md:order-2" : "md:order-1"
          }`}
        >
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            {eyebrow}
          </p>
          <h2 className="mt-4 max-w-[20ch] font-heading text-4xl font-light leading-[1.05] text-foreground md:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[46ch] font-body text-base text-ink-muted">{body}</p>
          <Link
            href={href}
            className="group mt-7 inline-flex items-center gap-2 font-body text-sm font-medium text-sage-deep transition-colors hover:text-foreground"
          >
            Shop {title.toLowerCase()}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
