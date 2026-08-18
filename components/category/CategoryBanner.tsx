"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import Image from "next/image"
import { Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CategoryBannerProps {
  title: string
  description?: string
  subtitle?: string
  bannerImage?: string
  productCount?: number
}

export default function CategoryBanner({
  title,
  description,
  subtitle,
  bannerImage,
  productCount = 0,
}: CategoryBannerProps) {
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
      {bannerImage ? (
        <motion.div
          style={{ y, scale }}
          className="absolute inset-0 z-0"
        >
          <Image
            src={bannerImage}
            alt={title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>
      ) : (
        <div className="absolute inset-0 bg-black/40" />
      )}


      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="relative z-20 text-center px-6 max-w-4xl mx-auto"
      >
        {/* Subtitle Badge */}
        {subtitle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-body text-xs tracking-[0.3em] text-[#F8E231] mb-2 md:mb-4 uppercase"
            >
            {subtitle}
            </motion.p>
          </motion.div>
        )}

        {/* Title with Split Animation */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-wider uppercase text-white mb-4 md:mb-4 leading-tight"
        >
          {title.split(" ").length > 1 ? title.split(" ").slice(0, -1).join(" ") : title}
          {" "}
          {title.split(" ").length > 1 && 
             <span className="text-[#F8E231]">{title.split(" ").slice(-1)[0]}</span>
          }
        </motion.h2>

        {/* Description */}
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="font-body text-sm md:text-base text-white/70 max-w-2xl mx-auto mb-6 leading-relaxed"
          >
            {description}
          </motion.p>
        )}

      </motion.div>

      {/* Decorative Elements */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F8E231] to-transparent z-30"
      />

    </section>
  )
}