import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Cookie policy · Ramazah Store",
  description: "The cookies and local storage this site uses.",
};

export default function CookiesPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Cookies"
      standfirst="This site sets very little, and none of it is advertising."
      awaitingCopy
      sections={[
        {
          heading: "Signing in",
          body: [
            "A session cookie keeps you signed in and is refreshed as you browse. Without it you would be signed out on every page.",
          ],
        },
        {
          heading: "Your basket and preferences",
          body: [
            "Your basket, your chosen currency and your recent searches are kept in your browser's local storage on your own device, so they survive a refresh. Clearing your browser data clears them.",
          ],
        },
        {
          heading: "What is not here",
          body: [
            "No advertising trackers and no third-party analytics cookies are set by this site.",
          ],
        },
      ]}
    />
  );
}
