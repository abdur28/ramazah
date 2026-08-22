"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ProductImage } from "@/types/types";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useSelectedVariant } from "@/components/product/SelectedVariantProvider";

interface ProductImageGalleryProps {
  imagesAsString: string;
  productName: string;
}

export default function ProductImageGallery({ 
  imagesAsString, 
  productName 
}: ProductImageGalleryProps) {
  const images: ProductImage[] = useMemo(
    () => JSON.parse(imagesAsString),
    [imagesAsString]
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { selectedVariant } = useSelectedVariant();

  /**
   * The photographs for the variant being looked at.
   *
   * `variant_images` has existed since the first migration and nothing read it,
   * so a veil in three colours showed the same picture whichever you picked. A
   * variant with no images of its own shows all of them, which is right for
   * things that look identical however much you buy — a coffee in 250g and 1kg.
   *
   * The fallback matters: if a variant's links point at photographs that have
   * since been deleted, showing the whole set beats showing an empty gallery.
   */
  const sortedImages = useMemo(() => {
    const all = [...images].sort((a, b) => a.order - b.order);
    const ids = selectedVariant?.imageIds ?? [];
    if (ids.length === 0) return all;

    const forVariant = all.filter((image) => ids.includes(image.id));
    return forVariant.length > 0 ? forVariant : all;
  }, [images, selectedVariant]);

  /**
   * Keep the viewer on the same photograph across a variant change when that
   * photograph is still on offer, and fall back to the first when it is not —
   * so switching from Black to Sage moves you to the sage picture rather than
   * silently leaving a stale index pointing at the wrong image.
   */
  const previousIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentId = previousIdRef.current;
    const stillThere = currentId
      ? sortedImages.findIndex((image) => image.id === currentId)
      : -1;

    setSelectedImageIndex(stillThere >= 0 ? stillThere : 0);
  }, [sortedImages]);

  useEffect(() => {
    previousIdRef.current = sortedImages[selectedImageIndex]?.id;
  }, [sortedImages, selectedImageIndex]);

  // Handle keyboard navigation in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      } else if (e.key === "ArrowLeft") {
        handlePrevious();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, selectedImageIndex]);

  // Freezes the native scroll and the smooth-scroll loop together.
  useScrollLock(isFullscreen);

  const handlePrevious = () => {
    setSelectedImageIndex((prev) => 
      prev === 0 ? sortedImages.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    setSelectedImageIndex((prev) => 
      prev === sortedImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className={`w-full lg:max-w-1/2 lg:w-max ${isFullscreen ? "fixed inset-0 z-80" : ""} lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-hidden`}>
      <div className="flex flex-col md:flex-row h-full lg:w-max">
        {/* Main Image */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-wash md:flex-1"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full h-full"
            >
              <Image
                src={sortedImages[selectedImageIndex]?.secureUrl || "/placeholder-product.jpg"}
                alt={sortedImages[selectedImageIndex]?.altText || productName}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              
              {/* Hover overlay hint */}
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 bg-foreground/20 flex items-center justify-center"
              >
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Thumbnails - Right side on desktop, bottom on mobile */}
        <div data-lenis-prevent className="flex md:flex-col lg:flex-wrap gap-0 overflow-x-auto md:overflow-y-auto md:w-[6.1rem] lg:w-max md:h-full scrollbar-hide">
          {sortedImages.map((image, index) => (
            <motion.button
              key={image.id}
              onClick={() => setSelectedImageIndex(index)}
              whileHover={{ opacity: 0.8 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex-shrink-0 w-20 h-28 md:w-[6.1rem] md:h-[8.1rem] overflow-hidden transition-all ${
                selectedImageIndex === index 
                  ? "border-1 border-sage" 
                  : ""
              }`}
            >
              <Image
                src={image.secureUrl}
                alt={image.altText || `${productName} view ${index + 1}`}
                fill
                className="object-cover"
                sizes="96px"
              />
              
              {/* Overlay for non-selected images */}
              {selectedImageIndex !== index && (
                <div className="absolute inset-0 bg-foreground/20" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Fullscreen Gallery Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed w-screen h-screen inset-0 z-80 bg-foreground"
          >
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onClick={() => setIsFullscreen(false)}
              className="absolute top-6 right-6 z-50 p-3 bg-card/10 hover:bg-card/20 rounded-full transition-colors backdrop-blur-sm"
            >
              <X className="h-6 w-6 text-background" />
            </motion.button>

            {/* Image Counter */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-6 z-50 px-4 py-2 bg-card/10 backdrop-blur-sm rounded-full"
            >
              <span className="text-background text-sm font-body">
                {selectedImageIndex + 1} / {sortedImages.length}
              </span>
            </motion.div>

            {/* Previous Button */}
            {sortedImages.length > 1 && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={handlePrevious}
                className="absolute left-6 top-1/2 -translate-y-1/2 z-50 p-4 bg-card/10 hover:bg-card/20 rounded-full transition-colors backdrop-blur-sm"
              >
                <ChevronLeft className="h-8 w-8 text-background" />
              </motion.button>
            )}

            {/* Next Button */}
            {sortedImages.length > 1 && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleNext}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-50 p-4 bg-card/10 hover:bg-card/20 rounded-full transition-colors backdrop-blur-sm"
              >
                <ChevronRight className="h-8 w-8 text-background" />
              </motion.button>
            )}

            {/* Fullscreen Image */}
            <div className="w-full h-full flex items-center justify-center p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImageIndex}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="relative w-full h-full max-w-7xl max-h-full"
                >
                  <Image
                    src={sortedImages[selectedImageIndex]?.secureUrl || "/placeholder-product.jpg"}
                    alt={sortedImages[selectedImageIndex]?.altText || productName}
                    fill
                    className="object-contain"
                    sizes="100vw"
                    quality={100}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Swipe hint for mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-card/10 backdrop-blur-sm rounded-full md:hidden"
            >
              <span className="text-background text-xs font-body">
                Swipe to navigate
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}