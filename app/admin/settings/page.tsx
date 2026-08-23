"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Banknote, Building2, Loader2, Mail, Phone, RefreshCcw,
  RotateCcw, Save, Store, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/admin/ui/PageHeader";
import SectionCard from "@/components/admin/ui/SectionCard";
import {
  AreaField, Field, NumberField, TextField, ToggleField,
} from "@/components/admin/settings/Field";
import {
  getAdminSettings, resetSettingsGroup, saveSettingsGroup,
} from "@/lib/admin/settings";
import { SETTINGS_DEFAULTS, type Settings, type SettingsKey } from "@/lib/settings-defaults";
import { formatDateTime } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";

/**
 * Everything that makes this shop *this* shop.
 *
 * All of it was a literal in `constants/index.ts` or, worse, inside a migration —
 * the registered company, the bank account customers transfer to, VAT, shipping,
 * the delivery lead time, the reminder cadence. Half of them were marked
 * PLACEHOLDER, and changing an account number meant a commit and a deploy.
 *
 * Each tab saves on its own. One giant Save would mean a typo in the reminder
 * cadence blocking a correction to the bank account, and these groups are edited
 * at completely different times.
 *
 * Every read falls back to the code, so an empty table behaves exactly as the
 * constants did — and "back to the defaults" deletes the row rather than freezing
 * a copy of today's values into it.
 *
 * SMTP credentials are deliberately absent: a password in a database row turns up
 * in backups, in screenshots and in any admin's devtools. Those stay in the
 * environment.
 */
type Group = { key: SettingsKey; label: string; icon: any };

