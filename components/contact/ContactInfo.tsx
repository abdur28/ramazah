"use client"

import { motion } from "framer-motion"
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter } from "lucide-react"

export default function ContactInfo() {
  const contactDetails = [
    {
      icon: Mail,
      label: "Email",
      value: "contact@ramazah.com",
      href: "mailto:contact@ramazah.com",
    },
    {
      icon: Phone,
      label: "Phone",
      value: "+7 977 600-01-46",
      href: "tel:+79776000146",
    },
    {
      icon: MapPin,
      label: "Location",
      value: "Leninsky Avenue, 146, Moscow, 117198",
      href: "https://maps.google.com",
    },
  ]

  const socialLinks = [
    { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
    { icon: Facebook, href: "https://facebook.com", label: "Facebook" },
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  ]

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

      {/* Business Hours */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="space-y-4"
      >
        <h3 className="text-2xl font-heading tracking-wide mb-6">BUSINESS HOURS</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monday - Saturday</span>
            <span className="font-medium">9:00 AM - 10:00 PM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sunday</span>
            <span className="font-medium">9:00 AM - 9:00 PM</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
