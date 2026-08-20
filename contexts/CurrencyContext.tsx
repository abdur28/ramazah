"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrencyCode, Currency, ProductPrice } from '@/types/types';
import { availableCurrencies } from '@/constants';

interface CurrencyContextType {
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
  currency: Currency;
  formatPrice: (amount: number) => string;
  getPrice: (prices: ProductPrice[] | undefined, fallbackAmount?: number) => number;
  getPriceWithCompare: (prices: ProductPrice[] | undefined) => {
    price: number;
    compareAtPrice: number;
    discountPercent: number;
  };
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'ramazah-selected-currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Get default currency
  const defaultCurrency = availableCurrencies.find(c => c.isDefault) || availableCurrencies[0];
  
  // Initialize state with default
  const [selectedCurrency, setSelectedCurrencyState] = useState<CurrencyCode>(defaultCurrency.code);

  // Load saved currency from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (saved && availableCurrencies.some(c => c.code === saved)) {
        setSelectedCurrencyState(saved as CurrencyCode);
      }
    } catch (error) {
      console.error('Failed to load saved currency:', error);
    }
  }, []);

  // Save to localStorage when currency changes
  const setSelectedCurrency = (currency: CurrencyCode) => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
      setSelectedCurrencyState(currency);
    } catch (error) {
      console.error('Failed to save currency:', error);
      setSelectedCurrencyState(currency);
    }
  };

  // Get current currency object
  const currency = availableCurrencies.find(c => c.code === selectedCurrency) || defaultCurrency;

  // Format price with currency symbol.
  // Grouped, and without kobo on Naira: `₦100000.00` was both ungrouped and
  // quoting a subunit no one prices in. The locale is pinned rather than left
  // to the host, so the server and the browser render the same string.
  const formatPrice = (amount: number): string => {
    const fractionDigits = currency.code === 'ngn' ? 0 : 2;
    return `${currency.symbol}${amount.toLocaleString('en-NG', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })}`;
  };

  // Get price for selected currency from prices array
  const getPrice = (prices: ProductPrice[] | undefined, fallbackAmount: number = 0): number => {
    if (!prices || prices.length === 0) return fallbackAmount;
    const priceObj = prices.find(p => p.currency === selectedCurrency);
    return priceObj?.price || fallbackAmount;
  };

  // Get price with compare-at-price and discount
  const getPriceWithCompare = (prices: ProductPrice[] | undefined) => {
    const priceObj = prices?.find(p => p.currency === selectedCurrency);
    return {
      price: priceObj?.price || 0,
      compareAtPrice: priceObj?.compareAtPrice || 0,
      discountPercent: priceObj?.discountPercent || 0,
    };
  };

  return (
    <CurrencyContext.Provider
      value={{
        selectedCurrency,
        setSelectedCurrency,
        currency,
        formatPrice,
        getPrice,
        getPriceWithCompare,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

// Custom hook to use currency context
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

// Utility hook for price display
export function usePrice(prices: ProductPrice[] | undefined) {
  const { getPrice, formatPrice, getPriceWithCompare, currency } = useCurrency();
  
  const priceData = getPriceWithCompare(prices);
  
  return {
    price: priceData.price,
    compareAtPrice: priceData.compareAtPrice,
    discountPercent: priceData.discountPercent,
    formattedPrice: formatPrice(priceData.price),
    formattedComparePrice: priceData.compareAtPrice > 0 ? formatPrice(priceData.compareAtPrice) : null,
    hasDiscount: priceData.discountPercent > 0,
    currency,
  };
}