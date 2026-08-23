import PolicyPage from "@/components/PolicyPage";
import { getContent, type PolicyContent } from "@/lib/content";

/**
 * The words on this page come from `site_content`, edited at
 * /admin/pages/shipping. The eyebrow and the title stay here: they are the page's
 * identity in the navigation rather than copy somebody rewrites week to week.
 *
 * `getContent` falls back to the literals in `lib/content.ts`, so an unedited
 * shop renders exactly what it rendered before this existed.
 */
export const metadata = {
  title: "Shipping · Ramazah Store",
  description: "How your order reaches you, and how long it takes.",
};

export default async function ShippingPage() {
  const content = await getContent<PolicyContent>("shipping");

  return (
    <PolicyPage
      eyebrow="Support"
      title="Shipping and delivery"
      standfirst={content.standfirst}
      awaitingCopy={content.awaitingCopy}
      sections={content.sections}
    />
  );
}
