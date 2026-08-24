import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

/**
 * The 404.
 *
 * Next's default is a black-and-white "This page could not be found" with no
 * navigation off it, and it is not a rare screen here: seven routes call
 * `notFound()`, and one of them is `/product/[slug]`. Products are archived
 * rather than deleted so order history keeps its references — which means every
 * archived product leaves a live URL that someone has bookmarked, shared on
 * WhatsApp, or is holding in a search result.
 *
 * So this is written for the likeliest visitor: not somebody who typed a URL
 * wrong, but somebody who followed a good link to something that has since gone.
 * The routes out are the point.
 */
export const metadata = {
  title: "Not found · Ramazah Store",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 pb-24 pt-32 md:pt-40">
      <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        404
      </p>

      <h1 className="mt-4 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
        This one has gone.
      </h1>

      <p className="mt-4 max-w-[52ch] font-body text-sm leading-relaxed text-ink-muted">
        Either the address is wrong, or what was here has been taken off the shop.
        Things sell out and runs end — that part is normal. Everything below is
        still where it was.
      </p>

      <div className="mt-10 flex flex-col gap-3 border-t border-rule pt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-body text-sm font-medium text-sage-deep transition-colors hover:text-foreground"
        >
          Back to the shop
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
        <Link
          href="/collections"
          className="group inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          Collections
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
        <Link
          href="/search"
          className="group inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          Search for it
        </Link>
      </div>

      {/* The thing this shop leads with, and the honest answer to "it is gone". */}
      <div className="mt-10 rounded-sm bg-wash/60 p-6">
        <h2 className="font-heading text-2xl font-light text-foreground">
          Was it something specific?
        </h2>
        <p className="mt-2 max-w-[52ch] font-body text-sm leading-relaxed text-ink-muted">
          Tell us what you were after and we will look for it on the next buying
          run, then come back with a price before buying anything.
        </p>
        <Link
          href="/dashboard/requests"
          className="group mt-4 inline-flex items-center gap-2 font-body text-sm font-medium text-sage-deep transition-colors hover:text-foreground"
        >
          Ask us to find it
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </main>
  );
}
