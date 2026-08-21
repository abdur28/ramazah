'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useCart } from '@/hooks/useCart';

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { wishlistProducts, isLoadingWishlist, loadWishlist } = useDashboard();
  const { addItem } = useCart();
  
  const inStockCount = wishlistProducts.filter(item => item.inStock).length;

  // Reload wishlist when component mounts
  useEffect(() => {
    if (user) {
      loadWishlist(user.id);
    }
  }, [user, loadWishlist]);


  // Show loading state
  if (authLoading || isLoadingWishlist) {
    return (
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="font-heading text-4xl font-light md:text-5xl">
            WISHLIST
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2">
          {[...Array(4)].map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="font-heading text-4xl font-light md:text-5xl">
          WISHLIST
        </h1>
        <p className="font-body text-sm text-ink-muted mt-2">
          {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'} in your wishlist
        </p>
      </motion.div>

      {/* Empty State */}
      {wishlistProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wash">
            <Heart className="h-6 w-6 text-sage" />
          </div>
          <h2 className="mt-5 font-body text-base text-foreground">Nothing saved yet</h2>
          <p className="mt-1 max-w-[38ch] font-body text-sm text-ink-muted">
            Tap the heart on anything you want to come back to — it waits here, and we
            email you if it goes out of stock and returns.
          </p>
          <Link
            href="/"
            className="mt-6 rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
          >
            Start shopping
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Wishlist Grid */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:gap-5 lg:grid-cols-4">
            {wishlistProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Actions */}
          {inStockCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-start justify-between gap-4 rounded-sm border border-rule bg-wash p-6 sm:flex-row sm:items-center"
            >
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">
                  {inStockCount} of these {inStockCount === 1 ? 'is' : 'are'} in stock
                </h3>
                <p className="mt-1 font-body text-sm text-ink-muted">
                  Stock moves in batches, so saved items do not stay available forever.
                </p>
              </div>
              <Link
                href="/"
                className="group inline-flex shrink-0 items-center gap-2 rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
              >
                Keep shopping
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          )}

          {/* Continue Shopping */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-8"
          >
            <Link
              href="/"
              className="inline-flex items-center font-body text-sm text-sage-deep transition-colors hover:text-foreground"
            >
              Continue shopping
            </Link>
          </motion.div>
        </>
      )}
    </div>
  );
}