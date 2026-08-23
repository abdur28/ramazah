"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Check, Clock, Eye, Loader2, Play, RefreshCcw, RotateCcw, Send, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import SectionCard from "@/components/admin/ui/SectionCard";
import Pager from "@/components/ui/Pager";
import StatCard from "@/components/admin/ui/StatCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill from "@/components/admin/ui/StatusPill";
import useScrollLock from "@/hooks/useScrollLock";
import {
  cancelEmail, getOutbox, getOutboxCounts, retryEmail,
  type OutboxCounts, type OutboxEntry,
} from "@/lib/admin/mail";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";
import { cn } from "@/lib/utils";

/**
 * The transactional side of the mailer.
 *
 * None of this existed. Every one of these emails was a function nothing called,
 * so the shop's own record of what it had told a customer was nothing at all.
 * The queue below is that record, and it is as much the point as the sending —
 * "did we send it?" is most of what a support conversation needs.
 *
 * Previewing renders against the most recent real order or request rather than
 * placeholder data, because the mistakes that matter are the ones that only
 * appear on a real record: an order with no address, a request with no budget.
 */
const GROUPS: { label: string; note: string; templates: string[] }[] = [
  {
    label: "The money",
    note: "There is no card checkout, so these are how the shop gets paid.",
    templates: ["order_received", "payment_reminder", "payment_received", "refund_issued"],
  },
  {
    label: "Fulfilment",
    note: "Where a parcel has got to.",
    templates: ["order_packed", "order_shipped", "order_delivered", "order_collected", "order_cancelled"],
  },
  {
    label: "Sourcing",
    note: "The service the shop leads with.",
    templates: ["request_received", "quote_ready", "quote_reminder", "request_declined", "request_buying"],
  },
  {
    label: "Account and reviews",
    note: "",
    templates: ["welcome", "account_suspended", "account_reinstated", "credentials_changed",
                "review_invite", "review_published"],
  },
  {
    label: "Marketing",
    note: "Opt-in only, and every one carries an unsubscribe link.",
    templates: ["newsletter", "new_arrivals", "promotion", "back_in_stock",
                "collection_launch", "abandoned_cart"],
  },
  {
    label: "To you",
    note: "Not to customers.",
    templates: ["admin_new_order", "admin_new_request", "admin_digest"],
  },
];

const READABLE = (template: string) =>
  template.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/**
 * The admin's own status vocabulary rather than four hand-rolled colour pairs.
 * Its tones are already measured against the ground — the first version of this
 * used `--ink-faint`, which is decorative only in this system at 2.4:1, and then
 * `--ink-muted` on full `--wash`, which lands at 4.48:1 and still misses.
 */
const OUTBOX_STATUS: Record<string, { label: string; icon: any; tone: any }> = {
  queued:    { label: "Queued",    icon: Clock,         tone: "neutral" },
  sent:      { label: "Sent",      icon: Check,         tone: "done" },
  failed:    { label: "Failed",    icon: AlertTriangle, tone: "attention" },
  cancelled: { label: "Cancelled", icon: X,             tone: "neutral" },
};