const GROUPS: Group[] = [
  { key: "business", label: "Business", icon: Building2 },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "money", label: "Money & shipping", icon: Truck },
  { key: "payment", label: "Payment", icon: Banknote },
  { key: "email", label: "Email", icon: Mail },
  { key: "shop", label: "Shop", icon: Store },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(SETTINGS_DEFAULTS);
  const [stored, setStored] = useState<Set<SettingsKey>>(new Set());
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [editor, setEditor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SettingsKey | null>(null);
  const [dirty, setDirty] = useState<Set<SettingsKey>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const state = await getAdminSettings();
    setSettings(state.settings);
    setStored(state.stored);
    setUpdatedAt(state.updatedAt);
    setEditor(state.editor);
    setDirty(new Set());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = <K extends SettingsKey>(key: K, next: Partial<Settings[K]>) => {
    setSettings((current) => ({ ...current, [key]: { ...current[key], ...next } }));
    setDirty((current) => new Set(current).add(key));
  };

  const save = async (key: SettingsKey) => {
    setSaving(key);
    try {
      const { error } = await saveSettingsGroup(key, settings[key]);
      if (error) throw new Error(error);
      toast.success("Saved. It is live on the shop now.");
      load();
    } catch (err) {
      toast.error(describeError(err, "Could not save that."));
    } finally {
      setSaving(null);
    }
  };

  const reset = async (key: SettingsKey) => {
    try {
      const { error } = await resetSettingsGroup(key);
      if (error) throw new Error(error);
      toast.success("Back to the defaults.");
      load();
    } catch (err) {
      toast.error(describeError(err, "Could not reset that."));
    }
  };

  const Actions = ({ group }: { group: SettingsKey }) => (
    <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
      <Button onClick={() => save(group)} disabled={saving !== null || !dirty.has(group)}>
        {saving === group ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
        ) : (
          <><Save className="mr-2 h-4 w-4" />Save</>
        )}
      </Button>
      {stored.has(group) && (
        <Button variant="outline" onClick={() => reset(group)} disabled={saving !== null}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Back to the defaults
        </Button>
      )}
      <span className="font-body text-xs text-ink-muted">
        {stored.has(group) ? "Saved" : "Showing the values from the code"}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-24 font-body text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the settings…
      </div>
    );
  }

  const { business, contact, money, payment, email, shop } = settings;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="The shop"
        title="Settings"
        description={
          updatedAt
            ? `Last changed ${formatDateTime(updatedAt)}${editor ? ` by ${editor}` : ""}.`
            : "Nothing has been changed yet — these are the values written in the code."
        }
        actions={
          <Button variant="outline" onClick={load}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList data-lenis-prevent className="w-full justify-start overflow-x-auto sm:w-auto">
          {GROUPS.map((group) => (
            <TabsTrigger key={group.key} value={group.key}>
              <group.icon className="mr-2 h-4 w-4" />
              {group.label}
              {dirty.has(group.key) && (
                <span
                  aria-label="unsaved"
                  className="ml-2 h-1.5 w-1.5 rounded-full bg-terra-deep"
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ─────────────────────────────────────────────────── business */}
        <TabsContent value="business" className="space-y-6">
          <SectionCard
            title="Who the shop legally is"
            description="Two names, and they are not interchangeable. The trading name goes wherever a brand is named; the registered company goes wherever a party is."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Registered company" required
                  value={business.legalName}
                  onChange={(v) => patch("business", { legalName: v })}
                  hint="As it appears at the CAC. Goes on the invoice, the packing slip and the terms."
                />
                <TextField
                  label="Trading name" required
                  value={business.tradingName}
                  onChange={(v) => patch("business", { tradingName: v })}
                  hint="What customers call the shop. Email headers, page titles, the copyright line."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="RC number"
                  value={business.rcNumber}
                  onChange={(v) => patch("business", { rcNumber: v })}
                  warn={!business.rcNumber
                    ? "Empty. A Nigerian invoice is expected to carry it, and yours prints without one."
                    : undefined}
                  placeholder="1234567"
                />
                <TextField
                  label="TIN"
                  value={business.tin}
                  onChange={(v) => patch("business", { tin: v })}
                  hint="Optional. Printed under the RC number when set."
                />
              </div>
              <TextField
                label="Registered address"
                value={business.addressLine}
                onChange={(v) => patch("business", { addressLine: v })}
                warn={business.country === "Egypt"
                  ? "This prints on every invoice as the company's address. Alexandria is where you buy — a CAC-registered company has a Nigerian registered address."
                  : undefined}
                placeholder="Street and number"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="City" value={business.city}
                  onChange={(v) => patch("business", { city: v })} />
                <TextField label="Country" value={business.country}
                  onChange={(v) => patch("business", { country: v })} />
              </div>
              <Actions group="business" />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ──────────────────────────────────────────────────── contact */}
        <TabsContent value="contact" className="space-y-6">
          <SectionCard
            title="How customers reach you"
            description="Anything left blank is simply not shown, which is better than a placeholder somebody will try to ring."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Email" type="email" value={contact.email}
                  onChange={(v) => patch("contact", { email: v })}
                  placeholder="hello@ramazahstore.com"
                />
                <TextField
                  label="Phone" value={contact.phone}
                  onChange={(v) => patch("contact", { phone: v })}
                  placeholder="+234 800 000 0000"
                />
              </div>
              <TextField
                label="WhatsApp number" value={contact.whatsapp}
                onChange={(v) => patch("contact", { whatsapp: v.replace(/\D/g, "") })}
                hint="Digits only, country code first, no plus — this goes straight into a wa.me link. 2348030000000."
              />

              <div className="border-t border-rule pt-4">
                <TextField
                  label="Address" value={contact.addressLine}
                  onChange={(v) => patch("contact", { addressLine: v })}
                  hint="Where customers can visit, if they can. Leave blank to hide it."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField label="City" value={contact.city}
                  onChange={(v) => patch("contact", { city: v })} />
                <TextField label="Country" value={contact.country}
                  onChange={(v) => patch("contact", { country: v })} />
                <TextField label="Map link" value={contact.mapUrl}
                  onChange={(v) => patch("contact", { mapUrl: v })}
                  placeholder="https://www.google.com/maps/embed?…"
                  hint="An embed URL — Share → Embed a map — renders an actual map. A plain share link becomes an 'Open in Maps' button instead, because share links refuse to load in a frame." />
              </div>

              <Field
                label="Opening hours"
                hint="One line each. Leave it empty and the block disappears."
              >
                <div className="space-y-2">
                  {contact.openingHours.map((row, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={row.days}
                        onChange={(event) => patch("contact", {
                          openingHours: contact.openingHours.map((r, i) =>
                            i === index ? { ...r, days: event.target.value } : r),
                        })}
                        placeholder="Monday – Saturday"
                      />
                      <Input
                        value={row.hours}
                        onChange={(event) => patch("contact", {
                          openingHours: contact.openingHours.map((r, i) =>
                            i === index ? { ...r, hours: event.target.value } : r),
                        })}
                        placeholder="9:00 – 18:00"
                        className="tabular-nums"
                      />
                      <Button
                        variant="outline" size="sm"
                        onClick={() => patch("contact", {
                          openingHours: contact.openingHours.filter((_, i) => i !== index),
                        })}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline" size="sm"
                    onClick={() => patch("contact", {
                      openingHours: [...contact.openingHours, { days: "", hours: "" }],
                    })}
                  >
                    Add a line
                  </Button>
                </div>
              </Field>

              <div className="grid gap-4 border-t border-rule pt-4 sm:grid-cols-2">
                <TextField label="Instagram" value={contact.instagram}
                  onChange={(v) => patch("contact", { instagram: v })}
                  placeholder="https://instagram.com/…" />
                <TextField label="Facebook" value={contact.facebook}
                  onChange={(v) => patch("contact", { facebook: v })}
                  placeholder="https://facebook.com/…" />
                <TextField label="TikTok" value={contact.tiktok}
                  onChange={(v) => patch("contact", { tiktok: v })}
                  placeholder="https://tiktok.com/@…" />
                <TextField label="X" value={contact.x}
                  onChange={(v) => patch("contact", { x: v })}
                  placeholder="https://x.com/…" />
              </div>

              <Actions group="contact" />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ──────────────────────────────────────────── money & shipping */}
        <TabsContent value="money" className="space-y-6">
          <SectionCard
            title="What an order costs"
            description="These are added at checkout and printed on the invoice. The shop sells in Naira only."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="VAT rate" step="0.001" value={money.taxRate}
                  onChange={(v) => patch("money", { taxRate: v })}
                  hint={`As a decimal — 0.075 is 7.5%. Currently ${(money.taxRate * 100).toFixed(1)}%. Zero removes the line entirely.`}
                />
                <NumberField
                  label="Standard shipping (₦)" value={money.standardShipping}
                  onChange={(v) => patch("money", { standardShipping: v })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Free shipping over (₦)" value={money.freeShippingThreshold}
                  onChange={(v) => patch("money", { freeShippingThreshold: v })}
                  hint="Shown in the basket as a progress line."
                />
                <NumberField
                  label="Express surcharge (₦)" value={money.expressSurcharge}
                  onChange={(v) => patch("money", { expressSurcharge: v })}
                  hint="Quoted per order today. Zero hides it."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Delivery lead time" value={money.deliveryLeadTime}
                  onChange={(v) => patch("money", { deliveryLeadTime: v })}
                  hint="In the customer's words. Appears at checkout, on the confirmation and in three emails."
                />
                <TextField
                  label="Order number prefix" value={money.orderNumberPrefix}
                  onChange={(v) => patch("money", { orderNumberPrefix: v })}
                  warn="Changing this only affects new orders, and the number is also the payment reference — old invoices keep the old prefix."
                />
              </div>
              <Actions group="money" />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ──────────────────────────────────────────────────── payment */}
        <TabsContent value="payment" className="space-y-6">
          <SectionCard
            title="Where the money goes"
            description="There is no card checkout, so these details are how the shop gets paid. They print on every invoice and every payment email."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Bank" required value={payment.bankName}
                  onChange={(v) => patch("payment", { bankName: v })}
                  warn={!payment.bankName ? "Empty — the invoice prints a blank where the bank should be." : undefined}
                />
                <TextField
                  label="Account number" required value={payment.accountNumber}
                  onChange={(v) => patch("payment", { accountNumber: v.replace(/\s/g, "") })}
                  warn={!payment.accountNumber ? "Empty — nobody can pay you." : undefined}
                />
              </div>
              <TextField
                label="Account name" required value={payment.accountName}
                onChange={(v) => patch("payment", { accountName: v })}
                hint="Must match the name on the account letter for letter. A customer compares it against what their banking app shows, and a mismatch is where they stop and ask whether the shop is real."
              />
              <TextField
                label="SWIFT / BIC" value={payment.swift}
                onChange={(v) => patch("payment", { swift: v })}
                hint="Only for payments from outside Nigeria. Hidden when blank."
              />
              <AreaField
                label="The line under the details" rows={2} value={payment.note}
                onChange={(v) => patch("payment", { note: v })}
                hint="Worth keeping the bit about quoting the reference — an unreferenced transfer is one nobody can match to an order."
              />
              <Actions group="payment" />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ────────────────────────────────────────────────────── email */}
        <TabsContent value="email" className="space-y-6">
          <SectionCard
            title="How mail goes out"
            description="Staff notifications go to every active admin — there is nothing to set for that."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Sender name" value={email.fromName}
                  onChange={(v) => patch("email", { fromName: v })}
                  hint="What an inbox shows in the sender column — the most-read text in the whole system."
                />
                <TextField
                  label="Reply-to" type="email" value={email.replyTo}
                  onChange={(v) => patch("email", { replyTo: v })}
                  hint="Where a reply lands, on every email. The addresses below have no inbox behind them, so without this a customer's reply goes nowhere."
                />
              </div>

              <TextField
                label="Default sender address" type="email" value={email.fromAddress}
                onChange={(v) => patch("email", { fromAddress: v })}
                hint="Used for anything without its own address below, and for staff notifications. Blank falls back to EMAIL_FROM."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Orders and payment" type="email" value={email.orderFromAddress}
                  onChange={(v) => patch("email", { orderFromAddress: v })}
                  hint="Invoices, reminders, dispatch, review invitations — 11 emails."
                />
                <TextField
                  label="Accounts" type="email" value={email.accountFromAddress}
                  onChange={(v) => patch("email", { accountFromAddress: v })}
                  hint="Confirmation codes, password resets, welcome — 9 emails."
                />
                <TextField
                  label="Sourcing requests" type="email" value={email.requestFromAddress}
                  onChange={(v) => patch("email", { requestFromAddress: v })}
                  hint="Quotes and their reminders — 5 emails."
                />
                <TextField
                  label="Newsletters" type="email" value={email.marketingFromAddress}
                  onChange={(v) => patch("email", { marketingFromAddress: v })}
                  hint="Campaigns and promotions — 6 emails."
                />
              </div>

              <p className="max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted">
                Each blank one falls back to the default above, so you can use one address for
                everything or four. What separate addresses buy is legibility — the reader knows
                what an email is before opening it, and can filter on it.
              </p>

              <p className="max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted">
                <strong className="text-foreground">Every address you use here should exist as a
                forward.</strong> People reply to the From line even when Reply-to says otherwise,
                and an address with nothing behind it bounces them.
              </p>

              <p className="max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted">
                Both have to be on the domain your sending provider has verified — the one in
                <code className="mx-1 rounded-sm bg-wash px-1">EMAIL_FROM</code>. Anything else is
                rejected by the provider, so an address on another domain is ignored and the
                fallback is used instead.
              </p>

              <p className="max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted">
                The SMTP host, username and password stay in environment variables. A password in
                a database row turns up in backups, in screenshots and in any admin's devtools.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="When reminders go"
            description="All of these were literals inside a migration — the least reachable place in the system."
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="First payment reminder (days)" value={email.paymentReminderDays}
                  onChange={(v) => patch("email", { paymentReminderDays: v })}
                  hint="After the order, if it is still unpaid."
                />
                <NumberField
                  label="Second payment reminder (days)" value={email.paymentSecondReminderDays}
                  onChange={(v) => patch("email", { paymentSecondReminderDays: v })}
                  hint="Then it stops. A third reads as harassment."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Quote nudge (days)" value={email.quoteReminderDays}
                  onChange={(v) => patch("email", { quoteReminderDays: v })}
                  hint="One nudge for a quote nobody has answered."
                />
                <NumberField
                  label="Review invitation (days)" value={email.reviewInviteDays}
                  onChange={(v) => patch("email", { reviewInviteDays: v })}
                  hint="After delivery, once they have had it long enough to have an opinion."
                />
              </div>
              <ToggleField
                label="Send the morning digest"
                hint="One email at 8am to every admin: unpaid orders and how long they have waited, requests to quote, quotes awaiting an answer, low stock."
                checked={email.digestEnabled}
                onChange={(v) => patch("email", { digestEnabled: v })}
              />

              <NumberField
                label="Campaign send budget (per day)"
                value={email.campaignDailyBudget}
                onChange={(v) => patch("email", { campaignDailyBudget: v })}
                hint="A newsletter bigger than this goes out over several days instead of all at once. Zero sends the whole list immediately."
              />
              <p className="max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted">
                Set this <em>below</em> your plan's daily limit, not at it. Invoices and
                confirmations go through the same account, so a campaign that uses the whole day's
                allowance is a campaign that stops an order being confirmed. Resend's free tier
                allows 100 a day, which is where the default of 80 comes from.
              </p>
              <p className="max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted">
                Changing a delay affects orders placed from now on. Anything already queued keeps
                the date it was given — you can see and cancel those under Mailer.
              </p>
              <Actions group="email" />
            </div>
          </SectionCard>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────── shop */}
        <TabsContent value="shop" className="space-y-6">
          <SectionCard title="How the shop behaves">
            <div className="space-y-5">
              <NumberField
                label="Warn me below (units)" value={shop.lowStockThreshold}
                onChange={(v) => patch("shop", { lowStockThreshold: v })}
                hint="The default on a new product. Each product can override it."
              />
              <div className="border-t border-rule pt-4">
                <ToggleField
                  label="Taking sourcing requests"
                  hint="Turn this off when a run is full. The request form closes and says so, rather than accepting something nobody will look at."
                  checked={shop.acceptingRequests}
                  onChange={(v) => patch("shop", { acceptingRequests: v })}
                />
              </div>
              {!shop.acceptingRequests && (
                <AreaField
                  label="What the closed form says" rows={2}
                  value={shop.requestsClosedNote}
                  onChange={(v) => patch("shop", { requestsClosedNote: v })}
                />
              )}
              <Actions group="shop" />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <p className="flex items-start gap-2 font-body text-xs leading-relaxed text-ink-muted">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
        Each tab saves on its own, and a group that has never been saved shows the values written
        in the code. "Back to the defaults" deletes the saved row rather than freezing a copy, so
        an unset group keeps tracking the code.
      </p>
    </div>
  );
}
