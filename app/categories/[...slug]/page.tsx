import { notFound } from "next/navigation"
import CategoryPage from "@/components/category/CategoryPage"
import { 
  getCategoryByPath, 
  getProductsByCategoryPath, 
  getAllCategories,
  pathToDisplayPath 
} from "@/lib/products"
import ArtPage from "@/components/category/ArtPage"


export default async function CategoryDynamicPage({ params }: any) {
  // Convert slug array to path with slashes
  // Example: ['clothings', 'hood-wears', 'hoodies'] becomes "clothings/hood-wears/hoodies"
  const { slug } = await params
  const path = slug.join('/')
  
  const { category, error: categoryError } = await getCategoryByPath(path)

  if (!category || categoryError) {
    notFound()
  }

  const { products, error: productsError } = await getProductsByCategoryPath(category.path)

  // Build breadcrumbs from path
  const pathParts = category.path.split('/')
  const breadcrumbs = pathParts.map((part, index) => {
    // Build accumulated path for each level
    const accumulatedPath = pathParts.slice(0, index + 1).join('/')
    
    // Convert slug part to display name
    const displayName = part
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    
    return {
      label: displayName,
      href: `/categories/${accumulatedPath}`
    }
  })

  // Convert path to display path for the title
  const displayPath = pathToDisplayPath(category.path)

  if (pathParts[0] === 'artwork') {
    return (
      <ArtPage
        title={category.name.toUpperCase()}
        description={category.description}
        subtitle={category.subtitle}
        categoryPath={displayPath}
        bannerImage={category.bannerImage?.secureUrl}
        breadcrumbsAsString={JSON.stringify(breadcrumbs)}
        productsAsString={JSON.stringify(products)}
        isLoading={false}
      />
    )
  }

  return (
    <CategoryPage
      title={category.name.toUpperCase()}
      description={category.description}
      subtitle={category.subtitle}
      categoryPath={displayPath} // Display format: "Clothings > Hood Wears > Hoodies"
      bannerImage={category.bannerImage?.secureUrl}
      breadcrumbsAsString={JSON.stringify(breadcrumbs)}
      productsAsString={JSON.stringify(products)}
      isLoading={false}
    />
  )
}

// Generate static params for all categories (including nested)
export async function generateStaticParams() {
  const { categories } = await getAllCategories()
  
  // Generate slug arrays for all categories
  return categories.map((category) => {
    // Convert path to slug array
    // Example: "clothings/hood-wears/hoodies" -> ['clothings', 'hood-wears', 'hoodies']
    const slugSegments = category.path.split('/')
    
    return {
      slug: slugSegments,
    }
  })
}

// Generate metadata for SEO
export async function generateMetadata({ params }: any) {
  const { slug } = await params
  const path = slug.join('/')
  const { category } = await getCategoryByPath(path)

  if (!category) {
    return {
      title: "Category Not Found | Ramazah",
    }
  }

  return {
    title: `${category.name} | Ramazah`,
    description: category.description || `Shop ${category.name} at Ramazah - Premium streetwear collection`,
    openGraph: {
      title: `${category.name} | Ramazah`,
      description: category.description,
      images: category.bannerImage?.secureUrl ? [category.bannerImage.secureUrl] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} | Ramazah`,
      description: category.description,
      images: category.bannerImage?.secureUrl ? [category.bannerImage.secureUrl] : [],
    },
  }
}