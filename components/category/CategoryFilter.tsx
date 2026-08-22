"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/CurrencyContext"

/**
 * The filter rail.
 *
 * It used to offer Size, Colour, Tags and Materials — the axes of the streetwear
 * shop this codebase came from. Ramazah sells coffee by Weight and Grind, tea by
 * Flavour, veils by Colour and trays by nothing at all, so on every food page the
 * page computed empty arrays for Size and Colour and rendered a panel with
 * nothing in it. A filter that shows no filters reads as a broken page.
 *
 * The axes come from the products now, the same generic option model the variant
 * picker and the product form already use. A veil category still shows Colour,
 * because Colour is one of the axes those products happen to have — it is no
 * longer a special case in the code.
 *
 * Each value carries the number of products behind it, so a shopper can see
 * before clicking that a filter would empty the grid.
 */
export interface FilterAxis {
  name: string
  values: { value: string; hex?: string; count: number }[]
}

export interface FilterOptions {
  /** Axis name -> the values ticked under it. */
  options?: Record<string, string[]>
  priceRange?: [number, number]
  inStockOnly?: boolean
  tags?: string[]
}

interface CategoryFilterProps {
  axes?: FilterAxis[]
  availableTags?: { value: string; count: number }[]
  maxPrice?: number
  filters: FilterOptions
  onFilterChange: (filters: FilterOptions) => void
  onClearFilters: () => void
}

const isColourAxis = (name: string) => /^colou?r$/i.test(name.trim())

