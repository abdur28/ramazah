import { notFound } from "next/navigation"
import CategoryPage from "@/components/category/CategoryPage"
import {
  getCategoryByPath,
  getProductsByCategoryPath,
  getAllCategories,
  getCategoryHierarchy,
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
export default async function CategoryDynamicPage({ params }: any) {
  const { slug } = await params
  const path = slug.join('/')

  const { category, error: categoryError } = await getCategoryByPath(path)

  if (!category || categoryError) {
    notFound()
  }

  // The real hierarchy, rather than one inferred from the path string.
  const { ancestors, children } = await getCategoryHierarchy(category.path)

  const { products } = await getProductsByCategoryPath(category.path)

  // Every level from the root down, so a breadcrumb is correct at any depth
  // rather than only for a child of a root.
  const trail = [...ancestors, category]
  const breadcrumbs = trail.map((step, index) => ({
    label: step.name,
    href: categoryHref(trail.slice(0, index + 1).map((c) => c.slug)),
  }))

  // Where a shopper can go next. Empty for a leaf.
  const shelves = children.map((child) => ({
    name: child.name,
    href: categoryHref([...trail.map((c) => c.slug), child.slug]),
    image: child.bannerImage?.secureUrl,
  }))

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
