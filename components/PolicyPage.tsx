import Link from "next/link";

/**
 * The shared shell for the footer's Support and Legal pages.
 *
 * These exist because the footer linked to nine routes that were never built —
 * /faq, /shipping, /returns, /privacy, /terms, /cookies among them — so every
 * one of those links 404'd.
 *
 * Where the answer is known it is written out. Where it is a policy the
 * business has to set — refund windows, data handling, contract terms — the
 * page says so and points at Contact rather than inventing terms that would be
 * quoted back at Ramazah later.
 */

export interface PolicySection {
  heading: string;
  body: string[];
}

interface PolicyPageProps {
  eyebrow: string;
  title: string;
  standfirst?: string;
  sections: PolicySection[];
  /** Shown when the page is a placeholder for text only the client can write. */
  awaitingCopy?: boolean;
}

export default function PolicyPage({
  eyebrow,
  title,
  standfirst,
  sections,
  awaitingCopy = false,
}: PolicyPageProps) {
  return (
    <main className="min-h-screen bg-background pt-16 md:pt-20">
      <div className="mx-auto px-6 py-16 md:px-10 md:py-24">
        <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-[18ch] font-heading text-[40px] font-light leading-[1.05] text-foreground md:text-6xl">
          {title}
        </h1>
        {standfirst && (
          <p className="mt-6 max-w-[60ch] font-body text-base text-ink-muted md:text-lg">
            {standfirst}
          </p>
        )}

        <div className="mt-14 max-w-[68ch] border-t border-rule">
          {sections.map((section) => (
            <section key={section.heading} className="border-b border-rule py-8">
              <h2 className="font-body text-sm font-medium text-foreground">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="font-body text-sm text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 max-w-[68ch] rounded-sm border border-rule bg-wash px-6 py-5">
          <p className="font-body text-sm text-ink-muted">
            {awaitingCopy
              ? "This policy is still being finalised. Until it is published here, ask us directly and we will answer in writing."
              : "Anything not covered here, ask us — we answer every message."}{" "}
            <Link
              href="/contact"
              className="font-medium text-sage-deep underline-offset-4 hover:underline"
            >
              Contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
