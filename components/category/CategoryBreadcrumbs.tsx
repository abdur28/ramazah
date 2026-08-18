"use client"

import { ChevronRight, Home } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface BreadcrumbItem {
  label: string
  href: string
}

interface CategoryBreadcrumbsProps {
  items: BreadcrumbItem[]
}

export default function CategoryBreadcrumbs({ items }: CategoryBreadcrumbsProps) {
  return (
    <nav 
      className="flex items-center gap-2 text-sm font-body mb-6 md:mb-8 pb-4 border-b border-foreground/10"
      aria-label="Breadcrumb"
    >
      {/* Home */}
      <motion.div 
        initial={{ opacity: 0, x: -10 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ duration: 0.3 }}
      >
        <Link 
          href="/" 
          className="group flex items-center gap-1 text-foreground/60 hover:text-[#F8E231] transition-colors"
        >
          <span className="hidden sm:inline uppercase tracking-wider text-xs">Home</span>
        </Link>
      </motion.div>

      {/* Breadcrumb Items */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: (index + 1) * 0.1 }}
            className="flex items-center gap-2"
          >
            <ChevronRight className="h-4 w-4 text-foreground/40" />
            
            {isLast ? (
              <span className="text-foreground font-medium uppercase tracking-wider text-xs">
                {item.label}
              </span>
            ) : (
              <Link 
                href={item.href} 
                className="text-foreground/60 hover:text-[#F8E231] transition-colors uppercase tracking-wider text-xs"
              >
                {item.label}
              </Link>
            )}
          </motion.div>
        )
      })}
    </nav>
  )
}