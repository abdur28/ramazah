"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";
import { getProducts } from "@/lib/products";
import type { Product } from "@/types/types";

/**
 * The most recent eight products.
 *
 * Not `getNewArrivals()`, which filters on the `is_new` flag — with a young
 * catalog that returns one product and an empty-looking row. Newest-first
 * always fills. Swap to `getBestsellers()` once there is enough order history
 * for it to mean anything.
 *
 * The old version faded its cards back out as you scrolled past, so a product
 * could be invisible while still on screen. This one reveals once and stays.
 *
 * The section rides up over the pinned category grid above it, which is why it
 * carries the rounded top edge and its own z-index.
 */
export default function ProductRail() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { products: latest } = await getProducts(
        {},
        { limit: 8, orderBy: "created_at", orderDirection: "desc" }
      );
      if (cancelled) return;
      setProducts(latest);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLoading && products.length === 0) return null;

  return (
    /* Rides up over the pinned category grid. It needs `relative` and a z-index
       of its own: a sticky element is positioned, so it would otherwise paint
       above this one whatever the DOM order says. The soft shadow along the top
       edge is what sells the lift. */
    <section className="relative z-10 rounded-t-[2rem] bg-wash shadow-[0_-24px_60px_-32px_rgba(42,46,36,0.45)]">
      <div className="mx-auto px-6 py-10 md:px-10 ">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Just landed
            </p>
            <h2 className="mt-3 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
              New this week
            </h2>
          </div>

          <Link
            href="/categories/food-pantry"
            className="group hidden items-center gap-2 font-body text-sm font-medium text-sage-deep transition-colors hover:text-foreground sm:inline-flex"
          >
            See everything
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Two up on a phone, four across from `lg` — never a sideways rail.
            It arrives while the reader is mid vertical scroll over the pinned
            grid above, and a horizontal scroller that size captures diagonal
            swipes, so the reveal stutters exactly where it should feel smooth.
            It would also hide most of them behind a gesture most people never
            make, and the category pages are 2-up on mobile,
            so a rail here would teach a gesture the rest of the site does not
            use. */}
        <div className="grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div key={index}>
                  <ProductCardSkeleton />
                </div>
              ))
            : products.map((product, index) => (
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
