"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import Stars from "@/components/product/Stars";
import VariantSelector from "@/components/product/VariantSelector";
import AddToCartSection from "@/components/product/AddToCartSection";
import ProductDetails from "@/components/product/ProductDetails";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSelectedVariant } from "@/components/product/SelectedVariantProvider";
import type { Product, ProductVariant } from "@/types/types";

interface Breadcrumb {
  name: string;
  href: string;
}

export default function ProductInfo({
  productAsString,
  breadcrumbsAsString,
  collectionsAsString,
}: {
  productAsString: string;
  breadcrumbsAsString: string;
  collectionsAsString?: string;
}) {
  const product: Product = JSON.parse(productAsString);
  const breadcrumbs: Breadcrumb[] = JSON.parse(breadcrumbsAsString);
  const collections: { name: string; slug: string }[] = collectionsAsString
    ? JSON.parse(collectionsAsString)
    : [];
  const { formatPrice, getPriceWithCompare } = useCurrency();
  
  // Shared with the gallery, which needs the selection to know which
  // photographs belong to the chosen variant.
  const { selectedVariant, setSelectedVariant } = useSelectedVariant();

  // Memoized, because VariantSelector reports through an effect and a fresh
  // identity each render would loop.
  const handleVariantChange = useCallback(
    (variant: ProductVariant) => setSelectedVariant(variant),
    [setSelectedVariant]
  );

  // Get prices based on selected variant or product default
  const pricesSource = selectedVariant?.prices || product.prices;
  const priceData = getPriceWithCompare(pricesSource);

  return (
    <div className="px-6 lg:px-12 py-8 lg:py-12">
      {/* Breadcrumb */}
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-wrap items-center gap-1.5 font-body text-xs text-ink-muted"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="transition-colors hover:text-sage-deep">
          Home
        </Link>

        {breadcrumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-ink-faint" />
            <Link href={crumb.href} className="transition-colors hover:text-sage-deep">
              {crumb.name}
            </Link>
          </span>
        ))}

        <ChevronRight className="h-3 w-3 text-ink-faint" />
        <span className="text-foreground">{product.name}</span>
      </motion.nav>

      {/*
        The collections this is part of. Sits above the badges rather than among
        them: a badge says what a product *is*, this says where it came from,
        and it is a link out rather than a label.

        More than one is normal — a buying run and an occasion overlap — so
        "Part of" is written once and the links follow it as a list.
      */}
      {collections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-body text-xs text-ink-muted"
        >
          <span>Part of</span>
          {collections.map((collection, index) => (
            <span key={collection.slug} className="inline-flex items-center gap-1.5">
              {index > 0 && <span aria-hidden>·</span>}
              <Link
                href={`/collections/${collection.slug}`}
                className="group inline-flex items-center gap-1 text-sage-deep underline decoration-rule underline-offset-4 transition-colors hover:decoration-sage-deep"
              >
                {collection.name}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </span>
          ))}
        </motion.div>
      )}

      {/* Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap gap-2 mb-4"
      >
        {product.isNew && (
          <span className="rounded-sm bg-terra-deep px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-background">
            New
          </span>
        )}
        {priceData.discountPercent > 0 && (
          <span className="rounded-sm bg-destructive px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-background">
            -{priceData.discountPercent}%
          </span>
        )}
        {product.isLimitedEdition && (
          <span className="rounded-sm bg-foreground px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-sage-light">
            Limited
          </span>
        )}
        {product.isBestseller && (
          <span className="rounded-sm bg-wash px-2.5 py-1 font-body text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            Bestseller
          </span>
        )}
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-4 font-heading text-4xl font-light leading-[1.08] text-foreground lg:text-5xl"
      >
        {product.name}
      </motion.h1>

      {/* Rating. Renders only once a review has been approved, so a young
          catalogue never shows an empty five-star outline. */}
      {(product.ratingCount ?? 0) > 0 && (
        <motion.a
          href="#reviews"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mb-5 inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <Stars rating={product.ratingAvg ?? 0} />
          <span className="tabular-nums">{(product.ratingAvg ?? 0).toFixed(1)}</span>
          <span>
            · {product.ratingCount} {product.ratingCount === 1 ? "review" : "reviews"}
          </span>
        </motion.a>
      )}

      {/* Short Description */}
      {product.shortDescription && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6 max-w-[52ch] font-body text-base text-ink-muted"
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
              className="rounded-full border border-rule px-3 py-1 font-body text-xs text-ink-muted"
            >
              {tag}
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
          <span className="font-body text-3xl font-medium tabular-nums text-foreground">
            {formatPrice(priceData.price)}
          </span>
          {priceData.compareAtPrice > 0 && (
            <span className="font-body text-xl tabular-nums text-ink-muted line-through">
              {formatPrice(priceData.compareAtPrice)}
            </span>
          )}
        </div>
        {priceData.discountPercent > 0 && priceData.compareAtPrice > 0 && (
          <p className="mt-2 font-body text-sm text-success">
            You save {formatPrice(priceData.compareAtPrice - priceData.price)}
          </p>
        )}
      </motion.div>

      {/* Divider */}
      <div className="mb-8 h-px bg-rule" />

      {/* Variant Selector */}
      {product.variants && product.variants.length > 0 && (
        <VariantSelector
          options={product.options ?? []}
          variants={product.variants}
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
      <div className="my-8 h-px bg-rule" />

      {/* Product Details */}
      <ProductDetails product={product} selectedVariant={selectedVariant} />
    </div>
  );
}