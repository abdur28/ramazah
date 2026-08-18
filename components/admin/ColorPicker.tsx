"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Palette } from "lucide-react";
import { Color } from "@/types/types";

interface ColorPickerProps {
  colors: Color[];
  onChange: (colors: Color[]) => void;
}

const PRESET_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#EF4444" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#10B981" },
  { name: "Yellow", hex: "#F59E0B" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Orange", hex: "#F97316" },
  { name: "Teal", hex: "#14B8A6" },
  { name: "Indigo", hex: "#6366F1" },
];

export default function ColorPicker({ colors, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");

  const addColor = () => {
    if (colorName.trim() && colorHex) {
      const newColor = { name: colorName.trim(), hex: colorHex };
      if (!colors.find(c => c.name.toLowerCase() === newColor.name.toLowerCase())) {
        onChange([...colors, newColor]);
        setColorName("");
        setColorHex("#000000");
        setIsOpen(false);
      }
    }
  };

  const removeColor = (colorToRemove: Color) => {
    onChange(colors.filter(c => c.name !== colorToRemove.name));
  };

  const addPresetColor = (preset: Color) => {
    if (!colors.find(c => c.name.toLowerCase() === preset.name.toLowerCase())) {
      onChange([...colors, preset]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Colors (for variants)</Label>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Color
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-3">Add New Color</h4>
                
                {/* Custom Color */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="colorName" className="text-xs">Color Name</Label>
                    <Input
                      id="colorName"
                      value={colorName}
                      onChange={(e) => setColorName(e.target.value)}
                      placeholder="e.g., Navy Blue"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="colorHex" className="text-xs">Hex Color</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="colorHex"
                          value={colorHex}
                          onChange={(e) => setColorHex(e.target.value)}
                          placeholder="#000000"
                          className="pr-12"
                        />
                        <div 
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded border-2 border-gray-200 shadow-sm cursor-pointer"
                          style={{ backgroundColor: colorHex }}
                          onClick={() => document.getElementById('colorPickerInput')?.click()}
                        />
                        <input
                          id="colorPickerInput"
                          type="color"
                          value={colorHex}
                          onChange={(e) => setColorHex(e.target.value)}
                          className="absolute opacity-0 w-0 h-0"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    onClick={addColor} 
                    className="w-full"
                    disabled={!colorName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Color
                  </Button>
                </div>

                {/* Preset Colors */}
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-xs mb-2 block">Quick Add Presets</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((preset) => {
                      const isAdded = colors.find(c => c.name?.toLowerCase() === preset.name.toLowerCase());
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => !isAdded && addPresetColor(preset)}
                          disabled={!!isAdded}
                          className="group relative w-full aspect-square rounded-md border-2 transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                          style={{ 
                            backgroundColor: preset.hex,
                            borderColor: preset.hex === '#FFFFFF' ? '#E5E7EB' : preset.hex
                          }}
                          title={preset.name}
                        >
                          {isAdded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected Colors Display */}
      {colors.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {colors.map((color, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className="pl-1 pr-2 py-1 gap-2 hover:bg-accent transition-colors"
            >
              <div 
                className="w-5 h-5 rounded border border-gray-300 shadow-sm flex-shrink-0"
                style={{ backgroundColor: color.hex }}
                title={color.hex}
              />
              <span className="text-xs font-medium">{color.name}</span>
              <button
                type="button"
                onClick={() => removeColor(color)}
                className="hover:bg-destructive/10 rounded-sm transition-colors"
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground border-2 border-dashed rounded-lg p-4 text-center">
          <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No colors added yet</p>
          <p className="text-xs mt-1">Click "Add Color" to get started</p>
        </div>
      )}
    </div>
  );
}