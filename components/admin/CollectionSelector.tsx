"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Layers } from "lucide-react";
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
  value?: string; // slug
  onChange: (slug: string) => void;
  placeholder?: string;
}

export default function CollectionSelector({
  collections,
  value,
  onChange,
  placeholder = "Select collection..."
}: CollectionSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedCollection = collections.find(c => c.slug === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Layers className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {selectedCollection ? selectedCollection.name : placeholder}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search collections..." />
          <CommandEmpty>No collection found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            <CommandItem
              value=""
              onSelect={() => {
                onChange("");
                setOpen(false);
              }}
              className="cursor-pointer"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  !value ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="text-muted-foreground">No collection</span>
            </CommandItem>
            {collections.map((collection) => (
              <CommandItem
                key={collection.id}
                value={collection.slug}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === collection.slug ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1">
                  <div className="font-medium">{collection.name}</div>
                  {collection.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {collection.description}
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}