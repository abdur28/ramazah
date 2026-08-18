"use client"

import { ArrowUpDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type SortOption = "featured" | "newest" | "price-low-high" | "price-high-low" | "name-a-z" | "name-z-a"

interface CategorySortProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

const sortOptions = [
  { value: "featured" as SortOption, label: "Featured" },
  { value: "newest" as SortOption, label: "Newest" },
  { value: "price-low-high" as SortOption, label: "Price: Low to High" },
  { value: "price-high-low" as SortOption, label: "Price: High to Low" },
  { value: "name-a-z" as SortOption, label: "Name: A to Z" },
  { value: "name-z-a" as SortOption, label: "Name: Z to A" },
]

export default function CategorySort({ value, onChange }: CategorySortProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs font-body text-foreground/60 uppercase tracking-wider">
        <ArrowUpDown className="h-4 w-4" />
        <span className="hidden sm:inline">Sort</span>
      </div>
      
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] border-foreground/20 rounded-none bg-background hover:border-[#F8E231] transition-colors focus:ring-[#F8E231] focus:ring-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-none border-foreground/20">
          {sortOptions.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value} 
              className="font-body text-sm cursor-pointer hover:bg-[#F8E231]/10 focus:bg-[#F8E231]/10"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}