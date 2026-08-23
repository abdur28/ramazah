"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Loader2,
  RefreshCcw,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill, { ACCOUNT_STATUS, ROLE } from "@/components/admin/ui/StatusPill";
import Pager from "@/components/ui/Pager";
import useAdmin from "@/hooks/admin/useAdmin";
import useDebounced from "@/hooks/useDebounced";
import { getCustomerSummary, type CustomerSummary } from "@/lib/admin/summaries";
import { useAuth } from "@/contexts/AuthContext";
import { getCustomerStats, type CustomerStats } from "@/lib/admin/customers";
import { formatDate, formatMoney, formatNumber } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";

/**
 * Customers.
 *
 * The suspend action was inverted. `handleToggleStatus` computed
 * `const newStatus = 'active'` with a `// Simplified for now` comment and sent
 * that, so confirming "Suspend Customer" set the account **active** — the
 * opposite of what the dialog said it would do, with a success toast either
 * way. There was also no way back: nothing in the admin could reinstate an
 * account, and `profiles.status` was never displayed, so a suspended customer
 * looked identical to an active one.
 *
 * The Orders column was `0` for everyone (see `lib/admin/customers.ts`). It now
 * carries real order counts and lifetime spend, which is what makes this a
 * customer list rather than a sign-up log.
 *
 * Fifty a page. The search covers name, email and phone and runs in the
 * database — searching the loaded page would have meant the search box worked
 * on the customers you could already see.
 *
 * Self-destructive actions are refused: an admin cannot demote or suspend their
 * own account, and the last admin cannot be demoted at all. Enforced in the
 * database — see `20260822000011_admin_self_guard.sql` — and reflected here so
 * the buttons are not offered in the first place.
 */
