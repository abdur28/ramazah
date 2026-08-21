import { notFound } from "next/navigation";
import {
  getProductBySlug,
  getCategoryHierarchy,
  getProductsByCategoryPath,
  getProducts,
} from "@/lib/products";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductInfo from "@/components/product/ProductInfo";
import RelatedProducts from "@/components/product/RelatedProducts";
import ProductReviews from "@/components/product/ProductReviews";


export default async function ProductPage({ 
  params 
}: any) {
  const { slug } = await params
  const { product, error } = await getProductBySlug(slug);

  if (error || !product) {
    notFound();
  }

  // Real slugs for the breadcrumb. The product only carries the display path
  // ("Food & Pantry > Coffee & Tea"), and names cannot be turned back into
  // slugs reliably — which is why the old breadcrumb linked every category to
  // /clothings, a route from the previous brand.
  const { parent, current } = await getCategoryHierarchy(product.categoryPath);
  const breadcrumbs = [
    ...(parent ? [{ name: parent.name, href: `/categories/${parent.slug}` }] : []),
    ...(current
      ? [
          {
            name: current.name,
            href: parent
              ? `/categories/${parent.slug}/${current.slug}`
              : `/categories/${current.slug}`,
          },
        ]
      : []),
  ];

  // The same shelf first. A category with nothing else in it falls back to the
  // newest arrivals, so the section is never a lonely single card — with a
  // catalog this young that is the common case, not the edge case.
  const { products: sameCategory } = await getProductsByCategoryPath(product.categoryPath);
  let related = sameCategory.filter((p) => p.id !== product.id).slice(0, 4);
  let relatedCategory = current?.name;
  let relatedHref = breadcrumbs.at(-1)?.href;

  if (related.length < 2) {
    const { products: newest } = await getProducts(
      {},
      { limit: 5, orderBy: "created_at", orderDirection: "desc" }
    );
    related = newest.filter((p) => p.id !== product.id).slice(0, 4);
    relatedCategory = undefined;
    relatedHref = undefined;
  }

  return (
    <main className="relative bg-background min-h-screen pt-16 md:pt-20">
      <div className="mx-auto">
        <div className="flex flex-col lg:flex-row gap-0">
          {/* Image Gallery - Sticky on large screens */}
          <ProductImageGallery imagesAsString={JSON.stringify(product.images)} productName={product.name} />

          {/* Product Info, with reviews under its accordion. The gallery is
              pinned alongside, so the reviews scroll against the photograph
              instead of pushing a full-width band below the fold. */}
          <div className="w-full bg-background lg:w-max lg:flex-1">
            <ProductInfo
              productAsString={JSON.stringify(product)}
              breadcrumbsAsString={JSON.stringify(breadcrumbs)}
            />

            <ProductReviews
              productId={product.id}
              productName={product.name}
              ratingAvg={product.ratingAvg ?? 0}
              ratingCount={product.ratingCount ?? 0}
            />
          </div>
        </div>
      </div>

      <RelatedProducts
        productsAsString={JSON.stringify(related)}
        categoryName={relatedCategory}
        categoryHref={relatedHref}
      />
    </main>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: any) {
  const { slug } = await params
  const { product } = await getProductBySlug(slug);
  
  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.name} | Ramazah`,
    description: product.metaDescription || product.shortDescription || product.description,
    keywords: product.metaKeywords?.join(', '),
    openGraph: {
      title: product.name,
      description: product.shortDescription || product.description,
      images: [
        {
          url: product.images.find(img => img.isPrimary)?.secureUrl || product.images[0]?.secureUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
    },
  };
}