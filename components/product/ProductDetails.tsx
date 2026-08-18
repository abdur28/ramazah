"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Product } from "@/types/types";

interface ProductDetailsProps {
  product: Product;
}

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

export default function ProductDetails({ product }: ProductDetailsProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(["description"]));

  const toggleItem = (title: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const accordionItems: AccordionItem[] = [
    {
      title: "Description",
      content: (
        <div className="space-y-3">
          <p className="text-foreground/70 leading-relaxed">
            {product.description}
          </p>
          {product.materials && product.materials.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-2">Materials:</h4>
              <ul className="list-disc list-inside space-y-1 text-foreground/70">
                {product.materials.map((material, index) => (
                  <li key={index}>{material}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Product Details",
      content: (
        <div className="grid grid-cols-2 gap-4">
          {product.details &&
            Object.entries(product.details).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <dt className="text-xs uppercase tracking-wider text-foreground/50">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </dt>
                <dd className="text-sm text-foreground/70">{String(value)}</dd>
              </div>
            ))}
          {product.sku && (
            <div className="space-y-1">
              <dt className="text-xs uppercase tracking-wider text-foreground/50">
                SKU
              </dt>
              <dd className="text-sm text-foreground/70">{product.sku}</dd>
            </div>
          )}
        </div>
      ),
    },
  ];

  // Add care instructions if available
  if (product.careInstructions) {
    accordionItems.push({
      title: "Care Instructions",
      content: (
        <div className="space-y-2">
          <p className="text-foreground/70 leading-relaxed whitespace-pre-line">
            {product.careInstructions}
          </p>
        </div>
      ),
    });
  }

  // Add size guide if available
  if (product.sizeGuide) {
    accordionItems.push({
      title: "Size Guide",
      content: (
        <div className="space-y-2">
          <p className="text-foreground/70 leading-relaxed whitespace-pre-line">
            {product.sizeGuide}
          </p>
        </div>
      ),
    });
  }

  // Add shipping & returns
  accordionItems.push({
    title: "Shipping & Returns",
    content: (
      <div className="space-y-3 text-foreground/70">
        <div>
          <h4 className="font-medium text-foreground mb-2">Shipping</h4>
          <ul className="space-y-1 text-sm">
            <li>• Free standard shipping on orders over $100</li>
            <li>• Express shipping available at checkout</li>
            <li>• Estimated delivery: 3-7 business days</li>
            <li>• International shipping available</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-foreground mb-2">Returns & Exchanges</h4>
          <ul className="space-y-1 text-sm">
            <li>• 30-day return policy</li>
            <li>• Items must be unworn and in original packaging</li>
            <li>• Free returns and exchanges</li>
            <li>• Refunds processed within 5-7 business days</li>
          </ul>
        </div>
      </div>
    ),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="space-y-0 border border-foreground/10"
    >
      {accordionItems.map((item, index) => (
        <div key={item.title} className={index > 0 ? "border-t border-foreground/10" : ""}>
          <button
            onClick={() => toggleItem(item.title)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-foreground/5 transition-colors"
          >
            <span className="font-body text-sm font-medium uppercase tracking-wider">
              {item.title}
            </span>
            <motion.div
              animate={{ rotate: openItems.has(item.title) ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="h-5 w-5 text-foreground/60" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {openItems.has(item.title) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 font-body text-sm">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </motion.div>
  );
}