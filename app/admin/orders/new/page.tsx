"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Package, Plus, Save, Search, Store, Trash2, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/admin/ui/PageHeader";
import SectionCard from "@/components/admin/ui/SectionCard";
import { createManualOrder, type ManualOrderLine } from "@/lib/orders";
import { searchOrderableVariants, type VariantOption } from "@/lib/admin/catalogue";
import { formatMoney } from "@/lib/admin/format";
import { describeError } from "@/lib/admin/errors";
import { cn } from "@/lib/utils";

/**
 * An order for someone who is not on the site.
 *
 * Most of this shop's selling happens on WhatsApp — a message, an agreed price, a
 * transfer — and none of it existed in the database. The invoice went out as a
 * photograph of something typed by hand, stock described only website sales, and
 * the payments screen reported a minority of the business as if it were all of
 * it.
 *
 * This deliberately raises a real order rather than generating a document. The
 * invoice, the packing slip, the status ladder, the payment guard and the audit
 * history then all work on it unchanged, and `order_number` stays one sequence —
 * it is the invoice number and the payment reference, so a second scheme would
 * eventually collide with the first.
 *
 * It creates the order unpaid, like any other. Marking it paid is what moves
 * stock, so the WhatsApp sale settles through exactly the same path as a website
 * one.
 */
type Line = ManualOrderLine & { key: string; display: string; stock?: number };

