"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Check, Loader2, Lock, MapPin, Package, ShoppingBag, Store, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { NIGERIAN_STATES } from "@/constants";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/types";

/**
 * Checkout, rebuilt.
 *
 * What was here was hoodskool's, and three things in it were wrong rather than
 * merely dated. The country dropdown offered **exactly one option — Russia** —
 * and the form defaulted to `"RU"`, so a Nigerian shop's checkout could not
 * express a Nigerian address. There was no state field at all, which for a
 * courier is most of the address. And the empty-basket button linked to
 * `/clothings`, a route that has never existed here.
 *
 * The design follows from the payment model rather than from a template. There
 * is no card step: placing the order raises an invoice and the shop packs when
 * the transfer lands. So the page does not pretend to be a payment form — no
 * "Secure checkout" padlock over a form that takes no card, no fake step
 * counter through a card stage that does not exist. It says what will happen,
 * in the order it happens, and the button says "Place order" rather than
 * "Proceed to payment".
 *
 * Two columns on desktop: what we need from you on the left, what you are
 * getting on the right, pinned so the total stays visible while the form is
 * filled. One column on a phone, summary last — nobody fills in an address to
 * re-read a list they just came from.
 */
interface CheckoutPageProps {
  userProfile: UserProfile | null;
}

export default function CheckoutPage({ userProfile }: CheckoutPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { items, itemCount, checkout } = useCart();
  const { formatPrice, getPrice, currency } = useCurrency();
  const { money, contact } = useSettings();

  const [deliveryType, setDeliveryType] = useState<"delivery" | "inStore">("delivery");
  const [isProcessing, setIsProcessing] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [note, setNote] = useState("");

  // Nigeria, not Russia. The old default was "RU" and the only option was Russia.
  const country = "Nigeria";

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.email) setEmail(userProfile.email);
    if (userProfile.phone) setPhone(userProfile.phone);
    if (userProfile.displayName) setFullName(userProfile.displayName);

    const saved = userProfile.address;
    if (saved) {
      if (saved.fullName) setFullName(saved.fullName);
      if (saved.phone) setPhone(saved.phone);
      if (saved.street) setStreet(saved.street);
      if (saved.city) setCity(saved.city);
      if (saved.state) setState(saved.state);
      if (saved.zipCode) setZipCode(saved.zipCode);
    }
  }, [userProfile]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + getPrice(item.prices) * item.quantity, 0
    );
    const tax = subtotal * money.taxRate;
    const shipping =
      deliveryType === "delivery"
        ? subtotal >= money.freeShippingThreshold ? 0 : money.standardShipping
        : 0;

    return { subtotal, tax, shipping, total: subtotal + tax + shipping };
  }, [items, getPrice, deliveryType, money]);

  const awayFromFreeShipping = Math.max(0, money.freeShippingThreshold - totals.subtotal);

  const contactDone = Boolean(email.trim() && phone.trim() && fullName.trim());
  const addressDone =
    deliveryType === "inStore" ||
    Boolean(street.trim() && city.trim() && state.trim());
  const ready = contactDone && addressDone && items.length > 0;

  const placeOrder = async () => {
    if (!user?.id) {
      toast.error("Sign in again — your session has expired.");
      return;
    }
    if (!ready) {
      toast.error(
        !contactDone
          ? "We need a name, an email and a phone number."
          : "We need somewhere to deliver to."
      );
      return;
    }

    setIsProcessing(true);
    try {
      const result = await checkout(
        user.id,
        {
          deliveryType,
          email: email.trim(),
          phone: phone.trim(),
          fullName: fullName.trim(),
          note: note.trim() || undefined,
          shippingAddress:
            deliveryType === "delivery"
              ? { street: street.trim(), city: city.trim(), state, zipCode: zipCode.trim(), country }
              : undefined,
        },
        currency.code,
        money
      );

      if (!result.success) {
        toast.error(result.error || "Could not place the order. Nothing has been charged.");
        setIsProcessing(false);
        return;
      }

      // Nothing is paid yet, so the toast does not congratulate anybody — the
      // confirmation page carries the account details.
      toast.success("Order received.");
      router.push(`/checkout/success?orderId=${result.orderId}`);
    } catch (error: any) {
      toast.error(error?.message || "Could not place the order. Nothing has been charged.");
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────── empty basket
  if (items.length === 0 && !isProcessing) {
    return (
      <main className="min-h-screen bg-background pt-16 md:pt-20">
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-28 text-center">
          <ShoppingBag className="h-8 w-8 text-ink-faint" />
          <h1 className="mt-6 font-heading text-4xl font-light text-foreground">
            Nothing in your basket
          </h1>
          <p className="mt-3 max-w-[46ch] font-body text-base leading-relaxed text-ink-muted">
            Add something and it will wait for you here. The basket is saved to your account,
            so it survives closing the tab.
          </p>
          {/* Was /clothings — a hoodskool route that has never existed here. */}
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-sm bg-sage-deep px-7 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
          >
            Have a look around
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pt-16 md:pt-20">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the basket
        </Link>

        <h1 className="mt-5 font-heading text-4xl font-light leading-tight text-foreground md:text-5xl">
          Checkout
        </h1>
        <p className="mt-3 max-w-[58ch] font-body text-base leading-relaxed text-ink-muted">
          There is no card step. Placing the order raises an invoice, and we pack it as soon as
          your transfer reaches us.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
          {/* ────────────────────────────────────────────────── the form */}
          <div className="space-y-10">
            <Step number={1} title="Who it is for" done={contactDone}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required className="sm:col-span-2">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Fatima Bello" autoComplete="name" />
                </Field>
                <Field label="Email" required hint="Your invoice goes here.">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" autoComplete="email" />
                </Field>
                <Field label="Phone" required hint="How the courier reaches you.">
                  <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 000 0000" autoComplete="tel" className="tabular-nums" />
                </Field>
              </div>
            </Step>

            <Step number={2} title="How it reaches you" done>
              <div className="grid gap-3 sm:grid-cols-2">
                <Choice
                  active={deliveryType === "delivery"}
                  onClick={() => setDeliveryType("delivery")}
                  icon={Truck}
                  title="Delivery"
                  note={`Anywhere in Nigeria, ${money.deliveryLeadTime} from dispatch.`}
                  price={
                    totals.subtotal >= money.freeShippingThreshold
                      ? "Free"
                      : formatPrice(money.standardShipping)
                  }
                />
                <Choice
                  active={deliveryType === "inStore"}
                  onClick={() => setDeliveryType("inStore")}
                  icon={Store}
                  title="Collect in store"
                  note={
                    [contact.addressLine, contact.city].filter(Boolean).join(", ") ||
                    "We will message you when it is ready."
                  }
                  price="Free"
                />
              </div>

              {deliveryType === "delivery" && awayFromFreeShipping > 0 && (
                <p className="mt-3 font-body text-xs text-ink-muted">
                  {formatPrice(awayFromFreeShipping)} more and delivery is free.
                </p>
              )}
            </Step>

            {deliveryType === "delivery" && (
              <Step number={3} title="Where to" done={addressDone}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Street address" required className="sm:col-span-2">
                    <Input value={street} onChange={(e) => setStreet(e.target.value)}
                      placeholder="14 Ahmadu Bello Way" autoComplete="street-address" />
                  </Field>
                  <Field label="City" required>
                    <Input value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="Kaduna" autoComplete="address-level2" />
                  </Field>
                  <Field label="State" required>
                    {/* Thirty-six states and the FCT. There was no state field
                        at all, which for a courier is most of the address. */}
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger><SelectValue placeholder="Choose a state" /></SelectTrigger>
                      <SelectContent data-lenis-prevent className="max-h-64">
                        {NIGERIAN_STATES.map((option) => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Postcode" hint="Optional — most Nigerian addresses do without one.">
                    <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)}
                      placeholder="800001" autoComplete="postal-code" className="tabular-nums" />
                  </Field>
                  <Field label="Country">
                    <Input value={country} readOnly disabled />
                  </Field>
                </div>
              </Step>
            )}

            <Step number={deliveryType === "delivery" ? 4 : 3} title="Anything we should know" done>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="A landmark, a gate code, a time that suits — anything that helps it arrive."
              />
            </Step>
          </div>

          {/* ──────────────────────────────────────────────── the summary */}
          <div className="lg:sticky lg:top-28">
            <div className="rounded-sm border border-rule bg-card p-6">
              <h2 className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </h2>

              <ul data-lenis-prevent className="mt-4 max-h-72 space-y-4 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-wash">
                      {item.image ? (
                        <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <Package className="h-4 w-4 text-ink-faint" />
                        </span>
                      )}
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sage-deep px-1 font-body text-[10px] tabular-nums text-background">
                        {item.quantity}
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body text-sm text-foreground">
                        {item.name}
                      </span>
                      {(item.size || item.color) && (
                        <span className="block truncate font-body text-xs text-ink-muted">
                          {[item.color?.name, item.size].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>

                    <span className="shrink-0 font-body text-sm tabular-nums text-foreground">
                      {formatPrice(getPrice(item.prices) * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 space-y-2 border-t border-rule pt-4 font-body text-sm">
                <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
                {money.taxRate > 0 && (
                  <Row
                    label={`VAT (${(money.taxRate * 100).toFixed(1).replace(/\.0$/, "")}%)`}
                    value={formatPrice(totals.tax)}
                  />
                )}
                <Row
                  label={deliveryType === "inStore" ? "Collection" : "Delivery"}
                  value={totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}
                />
                <div className="flex items-baseline justify-between border-t border-rule pt-3">
                  <dt className="font-body text-sm font-medium text-foreground">Total</dt>
                  <dd className="font-body text-xl font-medium tabular-nums text-foreground">
                    {formatPrice(totals.total)}
                  </dd>
                </div>
              </dl>

              {/* Said before the button, not after it. A customer expecting a
                  card screen and not getting one assumes the order failed. */}
              <div className="mt-6 rounded-sm bg-wash/70 px-4 py-3.5">
                <p className="font-body text-xs leading-relaxed text-ink-muted">
                  <span className="text-foreground">Nothing is charged now.</span> Placing the
                  order sends you an invoice with our account details. We pack it as soon as the
                  transfer lands.
                </p>
              </div>

              <button
                type="button"
                onClick={placeOrder}
                disabled={!ready || isProcessing}
                className={cn(
                  "mt-4 flex w-full items-center justify-center gap-2 rounded-sm px-6 py-4 font-body text-[11px] font-medium uppercase tracking-[0.16em] transition-colors",
                  ready && !isProcessing
                    ? "bg-sage-deep text-background hover:bg-foreground"
                    : "cursor-not-allowed bg-wash text-ink-muted"
                )}
              >
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Placing your order…</>
                ) : (
                  <>Place order<Check className="h-3.5 w-3.5" /></>
                )}
              </button>

              {!ready && (
                <p className="mt-3 font-body text-xs text-ink-muted">
                  {!contactDone
                    ? "Fill in your name, email and phone number."
                    : "Choose a state and give us a street address."}
                </p>
              )}

              {/* No padlock and no "authenticity guaranteed". There is no card to
                  secure, and a badge that promises nothing specific is noise. */}
              <ul className="mt-5 space-y-1.5 font-body text-xs text-ink-muted">
                <li className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  We never see or store card details — there is no card payment.
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  Delivered anywhere in Nigeria, {money.deliveryLeadTime} from dispatch.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────── pieces */

function Step({
  number, title, done, children,
}: {
  number: number; title: string; done?: boolean; children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-body text-xs tabular-nums transition-colors",
            done ? "bg-sage-deep text-background" : "border border-rule text-ink-muted"
          )}
        >
          {done ? <Check className="h-3.5 w-3.5" /> : number}
        </span>
        <h2 className="font-heading text-2xl font-light text-foreground md:text-[28px]">
          {title}
        </h2>
      </div>
      <div className="pl-0 sm:pl-10">{children}</div>
    </motion.section>
  );
}

function Field({
  label, hint, required, className, children,
}: {
  label: string; hint?: string; required?: boolean;
  className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="font-body text-xs text-ink-muted">
        {label}
        {required && <span className="ml-1 text-terra-ink">*</span>}
      </Label>
      {children}
      {hint && <p className="font-body text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function Choice({
  active, onClick, icon: Icon, title, note, price,
}: {
  active: boolean; onClick: () => void; icon: any;
  title: string; note: string; price: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-sm border p-4 text-left transition-colors",
        active ? "border-sage-deep bg-wash" : "border-rule hover:border-sage"
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-body text-sm text-foreground">
          <Icon className="h-4 w-4 text-sage-deep" />
          {title}
        </span>
        <span className="font-body text-sm tabular-nums text-foreground">{price}</span>
      </span>
      <span className="mt-1.5 block font-body text-xs leading-relaxed text-ink-muted">
        {note}
      </span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
