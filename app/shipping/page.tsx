import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Shipping & delivery · Ramazah Store",
  description: "Delivery times, express shipping and coverage across Nigeria.",
};

export default function ShippingPage() {
  return (
    <PolicyPage
      eyebrow="Support"
      title="Shipping and delivery"
      standfirst="Goods are bought in Egypt and brought in by the crate, so plan for weeks rather than days."
      sections={[
        {
          heading: "Standard shipping — two to three weeks",
          body: [
            "The default. Your order joins the next consignment out of Egypt and is delivered to your address anywhere in Nigeria.",
          ],
        },
        {
          heading: "Express — faster, at extra cost",
          body: [
            "If you need something sooner, say so before ordering and we will quote the surcharge. Express is priced per order, because it depends on weight and destination.",
          ],
        },
        {
          heading: "Where we deliver",
          body: [
            "Anywhere in Nigeria. Delivery cost is shown at checkout, and larger orders ship free — the threshold is displayed in your cart as you add items.",
          ],
        },
        {
          heading: "Tracking your order",
          body: [
            "Order status is on your account under Orders, and we email you when the consignment lands and when your parcel goes out for delivery.",
          ],
        },
      ]}
    />
  );
}
