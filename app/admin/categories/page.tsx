"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FolderTree, Loader2, Plus, RefreshCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import SectionCard from "@/components/admin/ui/SectionCard";
import EmptyState from "@/components/admin/ui/EmptyState";
import CategoryDialog from "@/components/admin/CategoryDialog";
import CategoryTree from "@/components/admin/CategoryTree";
import useAdmin from "@/hooks/admin/useAdmin";
import { getCategoryProductCounts } from "@/lib/admin/catalogue";
import { flattenCategories, slugTrailFor, MAX_CATEGORY_DEPTH } from "@/lib/categories";
import { formatNumber } from "@/lib/admin/format";
import type { Category } from "@/types/types";
import { describeError } from "@/lib/admin/errors";

/**
 * Categories.
 *
 * The tree now carries a product count per category, which is the number that
 * decides whether the entry should exist at all: an empty category is a menu
 * item on the shop that leads to a blank page, and nothing in the admin used to
 * say which ones were empty.
 */
export default function AdminCategoriesPage() {
  const { fetchCategories, deleteCategory, categories, loading, error, resetCategories } = useAdmin();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState(false);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [parentSlugTrail, setParentSlugTrail] = useState<string[]>([]);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setRefreshing(true);
    resetCategories();
    try {
      const [, fetchedCounts] = await Promise.all([
        fetchCategories({ limit: 100, orderByField: "name", orderDirection: "asc" }),
        getCategoryProductCounts(),
      ]);
      setCounts(fetchedCounts);
    } catch (err) {
      console.error("Error loading categories:", err);
      toast.error(describeError(err, "Could not load categories."));
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Counted across every level. `categories` holds only the top-level rows —
   * children hang off `subCategories` — so `categories.length` reported six when
   * the shop has ten, and the "empty" count never looked at a subcategory at
   * all. The old top-level test was `!path.includes("/")`, which was true of
   * every row: the database separates with " > ".
   */
  const totals = useMemo(() => {
    const all = flattenCategories(categories);
    const empty = all.filter(({ category }) => (counts.get(category.id) ?? 0) === 0).length;
    return { all: all.length, topLevel: categories.length, empty };
  }, [categories, counts]);

  const openCreate = (parent: Category | null = null) => {
    setSelectedCategory(null);
    setParentCategory(parent);
    setParentSlugTrail(parent ? slugTrailFor(categories, parent.id) : []);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setSelectedCategory(category);
    // Found by walking the tree rather than by slicing the path: the old version
    // split on "/" and so never located a parent, meaning editing a subcategory
    // silently offered to move it to the top level.
    // Found by walking the whole tree, so a category at any depth resolves its
    // real parent rather than only a child of a root.
    const parent =
      flattenCategories(categories).find(({ category: candidate }) =>
        (candidate.subCategories ?? []).some((child) => child.id === category.id)
      )?.category ?? null;

    setParentCategory(parent);
    setParentSlugTrail(parent ? slugTrailFor(categories, parent.id) : []);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setProcessing(true);
    try {
      await deleteCategory(categoryToDelete.id);
      toast.success(`${categoryToDelete.name} deleted.`);
      setCategoryToDelete(null);
      loadCategories();
    } catch (err: any) {
      toast.error(describeError(err, "Could not delete the category."));
    } finally {
      setProcessing(false);
    }
  };

  const productsInDoomedCategory = categoryToDelete ? counts.get(categoryToDelete.id) ?? 0 : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalogue"
        title="Categories"
        description={`How the shop is organised. Nest up to ${MAX_CATEGORY_DEPTH} levels — three is usually plenty.`}
        actions={
          <>
            <Button variant="outline" onClick={loadCategories} disabled={refreshing || loading.categories}>
              <RefreshCcw
                className={`mr-2 h-4 w-4 ${refreshing || loading.categories ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={() => openCreate()}>
              <Plus className="mr-2 h-4 w-4" />
              Add category
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Categories" value={formatNumber(totals.all)} icon={FolderTree} />
        <StatCard
          label="Top level"
          value={formatNumber(totals.topLevel)}
          hint={`${formatNumber(totals.all - totals.topLevel)} nested beneath them`}
        />
        <StatCard
          label="Empty"
          value={formatNumber(totals.empty)}
          hint="no products in them"
          tone={totals.empty > 0 ? "attention" : "default"}
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <Input
          placeholder="Search categories by name, slug or path…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-wash/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error.categories ? (
        <EmptyState
          icon={AlertTriangle}
          title="Could not load categories"
          description={error.categories}
          action={
            <Button variant="outline" onClick={loadCategories}>
              Try again
            </Button>
          }
        />
      ) : loading.categories && categories.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-20 font-body text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading categories…
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Categories are how shoppers find their way around. Start with the six the shop sells: veils, coffee, spices, beauty, kitchenware, home."
          action={
            <Button onClick={() => openCreate()}>
              <Plus className="mr-2 h-4 w-4" />
              Add the first one
            </Button>
          }
        />
      ) : (
        <SectionCard
          title="The tree"
          description="Click a row to fold it. Use the plus to nest a subcategory beneath it."
        >
          <CategoryTree
            categories={categories}
            productCounts={counts}
            onEdit={openEdit}
            onDelete={(category) => setCategoryToDelete(category)}
            onAddSubcategory={openCreate}
            searchQuery={searchQuery}
          />
        </SectionCard>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
            setParentCategory(null);
            loadCategories();
          }
        }}
        category={selectedCategory}
        parentCategory={parentCategory}
        parentSlugTrail={parentSlugTrail}
        mode={dialogMode}
      />

      <AlertDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">
              Delete {categoryToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              It comes out of the shop's navigation. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {productsInDoomedCategory > 0 && (
            <p className="flex items-start gap-2 rounded-sm bg-terra/[0.06] p-3 font-body text-sm text-terra-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {productsInDoomedCategory}{" "}
              {productsInDoomedCategory === 1 ? "product is" : "products are"} filed here. The
              database will refuse the delete while they are — move them first.
            </p>
          )}

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
                  Deleting…
                </>
              ) : (
                "Delete category"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
