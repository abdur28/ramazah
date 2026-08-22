import { notFound } from "next/navigation"
import CategoryPage from "@/components/category/CategoryPage"
import {
  getCategoryByPath,
  getProductsByCategoryPath,
  getFilteredCategoryProducts,
  getCategoryFacets,
  getAllCategories,
  getCategoryHierarchy,
  CATEGORY_PAGE_SIZE,
  type CategoryFilters,
} from "@/lib/products"
import { categoryHref } from "@/lib/categories"
import type { Category } from "@/types/types"


/**
 * One category, and everything under it.
 *
 * Two things were wrong here. The breadcrumbs were built by splitting
 * `category.path` on `'/'` — the database separates with `' > '`, so a
 * subcategory produced a single crumb reading "Food & Pantry > Coffee & Tea"
 * whose link pointed at `/categories/Food & Pantry > Coffee & Tea` and 404'd.
 * They now come from the real parent/child rows, with slug URLs.
 *
 * And a parent category listed neither its children nor their products, so
 * "Food & Pantry" showed one item while four sat beneath it, with no way to
 * reach Coffee & Tea from the page above it.
 */
export default async function CategoryDynamicPage({ params, searchParams }: any) {
  const { slug } = await params
  const query = (await searchParams) ?? {}
  const path = slug.join('/')

  const { category, error: categoryError } = await getCategoryByPath(path)

  if (!category || categoryError) {
    notFound()
  }

  // The real hierarchy, rather than one inferred from the path string.
  const { ancestors, children } = await getCategoryHierarchy(category.path)

  /**
   * Filters live in the URL, and the narrowing happens in the database.
   *
   * They used to be React state, with every product in the category shipped to
   * the browser and filtered there — fine at a dozen items, wasteful at a few
   * hundred, and the counts beside each value described the page rather than
   * the shelf. In the URL they are also shareable and survive the back button.
   */
  const filters = filtersFromQuery(query)
  const sort = String(firstOf(query.sort) ?? 'featured')
  const page = Math.max(Number(firstOf(query.page) ?? 1) || 1, 1)

  const [{ products, total }, { facets }] = await Promise.all([
    getFilteredCategoryProducts(category.path, filters, { sort, page }),
    getCategoryFacets(category.path),
  ])

  // What the shelf holds before any filter, so the toolbar can say "4 of 8".
  const { products: allOnShelf } = await getProductsByCategoryPath(category.path)

  // Every level from the root down, so a breadcrumb is correct at any depth
  // rather than only for a child of a root.
  const trail = [...ancestors, category]
  const breadcrumbs = trail.map((step, index) => ({
    label: step.name,
    href: categoryHref(trail.slice(0, index + 1).map((c) => c.slug)),
  }))

  // Where a shopper can go next, with what is on each. Counted the same way the
  // page itself counts — including anything nested beneath the shelf — so a
  // chip reading 4 and a page listing 4 agree.
  const shelves = await Promise.all(
    children.map(async (child) => {
      const { products: onShelf } = await getProductsByCategoryPath(child.path)
      return {
        name: child.name,
        href: categoryHref([...trail.map((c) => c.slug), child.slug]),
        image: child.bannerImage?.secureUrl,
        count: onShelf.length,
      }
    })
  )

  return (
    <CategoryPage
      title={category.name.toUpperCase()}
      description={category.description}
      subtitle={category.subtitle}
      categoryPath={category.path}
      bannerImage={category.bannerImage?.secureUrl}
      breadcrumbsAsString={JSON.stringify(breadcrumbs)}
      productsAsString={JSON.stringify(products)}
      shelvesAsString={JSON.stringify(shelves)}
      facetsAsString={JSON.stringify(facets)}
      filtersAsString={JSON.stringify(filters)}
      totalOnShelf={allOnShelf.length}
      totalMatching={total}
      page={page}
      pageSize={CATEGORY_PAGE_SIZE}
      sort={sort}
      isLoading={false}
    />
  )
}

// Generate static params for all categories (including nested)
export async function generateStaticParams() {
  const { categories } = await getAllCategories()

  // URLs are built from the slug trail, not the stored display path:
  // "Food & Pantry > Coffee & Tea" -> /categories/food-pantry/coffee-tea
  //
  // This walked exactly two levels, so a category three deep had no
  // pre-rendered page. It recurses now, to whatever depth the tree has.
  const params: { slug: string[] }[] = []

  const walk = (nodes: Category[], trail: string[]) => {
    for (const node of nodes) {
      const next = [...trail, node.slug]
      params.push({ slug: next })
      if (node.subCategories?.length) walk(node.subCategories, next)
    }
  }

  walk(categories as Category[], [])
  return params
}

/**
 * `?Weight=250g,1kg&tags=gift&max=12000&stock=1` -> the filter the database takes.
 *
 * Axes are their own query keys so a URL reads as what it filters. The reserved
 * names below cannot be axis names, which is why they are spelled unlike any
 * category axis would be.
 */
const RESERVED = new Set(["tags", "min", "max", "stock", "sort", "page"])

const firstOf = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

function filtersFromQuery(query: Record<string, string | string[] | undefined>): CategoryFilters {
  const first = firstOf

  const list = (value: string | string[] | undefined) =>
    (first(value) ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)

  const options: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(query)) {
    if (RESERVED.has(key)) continue
    const values = list(value)
    if (values.length > 0) options[key] = values
  }

  const min = Number(first(query.min))
  const max = Number(first(query.max))

  return {
    options: Object.keys(options).length > 0 ? options : undefined,
    tags: list(query.tags).length > 0 ? list(query.tags) : undefined,
    minPrice: Number.isFinite(min) && first(query.min) ? min : undefined,
    maxPrice: Number.isFinite(max) && first(query.max) ? max : undefined,
    inStockOnly: first(query.stock) === "1" || undefined,
  }
}
