"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Product, ProductVariant } from "@/types/types";

interface ProductDetailsProps {
  product: Product;
  /** So SKU, weight and expiry describe the variant on screen, not the product. */
  selectedVariant?: ProductVariant | null;
}

interface AccordionItem {
  title: string;
  content: React.ReactNode;
}

export default function ProductDetails({ product, selectedVariant }: ProductDetailsProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(["Description"]));

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
          <p className="leading-relaxed text-ink-muted">
            {product.description}
          </p>
          {product.materials && product.materials.length > 0 && (
            <div>
              <h4 className="font-medium text-foreground mb-2">Materials:</h4>
              <ul className="list-inside list-disc space-y-1 text-ink-muted">
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
      title: "Details",
      content: (
        <dl className="grid grid-cols-2 gap-4">
          {/* Sorted, because `details` is jsonb and Postgres does not preserve
              insertion order — it returns keys by length, then bytewise, so an
              unsorted render puts "Roast" above "Origin" for no visible reason.
              Alphabetical is arbitrary too, but it is at least predictable, and
              the admin form says so where the rows are entered. */}
          {product.details &&
            Object.entries(product.details)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => (
              <div key={key} className="space-y-1">
                <dt className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </dt>
                <dd className="text-sm text-foreground">{String(value)}</dd>
              </div>
            ))}

          {selectedVariant?.label && (
            <div className="space-y-1">
              <dt className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                Option
              </dt>
              <dd className="text-sm text-foreground">{selectedVariant.label}</dd>
            </div>
          )}

          {selectedVariant?.weight ? (
            <div className="space-y-1">
              <dt className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                Weight
              </dt>
              <dd className="text-sm tabular-nums text-foreground">{selectedVariant.weight} g</dd>
            </div>
          ) : null}

          {/* The database has carried expiry all along; nothing displayed it. */}
          {selectedVariant?.expiryDate && (
            <div className="space-y-1">
              <dt className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                Best before
              </dt>
              <dd className="text-sm text-foreground">
                {new Date(selectedVariant.expiryDate).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </dd>
            </div>
          )}

          <div className="space-y-1">
            <dt className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              SKU
            </dt>
            <dd className="text-sm tabular-nums text-foreground">
              {selectedVariant?.sku || product.sku}
            </dd>
          </div>
        </dl>
      ),
    },
  ];

  // Add care instructions if available
  if (product.careInstructions) {
    accordionItems.push({
      title: "Care",
      content: (
        <div className="space-y-2">
          <p className="whitespace-pre-line leading-relaxed text-ink-muted">
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
          <p className="whitespace-pre-line leading-relaxed text-ink-muted">
            {product.sizeGuide}
          </p>
        </div>
      ),
    });
  }

  // Shipping and returns. Previously eight bullet points of invented policy —
  // "$100", "3-7 business days", "30-day return policy", "unworn and in
  // original packaging" — none of which describes this business. The pages it
  // links to are the single place that policy lives, so it cannot drift.
  accordionItems.push({
    title: "Shipping & returns",
    content: (
      <div className="space-y-4 text-ink-muted">
        <div>
          <h4 className="mb-2 font-medium text-foreground">Shipping</h4>
          <ul className="space-y-1 text-sm">
            <li>Standard delivery takes two to three weeks, anywhere in Nigeria.</li>
            <li>Express is available for an extra cost — ask before ordering.</li>
            <li>Larger orders ship free; the threshold is shown in your cart.</li>
          </ul>
          <Link
            href="/shipping"
            className="mt-2 inline-block text-sm text-sage-deep underline-offset-4 hover:underline"
          >
            Shipping &amp; delivery
          </Link>
        </div>
        <div>
          <h4 className="mb-2 font-medium text-foreground">If something is wrong</h4>
          <ul className="space-y-1 text-sm">
            <li>Damaged, wrong or missing items are put right by us.</li>
            <li>
              {product.isPerishable
                ? "Food and cosmetics cannot be returned once opened, but anything past its expiry date on arrival is replaced or refunded."
                : "Tell us within a few days of delivery, with a photograph."}
            </li>
          </ul>
          <Link
            href="/returns"
            className="mt-2 inline-block text-sm text-sage-deep underline-offset-4 hover:underline"
          >
            Returns
          </Link>
        </div>
      </div>
    ),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="space-y-0 rounded-sm border border-rule"
    >
      {accordionItems.map((item, index) => (
        <div key={item.title} className={index > 0 ? "border-t border-rule" : ""}>
          <button
            onClick={() => toggleItem(item.title)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-wash"
          >
            <span className="font-body text-[11px] font-medium uppercase tracking-[0.16em] text-foreground">
              {item.title}
            </span>
            <motion.div
              animate={{ rotate: openItems.has(item.title) ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="h-4 w-4 text-ink-muted" />
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