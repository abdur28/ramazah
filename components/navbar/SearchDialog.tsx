'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CornerDownLeft, Search, SearchX, TrendingUp, X } from 'lucide-react';
import { trendingSearches } from '@/constants/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getProducts } from '@/lib/products';
import type { Product } from '@/types/types';
import { useScrollLock } from '@/hooks/useScrollLock';

/**
 * Site search. A top-anchored dialog on desktop, full screen on mobile.
 *
 * It searches as you type — `search_product_ids()` ranks the tsvector, so the
 * work happens in Postgres — rather than collecting a string and handing it to
 * a results page. There is no results page: the previous version submitted to
 * `/search?q=`, a route that has never existed, so every search 404'd.
 */

const RESULT_LIMIT = 6;
const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

// Recent searches used to be three hardcoded strings pretending to be the
// visitor's own history. They now come from this device, or the section hides.
const RECENT_KEY = 'ramazah:recent-searches';
const RECENT_LIMIT = 4;

function readRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function rememberSearch(query: string) {
  try {
    const next = [query, ...readRecent().filter((s) => s !== query)].slice(0, RECENT_LIMIT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota — recents are a convenience, not a feature.
  }
}

/** "Food & Pantry > Coffee & Tea" reads as "Coffee & Tea" on one line. */
const leafCategory = (path: string) => path.split('>').pop()?.trim() ?? '';

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
  const { popular: popularCategories } = useNavigation();
  const router = useRouter();
  const { getPriceWithCompare, formatPrice } = useCurrency();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const isIdle = trimmed.length < MIN_QUERY;
  const showEmpty = !isIdle && !isSearching && results.length === 0;

  // Holds the page still — both the native scroll and the Lenis loop.
  useScrollLock(isOpen);

  // Open: reset to a clean dialog and take focus.
  useEffect(() => {
    if (!isOpen) return;

    setQuery('');
    setResults([]);
    setHighlight(0);
    setRecentSearches(readRecent());

    const focus = setTimeout(() => inputRef.current?.focus(), 120);

    return () => {
      clearTimeout(focus);
    };
  }, [isOpen]);

  // Debounced query. `cancelled` guards against a slow early request landing
  // after a faster later one and overwriting it.
  useEffect(() => {
    if (isIdle) {
      setResults([]);
      setHasMore(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    let cancelled = false;

    const timer = setTimeout(async () => {
      // One over the limit, purely to know whether "more" exists.
      const { products } = await getProducts({ search: trimmed }, { limit: RESULT_LIMIT + 1 });
      if (cancelled) return;

      setResults(products.slice(0, RESULT_LIMIT));
      setHasMore(products.length > RESULT_LIMIT);
      setHighlight(0);
      setIsSearching(false);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, isIdle]);

  const openProduct = useCallback(
    (product: Product) => {
      rememberSearch(trimmed || product.name);
      onClose();
      router.push(`/product/${product.slug}`);
    },
    [onClose, router, trimmed]
  );

  /**
   * Everything the dialog cannot show.
   *
   * It used to stop at six matches and say "refine to narrow", which is a dead
   * end — there was no results page to go to. There is one now, and it carries
   * the same filters, sorting and paging a category shelf has.
   */
  const seeAllResults = useCallback(() => {
    if (!trimmed) return;
    rememberSearch(trimmed);
    onClose();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [onClose, router, trimmed]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (!results.length) {
      // Nothing to arrow through, but Enter should still be able to search.
      if (e.key === 'Enter' && trimmed) {
        e.preventDefault();
        seeAllResults();
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = (highlight + step + results.length) % results.length;
      setHighlight(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // Cmd/Ctrl+Enter, or Enter with nothing picked out, means "show me all of
      // them" rather than "open the first one".
      if (e.metaKey || e.ctrlKey) seeAllResults();
      else openProduct(results[highlight]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:p-6 sm:pt-[10vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            initial={{ opacity: 0, y: -12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative flex h-full w-full flex-col overflow-hidden bg-card shadow-2xl sm:h-auto sm:max-h-[70vh] sm:max-w-2xl sm:rounded-md sm:border sm:border-rule"
          >
            {/* Query row — the only heading the dialog needs. */}
            <div className="flex items-center gap-3 border-b border-rule px-4 sm:px-5">
              <Search className="h-5 w-5 shrink-0 text-ink-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search coffee, veils, spices…"
                aria-label="Search products"
                className="w-full bg-transparent py-5 font-body text-base outline-none placeholder:text-ink-muted sm:text-lg"
              />
              <button
                onClick={onClose}
                className="-mr-2 shrink-0 rounded-md p-2 text-ink-muted transition-colors hover:bg-wash hover:text-foreground"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain">
              {/* Searching */}
              {isSearching && (
                <div className="px-4 py-3 sm:px-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center gap-4 py-3">
                      <div className="h-14 w-14 shrink-0 rounded-sm bg-wash" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 rounded-sm bg-wash" />
                        <div className="h-3 w-1/4 rounded-sm bg-wash" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {!isSearching && results.length > 0 && (
                <div ref={listRef} className="py-2">
                  {results.map((product, index) => {
                    const image =
                      product.images.find((img) => img.isPrimary) ?? product.images[0];
                    const { price, compareAtPrice } = getPriceWithCompare(product.prices);

                    return (
                      <button
                        key={product.id}
                        onClick={() => openProduct(product)}
                        onMouseMove={() => setHighlight(index)}
                        className={`flex w-full items-center gap-4 px-4 py-3 text-left transition-colors sm:px-5 ${
                          index === highlight ? 'bg-wash' : ''
                        }`}
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-wash">
                          {image && (
                            <Image
                              src={image.secureUrl}
                              alt={image.altText || product.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-body text-sm text-foreground">
                            {product.name}
                          </p>
                          <p className="truncate font-body text-xs text-ink-muted">
                            {leafCategory(product.categoryPath)}
                            {!product.inStock && ' · Out of stock'}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-body text-sm font-medium tabular-nums text-foreground">
                            {formatPrice(price)}
                          </p>
                          {compareAtPrice > price && (
                            <p className="font-body text-xs tabular-nums text-ink-muted line-through">
                              {formatPrice(compareAtPrice)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Nothing matched */}
              {showEmpty && (
                <div className="px-5 py-10 text-center">
                  <SearchX className="mx-auto h-6 w-6 text-ink-faint" />
                  <p className="mt-3 font-body text-sm text-foreground">
                    No matches for &ldquo;{trimmed}&rdquo;
                  </p>
                  <p className="mt-1 font-body text-xs text-ink-muted">
                    Try a broader word, or browse a category below.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {popularCategories.slice(0, 4).map((category) => (
                      <Link
                        key={category.href}
                        href={category.href}
                        onClick={onClose}
                        className="rounded-full border border-rule px-4 py-2 font-body text-sm transition-colors hover:border-sage-deep hover:bg-sage-deep hover:text-background"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Nothing typed yet */}
              {isIdle && (
                <div className="px-4 py-5 sm:px-5">
                  {recentSearches.length > 0 && (
                    <section className="mb-7">
                      <h3 className="mb-3 flex items-center gap-2 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                        <Clock className="h-3.5 w-3.5" />
                        Recent
                      </h3>
                      {recentSearches.map((search) => (
                        <button
                          key={search}
                          onClick={() => setQuery(search)}
                          className="-mx-2 block w-[calc(100%+1rem)] rounded-md px-2 py-2 text-left font-body text-sm text-ink-muted transition-colors hover:bg-wash hover:text-foreground"
                        >
                          {search}
                        </button>
                      ))}
                    </section>
                  )}

                  <section className="mb-7">
                    <h3 className="mb-3 flex items-center gap-2 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Trending
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {trendingSearches.map((search) => (
                        <button
                          key={search}
                          onClick={() => setQuery(search)}
                          className="rounded-full border border-rule px-4 py-2 font-body text-sm transition-colors hover:border-sage-deep hover:bg-sage-deep hover:text-background"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-3 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                      Browse
                    </h3>
                    <div className="grid gap-x-6 sm:grid-cols-2">
                      {popularCategories.map((category) => (
                        <Link
                          key={category.href}
                          href={category.href}
                          onClick={onClose}
                          className="border-b border-rule/60 py-3 font-body text-sm text-foreground transition-colors last:border-b-0 hover:text-sage-deep"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Keyboard hints — pointer devices only, where they are actionable. */}
            <div className="hidden items-center justify-between border-t border-rule bg-wash px-5 py-2.5 font-body text-[11px] text-ink-muted sm:flex">
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-sm border border-rule bg-card px-1.5 py-0.5">↑</kbd>
                  <kbd className="rounded-sm border border-rule bg-card px-1.5 py-0.5">↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-sm border border-rule bg-card px-1.5 py-0.5">
                    <CornerDownLeft className="h-3 w-3" />
                  </kbd>
                  open
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded-sm border border-rule bg-card px-1.5 py-0.5">esc</kbd>
                  close
                </span>
              </span>
              {hasMore && <span>Showing the first {RESULT_LIMIT} matches — refine to narrow</span>}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
