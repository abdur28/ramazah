"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ExternalLink, Loader2, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/admin/ui/PageHeader";
import SectionCard from "@/components/admin/ui/SectionCard";
import StatusPill, { PRODUCT_STATUS } from "@/components/admin/ui/StatusPill";
import CategoryPathSelector from "./CategoryPathSelector";
import CollectionSelector from "./CollectionSelector";
import ImageUpload from "./ImageUpload";
import OptionsEditor from "./OptionsEditor";
import VariantManager from "./VariantManager";
import useAdmin from "@/hooks/admin/useAdmin";
import { availableCurrencies } from "@/constants";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/admin";
import type { ProductImage, ProductOptionDef, ProductVariant } from "@/types/types";
import { describeError, isNetworkError } from "@/lib/admin/errors";

/**
 * Create and edit a product.
 *
 * Rebuilt rather than restyled, because most of what the old form collected was
 * never written anywhere.
 *
 * **Nothing created here could ever go live.** `createProduct` derived
 * `products.status` from a `publishedAt` the form never set, so every product
 * saved through the admin landed as `draft` — filtered out of `product_listing`,
 * invisible to every shopper — and `updateProduct` never touched `status` at
 * all, so there was no way to publish it afterwards either. There is a
 * publication control now, and the data layer writes it.
 *
 * **Price, stock and collection were discarded.** `products` has no price,
 * stock or size-guide column — prices are `product_prices` keyed by variant,
 * stock is `product_variants.stock_count` — and `toColumns` had no mapping for
 * the collection either. The form nonetheless *required* a product-level price
 * and threw it away. Pricing and stock now live on the variant rows where the
 * database keeps them, and the collection is resolved and saved.
 *
 * **Size and Colour were the only axes it knew.** See `OptionsEditor`.
 *
 * What is left here is what `products` actually stores.
 */
