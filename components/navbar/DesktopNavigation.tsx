'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MAX_DESKTOP_NAV_ITEMS, type NavItem } from '@/constants/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';

/**
 * The desktop category bar. Shown from `lg` up — below that the labels and the
 * lockup no longer fit on one line, so the mobile menu takes over.
 *
 * Every top-level item links to its own category page, including the ones that
 * also open a panel: pointing at the parent is more useful than a trigger that
 * does nothing on click.
 *
 * **It measures itself.** The bar is built from the catalogue now, so its length
 * is no longer a designer's decision — and the first attempt at that problem was
 * to abbreviate the shop's own category names in the database, which is not the
 * software's call to make. Instead an off-screen copy of the full list is
 * measured against the space actually available, and whatever does not fit moves
 * into "More". `MAX_DESKTOP_NAV_ITEMS` is a ceiling on top of that, never a
 * substitute for measuring: at 1280px "Beauty & Personal Care" and "School &
 * Stationery" together take the room three shorter shelves would.
 *
 * **The panel carries three levels.** A category with grandchildren renders as
 * columns — each child a heading, its own children listed beneath. Deeper than
 * that is reached from the category page; the panel marks those with a chevron
 * rather than pretending the shelf is a leaf.
 *
 * `inverse` is for the transparent bar over the home hero, which is a dark
 * photograph. The panel stays on its light ground either way — it is a surface,
 * not part of the photograph.
 */
export default function DesktopNavigation({
  variant = 'default',
}: {
  variant?: 'default' | 'inverse';
}) {
  const inverse = variant === 'inverse';
  const { items, extras } = useNavigation();

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

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const { containerRef, measureRef, visibleCount } = useFittedCount(items.length);

  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);

  const linkClass = cn(
    'group relative flex items-center gap-1 py-2 font-body text-sm xl:text-[15px] transition-colors',
    inverse ? 'text-background hover:text-sage-light' : 'text-foreground hover:text-sage-deep'
  );

  return (
    <div className="relative min-w-0 flex-1">
      {/*
        The full list, laid out but never painted, so every label can be measured
        at its natural width even while it is hidden from the bar.
      */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 flex items-center gap-x-5 opacity-0 xl:gap-x-8"
      >
        {items.map((item) => (
          <span key={item.name} data-measure className={linkClass}>
            <span className="whitespace-nowrap">{item.name}</span>
            {item.children && <ChevronDown className="h-3 w-3" />}
          </span>
        ))}
      </div>

      <nav ref={containerRef} className="flex min-w-0 items-center gap-x-5 xl:gap-x-8">
        {visible.map((item) => (
          <div
            key={item.name}
            // Marks this as a category, so the fit calculation can tell it apart
            // from the extras and the More button sharing the row.
            data-category
            className="relative"
            onMouseEnter={() => item.children && open(item.name)}
            onMouseLeave={scheduleClose}
            onFocus={() => item.children && open(item.name)}
            onBlur={scheduleClose}
            onKeyDown={(event) => event.key === 'Escape' && setOpenItem(null)}
          >
            <Link href={item.href} className={linkClass}>
              <span className="relative whitespace-nowrap">
                {item.name}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-current transition-all duration-300 group-hover:w-full" />
              </span>
              {item.children && (
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    openItem === item.name && 'rotate-180'
                  )}
                />
              )}
            </Link>

            {item.children && (
              <AnimatePresence>
                {openItem === item.name && <Panel item={item} />}
              </AnimatePresence>
            )}
          </div>
        ))}

        {/* Pages rather than shelves, after the categories and outside the cap. */}
        {extras.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass}>
            <span className="relative whitespace-nowrap">
              {item.name}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-current transition-all duration-300 group-hover:w-full" />
            </span>
          </Link>
        ))}

        {/* Whatever did not fit. Never a dead end. */}
        {overflow.length > 0 && (
          <div
            className="relative"
            onMouseEnter={() => open('__more')}
            onMouseLeave={scheduleClose}
            onFocus={() => open('__more')}
            onBlur={scheduleClose}
            onKeyDown={(event) => event.key === 'Escape' && setOpenItem(null)}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={openItem === '__more'}
              className={linkClass}
            >
              <span className="relative whitespace-nowrap">
                More
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-current transition-all duration-300 group-hover:w-full" />
              </span>
              <ChevronDown
                className={cn(
                  'h-3 w-3 transition-transform duration-200',
                  openItem === '__more' && 'rotate-180'
                )}
              />
            </button>

            <AnimatePresence>
              {openItem === '__more' && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full z-50 pt-3"
                >
                  <div className="min-w-[240px] overflow-hidden rounded-md border border-rule bg-card p-2 shadow-xl">
                    <ul>
                      {overflow.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className="flex items-center justify-between gap-3 rounded-sm px-3 py-2 font-body text-[15px] text-foreground transition-colors hover:bg-wash/60 hover:text-sage-deep"
                          >
                            {item.name}
                            {item.children && (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>
    </div>
  );
}

/**
 * The dropdown, and every level beneath it — one panel, expanded on click.
 *
 * Four attempts, and the arithmetic of the first three is worth writing down.
 *
 * A mega-menu of columns held three levels and then stopped. Chaining a flyout
 * off every row reached any depth but marched panels across the screen until it
 * looked like a stack of dialogs. Sliding a two-column panel fixed the look and
 * broke the behaviour outright: the preview column drilled on `mouseenter`,
 * which put the next column under the cursor, which drilled again — one sweep of
 * the mouse ran to the bottom of the tree.
 *
 * The common fault is hover. Hover is fine for *opening* one panel; it is a poor
 * way to walk a hierarchy, because every level you add is another region the
 * pointer can cross by accident, and the cost of a wrong guess is the menu
 * rearranging itself under the hand.
 *
 * So nothing inside the panel responds to hover. A row with children carries a
 * chevron that **expands it in place**, and the panel grows downward like an
 * outline. The name beside it still links straight to the category page, so the
 * two things a shopper might want — *go there* and *look inside* — are separate
 * targets rather than the same gesture with different timing. It nests to any
 * depth, it cannot run away, and it is one panel at one width.
 */
function Panel({ item }: { item: NavItem }) {
  // Reset every time a different shelf is opened, so the panel never reopens
  // half-unfolded from last time.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpanded(new Set());
  }, [item]);

  const toggle = (href: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18 }}
      className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3"
    >
      <div className="w-[300px] overflow-hidden rounded-md border border-rule bg-card shadow-xl">
        <ul data-lenis-prevent className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain p-2">
          {(item.children ?? []).map((child) => (
            <Row
              key={child.href}
              item={child}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
            />
          ))}
        </ul>

        <Link
          href={item.href}
          className="block border-t border-rule bg-wash px-5 py-3 font-body text-sm text-sage-deep transition-colors hover:text-foreground"
        >
          View all {item.name} &rarr;
        </Link>
      </div>
    </motion.div>
  );
}

