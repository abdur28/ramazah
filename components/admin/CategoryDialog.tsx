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
import { Switch } from "@/components/ui/switch";
import useScrollLock from "@/hooks/useScrollLock";
import { childPathOf, depthOf, MAX_CATEGORY_DEPTH, SUGGESTED_CATEGORY_DEPTH } from "@/lib/categories";
import { Badge } from "@/components/ui/badge";
import { Category } from "@/types/types";
import ImageUpload from "@/components/admin/ImageUpload";
import { ProductImage } from "@/types/admin";
import { describeError } from "@/lib/admin/errors";

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  parentCategory?: Category | null;
  /** Slugs from the root down to the parent, for the URL preview. */
  parentSlugTrail?: string[];
  mode: 'create' | 'edit';
}

export default function CategoryDialog({ 
  open, 
  onOpenChange, 
  category,
  parentCategory,
  parentSlugTrail = [],
  mode 
}: CategoryDialogProps) {
  const { createCategory, updateCategory, loading } = useAdmin();

  // Lenis drives the window directly and ignores both `overflow: hidden` and
  // Radix's scroll lock, so every overlay in this app has to stop it explicitly
  // or the page slides away behind the open dialog.
  useScrollLock(open);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    subtitle: '',
    navLabel: '',
    showInNav: true,
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
        subtitle: category.subtitle || '',
        navLabel: category.navLabel || '',
        showInNav: category.showInNav ?? true,
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
        subtitle: '',
        navLabel: '',
        showInNav: true,
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

  /**
   * What the database will actually store.
   *
   * The preview used to read `${parent.path}/${slug}` — the wrong separator and
   * the slug rather than the name — so adding "Tea" under Food & Pantry showed
   * `Food & Pantry/tea` while the trigger wrote `Food & Pantry > Tea`. The URL
   * line was wrong the same way: the storefront routes on slugs, not on the
   * stored path, so the real address is /categories/food-pantry/tea.
   */
  const getFullPath = (): string => childPathOf(parentCategory, formData.name || formData.slug);

  /**
   * The real address. The storefront routes on the slug trail, so the URL is the
   * whole chain of slugs — not the stored display path the preview used to show.
   */
  const getUrl = (): string =>
    `/categories/${[...parentSlugTrail, formData.slug || '…'].join('/')}`;

  const newDepth = parentCategory ? depthOf(parentCategory) + 1 : 1;

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
        navLabel: formData.navLabel,
        showInNav: formData.showInNav,
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
      toast.error(describeError(error, "Could not save the category."));
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
          <div className="flex items-center gap-2 rounded-sm bg-wash/60 p-3">
            <FolderTree className="h-4 w-4 text-ink-muted" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Goes inside {parentCategory.name}
                <span className="ml-2 font-normal text-ink-muted">level {newDepth}</span>
              </p>
              <p className="text-xs text-ink-muted">{parentCategory.path}</p>
            </div>
            <Badge variant="secondary">Subcategory</Badge>
          </div>
        )}

        <div className="space-y-4 py-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Category Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Hoodies, T-Shirts, Accessories"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
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
              Slug <span className="text-destructive">*</span>
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
              className={errors.slug ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly version of the name. Auto-generated from name.
            </p>
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug}</p>
            )}
            
            {/* Show full path preview */}
        {/*
          The menu is built from the catalogue now, so the two decisions it needs
          that a category name cannot supply live here. `nav_label` exists because
          "Beauty & Personal Care" is a good category name and a long menu item —
          but it is left blank by default: the bar measures itself and overflows
          into "More" rather than the software abbreviating a shop's own names.
        */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="navLabel" className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              Menu label
            </Label>
            <Input
              id="navLabel"
              value={formData.navLabel}
              onChange={(e) => setFormData({ ...formData, navLabel: e.target.value })}
              placeholder={formData.name || 'Uses the name above'}
            />
            <p className="font-body text-[11px] text-ink-muted">
              Optional. Blank uses &ldquo;{formData.name || 'the name above'}&rdquo;.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              Show in the menu
            </Label>
            <div className="flex items-start justify-between gap-3 rounded-sm border border-rule px-3 py-2.5">
              <span className="font-body text-sm text-ink-muted">
                {formData.showInNav ? 'Listed in the shop menu' : 'Browsable, but not advertised'}
              </span>
              <Switch
                checked={formData.showInNav}
                onCheckedChange={(checked) => setFormData({ ...formData, showInNav: checked })}
                className="mt-0.5 shrink-0"
              />
            </div>
          </div>
        </div>

            {formData.slug && (
              <div className="mt-2 p-2 bg-muted rounded text-xs">
                <span className="font-medium">Full Path: </span>
                <code className="text-sage-deep">{getFullPath()}</code>
                <br />
                <span className="font-medium">URL: </span>
                <code className="text-sage-deep">{getUrl()}</code>
              </div>
            )}

            {newDepth > SUGGESTED_CATEGORY_DEPTH && (
              <div className="mt-3 rounded-sm bg-terra/[0.06] p-3 font-body text-sm text-terra-ink">
                This would be <strong>level {newDepth}</strong>. Most shops stop around{" "}
                {SUGGESTED_CATEGORY_DEPTH} — each level roughly halves the shoppers who reach
                the bottom, and a shelf this deep is often better as a tag or a filter.{" "}
                {newDepth >= MAX_CATEGORY_DEPTH
                  ? `${MAX_CATEGORY_DEPTH} is the limit.`
                  : "Nothing stops you."}
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