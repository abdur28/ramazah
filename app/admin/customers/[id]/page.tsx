"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, Calendar, ChevronRight, Loader2, Mail, MapPin,
  MessageCircle, Package, Phone, RefreshCcw, Search, Star,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/admin/ui/PageHeader";
import SectionCard from "@/components/admin/ui/SectionCard";
import StatCard from "@/components/admin/ui/StatCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill, {
  ACCOUNT_STATUS, ORDER_STATUS, PAYMENT_STATUS, REQUEST_STATUS, REVIEW_STATUS, ROLE,
} from "@/components/admin/ui/StatusPill";
import CustomerAccount from "@/components/admin/customer/CustomerAccount";
import useAdmin from "@/hooks/admin/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { getCustomerDetail, type CustomerDetail } from "@/lib/admin/customers";
import {
  formatDate, formatDateTime, formatMoney, formatNumber, formatRelative,
} from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";
import type { UserProfile } from "@/types/types";

/**
 * One customer, in full.
 *
 * This was a dialog with two tabs. What it could not carry is most of what
 * matters about a customer here: their **sourcing requests** — the service this
 * business leads with, and which the dialog showed no sign of, so the screen
 * could not tell a buyer from someone who has asked for six things and bought
 * none of them — the reviews they have written rather than a count of them, and
 * the role and suspension controls, which lived in a row dropdown on the list
 * three clicks from any context that would say whether using them was right.
 *
 * The orders were also dead text. They are links now: an order on this page goes
 * to that order.
 */
