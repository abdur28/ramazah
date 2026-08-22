"use client"

import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import CategoryBanner from "@/components/category/CategoryBanner"
import Link from "next/link"
import CategoryBreadcrumbs from "@/components/category/CategoryBreadcrumbs"
import CategoryFilter, { type FilterAxis, type FilterOptions } from "@/components/category/CategoryFilter"
import CategorySort, { type SortOption } from "@/components/category/CategorySort"
import CategoryGrid from "@/components/category/CategoryGrid"
import CategoryPagination from "@/components/category/CategoryPagination"
import type { Product } from "@/types/types"
import { useCurrency } from "@/contexts/CurrencyContext"

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
  /** Child categories, so a parent shelf can be browsed into. */
  shelvesAsString?: string
  /** Filter axes for the whole shelf, counted in the database. */
  facetsAsString?: string
  /** The filters currently applied, read from the URL. */
  filtersAsString?: string
  /** How many products the shelf holds before any filter. */
  totalOnShelf?: number
  /** How many match the current filter, across every page. */
  totalMatching?: number
  page?: number
  pageSize?: number
  sort?: string
  isLoading?: boolean
}

interface Shelf {
  name: string
  href: string
  image?: string
  /** Products on that shelf, including anything nested beneath it. */
  count?: number
}

export default function CategoryPage({
  title,
  description,
  subtitle,
  categoryPath,
  bannerImage,
  breadcrumbsAsString,
  productsAsString,
  shelvesAsString,
  facetsAsString,
  filtersAsString,
  totalOnShelf,
  totalMatching,
  page = 1,
  pageSize = 20,
  sort = "featured",
  isLoading = false,
}: CategoryPageProps) {
  const router = useRouter()
  const pathname = usePathname()

  /**
   * Filters come from the URL and go back to it.
   *
   * They were React state, and the whole category was filtered in the browser —
   * so every product had to be shipped before anything could be narrowed, and
   * the counts beside each value described the page rather than the shelf. The
   * database does the narrowing now; this only reads the answer and writes the
   * next query string.
   */
  const filters: FilterOptions = useMemo(
    () => (filtersAsString ? JSON.parse(filtersAsString) : {}),
    [filtersAsString]
  )

  const axes: FilterAxis[] = useMemo(
    () => (facetsAsString ? JSON.parse(facetsAsString) : []),
    [facetsAsString]
  )

  /**
   * Every navigable piece of state — filters, sort, page — goes through here so
   * it always lands in the URL together. Changing a filter resets to page one:
   * staying on page 4 of a result set that now has two pages shows nothing.
   */
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

  const applyFilters = useCallback(
    (next: FilterOptions) =>
      // `scroll: false` keeps the grid where it is — re-filtering should not
      // throw the reader back to the banner.
      router.push(buildQuery(next, sort, 1), { scroll: false }),
    [buildQuery, router, sort]
  )

  const applySort = useCallback(
    (next: SortOption) => router.push(buildQuery(filters, next, 1), { scroll: false }),
    [buildQuery, filters, router]
  )

  const hrefForPage = useCallback(
    (target: number) => buildQuery(filters, sort, target),
    [buildQuery, filters, sort]
  )

  const products: Product[] = useMemo(() => JSON.parse(productsAsString), [productsAsString])

  const totalPages = Math.max(Math.ceil((totalMatching ?? products.length) / pageSize), 1)
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => JSON.parse(breadcrumbsAsString), [breadcrumbsAsString])
  const shelves: Shelf[] = useMemo(
    () => (shelvesAsString ? JSON.parse(shelvesAsString) : []),
    [shelvesAsString]
  )

  const { getPrice } = useCurrency()

  /** The price in the currency being shown, not whichever one came back first. */
  const priceOf = useCallback(
    (product: Product) => getPrice(product.prices, 0),
    [getPrice]
  )

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>()
    products.forEach((product) =>
      new Set(product.tags ?? []).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
    )
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
  }, [products])

  const maxPrice = useMemo(
    () => products.reduce((highest, product) => Math.max(highest, priceOf(product)), 10000),
    [products, priceOf]
  )

  // Already narrowed by the database.
  const filteredProducts = products

  // Sorted in the database, across the whole filtered set rather than the page
  // in hand. Sorting twenty rows client-side would have shown the cheapest of
  // page one, not the cheapest on the shelf.
  const sortedProducts = filteredProducts

  const handleClearFilters = () => applyFilters({})

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

        {/*
          The shelves inside this one. Without these a parent category was a
          dead end: standing on Food & Pantry there was no way to reach Coffee &
          Tea except through the navbar, and anything added in the admin since
          the navbar was written was unreachable entirely.
        */}
        {shelves.length > 0 && (
          <motion.nav
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            aria-label="Shelves in this category"
            className="mb-8 border-b border-rule pb-8"
          >
            <h2 className="mb-3 font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Browse
            </h2>
            <ul className="flex flex-wrap gap-2">
              {shelves.map((shelf) => (
                <li key={shelf.href}>
                  <Link
                    href={shelf.href}
                    className="inline-flex items-center gap-2 rounded-sm border border-rule bg-card px-4 py-2 font-body text-sm text-foreground transition-colors hover:border-sage hover:bg-wash/60"
                  >
                    {shelf.name}
                    {/* So an empty shelf is visible before it is clicked. */}
                    {typeof shelf.count === "number" && (
                      <span className="font-body text-xs tabular-nums text-ink-muted">
                        {shelf.count}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}

        {/* Filters & Products Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters (Desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <CategoryFilter
                axes={axes}
                availableTags={availableTags}
                maxPrice={maxPrice}
                filters={filters}
                onFilterChange={applyFilters}
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
                    axes={axes}
                    availableTags={availableTags}
                    maxPrice={maxPrice}
                    filters={filters}
                    onFilterChange={applyFilters}
                    onClearFilters={handleClearFilters}
                  />
                </div>

                <div className="flex-1">
                  <p className="font-body text-xs uppercase tracking-wider text-foreground/60">
                    <span className="font-semibold text-foreground">{sortedProducts.length}</span> of{" "}
                    <span className="font-semibold text-foreground">
                      {totalMatching ?? products.length}
                    </span>{" "}
                    {(totalMatching ?? 0) !== (totalOnShelf ?? 0) ? "matching" : "products"}
                    {totalPages > 1 && (
                      <span className="ml-2 normal-case tracking-normal text-foreground/50">
                        page {page} of {totalPages}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Sort */}
              <CategorySort value={sort as SortOption} onChange={applySort} />
            </motion.div>

            {/* Products Grid */}
            {/*
              An empty shelf and a filter that matched nothing read the same to
              a shopper but are not the same problem. Telling someone with no
              filters set to adjust their filters is the kind of message that
              makes a shop look broken.
            */}
            <CategoryGrid
              products={sortedProducts}
              isLoading={isLoading}
              emptyMessage={
                products.length === 0
                  ? shelves.length > 0
                    ? "Nothing on this shelf yet — try one of the shelves above."
                    : "Nothing on this shelf yet. New stock lands every few weeks."
                  : "No products match those filters. Try loosening one."
              }
            />

            <CategoryPagination page={page} totalPages={totalPages} hrefFor={hrefForPage} />
          </div>
        </div>
      </div>

    </main>
  )
}