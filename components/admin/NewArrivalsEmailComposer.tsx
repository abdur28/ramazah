"use client";

import React, { useState, useEffect } from "react";
import { Send, Loader2, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { toast } from "sonner";
import useAdmin from "@/hooks/admin/useAdmin";

interface NewArrivalsEmailComposerProps {
  recipients: string[];
  onEmailSent: (results: any) => void;
}

export default function NewArrivalsEmailComposer({ 
  recipients, 
  onEmailSent 
}: NewArrivalsEmailComposerProps) {
  const { 
    sendNewArrivalsEmail, 
    fetchProducts,
    products,
    loading 
  } = useAdmin();

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    // Load recent products
    fetchProducts({
      limit: 20,
      orderByField: 'createdAt',
      orderDirection: 'desc',
      filters: [{ field: 'inStock', operator: '==', value: true }]
    });
  }, []);

  const handleProductToggle = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      if (selectedProducts.length >= 6) {
        toast.error("Maximum 6 products can be featured");
        return;
      }
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handleSend = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    if (recipients.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    try {
      const results = await sendNewArrivalsEmail({
        recipients,
        productIds: selectedProducts
      });

      toast.success(`Email sent to ${results.successCount} recipients`);
      
      // Reset selection
      setSelectedProducts([]);

      onEmailSent(results);
    } catch (error: any) {
      console.error("Error sending new arrivals email:", error);
      toast.error(error.message || "Failed to send email");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="">
          Select Products to Feature (Max 6)
        </Label>
        <p className="text-xs text-ink-muted">
          Choose the products you want to showcase in the email
        </p>
      </div>

      {loading.products ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-sage-light" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-rule rounded-sm">
          <Package className="h-12 w-12 mx-auto mb-4 text-ink-muted" />
          <p className="text-ink-muted">No products available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
          {products.map((product) => (
            <label
              key={product.id}
              className={`flex items-start gap-3 p-3 rounded-sm border cursor-pointer transition-colors ${
                selectedProducts.includes(product.id)
                  ? ' border-sage'
                  : ' border-rule hover:border-sage'
              }`}
            >
              <Checkbox
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={() => handleProductToggle(product.id)}
                className="mt-1"
              />
              <div className="flex gap-3 flex-1 min-w-0">
                {product.images?.[0] ? (
                  <Image
                    src={product.images[0].secureUrl}
                    alt={product.name}
                    width={60}
                    height={60}
                    className="rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-[60px] h-[60px] rounded flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-ink-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    {product.sku}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      ${product.prices?.find(p => p.currency === 'usd')?.price || 0}
                    </Badge>
                    {!product.inStock && (
                      <Badge variant="destructive" className="text-xs">
                        Out of Stock
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {selectedProducts.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-sm border border-rule">
          <span className="text-sm">
            {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProducts([])}
            className="hover:"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        <Button
          onClick={handleSend}
          disabled={loading.adminAction || recipients.length === 0 || selectedProducts.length === 0}
          className="bg-sage-deep hover:bg-sage-deep text-background font-semibold"
        >
          {loading.adminAction ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send to {recipients.length} Recipients
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-ink-muted p-3 rounded border border-rule">
        <strong className="text-foreground">Preview:</strong> Recipients will receive a branded new arrivals email featuring the selected products with images, prices, and shop now buttons.
      </div>
    </div>
  );
}