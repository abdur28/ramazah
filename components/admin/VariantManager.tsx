"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Package, DollarSign } from "lucide-react";
import { ProductVariant } from "@/types/admin";
import { Color, ProductPrice, CurrencyCode } from "@/types/types";
import { availableCurrencies } from "@/constants";

interface VariantManagerProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  defaultPrices: ProductPrice[];
  availableSizes: string[];
  availableColors: Color[];
}

export default function VariantManager({
  variants,
  onChange,
  defaultPrices,
  availableSizes,
  availableColors,
}: VariantManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  
  // Initialize prices for all currencies
  const initializeVariantPrices = (existingPrices?: ProductPrice[]): ProductPrice[] => {
    return availableCurrencies.map(currency => {
      const existing = existingPrices?.find(p => p.currency === currency.code);
      return existing || {
        currency: currency.code,
        price: 0,
        compareAtPrice: 0,
        discountPercent: 0
      };
    });
  };

  const [formData, setFormData] = useState<Partial<ProductVariant>>({
    size: "",
    color: undefined,
    sku: "",
    prices: initializeVariantPrices(),
    stockCount: 0,
    inStock: true,
  });

  const generateVariantId = () => {
    return `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateVariantSKU = (size?: string, color?: Color) => {
    const parts = [];
    if (size) parts.push(size.toUpperCase());
    if (color) parts.push(color.name.toUpperCase().replace(/\s+/g, ""));
    return parts.join("-") + "-" + Date.now().toString().slice(-4);
  };

  const openAddDialog = () => {
    setEditingVariant(null);
    setFormData({
      size: "",
      color: undefined,
      sku: "",
      prices: initializeVariantPrices(),
      stockCount: 0,
      inStock: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      size: variant.size || "",
      color: variant.color || undefined,
      sku: variant.sku,
      prices: initializeVariantPrices(variant.prices),
      stockCount: variant.stockCount,
      inStock: variant.inStock,
    });
    setIsDialogOpen(true);
  };

  // Update price for a specific currency
  const updateVariantPrice = (currencyCode: CurrencyCode, field: 'price' | 'compareAtPrice', value: number) => {
    setFormData(prev => {
      const updatedPrices = (prev.prices || []).map(p => {
        if (p.currency === currencyCode) {
          const updated = { ...p, [field]: value };
          
          // Calculate discount percent
          if (updated.compareAtPrice && updated.compareAtPrice > 0 && updated.price > 0) {
            updated.discountPercent = Math.round(
              ((updated.compareAtPrice - updated.price) / updated.compareAtPrice) * 100
            );
          } else {
            updated.discountPercent = 0;
          }
          
          return updated;
        }
        return p;
      });
      
      return { ...prev, prices: updatedPrices };
    });
  };

  // Get price for a specific currency
  const getVariantFormPrice = (currencyCode: CurrencyCode, field: 'price' | 'compareAtPrice'): number => {
    const priceObj = formData.prices?.find(p => p.currency === currencyCode);
    return priceObj?.[field] || 0;
  };

  // Get discount percent for a specific currency
  const getVariantFormDiscountPercent = (currencyCode: CurrencyCode): number => {
    const priceObj = formData.prices?.find(p => p.currency === currencyCode);
    return priceObj?.discountPercent || 0;
  };

  // Get default price for a currency
  const getDefaultPrice = (currencyCode: CurrencyCode): number => {
    return defaultPrices.find(p => p.currency === currencyCode)?.price || 0;
  };

  // Get variant display price (uses variant price or falls back to default)
  const getVariantDisplayPrice = (variant: ProductVariant, currencyCode: CurrencyCode): number => {
    const variantPrice = variant.prices?.find(p => p.currency === currencyCode)?.price;
    return variantPrice || getDefaultPrice(currencyCode);
  };

  const handleSave = () => {
    // Validation
    if (!formData.size && !formData.color) {
      alert("Please select at least a size or color");
      return;
    }

    // Filter out prices that are 0 (means using default)
    const filteredPrices = formData.prices?.filter(p => p.price > 0);

    const variantData: ProductVariant = {
      id: editingVariant?.id || generateVariantId(),
      size: formData.size || undefined,
      color: formData.color || undefined,
      sku: formData.sku || generateVariantSKU(formData.size, formData.color),
      prices: filteredPrices && filteredPrices.length > 0 ? filteredPrices : undefined,
      stockCount: formData.stockCount || 0,
      inStock: formData.inStock ?? true,
    };

    if (editingVariant) {
      // Update existing variant
      onChange(variants.map(v => v.id === editingVariant.id ? variantData : v));
    } else {
      // Add new variant
      onChange([...variants, variantData]);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (variantId: string) => {
    if (confirm("Are you sure you want to delete this variant?")) {
      onChange(variants.filter(v => v.id !== variantId));
    }
  };

  const getVariantLabel = (variant: ProductVariant) => {
    const parts = [];
    if (variant.size) parts.push(variant.size);
    if (variant.color) parts.push(variant.color.name);
    return parts.join(" / ") || "Variant";
  };

  const handleColorChange = (colorName: string) => {
    if (colorName === "none") {
      setFormData(prev => ({ ...prev, color: undefined }));
    } else {
      const selectedColor = availableColors.find(c => c.name === colorName);
      setFormData(prev => ({ ...prev, color: selectedColor }));
    }
  };

  // Get the default currency for display
  const defaultCurrency = availableCurrencies.find(c => c.isDefault) || availableCurrencies[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Variants</CardTitle>
            <CardDescription>
              Manage different variations of this product (size, color, etc.)
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} type="button" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Variant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-body">
                  {editingVariant ? "Edit Variant" : "Add New Variant"}
                </DialogTitle>
                <DialogDescription>
                  {editingVariant 
                    ? "Update the variant details below"
                    : "Create a new product variant with specific attributes"
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Size and Color Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="size">Size</Label>
                    <Select
                      value={formData.size || "none"}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, size: value === "none" ? "" : value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {availableSizes.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Select
                      value={formData.color?.name || "none"}
                      onValueChange={handleColorChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color">
                          {formData.color ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border border-foreground/20"
                                style={{ backgroundColor: formData.color.hex }}
                              />
                              <span>{formData.color.name}</span>
                            </div>
                          ) : (
                            "Select color"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {availableColors.map(color => (
                          <SelectItem key={color.name} value={color.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full border border-foreground/20"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span>{color.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Auto-generated if empty"
                  />
                </div>

                <Separator />

                {/* Multi-Currency Pricing */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">Variant Pricing (Optional)</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Leave prices at 0 to use the default product prices
                    </p>
                  </div>

                  {availableCurrencies.map((currency, index) => {
                    const discountPercent = getVariantFormDiscountPercent(currency.code);
                    const price = getVariantFormPrice(currency.code, 'price');
                    const compareAtPrice = getVariantFormPrice(currency.code, 'compareAtPrice');
                    const defaultPrice = getDefaultPrice(currency.code);
                    const savings = compareAtPrice - price;
                    
                    return (
                      <div key={currency.code} className="space-y-3">
                        {index > 0 && <Separator />}
                        
                        <div className="flex items-center gap-2">
                          <h4 className=" font-body font-semibold">{currency.name} ({currency.symbol})</h4>
                          {currency.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`variant-price-${currency.code}`}>
                              Price ({currency.symbol})
                            </Label>
                            <Input
                              id={`variant-price-${currency.code}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={price || ''}
                              onChange={(e) => updateVariantPrice(
                                currency.code,
                                'price',
                                parseFloat(e.target.value) || 0
                              )}
                              placeholder={`${defaultPrice.toFixed(2)} (default)`}
                            />
                            {price === 0 && (
                              <p className="text-xs text-muted-foreground">
                                Using default: {currency.symbol}{defaultPrice.toFixed(2)}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`variant-compareAtPrice-${currency.code}`}>
                              Compare at Price ({currency.symbol})
                            </Label>
                            <Input
                              id={`variant-compareAtPrice-${currency.code}`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={compareAtPrice || ''}
                              onChange={(e) => updateVariantPrice(
                                currency.code,
                                'compareAtPrice',
                                parseFloat(e.target.value) || 0
                              )}
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {discountPercent > 0 && price > 0 && (
                          <div className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <p className="text-xs text-green-800 dark:text-green-200">
                              💰 <strong>{discountPercent}% off</strong> - Save {currency.symbol}{savings.toFixed(2)}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Separator />

                {/* Stock Management */}
                <div className="space-y-2">
                  <Label htmlFor="stockCount">Stock Count</Label>
                  <Input
                    id="stockCount"
                    type="number"
                    min="0"
                    value={formData.stockCount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      stockCount: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>In Stock</Label>
                    <p className="text-xs text-muted-foreground">
                      Available for purchase
                    </p>
                  </div>
                  <Switch
                    checked={formData.inStock}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inStock: checked }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingVariant ? "Update Variant" : "Add Variant"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">No variants yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Add variants to offer different sizes, colors, or options
            </p>
            <Button type="button" onClick={openAddDialog} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add First Variant
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {variants.map((variant) => {
              const displayPrice = getVariantDisplayPrice(variant, defaultCurrency.code);
              const hasCustomPrice = variant.prices && variant.prices.length > 0;
              
              return (
                <div
                  key={variant.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {variant.color && (
                        <div 
                          className="w-5 h-5 rounded-full border-2 border-foreground/20 shadow-sm flex-shrink-0"
                          style={{ backgroundColor: variant.color.hex }}
                          title={variant.color.name}
                        />
                      )}
                      <span className="font-medium">{getVariantLabel(variant)}</span>
                      {!variant.inStock && (
                        <Badge variant="destructive" className="text-xs">
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>SKU: {variant.sku}</span>
                      <span>•</span>
                      <span className="font-medium text-foreground">
                        {defaultCurrency.symbol}{displayPrice.toFixed(2)}
                        {!hasCustomPrice && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (default) 
                          </span>
                        )}
                      </span>
                      <span>•</span>
                      <span>Stock: {variant.stockCount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => openEditDialog(variant)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(variant.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {variants.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <strong>{variants.length}</strong> variant{variants.length !== 1 ? "s" : ""} •{" "}
            <strong>{variants.reduce((sum, v) => sum + v.stockCount, 0)}</strong> total units
          </div>
        )}
      </CardContent>
    </Card>
  );
}