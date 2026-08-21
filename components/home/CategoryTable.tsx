"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import TiltCard from "@/components/ui/tilt-card";
import { tileImages } from "@/constants/demo";

/**
 * The whole shelf: all six top-level categories, in the order they are seeded.
 *
 * Desktop runs on **twelve** columns rather than four, which is what buys the
 * odd widths — 5 / 4 / 3 across the top, 7 / 5 across the bottom. On a
 * four-column grid every tile is a half or a quarter, the vertical seams line
 * up row to row, and the result reads as a directory however you span it.
 * Here the bottom seam falls at 7 while the rows above break at 5 and 9, so
 * nothing lines up and the eye keeps moving.
 *
 * Two tiles are double-height — Veils on the left, Beauty on the right — and
 * they are what hold the top half together while the tiles between them
 * change width. Re-cut the spans to re-merchandise the page.
 *
 * Mobile is a separate composition on two columns, untouched by any of this.
 */
const tiles = [
  {
    name: "Veils & Scarves",
    href: "/categories/veils-scarves",
    blurb: "Chiffon, jersey and embroidered, in the colours that sell.",
    image: tileImages["veils-scarves"],
    span: "col-span-2 md:col-span-5 md:row-span-2",
    feature: true,
  },
  {
    name: "Food & Pantry",
    href: "/categories/food-pantry",
    image: tileImages["food-pantry"],
    span: "md:col-span-4",
  },
  {
    name: "Beauty & Personal Care",
    href: "/categories/beauty-personal-care",
    blurb: "Oils, soaps and skincare.",
    image: tileImages["beauty-personal-care"],
    span: "md:col-span-3 md:row-span-2",
  },
  {
    name: "Kitchen & Dining",
    href: "/categories/kitchen-dining",
    image: tileImages["kitchen-dining"],
    span: "col-span-2 md:col-span-4",
  },
  {
    name: "Home & Decor",
    href: "/categories/home-decor",
    image: tileImages["home-decor"],
    span: "md:col-span-7",
  },
  {
    name: "School & Stationery",
    href: "/categories/school-stationery",
    image: tileImages["school-stationery"],
    span: "md:col-span-5",
  },
];

export default function CategoryTable() {
  return (
    /* The section pins and the product rail scrolls up over it.
    
       A pinned block has to fit the screen for that to read: anything taller
       either hides its own bottom (top pin) or gives the rail nothing to climb
       over (bottom pin — it only holds once the grid has already gone past).
       So the section is exactly one viewport at every size, and the grid rows
       are fractions of whatever is left after the header.

       `100svh` rather than `100vh`, because mobile browsers measure `vh`
       against the *largest* viewport — the one with the address bar collapsed —
       so a `100vh` section is taller than the screen for most of the scroll,
       which is the same bug again. */
    <section className="sticky top-0 z-0 h-[100svh] bg-background">
      <div className="mx-auto flex h-full flex-col px-6 py-10 md:px-10 md:py-14 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mb-5 flex shrink-0 flex-wrap items-end justify-between gap-4 md:mb-8 lg:mb-10"
        >
          <div>
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              The whole shelf
            </p>
            <h2 className="mt-2 font-heading text-[32px] font-light leading-tight text-foreground md:mt-3 md:text-5xl">
              Six aisles, one crate
            </h2>
          </div>
          <p className="hidden max-w-[40ch] font-body text-sm text-ink-muted md:block">
            Everything arrives together, so a tray, a kilo of coffee and a term&rsquo;s
            exercise books ship as one delivery.
          </p>
        </motion.div>

        {/* Two columns on a phone; twelve on desktop over three fixed rows,
            the last one deeper than the two above it. */}
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[1.2fr_1fr_1.1fr_1fr] gap-2.5 md:grid-cols-12 md:grid-rows-[1fr_1fr_1.25fr] md:gap-3">
          {tiles.map((tile, index) => (
            <motion.div
              key={tile.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className={tile.span}
            >
              <Link href={tile.href} className="block h-full">
                <TiltCard className="h-full">
                  <div className="relative h-full w-full">
                    <Image
                      src={tile.image.src}
                      alt={tile.image.alt}
                      fill
                      sizes="(max-width: 768px) 50vw, 45vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 p-3.5 md:p-5 lg:p-6">
                      <h3
                        className={`font-heading font-light leading-tight text-background ${
                          tile.feature ? "text-[32px] md:text-4xl lg:text-5xl" : "text-[28px]"
                        }`}
                      >
                        {tile.name}
                      </h3>
                      {tile.blurb && (
                        <p className="mt-2 hidden max-w-[32ch] font-body text-sm text-background/75 md:block">
                          {tile.blurb}
                        </p>
                      )}
                    </div>
                  </div>
                </TiltCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
