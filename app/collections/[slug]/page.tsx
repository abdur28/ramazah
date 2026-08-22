import { notFound } from "next/navigation"
import CollectionView from "@/components/collection/CollectionView"
import {
  getCollectionBySlug,
  getCollectionProducts,
  getCollectionFacets,
  getCollectionSummaries,
  CATEGORY_PAGE_SIZE,
  type CategoryFilters,
} from "@/lib/products"

/**
 * One collection.
 *
 * The table, `products.collection_id` and the whole admin section have existed
 * since the first migration with no route to render them — so a collection was
 * strictly worse than a tag: the same grouping, plus the admin work, minus any
 * way for a shopper to reach it.
 *
 * It is the same rails as a category and a search, because `filter_products`
 * takes a collection the same way it takes a path or a query.
 */
const RESERVED = new Set(["tags", "min", "max", "stock", "sort", "page"])

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

export async function generateStaticParams() {
  const { collections } = await getCollectionSummaries()
  return collections.map((collection) => ({ slug: collection.slug }))
}

export async function generateMetadata({ params }: any) {
  const { slug } = await params
  const { collection } = await getCollectionBySlug(slug)
  if (!collection) return { title: "Collection · Ramazah" }

  return {
    title: `${collection.name} · Ramazah`,
    description: collection.description,
    openGraph: {
      title: collection.name,
      description: collection.description,
      images: collection.bannerImage?.secureUrl ? [collection.bannerImage.secureUrl] : undefined,
    },
  }
}

export default async function CollectionPage({ params, searchParams }: any) {
  const { slug } = await params
  const query = (await searchParams) ?? {}

  const { collection } = await getCollectionBySlug(slug)
  if (!collection) notFound()

  const filters = filtersFromQuery(query)
  const sort = String(firstOf(query.sort) ?? "featured")
  const page = Math.max(Number(firstOf(query.page) ?? 1) || 1, 1)

  const [{ products, total }, { facets }] = await Promise.all([
    getCollectionProducts(slug, filters, { sort, page }),
    getCollectionFacets(slug),
  ])

  return (
    <CollectionView
      name={collection.name}
      description={collection.description}
      bannerImage={collection.bannerImage?.secureUrl}
      bannerAlt={collection.bannerImage?.altText}
      productsAsString={JSON.stringify(products)}
      facetsAsString={JSON.stringify(facets)}
      filtersAsString={JSON.stringify(filters)}
      total={total}
      page={page}
      pageSize={CATEGORY_PAGE_SIZE}
      sort={sort}
    />
  )
}
