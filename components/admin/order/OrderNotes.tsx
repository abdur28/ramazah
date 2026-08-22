"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SectionCard from "@/components/admin/ui/SectionCard";
import { addOrderNote, deleteOrderNote, type OrderNote } from "@/lib/orders";
import { formatDateTime } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";

/**
 * Internal notes on an order.
 *
 * Separate from the status history, which records what changed; this records
 * what is going on — "customer rang, wants it held until Friday", "second parcel
 * sent, first one lost". Both matter, and putting them in one list would mean a
 * note without a status change had to invent one.
 *
 * `order_notes` is a table rather than a column on `orders` because RLS is
 * row-level: "own orders readable" hands a customer their whole row, so a
 * `staff_notes` column would go straight to the person it is written about.
 */
export default function OrderNotes({
  orderId,
  notes,
  onChanged,
}: {
  orderId: string;
  notes: OrderNote[];
  onChanged: () => void;
}) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const save = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const { error } = await addOrderNote(orderId, body);
      if (error) throw new Error(error);
      setBody("");
      onChanged();
    } catch (err) {
      toast.error(describeError(err, "Could not save the note."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (noteId: string) => {
    setRemoving(noteId);
    try {
      const { error } = await deleteOrderNote(noteId);
      if (error) throw new Error(error);
      onChanged();
    } catch (err) {
      toast.error(describeError(err, "Could not delete the note."));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <SectionCard
      title="Staff notes"
      description="Never shown to the customer."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            placeholder="Anything the next person handling this order should know…"
          />
          {body.trim() && (
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              ) : (
                "Add note"
              )}
            </Button>
          )}
        </div>

        {notes.length > 0 && (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="group flex items-start gap-3 rounded-sm bg-wash/50 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap font-body text-sm text-foreground">
                    {note.body}
                  </p>
                  <p className="mt-1 font-body text-xs text-ink-faint">
                    {note.authorName ?? "Staff"}
                    <span className="px-1.5">·</span>
                    <span className="tabular-nums">{formatDateTime(note.at)}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => remove(note.id)}
                  disabled={removing === note.id}
                  aria-label="Delete this note"
                  className="shrink-0 rounded-sm p-1.5 text-ink-faint transition-colors hover:bg-card hover:text-destructive"
                >
                  {removing === note.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}
