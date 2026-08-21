"use client";

import { motion } from "framer-motion";

/**
 * A hairline band under the hero: how the shop works, in three phrases.
 *
 * It began as three icons, each with a heading and a sentence, which read as a
 * feature list. Everything a first-time visitor needs from it fits in nine
 * words, and the quiet is what makes it look expensive.
 *
 * Three different promises, not three ways of saying "we ship things": where it
 * comes from, what the service actually is, and how fast it can be.
 *
 * "Shopped to order" is the business's own headline — *tell us what you need
 * and we'll do the rest* — which nothing else on the page says this plainly.
 *
 * The 2–3 week standard lead time used to sit here and does not any more. A
 * band under the hero is the wrong place to make a delivery commitment; it
 * belongs on the product page and at checkout, where it binds. Until it lands
 * there, the site does not state it anywhere.
 */
const marks = ["Sourced in Egypt", "Shopped to order", "Express when you need it"];

export default function TrustStrip() {
  return (
    <section className="border-b border-rule bg-background">
      <div className="mx-auto grid divide-y divide-rule px-6 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-10">
        {marks.map((mark, index) => (
          <motion.p
            key={mark}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: index * 0.12 }}
            className="py-6 text-center font-body text-[11px] uppercase tracking-[0.2em] text-ink-muted md:py-7"
          >
            {mark}
          </motion.p>
        ))}
      </div>
    </section>
  );
}
