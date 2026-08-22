"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Loader2,
  Mail,
  Package,
  RefreshCcw,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import SectionCard from "@/components/admin/ui/SectionCard";
import PromotionEmailComposer from "@/components/admin/PromotionEmailComposer";
import NewArrivalsEmailComposer from "@/components/admin/NewArrivalsEmailComposer";
import NewsletterEmailComposer from "@/components/admin/NewsletterEmailComposer";
import useAdmin from "@/hooks/admin/useAdmin";
import useScrollLock from "@/hooks/useScrollLock";
import { formatNumber } from "@/lib/admin/format";

type EmailType = "promotions" | "newArrivals" | "newsletter";

interface EmailResult {
  email: string;
  name: string;
  success: boolean;
  error?: string;
}

const TYPE_LABEL: Record<EmailType, string> = {
  promotions: "Promotions",
  newArrivals: "New arrivals",
  newsletter: "Newsletter",
};

/**
 * The mailer.
 *
 * The substantive change is behind the screen rather than on it: the footer
 * subscriber list is now reachable. `newsletter_subscribers` had been filling up
 * with every address typed into the storefront footer — visitors with no
 * account, which is most of them — and nothing read the table, so those people
 * could never receive a newsletter. See `hooks/admin/useAdminMailer.ts`.
 *
 * On the screen: the recipient list is searchable, because selecting people out
 * of an unsearchable list stops working somewhere around fifty names. And the
 * two active-tab colours that were terracotta are sage-deep, since terracotta is
 * the urgency colour on this palette and never a control.
 */
