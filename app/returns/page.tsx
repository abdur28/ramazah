import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Returns · Ramazah Store",
  description: "How to raise a problem with an order at Ramazah.",
};

export default function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Support"
      title="Returns and problems"
      standfirst="If something arrives damaged, wrong or short, tell us and we will put it right."
      awaitingCopy
      sections={[
        {
          heading: "Damaged or incorrect items",
          body: [
            "Photograph the item and the packaging and send them to us within a few days of delivery, quoting your order number. We deal with breakages and picking mistakes ourselves.",
          ],
        },
        {
          heading: "Perishables",
          body: [
            "Food and cosmetics cannot be returned once opened, for the same reason no grocer takes back an opened bag of coffee. If a perishable arrives past its expiry date, that is on us — tell us and we will replace or refund it.",
          ],
        },
        {
          heading: "Sourced-to-order items",
          body: [
            "Items bought specifically at your request are not stock, so they are handled case by case. We will always tell you before buying whether a request can be returned.",
          ],
        },
      ]}
    />
  );
}
