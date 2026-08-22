"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Eye,
  Loader2,
  MoreHorizontal,
  RefreshCcw,
  Search,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageHeader from "@/components/admin/ui/PageHeader";
import StatCard from "@/components/admin/ui/StatCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import StatusPill, { ACCOUNT_STATUS, ROLE } from "@/components/admin/ui/StatusPill";
import UserDetailsDialog from "@/components/admin/UserDetailsDialog";
import useAdmin from "@/hooks/admin/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { getCustomerStats, type CustomerStats } from "@/lib/admin/customers";
import { formatDate, formatMoney, formatNumber } from "@/lib/admin/format";
import type { UserProfile } from "@/types/types";
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
 * Self-destructive actions are refused: an admin cannot demote or suspend their
 * own account, and the last admin cannot be demoted at all. Enforced in the
 * database — see `20260822000011_admin_self_guard.sql` — and reflected here so
 * the buttons are not offered in the first place.
 */
export default function AdminCustomersPage() {
  const { fetchUsers, toggleUserStatus, assignUserRole, users, loading, error, pagination, resetUsers } =
    useAdmin();
  const { user: currentUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<Map<string, CustomerStats>>(new Map());

  const [suspendTarget, setSuspendTarget] = useState<UserProfile | null>(null);
  const [roleTarget, setRoleTarget] = useState<UserProfile | null>(null);
  const [nextRole, setNextRole] = useState<"user" | "admin">("user");
  const [detailsUserId, setDetailsUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setRefreshing(true);
    resetUsers();
    try {
      const [, { stats: fetched, error: statsError }] = await Promise.all([
        fetchUsers({ limit: 50 }),
        getCustomerStats(),
      ]);
      if (statsError) throw new Error(statsError);
      setStats(fetched);
    } catch (err) {
      console.error("Error loading customers:", err);
      toast.error(describeError(err, "Could not load customers."));
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (statusFilter !== "all" && (user.status ?? "active") !== statusFilter) return false;

      if (query) {
        const haystack = `${user.displayName ?? ""} ${user.email ?? ""} ${user.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  const hasFilters = roleFilter !== "all" || statusFilter !== "all" || Boolean(searchQuery);
  const clearFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  const adminCount = users.filter((user) => user.role === "admin").length;
  const suspendedCount = users.filter((user) => (user.status ?? "active") === "inactive").length;

  const handleSuspendToggle = async () => {
    if (!suspendTarget) return;
    const suspending = (suspendTarget.status ?? "active") === "active";

    setProcessing(true);
    try {
      await toggleUserStatus(suspendTarget.uid, suspending ? "inactive" : "active");
      toast.success(
        suspending
          ? `${suspendTarget.displayName || suspendTarget.email} suspended.`
          : `${suspendTarget.displayName || suspendTarget.email} reinstated.`
      );
      setSuspendTarget(null);
      loadUsers();
    } catch (err: any) {
      toast.error(describeError(err, "Could not change the account status."));
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleTarget) return;
    setProcessing(true);
    try {
      await assignUserRole(roleTarget.uid, nextRole);
      toast.success(
        nextRole === "admin"
          ? `${roleTarget.displayName || roleTarget.email} is now an admin.`
          : `${roleTarget.displayName || roleTarget.email} is now a customer.`
      );
      setRoleTarget(null);
    } catch (err: any) {
      toast.error(describeError(err, "Could not change the role."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Selling"
        title="Customers"
        description="Everyone with an account, what they have bought, and who can reach the admin."
        actions={
          <Button variant="outline" onClick={loadUsers} disabled={refreshing || loading.users}>
            <RefreshCcw
              className={`mr-2 h-4 w-4 ${refreshing || loading.users ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Accounts" value={formatNumber(users.length)} icon={Users} />
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
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Any role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any role</SelectItem>
            <SelectItem value="user">Customers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <Button variant="outline" onClick={loadUsers}>
              Try again
            </Button>
          }
        />
      ) : loading.users && users.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading customers…
        </div>
      ) : filtered.length === 0 ? (
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
            {filtered.map((user) => {
              const stat = stats.get(user.uid);
              const isSelf = currentUser?.id === user.uid;
              const suspended = (user.status ?? "active") === "inactive";

              return (
                <li
                  key={user.uid}
                  className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-wash/50 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] lg:items-center lg:gap-4"
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Actions for {user.displayName || user.email}</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailsUserId(user.uid)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View details
                        </DropdownMenuItem>

                        {/* Both actions are refused by the database for your own
                            account, so they are not offered here either. */}
                        {!isSelf && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setRoleTarget(user);
                                setNextRole(user.role === "admin" ? "user" : "admin");
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              {user.role === "admin" ? "Remove admin access" : "Make admin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSuspendTarget(user)}
                              className={suspended ? "" : "text-destructive"}
                            >
                              {suspended ? (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Reinstate account
                                </>
                              ) : (
                                <>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend account
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pagination.users.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchUsers({ limit: 50, startAfter: pagination.users.lastDoc })}
            disabled={loading.users}
          >
            {loading.users && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Load more
          </Button>
        </div>
      )}

      {/* --------------------------------------------------- suspend/reinstate */}
      <AlertDialog
        open={Boolean(suspendTarget)}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">
              {(suspendTarget?.status ?? "active") === "inactive"
                ? `Reinstate ${suspendTarget?.displayName || "this customer"}?`
                : `Suspend ${suspendTarget?.displayName || "this customer"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(suspendTarget?.status ?? "active") === "inactive"
                ? "They will be able to sign in and place orders again."
                : "They keep their account and their history, but cannot place new orders until you reinstate them."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspendToggle}
              disabled={processing}
              className={
                (suspendTarget?.status ?? "active") === "inactive"
                  ? ""
                  : "bg-destructive hover:bg-destructive/90"
              }
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working…
                </>
              ) : (suspendTarget?.status ?? "active") === "inactive" ? (
                "Reinstate"
              ) : (
                "Suspend"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------------------------------------------------------------- role */}
      <AlertDialog open={Boolean(roleTarget)} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">
              {nextRole === "admin"
                ? `Make ${roleTarget?.displayName || "this person"} an admin?`
                : `Remove admin access from ${roleTarget?.displayName || "this person"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {nextRole === "admin"
                ? "Admins can see every order and customer, change prices and stock, moderate reviews, and email your whole list. They will need to sign out and back in for it to take effect."
                : "They keep their account and their order history, and lose access to the admin area."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {nextRole === "admin" && (
            <p className="flex items-start gap-2 rounded-sm bg-terra/[0.06] p-3 font-body text-sm text-terra-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Only do this for someone you trust with the whole shop.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRoleChange} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : nextRole === "admin" ? (
                "Make admin"
              ) : (
                "Remove access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserDetailsDialog
        open={Boolean(detailsUserId)}
        onOpenChange={(open) => !open && setDetailsUserId(null)}
        userId={detailsUserId}
      />
    </div>
  );
}
