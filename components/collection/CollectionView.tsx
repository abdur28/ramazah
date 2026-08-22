"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import CategoryFilter, {
  type FilterAxis,
  type FilterOptions,
} from "@/components/category/CategoryFilter"
import CategorySort, { type SortOption } from "@/components/category/CategorySort"
import CategoryGrid from "@/components/category/CategoryGrid"
import CategoryPagination from "@/components/category/CategoryPagination"
import type { Product } from "@/types/types"

/**
 * A collection, shown.
 *
 * The same rail, sort, grid and pagination a category uses — the actual
 * components, not lookalikes, so there is one place to fix any of them and a
 * shopper only learns the controls once.
 *
 * What differs is the top: a collection leads with its banner and a sentence
 * about *why* these things are together, because that reason is the whole
 * content of a collection. A category does not need explaining; "The Cairo Run"
 * does.
 */
export default function CollectionView({
  name,
  description,
  bannerImage,
  bannerAlt,
  productsAsString,
  facetsAsString,
  filtersAsString,
  total,
  page,
  pageSize,
  sort,
}: {
  name: string
  description?: string
  bannerImage?: string
  bannerAlt?: string
  productsAsString: string
  facetsAsString: string
  filtersAsString: string
  total: number
  page: number
  pageSize: number
  sort: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  const products: Product[] = useMemo(() => JSON.parse(productsAsString), [productsAsString])
  const axes: FilterAxis[] = useMemo(() => JSON.parse(facetsAsString), [facetsAsString])
  const filters: FilterOptions = useMemo(() => JSON.parse(filtersAsString), [filtersAsString])

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const buildQuery = useCallback(
    (next: FilterOptions, nextSort: string, nextPage: number) => {
      const query = new URLSearchParams()

      Object.entries(next.options ?? {}).forEach(([axis, values]) => {
        if (values.length > 0) query.set(axis, values.join(","))
      })
      if (next.tags?.length) query.set("tags", next.tags.join(","))
      if (next.priceRange) {
        query.set("min", String(Math.round(next.priceRange[0])))
        query.set("max", String(Math.round(next.priceRange[1])))
      }
      if (next.inStockOnly) query.set("stock", "1")
      if (nextSort && nextSort !== "featured") query.set("sort", nextSort)
      if (nextPage > 1) query.set("page", String(nextPage))

      const search = query.toString()
      return search ? `${pathname}?${search}` : pathname
    },
    [pathname]
  )

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>()
    products.forEach((product) =>
      new Set(product.tags ?? []).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
    )
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
  }, [products])

  return (
    <main className="relative min-h-screen bg-background pt-16 md:pt-20">
      {/* The banner carries the reason these things are together. */}
      <section className="relative isolate flex min-h-[38vh] items-end overflow-hidden bg-wash md:min-h-[46vh]">
        {bannerImage && (
          <Image
            src={bannerImage}
            alt={bannerAlt ?? ""}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        {/*
          75%. Measured against the worst case — a white photograph — 55% leaves
          cream at 3.22:1; this brings it to 5.89:1 and the softened body copy to
          4.79:1. The banner is whatever the shopkeeper uploaded, so the scrim
          cannot assume a dark one.
        */}
        <div aria-hidden className="absolute inset-0 bg-foreground/75" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto w-full max-w-[1400px] px-4 pb-10 md:px-6 md:pb-14"
        >
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-1.5 font-body text-xs text-background/70"
          >
            <Link href="/" className="transition-colors hover:text-background">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/collections" className="transition-colors hover:text-background">
              Collections
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-background">{name}</span>
          </nav>

          <h1 className="font-heading text-[34px] font-light leading-none tracking-[0.02em] text-background md:text-6xl">
            {name}
          </h1>

          {description && (
            <p className="mt-4 max-w-[58ch] font-body text-sm leading-relaxed text-background/85 md:text-base">
              {description}
            </p>
          )}
        </motion.div>
      </section>

      <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-6 md:py-12">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full flex-shrink-0 lg:w-72">
            <div className="lg:sticky lg:top-24">
              <CategoryFilter
                axes={axes}
                availableTags={availableTags}
                maxPrice={10000}
                filters={filters}
                onFilterChange={(next) =>
                  router.push(buildQuery(next, sort, 1), { scroll: false })
                }
                onClearFilters={() => router.push(buildQuery({}, sort, 1), { scroll: false })}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-rule pb-6 sm:flex-row sm:items-center">
              <p className="font-body text-xs uppercase tracking-wider text-ink-muted">
                <span className="font-semibold text-foreground">{products.length}</span> of{" "}
                <span className="font-semibold text-foreground">{total}</span>
                {totalPages > 1 && (
                  <span className="ml-2 normal-case tracking-normal text-foreground/50">
                    page {page} of {totalPages}
                  </span>
                )}
              </p>

              <CategorySort
                value={sort as SortOption}
                onChange={(next) => router.push(buildQuery(filters, next, 1), { scroll: false })}
              />
            </div>

            <CategoryGrid
              products={products}
              emptyMessage={
                total === 0
                  ? "Nothing in this collection yet."
                  : "No products match those filters. Try loosening one."
              }
            />

            <CategoryPagination
              page={page}
              totalPages={totalPages}
              hrefFor={(target) => buildQuery(filters, sort, target)}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
