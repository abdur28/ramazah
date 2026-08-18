"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import CrossedLink from "@/components/ui/crossed-link";
import VariantSelector from "@/components/product/VariantSelector";
import AddToCartSection from "@/components/product/AddToCartSection";
import ProductDetails from "@/components/product/ProductDetails";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { Product, ProductVariant } from "@/types/types";

export default function ProductInfo({ productAsString }: { productAsString: string }) {
  const product: Product = JSON.parse(productAsString);
  const { formatPrice, getPriceWithCompare } = useCurrency();
  
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.[0] || null
  );

  // Memoize the variant change handler to prevent infinite loops
  const handleVariantChange = useCallback((variant: ProductVariant) => {
    setSelectedVariant(variant);
  }, []);

  // Get prices based on selected variant or product default
  const pricesSource = selectedVariant?.prices || product.prices;
  const priceData = getPriceWithCompare(pricesSource);

  // Parse category path for breadcrumb
  const categoryParts = product.categoryPath.split(" > ");

  return (
    <div className="px-6 lg:px-12 py-8 lg:py-12">
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 text-xs text-foreground/60 mb-6"
      >
        <CrossedLink href="/" lineColor="gold">
          <span className="hover:text-foreground transition-colors">Home</span>
        </CrossedLink>
        
        {categoryParts.map((part, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3" />
            {index === categoryParts.length - 1 ? (
              <span className="text-foreground/90">{part}</span>
            ) : (
              <CrossedLink href={`/clothings`} lineColor="gold">
                <span className="hover:text-foreground transition-colors">{part}</span>
              </CrossedLink>
            )}
          </div>
        ))}
        
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground/90">{product.name}</span>
      </motion.nav>

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap gap-2 mb-4"
      >
        {product.isNew && (
          <span className="px-3 py-1 bg-[#F8E231] text-black text-xs font-body font-semibold uppercase tracking-wider">
            New
          </span>
        )}
        {priceData.discountPercent > 0 && (
          <span className="px-3 py-1 bg-red-500 text-white text-xs font-body font-semibold uppercase tracking-wider">
            -{priceData.discountPercent}% Off
          </span>
        )}
        {product.isLimitedEdition && (
          <span className="px-3 py-1 bg-black text-[#F8E231] text-xs font-body font-semibold uppercase tracking-wider">
            Limited Edition
          </span>
        )}
        {product.isBestseller && (
          <span className="px-3 py-1 bg-foreground/10 text-foreground text-xs font-body font-semibold uppercase tracking-wider">
            Bestseller
          </span>
        )}
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="font-heading text-4xl lg:text-5xl tracking-wide mb-4 uppercase"
      >
        {product.name}
      </motion.h1>

      {/* Short Description */}
      {product.shortDescription && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="font-body text-base text-foreground/70 mb-6"
        >
          {product.shortDescription}
        </motion.p>
      )}

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap gap-2 mb-6"
        >
          {product.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 border border-foreground/20 text-foreground/60 text-xs font-body rounded-sm"
            >
              #{tag}
            </span>
          ))}
        </motion.div>
      )}

      {/* Price */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-baseline gap-3">
          <span className="font-body text-3xl text-foreground">
            {formatPrice(priceData.price)}
          </span>
          {priceData.compareAtPrice > 0 && (
            <span className="font-body text-xl text-foreground/40 line-through">
              {formatPrice(priceData.compareAtPrice)}
            </span>
          )}
        </div>
        {priceData.discountPercent > 0 && priceData.compareAtPrice > 0 && (
          <p className="text-sm text-green-600 mt-2">
            You save {formatPrice(priceData.compareAtPrice - priceData.price)}
          </p>
        )}
      </motion.div>

      {/* Divider */}
      <div className="h-px bg-foreground/10 mb-8" />

      {/* Variant Selector */}
      {product.variants && product.variants.length > 0 && (
        <VariantSelector
          variants={product.variants}
          colors={product.colors || []}
          sizes={product.sizes || []}
          selectedVariant={selectedVariant}
          onVariantChange={handleVariantChange}
        />
      )}

      {/* Add to Cart Section */}
      <AddToCartSection 
        product={product} 
        selectedVariant={selectedVariant}
      />

      {/* Divider */}
      <div className="h-px bg-foreground/10 my-8" />

      {/* Product Details */}
      <ProductDetails product={product} />
    </div>
  );
}