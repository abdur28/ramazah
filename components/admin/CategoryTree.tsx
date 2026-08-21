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

/**
 * The category hierarchy.
 *
 * Three things went beyond the restyle.
 *
 * The drag handle is gone. It rendered a `GripVertical` with `cursor-grab` and
 * no drag implementation behind it, so the affordance promised a reorder that
 * could not happen.
 *
 * Search matches were highlighted with `bg-warning`, which on this palette is
 * terracotta `#AB5E3A` — a dark background carrying dark ink. The highlight was
 * less legible than the text it was meant to pick out. It is a sage wash now.
 *
 * And the row actions no longer appear only on hover, which put every edit and
 * delete out of reach on a touchscreen.
 */
interface TreeNode extends Category {
  children: TreeNode[];
  level: number;
}

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
  const tree = useMemo(() => buildTree(categories, searchQuery), [categories, searchQuery]);

  if (tree.length === 0) {
    return (
      <p className="py-10 text-center font-body text-sm text-ink-muted">
        {searchQuery ? "No categories match that search." : "No categories yet."}
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
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
  node,
  productCounts,
  onEdit,
  onDelete,
  onAddSubcategory,
  searchQuery,
}: {
  node: TreeNode;
  productCounts?: Map<string, number>;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddSubcategory: (parentCategory: Category) => void;
  searchQuery?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const count = productCounts?.get(node.id) ?? 0;

  return (
    <div className="w-full">
      <div className="group flex items-center gap-2 rounded-sm px-2 py-2 transition-colors hover:bg-wash/60">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-wash/60 hover:text-foreground"
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
            <span className="truncate">{highlight(node.name, searchQuery)}</span>
            {hasChildren && (
              <span className="shrink-0 font-body text-xs tabular-nums text-ink-muted">
                {node.children.length} sub
              </span>
            )}
          </p>
          <p className="truncate font-body text-xs text-ink-muted">
            {highlight(node.path, searchQuery)}
          </p>
        </div>

        {/* A category with nothing in it is a dead link in the shop's menu. */}
        <span
          className={cn(
            "shrink-0 rounded-sm px-2 py-0.5 font-body text-[11px] tabular-nums",
            count === 0 ? "bg-terra/10 text-terra-ink" : "bg-wash/60 text-ink-muted"
          )}
          title={count === 0 ? "Nothing in this category" : `${count} products`}
        >
          {count === 0 ? "empty" : `${count} products`}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onAddSubcategory(node)}
            title={`Add a subcategory under ${node.name}`}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add subcategory under {node.name}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions for {node.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddSubcategory(node)}>
                <Plus className="mr-2 h-4 w-4" />
                Add subcategory
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(node)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-4 border-l border-rule pl-2">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
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

function buildTree(categories: Category[], searchQuery?: string): TreeNode[] {
  let filtered = categories;

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        category.path.toLowerCase().includes(query) ||
        (category.description ?? "").toLowerCase().includes(query)
    );
  }

  const sorted = [...filtered].sort((a, b) => a.path.localeCompare(b.path));
  const nodes = new Map<string, TreeNode>();

  sorted.forEach((category) => {
    nodes.set(category.path, {
      ...category,
      children: [],
      level: category.path.split("/").length - 1,
    });
  });

  const roots: TreeNode[] = [];

  sorted.forEach((category) => {
    const node = nodes.get(category.path)!;
    const segments = category.path.split("/");

    if (segments.length === 1) {
      roots.push(node);
      return;
    }

    // A parent filtered out by the search leaves its child at the root, which
    // is right: a match should stay visible even when its ancestor does not.
    const parent = nodes.get(segments.slice(0, -1).join("/"));
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  return roots;
}
