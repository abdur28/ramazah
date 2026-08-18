"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

interface CrossedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  lineColor?: string;
  lineWidth?: number;
  animationDuration?: number;
}

export default function CrossedLink({
  href,
  children,
  className = "",
  lineColor = "white",
  lineWidth = 2,
  animationDuration = 0.3,
}: CrossedLinkProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="relative z-10">{children}</span>

      {/* Animated X cross lines on hover */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Line from top-left to bottom-right */}
        <motion.line
          x1="0"
          y1="0"
          x2="100%"
          y2="100%"
          stroke={lineColor}
          strokeWidth={lineWidth}
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: isHovered ? 1 : 0,
          }}
          transition={{
            duration: animationDuration,
            ease: "easeOut",
          }}
          style={{ vectorEffect: "non-scaling-stroke" }}
        />

        {/* Line from top-right to bottom-left */}
        <motion.line
          x1="100%"
          y1="0"
          x2="0"
          y2="100%"
          stroke={lineColor}
          strokeWidth={lineWidth}
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: isHovered ? 1 : 0,
          }}
          transition={{
            duration: animationDuration,
            ease: "easeOut",
          }}
          style={{ vectorEffect: "non-scaling-stroke" }}
        />
      </svg>
    </Link>
  );
}