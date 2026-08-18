"use client";

import React, { useState } from "react";
import { Send, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import useAdmin from "@/hooks/admin/useAdmin";

interface NewsletterEmailComposerProps {
  recipients: string[];
  onEmailSent: (results: any) => void;
}

export default function NewsletterEmailComposer({ 
  recipients, 
  onEmailSent 
}: NewsletterEmailComposerProps) {
  const { sendNewsletterEmail, loading } = useAdmin();

  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const handleSend = async () => {
    // Validation
    if (!subject.trim()) {
      toast.error("Email subject is required");
      return;
    }

    if (!headline.trim()) {
      toast.error("Newsletter headline is required");
      return;
    }

    if (!content.trim()) {
      toast.error("Newsletter content is required");
      return;
    }

    if (recipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    try {
      const results = await sendNewsletterEmail({
        recipients,
        newsletterData: {
          subject: subject.trim(),
          headline: headline.trim(),
          content: content.trim(),
          imageUrl: imageUrl.trim() || undefined,
          ctaText: ctaText.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined
        }
      });

      toast.success(`Email sent to ${results.successCount} recipients`);
      
      // Reset form
      setSubject("");
      setHeadline("");
      setContent("");
      setImageUrl("");
      setCtaText("");
      setCtaUrl("");

      onEmailSent(results);
    } catch (error: any) {
      console.error("Error sending newsletter email:", error);
      toast.error(error.message || "Failed to send email");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newsletter-subject" className="">
          Email Subject *
        </Label>
        <Input
          id="newsletter-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Your Monthly Style Update"
          className="bg-gray-100  "
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newsletter-headline" className="">
          Newsletter Headline *
        </Label>
        <Input
          id="newsletter-headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="What's Hot This Month"
          className="bg-gray-100 "
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newsletter-content" className="">
          Content (HTML supported) *
        </Label>
        <Textarea
          id="newsletter-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="<p>Check out our latest collection featuring bold designs...</p>"
          rows={8}
          className="bg-gray-100   font-mono text-xs"
        />
        <p className="text-xs text-gray-500">
          You can use HTML tags like {'<p>, <h2>, <ul>, <li>, <strong>'}, etc.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newsletter-image" className="">
          Featured Image URL (Optional)
        </Label>
        <Input
          id="newsletter-image"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="bg-gray-100 "
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cta-text" className="">
            Call-to-Action Text
          </Label>
          <Input
            id="cta-text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            placeholder="Shop Now"
            className="bg-gray-100 "
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cta-url" className="">
            Call-to-Action URL
          </Label>
          <Input
            id="cta-url"
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="/shop"
            className="bg-gray-100 "
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-2">
        
        <Button
          onClick={handleSend}
          disabled={loading.adminAction || recipients.length === 0 || !subject.trim() || !headline.trim() || !content.trim()}
          className="bg-[#F8E231] hover:bg-[#ffd700] text-black font-semibold"
        >
          {loading.adminAction ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Newsletter ({recipients.length})
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-gray-500 p-3 rounded border">
        <strong className="text-black">Preview:</strong> Recipients will receive a fully customized newsletter with your content, optional featured image, and call-to-action button.
      </div>

      <div className=" p-4 rounded-lg border  space-y-2">
        <p className="text-sm font-medium ">💡 Content Tips:</p>
        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
          <li>Keep paragraphs short and scannable</li>
          <li>Use headings to break up content</li>
          <li>Include a clear call-to-action</li>
          <li>Test your HTML before sending</li>
          <li>Personalize with customer stories or features</li>
        </ul>
      </div>
    </div>
  );
}