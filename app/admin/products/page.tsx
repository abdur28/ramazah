"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  RefreshCcw,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  Package,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Product } from "@/types/admin";
import { CurrencyCode } from "@/types/types";
import useAdmin from "@/hooks/admin/useAdmin";
import { availableCurrencies } from "@/constants";

export default function AdminProductsPage() {
  const {
    fetchProducts,
    fetchCategories,
    deleteProduct,
    products,
    categories,
    loading,
    error,
    pagination,
    resetProducts
  } = useAdmin();

  // Get default currency
  const defaultCurrency = availableCurrencies.find(c => c.isDefault) || availableCurrencies[0];

  // State variables
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(defaultCurrency.code);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [processingAction, setProcessingAction] = useState(false);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Load products and categories when component mounts
  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Filter products based on search, category, and stock
  useEffect(() => {
    if (!products) return;

    let filtered = [...products];

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.categoryPath === categoryFilter);
    }

    // Apply stock filter
    if (stockFilter !== "all") {
      if (stockFilter === "inStock") {
        filtered = filtered.filter(p => p.inStock);
      } else if (stockFilter === "outOfStock") {
        filtered = filtered.filter(p => !p.inStock);
      } else if (stockFilter === "lowStock") {
        filtered = filtered.filter(p => p.inStock && p.totalStock < (p.lowStockAlert || 10));
      }
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.description && product.description.toLowerCase().includes(query))
      );
    }

    setFilteredProducts(filtered);
  }, [products, categoryFilter, stockFilter, searchQuery]);

  const loadProducts = async () => {
    try {
      setRefreshing(true);
      resetProducts();
      await fetchProducts({
        limit: 50,
        orderByField: 'createdAt',
        orderDirection: 'desc'
      });
    } catch (err) {
      console.error("Error loading products:", err);
      toast.error("Failed to load products");
    } finally {
      setRefreshing(false);
    }
  };

  const loadCategories = async () => {
    try {
      await fetchCategories({
        limit: 100,
        orderByField: 'name',
        orderDirection: 'asc'
      });
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const handleRefresh = () => {
    loadProducts();
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      setProcessingAction(true);
      await deleteProduct(productToDelete.id);
      toast.success("Product deleted successfully");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (err: any) {
      console.error("Error deleting product:", err);
      toast.error(err.message || "Failed to delete product");
    } finally {
      setProcessingAction(false);
    }
  };

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  // Get price for a specific currency from product
  const getProductPrice = (product: Product, currencyCode: CurrencyCode, field: 'price' | 'compareAtPrice'): number => {
    const priceObj = product.prices?.find(p => p.currency === currencyCode);
    return priceObj?.[field] || 0;
  };

  // Format price with currency
  const formatPrice = (amount: number, currencyCode: CurrencyCode) => {
    const currency = availableCurrencies.find(c => c.code === currencyCode);
    if (!currency) return `${amount.toFixed(2)}`;
    
    return `${currency.symbol}${amount.toFixed(2)}`;
  };

  const getStockBadge = (product: Product) => {
    if (!product.inStock) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (product.totalStock < (product.lowStockAlert || 10)) {
      return <Badge className="bg-warning/10 text-warning">Low Stock</Badge>;
    }
    return <Badge className="bg-success/10 text-success">In Stock</Badge>;
  };

  // Get unique category paths from products
  const uniqueCategories = Array.from(new Set(products.map(p => p.categoryPath))).filter(Boolean);

  // Get currency symbol for display
  const getCurrentCurrencySymbol = () => {
    return availableCurrencies.find(c => c.code === selectedCurrency)?.symbol || '$';
  };

  // Loading state
  if (loading.products && !refreshing && products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading uppercase tracking-tight">Products</h1>
            <p className="text-muted-foreground">
              Manage your product catalog.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-lg font-medium">Loading Products</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading uppercase font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your ramazah product catalog.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing || loading.products}
            variant="outline"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing || loading.products ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => window.location.href = '/admin/products/new'}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">In your catalog</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.inStock).length}
            </div>
            <p className="text-xs text-muted-foreground">Available for sale</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.inStock && p.totalStock < (p.lowStockAlert || 10)).length}
            </div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          {/* Currency Selector */}
          <Select value={selectedCurrency} onValueChange={(value) => setSelectedCurrency(value as CurrencyCode)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map(currency => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.symbol} {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="inStock">In Stock</SelectItem>
              <SelectItem value="outOfStock">Out of Stock</SelectItem>
              <SelectItem value="lowStock">Low Stock</SelectItem>
            </SelectContent>
          </Select>

          {(categoryFilter !== "all" || stockFilter !== "all" || searchQuery) && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setCategoryFilter("all");
                setStockFilter("all");
                setSearchQuery("");
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Error state */}
      {error.products && (
        <div className="rounded-lg border border-destructive p-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium font-body">Error loading products</h3>
              <p className="text-sm text-muted-foreground">{error.products}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing || loading.products}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading.products && !error.products && filteredProducts.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== "all" || stockFilter !== "all"
              ? "Try changing your filters"
              : "Get started by adding your first product"}
          </p>
          <Button onClick={() => window.location.href = '/admin/products/new'}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      )}

      {/* Products table */}
      {filteredProducts.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price ({getCurrentCurrencySymbol()})</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const price = getProductPrice(product, selectedCurrency, 'price');
                const compareAtPrice = getProductPrice(product, selectedCurrency, 'compareAtPrice');
                const priceObj = product.prices?.find(p => p.currency === selectedCurrency);
                const discountPercent = priceObj?.discountPercent || 0;

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0].secureUrl}
                          alt={product.name}
                          width={60}
                          height={60}
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="w-[60px] h-[60px] bg-muted rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{product.categoryPath}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="font-medium">
                          {formatPrice(price, selectedCurrency)}
                          {discountPercent > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              -{discountPercent}%
                            </Badge>
                          )}
                        </div>
                        {compareAtPrice > 0 && (
                          <div className="text-xs text-muted-foreground line-through">
                            {formatPrice(compareAtPrice, selectedCurrency)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{product.totalStock} units</div>
                    </TableCell>
                    <TableCell>
                      {getStockBadge(product)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => window.location.href = `/admin/products/${product.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(product)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Load more */}
      {filteredProducts.length > 0 && pagination.products.hasMore && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => fetchProducts({ startAfter: pagination.products.lastDoc })}
            disabled={loading.products}
          >
            {loading.products ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Load More
          </Button>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? This will also delete all associated images. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive hover:bg-destructive"
              disabled={processingAction}
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Product'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}