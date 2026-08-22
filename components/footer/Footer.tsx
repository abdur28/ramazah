"use client";

import { useState } from "react";
import BrandMark from "@/components/brand/BrandMark";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Check, MessageCircle, Instagram, Facebook } from "lucide-react";
import { socialLinks } from "@/constants/navigation";
import { useNavigation } from "@/contexts/NavigationContext";
import { availableCurrencies } from "@/constants";
import { useCurrency } from "@/contexts/CurrencyContext";
import { subscribeToNewsletter } from "@/lib/newsletter";

/**
 * The footer, on the ink ground with the wordmark set oversized behind it.
 *
 * Every link resolves. It used to carry nine routes that were never built —
 * /about, /faq, /shipping, /returns, /size-guide, /track, /privacy, /terms,
 * /cookies — plus /clothings and hoodhub.ru, and a Visa / Mastercard / PayPal /
 * Apple Pay row for payments Ramazah does not take. Support and Legal now point
 * at real pages; Shop is generated from the same source as the bar and the menu.
 *
 * The subscribe form is real too: it writes to `newsletter_subscribers`, where
 * anonymous visitors may insert and nothing else. It used to call `console.log`
 * and then tell the customer they were subscribed.
 */

const socialIcons: Record<string, typeof Instagram> = {
  WhatsApp: MessageCircle,
  Instagram,
  Facebook,
};

const footerLinks = {
  support: [
    { name: "FAQ", href: "/faq" },
    { name: "Shipping & delivery", href: "/shipping" },
    { name: "Returns", href: "/returns" },
    { name: "Contact us", href: "/contact" },
  ],
  legal: [
    { name: "Privacy policy", href: "/privacy" },
    { name: "Terms of service", href: "/terms" },
    { name: "Cookies", href: "/cookies" },
  ],
  account: [
    { name: "My account", href: "/dashboard" },
    { name: "Orders", href: "/dashboard/orders" },
    { name: "Wishlist", href: "/dashboard/wishlist" },
    { name: "Sign in", href: "/auth/login" },
  ],
};

export default function Footer() {
  const pathname = usePathname();
  // Full names in the footer: there is a column of width here, unlike the bar.
  const { items } = useNavigation();
  const shopLinks = items.filter((item) => item.href.startsWith("/categories"));
  const { selectedCurrency, setSelectedCurrency } = useCurrency();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  const handleSubscribe = async () => {
    if (status === "saving") return;

    setStatus("saving");
    setError(null);

    const { error: subscribeError } = await subscribeToNewsletter(email);

    if (subscribeError) {
      setError(subscribeError);
      setStatus("idle");
      return;
    }

    setEmail("");
    setStatus("done");
    setTimeout(() => setStatus("idle"), 4000);
  };

  const columnHeading =
    "font-body text-[11px] uppercase tracking-[0.18em] text-background/45";
  const columnLink =
    "font-body text-sm text-background/70 transition-colors hover:text-background";

  const activeSocials = socialLinks.filter((social) => social.href);

  return (
    <footer className="relative z-10 overflow-hidden bg-foreground text-background">
      {/* The wordmark, oversized. Set in Jost with wide tracking rather than the
          display serif, because that is what the real logotype is. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 flex select-none justify-center"
      >
        <span className="translate-y-[22%] font-body text-[22vw] font-light leading-none tracking-[0.14em] text-background/[0.045]">
          RAMAZAH
        </span>
      </div>

      {/* Subscribe */}
      <div className="relative border-b border-background/15">
        <div className="mx-auto grid gap-8 px-6 py-12 md:grid-cols-2 md:items-center md:gap-16 md:px-10">
          <div>
            {/* Deliberately not the home page's wording: that section sits a
                screen above this one and already says "Know when the next crate
                lands". Same offer, said shorter, the way a footer should. */}
            <h2 className="max-w-[20ch] font-heading text-[30px] font-light leading-tight text-background md:text-4xl">
              Restocks, by email
            </h2>
            <p className="mt-3 max-w-[46ch] font-body text-sm text-background/70">
              One note when a consignment lands. Nothing else, ever.
            </p>
          </div>

          <div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-background/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                  placeholder="Your email address"
                  aria-label="Email address"
                  className="w-full rounded-sm border border-background/20 bg-background/5 py-3.5 pl-10 pr-4 font-body text-sm text-background transition-colors placeholder:text-background/40 focus:border-background/60 focus:outline-none"
                />
              </div>
              <motion.button
                onClick={handleSubscribe}
                disabled={status === "saving"}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 rounded-sm bg-background px-7 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-sage-deep hover:text-background disabled:opacity-60"
              >
                {status === "done" ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Subscribed
                  </>
                ) : (
                  <>
                    {status === "saving" ? "Saving" : "Subscribe"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </motion.button>
            </div>

            <p
              className={`mt-3 font-body text-xs ${
                error ? "text-destructive" : "text-background/45"
              }`}
            >
              {error ??
                (status === "done"
                  ? "You are on the list. Unsubscribe from any email."
                  : "Restocks and arrivals only. Unsubscribe any time.")}
            </p>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="relative mx-auto px-6 py-14 md:px-10 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-4">
            <BrandMark variant="inverse" className="flex flex-col" />

            <p className="mt-5 max-w-[36ch] font-body text-sm text-background/70">
              A personal shopping and shipping service from Egypt to Nigeria. Stocked
              here, or sourced to order.
            </p>

            {activeSocials.length > 0 && (
              <div className="mt-6 flex gap-2">
                {activeSocials.map((social) => {
                  const Icon = socialIcons[social.name] ?? MessageCircle;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.name}
                      className="rounded-full border border-background/20 p-2.5 text-background/70 transition-colors hover:border-background hover:text-background"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Inline pills rather than the dropdown, which rendered its ink
                label on this ink ground and could not be read. */}
            <div className="mt-8">
              <h3 className={columnHeading}>Currency</h3>
              <div className="mt-3 flex gap-2">
                {availableCurrencies.map((option) => {
                  const isSelected = option.code === selectedCurrency;
                  return (
                    <button
                      key={option.code}
                      onClick={() => setSelectedCurrency(option.code)}
                      aria-pressed={isSelected}
                      className={`rounded-sm border px-3 py-1.5 font-body text-xs transition-colors ${
                        isSelected
                          ? "border-background bg-background text-foreground"
                          : "border-background/20 text-background/70 hover:border-background hover:text-background"
                      }`}
                    >
                      {option.symbol} {option.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Shop */}
          <div className="md:col-span-2">
            <h3 className={columnHeading}>Shop</h3>
            <ul className="mt-4 space-y-2.5">
              {shopLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className={columnLink}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="md:col-span-2">
            <h3 className={columnHeading}>Support</h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className={columnLink}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div className="md:col-span-2">
            <h3 className={columnHeading}>Account</h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.account.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className={columnLink}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="md:col-span-1">
            <h3 className={columnHeading}>Legal</h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className={columnLink}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-background/15 pt-6">
          <p className="font-body text-xs text-background/50">
            © {new Date().getFullYear()} Ramazah. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
