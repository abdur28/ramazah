"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";
import CrossedLink from "@/components/ui/crossed-link";
import type { Product } from "@/types/types";
import { getFeaturedProducts } from "@/lib/products";

export default function Trending() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        // You can change this to getBestsellers(8) if you prefer
        const { products: fetchedProducts, error } = await getFeaturedProducts(8);
        
        if (error) {
          setError(error);
          setProducts([]);
        } else {
          setProducts(fetchedProducts);
        }
      } catch (err) {
        console.error("Failed to fetch trending products:", err);
        setError("Failed to load products");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-10 md:py-16 bg-gray-200 z-10 overflow-hidden"
    >
      <div className="mx-auto px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          style={{ opacity }}
          className="text-left mb-8 md:mb-10"
        >
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-heading text-4xl md:text-5xl lg:text-6xl tracking-wider mb-4"
          >
            TRENDING NOW
          </motion.h2>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2 mb-2">
              {[...Array(4)].map((_, index) => (
                <div key={index}><ProductCardSkeleton/></div>
              ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-20">
            <p className="text-foreground/60 font-body text-base mb-4">
              Unable to load trending products.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-foreground text-background hover:bg-foreground/90 transition-colors rounded-md font-body text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-foreground/60 font-body text-base">
              No trending products available at the moment. Check back soon!
            </p>
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2 mb-2">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>

            {/* View All Link */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <CrossedLink
                href="/clothings"
                lineColor="gold"
                lineWidth={2}
                animationDuration={0.3}
              >
                <span className="font-body text-base md:text-base font-medium text-foreground">
                  View All Products
                </span>
              </CrossedLink>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}