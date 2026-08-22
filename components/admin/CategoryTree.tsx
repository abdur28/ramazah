"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Edit, Folder, FolderOpen, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/types";
import {
  canNestUnder,
  depthOf,
  MAX_CATEGORY_DEPTH,
  SUGGESTED_CATEGORY_DEPTH,
} from "@/lib/categories";

/**
 * The category hierarchy.
 *
 * **Subcategories were never rendered.** `fetchCategories` returns only the
 * top-level rows, with children hanging off `subCategories` — and this component
 * ignored that field, trying instead to rebuild the tree by splitting
 * `category.path` on `'/'`. The database builds paths with `' > '` (see the
 * `maintain_category_path` trigger), so every split returned a single segment,
 * every category came out at depth zero, and a child added through the form
 * appeared nowhere at all. It now walks `subCategories`, which is the
 * authoritative structure and comes straight from `parent_id`.
 *
 * The drag handle went earlier: it rendered a `GripVertical` with `cursor-grab`
 * and no drag implementation, promising a reorder that could not happen. Search
 * matches were highlighted with `bg-warning` — terracotta, a dark background
 * carrying dark ink, less legible than the text it meant to pick out. And the
 * row actions no longer appear only on hover, which had put every edit and
 * delete out of reach on a touchscreen.
 */

export default function CategoryTree({
  categories,
  productCounts,
  onEdit,
  onDelete,
  onAddSubcategory,
  searchQuery,
}: {
  categories: Category[];
  productCounts?: Map<string, number>;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddSubcategory: (parentCategory: Category) => void;
  searchQuery?: string;
}) {
  /**
   * Filtering has to keep ancestors: hiding "Food & Pantry" because it does not
   * match "tea" would orphan the child that does, and the result would read as
   * an empty search.
   */
  const visible = useMemo(() => filterTree(categories, searchQuery), [categories, searchQuery]);

  if (visible.length === 0) {
    return (
      <p className="py-10 text-center font-body text-sm text-ink-muted">
        {searchQuery ? "No categories match that search." : "No categories yet."}
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {visible.map((category) => (
        <TreeItem
          key={category.id}
          category={category}
          depth={0}
          productCounts={productCounts}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubcategory={onAddSubcategory}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}

function TreeItem({
  category,
  depth,
  productCounts,
  onEdit,
  onDelete,
  onAddSubcategory,
  searchQuery,
}: {
  category: Category;
  depth: number;
  productCounts?: Map<string, number>;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddSubcategory: (parentCategory: Category) => void;
  searchQuery?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = category.subCategories ?? [];
  const hasChildren = children.length > 0;
  const count = productCounts?.get(category.id) ?? 0;

  return (
    <div className="w-full">
      <div className="group flex items-center gap-2 rounded-sm px-2 py-2 transition-colors hover:bg-wash/60">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-wash hover:text-foreground"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        {isExpanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 shrink-0 text-sage-deep" />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-sage" />
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-body text-sm text-foreground">
            <span className="truncate">{highlight(category.name, searchQuery)}</span>
            {hasChildren && (
              <span className="shrink-0 font-body text-xs tabular-nums text-ink-muted">
                {children.length} inside
              </span>
            )}
          </p>
          <p className="flex items-center gap-2 truncate font-body text-xs text-ink-muted">
            <span className="truncate">{highlight(category.path, searchQuery)}</span>
            {/* Said once, where the depth actually is, rather than as a rule in
                a heading nobody reads. */}
            {depthOf(category) > SUGGESTED_CATEGORY_DEPTH && (
              <span
                className="shrink-0 text-terra-ink"
                title={`Level ${depthOf(category)}. Most shops stop around ${SUGGESTED_CATEGORY_DEPTH} — deeper shelves get fewer visitors.`}
              >
                level {depthOf(category)}
              </span>
            )}
          </p>
        </div>

        {/* A category with nothing in it is a dead link in the shop's menu. */}
        <span
          className={cn(
            "shrink-0 rounded-sm px-2 py-0.5 font-body text-[11px] tabular-nums",
            count === 0 ? "bg-terra/10 text-terra-ink" : "bg-wash/60 text-ink-muted"
          )}
          title={count === 0 ? "Nothing filed here" : `${count} products`}
        >
          {count === 0 ? "empty" : `${count} products`}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {/* Any depth up to the ceiling. The storefront route is a catch-all
              and `generateStaticParams` walks the whole tree, so a category five
              deep has a real page. */}
          {canNestUnder(category) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onAddSubcategory(category)}
              title={`Add a subcategory under ${category.name}`}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add subcategory under {category.name}</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions for {category.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {canNestUnder(category) ? (
                <DropdownMenuItem onClick={() => onAddSubcategory(category)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add subcategory
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  {MAX_CATEGORY_DEPTH} levels is the limit
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(category)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-4 border-l border-rule pl-2">
          {children.map((child) => (
            <TreeItem
              key={child.id}
              category={child}
              depth={depth + 1}
              productCounts={productCounts}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubcategory={onAddSubcategory}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Sage wash rather than terracotta: a highlight has to stay readable. */
function highlight(text: string, query?: string) {
  if (!query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="rounded-[2px] bg-wash px-0.5 text-sage-deep">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

/**
 * Keeps a branch when the category itself matches, or when anything beneath it
 * does — so searching "tea" shows Food & Pantry with Coffee & Tea inside it,
 * rather than a child floating with no parent.
 */
function filterTree(categories: Category[], query?: string): Category[] {
  const needle = query?.trim().toLowerCase();
  if (!needle) return categories;

  const matches = (category: Category) =>
    category.name.toLowerCase().includes(needle) ||
    category.slug.toLowerCase().includes(needle) ||
    category.path.toLowerCase().includes(needle) ||
    (category.description ?? "").toLowerCase().includes(needle);

  const kept: Category[] = [];

  for (const category of categories) {
    const children = filterTree(category.subCategories ?? [], query);

    if (matches(category)) {
      // A matching parent keeps all of its children, so the branch reads whole.
      kept.push({ ...category, subCategories: category.subCategories ?? [] });
    } else if (children.length > 0) {
      kept.push({ ...category, subCategories: children });
    }
  }

  return kept;
}
