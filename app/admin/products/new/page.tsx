"use client";

import React from "react";
import ProductForm from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <ProductForm mode="create" />
    </div>
  );
}