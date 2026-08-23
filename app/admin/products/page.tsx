"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  Edit,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import StatusPill, {
  PRODUCT_STATUS,
  STOCK_STATUS,
  stockBucket,
} from "@/components/admin/ui/StatusPill";
import Pager from "@/components/ui/Pager";
import useAdmin from "@/hooks/admin/useAdmin";
import useDebounced from "@/hooks/useDebounced";
import { flattenCategories } from "@/lib/categories";
import { getProductSummary, type ProductSummary } from "@/lib/admin/summaries";
import { formatMoney, formatNumber } from "@/lib/admin/format";
import { availableCurrencies } from "@/constants";
import type { Product } from "@/types/types";
import type { CurrencyCode } from "@/types/types";
import { describeError } from "@/lib/admin/errors";

/**
 * The catalogue.
 *
 * Two things it never told you, both of which decide whether a product is
 * actually for sale:
 *
 * **Publication state.** `products.status` gates the storefront — `draft` and
 * `archived` rows are filtered out of `product_listing` entirely — and the list
 * showed no trace of it. A product could be saved, sit in this table looking
 * exactly like its published neighbours, and be invisible to every shopper.
 *
 * Fifty a page. Every filter on it — search, state, stock bucket and category
 * — runs in the database, which the stock one in particular required work to
 * make possible: stock is a sum over a product's variants, not a column. See
 * `product_stock_status` in migration 20260830000036. Filtering "low stock"
 * over the loaded page would have answered "which of these fifty need
 * reordering" on a screen whose entire job is answering it for the catalogue.
 *
 * **Expiry.** Half this catalogue is food. `create_order()` refuses a variant
 * whose expiry date has passed, so expired stock silently stops being sellable
 * while still reading "In stock" here.
 */
