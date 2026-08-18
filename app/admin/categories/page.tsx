"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  RefreshCcw,
  Search,
  X,
  AlertTriangle,
  Loader2,
  FolderOpen,
  Package,
  FolderTree
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Category } from "@/types/types";
import useAdmin from "@/hooks/admin/useAdmin";
import CategoryDialog from "@/components/admin/CategoryDialog";
import CategoryTree from "@/components/admin/CategoryTree";

export default function AdminCategoriesPage() {
  const {
    fetchCategories,
    deleteCategory,
    categories,
    loading,
    error,
    resetCategories
  } = useAdmin();

  // State variables
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    category: Category;
    parentId?: string;
  } | null>(null);

  // Load categories when component mounts
  useEffect(() => {
    loadCategories();
  }, []);

  // Calculate total subcategories
  const countSubcategories = (cats: Category[]): number => {
    return cats.reduce((count, cat) => {
      if (cat.subCategories && cat.subCategories.length > 0) {
        return count + 1 + countSubcategories(cat.subCategories);
      }
      return count;
    }, 0);
  };

  // Calculate total categories (including subcategories)
  const countAllCategories = (cats: Category[]): number => {
    return cats.reduce((count, cat) => {
      if (cat.subCategories && cat.subCategories.length > 0) {
        return count + 1 + countAllCategories(cat.subCategories);
      }
      return count + 1;
    }, 0);
  };

  const loadCategories = async () => {
    try {
      setRefreshing(true);
      resetCategories();
      await fetchCategories({
        limit: 100,
        orderByField: 'name',
        orderDirection: 'asc'
      });
    } catch (err) {
      console.error("Error loading categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadCategories();
  };

  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setParentCategory(null);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleAddSubcategory = (parent: Category) => {
    setSelectedCategory(null);
    setParentCategory(parent);
    setDialogMode('create');
    setDialogOpen(true);
  };

  const handleEditCategory = (category: Category, parentId?: string) => {
    setSelectedCategory(category);
    // Find parent if parentId is provided
    if (parentId) {
      const parent = categories.find(c => c.id === parentId);
      setParentCategory(parent || null);
    } else {
      setParentCategory(null);
    }
    setDialogMode('edit');
    setDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      setProcessingAction(true);
      await deleteCategory(categoryToDelete.category.id, categoryToDelete.parentId);
      toast.success("Category deleted successfully");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (err: any) {
      console.error("Error deleting category:", err);
      toast.error(err.message || "Failed to delete category");
    } finally {
      setProcessingAction(false);
    }
  };

  const openDeleteDialog = (category: Category, parentId?: string) => {
    setCategoryToDelete({ category, parentId });
    setDeleteDialogOpen(true);
  };

  // Loading state
  if (loading.categories && !refreshing && categories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading uppercase font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Manage product categories for your store.
            </p>
          </div>
          <Button 
            className="self-start sm:self-auto"
            disabled={true}
          >
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>

        <div className="rounded-lg border border-dashed p-8 text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-lg font-medium">Loading Categories</p>
          <p className="text-sm text-muted-foreground">
            Please wait while we fetch the categories...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading uppercase font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage product categories for your ramazah store.
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing || loading.categories}
            variant="outline"
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing || loading.categories ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Categories
            </CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countAllCategories(categories)}</div>
            <p className="text-xs text-muted-foreground">
              Including all subcategories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top Level
            </CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Main categories
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              With Subcategories
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {countSubcategories(categories)}
            </div>
            <p className="text-xs text-muted-foreground">
              Categories with nested items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories by name, slug, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {searchQuery && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSearchQuery("")}
            title="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Error state */}
      {error.categories && (
        <div className="rounded-lg border border-destructive p-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium font-body">Error loading categories</h3>
              <p className="text-sm text-muted-foreground">{error.categories}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing || loading.categories}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading.categories && !error.categories && categories.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FolderTree className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No categories yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Get started by creating your first product category
          </p>
          <Button onClick={handleCreateCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Create Category
          </Button>
        </div>
      )}

      {/* Category Tree */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Category Tree
            </CardTitle>
            <CardDescription>
              Hierarchical view of all categories and subcategories. Click on a category to expand or collapse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryTree
              categories={categories}
              onEdit={handleEditCategory}
              onDelete={openDeleteDialog}
              onAddSubcategory={handleAddSubcategory}
              searchQuery={searchQuery}
            />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Category Dialog */}
      <CategoryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedCategory(null);
            setParentCategory(null);
          }
        }}
        category={selectedCategory}
        parentCategory={parentCategory}
        mode={dialogMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-body">Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.category.name}"? This action cannot be undone.
              {categoryToDelete?.category.subCategories && categoryToDelete.category.subCategories.length > 0 && (
                <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded text-sm">
                  ⚠️ This category has {categoryToDelete.category.subCategories.length} subcategories that will also be deleted.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700"
              disabled={processingAction}
            >
              {processingAction ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Category'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}