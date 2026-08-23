"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { storyImage } from "@/constants/demo";
import type { HomeContent } from "@/lib/content-defaults";

/**
 * The one editorial moment on the page — where the shop says what it is rather
 * than what it stocks. Ink ground, one photograph, three sentences.
 *
 * It sits after the products deliberately: a visitor who came to buy cumin has
 * already been served, and only now is there any reason to read.
 */
export default function Story({ content }: { content: HomeContent["story"] }) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section ref={sectionRef} className="relative z-10 bg-foreground">
      <div className="mx-auto grid items-stretch gap-0 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center px-6 py-16 md:px-12 md:py-28"
        >
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-sage-light">
            {content.eyebrow}
          </p>
          <h2 className="mt-4 max-w-[20ch] font-heading text-4xl font-light leading-[1.05] text-background md:text-5xl">
            {content.title}
          </h2>
          <div className="mt-6 max-w-[56ch] space-y-4 font-body text-base text-background/75">
              {content.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          <Link
            href={content.ctaHref}
            className="group mt-8 inline-flex items-center gap-2 self-start font-body text-sm font-medium text-sage-light transition-colors hover:text-background"
          >
            {content.ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <div className="relative min-h-[60vw] overflow-hidden md:min-h-full">
          <motion.div style={{ y: imageY }} className="absolute inset-0 -top-[10%] -bottom-[10%]">
            <Image
              src={content.imageUrl || storyImage.src}
              alt={content.imageAlt || storyImage.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