export default function AdminProductsPage() {
  const router = useRouter();
  const {
    fetchProducts,
    deleteProduct,
    products,
    loading,
    error,
    pagination,
    fetchCategories,
    categories: categoryTree,
  } = useAdmin();

  const defaultCurrency = availableCurrencies.find((c) => c.isDefault) || availableCurrencies[0];

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency.code);
  const [processing, setProcessing] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const search = useDebounced(searchQuery);

  const load = useCallback(async () => {
    const filters = [];
    if (statusFilter !== "all") filters.push({ field: "status", value: statusFilter });
    if (stockFilter !== "all") filters.push({ field: "stock", value: stockFilter });
    if (categoryFilter !== "all") filters.push({ field: "category_id", value: categoryFilter });

    try {
      await fetchProducts({ page, search, filters });
    } catch (err) {
      console.error("Error loading products:", err);
      toast.error(describeError(err, "Could not load the catalogue."));
    }
  }, [fetchProducts, page, search, statusFilter, stockFilter, categoryFilter, reloadKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Counts the whole catalogue, so it is deliberately not tied to the page or
  // the filters — turning a page should not re-scan every product.
  useEffect(() => {
    getProductSummary().then(({ summary: totals, error: summaryError }) => {
      if (summaryError) {
        toast.error("Could not work out the catalogue totals.");
        return;
      }
      setSummary(totals);
    });
  }, [reloadKey]);

  /**
   * The category list comes from the categories, not from the products.
   *
   * It used to be `new Set(products.map(p => p.categoryPath))` — the categories
   * that happened to appear in the loaded rows. Paged, that dropdown would list
   * the categories on this page and silently omit the rest, so filtering by a
   * category could never find the products that made it disappear from the list
   * in the first place.
   */
  useEffect(() => {
    fetchCategories({ size: 200, orderByField: "name", orderDirection: "asc" });
  }, [fetchCategories]);

  const categories = useMemo(
    () => flattenCategories(categoryTree ?? []).map(({ category, depth }) => ({
      id: category.id,
      label: `${"\u00a0\u00a0".repeat(depth)}${category.name}`,
    })),
    [categoryTree]
  );

  /**
   * The store is the authority on which page is actually showing. Asking for a
   * page that no longer exists falls back to the first one, and the local state
   * has to follow or the next refresh asks for the missing page all over again.
   */
  useEffect(() => {
    if (pagination.products.page !== page) setPage(pagination.products.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.products.page]);

  const refresh = async () => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
    await load();
    setRefreshing(false);
  };

  const applyFilter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };

  const hasFilters =
    categoryFilter !== "all" || stockFilter !== "all" || statusFilter !== "all" || Boolean(searchQuery);

  const clearFilters = () => {
    setCategoryFilter("all");
    setStockFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
    setPage(1);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    setProcessing(true);
    try {
      await deleteProduct(productToDelete.id);
      toast.success(`${productToDelete.name} archived.`);
      setProductToDelete(null);
    } catch (err: any) {
      toast.error(describeError(err, "Could not archive the product."));
    } finally {
      setProcessing(false);
    }
  };

  const totalCount = summary?.total ?? 0;
  const liveCount = summary?.live ?? 0;
  const lowCount = summary?.low ?? 0;
  const outCount = summary?.out ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Everything you sell, and everything you have drafted but not published."
        actions={
          <>
            <Button variant="outline" onClick={refresh} disabled={refreshing || loading.products}>
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${refreshing || loading.products ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/admin/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Add product
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="In the catalogue" value={formatNumber(totalCount)} icon={Package} />
        <StatCard
          label="Live on the shop"
          value={formatNumber(liveCount)}
          hint={
            totalCount - liveCount > 0
              ? `${totalCount - liveCount} draft or archived`
              : "all published"
          }
        />
        <StatCard
          label="Low stock"
          value={formatNumber(lowCount)}
          hint="need restocking"
          tone={lowCount > 0 ? "attention" : "default"}
          icon={AlertTriangle}
        />
        <StatCard
          label="Out of stock"
          value={formatNumber(outCount)}
          hint="not sellable"
          tone={outCount > 0 ? "attention" : "default"}
        />
      </div>

      {/* ----------------------------------------------------------- filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <Input
            placeholder="Search by name, SKU or category…"
            value={searchQuery}
            onChange={(event) => applyFilter(setSearchQuery)(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={applyFilter(setStatusFilter)}>
            <SelectTrigger className="w-[145px]">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="active">Live</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stockFilter} onValueChange={applyFilter(setStockFilter)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="in">In stock</SelectItem>
              <SelectItem value="low">Low stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={applyFilter(setCategoryFilter)}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {availableCurrencies.length > 1 && (
            <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyCode)}>
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.symbol} {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- list */}
      {error.products ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load the catalogue"
          description={error.products}
          action={
            <Button variant="outline" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : loading.products && products.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading the catalogue…
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasFilters ? "Nothing matches those filters" : "The catalogue is empty"}
          description={
            hasFilters
              ? "Try widening the search, or clear the filters to see everything."
              : "Add your first product and it will appear here."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/admin/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add product
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-sm border border-rule bg-card">
            {/* One row per product. A grid rather than a <table> so the same
                markup can stack on a phone, where seven columns cannot fit. */}
            <div className="hidden border-b border-rule bg-wash/60 px-4 py-2.5 font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_2.5rem] lg:gap-4">
              <span>Product</span>
              <span>Category</span>
              <span className="text-right">Price</span>
              <span>Stock</span>
              <span>State</span>
              <span />
            </div>

            <ul className="divide-y divide-rule">
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  currency={currency}
                  onEdit={() => router.push(`/admin/products/${product.id}`)}
                  onDelete={() => setProductToDelete(product)}
                />
              ))}
            </ul>
          </div>

          <Pager
            page={pagination.products.page}
            total={pagination.products.total}
            busy={loading.products}
            onChange={setPage}
            noun="products"
          />
        </>
      )}

      <AlertDialog
        open={Boolean(productToDelete)}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">
              Archive {productToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It comes off the shop immediately. Past orders keep their record of it, so nothing in
              your order history changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Archiving…
                </>
              ) : (
                "Archive product"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductRow({
  product,
  currency,
  onEdit,
  onDelete,
}: {
  product: Product;
  currency: CurrencyCode;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const price = product.prices?.find((p) => p.currency === currency);
  const bucket = stockBucket(product.inStock, product.totalStock, product.lowStockAlert || 10);
  const expiry = soonestExpiry(product);
  const image = product.images?.[0]?.secureUrl;

  return (
    <li className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-wash/50 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_2.5rem] lg:items-center lg:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-wash">
          {/* An empty `src` makes next/image re-request the current page. */}
          {image ? (
            <Image src={image} alt="" fill sizes="48px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Package className="h-4 w-4 text-ink-faint" />
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-body text-sm text-foreground">{product.name}</span>
          <span className="block truncate font-body text-xs tabular-nums text-ink-muted">
            {product.sku}
          </span>
        </span>
      </div>

      <span className="truncate font-body text-sm text-ink-muted lg:block">
        {product.categoryPath || "—"}
      </span>

      <span className="font-body text-sm tabular-nums text-foreground lg:text-right">
        {price ? (
          <>
            <span className="font-medium">{formatMoney(price.price, currency)}</span>
            {(price.compareAtPrice ?? 0) > price.price && (
              <span className="ml-2 text-xs text-ink-muted line-through lg:ml-0 lg:block">
                {formatMoney(price.compareAtPrice ?? 0, currency)}
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-muted" title={`No ${currency.toUpperCase()} price set`}>
            Not priced
          </span>
        )}
      </span>

      <span className="flex flex-wrap items-center gap-2">
        <StatusPill status={bucket} map={STOCK_STATUS} />
        <span className="font-body text-xs tabular-nums text-ink-muted">
          {formatNumber(product.totalStock)} units
        </span>
        {expiry && (
          <span
            className="inline-flex items-center gap-1 font-body text-xs text-terra-ink"
            title={`Earliest expiry ${expiry.toLocaleDateString("en-NG")}`}
          >
            <CalendarClock className="h-3 w-3" />
            {expiry.toLocaleDateString("en-NG", { month: "short", year: "2-digit" })}
          </span>
        )}
      </span>

      <span>
        <StatusPill status={product.status ?? "draft"} map={PRODUCT_STATUS} />
      </span>

      <span className="justify-self-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Actions for {product.name}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {product.status === "active" && (
              <DropdownMenuItem asChild>
                <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on shop
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </span>
    </li>
  );
}

/** The earliest expiry across a product's variants, if it is perishable. */
function soonestExpiry(product: Product): Date | null {
  const dates = (product.variants ?? [])
    .map((variant) => variant.expiryDate)
    .filter(Boolean)
    .map((value) => new Date(value as string))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (dates.length === 0) return null;
  return dates.sort((a, b) => a.getTime() - b.getTime())[0];
}
