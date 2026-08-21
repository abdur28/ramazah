"use client";

import { useMemo } from "react";
import { AlertTriangle, RefreshCcw, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { availableCurrencies } from "@/constants";
import { formatMoney } from "@/lib/admin/format";
import type { ProductOptionDef, ProductPrice, ProductVariant } from "@/types/types";

/**
 * The variants a product actually sells as, and the only place its price and
 * stock are stored.
 *
 * The old version was a dialog offering a Size dropdown and a Colour dropdown,
 * one variant at a time. Two things were wrong with it beyond the axes.
 *
 * **The product-level "Default Pricing" panel above it was a fiction.** Prices
 * live on `product_prices`, keyed by `variant_id` — there is no product-level
 * price column. The form collected prices, *required* them, and threw them away;
 * only `variant.prices` was ever written. A product saved without variants had
 * no price at all and could not be bought.
 *
 * **The same was true of stock.** `products` has no stock column either;
 * `totalStock` and `inStock` were collected and discarded. Stock is
 * `product_variants.stock_count`, per variant.
 *
 * So pricing and stock live here now, on a row per variant, generated from the
 * axes rather than typed one dialog at a time. `expiry_date` is here too — the
 * column has always existed and `create_order()` enforces it, but nothing in the
 * UI could set it, which for a shop importing coffee, dates and spices is the
 * difference between stock that sells and stock that silently cannot.
 */
export default function VariantManager({
  options,
  variants,
  onChange,
  isPerishable,
}: {
  options: ProductOptionDef[];
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  isPerishable: boolean;
}) {
  const currencies = availableCurrencies;
  const defaultCurrency = currencies.find((c) => c.isDefault) ?? currencies[0];

  /** Every combination the axes imply, in a stable order. */
  const combinations = useMemo(() => {
    const usable = options.filter((option) => option.name.trim() && option.values.length > 0);
    if (usable.length === 0) return [];

    return usable.reduce<Record<string, string>[]>(
      (rows, option) =>
        rows.flatMap((row) =>
          option.values.map((value) => ({ ...row, [option.name.trim()]: value.value }))
        ),
      [{}]
    );
  }, [options]);

  const keyOf = (opts: Record<string, string>) =>
    Object.keys(opts)
      .sort()
      .map((name) => `${name}:${opts[name]}`)
      .join("|");

  const existing = new Map(variants.map((variant) => [keyOf(variant.options ?? {}), variant]));

  const missing = combinations.filter((combo) => !existing.has(keyOf(combo)));
  const orphaned = variants.filter(
    (variant) =>
      combinations.length > 0 && !combinations.some((combo) => keyOf(combo) === keyOf(variant.options ?? {}))
  );

  const blankPrices = (): ProductPrice[] =>
    currencies.map((currency) => ({
      currency: currency.code,
      price: 0,
      compareAtPrice: 0,
      discountPercent: 0,
    }));

  const makeVariant = (opts: Record<string, string>, index: number): ProductVariant => ({
    id: `new_${Date.now()}_${index}`,
    // A readable, stable SKU beats a timestamp: it is what appears on the order
    // line, the invoice and the packing list.
    sku: skuFor(opts, index),
    options: opts,
    label: Object.values(opts).join(" / "),
    prices: blankPrices(),
    stockCount: 0,
    inStock: false,
  });

  /** Fill in whatever the axes imply and nothing exists for yet. */
  const generate = () => {
    if (combinations.length === 0) {
      onChange([makeVariant({}, 0)]);
      return;
    }
    const kept = variants.filter((variant) =>
      combinations.some((combo) => keyOf(combo) === keyOf(variant.options ?? {}))
    );
    const added = missing.map((combo, index) => makeVariant(combo, kept.length + index));
    onChange([...kept, ...added]);
  };

  const update = (id: string, next: Partial<ProductVariant>) =>
    onChange(variants.map((variant) => (variant.id === id ? { ...variant, ...next } : variant)));

  const updatePrice = (
    id: string,
    currency: string,
    field: "price" | "compareAtPrice",
    value: number
  ) =>
    onChange(
      variants.map((variant) => {
        if (variant.id !== id) return variant;
        const prices = (variant.prices ?? blankPrices()).map((price) => {
          if (price.currency !== currency) return price;
          const updated = { ...price, [field]: value };
          const compare = updated.compareAtPrice ?? 0;
          updated.discountPercent =
            compare > 0 && updated.price > 0
              ? Math.round(((compare - updated.price) / compare) * 100)
              : 0;
          return updated;
        });
        return { ...variant, prices };
      })
    );

  const remove = (id: string) => onChange(variants.filter((variant) => variant.id !== id));

  const priceOf = (variant: ProductVariant, currency: string, field: "price" | "compareAtPrice") =>
    variant.prices?.find((price) => price.currency === currency)?.[field] ?? 0;

  const totalStock = variants.reduce((sum, variant) => sum + (variant.stockCount || 0), 0);
  const unpriced = variants.filter(
    (variant) => priceOf(variant, defaultCurrency.code, "price") <= 0
  ).length;

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------------ actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={generate}>
          {variants.length === 0 ? (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              {combinations.length > 0
                ? `Create ${combinations.length} variant${combinations.length === 1 ? "" : "s"}`
                : "Create the single variant"}
            </>
          ) : (
            <>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Sync with the axes
            </>
          )}
        </Button>

        {variants.length > 0 && (
          <p className="font-body text-xs tabular-nums text-ink-muted">
            {variants.length} variant{variants.length === 1 ? "" : "s"} · {totalStock} units in
            total
          </p>
        )}
      </div>

      {(missing.length > 0 || orphaned.length > 0) && variants.length > 0 && (
        <p className="flex items-start gap-2 rounded-sm bg-terra/[0.06] p-3 font-body text-sm text-terra-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {missing.length > 0 && (
            <span>
              {missing.length} combination{missing.length === 1 ? "" : "s"} from your axes
              {orphaned.length > 0 ? ", " : " "}
              {orphaned.length === 0 && "has no variant yet. "}
            </span>
          )}
          {orphaned.length > 0 && (
            <span>
              {orphaned.length} variant{orphaned.length === 1 ? "" : "s"} no longer match your
              axes.{" "}
            </span>
          )}
          <span>Sync will add what is missing and drop what no longer fits.</span>
        </p>
      )}

      {unpriced > 0 && variants.length > 0 && (
        <p className="flex items-start gap-2 rounded-sm bg-terra/[0.06] p-3 font-body text-sm text-terra-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {unpriced} variant{unpriced === 1 ? " has" : "s have"} no {defaultCurrency.name} price.
          The database refuses to build an order line without one, so {unpriced === 1 ? "it" : "they"}{" "}
          cannot be bought.
        </p>
      )}

      {/* ------------------------------------------------------------ the rows */}
      {variants.length === 0 ? (
        <div className="rounded-sm border border-dashed border-rule px-5 py-10 text-center">
          <p className="font-body text-sm text-foreground">No variants yet</p>
          <p className="mx-auto mt-1.5 max-w-[54ch] font-body text-sm text-ink-muted">
            Price and stock live on the variant, not on the product — so until there is at
            least one, this product has no price and cannot be bought.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {variants.map((variant) => {
            const label =
              variant.label ||
              Object.values(variant.options ?? {}).join(" / ") ||
              "Single variant";
            const compare = priceOf(variant, defaultCurrency.code, "compareAtPrice");
            const price = priceOf(variant, defaultCurrency.code, "price");
            const isOrphan = orphaned.some((o) => o.id === variant.id);

            return (
              <li
                key={variant.id}
                className={cn(
                  "rounded-sm border bg-card p-4",
                  isOrphan ? "border-terra/40" : "border-rule"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-body text-sm font-medium text-foreground">
                    {label}
                    {isOrphan && (
                      <span className="ml-2 font-normal text-terra-ink">
                        — no longer in your axes
                      </span>
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(variant.id)}
                    className="text-ink-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove {label}</span>
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="SKU">
                    <Input
                      value={variant.sku}
                      onChange={(event) => update(variant.id, { sku: event.target.value })}
                      placeholder="RMZ-COF-250-GRD"
                      className="tabular-nums"
                    />
                  </Field>

                  <Field label={`Price (${defaultCurrency.symbol})`}>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={price || ""}
                      onChange={(event) =>
                        updatePrice(
                          variant.id,
                          defaultCurrency.code,
                          "price",
                          Number(event.target.value) || 0
                        )
                      }
                      placeholder="0"
                      className="tabular-nums"
                    />
                  </Field>

                  <Field label={`Was (${defaultCurrency.symbol})`} hint="for a sale price">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={compare || ""}
                      onChange={(event) =>
                        updatePrice(
                          variant.id,
                          defaultCurrency.code,
                          "compareAtPrice",
                          Number(event.target.value) || 0
                        )
                      }
                      placeholder="0"
                      className="tabular-nums"
                    />
                  </Field>

                  <Field label="Stock">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={variant.stockCount || 0}
                      onChange={(event) => {
                        const stockCount = Number(event.target.value) || 0;
                        // `in_stock` is a generated column in the database; this
                        // keeps the local copy honest for the form's own preview.
                        update(variant.id, { stockCount, inStock: stockCount > 0 });
                      }}
                      className="tabular-nums"
                    />
                  </Field>

                  {isPerishable && (
                    <Field
                      label="Best before"
                      hint="an order is refused after this date"
                    >
                      <Input
                        type="date"
                        value={variant.expiryDate?.slice(0, 10) ?? ""}
                        onChange={(event) =>
                          update(variant.id, { expiryDate: event.target.value || undefined })
                        }
                        className="tabular-nums"
                      />
                    </Field>
                  )}

                  <Field label="Weight (kg)" hint="for shipping">
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      value={variant.weight ?? ""}
                      onChange={(event) =>
                        update(variant.id, {
                          weight: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                      placeholder="0.000"
                      className="tabular-nums"
                    />
                  </Field>
                </div>

                {compare > 0 && price > 0 && compare > price && (
                  <p className="mt-3 font-body text-xs text-sage-deep">
                    {Math.round(((compare - price) / compare) * 100)}% off — saves{" "}
                    {formatMoney(compare - price, defaultCurrency.code)}
                  </p>
                )}

                {/* Other currencies are optional; the shop trades in Naira. */}
                {currencies.length > 1 && (
                  <details className="mt-3">
                    <summary className="cursor-pointer font-body text-xs text-ink-muted hover:text-foreground">
                      Prices in other currencies
                    </summary>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {currencies
                        .filter((currency) => currency.code !== defaultCurrency.code)
                        .map((currency) => (
                          <Field key={currency.code} label={`${currency.name} (${currency.symbol})`}>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={priceOf(variant, currency.code, "price") || ""}
                              onChange={(event) =>
                                updatePrice(
                                  variant.id,
                                  currency.code,
                                  "price",
                                  Number(event.target.value) || 0
                                )
                              }
                              placeholder="0.00"
                              className="tabular-nums"
                            />
                          </Field>
                        ))}
                    </div>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </Label>
      {children}
      {hint && <p className="font-body text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

/** `250G-GROUND` — readable on an invoice, unlike a timestamp. */
function skuFor(options: Record<string, string>, index: number): string {
  const parts = Object.values(options)
    .map((value) =>
      value
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 8)
    )
    .filter(Boolean);

  return parts.length > 0 ? parts.join("-") : `VAR-${index + 1}`;
}
