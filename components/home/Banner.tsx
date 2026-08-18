"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import CrossedLink from "../ui/crossed-link";

export default function Banner() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 1], [0.8, 1, 1]);

  return (
    <section
      ref={containerRef}
      className="relative w-full min-h-[70vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden bg-black"
    >
      {/* Parallax Background Image */}
      <motion.div
        style={{ y }}
        className="absolute inset-0 z-10"
      >
        <div className="relative w-full h-full">
          {/* Replace with actual banner image */}
          <div 
            className="w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/banner/Ramazah_банер 1 _resized.jpg')",
            }}
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/40" />
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ opacity, scale }}
        className="relative z-20 text-center px-6 max-w-5xl mx-auto"
      >
        {/* Eyebrow Text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-body text-xs tracking-[0.3em] text-[#F8E231] mb-2 md:mb-4 uppercase"
        >
          New Collection
        </motion.p>

        {/* Main Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-wider text-white mb-4 md:mb-4 leading-tight"
        >
          STREET CULTURE
          <br />
          <span className="text-[#F8E231]">REDEFINED</span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="font-body md:text-sm text-xs text-white/80 max-w-xl mx-auto mb-8 md:mb-12 leading-relaxed"
        >
          Discover our latest drop featuring exclusive pieces that blend urban aesthetics 
          with premium quality. Limited quantities available.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8"
        >
          {/* Primary Button */}
          <CrossedLink
            href="/clothings"
            lineColor="#F8E231"
          >
            <span className="font-body text-sm md:text-base font-medium text-white flex items-center gap-2">
              Shop Collection
              <ArrowRight className="h-4 w-4" />
            </span>
          </CrossedLink>

          {/* Secondary Button */}
          <CrossedLink
            href="/hoodhub"
            lineColor="#F8E231"
          >
            <span className="font-body text-sm md:text-base font-medium text-white flex items-center gap-2">
              Explore Hoodhub
              <ArrowRight className="h-4 w-4" />
            </span>
          </CrossedLink>
        </motion.div>
      </motion.div>
    </section>
  );
}