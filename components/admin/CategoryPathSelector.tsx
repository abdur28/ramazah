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

interface CategoryPathSelectorProps {
  categories: Category[];
  value?: string; // Display path format: "Clothings > Hood Wears > Hoodies"
  onChange: (path: string) => void; // Returns display path format
  placeholder?: string;
}

// Convert path to display format
function pathToDisplayPath(path: string): string {
  return path
    .split('/')
    .map(segment => 
      segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' > ');
}

// Convert display path to path format
function displayPathToPath(displayPath: string): string {
  return displayPath
    .split(' > ')
    .map(segment => segment.toLowerCase().replace(/\s+/g, '-'))
    .join('/');
}

export default function CategoryPathSelector({
  categories,
  value,
  onChange,
  placeholder = "Select category..."
}: CategoryPathSelectorProps) {
  const [open, setOpen] = useState(false);

  // Process categories for display
  const processedCategories = useMemo(() => {
    // Sort by path to ensure proper hierarchy
    const sorted = [...categories].sort((a, b) => a.path.localeCompare(b.path));
    
    return sorted.map(cat => {
      const level = cat.path.split('/').length - 1;
      const displayPath = pathToDisplayPath(cat.path);
      
      return {
        id: cat.id,
        name: cat.name,
        path: cat.path, // Slash format
        displayPath, // Display format: "Clothings > Hood Wears > Hoodies"
        level
      };
    });
  }, [categories]);

  // Get display value
  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    
    // If value is already in display format, use it
    if (value.includes(' > ')) {
      return value;
    }
    
    // If value is in path format, convert it
    return pathToDisplayPath(value);
  }, [value, placeholder]);

  const handleSelect = (selectedPath: string) => {
    // Find the category by path
    const category = processedCategories.find(
      cat => cat.path === selectedPath || cat.displayPath === selectedPath
    );
    
    if (!category) {
      onChange("");
      setOpen(false);
      return;
    }
    
    // Return display path format
    onChange(category.displayPath === value ? "" : category.displayPath);
    setOpen(false);
  };

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
                value={category.displayPath}
                onSelect={() => handleSelect(category.path)}
                style={{ paddingLeft: `${12 + category.level * 16}px` }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === category.displayPath || displayPathToPath(value || '') === category.path
                      ? "opacity-100" 
                      : "opacity-0"
                  )}
                />
                <span className={cn(
                  "truncate",
                  category.level === 0 && "font-medium"
                )}>
                  {category.name}
                </span>
                {category.level > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    Level {category.level + 1}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}