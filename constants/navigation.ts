/**
 * Storefront navigation — the single source for the desktop bar, the mobile
 * menu and the search panel. Those three used to carry their own hardcoded
 * copies (a fourth lived in the hero), which is how `hoodhub.ru` survived the
 * rebrand in two of them.
 *
 * Mirrors the seeded category tree in
 * `supabase/migrations/*_seed_categories.sql`: six top-level categories, with
 * three children under Food & Pantry. Curated rather than read from
 * `getAllCategories()` because the bar needs shorter labels than the table
 * carries ("Beauty", not "Beauty & Personal Care") and a fixed order — the
 * full names still show on the category pages themselves. Adding a category
 * in admin therefore means adding a line here.
 *
 * Every `href` must match a real slug; `/categories/[...slug]` resolves by the
 * last segment, so child paths stay readable.
 */

export interface NavLink {
  name: string;
  href: string;
}

export interface NavGroup {
  name: string;
  items: NavLink[];
}

export interface NavItem extends NavLink {
  /**
   * Children, nested to whatever depth the menu carries. This was
   * `NavGroup[]` — a single flat group — which could only ever express one
   * level below the top, so a shop that nests deeper had those shelves
   * unreachable from the menu.
   */
  children?: NavItem[];
  /** True when this category has more beneath it than the menu shows. */
  hasMore?: boolean;
  /** Present only on the legacy fallback list. */
  subCategories?: NavGroup[];
}

/**
 * How many top-level items the desktop bar can hold.
 *
 * Lives here rather than beside `getStoreNavigation` because the bar is a client
 * component, and that module reaches for `next/headers` — importing it from the
 * client drags a server-only API into the browser bundle.
 *
 * Six is where the labels start colliding with the lockup and the icons at
 * ordinary desktop widths. Anything past it goes under "More".
 */
export const MAX_DESKTOP_NAV_ITEMS = 6;

/**
 * Menu entries that are not categories, appended after them.
 *
 * The catalogue cannot supply these — Contact is a page, not a shelf — and
 * building the menu purely from `categories` quietly dropped it. They sit
 * outside the six-item cap, which counts shelves.
 */
export const staticNavItems: NavLink[] = [
  // Not a shelf, so it cannot come from `categories` — but it is a place to
  // shop, so it belongs beside them rather than in the footer.
  { name: 'Collections', href: '/collections' },
  { name: 'Contact', href: '/contact' },
];

/**
 * The fallback menu, used when the categories query fails. The live menu is
 * built from the catalogue — see `lib/navigation.ts`. A navbar that empties
 * itself during a database blip looks broken in a way a stale one does not.
 */
export const navigationStructure: NavItem[] = [
  { name: 'Veils & Scarves', href: '/categories/veils-scarves' },
  {
    name: 'Food & Pantry',
    href: '/categories/food-pantry',
    subCategories: [
      {
        name: 'Food & Pantry',
        items: [
          { name: 'Coffee & Tea', href: '/categories/food-pantry/coffee-tea' },
          { name: 'Spices & Condiments', href: '/categories/food-pantry/spices-condiments' },
          { name: 'Dry Foods', href: '/categories/food-pantry/dry-foods' },
        ],
      },
    ],
  },
  { name: 'Beauty', href: '/categories/beauty-personal-care' },
  { name: 'Kitchen', href: '/categories/kitchen-dining' },
  { name: 'Home & Decor', href: '/categories/home-decor' },
  { name: 'Stationery', href: '/categories/school-stationery' },
  { name: 'Contact', href: '/contact' },
];

/** Full category names, for surfaces with room for them. */
export const popularCategories: NavLink[] = [
  { name: 'Veils & Scarves', href: '/categories/veils-scarves' },
  { name: 'Coffee & Tea', href: '/categories/food-pantry/coffee-tea' },
  { name: 'Spices & Condiments', href: '/categories/food-pantry/spices-condiments' },
  { name: 'Beauty & Personal Care', href: '/categories/beauty-personal-care' },
  { name: 'Kitchen & Dining', href: '/categories/kitchen-dining' },
  { name: 'Home & Decor', href: '/categories/home-decor' },
];

/**
 * Chips in the search dialog. Editorial, not measured — swap for real query
 * data once search is logged. Every term is checked against the catalog first:
 * a chip that returns nothing reads as a broken search, so aspirational terms
 * ("Hibiscus tea", "Incense") wait until stock exists to back them.
 */
export const trendingSearches: string[] = [
  'Coffee',
  'Chiffon veils',
  'Cumin',
  'Brass tray',
];

/**
 * Social accounts, for the footer. Empty hrefs are skipped rather than rendered
 * as dead links — fill one in and its icon appears.
 *
 * The business runs on WhatsApp, so that is the one worth having first: use
 * `https://wa.me/<number in full international form, no +>`.
 */
export const socialLinks: { name: string; href: string }[] = [
  { name: 'WhatsApp', href: '' },
  { name: 'Instagram', href: '' },
  { name: 'Facebook', href: '' },
];
