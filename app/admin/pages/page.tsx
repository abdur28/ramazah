"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, FileText, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/admin/ui/PageHeader";
import SectionCard from "@/components/admin/ui/SectionCard";
import { PAGES, getEditedKeys } from "@/lib/admin/content";

/**
 * The pages whose words you can change without a developer.
 *
 * Every sentence on the home page and the six support and legal pages was a
 * string literal in a `.tsx` file, so correcting "two to three weeks" meant a
 * commit and a deploy. For a shop whose delivery time, shipping cost and returns
 * wording will all move before launch, that was the wrong shape.
 *
 * What is *not* here is as deliberate as what is. Layout, section order and
 * design stay in code — an editor that could rearrange those is an editor that
 * can produce a page which no longer looks like this shop.
 *
 * A page that has never been edited shows the words that are in the code, and
 * says so. It is not empty and saving is not required.
 */
export default function AdminPagesIndex() {
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setEdited(await getEditedKeys());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="The shop"
        title="Pages"
        description="The words and pictures on the pages that are not products. Layout stays in the design."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : (
        <SectionCard title={`${PAGES.length} pages`} flush>
          <ul className="divide-y divide-rule">
            {PAGES.map((page) => (
              <li key={page.key} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Link
                  href={`/admin/pages/${page.key}`}
                  className="group flex min-w-0 flex-1 items-center gap-3"
                >
                  <FileText className="h-4 w-4 shrink-0 text-ink-faint" />
                  <span className="min-w-0">
                    <span className="block truncate font-body text-sm text-foreground">
                      {page.label}
                    </span>
                    <span className="block truncate font-body text-xs text-ink-muted">
                      {page.note}
                    </span>
                  </span>
                </Link>

                <span
                  className={`shrink-0 rounded-sm px-2 py-0.5 font-body text-[11px] ${
                    edited.has(page.key)
                      ? "bg-sage/25 text-sage-deep"
                      : "bg-wash/60 text-ink-muted"
                  }`}
                >
                  {edited.has(page.key) ? "Edited" : "As written in the code"}
                </span>

                <a
                  href={page.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-wash hover:text-sage-deep"
                  aria-label={`Open ${page.label} on the shop`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <Link
                  href={`/admin/pages/${page.key}`}
                  className="shrink-0 rounded-sm p-1.5 text-ink-faint transition-colors hover:bg-wash hover:text-foreground"
                  aria-label={`Edit ${page.label}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <p className="max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted">
        Products, categories and collections have their own screens — this is only for the
        pages that are not built from the catalogue.
      </p>
    </div>
  );
}
