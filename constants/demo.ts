/**
 * Demo imagery — placeholders, not final art.
 *
 * Every photograph on the home page comes from here, so replacing them is one
 * file: shoot or source the real thing, upload to Cloudinary, and swap the
 * `src` values for the `res.cloudinary.com` URLs. Nothing else changes.
 *
 * These are Unsplash, chosen to match the sage palette and the actual catalog —
 * folded scarves in muted colours, an Egyptian market, a brass coffee set. The
 * previous placeholders were hoodskool's studio shots of a model in a HOOD
 * hoodie, which is a different shop's brand sitting on your front page.
 *
 * Sizes are pinned in the URL so `next/image` resizes down from something
 * sensible rather than pulling a 5MB original. `res.cloudinary.com` and
 * `images.unsplash.com` are both allowed in `next.config.ts`.
 */

export interface DemoImage {
  src: string;
  alt: string;
}

const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=70`;

/** Full-bleed, and the only image a first-time visitor is guaranteed to see. */
export const heroImage: DemoImage = {
  src: unsplash('1778401835338-ea17f254dd87', 2000),
  alt: 'Market stalls under a stone archway in Cairo',
};

/**
 * The lead categories, each with a full-width band on the home page. Ordered
 * the way the page reads.
 */
export const bandImages: Record<string, DemoImage> = {
  'veils-scarves': {
    src: unsplash('1640747669771-b82a6e40f534', 1400),
    alt: 'Folded chiffon scarves stacked in olive, navy, cream and terracotta',
  },
  'coffee-tea': {
    src: unsplash('1447933601403-0c6688de566e', 1400),
    alt: 'Roasted coffee beans filling the frame',
  },
};

/**
 * The category table — one image per top-level category, keyed by slug.
 *
 * Veils and Food & Pantry also have bands higher up the page, so their tiles
 * use a different photograph: the band shows folded stock, the tile shows the
 * thing in use. The same picture twice on one page reads as a mistake.
 */
export const tileImages: Record<string, DemoImage> = {
  'veils-scarves': {
    src: unsplash('1584339312444-6952d098e152', 900),
    alt: 'A woman wearing a black veil',
  },
  'food-pantry': {
    src: unsplash('1596040033229-a9821ebd058d', 900),
    alt: 'Ground spices arranged on a pale wooden surface',
  },
  'beauty-personal-care': {
    src: unsplash('1624454002302-36b824d7bd0a', 900),
    alt: 'Amber glass dropper bottles beside a jar',
  },
  'kitchen-dining': {
    src: unsplash('1747571855541-394b53b3b7e8', 900),
    alt: 'A brass coffee set arranged on an engraved tray',
  },
  'home-decor': {
    src: unsplash('1760727466793-5415cfcd8994', 900),
    alt: 'Ornate lanterns hanging in a lamp shop',
  },
  'school-stationery': {
    src: unsplash('1525278070609-779c7adb7b71', 900),
    alt: 'Pencils and a sketch pad on a wooden desk',
  },
};

/**
 * Product photography for the seeded catalog, keyed by slug. Mirrors what
 * `supabase/seed.sql` writes, so the two cannot drift.
 *
 * Real products get their photographs through Cloudinary at upload time; this
 * exists only so a fresh database has something to render.
 */
export const productImages: Record<string, DemoImage> = {
  'chiffon-veil': {
    src: unsplash('1622532470022-24107cac5ef3', 1000),
    alt: 'Folded chiffon in pastel shades',
  },
  'egyptian-ground-coffee': {
    src: unsplash('1447933601403-0c6688de566e', 1000),
    alt: 'Roasted coffee beans',
  },
  'ground-cumin': {
    src: unsplash('1596040033229-a9821ebd058d', 1000),
    alt: 'Ground spices on a pale wooden surface',
  },
  'brass-serving-tray': {
    src: unsplash('1747571855541-394b53b3b7e8', 1000),
    alt: 'A brass coffee set on an engraved tray',
  },
};

/** The one editorial moment on the page. */
export const storyImage: DemoImage = {
  src: unsplash('1532336414038-cf19250c5757', 1400),
  alt: 'Bowls of spices and grains set out at a market doorway',
};

/**
 * The rotating background on login, signup and password reset — three copies of
 * hoodskool's banner carousel until now. Plain URLs, because those pages set
 * them as a CSS `background-image` rather than through `next/image`.
 */
export const authImages: string[] = [
  storyImage.src,
  bandImages['veils-scarves'].src,
  tileImages['kitchen-dining'].src,
];
