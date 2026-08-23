"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/admin/ui/SectionCard";
import useAdmin from "@/hooks/admin/useAdmin";
import useScrollLock from "@/hooks/useScrollLock";
import { describeError } from "@/lib/admin/errors";
import type { UserProfile } from "@/types/types";

/**
 * Role and account state, on the customer's own page.
 *
 * These were buried in a row dropdown on the list, three clicks from anything
 * that would tell you whether they were the right thing to do. Here they sit
 * under the person's order history, which is the context anyone needs before
 * suspending an account.
 *
 * The guards are in the database (`set_user_role`, `set_user_status`), not here:
 * an admin cannot demote themselves, suspend themselves, or demote the last
 * remaining admin. This screen greys the buttons for the first two so the
 * refusal is visible before the click, but the RPC is the boundary — a check in
 * React only protects the button.
 */
type Intent = "promote" | "demote" | "suspend" | "reinstate";

export default function CustomerAccount({
  user,
  isSelf,
  onChanged,
}: {
  user: UserProfile;
  isSelf: boolean;
  onChanged: () => void;
}) {
  const { assignUserRole, toggleUserStatus } = useAdmin();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [saving, setSaving] = useState(false);

  useScrollLock(intent !== null);

  const isAdmin = user.role === "admin";
  const suspended = (user.status ?? "active") === "inactive";
  const name = user.displayName || user.email;

  const COPY: Record<Intent, { title: string; body: string; confirm: string; destructive?: boolean }> = {
    promote: {
      title: `Make ${name} an admin?`,
      body: "They get the whole admin area — orders, products, customers, payments. There is no partial access.",
      confirm: "Make admin",
    },
    demote: {
      title: `Remove admin access from ${name}?`,
      body: "They keep their account, their orders and their history, and lose the admin area.",
      confirm: "Remove access",
      destructive: true,
    },
    suspend: {
      title: `Suspend ${name}?`,
      body: "They keep their account and their history, but cannot place new orders until you reinstate them.",
      confirm: "Suspend",
      destructive: true,
    },
    reinstate: {
      title: `Reinstate ${name}?`,
      body: "They can sign in and order again straight away.",
      confirm: "Reinstate",
    },
  };

  const run = async () => {
    if (!intent) return;
    setSaving(true);
    try {
      if (intent === "promote" || intent === "demote") {
        await assignUserRole(user.uid, intent === "promote" ? "admin" : "user");
        toast.success(intent === "promote" ? `${name} is now an admin.` : `${name} is now a customer.`);
      } else {
        await toggleUserStatus(user.uid, intent === "suspend" ? "inactive" : "active");
        toast.success(intent === "suspend" ? `${name} suspended.` : `${name} reinstated.`);
      }
      setIntent(null);
      onChanged();
    } catch (err) {
      toast.error(describeError(err, "Could not change the account."));
    } finally {
      setSaving(false);
    }
  };

  const config = intent ? COPY[intent] : null;

  return (
    <>
      <SectionCard title="Account">
        <div className="space-y-3">
          <Row label="Role" value={isAdmin ? "Administrator" : "Customer"} />
          <Row label="Status" value={suspended ? "Suspended" : "Active"} />
          <Row label="Email verified" value={user.emailVerified ? "Yes" : "Not yet"} />

          {isSelf ? (
            <p className="rounded-sm bg-wash/60 px-3 py-2.5 font-body text-xs leading-relaxed text-ink-muted">
              This is your own account. You cannot change your own role or suspend yourself —
              another administrator has to.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 border-t border-rule pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIntent(isAdmin ? "demote" : "promote")}
              >
                {isAdmin ? (
                  <><ShieldOff className="mr-2 h-3.5 w-3.5" />Remove admin</>
                ) : (
                  <><ShieldCheck className="mr-2 h-3.5 w-3.5" />Make admin</>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIntent(suspended ? "reinstate" : "suspend")}
                className={suspended ? "" : "text-destructive hover:text-destructive"}
              >
                {suspended ? (
                  <><UserCheck className="mr-2 h-3.5 w-3.5" />Reinstate</>
                ) : (
                  <><UserX className="mr-2 h-3.5 w-3.5" />Suspend</>
                )}
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      <AlertDialog
        open={intent !== null}
        onOpenChange={(open) => !open && !saving && setIntent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">{config?.title}</AlertDialogTitle>
            <AlertDialogDescription>{config?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                run();
              }}
              disabled={saving}
              className={config?.destructive ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
              ) : (
                config?.confirm
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 font-body text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
