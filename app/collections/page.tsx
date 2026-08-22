import Link from "next/link"
import Image from "next/image"
import { getCollectionSummaries } from "@/lib/products"

/**
 * Every collection.
 *
 * Worth its own page rather than only living in the navbar: a collection is a
 * thing you send someone, and the index is what you send when you mean "look at
 * what we have put together" rather than one particular edit.
 */
export const metadata = {
  title: "Collections · Ramazah",
  description: "Edits and buying runs — things chosen to go together.",
}

export default async function CollectionsPage() {
  const { collections } = await getCollectionSummaries()
  // An empty collection renders an empty page; it does not belong on the index.
  const shown = collections.filter((collection) => collection.productCount > 0)

  return (
    <main className="relative min-h-screen bg-background pt-16 md:pt-20">
      <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-6 md:py-14">
        <header className="mb-10 border-b border-rule pb-8">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Ramazah
          </p>
          <h1 className="mt-2 font-heading text-[32px] font-light leading-none tracking-[0.02em] text-foreground md:text-5xl">
            Collections
          </h1>
          <p className="mt-4 max-w-[58ch] font-body text-sm leading-relaxed text-ink-muted">
            A buying run comes back with veils, coffee and brassware together — which is
            not a shelf, and not a category. These are those.
          </p>
        </header>

        {shown.length === 0 ? (
          <p className="py-20 text-center font-body text-sm text-ink-muted">
            No collections yet. They appear here once there is something in them.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="group block overflow-hidden rounded-sm border border-rule bg-card transition-colors hover:border-sage"
                >
                  <div className="relative aspect-[16/10] bg-wash">
                    {collection.bannerUrl && (
                      <Image
                        src={collection.bannerUrl}
                        alt={collection.bannerAlt ?? ""}
                        fill
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="font-heading text-2xl font-light leading-none text-foreground">
                      {collection.name}
                    </h2>
                    {collection.description && (
                      <p className="mt-2.5 line-clamp-2 font-body text-sm leading-relaxed text-ink-muted">
                        {collection.description}
                      </p>
                    )}
                    <p className="mt-3 font-body text-xs tabular-nums text-ink-muted">
                      {collection.productCount}{" "}
                      {collection.productCount === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
