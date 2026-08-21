import Link from 'next/link';
import BrandMark from '@/components/brand/BrandMark';
import { useState, useEffect } from 'react';
import { Search, User, ShoppingBag, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileMenu from '@/components/navbar/MobileMenu';
import SearchDialog from '@/components/navbar/SearchDialog';
import DesktopNavigation from '@/components/navbar/DesktopNavigation';
import CartSheet from '@/components/cart/CartSheet';
import { useCartCount } from '@/hooks/useCart';

/**
 * Home page navbar. Same contents as the site navbar — the difference is only
 * its ground: transparent over the hero, becoming the solid bar with a
 * hairline once the hero has scrolled past.
 *
 * The hero is a dark photograph, so everything renders cream until then.
 *
 * Navigation and the menu button are present the whole way down. They used to
 * appear only once the hero had scrolled past, which left the landing screen
 * with no way into the shop but the logo.
 */
/** Matches the bar's own height: h-16 on a phone, h-20 from `md`. */
const NAVBAR_HEIGHT = 72;

export default function HomeNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Get cart count from the cart store
  const cartCount = useCartCount();

  // Watch the marker at the hero's end, not the hero.
  //
  // The hero is `sticky`, so it stays pinned to the top of the viewport for the
  // whole page — it never stops intersecting, and the bar stayed transparent
  // until the very bottom. The marker sits in normal flow where the hero's box
  // ends, so it crosses under the bar exactly when the hero appears to.
  //
  // Testing `boundingClientRect.top` rather than `isIntersecting`, because a
  // marker below the fold is also "not intersecting" — which would flip the bar
  // solid before the reader has scrolled at all.
  useEffect(() => {
    const marker = document.getElementById('home-hero-end');

    if (!marker) {
      setIsScrolled(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(entry.boundingClientRect.top <= NAVBAR_HEIGHT),
      { rootMargin: `-${NAVBAR_HEIGHT}px 0px 0px 0px`, threshold: [0, 1] }
    );

    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 print:hidden">
        {/* Transparent over the hero; the solid bar fades in past it. */}
        <div
          aria-hidden
          className={`absolute inset-0 bg-card border-b border-rule transition-opacity duration-300 ${
            isScrolled ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div className={`relative mx-auto px-4 sm:px-6 lg:px-8 ${
          isScrolled ? 'text-foreground' : 'text-background'
        }`}>
          <div className="flex items-center justify-between h-16 md:h-20 gap-4">
            <BrandMark variant={isScrolled ? 'default' : 'inverse'} />

            {/* Desktop Navigation with Dropdowns */}
            <div className="hidden lg:block">
              <DesktopNavigation variant={isScrolled ? 'default' : 'inverse'} />
            </div>

            {/* Right: Icons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`p-2 rounded-md transition-colors ${isScrolled ? 'hover:bg-foreground/5' : 'hover:bg-background/15'}`}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <Link
                href="/dashboard"
                className={`p-2 rounded-md transition-colors ${isScrolled ? 'hover:bg-foreground/5' : 'hover:bg-background/15'}`}
                aria-label="dashboard"
              >
                <User className="h-5 w-5" />
              </Link>
              <button
                onClick={() => setIsCartOpen(true)}
                className={`p-2 rounded-md transition-colors relative ${isScrolled ? 'hover:bg-foreground/5' : 'hover:bg-background/15'}`}
                aria-label="Shopping cart"
              >
                <ShoppingBag className="h-5 w-5" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className={`absolute -top-1 -right-1 text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold ${isScrolled ? 'bg-foreground text-background' : 'bg-background text-foreground'}`}
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`lg:hidden p-2 rounded-md transition-colors ${isScrolled ? 'hover:bg-foreground/5' : 'hover:bg-background/15'}`}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
