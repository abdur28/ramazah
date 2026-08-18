"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { Color } from "@/types/types"

export interface FilterOptions {
  sizes?: string[]
  colors?: Color[]
  priceRange?: [number, number]
  inStockOnly?: boolean
  tags?: string[]
  materials?: string[]
}

interface CategoryFilterProps {
  availableSizes?: string[]
  availableColors?: Color[]
  availableTags?: string[]
  availableMaterials?: string[]
  maxPrice?: number
  filters: FilterOptions
  onFilterChange: (filters: FilterOptions) => void
  onClearFilters: () => void
}

export default function CategoryFilter({
  availableSizes = [],
  availableColors = [],
  availableTags = [],
  availableMaterials = [],
  maxPrice = 10000,
  filters,
  onFilterChange,
  onClearFilters,
}: CategoryFilterProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expanded, setExpanded] = useState<string[]>(["sizes", "colors", "price"])

  const toggleSection = (section: string) => {
    setExpanded(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section])
  }

  const handleSizeToggle = (size: string) => {
    const current = filters.sizes || []
    const updated = current.includes(size) ? current.filter(s => s !== size) : [...current, size]
    onFilterChange({ ...filters, sizes: updated })
  }

  const handleColorToggle = (color: Color) => {
    const current = filters.colors || []
    const updated = current.some(c => c.name === color.name)
      ? current.filter(c => c.name !== color.name)
      : [...current, color]
    onFilterChange({ ...filters, colors: updated })
  }

  const handleTagToggle = (tag: string) => {
    const current = filters.tags || []
    const updated = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
    onFilterChange({ ...filters, tags: updated })
  }

  const handleMaterialToggle = (material: string) => {
    const current = filters.materials || []
    const updated = current.includes(material) ? current.filter(m => m !== material) : [...current, material]
    onFilterChange({ ...filters, materials: updated })
  }

  const activeCount =
    (filters.sizes?.length || 0) +
    (filters.colors?.length || 0) +
    (filters.tags?.length || 0) +
    (filters.materials?.length || 0) +
    (filters.inStockOnly ? 1 : 0) +
    (filters.priceRange ? 1 : 0)

  const FilterContent = () => (
    <div className="space-y-6">
      {activeCount > 0 && (
        <div className="flex items-center justify-between pb-4 border-b border-foreground/10">
          <span className="text-xs font-body text-foreground/60 uppercase tracking-wider">
            {activeCount} Active
          </span>
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-xs hover:text-[#F8E231] h-auto p-0">
            Clear All
          </Button>
        </div>
      )}

      {/* In Stock */}
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="inStock" 
          checked={filters.inStockOnly} 
          onCheckedChange={() => onFilterChange({ ...filters, inStockOnly: !filters.inStockOnly })} 
        />
        <Label htmlFor="inStock" className="text-sm font-body cursor-pointer uppercase tracking-wider">
          In Stock Only
        </Label>
      </div>

      {/* Sizes */}
      {availableSizes.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => toggleSection("sizes")}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-body text-sm font-medium uppercase tracking-wider">Size</h3>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded.includes("sizes") ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {expanded.includes("sizes") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  {availableSizes.map(size => {
                    const isSelected = filters.sizes?.includes(size)
                    return (
                      <button
                        key={size}
                        onClick={() => handleSizeToggle(size)}
                        className={`min-w-[50px] px-4 py-2 font-body text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-black text-white ring-2 ring-[#F8E231]"
                            : "bg-foreground/5 text-foreground hover:bg-foreground/10 border border-foreground/20"
                        }`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Colors */}
      {availableColors.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => toggleSection("colors")}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-body text-sm font-medium uppercase tracking-wider">Color</h3>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded.includes("colors") ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {expanded.includes("colors") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-3 pt-2">
                  {availableColors.map(color => {
                    const isSelected = filters.colors?.some(c => c.name === color.name)
                    return (
                      <button
                        key={color.name}
                        onClick={() => handleColorToggle(color)}
                        className={`relative w-10 h-10 rounded-full transition-all ${
                          isSelected
                            ? "ring-2 ring-[#F8E231] ring-offset-2"
                            : "ring-1 ring-foreground/20 hover:ring-2 hover:ring-foreground/40"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Materials */}
      {availableMaterials.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => toggleSection("materials")}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-body text-sm font-medium uppercase tracking-wider">Material</h3>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded.includes("materials") ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {expanded.includes("materials") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-2">
                  {availableMaterials.map(material => {
                    const isSelected = filters.materials?.includes(material)
                    return (
                      <button
                        key={material}
                        onClick={() => handleMaterialToggle(material)}
                        className={`px-4 py-2 font-body text-xs transition-all rounded-full ${
                          isSelected
                            ? "bg-[#F8E231] text-black"
                            : "bg-foreground/5 text-foreground hover:bg-foreground/10 border border-foreground/20"
                        }`}
                      >
                        {material}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Price Range */}
      <div className="space-y-3">
        <button
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="font-body text-sm font-medium uppercase tracking-wider">Price</h3>
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded.includes("price") ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {expanded.includes("price") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4"
            >
              <Slider
                min={0}
                max={maxPrice}
                step={100}
                value={filters.priceRange || [0, maxPrice]}
                onValueChange={(value) => onFilterChange({ ...filters, priceRange: [value[0], value[1]] })}
                className="pt-2"
              />
              <div className="flex items-center justify-between text-sm font-body text-foreground/60">
                <span>${filters.priceRange?.[0] || 0}</span>
                <span>${filters.priceRange?.[1] || maxPrice}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tags */}
      {availableTags.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => toggleSection("tags")}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="font-body text-sm font-medium uppercase tracking-wider">Tags</h3>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded.includes("tags") ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {expanded.includes("tags") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-2">
                  {availableTags.map(tag => {
                    const isSelected = filters.tags?.includes(tag)
                    return (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={isSelected}
                          onCheckedChange={() => handleTagToggle(tag)}
                        />
                        <Label htmlFor={`tag-${tag}`} className="text-sm font-body cursor-pointer capitalize">
                          {tag}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl tracking-wider">FILTERS</h2>
          {activeCount > 0 && (
            <span className="px-2 py-1 bg-[#F8E231] text-black text-xs font-body font-semibold rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <FilterContent />
      </div>

      {/* Mobile Button */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          onClick={() => setIsMobileOpen(true)}
          className="w-full sm:w-auto rounded-none border-foreground/20"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
          {activeCount > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-[#F8E231] text-black text-xs font-semibold rounded-full">
              {activeCount}
            </span>
          )}
        </Button>

        <AnimatePresence>
          {isMobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileOpen(false)}
                className="fixed inset-0 bg-black/50 z-50"
              />

              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className="fixed inset-y-0 right-0 w-full sm:max-w-md bg-background z-50 shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                  <h2 className="font-heading text-lg tracking-wider">FILTERS</h2>
                  <button onClick={() => setIsMobileOpen(false)} className="p-2 hover:bg-foreground/5 rounded-md">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <FilterContent />
                </div>

                <div className="px-6 py-4 border-t border-foreground/10">
                  <Button
                    onClick={() => setIsMobileOpen(false)}
                    className="w-full bg-[#F8E231] text-black hover:bg-[#F8E231]/90 font-body font-semibold tracking-wider rounded-none"
                  >
                    APPLY FILTERS
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}