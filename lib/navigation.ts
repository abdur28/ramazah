import { createClient } from '@/lib/supabase/server';
import { staticNavItems, type NavItem, type NavLink } from '@/constants/navigation';

/**
 * The storefront menu, built from the catalogue.
 *
 * `constants/navigation.ts` was a hand-written list, so a category added in the
 * admin was invisible until someone edited code — which is exactly what the
 * "Tea" subcategory ran into.
 *
 * The reason it was hand-written was sound, though, and is kept: a menu is not
 * a mirror of a table. It needs shorter labels than the catalogue uses (six
 * names like "Beauty & Personal Care" will not sit on one line), it needs an
 * order, and it needs to leave some shelves out. Those three decisions now live
 * on the row — `nav_label`, `sort_order`, `show_in_nav` — instead of in a file.
 *
 * Two levels only. A dropdown is a shortcut, not a site map; anything deeper is
 * reached by browsing from the category page, which lists its own children.
 */
export interface StoreNavigation {
  /** Top-level categories, in menu order. Excludes the static entries. */
  items: NavItem[];
  /** Contact and anything else that is a page rather than a shelf. */
  extras: NavLink[];
  /** Full names, for surfaces with room — the footer, the search dialog. */
  popular: NavLink[];
}

/**
 * How deep the menu goes.
 *
 * Six, which is the ceiling the database enforces — so in practice the menu
 * carries the whole tree. It was three, from when the panel was a mega-menu
 * whose columns could not express a fourth level. The desktop panel cascades
 * now and the mobile sheet drills, and neither grows as the tree does, so
 * there is no longer a reason to stop short and leave shelves unreachable.
 */
export const MENU_DEPTH = 6;

export async function getStoreNavigation(): Promise<StoreNavigation> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('id, parent_id, name, slug, nav_label, sort_order, depth, show_in_nav')
    .order('depth')
    .order('sort_order')
    .order('name');

  if (error || !data) {
    return { items: [], extras: staticNavItems, popular: [] };
  }

  const visible = data.filter((row) => row.show_in_nav);
  const label = (row: { nav_label: string | null; name: string }) => row.nav_label || row.name;

  const childrenOf = (parentId: string | null) =>
    visible.filter((row) => row.parent_id === parentId);

  /** Anything below the menu's own ceiling, so the panel can say "more inside". */
  const hasDeeper = (id: string) => data.some((row) => row.parent_id === id);

  const build = (parentId: string | null, trail: string[], depth: number): NavItem[] =>
    childrenOf(parentId).map((row) => {
      const slugTrail = [...trail, row.slug];
      const children = depth < MENU_DEPTH ? build(row.id, slugTrail, depth + 1) : [];

      return {
        name: label(row),
        href: `/categories/${slugTrail.join('/')}`,
        ...(children.length > 0 ? { children } : {}),
        // Either the menu stopped short, or the child is hidden from the menu
        // but still browsable.
        ...(children.length === 0 && hasDeeper(row.id) ? { hasMore: true } : {}),
      };
    });

  const items = build(null, [], 1);

  // Full names here regardless: the footer and the search dialog have the width,
  // and a shortened label is a poor thing to search for.
  const popular: NavLink[] = visible
    .filter((row) => row.depth === 2)
    .slice(0, 6)
    .map((row) => {
      const parent = data.find((candidate) => candidate.id === row.parent_id);
      return {
        name: row.name,
        href: parent ? `/categories/${parent.slug}/${row.slug}` : `/categories/${row.slug}`,
      };
    });

  if (popular.length < 4) {
    for (const root of childrenOf(null)) {
      if (popular.length >= 6) break;
      const href = `/categories/${root.slug}`;
      if (popular.some((entry) => entry.href === href)) continue;
      popular.push({ name: root.name, href });
    }
  }

  return { items, extras: staticNavItems, popular };
}