export default function NewOrderPage() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "in_store" | "phone">("whatsapp");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "inStore">("delivery");
  const [address, setAddress] = useState({
    street: "", city: "", state: "", zipCode: "", country: "Nigeria",
  });
  const [lines, setLines] = useState<Line[]>([]);
  const [shippingCost, setShippingCost] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VariantOption[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async (term: string) => {
    setSearching(true);
    const { variants } = await searchOrderableVariants(term);
    setResults(variants);
    setSearching(false);
  }, []);

  useEffect(() => {
    // Debounced, so typing a SKU does not fire a query per keystroke.
    const timer = setTimeout(() => runSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const addCatalogueLine = (variant: VariantOption) => {
    setLines((current) => {
      const existing = current.find((line) => line.variantId === variant.variantId);
      if (existing) {
        return current.map((line) =>
          line.variantId === variant.variantId
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [
        ...current,
        {
          key: variant.variantId,
          variantId: variant.variantId,
          display: variant.variantLabel
            ? `${variant.productName} · ${variant.variantLabel}`
            : variant.productName,
          sku: variant.sku,
          quantity: 1,
          unitPrice: variant.price,
          stock: variant.stock,
        },
      ];
    });
  };

  const addFreeLine = () =>
    setLines((current) => [
      ...current,
      {
        key: `one-off-${Date.now()}`,
        variantId: null,
        display: "",
        name: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);

  const patchLine = (key: string, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );

  const removeLine = (key: string) =>
    setLines((current) => current.filter((line) => line.key !== key));

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0),
    [lines]
  );
  const total = Math.max(subtotal - (Number(discount) || 0), 0) + (Number(shippingCost) || 0);

  const ready =
    customerName.trim().length > 1 &&
    customerPhone.trim().length > 5 &&
    lines.length > 0 &&
    lines.every((line) => (line.variantId ? true : Boolean(line.name?.trim())));

  const save = async () => {
    setSaving(true);
    try {
      const { orderId, orderNumber, error } = await createManualOrder({
        customerName,
        customerPhone,
        customerEmail,
        channel,
        deliveryType,
        shippingAddress: deliveryType === "delivery" ? address : null,
        lines: lines.map(({ variantId, name, sku, quantity, unitPrice }) => ({
          variantId, name, sku, quantity, unitPrice,
        })),
        shippingCost: Number(shippingCost) || 0,
        discount: Number(discount) || 0,
        notes,
      });

      if (error) throw new Error(error);

      toast.success(`${orderNumber} raised. Invoice and packing slip are on it.`);
      router.push(`/admin/orders/${orderId}`);
    } catch (err) {
      toast.error(describeError(err, "Could not raise the order."));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/orders"
          className="mb-4 inline-flex items-center gap-2 font-body text-sm text-ink-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All orders
        </Link>

        <PageHeader
          eyebrow="Selling"
          title="New order"
          description="For a customer who bought over WhatsApp, on the phone, or in the shop. It lands in the orders list like any other, with its own invoice and packing slip."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-6">
          <SectionCard title="What they bought">
            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  placeholder="Search the catalogue by name or SKU…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-10"
                />
              </div>

              {searching ? (
                <p className="flex items-center gap-2 font-body text-sm text-ink-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Looking…
                </p>
              ) : results.length > 0 ? (
                <ul
                  data-lenis-prevent
                  className="max-h-56 divide-y divide-rule overflow-y-auto rounded-sm border border-rule"
                >
                  {results.map((variant) => (
                    <li key={variant.variantId}>
                      <button
                        type="button"
                        onClick={() => addCatalogueLine(variant)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-wash/60"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-body text-sm text-foreground">
                            {variant.productName}
                            {variant.variantLabel && (
                              <span className="text-ink-muted"> · {variant.variantLabel}</span>
                            )}
                          </span>
                          <span className="block truncate font-body text-xs tabular-nums text-ink-muted">
                            {variant.sku} · {variant.stock} in stock
                          </span>
                        </span>
                        <span className="shrink-0 font-body text-sm tabular-nums text-foreground">
                          {formatMoney(variant.price, "ngn")}
                        </span>
                        <Plus className="h-4 w-4 shrink-0 text-ink-faint" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                query && (
                  <p className="font-body text-sm text-ink-muted">
                    Nothing matches that. Add it as a one-off below.
                  </p>
                )
              )}

              <Button variant="outline" size="sm" onClick={addFreeLine}>
                <Plus className="mr-2 h-4 w-4" />
                Add something not in the catalogue
              </Button>
            </div>
          </SectionCard>

          {lines.length > 0 && (
            <SectionCard title={`${lines.length} ${lines.length === 1 ? "line" : "lines"}`} flush>
              <ul className="divide-y divide-rule">
                {lines.map((line) => (
                  <li key={line.key} className="space-y-3 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        {line.variantId ? (
                          <>
                            <p className="font-body text-sm text-foreground">{line.display}</p>
                            <p className="font-body text-xs tabular-nums text-ink-muted">
                              {line.sku}
                              {line.stock !== undefined && ` · ${line.stock} in stock`}
                              {line.stock !== undefined && line.quantity > line.stock && (
                                <span className="ml-1.5 text-terra-ink">
                                  more than you have — you can still record it
                                </span>
                              )}
                            </p>
                          </>
                        ) : (
                          <Input
                            value={line.name ?? ""}
                            onChange={(event) => patchLine(line.key, { name: event.target.value })}
                            placeholder="What it is — e.g. Sourced brass tray, large"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        aria-label="Remove this line"
                        className="shrink-0 rounded-sm p-1.5 text-ink-faint transition-colors hover:bg-wash hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[7rem_1fr_auto] sm:items-end">
                      <label className="block">
                        <span className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                          Quantity
                        </span>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(event) =>
                            patchLine(line.key, {
                              quantity: Math.max(1, Number(event.target.value) || 1),
                            })
                          }
                          className="tabular-nums"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                          Price each (₦)
                          {line.variantId && (
                            <span className="ml-1.5 normal-case tracking-normal text-ink-faint">
                              — the agreed price wins
                            </span>
                          )}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={line.unitPrice ?? 0}
                          onChange={(event) =>
                            patchLine(line.key, { unitPrice: Number(event.target.value) || 0 })
                          }
                          className="tabular-nums"
                        />
                      </label>

                      <p className="font-body text-sm font-medium tabular-nums text-foreground sm:pb-2.5">
                        {formatMoney((line.unitPrice ?? 0) * line.quantity, "ngn")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <SectionCard title="Note on the order">
            <Textarea
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything agreed on the call — this shows on their order, not on the packing slip."
            />
          </SectionCard>
        </div>

        {/* --------------------------------------------------------- sidebar */}
        <div className="space-y-6">
          <SectionCard title="Who it is for">
            <div className="space-y-4">
              <Field label="Name" required>
                <Input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Fatima Bello"
                />
              </Field>
              <Field label="Phone" required>
                <Input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="+234…"
                  className="tabular-nums"
                />
              </Field>
              <Field
                label="Email"
                hint="Optional — plenty of customers here have a phone number and nothing else."
              >
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="optional"
                />
              </Field>
              <Field label="Where it came from">
                <Select value={channel} onValueChange={(value) => setChannel(value as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone call</SelectItem>
                    <SelectItem value="in_store">In the shop</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="How it reaches them">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "delivery", label: "Delivery", icon: Truck },
                  { value: "inStore", label: "Collection", icon: Store },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDeliveryType(option.value)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-sm border px-3 py-2.5 font-body text-sm transition-colors",
                      deliveryType === option.value
                        ? "border-sage-deep bg-sage-deep text-background"
                        : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
                    )}
                  >
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </button>
                ))}
              </div>

              {deliveryType === "delivery" && (
                <div className="space-y-3">
                  <Input
                    value={address.street}
                    onChange={(event) => setAddress({ ...address, street: event.target.value })}
                    placeholder="Street"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={address.city}
                      onChange={(event) => setAddress({ ...address, city: event.target.value })}
                      placeholder="City"
                    />
                    <Input
                      value={address.state}
                      onChange={(event) => setAddress({ ...address, state: event.target.value })}
                      placeholder="State"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={address.zipCode}
                      onChange={(event) => setAddress({ ...address, zipCode: event.target.value })}
                      placeholder="Postcode"
                      className="tabular-nums"
                    />
                    <Input
                      value={address.country}
                      onChange={(event) => setAddress({ ...address, country: event.target.value })}
                      placeholder="Country"
                    />
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Totals">
            <div className="space-y-4">
              <Field label="Shipping (₦)">
                <Input
                  type="number"
                  min={0}
                  value={shippingCost}
                  onChange={(event) => setShippingCost(event.target.value)}
                  placeholder="0"
                  className="tabular-nums"
                />
              </Field>
              <Field label="Discount (₦)">
                <Input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  placeholder="0"
                  className="tabular-nums"
                />
              </Field>

              <dl className="space-y-2 border-t border-rule pt-3 font-body text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Subtotal</dt>
                  <dd className="tabular-nums text-foreground">{formatMoney(subtotal, "ngn")}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-rule pt-2">
                  <dt className="font-medium text-foreground">Total</dt>
                  <dd className="font-body text-base font-medium tabular-nums text-foreground">
                    {formatMoney(total, "ngn")}
                  </dd>
                </div>
              </dl>

              {/* Said before the button: this is the same path as a website
                  order, and nothing has been paid yet. */}
              <p className="font-body text-xs leading-relaxed text-ink-faint">
                Raised unpaid, like any order. Record the payment on it once the transfer lands —
                that is what takes the stock.
              </p>

              <Button className="w-full" onClick={save} disabled={!ready || saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Raising…</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />Raise the order</>
                )}
              </Button>

              {!ready && (
                <p className="flex items-start gap-1.5 font-body text-xs text-ink-muted">
                  <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Needs a name, a phone number, and at least one line with a description.
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-body text-xs text-ink-muted">
        {label}
        {required && <span className="ml-1 text-terra-ink">*</span>}
      </Label>
      {children}
      {hint && <p className="font-body text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}
