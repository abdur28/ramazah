"use client"
import CategoryBanner from "@/components/category/CategoryBanner"
import ContactForm from "@/components/contact/ContactForm"
import ContactInfo from "@/components/contact/ContactInfo"

export default function ContactPage() {
  return (
    <main className="relative bg-background min-h-screen pt-16 md:pt-20">
      {/* Hero Section */}
      <CategoryBanner title="Contact Us" subtitle="Get in Touch" description="Have a question or want to collaborate? We'd love to hear from you." />

      {/* Contact Section */}
      <section className="py-16 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-heading tracking-wide mb-8">SEND US A MESSAGE</h2>
              <ContactForm />
            </div>

            {/* Contact Info */}
            <div className="lg:pl-12">
              <ContactInfo />
            </div>
          </div>
        </div>
      </section>

      {/* Map Section (Optional) */}
      <section className="h-[400px] bg-muted">
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Map integration placeholder</p>
        </div>
      </section>
    </main>
  )
}