function Row({
  item,
  depth,
  expanded,
  onToggle,
}: {
  item: NavItem;
  depth: number;
  expanded: Set<string>;
  onToggle: (href: string) => void;
}) {
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(item.href);

  return (
    <li>
      <div className="flex items-stretch">
        <Link
          href={item.href}
          style={{ paddingLeft: 12 + depth * 14 }}
          className={cn(
            'flex-1 truncate rounded-sm py-2 pr-2 font-body transition-colors',
            'hover:bg-wash/60 hover:text-sage-deep',
            depth === 0 ? 'text-[15px] text-foreground' : 'text-sm text-ink-muted'
          )}
        >
          {item.name}
        </Link>

        {hasChildren && (
          <button
            type="button"
            onClick={() => onToggle(item.href)}
            aria-expanded={isOpen}
            aria-label={`${isOpen ? 'Hide' : 'Show'} what is inside ${item.name}`}
            className="flex w-9 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-wash/60 hover:text-sage-deep"
          >
            <ChevronRight
              className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-90')}
            />
          </button>
        )}
      </div>

      {hasChildren && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {children.map((child) => (
                <Row
                  key={child.href}
                  item={child}
                  depth={depth + 1}
                  expanded={expanded}
                  onToggle={onToggle}
                />
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      )}
    </li>
  );
}

/**
 * How many top-level items actually fit.
 *
 * Measures the off-screen copy against the room the bar has, rather than
 * trusting a fixed number — six long names and six short ones need very
 * different amounts of space, and the alternative was shortening the shop's
 * category names to suit the layout.
 */
function useFittedCount(total: number) {
  const containerRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(Math.min(total, MAX_DESKTOP_NAV_ITEMS));

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const widths = Array.from(measure.querySelectorAll('[data-measure]')).map(
      (node) => (node as HTMLElement).getBoundingClientRect().width
    );
    if (widths.length === 0) return;

    const styles = window.getComputedStyle(measure);
    const gap = parseFloat(styles.columnGap || '20') || 20;

    // Everything the categories have to share the row with.
    const available = container.getBoundingClientRect().width;
    const reserved = Array.from(container.children)
      .filter((child) => !(child as HTMLElement).dataset.category)
      .reduce((sum, child) => sum + child.getBoundingClientRect().width + gap, 0);

    let used = 0;
    let fits = 0;
    for (const width of widths) {
      const next = used + width + (fits > 0 ? gap : 0);
      if (next > available - reserved) break;
      used = next;
      fits += 1;
    }

    // Room for one more only if nothing is being hidden — otherwise "More"
    // needs its own space, which the loop has not accounted for.
    const capped = Math.min(fits, MAX_DESKTOP_NAV_ITEMS, total);
    setVisibleCount(Math.max(capped, 1));
  }, [total]);

  useLayoutEffect(() => {
    recompute();

    const observer = new ResizeObserver(recompute);
    if (containerRef.current) observer.observe(containerRef.current);
    // Fonts land after first paint and change every label's width.
    document.fonts?.ready.then(recompute).catch(() => {});

    return () => observer.disconnect();
  }, [recompute]);

  return { containerRef, measureRef, visibleCount };
}
