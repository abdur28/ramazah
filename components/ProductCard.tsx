"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, useIsInCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboard, useIsInWishlist } from "@/hooks/useDashboard";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CartItem, Product, Color } from "@/types/types";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";
import { useScrollLock } from "@/hooks/useScrollLock";

/** "Food & Pantry > Coffee & Tea" reads as "Coffee & Tea" on one line. */
const leafCategory = (path: string) => path.split(">").pop()?.trim() ?? "";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  
  // Variant selection state
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<Color | undefined>();
  
  useScrollLock(showVariantDialog);

  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { getPriceWithCompare, formatPrice } = useCurrency();
  const addItem = useCart(state => state.addItem);
  const isInCart = useIsInCart(product.id);
  
  // Wishlist functionality
  const toggleWishlist = useDashboard(state => state.toggleWishlist);
  const isLiked = useIsInWishlist(product.id);

  // Check if product has variants
  const hasVariants = product.variants && product.variants.length > 0;
  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasColors = product.colors && product.colors.length > 0;

  // The cart keys on variant_id, and every product has at least one variant —
  // option-less ones get a default. A quick add must therefore resolve a
  // variant; sending the product alone fails with "Missing variant".
  const variants = product.variants ?? [];
  const soleVariant = variants.length === 1 ? variants[0] : undefined;

  // Get prices for display
  const priceData = getPriceWithCompare(product.prices);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      router.push(`/auth/login?redirect=${pathname}`);
      return;
    }

    setIsTogglingWishlist(true);

    try {
      await toggleWishlist(product.id, user.id);
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
    } finally {
      setTimeout(() => setIsTogglingWishlist(false), 300);
    }
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.inStock || isAdding) return;

    if (variants.length > 1) {
      // The card's dialog only speaks Size and Colour. Anything on the generic
      // option model — Weight, Grind, Volume — has to be chosen on the product
      // page, which renders whatever axes the product actually has.
      if (hasSizes || hasColors) {
        setShowVariantDialog(true);
        setSelectedSize(undefined);
        setSelectedColor(undefined);
      } else {
        router.push(`/product/${product.slug}`);
      }
      return;
    }

    addToCartDirect();
  };

  const addToCartDirect = async () => {
    if (!soleVariant) {
      toast.error('This product is unavailable right now.');
      return;
    }

    setIsAdding(true);

    try {
      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

      const cartItem: Omit<CartItem, 'id'> = {
        productId: product.id,
        variantId: soleVariant.id,
        name: product.name,
        slug: product.slug,
        prices: soleVariant.prices?.length ? soleVariant.prices : product.prices || [],
        quantity: 1,
        image: primaryImage?.secureUrl || '/placeholder-product.jpg',
        variantLabel: soleVariant.label,
        size: soleVariant.size,
        color: soleVariant.color,
        sku: soleVariant.sku || product.sku,
        inStock: soleVariant.inStock ?? product.inStock,
        maxQuantity: soleVariant.stockCount || product.totalStock,
      };

      const { error } = await addItem(cartItem, user?.id);
      if (error) {
        toast.error('Could not add that to your cart. Please try again.');
        setIsAdding(false);
        return;
      }

      setTimeout(() => setIsAdding(false), 1000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Could not add that to your cart. Please try again.');
      setIsAdding(false);
    }
  };

  const handleAddWithVariant = async () => {
    // Check if at least one option is selected when required
    if (hasSizes && !selectedSize) return;
    if (hasColors && !selectedColor) return;

    setIsAdding(true);

    try {
      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
      
      // Find matching variant
      const matchingVariant = product.variants?.find(v => 
        (!hasSizes || v.size === selectedSize) &&
        (!hasColors || v.color?.name === selectedColor?.name)
      );

      if (!matchingVariant) {
        toast.error('That combination is not available.');
        setIsAdding(false);
        return;
      }

      // Use variant prices if available, otherwise product prices
      const prices = matchingVariant?.prices || product.prices;

      const cartItem: Omit<CartItem, 'id'> = {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        prices: prices || [],
        quantity: 1,
        image: primaryImage?.secureUrl || '/placeholder-product.jpg',
        sku: matchingVariant?.sku || product.sku,
        inStock: matchingVariant?.inStock ?? product.inStock,
        maxQuantity: matchingVariant?.stockCount || product.totalStock,
      };

      cartItem.variantId = matchingVariant.id;
      cartItem.variantLabel = matchingVariant.label;
      if (selectedSize) {
        cartItem.size = selectedSize;
      }
      if (selectedColor) {
        cartItem.color = selectedColor;
      }

      const { error } = await addItem(cartItem, user?.id);
      if (error) {
        toast.error('Could not add that to your cart. Please try again.');
        setIsAdding(false);
        return;
      }

      // Close dialog and reset
      setShowVariantDialog(false);
      setSelectedSize(undefined);
      setSelectedColor(undefined);
      
      setTimeout(() => setIsAdding(false), 1000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      setIsAdding(false);
    }
  };

  // Check if a size is available
  const isSizeAvailable = (size: string) => {
    if (!hasVariants) return true;
    if (!selectedColor) {
      return product.variants!.some(v => v.size === size && v.inStock);
    }
    return product.variants!.some(
      v => v.size === size && v.color?.name === selectedColor.name && v.inStock
    );
  };

  // Check if a color is available
  const isColorAvailable = (color: Color) => {
    if (!hasVariants) return true;
    if (!selectedSize) {
      return product.variants!.some(v => v.color?.name === color.name && v.inStock);
    }
    return product.variants!.some(
      v => v.color?.name === color.name && v.size === selectedSize && v.inStock
    );
  };

  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
  const hoverImage = product.images[1];

  // Check if add to cart button should be enabled
  const canAddToCart = () => {
    if (!showVariantDialog) return true;
    if (hasSizes && !selectedSize) return false;
    if (hasColors && !selectedColor) return false;
    return true;
  };

  const addToCartButton = (
    <button
      onClick={handleAddToCartClick}
      disabled={isAdding || isInCart}
      className={`flex w-full items-center justify-center gap-2 rounded-sm py-2.5 font-body text-[11px] font-medium uppercase tracking-[0.14em] transition-colors md:text-xs ${
        isInCart
          ? 'cursor-default bg-success text-background'
          : isAdding
          ? 'cursor-wait bg-foreground/50 text-background'
          : 'bg-sage-deep text-background hover:bg-foreground'
      }`}
    >
      {isAdding ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="h-3.5 w-3.5 rounded-full border-2 border-background border-t-transparent"
          />
          Adding
        </>
      ) : isInCart ? (
        <>
          <Check className="h-3.5 w-3.5" />
          In cart
        </>
      ) : (
        <>
          <ShoppingBag className="h-3.5 w-3.5" />
          Add
        </>
      )}
    </button>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative"
      >
        {/* Product Image Container */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-wash mb-3">
          {/* Primary Image */}
          <motion.div 
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: isHovered && hoverImage ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
            {primaryImage ? (
              <Image
                src={primaryImage.secureUrl}
                alt={primaryImage.altText || product.name}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-foreground/10 flex items-center justify-center">
                <span className="text-foreground/40 text-sm">No Image</span>
              </div>
            )}
          </motion.div>

          {/* Hover Image */}
          {hoverImage && (
            <motion.div 
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src={hoverImage.secureUrl}
                alt={hoverImage.altText || `${product.name} alternate view`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
              />
            </motion.div>
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 z-10 flex flex-col items-start gap-1.5">
            {product.isNew && (
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="rounded-sm bg-terra-deep px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.12em] text-background"
              >
                New
              </motion.span>
            )}
            {priceData.discountPercent > 0 && (
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="rounded-sm bg-destructive px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.12em] text-background"
              >
                -{priceData.discountPercent}%
              </motion.span>
            )}
            {product.isLimitedEdition && (
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-sm bg-foreground px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-[0.12em] text-sage-light"
              >
                Limited
              </motion.span>
            )}
          </div>

          {/* Quick Actions - Wishlist Heart */}
          <div className="absolute top-2.5 right-2.5 z-20 opacity-100 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
            <motion.button
              onClick={handleToggleLike}
              disabled={isTogglingWishlist}
              aria-label={isLiked ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
              whileTap={{ scale: 0.9 }}
              className={`rounded-full p-2 shadow-sm transition-colors ${
                isLiked
                  ? 'bg-sage-deep text-background'
                  : 'bg-card/90 text-foreground hover:bg-sage-deep hover:text-background'
              } ${isTogglingWishlist ? 'cursor-wait opacity-50' : ''}`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            </motion.button>
          </div>

          {/* Add to Cart Button */}
          {product.inStock && (
            <div className="absolute inset-x-0 bottom-0 hidden p-2.5 transition-all duration-300 lg:block lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
              {addToCartButton}
            </div>
          )}

          {/* Out of Stock Overlay */}
          {!product.inStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-foreground/55">
              <span className="rounded-sm border border-background/40 px-3 py-1.5 font-body text-[10px] font-medium uppercase tracking-[0.16em] text-background">
                Out of stock
              </span>
            </div>
          )}

          {/* Hover Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 bg-foreground/10"
          />
        </div>

        {/* Product Info */}
        <div>
          <p className="truncate font-body text-[10px] uppercase tracking-[0.14em] text-ink-muted">
            {leafCategory(product.categoryPath)}
          </p>

          <h3 className="mt-1">
            <Link
              href={`/product/${product.slug}`}
              className="line-clamp-2 font-body text-sm text-foreground transition-colors hover:text-sage-deep"
            >
              {product.name}
            </Link>
          </h3>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="font-body text-sm font-medium tabular-nums text-foreground">
              {formatPrice(priceData.price)}
            </span>
            {priceData.compareAtPrice > 0 && (
              <span className="font-body text-xs tabular-nums text-ink-muted line-through">
                {formatPrice(priceData.compareAtPrice)}
              </span>
            )}
          </div>

          {product.inStock && <div className="mt-3 lg:hidden">{addToCartButton}</div>}
        </div>
      </motion.div>

      {/* Variant Selection Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent data-lenis-prevent className="max-w-md rounded-sm overscroll-contain">
          <DialogHeader>
            <DialogTitle className="font-body text-xl">Select Options</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Product Preview */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 bg-foreground/5 rounded-md overflow-hidden flex-shrink-0">
                {primaryImage && (
                  <Image
                    src={primaryImage.secureUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-body font-medium text-sm truncate">{product.name}</h3>
                <p className="font-body text-base font-semibold text-foreground">
                  {formatPrice(priceData.price)}
                </p>
              </div>
            </div>

            {/* Size Selection */}
            {hasSizes && (
              <div>
                <label className="font-body text-sm font-medium text-foreground uppercase tracking-wider mb-3 block">
                  Size {selectedSize && <span className="text-foreground/60">- {selectedSize}</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes?.map((size) => {
                    const available = isSizeAvailable(size);
                    const selected = selectedSize === size;

                    return (
                      <button
                        key={size}
                        onClick={() => available && setSelectedSize(size)}
                        disabled={!available}
                        className={`
                          min-w-[50px] px-4 py-3 font-body text-xs font-medium transition-all
                          ${
                            selected
                              ? 'bg-foreground text-background ring-2 ring-sage-deep'
                              : available
                              ? 'bg-foreground/5 text-foreground hover:bg-foreground/10 border border-foreground/20'
                              : 'bg-foreground/5 text-foreground/30 cursor-not-allowed border border-foreground/10'
                          }
                          ${!available && 'relative overflow-hidden'}
                        `}
                      >
                        {size}
                        {!available && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-full h-px bg-foreground/30 rotate-45" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {hasColors && (
              <div>
                <label className="font-body text-sm font-medium text-foreground uppercase tracking-wider mb-3 block">
                  Color {selectedColor && <span className="text-foreground/60 capitalize">- {selectedColor.name}</span>}
                </label>
                <div className="flex flex-wrap gap-3">
                  {product.colors?.map((color) => {
                    const available = isColorAvailable(color);
                    const selected = selectedColor?.name === color.name;

                    return (
                      <button
                        key={color.name}
                        onClick={() => available && setSelectedColor(color)}
                        disabled={!available}
                        className={`
                          group relative w-10 h-10 rounded-full transition-all
                          ${selected ? 'ring-2 ring-sage-deep ring-offset-2' : 'ring-1 ring-foreground/20'}
                          ${!available && 'opacity-30 cursor-not-allowed'}
                          ${available && !selected && 'hover:ring-2 hover:ring-foreground/40'}
                        `}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {/* Checkmark for selected */}
                        {selected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Check
                              className="w-5 h-5 [stroke-width:3]"
                              stroke={color.hex === '#FFFFFF' || color.hex?.toLowerCase() === '#ffffff' ? '#000000' : '#FFFFFF'}
                            />
                          </motion.div>
                        )}

                        {/* Strike-through for unavailable */}
                        {!available && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-full h-px bg-foreground/60 rotate-45" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowVariantDialog(false)}
              className="flex-1 rounded-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddWithVariant}
              disabled={!canAddToCart() || isAdding}
              className="flex-1 rounded-none bg-sage-deep text-background hover:bg-sage-deep/90 hover:text-background"
            >
              {isAdding ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 mr-2 border-2 border-background border-t-transparent rounded-full"
                  />
                  Adding...
                </>
              ) : (
                'Add to Cart'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const ProductCardSkeleton = () => {
  return (
    <div className="group relative">
      <Skeleton className="relative mb-3 aspect-[4/5] rounded-sm" />
      <Skeleton className="mb-1.5 h-2.5 w-1/2" />
      <Skeleton className="mb-1.5 h-3.5 w-4/5" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
};