"use client";

import React, { useState, useMemo } from "react";
import { Check, ChevronDown, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Category } from "@/types/types";
import { flattenCategories } from "@/lib/categories";

interface CategoryPathSelectorProps {
  categories: Category[];
  /** `categories.path`, e.g. "Food & Pantry > Coffee & Tea". */
  value?: string;
  onChange: (path: string) => void;
  placeholder?: string;
}

/**
 * Picks the category a product is filed under.
 *
 * It used to derive nesting from `path.split('/')`, but the database separates
 * with `' > '`, so every entry came out at level 0 — no indentation, and a
 * "Level 1" badge on everything. It also only ever received the top-level rows
 * (`fetchCategories` nests children under `subCategories`), so subcategories
 * could not be chosen at all: a product could not be filed under Coffee & Tea.
 *
 * The value passed in and out is `categories.path`, which is what
 * `resolveCategoryId` matches on.
 */
export default function CategoryPathSelector({
  categories,
  value,
  onChange,
  placeholder = "Select category..."
}: CategoryPathSelectorProps) {
  const [open, setOpen] = useState(false);

  const processedCategories = useMemo(
    () =>
      flattenCategories(categories).map(({ category, depth }) => ({
        ...category,
        level: depth,
        displayPath: category.path,
      })),
    [categories]
  );

  const displayValue = value || placeholder;

  const handleSelect = (path: string) => {
    onChange(path === value ? "" : path);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          // Explicit, not inherited from Radix: an untyped button inside the
          // product form defaults to submit, which is how removing an image used
          // to save the whole product.
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <FolderTree className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {displayValue}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandEmpty>No category found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {processedCategories.map((category) => (
              <CommandItem
                key={category.id}
                value={category.path}
                onSelect={() => handleSelect(category.path)}
                style={{ paddingLeft: `${12 + category.level * 18}px` }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4 shrink-0", value === category.path ? "opacity-100" : "opacity-0")}
                />
                <span className={cn("truncate", category.level === 0 ? "font-medium" : "text-ink-muted")}>
                  {category.name}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}