"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import Image from "next/image"
import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ArtBannerProps {
  bannerImage: string
}

export default function ArtBanner({
  bannerImage,
}: ArtBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1])

  return (
    <section
      ref={containerRef}
      className="relative w-full h-[40vh] md:h-[50vh] flex items-center justify-center overflow-hidden bg-black"
    >
      {/* Parallax Background */}
        <motion.div
          style={{ y, scale }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={bannerImage}
            alt={"Art Showcase"}
            fill
            className="object-cover"
            priority
          />
        </motion.div>

    </section>
  )
}