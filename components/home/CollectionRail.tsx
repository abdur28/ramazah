import CollectionBand from "@/components/home/CollectionBand";
import { getHomeCollection } from "@/lib/products";

/**
 * The one collection worth the front page.
 *
 * Was three cards in a grid, then a split editorial band. Both were the wrong
 * shape: a collection wants the full-bleed banner treatment — see
 * `CollectionBand` — because the photograph is the argument.
 *
 * Which one is a choice made in the admin — Collections, "Show on the home
 * page". Only one collection can carry that flag; the database enforces it,
 * because a flag that permits three while the page renders one means ticking a
 * box and seeing nothing happen.
 *
 * Renders nothing when there is none. A shop with no collections should not have
 * a section apologising for it.
 */
export default async function CollectionRail() {
  const { collection } = await getHomeCollection();
  if (!collection) return null;

  return (
    <CollectionBand
      name={collection.name}
      description={collection.description}
      bannerUrl={collection.bannerUrl}
      bannerAlt={collection.bannerAlt}
      slug={collection.slug}
      productCount={collection.productCount}
    />
  );
}
