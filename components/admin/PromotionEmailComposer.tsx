"use client";

import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import useAdmin from "@/hooks/admin/useAdmin";

interface PromotionEmailComposerProps {
  recipients: string[];
  onEmailSent: (results: any) => void;
}

export default function PromotionEmailComposer({ 
  recipients, 
  onEmailSent 
}: PromotionEmailComposerProps) {
  const { sendPromotionEmail, loading } = useAdmin();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const handleSend = async () => {
    // Validation
    if (!title.trim()) {
      toast.error("Promotion title is required");
      return;
    }

    if (!description.trim()) {
      toast.error("Promotion description is required");
      return;
    }

    if (recipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    try {
      const results = await sendPromotionEmail({
        recipients,
        promoData: {
          title: title.trim(),
          description: description.trim(),
          discountCode: discountCode.trim() || undefined,
          discountPercent: discountPercent ? parseInt(discountPercent) : undefined,
          expiryDate: expiryDate || undefined
        }
      });

      toast.success(`Email sent to ${results.successCount} recipients`);
      
      // Reset form
      setTitle("");
      setDescription("");
      setDiscountCode("");
      setDiscountPercent("");
      setExpiryDate("");

      onEmailSent(results);
    } catch (error: any) {
      console.error("Error sending promotion email:", error);
      toast.error(error.message || "Failed to send email");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="promo-title" className="">
          Promotion Title *
        </Label>
        <Input
          id="promo-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Black Friday Sale"
          className="bg-gray-100  "
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="promo-description" className="">
          Description *
        </Label>
        <Textarea
          id="promo-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Get 30% off everything! Limited time only."
          rows={4}
          className="bg-gray-100  "
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="discount-code" className="">
            Discount Code
          </Label>
          <Input
            id="discount-code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            placeholder="SAVE30"
            className="bg-gray-100  "
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount-percent" className="">
            Discount %
          </Label>
          <Input
            id="discount-percent"
            type="number"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            placeholder="30"
            min="0"
            max="100"
            className="bg-gray-100  "
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expiry-date" className="">
          Expiry Date
        </Label>
        <Input
          id="expiry-date"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="bg-gray-100  "
        />
      </div>

      <div className="pt-4 flex justify-end">
        <Button
          onClick={handleSend}
          disabled={loading.adminAction || recipients.length === 0 || !title.trim() || !description.trim()}
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
              Send Promotion ({recipients.length})
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-gray-500 p-3 rounded border border-gray-300">
        <strong className="text-black">Preview:</strong> Recipients will receive a branded promotion email with your discount details, featured products, and a prominent CTA button.
      </div>
    </div>
  );
}