export default function AdminCustomersPage() {
  // Role and suspension moved to `/admin/customers/[id]`, where the order
  // history that ought to inform them is on the same screen.
  const { fetchUsers, users, loading, error, pagination } = useAdmin();
  const { user: currentUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Map<string, CustomerStats>>(new Map());
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const search = useDebounced(searchQuery);

  const load = useCallback(async () => {
    const filters = [];
    if (roleFilter !== "all") filters.push({ field: "role", value: roleFilter });
    if (statusFilter !== "all") filters.push({ field: "status", value: statusFilter });

    try {
      await fetchUsers({ page, search, filters });
    } catch (err) {
      console.error("Error loading customers:", err);
      toast.error(describeError(err, "Could not load customers."));
    }
  }, [fetchUsers, page, search, roleFilter, statusFilter, reloadKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Counts every account, so it stays put while you page and filter.
  useEffect(() => {
    getCustomerSummary().then(({ summary: totals, error: summaryError }) => {
      if (summaryError) {
        toast.error(describeError(summaryError, "Could not count the accounts."));
        return;
      }
      setSummary(totals);
    });
  }, [reloadKey]);

  /**
   * Spend and order counts for the page that just arrived, and only that page.
   * A second pass rather than part of `load`, because it depends on which
   * customers came back — and because a slow aggregate should not hold up the
   * names and emails, which is the part you are usually here for.
   */
  useEffect(() => {
    if (users.length === 0) {
      setStats(new Map());
      return;
    }

    let live = true;
    getCustomerStats(users.map((user) => user.uid)).then(({ stats: fetched, error: statsError }) => {
      // A page turned while this was in flight would otherwise write the
      // previous page's numbers over the current page's rows.
      if (!live) return;
      if (statsError) toast.error(describeError(statsError, "Could not load order totals."));
      setStats(fetched);
    });

    return () => {
      live = false;
    };
  }, [users]);

  /**
   * The store is the authority on which page is actually showing. Asking for a
   * page that no longer exists falls back to the first one, and the local state
   * has to follow or the next refresh asks for the missing page all over again.
   */
  useEffect(() => {
    if (pagination.users.page !== page) setPage(pagination.users.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.users.page]);

  const refresh = async () => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
    await load();
    setRefreshing(false);
  };

  const applyRole = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };
  const applyStatus = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };
  const applySearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const hasFilters = roleFilter !== "all" || statusFilter !== "all" || Boolean(searchQuery);
  const clearFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setPage(1);
  };

  const adminCount = summary?.admins ?? 0;
  const suspendedCount = summary?.suspended ?? 0;



  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Selling"
        title="Customers"
        description="Everyone with an account, what they have bought, and who can reach the admin."
        actions={
          <Button variant="outline" onClick={refresh} disabled={refreshing || loading.users}>
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${refreshing || loading.users ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accounts" value={formatNumber(summary?.total ?? 0)} icon={Users} />
        <StatCard
          label="Administrators"
          value={formatNumber(adminCount)}
          hint={adminCount === 1 ? "only one — consider a second" : "full admin access"}
          icon={Shield}
          tone={adminCount === 1 ? "attention" : "default"}
        />
        <StatCard
          label="Suspended"
          value={formatNumber(suspendedCount)}
          hint="cannot place orders"
          tone={suspendedCount > 0 ? "attention" : "default"}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            placeholder="Search by name, email or phone…"
            value={searchQuery}
            onChange={(event) => applySearch(event.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={applyRole}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Any role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any role</SelectItem>
            <SelectItem value="user">Customers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={applyStatus}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Suspended</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {error.users ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load customers"
          description={error.users}
          action={
            <Button variant="outline" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : loading.users && users.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading customers…
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? "Nobody matches those filters" : "No accounts yet"}
          description={
            hasFilters
              ? "Try a different search, or clear the filters."
              : "Customers appear here the moment they create an account."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-sm border border-rule bg-card">
          <div className="hidden border-b border-rule bg-wash/60 px-4 py-2.5 font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] lg:gap-4">
            <span>Customer</span>
            <span className="text-right">Orders</span>
            <span className="text-right">Spent</span>
            <span>Role</span>
            <span>Account</span>
            <span />
          </div>

          <ul className="divide-y divide-rule">
            {users.map((user) => {
              const stat = stats.get(user.uid);
              const isSelf = currentUser?.id === user.uid;
              const suspended = (user.status ?? "active") === "inactive";

              return (
                <li key={user.uid}>
                  <Link
                    href={`/admin/customers/${user.uid}`}
                    className="group grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-wash/50 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] lg:items-center lg:gap-4"
                  >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={user.photoURL} alt="" />
                      <AvatarFallback className="bg-wash font-body text-xs text-sage-deep">
                        {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-body text-sm text-foreground">
                        {user.displayName || "Unnamed"}
                        {isSelf && (
                          <span className="shrink-0 font-body text-[10px] uppercase tracking-[0.12em] text-ink-muted">
                            you
                          </span>
                        )}
                      </p>
                      <p className="truncate font-body text-xs text-ink-muted">{user.email}</p>
                    </div>
                  </div>

                  <span className="font-body text-sm tabular-nums text-foreground lg:text-right">
                    {formatNumber(stat?.orderCount ?? 0)}
                    <span className="ml-1 text-xs text-ink-muted lg:hidden">orders</span>
                  </span>

                  <span className="font-body text-sm tabular-nums text-foreground lg:text-right">
                    {stat && stat.spend > 0 ? (
                      <>
                        <span className="font-medium">{formatMoney(stat.spend, stat.currency)}</span>
                        <span className="block text-xs text-ink-muted">
                          last {formatDate(stat.lastOrderAt)}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </span>

                  <span>
                    <StatusPill status={user.role} map={ROLE} />
                  </span>

                  <span>
                    <StatusPill status={user.status ?? "active"} map={ACCOUNT_STATUS} />
                  </span>

                  <span className="justify-self-end">
                    <ChevronRight className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                  </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {users.length > 0 && (
        <Pager
          page={pagination.users.page}
          total={pagination.users.total}
          busy={loading.users}
          onChange={setPage}
          noun="accounts"
        />
      )}

    </div>
  );
}
