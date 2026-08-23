import PolicyPage from "@/components/PolicyPage";
import { getContent, type PolicyContent } from "@/lib/content";

/**
 * The words on this page come from `site_content`, edited at
 * /admin/pages/terms. The eyebrow and the title stay here: they are the page's
 * identity in the navigation rather than copy somebody rewrites week to week.
 *
 * `getContent` falls back to the literals in `lib/content.ts`, so an unedited
 * shop renders exactly what it rendered before this existed.
 */
export const metadata = {
  title: "Terms of service · Ramazah Store",
  description: "The terms you agree to when ordering from Ramazah Store.",
};

export default async function TermsPage() {
  const content = await getContent<PolicyContent>("terms");

  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms of service"
      standfirst={content.standfirst}
      awaitingCopy={content.awaitingCopy}
      sections={content.sections}
    />
  );
}
