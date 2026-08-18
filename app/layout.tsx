import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ConditionalNavbar from "@/components/navbar/ConditionalNavbar";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import Footer from "@/components/footer/Footer";
import Image from "next/image";
import { AuthProvider } from "@/contexts/AuthContext";
import CartInitializerContext from "@/contexts/CartInitializerContext";
import { Toaster } from 'sonner'
import { CurrencyProvider } from "@/contexts/CurrencyContext";


const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sluggerMonogram = localFont({
  src: "./fonts/Slugger-Monogram.otf",
  variable: "--font-slugger-monogram",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Ramazah - Urban Streetwear",
  description: "Unique streetwear brand for the culture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // return (
  //   <html lang="en">
  //     <body
  //       className={`${bebasNeue.variable} ${inter.variable} ${sluggerMonogram.variable} antialiased`}
  //     >
       
  //     </body>
  //   </html>
  // )

  return (
    <html lang="en">
      <body
        className={`${bebasNeue.variable} ${inter.variable} ${sluggerMonogram.variable} antialiased`}
      >
        <CurrencyProvider>
          <AuthProvider>
            <CartInitializerContext />
            <SmoothScrollProvider>
              <ConditionalNavbar />
              
              {/* Skull Watermark */}
              <div className="fixed inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="relative w-[60vw] h-[60vw] md:w-[50vw] md:h-[50vw] lg:w-[40vw] lg:h-[40vw] opacity-[2.5%]">
                  <Image
                    src="/skull.svg"
                    alt=""
                    fill
                    className="object-contain select-none"
                    priority
                  />
                </div>
              </div>

              {children}
              <Toaster richColors/>
              <Footer />
            </SmoothScrollProvider>
          </AuthProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}