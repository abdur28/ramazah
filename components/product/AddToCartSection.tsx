"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Heart, Check, Minus, Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, useIsInCart } from "@/hooks/useCart";
import { useDashboard, useIsInWishlist } from "@/hooks/useDashboard";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { Product, ProductVariant, CartItem } from "@/types/types";
import { toast } from "sonner";
import { FREE_SHIPPING_THRESHOLD } from "@/constants";

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
  const { getPrice, formatPrice } = useCurrency();
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

  // Clamp when the variant changes: a quantity chosen against one variant's
  // stock is not valid against another's.
  useEffect(() => {
    setQuantity((current) => Math.min(current, Math.max(1, maxQuantity)));
  }, [selectedVariant?.id, maxQuantity]);

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
      await toggleWishlist(product.id, user.id);
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
        if (selectedVariant.label) cartItem.variantLabel = selectedVariant.label;
        if (selectedVariant.size) cartItem.size = selectedVariant.size;
        if (selectedVariant.color) cartItem.color = selectedVariant.color;
      }

      const { error } = await addItem(cartItem, user?.id);
      if (error) {
        toast.error("Could not add that to your cart. Please try again.");
        setIsAdding(false);
        return;
      }

      setTimeout(() => setIsAdding(false), 1000);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast.error("Could not add that to your cart. Please try again.");
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
        <label className="font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          Quantity
        </label>
        <div className="flex items-center rounded-sm border border-rule">
          <button
            onClick={() => handleQuantityChange(-1)}
            disabled={quantity <= 1}
            className="px-3.5 py-3 text-ink-muted transition-colors hover:bg-wash hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[56px] border-x border-rule px-5 py-3 text-center font-body text-sm tabular-nums">
            {quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={quantity >= maxQuantity}
            className="px-3.5 py-3 text-ink-muted transition-colors hover:bg-wash hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
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
            flex-1 rounded-sm py-4 font-body text-xs font-medium uppercase tracking-[0.16em]
            flex items-center justify-center gap-2.5 transition-colors
            ${
              isInCart
                ? "bg-success text-background cursor-default"
                : isAdding
                ? "bg-foreground/50 text-background cursor-wait"
                : inStock
                ? "bg-sage-deep text-background hover:bg-sage-deep/90 hover:text-background"
                : "bg-wash text-ink-faint cursor-not-allowed"
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
                className="w-5 h-5 border-2 border-background border-t-transparent rounded-full"
              />
              Adding
            </>
          ) : isInCart ? (
            <>
              <Check className="h-5 w-5" />
              In cart
            </>
          ) : !inStock ? (
            "Out of stock"
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              Add to cart
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
            rounded-sm border px-5 py-4 transition-colors
            ${
              isLiked
                ? "border-sage-deep bg-sage-deep text-background"
                : "border-rule bg-transparent text-foreground hover:border-sage-deep hover:text-sage-deep"
            }
            ${isTogglingWishlist ? "opacity-50 cursor-wait" : ""}
          `}
        >
          <Heart
            className={`h-5 w-5 transition-all ${isLiked ? "fill-current" : ""}`}
          />
        </motion.button>
      </div>

      {/* Was "Free shipping on orders over $100 · 30-day returns and exchanges ·
          Authenticity guaranteed" — a currency Ramazah does not trade in and a
          returns policy that does not exist. These are the real terms, and the
          threshold is read from the same constant checkout prices against. */}
      <ul className="space-y-1.5 font-body text-sm text-ink-muted">
        <li>Delivered in 2–3 weeks · express on request</li>
        <li>Free delivery over {formatPrice(FREE_SHIPPING_THRESHOLD)}</li>
        <li>Invoiced after ordering — no card payment</li>
      </ul>
    </motion.div>
  );
}