export default function CategoryFilter({
  axes = [],
  availableTags = [],
  maxPrice = 10000,
  filters,
  onFilterChange,
  onClearFilters,
}: CategoryFilterProps) {
  const { formatPrice } = useCurrency()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // The first two axes open, the rest folded: a page with four axes is a wall
  // of checkboxes otherwise.
  const [collapsed, setCollapsed] = useState<string[]>(() =>
    axes.slice(2).map((axis) => axis.name)
  )

  const toggleSection = (section: string) =>
    setCollapsed((current) =>
      current.includes(section) ? current.filter((s) => s !== section) : [...current, section]
    )

  const selectedFor = (axis: string) => filters.options?.[axis] ?? []

  const toggleValue = (axis: string, value: string) => {
    const current = selectedFor(axis)
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]

    const options = { ...(filters.options ?? {}) }
    if (next.length > 0) options[axis] = next
    else delete options[axis]

    onFilterChange({ ...filters, options })
  }

  const toggleTag = (tag: string) => {
    const current = filters.tags ?? []
    const next = current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    onFilterChange({ ...filters, tags: next.length > 0 ? next : undefined })
  }

  const activeCount =
    Object.values(filters.options ?? {}).reduce((sum, values) => sum + values.length, 0) +
    (filters.tags?.length ?? 0) +
    (filters.priceRange ? 1 : 0) +
    (filters.inStockOnly ? 1 : 0)

  const FilterContent = () => (
    <div className="space-y-6">
      {activeCount > 0 && (
        <button
          type="button"
          onClick={onClearFilters}
          className="flex w-full items-center justify-between rounded-sm border border-rule px-3 py-2 font-body text-sm text-ink-muted transition-colors hover:border-sage hover:text-foreground"
        >
          Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {axes.map((axis) => {
        const isOpen = !collapsed.includes(axis.name)
        const selected = selectedFor(axis.name)

        return (
          <section key={axis.name}>
            <button
              type="button"
              onClick={() => toggleSection(axis.name)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between py-1 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:text-foreground"
            >
              <span>
                {axis.name}
                {selected.length > 0 && (
                  <span className="ml-2 normal-case tracking-normal text-sage-deep">
                    {selected.length}
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", !isOpen && "-rotate-90")}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div
                    className={cn(
                      "pt-3",
                      isColourAxis(axis.name) ? "flex flex-wrap gap-2" : "space-y-2"
                    )}
                  >
                    {axis.values.map((option) =>
                      isColourAxis(axis.name) && option.hex ? (
                        // A swatch says more than the word for a colour, but the
                        // name stays as the label — colour alone never carries
                        // meaning here.
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleValue(axis.name, option.value)}
                          aria-pressed={selected.includes(option.value)}
                          title={`${option.value} · ${option.count} product${option.count === 1 ? "" : "s"}`}
                          className={cn(
                            "flex items-center gap-2 rounded-sm border px-2 py-1.5 font-body text-sm transition-colors",
                            selected.includes(option.value)
                              ? "border-sage-deep bg-wash/60 text-foreground"
                              : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
                          )}
                        >
                          <span
                            aria-hidden
                            className="h-4 w-4 shrink-0 rounded-[2px] border border-rule"
                            style={{ backgroundColor: option.hex }}
                          />
                          {option.value}
                        </button>
                      ) : (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-3 font-body text-sm"
                        >
                          <Checkbox
                            checked={selected.includes(option.value)}
                            onCheckedChange={() => toggleValue(axis.name, option.value)}
                          />
                          <span className="flex-1 text-foreground">{option.value}</span>
                          <span className="font-body text-xs tabular-nums text-ink-muted">
                            {option.count}
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )
      })}

      {/* Price */}
      <section>
        <h3 className="py-1 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          Price
        </h3>
        <div className="pt-4">
          <Slider
            min={0}
            max={maxPrice}
            step={Math.max(Math.round(maxPrice / 100), 1)}
            value={filters.priceRange ?? [0, maxPrice]}
            onValueChange={(value) =>
              onFilterChange({ ...filters, priceRange: value as [number, number] })
            }
          />
          <div className="mt-2 flex items-center justify-between font-body text-xs tabular-nums text-ink-muted">
            <span>{formatPrice((filters.priceRange ?? [0, maxPrice])[0])}</span>
            <span>{formatPrice((filters.priceRange ?? [0, maxPrice])[1])}</span>
          </div>
        </div>
      </section>

      {/* Availability */}
      <section>
        <label className="flex cursor-pointer items-center gap-3 font-body text-sm">
          <Checkbox
            checked={filters.inStockOnly ?? false}
            onCheckedChange={(checked) =>
              onFilterChange({ ...filters, inStockOnly: checked === true })
            }
          />
          <span className="text-foreground">In stock only</span>
        </label>
      </section>

      {availableTags.length > 0 && (
        <section>
          <h3 className="py-1 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2 pt-3">
            {availableTags.map((tag) => (
              <button
                key={tag.value}
                type="button"
                onClick={() => toggleTag(tag.value)}
                aria-pressed={filters.tags?.includes(tag.value) ?? false}
                className={cn(
                  "rounded-sm border px-2.5 py-1 font-body text-xs transition-colors",
                  filters.tags?.includes(tag.value)
                    ? "border-sage-deep bg-wash/60 text-foreground"
                    : "border-rule text-ink-muted hover:border-sage hover:text-foreground"
                )}
              >
                {tag.value}
                <span className="ml-1.5 tabular-nums text-ink-muted">{tag.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <FilterContent />
      </div>

      {/* Phone: the same content in a sheet. */}
      <div className="lg:hidden">
        <Button variant="outline" onClick={() => setIsMobileOpen(true)} className="w-full">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filter
          {activeCount > 0 && (
            <span className="ml-2 rounded-sm bg-sage-deep px-1.5 py-0.5 font-body text-[11px] tabular-nums text-background">
              {activeCount}
            </span>
          )}
        </Button>

        <AnimatePresence>
          {isMobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileOpen(false)}
                className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className="fixed inset-y-0 left-0 z-50 flex w-[min(22rem,90vw)] flex-col bg-card shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-rule px-6 py-4">
                  <h2 className="font-body text-sm font-medium uppercase tracking-[0.18em] text-ink-muted">
                    Filter
                  </h2>
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    aria-label="Close filters"
                    className="-mr-2 rounded-md p-2 text-ink-muted transition-colors hover:bg-wash hover:text-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div data-lenis-prevent className="flex-1 overflow-y-auto px-6 py-6">
                  <FilterContent />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
