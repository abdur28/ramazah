"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Instagram, Twitter, Facebook, Youtube } from "lucide-react";
import CrossedLink from "@/components/ui/crossed-link";
import { usePathname } from "next/navigation";
import CurrencySwitcher from "../CurrencySwitcher";

const footerLinks = {
  shop: [
    { name: "Clothings", href: "/clothings" },
    { name: "Accessories", href: "/accessories" },
    { name: "Candles & Matches", href: "/candles-matches" },
    { name: "Artwork", href: "/artwork" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Hoodhub", href: "/hoodhub" },
    { name: "Contact", href: "/contact" },
    { name: "FAQ", href: "/faq" },
  ],
  support: [
    { name: "Shipping Info", href: "/shipping" },
    { name: "Returns", href: "/returns" },
    { name: "Size Guide", href: "/size-guide" },
    { name: "Track Order", href: "/track" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
    { name: "Cookie Policy", href: "/cookies" },
  ],
};

const socialLinks = [
  { name: "Instagram", href: "#", icon: Instagram },
  { name: "Twitter", href: "#", icon: Twitter },
  { name: "Facebook", href: "#", icon: Facebook },
  { name: "Youtube", href: "#", icon: Youtube },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const pathname = usePathname();

  if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return null;
  }

  const handleSubmit = () => {
    if (email && email.includes("@")) {
      console.log("Email submitted:", email);
      setIsSubmitted(true);
      setEmail("");
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <footer className="relative bg-black text-white overflow-hidden">
      {/* Large Brand Text Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <h2 className="font-heading text-[24vw] md:text-[24vw] lg:text-[24rem] tracking-wider text-white/5 leading-none select-none pb-8">
          RAMAZAH
        </h2>
      </div>

      {/* Newsletter Section */}
      <div className="relative z-10 border-b border-white/10">
        <div className=" mx-auto px-6 py-10 md:py-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left - Text */}
            <div>
              <h3 className="font-heading text-3xl md:text-4xl tracking-wider mb-3">
                JOIN THE HOOD
              </h3>
              <p className="font-body text-sm text-white/70">
                Subscribe to get 10% off your first order, plus exclusive drops and street style updates.
              </p>
            </div>

            {/* Right - Newsletter Input */}
            <div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-sm text-white placeholder:text-white/40 font-body text-sm focus:outline-none focus:border-[#F8E231] transition-all"
                  />
                </div>
                <motion.button
                  onClick={handleSubmit}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-[#F8E231] text-black font-body text-sm font-semibold rounded-sm hover:bg-white transition-colors flex items-center gap-2"
                >
                  {isSubmitted ? "Subscribed!" : "Subscribe"}
                  {!isSubmitted && <ArrowRight className="h-4 w-4" />}
                </motion.button>
              </div>
              <p className="text-xs text-white/50 mt-3 font-body">
                No spam, just culture. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative z-10 mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/ramazah-logo.png"
                alt="Ramazah"
                width={150}
                height={90}
                className="h-12 w-auto brightness-0 invert"
              />
            </Link>
            <p className="font-body text-sm text-white/70 mb-6 max-w-xs">
              Ramazah is your destination for authentic streetwear that speaks to the culture.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-white/10 rounded-full hover:bg-[#F8E231] transition-colors group"
                    aria-label={social.name}
                  >
                    <Icon className="h-4 w-4 text-white group-hover:text-black transition-colors" />
                  </a>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-4">
                <span className="font-body text-sm text-white/70">Currency</span>
                <CurrencySwitcher />  
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="font-heading text-sm tracking-wider mb-4">SHOP</h4>
            <ul className="space-y-2">
              {footerLinks.shop.map((link) => (
                <li key={link.name}>
                  <CrossedLink
                    href={link.href}
                    lineColor="gold"
                    lineWidth={1}
                    animationDuration={0.2}
                  >
                    <span className="font-body text-sm text-white/70 hover:text-white transition-colors">
                      {link.name}
                    </span>
                  </CrossedLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-heading text-sm tracking-wider mb-4">COMPANY</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <CrossedLink
                    href={link.href}
                    lineColor="gold"
                    lineWidth={1}
                    animationDuration={0.2}
                  >
                    <span className="font-body text-sm text-white/70 hover:text-white transition-colors">
                      {link.name}
                    </span>
                  </CrossedLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="font-heading text-sm tracking-wider mb-4">SUPPORT</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <CrossedLink
                    href={link.href}
                    lineColor="gold"
                    lineWidth={1}
                    animationDuration={0.2}
                  >
                    <span className="font-body text-sm text-white/70 hover:text-white transition-colors">
                      {link.name}
                    </span>
                  </CrossedLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-heading text-sm tracking-wider mb-4">LEGAL</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <CrossedLink
                    href={link.href}
                    lineColor="gold"
                    lineWidth={1}
                    animationDuration={0.2}
                  >
                    <span className="font-body text-sm text-white/70 hover:text-white transition-colors">
                      {link.name}
                    </span>
                  </CrossedLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-body text-xs text-white/50">
              © {new Date().getFullYear()} Ramazah. All rights reserved.
            </p>
            
            {/* Payment Methods */}
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-white/50 mr-2">We accept:</span>
              <div className="flex gap-2">
                {["Visa", "Mastercard", "PayPal", "Apple Pay"].map((method) => (
                  <div
                    key={method}
                    className="px-2 py-1 bg-white/10 rounded text-xs font-body text-white/70"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}