export default function AdminMailerPage() {
  const { fetchEmailRecipients, fetchEmailStats, emailRecipients, emailStats, loading } = useAdmin();

  const [refreshing, setRefreshing] = useState(false);
  const [emailType, setEmailType] = useState<EmailType>("promotions");
  const [selected, setSelected] = useState<string[]>([]);
  const [recipientQuery, setRecipientQuery] = useState("");

  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<EmailResult[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useScrollLock(showResults);

  const loadRecipients = useCallback(
    async (type: EmailType) => {
      await fetchEmailRecipients(type);
    },
    [fetchEmailRecipients]
  );

  useEffect(() => {
    // Changing type changes who is eligible, so the previous selection is
    // meaningless and clearing it prevents mailing someone who did not opt in.
    setSelected([]);
    loadRecipients(emailType);
  }, [emailType, loadRecipients]);

  useEffect(() => {
    fetchEmailStats();
  }, [fetchEmailStats]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchEmailStats(), loadRecipients(emailType)]);
    } finally {
      setRefreshing(false);
    }
  };

  const visible = useMemo(() => {
    const query = recipientQuery.trim().toLowerCase();
    if (!query) return emailRecipients;

    return emailRecipients.filter(
      (recipient) =>
        recipient.email.toLowerCase().includes(query) ||
        (recipient.displayName ?? "").toLowerCase().includes(query)
    );
  }, [emailRecipients, recipientQuery]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((recipient) => selected.includes(recipient.id));

  const toggleAllVisible = () => {
    const visibleIds = visible.map((recipient) => recipient.id);
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const handleEmailSent = (payload: {
    successCount: number;
    failedCount: number;
    results: EmailResult[];
  }) => {
    setSuccessCount(payload.successCount);
    setTotalCount(payload.successCount + payload.failedCount);
    setResults(payload.results);
    setShowResults(true);
    setSelected([]);
    fetchEmailStats();
  };

  // `Math.round(0/0 * 100)` is NaN, which is what the old dialog printed when a
  // send matched nobody.
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

  const composerProps = { recipients: selected, onEmailSent: handleEmailSent };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Reach"
        title="Mailer"
        description="Write to the people who asked to hear from you. Nobody else receives anything."
        actions={
          <Button variant="outline" onClick={refresh} disabled={refreshing || loading.users}>
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${refreshing || loading.users ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {emailStats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Accounts"
            value={formatNumber(emailStats.totalUsers)}
            hint={`${formatNumber(emailStats.totalOptedIn)} accept email`}
            icon={Users}
          />
          <StatCard
            label="Promotions"
            value={formatNumber(emailStats.promotionsOptedIn)}
            hint="opted in"
            icon={Sparkles}
          />
          <StatCard
            label="New arrivals"
            value={formatNumber(emailStats.newArrivalsOptedIn)}
            hint="opted in"
            icon={Package}
          />
          <StatCard
            label="Newsletter"
            value={formatNumber(emailStats.newsletterOptedIn)}
            hint={
              emailStats.footerSubscribers > 0
                ? `includes ${formatNumber(emailStats.footerSubscribers)} from the footer form`
                : "opted in"
            }
            icon={Mail}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        {/* ---------------------------------------------------------- compose */}
        <SectionCard title="Compose a campaign">
          <Tabs value={emailType} onValueChange={(value) => setEmailType(value as EmailType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="promotions">
                <Sparkles className="mr-2 h-4 w-4" />
                <span className="truncate">Promotion</span>
              </TabsTrigger>
              <TabsTrigger value="newArrivals">
                <Package className="mr-2 h-4 w-4" />
                <span className="truncate">Arrivals</span>
              </TabsTrigger>
              <TabsTrigger value="newsletter">
                <Mail className="mr-2 h-4 w-4" />
                <span className="truncate">Newsletter</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="promotions" className="mt-6">
              <PromotionEmailComposer {...composerProps} />
            </TabsContent>
            <TabsContent value="newArrivals" className="mt-6">
              <NewArrivalsEmailComposer {...composerProps} />
            </TabsContent>
            <TabsContent value="newsletter" className="mt-6">
              <NewsletterEmailComposer {...composerProps} />
            </TabsContent>
          </Tabs>
        </SectionCard>

        {/* ------------------------------------------------------- recipients */}
        <SectionCard
          title="Recipients"
          description={`Everyone opted into ${TYPE_LABEL[emailType].toLowerCase()}.`}
          action={
            <span className="font-body text-xs tabular-nums text-ink-muted">
              {formatNumber(selected.length)} / {formatNumber(emailRecipients.length)}
            </span>
          }
          flush
        >
          <div className="space-y-3 border-b border-rule p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <Input
                placeholder="Find a recipient…"
                value={recipientQuery}
                onChange={(event) => setRecipientQuery(event.target.value)}
                className="pl-10"
              />
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={toggleAllVisible}
              disabled={visible.length === 0}
            >
              {allVisibleSelected ? "Deselect" : "Select"}{" "}
              {recipientQuery ? `${visible.length} shown` : "all"}
            </Button>
          </div>

          {loading.users ? (
            <div className="flex items-center justify-center gap-2 py-16 font-body text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : visible.length === 0 ? (
            <p className="px-4 py-16 text-center font-body text-sm text-ink-muted">
              {recipientQuery
                ? "Nobody matches that search."
                : `Nobody has opted into ${TYPE_LABEL[emailType].toLowerCase()} yet.`}
            </p>
          ) : (
            <ul data-lenis-prevent className="max-h-[460px] divide-y divide-rule overflow-y-auto">
              {visible.map((recipient) => (
                <li key={recipient.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-wash/60">
                    <Checkbox
                      checked={selected.includes(recipient.id)}
                      onCheckedChange={() =>
                        setSelected((current) =>
                          current.includes(recipient.id)
                            ? current.filter((id) => id !== recipient.id)
                            : [...current, recipient.id]
                        )
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-body text-sm text-foreground">
                          {recipient.displayName || recipient.email}
                        </span>
                        {recipient.source === "footer" && (
                          <span
                            className="shrink-0 rounded-sm bg-wash/60 px-1.5 py-0.5 font-body text-[10px] uppercase tracking-[0.1em] text-ink-muted"
                            title="Signed up through the footer form — no account"
                          >
                            Footer
                          </span>
                        )}
                      </span>
                      {recipient.displayName && (
                        <span className="block truncate font-body text-xs text-ink-muted">
                          {recipient.email}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* ------------------------------------------------------------ results */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="font-body">Campaign sent</DialogTitle>
            <DialogDescription className="font-body text-ink-muted">
              {successCount} of {totalCount} delivered — {successRate}%.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-1.5">
            {results.map((result, index) => (
              <li
                key={`${result.email}-${index}`}
                className={`flex items-center gap-3 rounded-sm border px-3 py-2.5 ${
                  result.success
                    ? "border-rule bg-card"
                    : "border-destructive/30 bg-destructive/[0.04]"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-sage-deep" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-sm text-foreground">
                    {result.name}
                  </span>
                  <span className="block truncate font-body text-xs text-ink-muted">
                    {result.error || result.email}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button onClick={() => setShowResults(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
