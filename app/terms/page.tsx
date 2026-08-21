import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Terms of service · Ramazah Store",
  description: "The terms you agree to when ordering from Ramazah.",
};

export default function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms of service"
      standfirst="The agreement between you and Ramazah when you place an order."
      awaitingCopy
      sections={[
        {
          heading: "Orders and invoices",
          body: [
            "Placing an order on this site is a request to buy, not a completed sale. The sale is agreed when we issue your invoice, and goods are dispatched once it is settled.",
            "Prices are shown in Naira. Currency conversions elsewhere on the site are for guidance only.",
          ],
        },
        {
          heading: "Sourced-to-order items",
          body: [
            "Where we buy an item at your request, we confirm the price with you before purchase. Once bought on your behalf, it is yours.",
          ],
        },
        {
          heading: "The full terms",
          body: [
            "The complete terms — including liability, cancellation and dispute resolution — are being prepared and will be published here.",
          ],
        },
      ]}
    />
  );
}
