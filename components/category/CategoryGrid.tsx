"use client"

import { motion } from "framer-motion"
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard"
import type { Product } from "@/types/types"
import { PackageOpen } from "lucide-react"

interface CategoryGridProps {
  products: Product[]
  isLoading?: boolean
  emptyMessage?: string
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function CategoryGrid({
  products,
  isLoading = false,
  emptyMessage = "No products found matching your criteria.",
}: CategoryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {[...Array(8)].map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <ProductCardSkeleton />
          </motion.div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="col-span-full flex flex-col items-center justify-center py-20 md:py-32 text-center"
      >
        {/* Icon Container */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.2 
          }}
          className="relative mb-8"
        >
          <div className="w-32 h-32 rounded-full bg-foreground/5 flex items-center justify-center relative">
            <PackageOpen className="w-16 h-16 text-foreground/40" strokeWidth={1.5} />
            
            {/* Animated Circle */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full border-2 border-[#F8E231]/30"
            />
          </div>

          {/* Corner Accents */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-[#F8E231]/50" />
          <div className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 border-[#F8E231]/50" />
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 border-[#F8E231]/50" />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 border-[#F8E231]/50" />
        </motion.div>

        {/* Text */}
        <motion.h3 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="font-heading text-2xl md:text-3xl tracking-wider mb-3"
        >
          NO PRODUCTS FOUND
        </motion.h3>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="font-body text-sm md:text-base text-foreground/60 max-w-md px-4"
        >
          {emptyMessage}
        </motion.p>

        {/* Decorative Line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="w-24 h-px bg-gradient-to-r from-transparent via-[#F8E231] to-transparent mt-8"
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
    >
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          variants={item}
          transition={{ duration: 0.4 }}
        >
          <ProductCard product={product} index={index} />
        </motion.div>
      ))}
    </motion.div>
  )
}