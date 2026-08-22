"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Loader2, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatusPill, {
  ACCOUNT_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  ROLE,
} from "@/components/admin/ui/StatusPill";
import useAdmin from "@/hooks/admin/useAdmin";
import useScrollLock from "@/hooks/useScrollLock";
import { getCustomerDetail, type CustomerDetail } from "@/lib/admin/customers";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/admin/format";
import type { UserProfile } from "@/types/types";
import { describeError } from "@/lib/admin/errors";

/**
 * One customer's record.
 *
 * Rebuilt because most of what it showed was not real. The Orders tab was a
 * hardcoded "No Orders Yet" panel that never ran a query; Total Orders and
 * Wishlist Items both read fields the profile mapper never populates, so they
 * printed `0` for everyone; Account Status was a literal `Active` badge
 * regardless of `profiles.status`; and the whole edit mode was unreachable —
 * the button that set `isEditing` had been commented out, leaving four branches
 * of dead form code behind it.
 *
 * What is shown now is queried. Wishlists are not included: `wishlist_items` is
 * owner-only in RLS, and that boundary is worth keeping.
 */
export default function UserDetailsDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}) {
  const { getUserById } = useAdmin();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useScrollLock(open);

  const load = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const [profile, { detail: fetched, error }] = await Promise.all([
        getUserById(userId),
        getCustomerDetail(userId),
      ]);
      if (error) throw new Error(error);
      setUser(profile);
      setDetail(fetched);
    } catch (err) {
      console.error("Error loading customer:", err);
      toast.error(describeError(err, "Could not load this customer."));
    } finally {
      setIsLoading(false);
    }
  }, [userId, getUserById]);

  useEffect(() => {
    if (open && userId) load();
    if (!open) {
      setUser(null);
      setDetail(null);
    }
  }, [open, userId, load]);

  const spend = (detail?.orders ?? [])
    .filter((order) => order.paymentStatus === "paid" && order.status !== "refunded")
    .reduce((sum, order) => sum + order.total, 0);
  const currency = detail?.orders[0]?.currency ?? "ngn";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        {isLoading || !user || !detail ? (
          <div className="flex items-center justify-center gap-2 py-24 font-body text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <DialogHeader className="border-b border-rule px-6 py-5 text-left">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 shrink-0">
                  <AvatarImage src={user.photoURL} alt="" />
                  <AvatarFallback className="bg-wash font-body text-sage-deep">
                    {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <DialogTitle className="flex flex-wrap items-center gap-2 font-body text-base font-medium">
                    {user.displayName || "Unnamed"}
                    <StatusPill status={user.role} map={ROLE} />
                    <StatusPill status={user.status ?? "active"} map={ACCOUNT_STATUS} />
                  </DialogTitle>
                  <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-sm text-ink-muted">
                    <a
                      href={`mailto:${user.email}`}
                      className="inline-flex items-center gap-1.5 hover:text-sage-deep"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </a>
                    {user.phone && (
                      <a
                        href={`tel:${user.phone}`}
                        className="inline-flex items-center gap-1.5 hover:text-sage-deep"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {user.phone}
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Joined {formatDate(user.createdAt)}
                    </span>
                  </DialogDescription>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Orders" value={formatNumber(detail.orders.length)} />
                <Stat label="Lifetime spend" value={formatMoney(spend, currency)} />
                <Stat label="Reviews written" value={formatNumber(detail.reviewCount)} />
              </dl>
            </DialogHeader>

            <Tabs defaultValue="orders" className="px-6 py-5">
              <TabsList>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="addresses">Addresses</TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-4">
                {detail.orders.length === 0 ? (
                  <p className="rounded-sm border border-dashed border-rule py-12 text-center font-body text-sm text-ink-muted">
                    No orders yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-rule rounded-sm border border-rule">
                    {detail.orders.map((order) => (
                      <li
                        key={order.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3"
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
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="addresses" className="mt-4">
                {detail.addresses.length === 0 ? (
                  <p className="rounded-sm border border-dashed border-rule py-12 text-center font-body text-sm text-ink-muted">
                    No saved addresses.
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {detail.addresses.map((address) => (
                      <li
                        key={address.id}
                        className="rounded-sm border border-rule p-4 font-body text-sm"
                      >
                        <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink-muted">
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
                          <p className="mt-2 text-xs text-ink-muted">{address.phone}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm bg-wash px-3 py-2.5">
      <dt className="font-body text-[10px] uppercase tracking-[0.14em] text-ink-muted">{label}</dt>
      <dd className="mt-1 font-body text-lg font-medium tabular-nums leading-none text-foreground">
        {value}
      </dd>
    </div>
  );
}
