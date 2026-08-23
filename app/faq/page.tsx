import PolicyPage from "@/components/PolicyPage";
import { getContent, type PolicyContent } from "@/lib/content";

/**
 * The words on this page come from `site_content`, edited at
 * /admin/pages/faq. The eyebrow and the title stay here: they are the page's
 * identity in the navigation rather than copy somebody rewrites week to week.
 *
 * `getContent` falls back to the literals in `lib/content.ts`, so an unedited
 * shop renders exactly what it rendered before this existed.
 */
export const metadata = {
  title: "FAQ · Ramazah Store",
  description: "How ordering, sourcing, payment and delivery work at Ramazah Store.",
};

export default async function FaqPage() {
  const content = await getContent<PolicyContent>("faq");

  return (
    <PolicyPage
      eyebrow="Support"
      title="Questions we are asked"
      standfirst={content.standfirst}
      awaitingCopy={content.awaitingCopy}
      sections={content.sections}
    />
  );
}
