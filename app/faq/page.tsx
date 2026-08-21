import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "FAQ · Ramazah Store",
  description: "How ordering, sourcing, payment and delivery work at Ramazah.",
};

export default function FaqPage() {
  return (
    <PolicyPage
      eyebrow="Support"
      title="Questions we are asked"
      standfirst="How the shop works, in the order people usually ask."
      sections={[
        {
          heading: "Can you get something that is not on the site?",
          body: [
            "Yes — that is the main service. Send us the item, a photo or a link, and we source it in Egypt on the next run and ship it with everything else.",
            "Tell us your budget and the quantity when you write, and we will come back with a price before anything is bought.",
          ],
        },
        {
          heading: "How do I pay?",
          body: [
            "Place the order on the site and you will receive an invoice. Settle it by bank transfer. There is no card payment on the site.",
            "Nothing ships until the invoice is settled.",
          ],
        },
        {
          heading: "How long does delivery take?",
          body: [
            "Standard shipping takes two to three weeks door to door, anywhere in Nigeria. Express is available for an extra cost when you are in a hurry — ask before you order and we will quote it.",
          ],
        },
        {
          heading: "Is the food fresh?",
          body: [
            "Perishables carry an expiry date on the product page, and the system refuses to sell stock that has passed it. Coffee is ground to your grind rather than in advance.",
          ],
        },
        {
          heading: "Do you have a shop I can visit?",
          body: [
            "Not yet. Everything is ordered here or through WhatsApp, and delivered.",
          ],
        },
      ]}
    />
  );
}
