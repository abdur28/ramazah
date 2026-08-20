"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// NOTE: still hoodskool's photography — replace with Ramazah's own.
const backgroundImages = [
  "/banner/Ramazah_банер 1 _resized.jpg",
  "/banner/Ramazah_банер правка.jpg",
  "/banner/Ramazah_банер 2 копия_resized.jpg",
];

/**
 * The landing image. It used to double as the site's primary navigation —
 * six links dropping in one after another — which is now in the navbar above,
 * where it is reachable from every page and does not need six seconds to
 * finish animating.
 */
export default function Hero() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        (prevIndex + 1) % backgroundImages.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="sticky top-0 h-[95vh] md:h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Animated Background Images - Lower z-index */}
      <div className="absolute inset-0 z-0 hidden md:block">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentImageIndex}
            className="absolute inset-0"
            style={{
              backgroundImage: `url('${backgroundImages[currentImageIndex]}')`,
              backgroundSize: "cover",
              backgroundPosition: "top center",
              backgroundRepeat: "no-repeat",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 z-0 md:hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentImageIndex}
            className="absolute inset-0"
            style={{
              backgroundImage: `url('${backgroundImages[currentImageIndex]}')`,
              backgroundSize: "cover",
              backgroundPosition: "top right",
              backgroundRepeat: "no-repeat",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </AnimatePresence>
      </div>
    </section>
  );
}