export default function NotificationsTab() {
  const [counts, setCounts] = useState<OutboxCounts>({ queued: 0, sent: 0, failed: 0, cancelled: 0, due: 0 });
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<{ template: string; html: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useScrollLock(preview !== null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tally, list] = await Promise.all([getOutboxCounts(), getOutbox(statusFilter, page)]);
    setCounts(tally);
    setEntries(list.entries);
    setTotal(list.total);
    if (list.page !== page) setPage(list.page);
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  /**
   * A dry run renders everything due and sends nothing, which is how you find
   * out the queue would go out cleanly before doing anything irreversible.
   */
  const run = async (dry: boolean) => {
    setRunning(true);
    try {
      const response = await fetch(`/api/email/worker${dry ? "?dry=1" : ""}`, { method: "POST" });
      const result = await response.json();

      if (result.errors?.length) {
        toast.error(result.errors[0], { duration: 10000 });
      } else if (dry) {
        toast.success(`${result.sent} would send, ${result.skipped} skipped. Nothing was sent.`);
      } else {
        toast.success(`${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed.`);
      }
      load();
    } catch (err) {
      toast.error(describeError(err, "Could not run the queue."));
    } finally {
      setRunning(false);
    }
  };

  const show = async (template: string) => {
    try {
      const response = await fetch(`/api/email/preview?template=${template}`);
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }
      setPreview({ template, html: await response.text() });
    } catch (err) {
      toast.error(describeError(err, "Could not render that one."));
    }
  };

  const sendTest = async () => {
    if (!preview || !testTo.trim()) return;
    setSendingTest(true);
    try {
      const response = await fetch("/api/email/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: preview.template, to: testTo.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(`Sent to ${testTo.trim()}.`);
    } catch (err) {
      toast.error(describeError(err, "Could not send the test."));
    } finally {
      setSendingTest(false);
    }
  };

  const failed = useMemo(() => entries.filter((e) => e.status === "failed"), [entries]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Waiting to send"
          value={formatNumber(counts.due)}
          hint={counts.queued > counts.due ? `${counts.queued - counts.due} scheduled later` : "due now"}
          tone={counts.due > 0 ? "attention" : "default"}
          icon={Clock}
        />
        <StatCard label="Sent" value={formatNumber(counts.sent)} icon={Check} />
        <StatCard
          label="Failed"
          value={formatNumber(counts.failed)}
          hint={counts.failed > 0 ? "needs a person" : "none"}
          tone={counts.failed > 0 ? "attention" : "default"}
          icon={AlertTriangle}
        />
        <StatCard
          label="Cancelled"
          value={formatNumber(counts.cancelled)}
          hint="no longer applicable, or not opted in"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => run(true)} disabled={running} variant="outline">
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
          Dry run
        </Button>
        <Button onClick={() => run(false)} disabled={running || counts.due === 0}>
          <Play className="mr-2 h-4 w-4" />
          Send {counts.due > 0 ? `${counts.due} due` : "the queue"}
        </Button>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* ------------------------------------------------------- templates */}
      {GROUPS.map((group) => (
        <SectionCard key={group.label} title={group.label} description={group.note || undefined} flush>
          <ul className="divide-y divide-rule">
            {group.templates.map((template) => (
              <li key={template} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                <span className="min-w-0 flex-1 font-body text-sm text-foreground">
                  {READABLE(template)}
                </span>
                <span className="font-body text-xs tabular-nums text-ink-faint">
                  {formatNumber(entries.filter((e) => e.template === template && e.status === "sent").length)} sent
                </span>
                <button
                  type="button"
                  onClick={() => show(template)}
                  className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 font-body text-xs text-ink-muted transition-colors hover:bg-wash/60 hover:text-sage-deep"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      ))}

      {/* ----------------------------------------------------------- queue */}
      <SectionCard
        title="The queue"
        description="Every email the shop has decided to send, and what became of it."
        action={
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everything</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
        flush
      >
        {entries.length === 0 ? (
          <div className="px-5 py-12">
            <EmptyState
              icon={Send}
              title="Nothing here yet"
              description="Emails arrive the moment an order is placed, a payment lands or a quote goes out."
            />
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {entries.slice(0, 100).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-sm text-foreground">
                    {READABLE(entry.template)}
                  </span>
                  <span className="block truncate font-body text-xs text-ink-muted">
                    {entry.toEmail}
                    {" · "}
                    {entry.status === "sent" && entry.sentAt
                      ? `sent ${formatRelative(entry.sentAt)}`
                      : entry.status === "queued"
                        ? `due ${formatDateTime(entry.sendAfter)}`
                        : formatRelative(entry.createdAt)}
                  </span>
                  {entry.lastError && (
                    <span className="mt-1 block max-w-[70ch] font-body text-xs text-terra-ink">
                      {entry.lastError}
                    </span>
                  )}
                </span>

                <StatusPill status={entry.status} map={OUTBOX_STATUS} />

                {entry.status === "failed" && (
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await retryEmail(entry.id);
                      error ? toast.error(error) : toast.success("Back in the queue.");
                      load();
                    }}
                    className="shrink-0 rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-wash hover:text-sage-deep"
                    aria-label="Try this one again"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                {entry.status === "queued" && (
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await cancelEmail(entry.id);
                      error ? toast.error(error) : toast.success("Cancelled.");
                      load();
                    }}
                    className="shrink-0 rounded-sm p-1.5 text-ink-faint transition-colors hover:bg-wash hover:text-destructive"
                    aria-label="Do not send this one"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {entries.length > 0 && (
          <div className="border-t border-rule px-5 py-3">
            <Pager page={page} total={total} busy={loading} onChange={setPage} noun="emails" />
          </div>
        )}
      </SectionCard>

      {/* The thing that is easy to miss: a queued email sits there until
          something runs the worker. In production that is a cron every five
          minutes; in development it is this button. An order went out with four
          rows queued correctly and nothing delivered, because nothing called
          it. */}
      {counts.due > 0 && (
        <p className="flex items-start gap-2 font-body text-xs leading-relaxed text-terra-ink">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {formatNumber(counts.due)} {counts.due === 1 ? "email is" : "emails are"} waiting.
          On the live site a scheduled job sends these every five minutes; here, nothing runs
          until you press Send.
        </p>
      )}

      {failed.length > 0 && (
        <p className="font-body text-xs leading-relaxed text-ink-muted">
          A failed email has already been retried five times with a widening gap. It stays here
          rather than disappearing, because five failures is a problem for a person rather than
          for a retry loop.
        </p>
      )}

      {/* --------------------------------------------------------- preview */}
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-rule px-6 py-4 text-left">
            <DialogTitle className="font-body text-base font-medium">
              {preview && READABLE(preview.template)}
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-ink-muted">
              Rendered against the most recent real record, not placeholder data.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 border-b border-rule px-6 py-3">
            <Input
              type="email"
              value={testTo}
              onChange={(event) => setTestTo(event.target.value)}
              placeholder="Send a copy to…"
              className="max-w-xs"
            />
            <Button size="sm" onClick={sendTest} disabled={!testTo.trim() || sendingTest}>
              {sendingTest ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
              ) : (
                <><Send className="mr-2 h-4 w-4" />Send test</>
              )}
            </Button>
          </div>

          {/* An iframe, because email HTML is a whole document and the only
              honest way to look at it is in its own. */}
          <iframe
            title="Email preview"
            srcDoc={preview?.html ?? ""}
            className="h-[60vh] w-full border-0 bg-white"
            sandbox=""
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
