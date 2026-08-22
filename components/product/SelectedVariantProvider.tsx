"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ProductVariant } from "@/types/types";

/**
 * The variant the shopper is currently looking at, shared across the page.
 *
 * The gallery and the variant picker are siblings — the picker lives inside
 * `ProductInfo`, the gallery sits beside it — so the selection had nowhere to
 * travel. That is why `variant_images` went unused since the first migration:
 * the table existed, RLS allowed reading it, and the gallery could not have
 * known which variant to show even if it had been populated. A veil in three
 * colours showed the same photograph whichever colour you picked.
 *
 * A context rather than lifting the state into a wrapper component, because the
 * page is a server component and the two consumers sit in different branches of
 * its layout.
 */
interface SelectedVariantValue {
  selectedVariant: ProductVariant | null;
  setSelectedVariant: (variant: ProductVariant) => void;
}

const SelectedVariantContext = createContext<SelectedVariantValue | null>(null);

export function SelectedVariantProvider({
  initialVariantAsString,
  children,
}: {
  initialVariantAsString: string;
  children: React.ReactNode;
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(() =>
    JSON.parse(initialVariantAsString)
  );

  const value = useMemo(
    () => ({ selectedVariant, setSelectedVariant }),
    [selectedVariant]
  );

  return (
    <SelectedVariantContext.Provider value={value}>{children}</SelectedVariantContext.Provider>
  );
}

/**
 * Returns a null selection outside a provider rather than throwing, so a
 * gallery rendered anywhere else — a quick-look dialog, say — simply shows every
 * photograph instead of crashing.
 */
export function useSelectedVariant(): SelectedVariantValue {
  return (
    useContext(SelectedVariantContext) ?? {
      selectedVariant: null,
      setSelectedVariant: () => {},
    }
  );
}
