"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

const scrollingImages = [
  "/banner/Ramazah_банер 1 _resized.jpg", 
  "/banner/Ramazah_банер правка.jpg",
  "/DSC05257 (1).jpg",
  "/Ramazah_0408202445315 - Copy.jpg", 
  "/Ramazah_Catalog_0408202312555 1_resized.jpg",
  "/Ramazah_Catalog_0408202313209_resized.jpg",
];

// Split images into two rows for mobile
const row1Images = scrollingImages.slice(0, 3);
const row2Images = scrollingImages.slice(3, 6);

export default function Info() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  // Parallax effect for background/section
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1, 0.3]);

  // Desktop: moves right to left
  const xDesktop = useTransform(scrollYProgress, [0, 1], [-100, -800]);
  
  // Mobile Row 1: moves left to right
  const xRow1 = useTransform(scrollYProgress, [0, 1], [-150, 100]);
  
  // Mobile Row 2: moves right to left
  const xRow2 = useTransform(scrollYProgress, [0, 1], [100, -300]);

  return (
    <section
      ref={containerRef}
      className="sticky top-14 z-10 h-screen bg-background py-5 md:py-10 overflow-hidden"
    >
      {/* Parallax Background */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0 bg-background"
      />

      <motion.div 
        style={{ opacity }}
        className="relative h-full"
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex flex-col">
          {/* Header Text */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-10"
          >
            <p className="font-body text-xs tracking-widest text-foreground/60 mb-2">
              WELCOME TO
            </p>
            <h2 className="font-heading text-5xl md:text-6xl lg:text-7xl tracking-wider">
              RAMAZAH
            </h2>
          </motion.div>

          {/* Mobile: Two Rows with Opposite Directions */}
          <div className="md:hidden space-y-1">
            {/* Row 1: Left to Right */}
            <motion.div
              style={{ x: xRow1 }}
              className="flex gap-1 w-max"
            >
              {row1Images.map((image, index) => (
                <motion.div
                  key={`row1-${index}`}
                  className="relative w-[240px] h-[320px] flex-shrink-0 overflow-hidden rounded-sm"
                >
                  <Image
                    src={image}
                    alt={`Ramazah ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Row 2: Right to Left */}
            <motion.div
              style={{ x: xRow2 }}
              className="flex gap-1 w-max"
            >
              {row2Images.map((image, index) => (
                <motion.div
                  key={`row2-${index}`}
                  className="relative w-[240px] h-[320px] flex-shrink-0 overflow-hidden rounded-sm"
                >
                  <Image
                    src={image}
                    alt={`Ramazah ${index + 4}`}
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Desktop: Single Row */}
          <motion.div
            style={{ x: xDesktop }}
            className="hidden md:flex gap-2 lg:gap-2 w-max"
          >
            {scrollingImages.map((image, index) => (
              <motion.div
                key={index}
                className="relative w-[300px] h-[450px] flex-shrink-0 overflow-hidden rounded-sm"
              >
                <Image
                  src={image}
                  alt={`Ramazah ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 350px, 400px"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
     </section>
  );
}