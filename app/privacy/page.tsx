import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Privacy policy · Ramazah Store",
  description: "How Ramazah handles your personal information.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Privacy policy"
      standfirst="What we hold, why we hold it, and what we never do with it."
      awaitingCopy
      sections={[
        {
          heading: "What the site stores",
          body: [
            "An account holds your name, email address, phone number and delivery address, along with your order history and anything you save to your wishlist.",
            "Email preferences are yours to change at any time under Account, and unsubscribing from newsletters does not stop order emails.",
          ],
        },
        {
          heading: "What we do not do",
          body: [
            "We do not sell your details, and we do not take card numbers — payment is by transfer against an invoice, so no card data ever reaches this site.",
          ],
        },
        {
          heading: "The full policy",
          body: [
            "The complete policy, including retention periods and how to request deletion of your data, is being prepared. You can delete your account yourself at any time from Account settings.",
          ],
        },
      ]}
    />
  );
}
