"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCcw, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getRequestsForStaff, setRequestStatus, type ProductRequest } from "@/lib/account";

/**
 * Sourcing requests, staff side.
 *
 * Customers can only write the request itself; `status`, `quoted_amount` and
 * `staff_note` are not grantable to them and move through a SECURITY DEFINER
 * function that checks `is_admin()`. Without this screen the request form would
 * be a queue nobody could drain — the same failure the review form would have
 * had without /admin/reviews.
 */
type StaffRequest = ProductRequest & { customerName: string; customerEmail: string };

const TABS: { label: string; status?: ProductRequest["status"] }[] = [
  { label: "All" },
  { label: "With us", status: "asked" },
  { label: "Quoted", status: "quoted" },
  { label: "Buying", status: "buying" },
  { label: "Fulfilled", status: "fulfilled" },
];

export default function AdminRequestsPage() {
  const [status, setStatus] = useState<ProductRequest["status"] | undefined>("asked");
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quotes, setQuotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { requests: fetched, error } = await getRequestsForStaff(status);
    if (error) toast.error(error);
    setRequests(fetched as StaffRequest[]);
    setIsLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const move = async (request: StaffRequest, next: ProductRequest["status"]) => {
    setBusyId(request.id);
    const quote = quotes[request.id] ? Number(quotes[request.id]) : null;
    const { error } = await setRequestStatus(request.id, next, quote, notes[request.id] || null);
    setBusyId(null);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(`Marked ${next}.`);
    load();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Search className="h-5 w-5" />
            Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Items customers have asked you to source. Quote before buying.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.label}
            variant={status === tab.status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(tab.status)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-md border border-dashed py-20 text-center text-sm text-muted-foreground">
          Nothing here.
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li key={request.id} className="rounded-md border p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{request.item}</span>
                  {request.quantity > 1 && (
                    <span className="text-sm text-muted-foreground">× {request.quantity}</span>
                  )}
                  <Badge variant="secondary">{request.status}</Badge>
                </div>

                {request.details && (
                  <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
                    {request.details}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {request.customerName} · {request.customerEmail}
                  </span>
                  {request.budget !== null && (
                    <span>Budget ₦{request.budget.toLocaleString("en-NG")}</span>
                  )}
                  {request.referenceUrl && (
                    <a
                      href={request.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      Reference
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  <span>
                    {new Date(request.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                <Input
                  type="number"
                  placeholder={request.quotedAmount ? `₦${request.quotedAmount}` : "Quote ₦"}
                  value={quotes[request.id] ?? ""}
                  onChange={(event) => setQuotes({ ...quotes, [request.id]: event.target.value })}
                  className="w-32"
                />
                <Input
                  placeholder="Note to the customer"
                  value={notes[request.id] ?? ""}
                  onChange={(event) => setNotes({ ...notes, [request.id]: event.target.value })}
                  className="max-w-sm flex-1"
                />

                <Button size="sm" onClick={() => move(request, "quoted")} disabled={busyId === request.id}>
                  Send quote
                </Button>
                <Button size="sm" variant="outline" onClick={() => move(request, "buying")} disabled={busyId === request.id}>
                  Buying
                </Button>
                <Button size="sm" variant="outline" onClick={() => move(request, "fulfilled")} disabled={busyId === request.id}>
                  Fulfilled
                </Button>
                <Button size="sm" variant="outline" onClick={() => move(request, "declined")} disabled={busyId === request.id}>
                  Decline
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
