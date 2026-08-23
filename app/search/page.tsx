import { Suspense } from "react"
import SearchResults from "@/components/search/SearchResults"
import {
  searchProducts,
  getSearchFacets,
  CATEGORY_PAGE_SIZE,
  type CategoryFilters,
} from "@/lib/products"

/**
 * Search results.
 *
 * Search lived entirely in the navbar dialog, which showed six ranked matches
 * and then said "refine to narrow" — a dead end with nowhere to go, on a
 * catalogue that will not stay small. `search_product_ids()` had always ranked
 * the whole thing; nothing rendered past the sixth row.
 *
 * The page reuses the category rails: same filter axes, same counts, same
 * sorting and paging, because `filter_products` takes a search the same way it
 * takes a path. Everything is in the URL, so a result set can be sent to
 * someone.
 */
export const metadata = {
  title: "Search · Ramazah Store",
  description: "Search everything Ramazah Store brings back from Egypt.",
}

const RESERVED = new Set(["q", "tags", "min", "max", "stock", "sort", "page"])

const firstOf = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

function filtersFromQuery(
  query: Record<string, string | string[] | undefined>
): CategoryFilters {
  const list = (value: string | string[] | undefined) =>
    (firstOf(value) ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)

  const options: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(query)) {
    if (RESERVED.has(key)) continue
    const values = list(value)
    if (values.length > 0) options[key] = values
  }

  const min = Number(firstOf(query.min))
  const max = Number(firstOf(query.max))

  return {
    options: Object.keys(options).length > 0 ? options : undefined,
    tags: list(query.tags).length > 0 ? list(query.tags) : undefined,
    minPrice: Number.isFinite(min) && firstOf(query.min) ? min : undefined,
    maxPrice: Number.isFinite(max) && firstOf(query.max) ? max : undefined,
    inStockOnly: firstOf(query.stock) === "1" || undefined,
  }
}

export default async function SearchPage({ searchParams }: any) {
  const query = (await searchParams) ?? {}
  const term = (firstOf(query.q) ?? "").trim()
  const filters = filtersFromQuery(query)
  const sort = String(firstOf(query.sort) ?? "relevance")
  const page = Math.max(Number(firstOf(query.page) ?? 1) || 1, 1)

  const [{ products, total }, { facets }] = await Promise.all([
    searchProducts(term, filters, { sort, page }),
    term ? getSearchFacets(term) : Promise.resolve({ facets: [], error: null }),
  ])

  return (
    <Suspense>
      <SearchResults
        term={term}
        productsAsString={JSON.stringify(products)}
        facetsAsString={JSON.stringify(facets)}
        filtersAsString={JSON.stringify(filters)}
        total={total}
        page={page}
        pageSize={CATEGORY_PAGE_SIZE}
        sort={sort}
      />
    </Suspense>
  )
}
