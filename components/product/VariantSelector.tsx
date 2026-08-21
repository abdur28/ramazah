"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { ProductOptionDef, ProductVariant } from "@/types/types";

/**
 * Picks a variant by its option axes — whatever they happen to be.
 *
 * This used to render exactly two controls, Size and Colour, which is the shape
 * of the apparel shop this codebase came from. Ramazah sells coffee by Weight
 * and Grind, oil by Size, veils by Colour, and trays by nothing at all, so a
 * product on the generic option model could not be configured here: its axes
 * simply did not render.
 *
 * `mapProduct()` already derives `product.options` from the variants, so the
 * data was there the whole time. Each option becomes a row; values with a hex
 * become swatches and everything else becomes labelled pills.
 *
 * A value is offered when some in-stock variant carries it *alongside the other
 * axes already chosen* — so picking 1kg correctly greys out a grind that only
 * exists in 250g, rather than offering a combination that cannot be bought.
 */
interface VariantSelectorProps {
  options: ProductOptionDef[];
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
}

/** True when a variant carries every axis in the given selection. */
const matches = (variant: ProductVariant, selection: Record<string, string>) =>
  Object.entries(selection).every(([name, value]) => variant.options?.[name] === value);

export default function VariantSelector({
  options,
  variants,
  selectedVariant,
  onVariantChange,
}: VariantSelectorProps) {
  const [selection, setSelection] = useState<Record<string, string>>(
    () => selectedVariant?.options ?? {}
  );

  // Fall back to reading the axes off the variants themselves, so a product
  // whose options were not hydrated still gets a picker.
  const axes = useMemo(() => {
    if (options.length > 0) return options;

    const derived = new Map<string, Map<string, string | undefined>>();
    for (const variant of variants) {
      for (const [name, value] of Object.entries(variant.options ?? {})) {
        if (!derived.has(name)) derived.set(name, new Map());
        derived.get(name)!.set(value, variant.color?.name === value ? variant.color.hex : undefined);
      }
    }
    return [...derived.entries()].map(([name, values]) => ({
      name,
      values: [...values.entries()].map(([value, hex]) => ({ value, hex })),
    }));
  }, [options, variants]);

  // Report the variant the current selection resolves to. Runs only once every
  // axis has an answer, so a half-made choice never silently changes the price.
  useEffect(() => {
    if (axes.length === 0) return;
    if (axes.some((axis) => !selection[axis.name])) return;

    const match = variants.find((variant) => matches(variant, selection));
    if (match && match.id !== selectedVariant?.id) onVariantChange(match);
  }, [selection, axes, variants, selectedVariant, onVariantChange]);

  if (axes.length === 0) return null;

  /** Available when some in-stock variant has this value and the other choices. */
  const isAvailable = (name: string, value: string) => {
    const others = Object.fromEntries(
      Object.entries(selection).filter(([key]) => key !== name)
    );
    return variants.some(
      (variant) =>
        variant.inStock && variant.options?.[name] === value && matches(variant, others)
    );
  };

  const choose = (name: string, value: string) =>
    setSelection((current) => ({ ...current, [name]: value }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="mb-8 space-y-7"
    >
      {axes.map((axis) => {
        const isSwatch = axis.values.some((option) => option.hex);

        return (
          <div key={axis.name}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className="font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                {axis.name}
              </span>
              {selection[axis.name] && (
                <span className="font-body text-sm text-foreground">
                  {selection[axis.name]}
                </span>
              )}
            </div>

            <div className={`flex flex-wrap ${isSwatch ? "gap-3" : "gap-2"}`}>
              {axis.values.map(({ value, hex }) => {
                const available = isAvailable(axis.name, value);
                const selected = selection[axis.name] === value;

                if (isSwatch && hex) {
                  return (
                    <button
                      key={value}
                      onClick={() => available && choose(axis.name, value)}
                      disabled={!available}
                      title={value}
                      aria-label={`${axis.name}: ${value}`}
                      aria-pressed={selected}
                      className={`relative h-10 w-10 rounded-full transition-all ${
                        selected
                          ? "ring-2 ring-sage-deep ring-offset-2 ring-offset-background"
                          : "ring-1 ring-rule"
                      } ${
                        available
                          ? "hover:ring-2 hover:ring-sage"
                          : "cursor-not-allowed opacity-30"
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {selected && (
                        <Check
                          className="absolute inset-0 m-auto h-4 w-4 [stroke-width:3]"
                          style={{ color: isLight(hex) ? "#2A2E24" : "#FAF9F5" }}
                        />
                      )}
                      {!available && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="h-px w-full rotate-45 bg-ink-muted" />
                        </span>
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={value}
                    onClick={() => available && choose(axis.name, value)}
                    disabled={!available}
                    aria-pressed={selected}
                    className={`relative min-w-[52px] rounded-sm border px-4 py-2.5 font-body text-sm transition-colors ${
                      selected
                        ? "border-sage-deep bg-sage-deep text-background"
                        : available
                        ? "border-rule text-foreground hover:border-sage-deep hover:text-sage-deep"
                        : "cursor-not-allowed border-rule/60 text-ink-faint"
                    }`}
                  >
                    {value}
                    {!available && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-px w-[85%] rotate-[-12deg] bg-rule" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Stock, in words as well as colour — the palette rule for anything that
          carries meaning. */}
      {selectedVariant && (
        <div className="flex items-center gap-2 font-body text-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              selectedVariant.inStock ? "bg-success" : "bg-destructive"
            }`}
          />
          <span className={selectedVariant.inStock ? "text-ink-muted" : "text-destructive"}>
            {selectedVariant.inStock
              ? selectedVariant.stockCount > 10
                ? "In stock"
                : `Only ${selectedVariant.stockCount} left`
              : "Out of stock"}
          </span>
          {selectedVariant.expiryDate && selectedVariant.inStock && (
            <span className="text-ink-muted">
              · best before{" "}
              {new Date(selectedVariant.expiryDate).toLocaleDateString("en-NG", {
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** Rough luminance test, so a tick on a pale swatch stays visible. */
function isLight(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
