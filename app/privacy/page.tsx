import PolicyPage from "@/components/PolicyPage";
import { getContent, type PolicyContent } from "@/lib/content";

/**
 * The words on this page come from `site_content`, edited at
 * /admin/pages/privacy. The eyebrow and the title stay here: they are the page's
 * identity in the navigation rather than copy somebody rewrites week to week.
 *
 * `getContent` falls back to the literals in `lib/content.ts`, so an unedited
 * shop renders exactly what it rendered before this existed.
 */
export const metadata = {
  title: "Privacy policy · Ramazah Store",
  description: "How Ramazah Store handles your personal information.",
};

export default async function PrivacyPage() {
  const content = await getContent<PolicyContent>("privacy");

  return (
    <PolicyPage
      eyebrow="Legal"
      title="Privacy policy"
      standfirst={content.standfirst}
      awaitingCopy={content.awaitingCopy}
      sections={content.sections}
    />
  );
}
