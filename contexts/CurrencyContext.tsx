"use client";

import { createContext, useContext, ReactNode } from 'react';
import { NAIRA } from '@/constants';
import type { Currency, ProductPrice } from '@/types/types';

/**
 * Money, which is always Naira.
 *
 * This used to offer NGN, USD and EGP through a switcher. Two things were wrong
 * with that, and neither was fixable by adding a rate table.
 *
 * `product_prices` genuinely holds a price per variant per currency, and
 * `create_order` refuses to sell in a currency a variant is not priced in —
 * which is correct. But only 2 of 20 variants had a non-Naira price, so
 * switching to USD showed **₦0 for ninety percent of the catalogue**, because
 * `getPrice` falls back to zero when the selected currency is missing.
 *
 * And everything that is not a product price — shipping, tax, order totals,
 * request budgets and quotes — is a plain Naira number passed through
 * `formatPrice`, which swapped the symbol and did no conversion at all. A
 * ₦24,000 quote rendered as "$24,000".
 *
 * The deciding argument was not either of those. The shop takes payment by
 * transfer to a Naira account, so an order priced in dollars cannot actually be
 * paid — the switcher was offering something the payment model could not honour.
 *
 * The hook keeps its name and its shape so the twenty-odd call sites did not
 * have to churn. `product_prices` keeps its currency column too: the schema can
 * carry a second currency the day the shop can actually take one.
 */
interface CurrencyContextType {
  currency: Currency;
  /** Always 'ngn'. Kept so callers that pass it through still compile. */
  selectedCurrency: 'ngn';
  formatPrice: (amount: number) => string;
  getPrice: (prices: ProductPrice[] | undefined, fallbackAmount?: number) => number;
  getPriceWithCompare: (prices: ProductPrice[] | undefined) => {
    price: number;
    compareAtPrice: number;
    discountPercent: number;
  };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/** Naira has no meaningful minor unit at these prices, so no decimals. */
export const formatNaira = (amount: number): string =>
  `${NAIRA.symbol}${Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const priceOf = (prices: ProductPrice[] | undefined, fallback = 0): number => {
    if (!prices?.length) return fallback;
    // Naira, or the first price there is. A variant priced only in something
    // else should still show a number rather than ₦0 — the admin can see it is
    // wrong, where a zero reads as free.
    const naira = prices.find((price) => price.currency === 'ngn');
    return (naira ?? prices[0])?.price ?? fallback;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency: NAIRA,
        selectedCurrency: 'ngn',
        formatPrice: formatNaira,
        getPrice: priceOf,
        getPriceWithCompare: (prices) => {
          const naira = prices?.find((price) => price.currency === 'ngn') ?? prices?.[0];
          return {
            price: naira?.price ?? 0,
            compareAtPrice: naira?.compareAtPrice ?? 0,
            discountPercent: naira?.discountPercent ?? 0,
          };
        },
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
