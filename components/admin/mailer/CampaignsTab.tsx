"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Check, Eye, Loader2, Megaphone, Package, Send, Sparkles, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import SectionCard from "@/components/admin/ui/SectionCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import useScrollLock from "@/hooks/useScrollLock";
import {
  SEGMENTS, countAudience, getCampaigns, sendCampaign,
  type CampaignResult, type Segment,
} from "@/lib/admin/campaigns";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";
import { cn } from "@/lib/utils";

/**
 * Writing to more than one person.
 *
 * Rebuilt, not restyled. What was here sent by firing one `fetch` per recipient
 * straight at SMTP from the browser: no record once the dialog closed, no
 * retries, no dedupe, a hundred parallel connections at any real volume, and it
 * stopped halfway if the tab was closed. It was also broken — the templates it
 * named were replaced when the email system was rebuilt.
 *
 * A campaign is now a set of outbox rows, so everything the transactional side
 * already has comes with it.
 *
 * Three changes on the screen itself:
 *
 * **Segments, not checkboxes.** Picking people out of a list stops working
 * somewhere around fifty names, and "everyone who bought in the last ninety
 * days" is what somebody actually wants to say.
 *
 * **One composer, not three.** The promotion, new-arrivals and newsletter forms
 * were near-identical and 574 lines between them.
 *
 * **No discount code field.** It asked for one and there is no way to create a
 * discount code in this admin — `discount_codes` is empty. A code typed here
 * would be rejected by `create_order` at checkout, so the customer would be
 * handed something that fails. Better to offer nothing than to offer that.
 */
type Kind = "newsletter" | "new_arrivals" | "promotion";

const KINDS: { value: Kind; label: string; icon: any; note: string }[] = [
  { value: "newsletter", label: "Newsletter", icon: Megaphone,
    note: "Something to say. A run that went well, a shop note, a season." },
  { value: "new_arrivals", label: "New arrivals", icon: Package,
    note: "What came back on the last trip." },
  { value: "promotion", label: "An offer", icon: Sparkles,
    note: "A reason to buy now rather than later." },
];

