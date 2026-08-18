"use client"

import { useState, useMemo } from "react"
import { motion } from "framer-motion"
import CategoryBanner from "@/components/category/CategoryBanner"
import CategoryBreadcrumbs from "@/components/category/CategoryBreadcrumbs"
import CategoryFilter, { type FilterOptions } from "@/components/category/CategoryFilter"
import CategorySort, { type SortOption } from "@/components/category/CategorySort"
import CategoryGrid from "@/components/category/CategoryGrid"
import type { Product, Color } from "@/types/types"

interface BreadcrumbItem {
  label: string
  href: string
}

interface CategoryPageProps {
  title: string
  description?: string
  subtitle?: string
  categoryPath?: string
  bannerImage?: string
  breadcrumbsAsString: string
  productsAsString: string
  isLoading?: boolean
}

export default function CategoryPage({
  title,
  description,
  subtitle,
  categoryPath,
  bannerImage,
  breadcrumbsAsString,
  productsAsString,
  isLoading = false,
}: CategoryPageProps) {
  const [sortBy, setSortBy] = useState<SortOption>("featured")
  const [filters, setFilters] = useState<FilterOptions>({})

  const products: Product[] = useMemo(() => JSON.parse(productsAsString), [productsAsString])
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => JSON.parse(breadcrumbsAsString), [breadcrumbsAsString])

  // Extract available filter options from products
  const availableSizes = useMemo(() => {
    const sizes = new Set<string>()
    products.forEach((product) => {
      product.sizes?.forEach((size) => sizes.add(size))
    })
    return Array.from(sizes).sort()
  }, [products])

  const availableColors = useMemo(() => {
    const colorsMap = new Map<string, Color>()
    products.forEach((product) => {
      product.colors?.forEach((color) => {
        if (!colorsMap.has(color.name)) {
          colorsMap.set(color.name, color)
        }
      })
    })
    return Array.from(colorsMap.values())
  }, [products])

  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    products.forEach((product) => {
      product.tags?.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [products])

  const availableMaterials = useMemo(() => {
    const materials = new Set<string>()
    products.forEach((product) => {
      product.materials?.forEach((material) => materials.add(material))
    })
    return Array.from(materials).sort()
  }, [products])

  const maxPrice = useMemo(() => {
    return Math.max(...products.map((p) => p.prices?.[0]?.price || 0), 10000)
  }, [products])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Size filter
      if (filters.sizes && filters.sizes.length > 0) {
        const hasMatchingSize = product.sizes?.some((size) => filters.sizes!.includes(size))
        if (!hasMatchingSize) return false
      }

      // Color filter
      if (filters.colors && filters.colors.length > 0) {
        const hasMatchingColor = product.colors?.some((color) => 
          filters.colors!.some((fc) => fc.name === color.name)
        )
        if (!hasMatchingColor) return false
      }

      // Price range filter
      if (filters.priceRange) {
        const price = product.prices?.[0]?.price || 0
        if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
          return false
        }
      }

      // In stock filter
      if (filters.inStockOnly && !product.inStock) {
        return false
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = product.tags?.some((tag) => filters.tags!.includes(tag))
        if (!hasMatchingTag) return false
      }

      // Material filter
      if (filters.materials && filters.materials.length > 0) {
        const hasMatchingMaterial = product.materials?.some((material) => 
          filters.materials!.includes(material)
        )
        if (!hasMatchingMaterial) return false
      }

      return true
    })
  }, [products, filters])

  // Sort products
  const sortedProducts = useMemo(() => {
    const sorted = [...filteredProducts]

    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })

      case "price-low-high":
        return sorted.sort((a, b) => {
          const priceA = a.prices?.[0]?.price || 0
          const priceB = b.prices?.[0]?.price || 0
          return priceA - priceB
        })

      case "price-high-low":
        return sorted.sort((a, b) => {
          const priceA = a.prices?.[0]?.price || 0
          const priceB = b.prices?.[0]?.price || 0
          return priceB - priceA
        })

      case "name-a-z":
        return sorted.sort((a, b) => a.name.localeCompare(b.name))

      case "name-z-a":
        return sorted.sort((a, b) => b.name.localeCompare(a.name))

      case "featured":
      default:
        return sorted.sort((a, b) => {
          if (a.isFeatured && !b.isFeatured) return -1
          if (!a.isFeatured && b.isFeatured) return 1
          if (a.isNew && !b.isNew) return -1
          if (!a.isNew && b.isNew) return 1
          if (a.isBestseller && !b.isBestseller) return -1
          if (!a.isBestseller && b.isBestseller) return 1
          return 0
        })
    }
  }, [filteredProducts, sortBy])

  const handleClearFilters = () => {
    setFilters({})
  }

  return (
    <main className="relative bg-background min-h-screen pt-16 md:pt-20">
      {/* Banner */}
      <CategoryBanner
        title={title}
        description={description}
        subtitle={subtitle}
        bannerImage={bannerImage}
        productCount={products.length}
      />

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Breadcrumbs */}
        <CategoryBreadcrumbs items={breadcrumbs} />

        {/* Filters & Products Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters (Desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <CategoryFilter
                availableSizes={availableSizes}
                availableColors={availableColors}
                availableTags={availableTags}
                availableMaterials={availableMaterials}
                maxPrice={maxPrice}
                filters={filters}
                onFilterChange={setFilters}
                onClearFilters={handleClearFilters}
              />
            </div>
          </aside>

          {/* Products Section */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8 pb-6 border-b border-foreground/10"
            >
              {/* Results Count & Mobile Filter */}
              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Mobile Filter Button */}
                <div className="lg:hidden">
                  <CategoryFilter
                    availableSizes={availableSizes}
                    availableColors={availableColors}
                    availableTags={availableTags}
                    availableMaterials={availableMaterials}
                    maxPrice={maxPrice}
                    filters={filters}
                    onFilterChange={setFilters}
                    onClearFilters={handleClearFilters}
                  />
                </div>

                <div className="flex-1">
                  <p className="font-body text-xs uppercase tracking-wider text-foreground/60">
                    <span className="font-semibold text-foreground">{sortedProducts.length}</span> of{" "}
                    <span className="font-semibold text-foreground">{products.length}</span> products
                  </p>
                </div>
              </div>

              {/* Sort */}
              <CategorySort value={sortBy} onChange={setSortBy} />
            </motion.div>

            {/* Products Grid */}
            <CategoryGrid
              products={sortedProducts}
              isLoading={isLoading}
              emptyMessage="Try adjusting your filters to see more products."
            />
          </div>
        </div>
      </div>

    </main>
  )
}