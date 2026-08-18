"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Heart, Check, Minus, Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, useIsInCart } from "@/hooks/useCart";
import { useDashboard, useIsInWishlist } from "@/hooks/useDashboard";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { Product, ProductVariant, CartItem } from "@/types/types";

interface AddToCartSectionProps {
  product: Product;
  selectedVariant: ProductVariant | null;
}

export default function AddToCartSection({
  product,
  selectedVariant,
}: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { getPrice } = useCurrency();
  const addItem = useCart((state) => state.addItem);
  const isInCart = useIsInCart(product.id, selectedVariant?.id);
  const toggleWishlist = useDashboard((state) => state.toggleWishlist);
  const isLiked = useIsInWishlist(product.id);

  const maxQuantity = selectedVariant?.stockCount || product.totalStock || 999;
  const inStock = selectedVariant?.inStock ?? product.inStock;

  // Get the prices array (variant or product default)
  const pricesSource = selectedVariant?.prices || product.prices;
  
  // Get the current price in selected currency
  const currentPrice = getPrice(pricesSource);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(prev + delta, maxQuantity)));
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=${pathname}`);
      return;
    }

    setIsTogglingWishlist(true);
    try {
      await toggleWishlist(product.id, user.uid);
    } catch (error) {
      console.error("Failed to toggle wishlist:", error);
    } finally {
      setTimeout(() => setIsTogglingWishlist(false), 300);
    }
  };

  const handleAddToCart = async () => {
    if (!inStock || isAdding) return;

    setIsAdding(true);

    try {
      const primaryImage =
        product.images.find((img) => img.isPrimary) || product.images[0];

      const cartItem: Omit<CartItem, "id"> = {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        prices: pricesSource || [], // Store the full prices array
        quantity: quantity,
        image: primaryImage?.secureUrl || "/placeholder-product.jpg",
        sku: selectedVariant?.sku || product.sku,
        inStock: inStock,
        maxQuantity: maxQuantity,
      };

      // Add variant information if available
      if (selectedVariant) {
        if (selectedVariant.id) cartItem.variantId = selectedVariant.id;
        if (selectedVariant.size) cartItem.size = selectedVariant.size;
        if (selectedVariant.color) cartItem.color = selectedVariant.color;
      }

      await addItem(cartItem, user?.uid);

      setTimeout(() => setIsAdding(false), 1000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      setIsAdding(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className="space-y-4"
    >
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <label className="font-body text-sm font-medium text-foreground uppercase tracking-wider">
          Quantity
        </label>
        <div className="flex items-center border border-foreground/20">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="px-4 py-4 hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-6 py-3 font-body text-base border-x border-foreground/20 min-w-[60px] text-center">
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= maxQuantity}
            className="px-4 py-4 hover:bg-foreground/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {/* Add to Cart Button */}
        <motion.button
          onClick={handleAddToCart}
          disabled={!inStock || isAdding || isInCart}
          whileHover={inStock && !isAdding && !isInCart ? { scale: 1.02 } : {}}
          whileTap={inStock && !isAdding && !isInCart ? { scale: 0.98 } : {}}
          className={`
            flex-1 py-4 font-body text-sm font-medium uppercase tracking-wider
            flex items-center justify-center gap-3 transition-all
            ${
              isInCart
                ? "bg-green-500 text-white cursor-default"
                : isAdding
                ? "bg-black/50 text-white cursor-wait"
                : inStock
                ? "bg-black text-white hover:bg-[#F8E231] hover:text-black"
                : "bg-foreground/20 text-foreground/40 cursor-not-allowed"
            }
          `}
        >
          {isAdding ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
              Adding...
            </>
          ) : isInCart ? (
            <>
              <Check className="h-5 w-5" />
              In Cart
            </>
          ) : !inStock ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              Add to Cart
            </>
          )}
        </motion.button>

        {/* Wishlist Button */}
        <motion.button
          onClick={handleToggleWishlist}
          disabled={isTogglingWishlist}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            px-5 py-4 border transition-all
            ${
              isLiked
                ? "bg-[#F8E231] text-black border-[#F8E231]"
                : "bg-transparent text-foreground border-foreground/20 hover:border-[#F8E231]"
            }
            ${isTogglingWishlist ? "opacity-50 cursor-wait" : ""}
          `}
        >
          <Heart
            className={`h-5 w-5 transition-all ${isLiked ? "fill-current" : ""}`}
          />
        </motion.button>
      </div>

      {/* Additional Info */}
      <div className="space-y-2 text-sm text-foreground/60 font-body">
        <p>✓ Free shipping on orders over $100</p>
        <p>✓ 30-day returns and exchanges</p>
        <p>✓ Authenticity guaranteed</p>
      </div>
    </motion.div>
  );
}