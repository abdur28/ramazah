import Hero from "@/components/home/Hero";
import TrustStrip from "@/components/home/TrustStrip";
import CategoryBand from "@/components/home/CategoryBand";
import ProductRail from "@/components/home/ProductRail";
import CategoryTable from "@/components/home/CategoryTable";
import CollectionRail from "@/components/home/CollectionRail";
import Story from "@/components/home/Story";
import Newsletter from "@/components/home/Newsletter";
import { bandImages } from "@/constants/demo";

/**
 * Editorial bands for the two lead categories, a weighted table for the rest.
 *
 * Everything below the hero scrolls over it, so the stack carries its own
 * opaque ground and sits above it — that is what makes the sticky hero read as
 * depth rather than as a bug.
 */
export default function Home() {
  return (
    <main className="relative">
      <Hero />

      <div className="relative z-10 bg-background">
        <TrustStrip />

        <CategoryBand
          eyebrow="Veils & Scarves"
          title="Chiffon that behaves in the heat"
          body="Plain, embroidered and jersey veils in the colours that actually sell, picked in person at the market rather than from a supplier catalogue."
          href="/categories/veils-scarves"
          image={bandImages["veils-scarves"]}
          imageSide="right"
        />

        <CategoryBand
          eyebrow="Coffee & Tea"
          title="Ground the morning it ships"
          body="Egyptian coffee in 250g and 1kg, whole bean or ground to your grind, alongside hibiscus and loose black tea."
          href="/categories/food-pantry/coffee-tea"
          image={bandImages["coffee-tea"]}
          imageSide="left"
        />

        {/* Breadth before depth-on-a-sample: the bands cover two categories, so
            the table has to finish the shelf before four products stand in for
            it. Someone here to restock cumin should not have to scroll past a
            rail that probably does not contain cumin to learn there is a spice
            aisle at all. */}
        <CategoryTable />
        <ProductRail />
        {/* After the rail: a shopper who did not want a single product may still
            want a whole run. Renders nothing when nothing is featured. */}
        <CollectionRail />
        <Story />
        <Newsletter />
      </div>
    </main>
  );
}
