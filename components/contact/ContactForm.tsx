"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ContactFormData } from "@/types/types"

export default function ContactForm() {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    inquiryType: "general",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setSubmitStatus("success")

    // Reset form
    setTimeout(() => {
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        inquiryType: "general",
      })
      setSubmitStatus("idle")
    }, 3000)
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Inquiry Type */}
      <div>
        <label className="block text-sm font-medium mb-3 tracking-wide">INQUIRY TYPE</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { value: "general", label: "General" },
            { value: "wholesale", label: "Wholesale" },
            { value: "collaboration", label: "Collaboration" },
            { value: "press", label: "Press" },
            { value: "support", label: "Support" },
            { value: "career", label: "Career" },
            { value: "other", label: "Other" },
          ].map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData({ ...formData, inquiryType: type.value as any })}
              className={`px-4 py-2 text-sm tracking-wider transition-all ${
                formData.inquiryType === type.value
                  ? "bg-[#F8E231] text-black"
                  : "bg-transparent border border-border hover:border-[#F8E231]"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2 tracking-wide">
          NAME *
        </label>
        <Input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-background border-border focus:border-[#F8E231] transition-colors"
          placeholder="Your full name"
        />
      </div>

      {/* Email & Phone */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 tracking-wide">
            EMAIL *
          </label>
          <Input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-background border-border focus:border-[#F8E231] transition-colors"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-2 tracking-wide">
            PHONE
          </label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="bg-background border-border focus:border-[#F8E231] transition-colors"
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium mb-2 tracking-wide">
          SUBJECT *
        </label>
        <Input
          id="subject"
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="bg-background border-border focus:border-[#F8E231] transition-colors"
          placeholder="How can we help you?"
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2 tracking-wide">
          MESSAGE *
        </label>
        <Textarea
          id="message"
          required
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="bg-background border-border focus:border-[#F8E231] transition-colors min-h-[150px] resize-none"
          placeholder="Tell us more about your inquiry..."
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#F8E231] text-black hover:bg-[#F8E231]/90 font-medium tracking-wider py-6"
      >
        {isSubmitting ? "SENDING..." : "SEND MESSAGE"}
      </Button>

      {/* Success Message */}
      {submitStatus === "success" && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-[#F8E231] text-sm"
        >
          Message sent successfully! We'll get back to you soon.
        </motion.p>
      )}
    </motion.form>
  )
}
