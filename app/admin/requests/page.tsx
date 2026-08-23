"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, RefreshCcw, Search, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/admin/ui/PageHeader";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill, { REQUEST_STATUS } from "@/components/admin/ui/StatusPill";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney, formatRelative } from "@/lib/admin/format";
import { getRequestsForStaff, setRequestStatus, type ProductRequest } from "@/lib/account";

/**
 * Sourcing requests, staff side.
 *
 * Customers can only write the request itself; `status`, `quoted_amount` and
 * `staff_note` are not grantable to them and move through a SECURITY DEFINER
 * function that checks `is_admin()`. Without this screen the request form would
 * be a queue nobody could drain — the same failure the review form would have
 * had without /admin/reviews.
 *
 * Sending a quote requires an amount, in the database as well as here: "Send
 * quote" with the field empty used to set the status to `quoted` with a null
 * price, and the customer saw their request marked Quoted with no figure
 * attached.
 *
 * Each request carries the quote and note it already has rather than only
 * offering blank fields — you can see what you told someone last week before you
 * tell them something else. That seeding is also what makes direct assignment
 * right: `set_request_status` used to `coalesce` a null onto the stored value,
 * so emptying the note box reported success and changed nothing while the
 * customer went on reading it. What is on screen is what is saved.
 */
type StaffRequest = ProductRequest & { customerName: string; customerEmail: string };

