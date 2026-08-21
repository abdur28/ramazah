"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types/types";

/**
 * What else is on this shelf.
 *
 * A general importer needs this more than a single-category brand does: someone
 * on the coffee page is one click from the tea, and nothing else on a product
 * page offers them that — the breadcrumb is the only other way back into the
 * category, and breadcrumbs are not merchandising.
 *
 * The heading names the category rather than saying "You may also like", so it
 * is a signpost instead of a guess.
 */
interface RelatedProductsProps {
  productsAsString: string;
  /** The category these came from, when they share one. */
  categoryName?: string;
  categoryHref?: string;
}

export default function RelatedProducts({
  productsAsString,
  categoryName,
  categoryHref,
}: RelatedProductsProps) {
  const products: Product[] = JSON.parse(productsAsString);

  if (products.length === 0) return null;

  return (
    <section className="border-t border-rule bg-wash">
      <div className="mx-auto px-6 py-14 md:px-10 md:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Keep looking
            </p>
            <h2 className="mt-3 font-heading text-3xl font-light leading-tight text-foreground md:text-4xl">
              {categoryName ? `More from ${categoryName}` : "More from the shelf"}
            </h2>
          </div>

          {categoryHref && (
            <Link
              href={categoryHref}
              className="group inline-flex items-center gap-2 font-body text-sm font-medium text-sage-deep transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.07 }}
            >
              <ProductCard product={product} index={index} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
