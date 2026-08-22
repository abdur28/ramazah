import type { Category } from '@/types/types';

/**
 * How a category path is put together.
 *
 * The database builds `categories.path` in a trigger:
 *
 *   return coalesce(v_parent_path || ' > ', '') || p_name;
 *
 * so a child reads `Food & Pantry > Coffee & Tea`. Three places in the admin
 * split that on `'/'` instead, which always yields a single segment — so every
 * category came out at depth zero and parents and children rendered as one flat
 * list. Hence this file: the separator is written down once.
 */
export const CATEGORY_SEPARATOR = ' > ';

export const splitPath = (path: string): string[] =>
  path.split(CATEGORY_SEPARATOR).map((part) => part.trim()).filter(Boolean);

/** 0 for a top-level category, 1 for its child, and so on. */
export const pathDepth = (path: string): number => Math.max(splitPath(path).length - 1, 0);

/** `Food & Pantry > Coffee & Tea` -> `Food & Pantry`. Null at the top. */
export function parentPath(path: string): string | null {
  const parts = splitPath(path);
  return parts.length > 1 ? parts.slice(0, -1).join(CATEGORY_SEPARATOR) : null;
}

/** What the path *will* be once the trigger has run. For previews in the form. */
export const childPathOf = (parent: Category | null | undefined, name: string): string =>
  parent ? `${parent.path}${CATEGORY_SEPARATOR}${name}` : name;

export interface FlatCategory {
  category: Category;
  depth: number;
  /** The slugs from the root down, which is how storefront URLs are built. */
  slugTrail: string[];
}

/**
 * Every category, parents and children alike, in display order.
 *
 * `fetchCategories` returns only the roots, with children hanging off
 * `subCategories` — so anything iterating the array it hands back sees half the
 * catalogue. Both the admin tree and the category picker were doing exactly
 * that, which is why a newly added subcategory appeared nowhere.
 */
export function flattenCategories(
  categories: Category[],
  depth = 0,
  trail: string[] = []
): FlatCategory[] {
  return categories.flatMap((category) => {
    const slugTrail = [...trail, category.slug];
    return [
      { category, depth, slugTrail },
      ...flattenCategories(category.subCategories ?? [], depth + 1, slugTrail),
    ];
  });
}

/** Count including every level. `categories.length` only ever counted roots. */
export const countCategories = (categories: Category[]): number =>
  flattenCategories(categories).length;

/** `/categories/food-pantry/coffee-tea` */
export const categoryHref = (slugTrail: string[]): string =>
  `/categories/${slugTrail.join('/')}`;

/**
 * Is this a URL path made of slugs, or the display path the database stores?
 *
 * Both reach `getCategoryByPath`: the storefront route joins its slug segments
 * (`food-pantry/coffee-tea`) while everything server-side passes
 * `categories.path` (`Food & Pantry > Coffee & Tea`).
 *
 * The old test was `path.includes('/') || !path.includes('>')`, which reads
 * "anything without a `>` is a slug" — and that is true of every *top-level*
 * stored path. So `Food & Pantry` was looked up as a slug, no row has that
 * slug, and the lookup failed. The visible effect was that every top-level
 * category page on the shop listed nothing at all.
 *
 * Slugs are lower-case, digits and hyphens, optionally slash-separated. A
 * stored path carries capitals, spaces or `&`. Where a name is genuinely
 * slug-shaped ("coffee"), both readings resolve to the same row, so the
 * ambiguity is harmless.
 */
export const isSlugPath = (path: string): boolean => /^[a-z0-9]+(?:[-a-z0-9]*)(?:\/[a-z0-9][-a-z0-9]*)*$/.test(path.trim());

/**
 * The ceiling, mirroring `public.category_max_depth()`. The database refuses a
 * seventh level whatever the screen says; this is so the screen can say it
 * first, rather than letting someone fill in a form that cannot be saved.
 */
export const MAX_CATEGORY_DEPTH = 6;

/**
 * Past this, a shelf is usually a filter in disguise.
 *
 * Not enforced — depth is a merchandising judgement, not a technical limit, and
 * a wide catalogue can genuinely want four. The admin says so once and gets out
 * of the way.
 */
export const SUGGESTED_CATEGORY_DEPTH = 3;

/** 1 for a root. Falls back to counting the path when `depth` is absent. */
export const depthOf = (category: { depth?: number; path: string }): number =>
  category.depth ?? splitPath(category.path).length;

export const canNestUnder = (category: { depth?: number; path: string }): boolean =>
  depthOf(category) < MAX_CATEGORY_DEPTH;

/**
 * The slugs from the root down to a category, which is how its URL is built.
 * Returns an empty array when the category is not in the tree.
 */
export function slugTrailFor(tree: Category[], categoryId: string): string[] {
  const found = flattenCategories(tree).find(({ category }) => category.id === categoryId);
  return found?.slugTrail ?? [];
}
