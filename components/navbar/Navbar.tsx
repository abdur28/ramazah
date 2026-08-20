import Link from 'next/link';
import BrandMark from "@/components/brand/BrandMark";
import Image from 'next/image';
import { useState } from 'react';
import { Menu, Search, User, ShoppingBag } from 'lucide-react';
import MobileMenu from '@/components/navbar/MobileMenu';
import MobileSearch from '@/components/navbar/MobileSearch';
import DesktopNavigation from '@/components/navbar/DesktopNavigation';
import CartSheet from '@/components/cart/CartSheet';
import { useCartCount } from '@/hooks/useCart';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Get cart count from the cart store
  const cartCount = useCartCount();

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-foreground/10">
        <div className="mx-auto bg-card px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left: Logo - Mobile */}
            <div className="flex items-center md:hidden">
              <BrandMark />
            </div>

            {/* Left: Logo - Desktop */}
            <div className="hidden md:flex items-center">
              <BrandMark />
            </div>

            {/* Desktop Navigation with Dropdowns */}
            <div className="hidden md:block">
              <DesktopNavigation />
            </div>

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

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 hover:bg-foreground/5 rounded-md transition-colors"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <MobileSearch isOpen={isMobileSearchOpen} onClose={() => setIsMobileSearchOpen(false)} />
      <CartSheet isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}