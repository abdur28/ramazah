"use client"

import { motion } from "framer-motion"
import { Mail, Phone, MapPin, MessageCircle, Instagram, Facebook, Twitter } from "lucide-react"
import { useSettings } from "@/contexts/SettingsContext"

/**
 * How to reach the shop.
 *
 * Every detail on this page was hoodskool's, and live: `contact@ramazah.com`,
 * the phone number **+7 977 600-01-46**, and "Leninsky Avenue, 146, Moscow,
 * 117198" — a Moscow address on a Nigerian shop's contact page. The socials
 * pointed at instagram.com and facebook.com, the bare domains.
 *
 * It reads Settings now, and shows nothing rather than something wrong: an
 * unset phone number is simply absent, which is honest, where a placeholder is
 * a number somebody will try to ring.
 */
export default function ContactInfo() {
  const { contact } = useSettings()

  const location = [contact.addressLine, contact.city, contact.country]
    .filter(Boolean)
    .join(", ")

  const contactDetails = [
    contact.email && {
      icon: Mail,
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    },
    contact.whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: contact.phone || `+${contact.whatsapp}`,
      href: `https://wa.me/${contact.whatsapp}`,
    },
    contact.phone && {
      icon: Phone,
      label: "Phone",
      value: contact.phone,
      href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
    },
    location && {
      icon: MapPin,
      label: "Where we are",
      value: location,
      href: contact.mapUrl || undefined,
    },
  ].filter(Boolean) as {
    icon: typeof Mail; label: string; value: string; href?: string
  }[]

  const socialLinks = [
    contact.instagram && { icon: Instagram, href: contact.instagram, label: "Instagram" },
    contact.facebook && { icon: Facebook, href: contact.facebook, label: "Facebook" },
    contact.x && { icon: Twitter, href: contact.x, label: "X" },
  ].filter(Boolean) as { icon: typeof Instagram; href: string; label: string }[]

  // A row with only a day or only a time is half-filled rather than a line
  // worth printing, so it does not count towards showing the block.
  const hours = contact.openingHours.filter((row) => row.days.trim() && row.hours.trim())

  return (
    <div className="space-y-12">
      {/* Contact Details */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="space-y-6"
      >
        <h3 className="text-2xl font-heading tracking-wide mb-6">GET IN TOUCH</h3>

        {contactDetails.map((detail, index) => (
          <motion.a
            key={detail.label}
            href={detail.href}
            target={detail.label === "Location" ? "_blank" : undefined}
            rel={detail.label === "Location" ? "noopener noreferrer" : undefined}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex items-start gap-4 group hover:text-sage-light transition-colors"
          >
            <detail.icon className="w-5 h-5 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground mb-1">{detail.label}</p>
              <p className="font-medium">{detail.value}</p>
            </div>
          </motion.a>
        ))}
      </motion.div>

      {/* Social Links */}
      {socialLinks.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="space-y-4"
      >
        <h3 className="text-2xl font-heading tracking-wide mb-6">FOLLOW US</h3>

        <div className="flex gap-4">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 border border-border flex items-center justify-center hover:border-sage hover:text-sage-light transition-all"
              aria-label={social.label}
            >
              <social.icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      </motion.div>
      )}

      {/* Business Hours */}
      {hours.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="text-2xl font-heading tracking-wide mb-6">BUSINESS HOURS</h3>

          <div className="space-y-2 text-sm">
            {hours.map((row) => (
              <div key={row.days} className="flex justify-between">
                <span className="text-muted-foreground">{row.days}</span>
                <span className="font-medium">{row.hours}</span>
              </div>
            ))}
          </div>
      </motion.div>
      )}
    </div>
  )
}
