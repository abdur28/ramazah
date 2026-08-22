import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";
import ConditionalNavbar from "@/components/navbar/ConditionalNavbar";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import Footer from "@/components/footer/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import CartInitializerContext from "@/contexts/CartInitializerContext";
import { Toaster } from 'sonner'
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { getStoreNavigation } from "@/lib/navigation";


// Display face — never used below 28px; see docs/design-system.md
const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Interface face — all body text, labels, buttons and prices
const jost = Jost({
  // 600/700 exist for the invoice, which is set heavy like the printed
  // original. The storefront still uses 300–500 only.
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ramazah Store",
  description:
    "Coffee, spices, veils and homeware — imported from Egypt, delivered across Nigeria.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolved once here rather than in each of the five components that show a
  // menu. Falls back to the curated constants if the query fails.
  const navigation = await getStoreNavigation();
       
  //     </body>
  //   </html>
  // )

  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${jost.variable} antialiased`}
      >
        <NavigationProvider navigationAsString={JSON.stringify(navigation)}>
        <CurrencyProvider>
          <AuthProvider>
            <CartInitializerContext />
            <SmoothScrollProvider>
              <ConditionalNavbar />
              

              {children}
              <Toaster richColors/>
              <Footer />
            </SmoothScrollProvider>
          </AuthProvider>
        </CurrencyProvider>
        </NavigationProvider>
      </body>
    </html>
  );
}