"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import ProductForm from "@/components/admin/ProductForm";
import useAdmin from "@/hooks/admin/useAdmin";
import { Product } from "@/types/admin";

export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as string;
  const { getProductById } = useAdmin();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const productData = await getProductById(productId);
      
      if (!productData) {
        setError("Product not found");
        return;
      }
      
      setProduct(productData);
    } catch (err) {
      console.error("Error loading product:", err);
      setError("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-lg font-medium">Loading Product...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto py-12">
        <div className="rounded-lg border border-destructive p-8 text-center">
          <p className="text-lg font-medium text-destructive">{error || "Product not found"}</p>
          <p className="text-sm text-muted-foreground mt-2">
            The product you're looking for doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <ProductForm mode="edit" product={product} />
    </div>
  );
}