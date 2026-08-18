// components/CurrencySwitcher.tsx
"use client";

import React from 'react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/contexts/CurrencyContext';
import { availableCurrencies } from '@/constants';
import { cn } from '@/lib/utils';

interface CurrencySwitcherProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export default function CurrencySwitcher({ 
  variant = 'ghost', 
  size = 'default',
  showLabel = true 
}: CurrencySwitcherProps) {
  const { selectedCurrency, setSelectedCurrency, currency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Globe className="h-4 w-4" />
          {showLabel && (
            <span className="font-medium">
              {currency.symbol} {currency.code.toUpperCase()}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Select Currency</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableCurrencies.map((curr) => (
          <DropdownMenuItem
            key={curr.code}
            onClick={() => setSelectedCurrency(curr.code)}
            className={cn(
              "cursor-pointer",
              selectedCurrency === curr.code && "bg-accent"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-lg">{curr.symbol}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{curr.name}</span>
                  <span className="text-xs text-muted-foreground">{curr.code.toUpperCase()}</span>
                </div>
              </div>
              {selectedCurrency === curr.code && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for mobile/minimal UI
export function CurrencySwitcherCompact() {
  const { selectedCurrency, setSelectedCurrency, currency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <span className="text-sm font-medium">
            {currency.symbol}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {availableCurrencies.map((curr) => (
          <DropdownMenuItem
            key={curr.code}
            onClick={() => setSelectedCurrency(curr.code)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span>{curr.symbol} {curr.name}</span>
              {selectedCurrency === curr.code && (
                <Check className="h-4 w-4" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}