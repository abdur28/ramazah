"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import CrossedLink from "@/components/ui/crossed-link";
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
      await toggleWishlist(product.id, user.uid);
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

    // If product has variants, show dialog
    if (hasVariants && (hasSizes || hasColors)) {
      setShowVariantDialog(true);
      // Reset selections
      setSelectedSize(undefined);
      setSelectedColor(undefined);
    } else {
      // Add directly if no variants
      addToCartDirect();
    }
  };

  const addToCartDirect = async () => {
    setIsAdding(true);

    try {
      const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
      
      const cartItem: Omit<CartItem, 'id'> = {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        prices: product.prices || [],
        quantity: 1,
        image: primaryImage?.secureUrl || '/placeholder-product.jpg',
        sku: product.sku,
        inStock: product.inStock,
        maxQuantity: product.totalStock,
      };

      await addItem(cartItem, user?.uid);
      
      setTimeout(() => setIsAdding(false), 1000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
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

      // Add variant details if selected
      if (matchingVariant) {
        cartItem.variantId = matchingVariant.id;
      }
      if (selectedSize) {
        cartItem.size = selectedSize;
      }
      if (selectedColor) {
        cartItem.color = selectedColor;
      }

      await addItem(cartItem, user?.uid);
      
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative mb-4 md:mb-8"
      >
        {/* Product Image Container */}
        <div className="relative aspect-[2/3] bg-foreground/5 rounded-xs overflow-hidden mb-4">
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
                className="object-cover"
              />
            </motion.div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {product.isNew && (
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="px-3 py-1 bg-[#F8E231] text-black text-xs font-body font-semibold uppercase tracking-wider"
              >
                New
              </motion.span>
            )}
            {priceData.discountPercent > 0 && (
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="px-3 py-1 bg-red-500 text-white text-xs font-body font-semibold uppercase tracking-wider"
              >
                -{priceData.discountPercent}%
              </motion.span>
            )}
            {product.isLimitedEdition && (
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="px-3 py-1 bg-black text-[#F8E231] text-xs font-body font-semibold uppercase tracking-wider"
              >
                Limited
              </motion.span>
            )}
          </div>

          {/* Quick Actions - Wishlist Heart */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute top-3 right-3 flex flex-col gap-2 z-20"
          >
            <motion.button
              onClick={handleToggleLike}
              disabled={isTogglingWishlist}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-2 rounded-full transition-all shadow-lg ${
                isLiked 
                  ? 'bg-[#F8E231] text-black' 
                  : 'bg-white text-black hover:bg-[#F8E231]'
              } ${isTogglingWishlist ? 'opacity-50 cursor-wait' : ''}`}
            >
              <Heart 
                className={`h-4 w-4 transition-all ${
                  isLiked ? 'fill-current' : ''
                }`} 
              />
            </motion.button>
          </motion.div>

          {/* Add to Cart Button */}
          {product.inStock && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: isHovered ? 0 : 100, opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 right-0 p-4 justify-end flex"
            >
              <button 
                onClick={handleAddToCartClick}
                disabled={isAdding || isInCart}
                className={`w-1/2 py-3 font-body text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  isInCart
                    ? 'bg-green-500 text-white cursor-default'
                    : isAdding
                    ? 'bg-black/50 text-white cursor-wait'
                    : 'bg-black text-white hover:bg-[#F8E231] hover:text-black'
                }`}
              >
                {isAdding ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Adding...
                  </>
                ) : isInCart ? (
                  <>
                    <Check className="h-4 w-4" />
                    In Cart
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Out of Stock Overlay */}
          {!product.inStock && (
            <div className="absolute inset-0 z-10 bg-black/60 rounded-xs flex items-center justify-center">
              <div className="text-center">
                <div className="px-4 py-2 bg-red-500/30 text-white text-sm font-body font-semibold uppercase tracking-wider mb-2">
                  Out of Stock
                </div>
              </div>
            </div>
          )}

          {/* Hover Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/20 pointer-events-none"
          />
        </div>

        {/* Product Info */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {/* Category */}
            <p className="text-[10px] text-foreground/60 font-body uppercase tracking-wider">
              {product.categoryPath}
            </p>

            {/* Product Name */}
            <CrossedLink
              href={`/product/${product.slug}`}
              lineColor="gold"
            >
              <h3 className="font-body text-sm font-medium text-foreground truncate">
                {product.name}
              </h3>
            </CrossedLink>
          </div>

          {/* Price */}
          <div className="flex flex-col items-center">
            {priceData.compareAtPrice > 0 ? (
              <>
                <span className="font-body text-base font-semibold text-foreground">
                  {formatPrice(priceData.price)}
                </span>
                <span className="font-body text-xs text-foreground/40 line-through">
                  {formatPrice(priceData.compareAtPrice)}
                </span>
              </>
            ) : (
              <span className="font-body text-base font-semibold text-foreground">
                {formatPrice(priceData.price)}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Variant Selection Dialog */}
      <Dialog open={showVariantDialog} onOpenChange={setShowVariantDialog}>
        <DialogContent className="max-w-md rounded-sm">
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
                              ? 'bg-black text-white ring-2 ring-[#F8E231]'
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
                          ${selected ? 'ring-2 ring-[#F8E231] ring-offset-2' : 'ring-1 ring-foreground/20'}
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
                              className="w-5 h-5"
                              stroke={color.hex === '#FFFFFF' || color.hex?.toLowerCase() === '#ffffff' ? '#000000' : '#FFFFFF'}
                              strokeWidth={3}
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
              className="flex-1 rounded-none bg-black text-white hover:bg-[#F8E231] hover:text-black"
            >
              {isAdding ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
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
    <div className="group relative mb-4 md:mb-8">
      <Skeleton className="relative aspect-[2/3] rounded-xs mb-4" />
      <Skeleton className="h-3 w-1/2 mb-1" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
};