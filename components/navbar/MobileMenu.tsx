import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, User, Heart, Package, HelpCircle } from 'lucide-react';

interface SubCategory {
  name: string;
  href: string;
}

interface CategoryGroup {
  name: string;
  items: SubCategory[];
}

interface NavigationItem {
  name: string;
  href?: string;
  subCategories?: CategoryGroup[];
}

const navigationStructure: NavigationItem[] = [
  { name: 'Home', href: '/' },
  {
    name: 'Clothings',
    subCategories: [
      {
        name: 'HOOD WEARS',
        items: [
          { name: 'T-Shirts', href: '/categories/clothings/hood-wears/t-shirts' },
          { name: 'Hoodies', href: '/categories/clothings/hood-wears/hoodies' },
          { name: 'Shirts', href: '/categories/clothings/hood-wears/shirts' },
          { name: 'Pants', href: '/categories/clothings/hood-wears/pants' },
          { name: 'Jackets', href: '/categories/clothings/hood-wears/jackets' },
        ],
      },
      {
        name: 'BESPOKE/TAILORING',
        items: [
          { name: 'Pant Trousers', href: '/categories/clothings/bespoke/pant-trousers' },
          { name: 'Waist Coats', href: '/categories/clothings/bespoke/waist-coats' },
          { name: 'Suits', href: '/categories/clothings/bespoke/suits' },
        ],
      },
    ],
  },
  {
    name: 'Accessories',
    subCategories: [
      {
        name: 'ACCESSORIES',
        items: [
          { name: 'Caps', href: '/categories/accessories/caps' },
          { name: 'Bucket Hats', href: '/categories/accessories/bucket-hats' },
          { name: 'Ski Masks', href: '/categories/accessories/ski-masks' },
        ],
      },
    ],
  },
  { name: 'Candles & Matches', href: '/categories/candles-and-matches' },
  { name: 'Artwork', href: '/categories/artwork' },
  { name: 'Hoodhub', href: 'https://hoodhub.ru' },
  { name: 'Contact', href: '/contact' },
];

const accountLinks = [
  { name: 'My Dashboard', href: '/dashboard', icon: User },
  { name: 'My Orders', href: '/orders', icon: Package },
  { name: 'Frequently asked questions', href: '/faq', icon: HelpCircle },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [activeCategory, setActiveCategory] = useState<NavigationItem | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const handleCategoryClick = (item: NavigationItem) => {
    if (item.subCategories) {
      setSlideDirection('right');
      setActiveCategory(item);
    } else if (item.href) {
      onClose();
    }
  };

  const handleBack = () => {
    setSlideDirection('left');
    setActiveCategory(null);
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

          {/* Menu Container */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-background z-50 overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                {activeCategory ? (
                  <button
                    onClick={handleBack}
                    className="p-2 -ml-2 hover:bg-foreground/5 rounded-md transition-colors"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="w-9" /> // Spacer for alignment
                )}
                
                <h2 className="font-heading text-lg tracking-wider">
                  {activeCategory ? activeCategory.name.toUpperCase() : 'MENU'}
                </h2>
                
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 hover:bg-foreground/5 rounded-md transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden relative">
                <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                  {!activeCategory ? (
                    // Main Menu
                    <motion.div
                      key="main"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: 'tween', duration: 0.3 }}
                      className="absolute inset-0 overflow-y-auto"
                    >
                      {/* Navigation Links */}
                      <nav className="px-6 py-4">
                        {navigationStructure.map((item) => (
                          <div key={item.name}>
                            {item.href ? (
                              <Link
                                href={item.href}
                                onClick={onClose}
                                className="flex items-center justify-between py-4 text-foreground hover:text-foreground/60 transition-colors border-b border-foreground/5"
                              >
                                <span className="font-body text-base">{item.name}</span>
                              </Link>
                            ) : (
                              <button
                                onClick={() => handleCategoryClick(item)}
                                className="w-full flex items-center justify-between py-4 text-foreground hover:text-foreground/60 transition-colors border-b border-foreground/5"
                              >
                                <span className="font-body text-base">{item.name}</span>
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </nav>

                      {/* Account Links */}
                      <div className="px-6 py-4 mt-10 border-t border-foreground/10">
                        {accountLinks.map((link) => {
                          const Icon = link.icon;
                          return (
                            <Link
                              key={link.name}
                              href={link.href}
                              onClick={onClose}
                              className="flex items-center gap-3 py-3 text-foreground/80 hover:text-foreground transition-colors"
                            >
                              <Icon className="h-4 w-4" />
                              <span className="font-body text-sm">{link.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : (
                    // Subcategory Menu
                    <motion.div
                      key="sub"
                      custom={slideDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: 'tween', duration: 0.3 }}
                      className="absolute inset-0 overflow-y-auto"
                    >
                      <nav className="px-6 py-4">
                        {activeCategory.subCategories?.map((group) => (
                          <div key={group.name} className="mb-8">
                            <h3 className="font-heading text-xs tracking-widest text-foreground/60 mb-4">
                              {group.name}
                            </h3>
                            <div className="space-y-1">
                              {group.items.map((item) => (
                                <Link
                                  key={item.name}
                                  href={item.href}
                                  onClick={onClose}
                                  className="block py-3 text-foreground hover:text-foreground/60 transition-colors border-b border-foreground/5"
                                >
                                  <span className="font-body text-base">{item.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </nav>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}