export default function AdminCustomerPage() {
  const params = useParams();
  const userId = params.id as string;
  const { getUserById } = useAdmin();
  const { user: signedIn } = useAuth();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const profile = await getUserById(userId);
      if (!profile) {
        setError("This customer does not exist, or the account has been deleted.");
        return;
      }
      // The email is only known once the profile is in — the newsletter table is
      // keyed by email, since anyone can subscribe from the footer without an
      // account.
      const { detail: fetched, error: detailError } = await getCustomerDetail(
        userId,
        profile.email
      );
      if (detailError) throw new Error(detailError);

      setUser(profile);
      setDetail(fetched);
    } catch (err) {
      console.error("Error loading customer:", err);
      toast.error(describeError(err, "Could not load this customer."));
      setError("Could not load this customer.");
    } finally {
      setLoading(false);
    }
  }, [userId, getUserById]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-24 font-body text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the customer…
      </div>
    );
  }

  if (error || !user || !detail) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not open this customer"
        description={error ?? undefined}
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/customers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to customers
            </Link>
          </Button>
        }
      />
    );
  }

  const name = user.displayName || "Unnamed";
  const currency = detail.orders[0]?.currency ?? "ngn";

  // Cancelled and refunded orders count toward the tally but not the spend —
  // money that came back is not money the customer spent.
  const paidOrders = detail.orders.filter(
    (order) => order.paymentStatus === "paid" && order.status !== "refunded"
  );
  const spend = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const average = paidOrders.length > 0 ? spend / paidOrders.length : 0;
  const lastOrder = detail.orders[0];
  const openRequests = detail.requests.filter(
    (request) => request.status !== "fulfilled" && request.status !== "declined"
  ).length;
  const pendingReviews = detail.reviews.filter((review) => review.status === "pending").length;

  const whatsapp = user.phone ? user.phone.replace(/\D/g, "").replace(/^0/, "234") : null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/customers"
          className="mb-4 inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All customers
        </Link>

        <PageHeader
          eyebrow="People"
          title={name}
          description={`${user.email} · joined ${formatDate(user.createdAt)}`}
          actions={
            <Button variant="outline" onClick={load}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          }
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user.photoURL} alt="" />
            <AvatarFallback className="bg-wash font-body text-sage-deep">
              {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <StatusPill status={user.role} map={ROLE} />
          <StatusPill status={user.status ?? "active"} map={ACCOUNT_STATUS} />
          {detail.newsletter && (
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-wash/60 px-2 py-1 font-body text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              <Mail className="h-3 w-3" />
              On the newsletter
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={formatNumber(detail.counts.orders)} icon={Package} />
        <StatCard
          label="Lifetime spend"
          value={formatMoney(spend, currency)}
          hint={paidOrders.length > 0 ? `${formatNumber(paidOrders.length)} settled` : "nothing settled"}
        />
        <StatCard
          label="Average order"
          value={average > 0 ? formatMoney(average, currency) : "—"}
          hint={lastOrder ? `last ${formatRelative(lastOrder.createdAt)}` : "no orders yet"}
        />
        <StatCard
          label="Open requests"
          value={formatNumber(openRequests)}
          hint={openRequests > 0 ? "waiting on the shop" : "none outstanding"}
          tone={openRequests > 0 ? "attention" : "default"}
          icon={Search}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        {/* ------------------------------------------------------------ main */}
        <div className="space-y-6">
          <SectionCard title={`Orders (${detail.counts.orders})`} flush>
            {detail.orders.length === 0 ? (
              <p className="px-5 py-10 text-center font-body text-sm text-ink-muted">
                No orders yet.
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {detail.orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="group flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-wash/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-body text-sm tabular-nums text-foreground">
                          {order.orderNumber}
                        </span>
                        <span className="block truncate font-body text-xs text-ink-muted">
                          {formatDateTime(order.createdAt)} · {order.itemCount}{" "}
                          {order.itemCount === 1 ? "item" : "items"}
                        </span>
                      </span>
                      <span className="shrink-0 font-body text-sm font-medium tabular-nums text-foreground">
                        {formatMoney(order.total, order.currency)}
                      </span>
                      <StatusPill status={order.status} map={ORDER_STATUS} />
                      <StatusPill status={order.paymentStatus} map={PAYMENT_STATUS} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {/* The panel lists the most recent hundred; the heading counts them
                all. Saying so is the difference between a capped list and a
                list that is quietly wrong. */}
            {detail.counts.orders > detail.orders.length && (
              <p className="border-t border-rule px-5 py-2.5 font-body text-xs text-ink-muted">
                Showing the most recent {detail.orders.length} of {detail.counts.orders}.
              </p>
            )}
          </SectionCard>

          {/* The sourcing service, which the dialog this replaced never showed. */}
          <SectionCard
            title={`Sourcing requests (${detail.counts.requests})`}
            description="What they have asked us to find."
            flush
          >
            {detail.requests.length === 0 ? (
              <p className="px-5 py-10 text-center font-body text-sm text-ink-muted">
                They have not asked us to source anything.
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {detail.requests.map((request) => (
                  <li key={request.id}>
                    <Link
                      href={`/admin/requests?q=${encodeURIComponent(request.item)}`}
                      className="group flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-wash/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-body text-sm text-foreground">
                          {request.item}
                        </span>
                        <span className="block truncate font-body text-xs text-ink-muted">
                          {formatDateTime(request.createdAt)} · {request.quantity}{" "}
                          {request.quantity === 1 ? "unit" : "units"}
                          {request.budget !== undefined &&
                            ` · budget ${formatMoney(request.budget, currency)}`}
                        </span>
                      </span>
                      {request.quotedAmount !== undefined && (
                        <span className="shrink-0 font-body text-sm font-medium tabular-nums text-foreground">
                          {formatMoney(request.quotedAmount, currency)}
                        </span>
                      )}
                      <StatusPill status={request.status} map={REQUEST_STATUS} />
                      <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {detail.counts.requests > detail.requests.length && (
              <p className="border-t border-rule px-5 py-2.5 font-body text-xs text-ink-muted">
                Showing the most recent {detail.requests.length} of {detail.counts.requests}.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title={`Reviews (${detail.counts.reviews})`}
            description={
              pendingReviews > 0
                ? `${formatNumber(pendingReviews)} still waiting on you.`
                : undefined
            }
            flush
          >
            {detail.reviews.length === 0 ? (
              <p className="px-5 py-10 text-center font-body text-sm text-ink-muted">
                They have not written any reviews.
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {detail.reviews.map((review) => (
                  <li key={review.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="font-body text-sm tabular-nums text-sage-deep"
                        aria-label={`${review.rating} out of 5`}
                      >
                        {"★".repeat(review.rating)}
                        <span className="text-ink-faint">{"★".repeat(5 - review.rating)}</span>
                      </span>
                      {review.productSlug ? (
                        <Link
                          href={`/product/${review.productSlug}`}
                          className="min-w-0 truncate font-body text-sm text-foreground transition-colors hover:text-sage-deep"
                        >
                          {review.productName}
                        </Link>
                      ) : (
                        <span className="min-w-0 truncate font-body text-sm text-ink-muted">
                          {review.productName}
                        </span>
                      )}
                      <StatusPill status={review.status} map={REVIEW_STATUS} />
                    </div>

                    {review.title && (
                      <p className="mt-1.5 font-body text-sm font-medium text-foreground">
                        {review.title}
                      </p>
                    )}
                    {review.body && (
                      <p className="mt-1 max-w-[70ch] font-body text-sm text-ink-muted">
                        {review.body}
                      </p>
                    )}
                    <p className="mt-1 font-body text-xs text-ink-faint">
                      {formatDateTime(review.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {detail.counts.reviews > detail.reviews.length && (
              <p className="border-t border-rule px-5 py-2.5 font-body text-xs text-ink-muted">
                Showing the most recent {detail.reviews.length} of {detail.counts.reviews}.
              </p>
            )}
          </SectionCard>
        </div>

        {/* --------------------------------------------------------- sidebar */}
        <div className="space-y-6">
          <SectionCard title="Contact">
            <div className="space-y-3">
              <ContactLink
                icon={Mail}
                href={`mailto:${user.email}`}
              >
                {user.email}
              </ContactLink>

              {user.phone ? (
                <>
                  <ContactLink icon={Phone} href={`tel:${user.phone}`}>
                    {user.phone}
                  </ContactLink>
                  {whatsapp && (
                    <ContactLink
                      icon={MessageCircle}
                      href={`https://wa.me/${whatsapp}`}
                      external
                    >
                      Message on WhatsApp
                    </ContactLink>
                  )}
                </>
              ) : (
                <p className="font-body text-sm text-ink-muted">No phone number on file.</p>
              )}

              <p className="flex items-center gap-2 font-body text-sm text-ink-muted">
                <Calendar className="h-4 w-4 shrink-0 text-ink-faint" />
                Joined {formatDate(user.createdAt)}
              </p>
            </div>
          </SectionCard>

          <CustomerAccount
            user={user}
            isSelf={signedIn?.id === user.uid}
            onChanged={load}
          />

          <SectionCard title={`Addresses (${detail.addresses.length})`}>
            {detail.addresses.length === 0 ? (
              <p className="font-body text-sm text-ink-muted">No saved addresses.</p>
            ) : (
              <ul className="space-y-4">
                {detail.addresses.map((address) => (
                  <li key={address.id} className="font-body text-sm">
                    <p className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                      <MapPin className="h-3.5 w-3.5" />
                      {address.isDefault ? "Default" : "Address"}
                    </p>
                    <address className="not-italic text-foreground">
                      {address.fullName}
                      <br />
                      {address.street}
                      <br />
                      {address.city}
                      {address.state && `, ${address.state}`}
                      {address.postalCode && ` ${address.postalCode}`}
                      <br />
                      {address.country}
                    </address>
                    {address.phone && (
                      <p className="mt-1 text-xs text-ink-muted">{address.phone}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Wishlists are deliberately absent, and saying so is better than
              leaving a reader wondering where they went. */}
          <p className="flex items-start gap-2 font-body text-xs leading-relaxed text-ink-faint">
            <Star className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Wishlists are not shown. They are owner-only in the database, and staff should see
            what someone bought rather than what they are considering.
          </p>
        </div>
      </div>
    </div>
  );
}

function ContactLink({
  icon: Icon,
  href,
  external,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="flex items-center gap-2 font-body text-sm text-sage-deep transition-colors hover:text-foreground"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </a>
  );
}
