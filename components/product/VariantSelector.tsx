"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { ProductVariant, Color } from "@/types/types";

interface VariantSelectorProps {
  variants: ProductVariant[];
  colors: Color[];
  sizes: string[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
}

export default function VariantSelector({
  variants,
  colors,
  sizes,
  selectedVariant,
  onVariantChange,
}: VariantSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    selectedVariant?.size
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    selectedVariant?.color?.name
  );

  // Update selected variant when size or color changes
  useEffect(() => {
    const matchingVariant = variants.find(
      (v) =>
        (!selectedSize || v.size === selectedSize) &&
        (!selectedColor || v.color?.name === selectedColor)
    );

    if (matchingVariant && matchingVariant.id !== selectedVariant?.id) {
      onVariantChange(matchingVariant);
    }
  }, [selectedSize, selectedColor, variants]); // Removed onVariantChange and selectedVariant from dependencies

  // Get available options based on current selection
  const getAvailableSizes = () => {
    if (!selectedColor) return sizes;
    return sizes.filter((size) =>
      variants.some(
        (v) => v.size === size && v.color?.name === selectedColor && v.inStock
      )
    );
  };

  const getAvailableColors = () => {
    if (!selectedSize) return colors;
    return colors.filter((color) =>
      variants.some(
        (v) => v.color?.name === color.name && v.size === selectedSize && v.inStock
      )
    );
  };

  const isSizeAvailable = (size: string) => {
    if (!selectedColor) {
      return variants.some((v) => v.size === size && v.inStock);
    }
    return variants.some(
      (v) => v.size === size && v.color?.name === selectedColor && v.inStock
    );
  };

  const isColorAvailable = (color: Color) => {
    if (!selectedSize) {
      return variants.some((v) => v.color?.name === color.name && v.inStock);
    }
    return variants.some(
      (v) => v.color?.name === color.name && v.size === selectedSize && v.inStock
    );
  };

  const availableSizes = getAvailableSizes();
  const availableColors = getAvailableColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="space-y-6 mb-8"
    >
      {/* Size Selection */}
      {sizes && sizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="font-body text-sm font-medium text-foreground uppercase tracking-wider">
              Size
            </label>
            {selectedSize && (
              <span className="font-body text-sm text-foreground/60">
                Selected: {selectedSize}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const available = isSizeAvailable(size);
              const selected = selectedSize === size;

              return (
                <motion.button
                  key={size}
                  onClick={() => available && setSelectedSize(size)}
                  disabled={!available}
                  whileHover={available ? { scale: 1.05 } : {}}
                  whileTap={available ? { scale: 0.95 } : {}}
                  className={`
                    min-w-[50px] px-4 py-3 font-body text-xs font-medium transition-all
                    ${
                      selected
                        ? "bg-black text-white ring-2 ring-[#F8E231]"
                        : available
                        ? "bg-foreground/5 text-foreground hover:bg-foreground/10 border border-foreground/20"
                        : "bg-foreground/5 text-foreground/30 cursor-not-allowed border border-foreground/10"
                    }
                    ${!available && "relative overflow-hidden"}
                  `}
                >
                  {size}
                  {!available && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-full h-px bg-foreground/30 rotate-45" />
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Selection */}
      {colors && colors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="font-body text-sm font-medium text-foreground uppercase tracking-wider">
              Color
            </label>
            {selectedColor && (
              <span className="font-body text-sm text-foreground/60 capitalize">
                {selectedColor}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            {colors.map((color) => {
              const available = isColorAvailable(color);
              const selected = selectedColor === color.name;

              return (
                <motion.button
                  key={color.name}
                  onClick={() => available && setSelectedColor(color.name)}
                  disabled={!available}
                  whileHover={available ? { scale: 1.1 } : {}}
                  whileTap={available ? { scale: 0.9 } : {}}
                  className={`
                    group relative w-10 h-10 rounded-full transition-all
                    ${selected ? "ring-2 ring-[#F8E231] ring-offset-2 ring-offset-background" : "ring-1 ring-foreground/20"}
                    ${!available && "opacity-30 cursor-not-allowed"}
                    ${available && !selected && "hover:ring-2 hover:ring-foreground/40"}
                  `}
                  style={{
                    backgroundColor: color.hex,
                  }}
                  title={color.name}
                >
                  {/* Checkmark for selected color */}
                  {selected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke={color.hex === "#FFFFFF" || color.hex.toLowerCase() === "#ffffff" ? "#000000" : "#FFFFFF"}
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </motion.div>
                  )}
                  
                  {/* Strike-through for unavailable colors */}
                  {!available && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-full h-px bg-foreground/60 rotate-45" />
                    </span>
                  )}

                  {/* Tooltip on hover */}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {color.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Status */}
      {selectedVariant && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              selectedVariant.inStock ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="font-body text-foreground/70">
            {selectedVariant.inStock
              ? selectedVariant.stockCount > 10
                ? "In stock"
                : `Only ${selectedVariant.stockCount} left in stock`
              : "Out of stock"}
          </span>
          
        </motion.div>
      )}
    </motion.div>
  );
}