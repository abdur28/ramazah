"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import CrossedLink from "@/components/ui/crossed-link";

export default function CTA() {
  const [email, setEmail] = useState("");
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0.8]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 1]);


  return (
    <section
      ref={sectionRef}
      className="relative z-10 py-24 md:py-28 bg-black overflow-hidden"
    >
      {/* Animated Background Elements */}
      <motion.div
        style={{ y }}
        className="absolute top-0 left-1/4 w-96 h-96 bg-[#F8E231]/10 rounded-full blur-3xl"
      />
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [-100, 100]) }}
        className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl"
      />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <motion.div
        style={{ opacity, scale }}
        className="relative max-w-5xl mx-auto px-6 text-center"
      >
        {/* Eyebrow Text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-body text-xs tracking-[0.3em] text-[#F8E231] mb-2 uppercase"
        >
          Join The Movement
        </motion.p>

        {/* Main Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-heading text-5xl md:text-6xl lg:text-7xl tracking-wider text-white mb-4 leading-tight"
        >
          STAY IN THE LOOP
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="font-body text-sm md:text-base text-white/80 max-w-2xl mx-auto mb-6"
        >
          Be the first to know about new drops, exclusive deals, and street culture updates. 
          Join our community and get 10% off your first order.
        </motion.p>


        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6"
        />

        {/* Additional CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-8"
        >
          <CrossedLink
            href="/clothings"
            lineColor="#F8E231"
            lineWidth={2}
            animationDuration={0.3}
          >
            <span className="font-body text-base font-medium text-white flex items-center gap-2">
              Shop Collection
              <ArrowRight className="h-4 w-4" />
            </span>
          </CrossedLink>

          <span className="text-white/30 hidden sm:block">|</span>

          <CrossedLink
            href="/hoodhub"
            lineColor="gold"
            lineWidth={2}
            animationDuration={0.3}
          >
            <span className="font-body text-base font-medium text-white flex items-center gap-2">
              Join Hoodhub
              <ArrowRight className="h-4 w-4" />
            </span>
          </CrossedLink>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-20 left-10 w-32 h-32 border border-[#F8E231]/20 rounded-full"
        />
        <motion.div
          animate={{
            rotate: [360, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-20 right-10 w-40 h-40 border border-white/10 rounded-full"
        />
      </motion.div>
    </section>
  );
}