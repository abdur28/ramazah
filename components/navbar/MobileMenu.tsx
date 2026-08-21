import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, X, Heart, Package,
  LayoutDashboard, LogOut, Mail, Shield,
} from 'lucide-react';
import { navigationStructure, type NavItem } from '@/constants/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useScrollLock } from '@/hooks/useScrollLock';

/**
 * The menu sheet, below `lg`. It carries what the desktop bar spreads across
 * the viewport — categories and account — so it is organised in labelled
 * sections rather than one undifferentiated list of links.
 *
 * The panel floats inset from the edges, matching the cart and the search
 * dialog; a flush full-bleed sheet was the odd one out.
 */

// The bar shortens labels to fit one line. A full-width sheet has room for the
// real category names, and `/categories` is what separates a shop link from
// Home or Contact.
const shopCategories = navigationStructure.filter((item) => item.href.startsWith('/categories'));

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const { user, profile, isAdmin, signOut } = useAuth();

  const [activeCategory, setActiveCategory] = useState<NavItem | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Reset the drill-down and hold the page still while the sheet is open.
  useScrollLock(isOpen);

  // Never reopen three levels deep.
  useEffect(() => {
    if (isOpen) setActiveCategory(null);
  }, [isOpen]);

  const handleCategoryClick = (item: NavItem) => {
    setSlideDirection('right');
    setActiveCategory(item);
  };

  const handleBack = () => {
    setSlideDirection('left');
    setActiveCategory(null);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const slideVariants = {
    enter: (direction: string) => ({
      x: direction === 'right' ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: string) => ({
      x: direction === 'right' ? '-100%' : '100%',
      opacity: 0,
    }),
  };

  const accountName = profile?.displayName || user?.email?.split('@')[0] || 'Account';
  const accountInitial = accountName.charAt(0).toUpperCase();

  const sectionLabel = 'mb-1 px-6 pt-6 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted';
  const row =
    'flex w-full items-center justify-between gap-3 border-b border-rule/60 px-6 py-4 text-left font-body text-base text-foreground transition-colors hover:bg-wash hover:text-sage-deep';

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
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px]"
          />

          {/* Menu Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-3 right-3 z-50 flex w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-sm bg-card shadow-2xl sm:w-[calc(100%-2rem)] md:inset-y-4 md:right-4 md:max-w-md"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rule px-6 py-4">
              {activeCategory ? (
                <button
                  onClick={handleBack}
                  className="-ml-2 rounded-md p-2 text-ink-muted transition-colors hover:bg-wash hover:text-foreground"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <div className="w-9" />
              )}

              <h2 className="font-body text-sm font-medium uppercase tracking-[0.18em] text-ink-muted">
                {activeCategory ? activeCategory.name : 'Menu'}
              </h2>

              <button
                onClick={onClose}
                className="-mr-2 rounded-md p-2 text-ink-muted transition-colors hover:bg-wash hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="relative flex-1 overflow-hidden">
              <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                {!activeCategory ? (
                  <motion.div
                    key="main"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'tween', duration: 0.3 }}
                    className="absolute inset-0 overflow-y-auto overscroll-contain"
                  >
                    <nav>
                      <Link href="/" onClick={onClose} className={`${row} mt-2`}>
                        Home
                      </Link>

                      <h3 className={sectionLabel}>Shop</h3>
                      {shopCategories.map((item, index) => (
                        <motion.div
                          key={item.name}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 + index * 0.03, duration: 0.25 }}
                        >
                          {item.subCategories ? (
                            <button onClick={() => handleCategoryClick(item)} className={row}>
                              {item.name}
                              <ChevronRight className="h-4 w-4 text-ink-faint" />
                            </button>
                          ) : (
                            <Link href={item.href} onClick={onClose} className={row}>
                              {item.name}
                            </Link>
                          )}
                        </motion.div>
                      ))}
                    </nav>

                    {/* Account */}
                    <h3 className={sectionLabel}>Account</h3>
                    {user ? (
                      <>
                        <Link
                          href="/dashboard"
                          onClick={onClose}
                          className="flex items-center gap-3 border-b border-rule/60 px-6 py-4 transition-colors hover:bg-wash"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wash font-body text-sm text-sage-deep">
                            {accountInitial}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-body text-sm text-foreground">
                              {accountName}
                            </span>
                            <span className="block truncate font-body text-xs text-ink-muted">
                              {user.email}
                            </span>
                          </span>
                        </Link>

                        <Link href="/dashboard/orders" onClick={onClose} className={row}>
                          <span className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-ink-muted" />
                            My orders
                          </span>
                        </Link>
                        <Link href="/dashboard/wishlist" onClick={onClose} className={row}>
                          <span className="flex items-center gap-3">
                            <Heart className="h-4 w-4 text-ink-muted" />
                            My wishlist
                          </span>
                        </Link>
                        {isAdmin && (
                          <Link href="/admin" onClick={onClose} className={row}>
                            <span className="flex items-center gap-3">
                              <Shield className="h-4 w-4 text-ink-muted" />
                              Admin
                            </span>
                          </Link>
                        )}
                        <button onClick={handleSignOut} className={row}>
                          <span className="flex items-center gap-3 text-ink-muted">
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </span>
                        </button>
                      </>
                    ) : (
                      // Signed out, the menu asks for the account rather than
                      // listing four pages that all redirect to the login form.
                      <div className="flex gap-3 px-6 py-4">
                        <Link
                          href={`/auth/login?redirect=${encodeURIComponent(pathname)}`}
                          onClick={onClose}
                          className="flex-1 rounded-md bg-sage-deep py-3 text-center font-body text-sm font-medium text-background transition-colors hover:bg-sage-deep/90"
                        >
                          Sign in
                        </Link>
                        <Link
                          href={`/auth/signup?redirect=${encodeURIComponent(pathname)}`}
                          onClick={onClose}
                          className="flex-1 rounded-md border border-rule py-3 text-center font-body text-sm transition-colors hover:border-sage-deep hover:text-sage-deep"
                        >
                          Create account
                        </Link>
                      </div>
                    )}

                    <Link
                      href="/contact"
                      onClick={onClose}
                      className="mt-4 flex items-center gap-3 border-t border-rule bg-wash px-6 py-4 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
                    >
                      <Mail className="h-4 w-4" />
                      Contact us
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    key="sub"
                    custom={slideDirection}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: 'tween', duration: 0.3 }}
                    className="absolute inset-0 overflow-y-auto overscroll-contain"
                  >
                    {/* The parent is a real category page — reachable on desktop
                        by clicking the trigger, so it needs a way in here too. */}
                    <Link
                      href={activeCategory.href}
                      onClick={onClose}
                      className="flex items-center justify-between border-b border-rule/60 px-6 py-4 font-body text-base text-sage-deep transition-colors hover:bg-wash"
                    >
                      All {activeCategory.name}
                      <ChevronRight className="h-4 w-4" />
                    </Link>

                    {activeCategory.subCategories?.map((group) => (
                      <div key={group.name}>
                        {group.items.map((item) => (
                          <Link key={item.name} href={item.href} onClick={onClose} className={row}>
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
