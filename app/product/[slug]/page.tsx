import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductInfo from "@/components/product/ProductInfo";


export default async function ProductPage({ 
  params 
}: any) {
  const { slug } = await params
  const { product, error } = await getProductBySlug(slug);

  if (error || !product) {
    notFound();
  }

  return (
    <main className="relative bg-background min-h-screen pt-16 md:pt-20">
      <div className="mx-auto">
        <div className="flex flex-col lg:flex-row gap-0">
          {/* Image Gallery - Sticky on large screens */}
          <ProductImageGallery imagesAsString={JSON.stringify(product.images)} productName={product.name} />

          {/* Product Info */}
          <div className="w-full lg:w-max lg:flex-1 bg-background">
            <ProductInfo productAsString={JSON.stringify(product)} />
          </div>
        </div>
      </div>
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