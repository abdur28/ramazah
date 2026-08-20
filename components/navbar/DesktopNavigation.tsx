import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { navigationStructure, type NavItem } from '@/constants/navigation';

/**
 * The desktop category bar. Shown from `lg` up — below that the labels and the
 * lockup no longer fit on one line, so the mobile menu takes over.
 *
 * Every top-level item is a link to its own category page, including the ones
 * that also open a dropdown: pointing at the parent is more useful than a
 * trigger that does nothing on click.
 */
export default function DesktopNavigation() {
  const [openItem, setOpenItem] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = (name: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenItem(name);
  };

  // A short grace period, so crossing the gap to the panel does not close it.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenItem(null), 150);
  };

  return (
    <nav className="flex items-center gap-x-5 xl:gap-x-7">
      {navigationStructure.map((item: NavItem) => (
        <div
          key={item.name}
          className="relative"
          onMouseEnter={() => item.subCategories && open(item.name)}
          onMouseLeave={scheduleClose}
          onFocus={() => item.subCategories && open(item.name)}
          onBlur={scheduleClose}
          onKeyDown={(e) => e.key === 'Escape' && setOpenItem(null)}
        >
          <Link
            href={item.href}
            className="group relative flex items-center gap-1 py-2 font-body text-[13px] text-foreground transition-colors hover:text-sage-deep"
          >
            <span className="relative">
              {item.name}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-current transition-all duration-300 group-hover:w-full" />
            </span>
            {item.subCategories && (
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${
                  openItem === item.name ? 'rotate-180' : ''
                }`}
              />
            )}
          </Link>

          {item.subCategories && (
            <AnimatePresence>
              {openItem === item.name && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
                >
                  <div className="min-w-[240px] overflow-hidden rounded-md border border-rule bg-card shadow-xl">
                    <div className="p-5">
                      {item.subCategories.map((group) => (
                        <div key={group.name}>
                          <h3 className="mb-3 border-b border-rule pb-2 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                            {group.name}
                          </h3>
                          <ul>
                            {group.items.map((subItem) => (
                              <li key={subItem.name}>
                                <Link
                                  href={subItem.href}
                                  className="block py-2 font-body text-sm text-foreground transition-colors hover:text-sage-deep"
                                >
                                  {subItem.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={item.href}
                      className="block border-t border-rule bg-wash px-5 py-3 font-body text-[13px] text-sage-deep transition-colors hover:text-foreground"
                    >
                      View all {item.name} &rarr;
                    </Link>
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
