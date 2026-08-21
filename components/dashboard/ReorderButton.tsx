"use client";

import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { buildReorder } from "@/lib/account";

/**
 * Put a past order back in the basket.
 *
 * This shop is a restocking shop — someone who buys cumin buys cumin again —
 * so repeating an order is the most valuable action on the account page.
 *
 * Lines are re-priced from today's catalog rather than from the order, because
 * an order records what something cost then. Anything archived or out of stock
 * is skipped and named, rather than silently dropped.
 */
export default function ReorderButton({
  orderId,
  className = "",
}: {
  orderId: string;
  className?: string;
}) {
  const { user } = useAuth();
  const addItem = useCart((state) => state.addItem);
  const [isWorking, setIsWorking] = useState(false);

  const handleReorder = async () => {
    if (isWorking) return;
    setIsWorking(true);

    const { lines, error } = await buildReorder(orderId);

    if (error || lines.length === 0) {
      toast.error("Could not rebuild that order. Please try again.");
      setIsWorking(false);
      return;
    }

    const available = lines.filter((line) => !line.problem);
    const skipped = lines.filter((line) => line.problem);

    let added = 0;
    for (const line of available) {
      const { error: addError } = await addItem(line.item, user?.id);
      if (!addError) added += 1;
    }

    setIsWorking(false);

    if (added === 0) {
      toast.error(
        skipped.length > 0
          ? "Nothing from that order is available right now."
          : "Could not add those items."
      );
      return;
    }

    toast.success(
      skipped.length > 0
        ? `${added} ${added === 1 ? "item" : "items"} added — ${skipped
            .map((line) => line.item.name)
            .join(", ")} unavailable.`
        : `${added} ${added === 1 ? "item" : "items"} back in your cart.`
    );
  };

  return (
    <button
      onClick={handleReorder}
      disabled={isWorking}
      className={`inline-flex items-center justify-center gap-2 rounded-sm border border-rule px-5 py-2.5 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-foreground transition-colors hover:border-sage-deep hover:text-sage-deep disabled:opacity-60 ${className}`}
    >
      {isWorking ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" />
      )}
      Buy again
    </button>
  );
}
