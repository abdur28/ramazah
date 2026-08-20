import Link from 'next/link';
import BrandMark from '@/components/brand/BrandMark';
import { useState, useEffect } from 'react';
import { Search, User, ShoppingBag, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MobileMenu from '@/components/navbar/MobileMenu';
import MobileSearch from '@/components/navbar/MobileSearch';
import DesktopNavigation from '@/components/navbar/DesktopNavigation';
import CartSheet from '@/components/cart/CartSheet';
import { useCartCount } from '@/hooks/useCart';

export default function HomeNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Get cart count from the cart store
  const cartCount = useCartCount();

  useEffect(() => {
    const checkScrollPosition = () => {
      const heroHeight = window.innerHeight * 0.9;
      setIsScrolled(window.scrollY > heroHeight);
    };

    checkScrollPosition();

    const handleScroll = () => {
      const heroHeight = window.innerHeight * 0.95;
      setIsScrolled(window.scrollY > heroHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
        initial={{ backgroundColor: 'transparent' }}
        animate={{
          backgroundColor: isScrolled ? 'var(--background)' : 'transparent',
        }}
      >
        <AnimatePresence>
          {isScrolled && (
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-[1px] bg-foreground/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>

        <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isScrolled ? 'bg-card' : ''}`}>
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left: Logo - Mobile */}
            <div className="flex items-center md:hidden">
              <BrandMark variant={isScrolled ? "default" : "inverse"} />
            </div>

            {/* Desktop Logo */}
            <div className="items-center md:flex hidden">
              <BrandMark variant={isScrolled ? "default" : "inverse"} />
            </div>

            {/* Desktop Navigation with Dropdowns */}
            <AnimatePresence>
              {isScrolled && (
                <motion.div
                  className="hidden md:block"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <DesktopNavigation />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right: Icons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileSearchOpen(true)}
                className="p-2 hover:bg-foreground/5 rounded-md transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              <Link
                href="/dashboard"
                className="p-2 hover:bg-foreground/5 rounded-md transition-colors"
                aria-label="dashboard"
              >
                <User className="h-5 w-5" />
              </Link>
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2 hover:bg-foreground/5 rounded-md transition-colors relative"
                aria-label="Shopping cart"
              >
                <ShoppingBag className="h-5 w-5" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 text-xs w-5 h-5 rounded-full flex items-center justify-center bg-foreground text-background font-semibold"
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <AnimatePresence>
                {isScrolled && (
                  <motion.button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="md:hidden p-2 hover:bg-foreground/5 rounded-md transition-colors"
                    aria-label="Open menu"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.nav>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <MobileSearch isOpen={isMobileSearchOpen} onClose={() => setIsMobileSearchOpen(false)} />
      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}