export default function CampaignsTab() {
  const [kind, setKind] = useState<Kind>("newsletter");
  const [segment, setSegment] = useState<Segment>("all");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Have a look");
  const [ctaUrl, setCtaUrl] = useState("");

  const [audience, setAudience] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignResult[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  useScrollLock(preview !== null);

  const load = useCallback(async () => {
    const { campaigns: list } = await getCampaigns();
    setCampaigns(list);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Counted from the database rather than guessed, and opt-out is applied there
  // — so the number on the button is the number that will be written to.
  useEffect(() => {
    let cancelled = false;
    setCounting(true);
    countAudience(segment).then((count) => {
      if (!cancelled) { setAudience(count); setCounting(false); }
    });
    return () => { cancelled = true; };
  }, [segment]);

  const payload = useMemo(() => ({
    headline: headline.trim() || subject.trim(),
    // Line breaks become paragraphs. Nobody writing a shop newsletter should
    // have to type HTML, and a raw editor here is a way to send broken markup to
    // three hundred people.
    bodyHtml: body.trim().split(/\n{2,}/).map((p) =>
      `<p style="margin:0 0 14px;">${p.replace(/\n/g, '<br />')}</p>`).join(''),
    bodyText: body.trim(),
    ctaLabel: ctaLabel.trim() || "Have a look",
    ctaUrl: ctaUrl.trim() || undefined,
    subjectLine: subject.trim(),
  }), [headline, body, ctaLabel, ctaUrl, subject]);

  const ready = subject.trim().length > 2 && body.trim().length > 10 && (audience ?? 0) > 0;

  const showPreview = async () => {
    try {
      const response = await fetch(`/api/email/preview?template=${kind}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      setPreview(await response.text());
    } catch (err) {
      toast.error(describeError(err, "Could not render that."));
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return;
    setTesting(true);
    try {
      const response = await fetch("/api/email/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: kind, to: testTo.trim(), payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(`Sent to ${testTo.trim()}.`);
    } catch (err) {
      toast.error(describeError(err, "Could not send the test."));
    } finally {
      setTesting(false);
    }
  };

  const send = async () => {
    setSending(true);
    try {
      const { recipients, error } = await sendCampaign({
        template: kind, subject: subject.trim(), segment, payload,
      });
      if (error) throw new Error(error);

      toast.success(
        `Queued for ${formatNumber(recipients ?? 0)}. They go out on the next run — watch it in Notifications.`,
        { duration: 8000 }
      );
      setConfirming(false);
      setSubject(""); setHeadline(""); setBody(""); setCtaUrl("");
      load();
    } catch (err) {
      toast.error(describeError(err, "Could not queue the campaign."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <SectionCard title="What kind">
            <div className="grid gap-2 sm:grid-cols-3">
              {KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKind(option.value)}
                  className={cn(
                    "rounded-sm border px-3 py-3 text-left transition-colors",
                    kind === option.value
                      ? "border-sage-deep bg-wash"
                      : "border-rule hover:border-sage"
                  )}
                >
                  <span className="flex items-center gap-2 font-body text-sm text-foreground">
                    <option.icon className="h-4 w-4 text-sage-deep" />
                    {option.label}
                  </span>
                  <span className="mt-1.5 block font-body text-xs leading-relaxed text-ink-muted">
                    {option.note}
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="What it says">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">
                  Subject line <span className="text-terra-ink">*</span>
                </Label>
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Just back from Cairo"
                  maxLength={90}
                />
                <p className="font-body text-xs text-ink-faint">
                  {subject.length}/90 — most inboxes cut off around 45 on a phone.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">
                  Heading <span className="text-ink-faint">— defaults to the subject</span>
                </Label>
                <Input
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder={subject || "Just back from Cairo"}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">
                  The message <span className="text-terra-ink">*</span>
                </Label>
                <Textarea
                  rows={8}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={"Write it as you would say it.\n\nA blank line starts a new paragraph."}
                />
                <p className="font-body text-xs text-ink-faint">
                  Plain text. A blank line starts a new paragraph — no HTML needed, and none
                  accepted, so nothing broken can go out.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-ink-muted">Button says</Label>
                  <Input
                    value={ctaLabel}
                    onChange={(event) => setCtaLabel(event.target.value)}
                    placeholder="Have a look"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-ink-muted">Button goes to</Label>
                  <Input
                    value={ctaUrl}
                    onChange={(event) => setCtaUrl(event.target.value)}
                    placeholder="/collections/the-cairo-run"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Said where somebody will read it, not buried in a tooltip. */}
          <p className="flex items-start gap-2 font-body text-xs leading-relaxed text-ink-muted">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
            There is no discount-code field because there is no way to create a discount code
            in this admin yet — one typed here would be refused at checkout, and the customer
            would be the one to find out.
          </p>
        </div>

        {/* ------------------------------------------------------- sidebar */}
        <div className="space-y-6">
          <SectionCard title="Who gets it">
            <div className="space-y-2">
              {SEGMENTS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSegment(option.value)}
                  className={cn(
                    "w-full rounded-sm border px-3 py-2.5 text-left transition-colors",
                    segment === option.value
                      ? "border-sage-deep bg-wash"
                      : "border-rule hover:border-sage"
                  )}
                >
                  <span className="block font-body text-sm text-foreground">{option.label}</span>
                  <span className="block font-body text-xs text-ink-muted">{option.note}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-rule pt-4">
              <p className="font-body text-2xl font-medium tabular-nums text-foreground">
                {counting ? "…" : formatNumber(audience ?? 0)}
                <span className="ml-2 font-body text-sm font-normal text-ink-muted">
                  {audience === 1 ? "person" : "people"}
                </span>
              </p>
              <p className="mt-1 font-body text-xs leading-relaxed text-ink-muted">
                Anyone who has unsubscribed is already out of this number, so it is what will
                actually be written to.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Before you send">
            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={showPreview} disabled={!body.trim()}>
                <Eye className="mr-2 h-4 w-4" />
                Preview it
              </Button>

              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testTo}
                  onChange={(event) => setTestTo(event.target.value)}
                  placeholder="Send yourself a copy"
                />
                <Button variant="outline" onClick={sendTest} disabled={!testTo.trim() || testing || !body.trim()}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              <Button className="w-full" onClick={() => setConfirming(true)} disabled={!ready}>
                <Megaphone className="mr-2 h-4 w-4" />
                Send to {formatNumber(audience ?? 0)}
              </Button>

              {!ready && (
                <p className="font-body text-xs leading-relaxed text-ink-muted">
                  Needs a subject, a message, and somebody to send it to.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* --------------------------------------------------------- history */}
      <SectionCard
        title="What you have sent"
        description="Survives a refresh, unlike the dialog this replaced."
        flush
      >
        {campaigns.length === 0 ? (
          <div className="px-5 py-12">
            <EmptyState icon={Megaphone} title="No campaigns yet" />
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-sm text-foreground">
                    {campaign.subject}
                  </span>
                  <span className="block truncate font-body text-xs text-ink-muted">
                    {SEGMENTS.find((s) => s.value === campaign.segment)?.label ?? campaign.segment}
                    {" · "}
                    {formatNumber(campaign.recipients)} recipients
                    {" · "}
                    {formatRelative(campaign.createdAt)}
                    {campaign.sender && ` · ${campaign.sender}`}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3 font-body text-xs tabular-nums">
                  {campaign.sent > 0 && (
                    <span className="inline-flex items-center gap-1 text-sage-deep">
                      <Check className="h-3.5 w-3.5" />{campaign.sent}
                    </span>
                  )}
                  {campaign.queued > 0 && (
                    <span className="text-ink-muted">{campaign.queued} waiting</span>
                  )}
                  {campaign.failed > 0 && (
                    <span className="inline-flex items-center gap-1 text-terra-ink">
                      <X className="h-3.5 w-3.5" />{campaign.failed}
                    </span>
                  )}
                  {campaign.cancelled > 0 && (
                    <span className="text-ink-muted">{campaign.cancelled} skipped</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* --------------------------------------------------------- preview */}
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="border-b border-rule px-6 py-4 text-left">
            <DialogTitle className="font-body text-base font-medium">
              {subject || "Your campaign"}
            </DialogTitle>
            <DialogDescription className="font-body text-sm text-ink-muted">
              This is the email, not an approximation of it.
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Campaign preview"
            srcDoc={preview ?? ""}
            className="h-[68vh] w-full border-0 bg-white"
            sandbox=""
          />
        </DialogContent>
      </Dialog>

      {/* --------------------------------------------------------- confirm */}
      <AlertDialog open={confirming} onOpenChange={(open) => !open && !sending && setConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">
              Send to {formatNumber(audience ?? 0)} {audience === 1 ? "person" : "people"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They are queued now and go out on the next run. Once somebody has received one
              there is no taking it back — this is the moment to have used the preview.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Not yet</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); send(); }}
              disabled={sending}
            >
              {sending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Queueing…</>
              ) : (
                <><Megaphone className="mr-2 h-4 w-4" />Send it</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
