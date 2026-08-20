"use client";

import CrossedLink from "@/components/ui/crossed-link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const navigationLinks = [
  { name: "Clothings", href: "/clothings" },
  { name: "Accessories", href: "/accessories" },
  { name: "Candles & Matches", href: "/candles-matches" },
  { name: "Artwork", href: "/artwork" },
  { name: "Hoodhub", href: "/hoodhub" },
  { name: "Contact", href: "/contact" },
];

const backgroundImages = [
  "/banner/Ramazah_банер 1 _resized.jpg", 
  "/banner/Ramazah_банер правка.jpg",
  "/banner/Ramazah_банер 2 копия_resized.jpg",
];

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
      
      {/* Navigation Links with Drop Animation */}
      <nav className="flex flex-col items-center justify-center gap-3 md:gap-4">
        {navigationLinks.map((link, index) => (
          <motion.div
            key={link.name}
            initial={{ 
              y: -200, 
              opacity: 0,
              scale: 0.8
            }}
            whileInView={{ 
              y: 0, 
              opacity: 1,
              scale: 1
            }}
            viewport={{ once: true }}
            transition={{
              type: "spring",
              damping: 12,
              stiffness: 100,
              delay: index * 0.5,
            }}
            whileHover={{ 
              scale: 1.05,
              transition: { duration: 0.2 }
            }}
            whileTap={{ scale: 0.95 }}
          >
            <CrossedLink
              href={link.href}
              lineColor="gold"
            >
              <span className="font-body text-foreground text-sm md:text-base tracking-wide">
                {link.name}
              </span>
            </CrossedLink>
          </motion.div>
        ))}
      </nav>
    </section>
  );
}