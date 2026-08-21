"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/admin/ui/EmptyState";
import ProductForm from "@/components/admin/ProductForm";
import useAdmin from "@/hooks/admin/useAdmin";
import type { Product } from "@/types/admin";

/**
 * Edit one product.
 *
 * The wrapper only fetches; everything else is `ProductForm`. It used to add a
 * `container mx-auto py-6 max-w-7xl` of its own on top of the admin layout's
 * padding, which put the form on a different gutter from every other admin page.
 */
export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as string;
  const { getProductById } = useAdmin();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const found = await getProductById(productId);
      if (!found) {
        setError("This product does not exist, or it has been deleted.");
        return;
      }
      setProduct(found);
    } catch (err) {
      console.error("Error loading product:", err);
      setError("Could not load this product.");
    } finally {
      setIsLoading(false);
    }
  }, [productId, getProductById]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-24 font-body text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the product…
      </div>
    );
  }

  if (error || !product) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Product not found"
        description={error ?? undefined}
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/products">Back to the catalogue</Link>
          </Button>
        }
      />
    );
  }

  return <ProductForm mode="edit" product={product} />;
}
