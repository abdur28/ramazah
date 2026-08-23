import Hero from "@/components/home/Hero";
import TrustStrip from "@/components/home/TrustStrip";
import CategoryBand from "@/components/home/CategoryBand";
import ProductRail from "@/components/home/ProductRail";
import CategoryTable from "@/components/home/CategoryTable";
import CollectionRail from "@/components/home/CollectionRail";
import Story from "@/components/home/Story";
import Newsletter from "@/components/home/Newsletter";
import { bandImages } from "@/constants/demo";
import { getContent, type HomeContent } from "@/lib/content";

/**
 * Editorial bands for the two lead categories, a weighted table for the rest.
 *
 * Everything below the hero scrolls over it, so the stack carries its own
 * opaque ground and sits above it — that is what makes the sticky hero read as
 * depth rather than as a bug.
 */
/**
 * The words and photographs come from `site_content`, edited at
 * /admin/pages/home. What stays in code is everything structural: which sections
 * appear, in what order, and the reasoning below about why the table comes
 * before the rail. That is design, not copy.
 */
export default async function Home() {
  const content = await getContent<HomeContent>("home");
  const [first, second] = content.bands;

  return (
    <main className="relative">
      <Hero content={content.hero} />

      <div className="relative z-10 bg-background">
        <TrustStrip />

        {/* Two bands, alternating sides. The images fall back to the demo
            placeholders until real photography is uploaded. */}
        {first && (
          <CategoryBand
            eyebrow={first.eyebrow}
            title={first.title}
            body={first.body}
            href={first.href}
            image={
              first.imageUrl
                ? { src: first.imageUrl, alt: first.imageAlt }
                : bandImages["veils-scarves"]
            }
            imageSide="right"
          />
        )}

        {second && (
          <CategoryBand
            eyebrow={second.eyebrow}
            title={second.title}
            body={second.body}
            href={second.href}
            image={
              second.imageUrl
                ? { src: second.imageUrl, alt: second.imageAlt }
                : bandImages["coffee-tea"]
            }
            imageSide="left"
          />
        )}

        {/* Breadth before depth-on-a-sample: the bands cover two categories, so
            the table has to finish the shelf before four products stand in for
            it. Someone here to restock cumin should not have to scroll past a
            rail that probably does not contain cumin to learn there is a spice
            aisle at all. */}
        <CategoryTable content={content.tiles} />
        <ProductRail />
        {/* After the rail: a shopper who did not want a single product may still
            want a whole run. Renders nothing when nothing is featured. */}
        <CollectionRail />
        <Story content={content.story} />
        <Newsletter content={content.newsletter} />
      </div>
    </main>
  );
}