export default function ProductForm({
  product,
  mode,
}: {
  product?: Product | null;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const {
    createProduct,
    updateProduct,
    categories,
    collections,
    fetchCategories,
    fetchCollections,
  } = useAdmin();

  const defaultCurrency = availableCurrencies.find((c) => c.isDefault) ?? availableCurrencies[0];

  const [isSaving, setIsSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [materialInput, setMaterialInput] = useState("");
  const [details, setDetails] = useState<[string, string][]>(
    Object.entries(product?.details ?? {}).map(([key, value]) => [key, String(value)])
  );

  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    sku: product?.sku ?? "",
    shortDescription: product?.shortDescription ?? "",
    description: product?.description ?? "",
    categoryPath: product?.categoryPath ?? "",
    collectionSlug: product?.collectionSlug ?? "",
    status: (product?.status ?? "draft") as "draft" | "active" | "archived",
    itemType: product?.itemType ?? "",
    tags: product?.tags ?? [],
    metaKeywords: product?.metaKeywords ?? [],
    materials: product?.materials ?? [],
    careInstructions: product?.careInstructions ?? "",
    metaTitle: product?.metaTitle ?? "",
    metaDescription: product?.metaDescription ?? "",
    lowStockAlert: product?.lowStockAlert ?? 5,
    isPerishable: product?.isPerishable ?? false,
    isNew: product?.isNew ?? false,
    isFeatured: product?.isFeatured ?? false,
    isBestseller: product?.isBestseller ?? false,
    isLimitedEdition: product?.isLimitedEdition ?? false,
  });

  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [options, setOptions] = useState<ProductOptionDef[]>(product?.options ?? []);
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants ?? []);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories({ limit: 100, orderByField: "name", orderDirection: "asc" });
    }
    if (collections.length === 0) {
      fetchCollections({ limit: 100, orderByField: "name", orderDirection: "asc" });
    }
  }, []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setIsDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  };

  /**
   * Filling this in is twenty minutes of work — photographs, axes, a price and a
   * date per variant. Losing it to a stray back gesture is not recoverable, so
   * the browser asks first. Cleared on save, so a successful submit navigates
   * away silently.
   */
  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // The slug follows the name until it is edited by hand, then it stops moving:
  // changing a live product's name should not silently break its URL.
  useEffect(() => {
    if (slugTouched || !form.name) return;
    set("slug", slugify(form.name));
  }, [form.name, slugTouched]);

  const problems = useMemo(() => validate(form, images, variants, defaultCurrency.code), [
    form,
    images,
    variants,
    defaultCurrency.code,
  ]);

  const save = async (publish?: boolean) => {
    const status = publish ? "active" : form.status;
    const blocking = validate({ ...form, status }, images, variants, defaultCurrency.code);

    if (blocking.length > 0) {
      toast.error(blocking[0]);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        status,
        // `products.details` is a jsonb bag the product page renders as a
        // specification table. It has been `{}` on every product in the shop,
        // because nothing could write it.
        details: Object.fromEntries(
          details.filter(([key, value]) => key.trim() && value.trim())
        ),
        images,
        options: options.filter((option) => option.name.trim() && option.values.length > 0),
        variants,
        // Kept so the legacy shape still type-checks; the generic axes above are
        // what actually get written.
        colors: [],
        sizes: [],
      } as any;

      if (mode === "create") {
        await createProduct(payload);
        toast.success(
          status === "active" ? `${form.name} is live on the shop.` : `${form.name} saved as a draft.`
        );
      } else if (product) {
        await updateProduct(product.id, payload);
        toast.success(
          status === "active" ? `${form.name} is live on the shop.` : `${form.name} saved.`
        );
      }
      setIsDirty(false);
      router.push("/admin/products");
    } catch (error: any) {
      console.error("Error saving product:", error);

      // A dropped connection is the likeliest failure here and the only one
      // worth retrying blind — everything the shopkeeper typed is still in
      // state, so the retry costs nothing and saves refilling the form.
      toast.error(describeError(error, "Could not save the product."), {
        duration: isNetworkError(error) ? 12000 : 6000,
        action: isNetworkError(error)
          ? { label: "Try again", onClick: () => save(publish) }
          : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addTo = (
    key: "tags" | "materials" | "metaKeywords",
    value: string,
    reset: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed || form[key].includes(trimmed)) return;
    set(key, [...form[key], trimmed]);
    reset();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="space-y-8"
    >
      <PageHeader
        eyebrow={
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Catalogue
          </Link>
        }
        title={mode === "create" ? "New product" : form.name || "Edit product"}
        description={
          mode === "create"
            ? "Drafts are saved but stay off the shop until you publish them."
            : undefined
        }
        actions={
          <>
            {mode === "edit" && product?.status === "active" && (
              <Button variant="outline" asChild>
                <a href={`/product/${form.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View
                </a>
              </Button>
            )}
            <Button type="submit" variant="outline" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
            {form.status !== "active" && (
              <Button type="button" onClick={() => save(true)} disabled={isSaving}>
                Save &amp; publish
              </Button>
            )}
          </>
        }
      />

      {problems.length > 0 && (
        <div className="rounded-sm border border-terra/30 bg-terra/[0.04] p-4">
          <p className="flex items-center gap-2 font-body text-sm font-medium text-terra-ink">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {problems.length === 1
              ? "One thing to finish before this can go live"
              : `${problems.length} things to finish before this can go live`}
          </p>
          <ul className="mt-2 space-y-1 pl-6 font-body text-sm text-terra-ink">
            {problems.map((problem) => (
              <li key={problem} className="list-disc">
                {problem}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------------ main */}
        <div className="space-y-6">
          <SectionCard title="Basics">
            <div className="space-y-4">
              <Field label="Name" required>
                <Input
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="Egyptian Ground Coffee"
                  required
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Slug"
                  required
                  hint={form.slug ? `ramazah.ng/product/${form.slug}` : "The product's web address"}
                >
                  <Input
                    value={form.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      set("slug", event.target.value);
                    }}
                    placeholder="egyptian-ground-coffee"
                    required
                  />
                </Field>

                <Field label="Product code" hint="Yours, for stocktaking. Variants get their own.">
                  <Input
                    value={form.sku}
                    onChange={(event) => set("sku", event.target.value)}
                    placeholder="RMZ-COFFEE"
                    className="tabular-nums"
                  />
                </Field>
              </div>

              <Field label="One-line summary" hint="Shown on cards and in search results">
                <Textarea
                  value={form.shortDescription}
                  onChange={(event) => set("shortDescription", event.target.value)}
                  placeholder="Finely ground, cardamom-scented, roasted in Alexandria."
                  rows={2}
                />
              </Field>

              <Field label="Description" required>
                <Textarea
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                  placeholder="What it is, where it comes from, how it is used."
                  rows={7}
                  required
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Photographs"
            description="The first one is the cover, on cards and in the cart."
          >
            <ImageUpload
              images={images}
              onChange={(next) => {
                setIsDirty(true);
                setImages(next);
              }}
              maxImages={10}
            />
          </SectionCard>

          <SectionCard
            title="How it varies"
            description="The axes this product is sold along — weight, grind, colour, shade."
          >
            <OptionsEditor
              options={options}
              onChange={(next) => {
                setIsDirty(true);
                setOptions(next);
              }}
            />
          </SectionCard>

          <SectionCard
            title="Variants, price and stock"
            description={`Price and stock live here, on the variant — ${defaultCurrency.name} is what the shop sells in.`}
          >
            <VariantManager
              options={options}
              variants={variants}
              onChange={(next) => {
                setIsDirty(true);
                setVariants(next);
              }}
              isPerishable={form.isPerishable}
              onPerishableChange={(value) => set("isPerishable", value)}
              categoryPath={form.categoryPath}
              images={images}
            />
          </SectionCard>

          <SectionCard title="Details">
            <div className="space-y-5">
              <ChipField
                label="Tags"
                hint="Used by search and, in time, by filters."
                values={form.tags}
                input={tagInput}
                onInput={setTagInput}
                onAdd={() => addTo("tags", tagInput, () => setTagInput(""))}
                onRemove={(tag) => set("tags", form.tags.filter((t) => t !== tag))}
                placeholder="ramadan, gift, arabica…"
              />

              <ChipField
                label="Made from"
                values={form.materials}
                input={materialInput}
                onInput={setMaterialInput}
                onAdd={() => addTo("materials", materialInput, () => setMaterialInput(""))}
                onRemove={(material) =>
                  set("materials", form.materials.filter((m) => m !== material))
                }
                placeholder="brass, chiffon, 100% arabica…"
              />

              <Field
                label="Kind of thing"
                hint="A coarse type used for filtering — coffee, veil, lantern."
              >
                <Input
                  value={form.itemType}
                  onChange={(event) => set("itemType", event.target.value)}
                  placeholder="coffee"
                />
              </Field>

              <Field label="Care and storage">
                <Textarea
                  value={form.careInstructions}
                  onChange={(event) => set("careInstructions", event.target.value)}
                  placeholder="Keep sealed, away from light. Hand wash only."
                  rows={3}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Specification"
            description="Rendered under Details on the product page, in alphabetical order — the database does not keep the order you type them in."
          >
            <SpecEditor
              rows={details}
              onChange={(next) => {
                setIsDirty(true);
                setDetails(next);
              }}
            />
          </SectionCard>

          <SectionCard
            title="Search engines"
            description="Left blank, the name and summary above are used."
          >
            <div className="space-y-4">
              <Field label="Title">
                <Input
                  value={form.metaTitle}
                  onChange={(event) => set("metaTitle", event.target.value)}
                  placeholder={form.name || "Egyptian Ground Coffee | Ramazah"}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={form.metaDescription}
                  onChange={(event) => set("metaDescription", event.target.value)}
                  placeholder={form.shortDescription || "A short line for Google."}
                  rows={3}
                />
              </Field>

              <ChipField
                label="Keywords"
                values={form.metaKeywords}
                input={keywordInput}
                onInput={setKeywordInput}
                onAdd={() => addTo("metaKeywords", keywordInput, () => setKeywordInput(""))}
                onRemove={(word) =>
                  set("metaKeywords", form.metaKeywords.filter((k) => k !== word))
                }
                placeholder="egyptian coffee, ground coffee lagos…"
              />
            </div>
          </SectionCard>
        </div>

        {/* --------------------------------------------------------- sidebar */}
        <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <SectionCard title="Publication">
            <div className="space-y-3">
              {(["draft", "active", "archived"] as const).map((value) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition-colors",
                    form.status === value
                      ? "border-sage-deep bg-wash/50"
                      : "border-rule hover:border-sage"
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    value={value}
                    checked={form.status === value}
                    onChange={() => set("status", value)}
                    className="mt-1 accent-[var(--sage-deep)]"
                  />
                  <span className="min-w-0">
                    <StatusPill status={value} map={PRODUCT_STATUS} />
                    <span className="mt-1.5 block font-body text-xs text-ink-muted">
                      {STATUS_HELP[value]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Where it lives">
            <div className="space-y-4">
              <Field label="Category" required>
                <CategoryPathSelector
                  categories={categories}
                  value={form.categoryPath}
                  onChange={(path) => set("categoryPath", path)}
                />
              </Field>

              <Field label="Collection" hint="Optional — a seasonal or gifting edit.">
                <CollectionSelector
                  collections={collections}
                  value={form.collectionSlug}
                  onChange={(slug) => set("collectionSlug", slug)}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Stock handling">
            <div className="space-y-4">
              {/* Perishability moved next to the variants, where its only effect
                  — the best-before column — actually appears. */}
              <Field label="Warn me below" hint="units left, per variant">
                <Input
                  type="number"
                  min={0}
                  value={form.lowStockAlert}
                  onChange={(event) => set("lowStockAlert", Number(event.target.value) || 0)}
                  className="tabular-nums"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Badges" description="How it is flagged on the shop.">
            <div className="space-y-4">
              <Toggle
                label="New in"
                checked={form.isNew}
                onChange={(checked) => set("isNew", checked)}
              />
              <Toggle
                label="Featured"
                checked={form.isFeatured}
                onChange={(checked) => set("isFeatured", checked)}
              />
              <Toggle
                label="Bestseller"
                checked={form.isBestseller}
                onChange={(checked) => set("isBestseller", checked)}
              />
              <Toggle
                label="Limited edition"
                checked={form.isLimitedEdition}
                onChange={(checked) => set("isLimitedEdition", checked)}
              />
            </div>
          </SectionCard>

          <Button variant="ghost" asChild className="w-full">
            <Link href="/admin/products">Cancel</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}

const STATUS_HELP: Record<string, string> = {
  draft: "Saved, and invisible to shoppers. Where everything starts.",
  active: "On the shop and buyable, provided it has a price and stock.",
  archived: "Taken off the shop. Past orders keep their record of it.",
};

/**
 * Everything that would stop this product being sellable, in the order someone
 * would fix it. Shown continuously rather than one toast at a time on submit —
 * the old form validated only on save and reported a single failure per attempt.
 */
function validate(
  form: { name: string; slug: string; description: string; categoryPath: string; status: string },
  images: ProductImage[],
  variants: ProductVariant[],
  currency: string
): string[] {
  const problems: string[] = [];

  if (!form.name.trim()) problems.push("Give it a name.");
  if (!form.slug.trim()) problems.push("Give it a web address.");
  if (!form.description.trim()) problems.push("Write a description.");
  if (!form.categoryPath) problems.push("Choose a category.");
  if (images.length === 0) problems.push("Add at least one photograph.");

  if (variants.length === 0) {
    problems.push("Add at least one variant — price and stock live there, not on the product.");
  } else {
    const unpriced = variants.filter(
      (variant) =>
        (variant.prices?.find((price) => price.currency === currency)?.price ?? 0) <= 0
    );
    if (unpriced.length > 0) {
      problems.push(
        `Set a price for ${unpriced.length === variants.length ? "every variant" : `${unpriced.length} variant${unpriced.length === 1 ? "" : "s"}`}.`
      );
    }

    const skus = variants.map((variant) => variant.sku.trim()).filter(Boolean);
    if (skus.length !== variants.length) problems.push("Every variant needs a SKU.");
    else if (new Set(skus).size !== skus.length) problems.push("Two variants share a SKU.");
  }

  return problems;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
      <Label className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {label}
        {required && <span className="ml-1 text-terra-ink">*</span>}
      </Label>
      {children}
      {hint && <p className="font-body text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

/**
 * The specification table, as ordered key/value pairs.
 *
 * `products.details` is jsonb and the product page already renders it under
 * Details — but every product in the catalogue has `{}` there, because the old
 * form had no way to write it. Pairs rather than free JSON: this is filled in by
 * whoever is unpacking the boxes, not by someone who wants to type braces.
 */
function SpecEditor({
  rows,
  onChange,
}: {
  rows: [string, string][];
  onChange: (rows: [string, string][]) => void;
}) {
  const update = (index: number, position: 0 | 1, value: string) =>
    onChange(
      rows.map((row, i) => {
        if (i !== index) return row;
        const next: [string, string] = [...row] as [string, string];
        next[position] = value;
        return next;
      })
    );

  return (
    <div className="space-y-2">
      {rows.map(([key, value], index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={key}
            onChange={(event) => update(index, 0, event.target.value)}
            placeholder="Origin"
            aria-label={`Specification ${index + 1} name`}
            className="max-w-[38%]"
          />
          <Input
            value={value}
            onChange={(event) => update(index, 1, event.target.value)}
            placeholder="Alexandria, Egypt"
            aria-label={`Specification ${index + 1} value`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="shrink-0 text-ink-muted hover:text-destructive"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove {key || `row ${index + 1}`}</span>
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={() => onChange([...rows, ["", ""]])}>
        <Plus className="mr-2 h-4 w-4" />
        Add a line
      </Button>

      {rows.length === 0 && (
        <p className="pt-1 font-body text-xs text-ink-muted">
          Roast, origin, net weight, thread count — whatever a buyer would want in a
          table.
        </p>
      )}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="min-w-0">
        <span className="block font-body text-sm text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block font-body text-xs text-ink-muted">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

function ChipField({
  label,
  hint,
  values,
  input,
  onInput,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  hint?: string;
  values: string[];
  input: string;
  onInput: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </Label>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              // Without this, Enter submits the whole product form.
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add</span>
        </Button>
      </div>

      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {values.map((value) => (
            <li
              key={value}
              className="inline-flex items-center gap-1.5 rounded-sm border border-rule bg-wash/50 py-1 pl-2.5 pr-1 font-body text-sm text-foreground"
            >
              {value}
              <button
                type="button"
                onClick={() => onRemove(value)}
                aria-label={`Remove ${value}`}
                className="rounded-sm p-0.5 text-ink-muted transition-colors hover:bg-card hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {hint && <p className="font-body text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}
