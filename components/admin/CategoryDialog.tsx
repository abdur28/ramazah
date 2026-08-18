"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import useAdmin from "@/hooks/admin/useAdmin";
import { Badge } from "@/components/ui/badge";
import { Category } from "@/types/types";
import ImageUpload from "@/components/admin/ImageUpload";
import { ProductImage } from "@/types/admin";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  parentCategory?: Category | null;
  mode: 'create' | 'edit';
}

export default function CategoryDialog({ 
  open, 
  onOpenChange, 
  category,
  parentCategory,
  mode 
}: CategoryDialogProps) {
  const { createCategory, updateCategory, loading } = useAdmin();
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    subtitle: ''
  });
  const [bannerImages, setBannerImages] = useState<ProductImage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    slug: ''
  });

  // Load category data when editing
  useEffect(() => {
    if (open && mode === 'edit' && category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        subtitle: category.subtitle || ''
      });
      
      // Load existing banner image if present
      if (category.bannerImage) {
        setBannerImages([{
          id: 'banner-1',
          publicId: category.bannerImage.publicId,
          url: category.bannerImage.url,
          secureUrl: category.bannerImage.secureUrl,
          altText: category.bannerImage.altText || '',
          order: 0,
          isPrimary: true
        }]);
      } else {
        setBannerImages([]);
      }
    } else if (open && mode === 'create') {
      setFormData({
        name: '',
        slug: '',
        description: '',
        subtitle: ''
      });
      setBannerImages([]);
    }
    setErrors({ name: '', slug: '' });
  }, [open, mode, category]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const validateForm = (): boolean => {
    const newErrors = { name: '', slug: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
      isValid = false;
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Calculate the full path that will be created
  const getFullPath = (): string => {
    if (parentCategory) {
      return `${parentCategory.path}/${formData.slug}`;
    }
    return formData.slug;
  };

  // Convert path to display format
  const getDisplayPath = (path: string): string => {
    return path
      .split('/')
      .map(segment => 
        segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      )
      .join(' > ');
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Prepare category data
      const categoryData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        subtitle: formData.subtitle,
        ...(bannerImages.length > 0 ? {
          bannerImage: {
            id: bannerImages[0].id,
            publicId: bannerImages[0].publicId,
            url: bannerImages[0].url,
            secureUrl: bannerImages[0].secureUrl,
            altText: bannerImages[0].altText || formData.name
          }
        } : {} )
      };
      
      if (mode === 'create') {
        await createCategory(categoryData, parentCategory?.id);
        toast.success(
          parentCategory 
            ? `Subcategory added to "${parentCategory.name}"` 
            : "Category created successfully"
        );
      } else if (mode === 'edit' && category) {
        await updateCategory(category.id, categoryData, parentCategory?.id);
        toast.success("Category updated successfully");
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-body">
            {mode === 'create' 
              ? (parentCategory ? 'Add Subcategory' : 'Create New Category')
              : 'Edit Category'
            }
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? (parentCategory 
                  ? `Add a subcategory under "${parentCategory.name}".`
                  : 'Add a new category to organize your products.'
                )
              : 'Update the category information below.'
            }
          </DialogDescription>
        </DialogHeader>

        {parentCategory && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Parent Category</p>
              <p className="text-xs text-muted-foreground">{getDisplayPath(parentCategory.path)}</p>
            </div>
            <Badge variant="secondary">Subcategory</Badge>
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Hoodies, T-Shirts, Accessories"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Subtitle Field */}
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle (Optional)</Label>
            <Input
              id="subtitle"
              placeholder="e.g., Premium streetwear essentials"
              value={formData.subtitle}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                subtitle: e.target.value 
              }))}
            />
            <p className="text-xs text-muted-foreground">
              A short tagline or subtitle for this category
            </p>
          </div>

          {/* Slug Field */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-red-500">*</span>
            </Label>
            <Input
              id="slug"
              placeholder="e.g., hoodies, t-shirts"
              value={formData.slug}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, slug: e.target.value }));
                if (errors.slug) {
                  setErrors(prev => ({ ...prev, slug: '' }));
                }
              }}
              className={errors.slug ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly version of the name. Auto-generated from name.
            </p>
            {errors.slug && (
              <p className="text-sm text-red-500">{errors.slug}</p>
            )}
            
            {/* Show full path preview */}
            {formData.slug && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <span className="font-medium">Full Path: </span>
                <code className="text-primary">{getFullPath()}</code>
                <br />
                <span className="font-medium">Display: </span>
                <span className="text-muted-foreground">{getDisplayPath(getFullPath())}</span>
                <br />
                <span className="font-medium">URL: </span>
                <code className="text-primary">/categories/{getFullPath()}</code>
              </div>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this category..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              rows={3}
            />
          </div>

          {/* Banner Image Upload */}
          <div className="space-y-2">
            <Label>Banner Image (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload a banner image for this category (displayed on category pages)
            </p>
            <ImageUpload
              images={bannerImages}
              onChange={setBannerImages}
              maxImages={1}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || loading.adminAction}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' 
              ? (parentCategory ? 'Add Subcategory' : 'Create Category')
              : 'Save Changes'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}