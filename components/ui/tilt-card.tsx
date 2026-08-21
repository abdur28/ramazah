"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The wobble from the old category grid, rebuilt on the Ramazah system.
 *
 * Same interaction — the card leans toward the cursor while its contents lean
 * back, which is what gives the parallax inside the tile. What is gone is the
 * chrome it shipped with: a 16px radius against a 4px design system, a white
 * radial gradient that greyed out the sage, and a five-layer drop shadow.
 */
export default function TiltCard({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setOffset({
      x: (event.clientX - (rect.left + rect.width / 2)) / 22,
      y: (event.clientY - (rect.top + rect.height / 2)) / 22,
    });
  };

  const lean = (sign: 1 | -1, scale: number) =>
    isHovering
      ? `translate3d(${sign * offset.x}px, ${sign * offset.y}px, 0) scale3d(${scale}, ${scale}, 1)`
      : "translate3d(0px, 0px, 0) scale3d(1, 1, 1)";

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setOffset({ x: 0, y: 0 });
      }}
      style={{ transform: lean(1, 1), transition: "transform 0.15s ease-out" }}
      className={cn("relative overflow-hidden rounded-sm", className)}
    >
      <motion.div
        style={{ transform: lean(-1, 1.04), transition: "transform 0.15s ease-out" }}
        className={cn("h-full w-full", innerClassName)}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
