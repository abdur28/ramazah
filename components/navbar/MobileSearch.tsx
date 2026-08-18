import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, TrendingUp, Clock } from 'lucide-react';
import CrossedLink from '@/components/ui/crossed-link';

const trendingSearches = [
  'Hoodies',
  'T-Shirts',
  'Bucket Hats',
  'Ski Masks',
  'Candles',
  'Artwork',
];

const recentSearches = [
  'Black Hoodie',
  'White T-Shirt',
  'Bespoke Suits',
];

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileSearch({ isOpen, onClose }: MobileSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSearchClick = (query: string) => {
    setSearchQuery(query);
    window.location.href = `/search?q=${encodeURIComponent(query)}`;
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Search Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-3 right-3 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] md:right-4 md:inset-y-4 md:max-w-md bg-background z-50 overflow-hidden rounded-sm shadow-2xl flex flex-col"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                <h2 className="font-heading text-lg tracking-wider">SEARCH</h2>
                
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 hover:bg-foreground/5 rounded-md transition-colors"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Input */}
              <div className="px-6 py-6 border-b border-foreground/10">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search for products..."
                    className="w-full px-4 py-3 pr-12 border border-foreground/20 rounded-md focus:outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10 transition-all font-body text-base"
                  />
                  <button
                    onClick={handleSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-foreground/5 rounded-md transition-colors"
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-4 w-4 text-foreground/60" />
                      <h3 className="font-heading text-xs tracking-widest text-foreground/60">
                        RECENT SEARCHES
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearchClick(search)}
                          className="w-full text-left px-4 py-3 hover:bg-foreground/5 rounded-md transition-colors group"
                        >
                          <span className="font-body text-base text-foreground/80 group-hover:text-foreground">
                            {search}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending Searches */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-foreground/60" />
                    <h3 className="font-heading text-xs tracking-widest text-foreground/60">
                      TRENDING SEARCHES
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchClick(search)}
                        className="px-4 py-2 border border-foreground/20 rounded-full hover:bg-[#F8E231] hover:text-black transition-all font-body text-sm"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Categories */}
                <div className="mt-8">
                  <h3 className="font-heading text-xs tracking-widest text-foreground/60 mb-4">
                    POPULAR CATEGORIES
                  </h3>
                  <div className="space-y-2">
                    <CrossedLink
                      href="/categories/clothings/hood-wears"
                      lineColor="gold"
                      lineWidth={1}
                      animationDuration={0.2}
                      className="block px-4 py-3 rounded-md"
                    >
                      <span className="font-body text-base">Hood Wears</span>
                    </CrossedLink>
                    <CrossedLink
                      href="/categories/clothings/bespoke"
                      lineColor="gold"
                      lineWidth={1}
                      animationDuration={0.2}
                      className="block px-4 py-3 rounded-md"
                    >
                      <span className="font-body text-base">Bespoke/Tailoring</span>
                    </CrossedLink>
                    <CrossedLink
                      href="/categories/accessories"
                      lineColor="gold"
                      lineWidth={1}
                      animationDuration={0.2}
                      className="block px-4 py-3 rounded-md"
                    >
                      <span className="font-body text-base">Accessories</span>
                    </CrossedLink>
                    <CrossedLink
                      href="/categories/candles-and-matches"
                      lineColor="gold"
                      lineWidth={1}
                      animationDuration={0.2}
                      className="block px-4 py-3 rounded-md"
                    >
                      <span className="font-body text-base">Candles & Matches</span>
                    </CrossedLink>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}