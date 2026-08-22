"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Layers, X } from "lucide-react";
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
import { Collection } from "@/types/admin";

interface CollectionSelectorProps {
  collections: Collection[];
  /** Slugs, in no particular order. */
  value: string[];
  onChange: (slugs: string[]) => void;
  placeholder?: string;
}

/**
 * Which collections a product belongs to.
 *
 * Multi-select, because a product genuinely sits in more than one: the same tin
 * of coffee came back on the March buying run *and* belongs on the Ramadan
 * table. This was a single-select until the join table landed, and the overlap
 * resolved to whichever was saved last.
 *
 * Chosen collections show as removable chips under the trigger rather than a
 * comma-run inside it — the list stays legible past two, and each one can be
 * taken off without opening the menu.
 */
export default function CollectionSelector({
  collections,
  value,
  onChange,
  placeholder = "No collections",
}: CollectionSelectorProps) {
  const [open, setOpen] = useState(false);

  const selected = collections.filter((c) => value.includes(c.slug));

  const toggle = (slug: string) =>
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            // Explicit, not inherited from Radix: an untyped button inside the
            // product form defaults to submit, which is how removing an image
            // used to save the whole product.
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2 truncate">
              <Layers className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {selected.length === 0
                  ? placeholder
                  : `${selected.length} selected`}
              </span>
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0">
          <Command>
            <CommandInput placeholder="Search collections…" />
            <CommandEmpty>No collection found.</CommandEmpty>
            <CommandGroup data-lenis-prevent className="max-h-64 overflow-auto">
              {collections.map((collection) => {
                const checked = value.includes(collection.slug);

                return (
                  <CommandItem
                    key={collection.id}
                    value={`${collection.name} ${collection.slug}`}
                    onSelect={() => toggle(collection.slug)}
                    className="cursor-pointer"
                  >
                    {/* A box, not a tick alone: this is a set, and an empty
                        square says so before anything is chosen. */}
                    <span
                      aria-hidden
                      className={cn(
                        "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        checked
                          ? "border-sage-deep bg-sage-deep text-background"
                          : "border-rule"
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{collection.name}</span>
                      {collection.description && (
                        <span className="block truncate text-xs text-ink-muted">
                          {collection.description}
                        </span>
                      )}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((collection) => (
            <li key={collection.id}>
              <button
                type="button"
                onClick={() => toggle(collection.slug)}
                className="group inline-flex items-center gap-1.5 rounded-sm bg-wash/60 py-1 pl-2.5 pr-1.5 font-body text-xs text-foreground transition-colors hover:bg-wash"
              >
                {collection.name}
                <X className="h-3 w-3 text-ink-muted transition-colors group-hover:text-destructive" />
                <span className="sr-only">Remove from {collection.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
