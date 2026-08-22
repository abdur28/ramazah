"use client"

import { useCallback, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import CategoryFilter, {
  type FilterAxis,
  type FilterOptions,
} from "@/components/category/CategoryFilter"
import CategorySort, { type SortOption } from "@/components/category/CategorySort"
import CategoryGrid from "@/components/category/CategoryGrid"
import CategoryPagination from "@/components/category/CategoryPagination"
import { useCurrency } from "@/contexts/CurrencyContext"
import { popularCategories } from "@/constants/navigation"
import { useNavigation } from "@/contexts/NavigationContext"
import type { Product } from "@/types/types"

/**
 * The results themselves.
 *
 * Deliberately the same controls as a category shelf — the same rail, sort and
 * pagination components, not lookalikes. A shopper who has filtered a category
 * already knows how to filter a search, and there is one place to fix either.
 *
 * What differs is what an empty result means. An empty shelf is a shop that has
 * not stocked something yet; an empty search is usually a spelling or a word the
 * catalogue does not use, so this offers somewhere to go rather than an apology.
 */
export default function SearchResults({
  term,
  productsAsString,
  facetsAsString,
  filtersAsString,
  total,
  page,
  pageSize,
  sort,
}: {
  term: string
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
  const { formatPrice } = useCurrency()
  const { popular } = useNavigation()

  const products: Product[] = useMemo(() => JSON.parse(productsAsString), [productsAsString])
  const axes: FilterAxis[] = useMemo(() => JSON.parse(facetsAsString), [facetsAsString])
  const filters: FilterOptions = useMemo(() => JSON.parse(filtersAsString), [filtersAsString])

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const buildQuery = useCallback(
    (next: FilterOptions, nextSort: string, nextPage: number) => {
      const query = new URLSearchParams()
      if (term) query.set("q", term)

      Object.entries(next.options ?? {}).forEach(([axis, values]) => {
        if (values.length > 0) query.set(axis, values.join(","))
      })
      if (next.tags?.length) query.set("tags", next.tags.join(","))
      if (next.priceRange) {
        query.set("min", String(Math.round(next.priceRange[0])))
        query.set("max", String(Math.round(next.priceRange[1])))
      }
      if (next.inStockOnly) query.set("stock", "1")
      if (nextSort && nextSort !== "relevance") query.set("sort", nextSort)
      if (nextPage > 1) query.set("page", String(nextPage))

      return `${pathname}?${query.toString()}`
    },
    [pathname, term]
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

  const suggestions = popular.length > 0 ? popular : popularCategories

  return (
    <main className="relative min-h-screen bg-background pt-16 md:pt-20">
      <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-6 md:py-14">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 border-b border-rule pb-8"
        >
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Search
          </p>
          <h1 className="mt-2 font-heading text-[32px] font-light leading-none tracking-[0.02em] text-foreground md:text-4xl">
            {term ? `“${term}”` : "What are you looking for?"}
          </h1>
          {term && (
            <p className="mt-3 font-body text-sm text-ink-muted">
              {total === 0
                ? "Nothing matched."
                : `${total} ${total === 1 ? "product" : "products"}`}
            </p>
          )}
        </motion.header>

        {!term ? (
          <Empty
            title="Type something to search"
            body="Search runs across every product name, summary and description."
            suggestions={suggestions}
          />
        ) : total === 0 ? (
          <Empty
            title={`Nothing matched “${term}”`}
            body="Try a shorter word, or a different one — the search reads product names and descriptions, not category names."
            suggestions={suggestions}
          />
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row">
            <aside className="w-full flex-shrink-0 lg:w-72">
              <div className="lg:sticky lg:top-24">
                <CategoryFilter
                  axes={axes}
                  availableTags={availableTags}
                  maxPrice={10000}
                  filters={filters}
                  onFilterChange={(next) => router.push(buildQuery(next, sort, 1), { scroll: false })}
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
                emptyMessage="No products match those filters. Try loosening one."
              />

              <CategoryPagination
                page={page}
                totalPages={totalPages}
                hrefFor={(target) => buildQuery(filters, sort, target)}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function Empty({
  title,
  body,
  suggestions,
}: {
  title: string
  body: string
  suggestions: { name: string; href: string }[]
}) {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-wash">
        <Search className="h-5 w-5 text-sage" />
      </span>
      <p className="font-body text-base text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-[52ch] font-body text-sm text-ink-muted">{body}</p>

      {suggestions.length > 0 && (
        <>
          <p className="mt-8 font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Or browse
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {suggestions.slice(0, 6).map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className="inline-flex rounded-sm border border-rule bg-card px-4 py-2 font-body text-sm text-foreground transition-colors hover:border-sage hover:bg-wash/60"
                >
                  {entry.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
