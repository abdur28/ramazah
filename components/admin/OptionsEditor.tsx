"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProductOptionDef } from "@/types/types";

/**
 * The axes a product varies along.
 *
 * This is what the old form could not express. It offered a fixed `Sizes` list
 * and a fixed `Colours` picker — the two axes a streetwear shop has — while the
 * database has always stored arbitrary named axes (`product_options` /
 * `product_option_values`). So a bag of coffee that comes in **Weight: 250g /
 * 1kg** and **Grind: Whole bean / Ground** could not be created through the UI
 * at all; the eight products in the catalogue got there through SQL.
 *
 * Colour is no longer special. It is an axis like any other, and any axis whose
 * name reads as a colour offers a swatch per value — which is what
 * `product_option_values.hex` is for.
 */
const SUGGESTIONS = ["Weight", "Grind", "Size", "Colour", "Shade", "Scent", "Length", "Pack"];

const isColourAxis = (name: string) => /^colou?r$/i.test(name.trim());

export default function OptionsEditor({
  options,
  onChange,
}: {
  options: ProductOptionDef[];
  onChange: (options: ProductOptionDef[]) => void;
}) {
  const [valueDrafts, setValueDrafts] = useState<Record<number, string>>({});

  const update = (index: number, next: Partial<ProductOptionDef>) =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...next } : option)));

  const addOption = (name = "") =>
    onChange([...options, { name, values: [] }]);

  const removeOption = (index: number) =>
    onChange(options.filter((_, i) => i !== index));

  const addValue = (index: number) => {
    const draft = (valueDrafts[index] ?? "").trim();
    if (!draft) return;

    const option = options[index];
    // Duplicate values would generate duplicate variants and collide on the
    // `unique (option_id, value)` index.
    if (option.values.some((v) => v.value.toLowerCase() === draft.toLowerCase())) {
      setValueDrafts({ ...valueDrafts, [index]: "" });
      return;
    }

    update(index, {
      values: [
        ...option.values,
        { value: draft, hex: isColourAxis(option.name) ? "#8A9276" : undefined },
      ],
    });
    setValueDrafts({ ...valueDrafts, [index]: "" });
  };

  const removeValue = (index: number, value: string) =>
    update(index, { values: options[index].values.filter((v) => v.value !== value) });

  const setHex = (index: number, value: string, hex: string) =>
    update(index, {
      values: options[index].values.map((v) => (v.value === value ? { ...v, hex } : v)),
    });

  const unusedSuggestions = SUGGESTIONS.filter(
    (name) => !options.some((option) => option.name.toLowerCase() === name.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {options.length === 0 ? (
        <div className="rounded-sm border border-dashed border-rule px-5 py-8 text-center">
          <p className="font-body text-sm text-foreground">This product comes one way only</p>
          <p className="mx-auto mt-1.5 max-w-[52ch] font-body text-sm text-ink-muted">
            Add an axis if it varies — a coffee sold in 250g and 1kg, a veil in three
            colours. Without one it gets a single variant with one price and one stock
            count, which is right for a lantern or a tray.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {options.map((option, index) => (
            <li key={index} className="rounded-sm border border-rule bg-card p-4">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                <Input
                  value={option.name}
                  onChange={(event) => update(index, { name: event.target.value })}
                  placeholder="Axis name — Weight, Grind, Colour…"
                  aria-label={`Name of axis ${index + 1}`}
                  className="max-w-xs font-medium"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  title={`Remove ${option.name || "this axis"}`}
                  className="ml-auto text-ink-muted hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remove {option.name || "this axis"}</span>
                </Button>
              </div>

              <div className="mt-3 pl-6">
                {option.values.length > 0 && (
                  <ul className="mb-3 flex flex-wrap gap-2">
                    {option.values.map((value) => (
                      <li
                        key={value.value}
                        className="inline-flex items-center gap-2 rounded-sm border border-rule bg-wash/50 py-1 pl-2 pr-1 font-body text-sm text-foreground"
                      >
                        {isColourAxis(option.name) && (
                          <input
                            type="color"
                            value={value.hex ?? "#8A9276"}
                            onChange={(event) => setHex(index, value.value, event.target.value)}
                            aria-label={`Swatch for ${value.value}`}
                            className="h-5 w-5 cursor-pointer rounded-[2px] border border-rule bg-transparent p-0"
                          />
                        )}
                        {value.value}
                        <button
                          type="button"
                          onClick={() => removeValue(index, value.value)}
                          aria-label={`Remove ${value.value}`}
                          className="rounded-sm p-0.5 text-ink-muted transition-colors hover:bg-card hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <Input
                    value={valueDrafts[index] ?? ""}
                    onChange={(event) =>
                      setValueDrafts({ ...valueDrafts, [index]: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        // Otherwise Enter submits the whole product form.
                        event.preventDefault();
                        addValue(index);
                      }
                    }}
                    placeholder={
                      isColourAxis(option.name) ? "Add a colour — Black, Sage…" : "Add a value — 250g…"
                    }
                    aria-label={`Add a value to ${option.name || "this axis"}`}
                    className="max-w-xs"
                  />
                  <Button type="button" variant="outline" onClick={() => addValue(index)}>
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Add value</span>
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => addOption()}>
          <Plus className="mr-2 h-4 w-4" />
          Add an axis
        </Button>

        {unusedSuggestions.length > 0 && (
          <>
            <span className="font-body text-xs text-ink-muted">or</span>
            {unusedSuggestions.slice(0, 5).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addOption(name)}
                className={cn(
                  "rounded-sm border border-rule bg-card px-2.5 py-1 font-body text-xs text-ink-muted",
                  "transition-colors hover:border-sage hover:text-foreground"
                )}
              >
                {name}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
