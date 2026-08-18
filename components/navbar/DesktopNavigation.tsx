import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import CrossedLink from '@/components/ui/crossed-link';

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

export default function DesktopNavigation() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (name: string) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
    setTimeoutId(id);
  };

  return (
    <nav className="flex items-center gap-8">
      {navigationStructure.map((item) => (
        <div
          key={item.name}
          className="relative"
          onMouseEnter={() => item.subCategories && handleMouseEnter(item.name)}
          onMouseLeave={handleMouseLeave}
        >
          {item.href ? (
            <CrossedLink
              href={item.href}
              lineColor="gold"
              className="font-body text-sm text-foreground transition-colors"
            >
              {item.name}
            </CrossedLink>
          ) : (
            <button className="flex items-center gap-1 font-body text-sm text-foreground hover:text-foreground/60 transition-colors">
              {item.name}
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${
                  activeDropdown === item.name ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}

          {/* Dropdown Menu */}
          {item.subCategories && (
            <AnimatePresence>
              {activeDropdown === item.name && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-2 pt-2"
                >
                  <div className="bg-background border border-foreground/10 rounded-lg shadow-2xl overflow-hidden min-w-[600px]">
                    <div className="grid grid-cols-2 gap-8 p-6">
                      {item.subCategories.map((group) => (
                        <div key={group.name}>
                          <h3 className="font-heading text-xs tracking-widest text-foreground/60 mb-4 pb-2 border-b border-foreground/10">
                            {group.name}
                          </h3>
                          <ul className="space-y-2">
                            {group.items.map((subItem) => (
                              <li key={subItem.name}>
                                <CrossedLink
                                  href={subItem.href}
                                  lineColor="gold"
                                  className="block text-sm text-foreground/80 hover:text-foreground rounded-md transition-all"
                                >
                                  {subItem.name}
                                </CrossedLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Featured Section */}
                    <div className="bg-foreground/5 px-6 py-4 border-t border-foreground/10">
                      <CrossedLink
                        href={`/categories/${item.name.toLowerCase()}`}
                        lineColor="gold"
                        className="inline-block text-sm font-medium text-foreground hover:text-foreground/60 transition-colors"
                      >
                        View All {item.name} →
                      </CrossedLink>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      ))}
    </nav>
  );
}