const TABS: { label: string; status?: ProductRequest["status"] }[] = [
  { label: "With us", status: "asked" },
  { label: "Quoted", status: "quoted" },
  // The customer has said yes to a price. This is the queue that costs money if
  // it is ignored, so it sits next to the one you work from.
  { label: "Accepted", status: "accepted" },
  { label: "Buying", status: "buying" },
  { label: "Fulfilled", status: "fulfilled" },
  { label: "Declined", status: "declined" },
  { label: "Withdrawn", status: "withdrawn" },
  { label: "All" },
];

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<ProductRequest["status"] | undefined>("asked");
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setIsLoading(true);

    // The whole set as well as the filtered one, so the tabs can carry counts.
    // A queue you have to click into to discover is empty is not a queue.
    const [{ requests: fetched, error }, { requests: all }] = await Promise.all([
      getRequestsForStaff(status),
      getRequestsForStaff(),
    ]);
    if (error) toast.error(error);

    setCounts(
      all.reduce<Record<string, number>>((tally, request) => {
        tally[request.status] = (tally[request.status] ?? 0) + 1;
        tally.all = (tally.all ?? 0) + 1;
        return tally;
      }, {})
    );

    const staffRequests = fetched as StaffRequest[];
    setRequests(staffRequests);

    // Seed the fields with what has already been said, so an edit is an edit.
    setQuotes(
      Object.fromEntries(
        staffRequests.map((request) => [
          request.id,
          request.quotedAmount != null ? String(request.quotedAmount) : "",
        ])
      )
    );
    setNotes(
      Object.fromEntries(staffRequests.map((request) => [request.id, request.staffNote ?? ""]))
    );

    setIsLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const move = async (request: StaffRequest, next: ProductRequest["status"]) => {
    const raw = quotes[request.id]?.trim();
    const parsed = raw ? Number(raw) : null;
    const quote = parsed !== null && Number.isNaN(parsed) ? null : parsed;

    if (next === "quoted" && (quote === null || quote <= 0)) {
      toast.error("Enter the quoted amount before sending it.");
      return;
    }

    setBusyId(request.id);
    // Both fields are sent as they appear, including empty — the seeded values
    // mean what is on screen is what is stored, and it is the only way to take a
    // note back.
    const { error } = await setRequestStatus(
      request.id,
      next,
      quote,
      notes[request.id] ?? null
    );
    setBusyId(null);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(MOVED[next]);
    load();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Waiting on you"
        title="Requests"
        description="Things customers have asked you to bring back from Egypt. Quote before you buy."
        actions={
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setStatus(tab.status)}
            aria-pressed={status === tab.status}
            className={cn(
              "rounded-sm border px-3 py-1.5 font-body text-sm transition-colors",
              status === tab.status
                ? "border-sage-deep bg-sage-deep text-background"
                : "border-rule bg-card text-ink-muted hover:border-sage hover:text-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "ml-2 font-body text-xs tabular-nums",
                status === tab.status ? "text-background" : "text-ink-faint"
              )}
            >
              {counts[tab.status ?? "all"] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading requests…
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Search}
          title={status === "asked" ? "No open requests" : "Nothing here"}
          description={
            status === "asked"
              ? "When a customer asks you to source something, it lands here with their budget and any reference they gave."
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const busy = busyId === request.id;

            return (
              <li key={request.id} className="rounded-sm border border-rule bg-card">
                <div className="border-b border-rule p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="flex flex-wrap items-center gap-2 font-body text-sm font-medium text-foreground">
                        {request.item}
                        {request.quantity > 1 && (
                          <span className="font-normal tabular-nums text-ink-muted">
                            × {request.quantity}
                          </span>
                        )}
                      </h2>
                      <p className="mt-1 font-body text-xs text-ink-muted">
                        {request.customerName} ·{" "}
                        <a
                          href={`mailto:${request.customerEmail}`}
                          className="text-sage-deep hover:underline"
                        >
                          {request.customerEmail}
                        </a>
                      </p>
                    </div>
                    <StatusPill status={request.status} map={REQUEST_STATUS} />
                  </div>

                  {request.details && (
                    <p className="mt-3 max-w-[70ch] font-body text-sm leading-relaxed text-ink-muted">
                      {request.details}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-xs text-ink-muted">
                    {request.budget !== null && (
                      <span>
                        Their budget{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {formatMoney(request.budget)}
                        </span>
                      </span>
                    )}
                    {request.quotedAmount !== null && (
                      <span>
                        You quoted{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {formatMoney(request.quotedAmount)}
                        </span>
                      </span>
                    )}
                    {request.referenceUrl && (
                      <a
                        href={request.referenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sage-deep hover:underline"
                      >
                        Their reference
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <span title={formatDate(request.createdAt)}>
                      Asked {formatRelative(request.createdAt)}
                    </span>
                    {request.status === "accepted" && (
                      <span className="font-medium text-sage-deep">
                        They accepted this price
                      </span>
                    )}
                    {request.status === "withdrawn" && (
                      <span className="text-ink-faint">They withdrew it</span>
                    )}
                  </div>
                </div>

                {/* ------------------------------------------------- respond */}
                <div className="space-y-3 bg-wash/50 p-5">
                  <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                    <label className="block">
                      <span className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                        Your price (₦)
                      </span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder="0"
                        value={quotes[request.id] ?? ""}
                        onChange={(event) =>
                          setQuotes({ ...quotes, [request.id]: event.target.value })
                        }
                        className="bg-card tabular-nums"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                        Note to the customer
                      </span>
                      <Textarea
                        rows={2}
                        placeholder="What you found, how long it will take, anything they should know."
                        value={notes[request.id] ?? ""}
                        onChange={(event) =>
                          setNotes({ ...notes, [request.id]: event.target.value })
                        }
                        className="min-h-0 resize-y bg-card"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => move(request, "quoted")}
                      disabled={busy || request.status === "withdrawn"}
                    >
                      {busy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Send quote
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => move(request, "buying")}
                      disabled={busy}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Buying it
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => move(request, "fulfilled")}
                      disabled={busy}
                    >
                      Fulfilled
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => move(request, "declined")}
                      disabled={busy}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const MOVED: Record<ProductRequest["status"], string> = {
  asked: "Moved back to the queue.",
  quoted: "Quote sent — the customer can see it and answer on their account now.",
  accepted: "Marked accepted.",
  buying: "Marked as being bought.",
  fulfilled: "Marked fulfilled.",
  declined: "Declined.",
  withdrawn: "Marked withdrawn.",
};
