'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import ProductCard, { ProductCardSkeleton } from '@/components/ProductCard';
import CrossedLink from '@/components/ui/crossed-link';
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
      loadWishlist(user.uid);
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
          <h1 className="font-heading text-4xl md:text-5xl tracking-wider">
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
        <h1 className="font-heading text-4xl md:text-5xl tracking-wider">
          WISHLIST
        </h1>
        <p className="font-body text-sm text-foreground/60 mt-2">
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
          <Heart className="h-16 w-16 text-foreground/20 mb-4" />
          <h2 className="font-heading text-2xl tracking-wider mb-2">
            YOUR WISHLIST IS EMPTY
          </h2>
          <p className="font-body text-sm text-foreground/60 mb-6">
            Start adding items you love to your wishlist
          </p>
          <Link
            href="/clothings"
            className="px-6 py-3 bg-black text-white hover:bg-[#F8E231] hover:text-black transition-colors rounded-md font-body text-sm font-medium"
          >
            Start Shopping
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Wishlist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-2 mb-8">
            {wishlistProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>

          {/* Actions */}
          {inStockCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-black to-gray-800 rounded-lg relative overflow-hidden"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#F8E231] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F8E231] rounded-full translate-y-1/2 -translate-x-1/2" />
              </div>

              <div className="relative z-10">
                <h3 className="font-body font-semibold mb-1 text-white">
                  Looking for more?
                </h3>
                <p className="font-body text-sm text-white/60">
                  {inStockCount} {inStockCount === 1 ? 'item' : 'items'} available in your wishlist
                </p>
              </div>
              <div className="flex gap-3 relative z-10">
                <Link
                  href="/clothings"
                  className="px-6 py-3 bg-[#F8E231] text-black hover:bg-white transition-colors rounded-md font-body text-sm font-medium flex items-center gap-2"
                >
                  Shop Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          )}

          {/* Continue Shopping */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-8"
          >
            <CrossedLink
              lineColor="gold"
              href="/clothings"
              className="inline-flex text-sm items-center"
            >
              Continue Shopping
            </CrossedLink>
          </motion.div>
        </>
      )}
    </div>
  );
}