"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Collection, BannerImage } from "@/types/admin";
import useAdmin from "@/hooks/admin/useAdmin";

interface CollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: Collection | null;
  mode: 'create' | 'edit';
}

export default function CollectionDialog({ 
  open, 
  onOpenChange, 
  collection,
  mode 
}: CollectionDialogProps) {
  const { createCollection, updateCollection, uploadBannerImage, loading } = useAdmin();
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  });
  const [bannerImage, setBannerImage] = useState<BannerImage | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({ name: '', slug: '' });

  useEffect(() => {
    if (open && mode === 'edit' && collection) {
      setFormData({
        name: collection.name,
        slug: collection.slug,
        description: collection.description || ''
      });
      setBannerImage(collection.bannerImage);
    } else if (open && mode === 'create') {
      setFormData({ name: '', slug: '', description: '' });
      setBannerImage(undefined);
    }
    setErrors({ name: '', slug: '' });
  }, [open, mode, collection]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
    }));
    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const image = await uploadBannerImage(file);
      setBannerImage(image);
      toast.success("Banner uploaded");
    } catch (error) {
      toast.error("Failed to upload banner");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setErrors(prev => ({ ...prev, name: 'Collection name is required' }));
      return;
    }
    if (!formData.slug.trim()) {
      setErrors(prev => ({ ...prev, slug: 'Slug is required' }));
      return;
    }

    setIsSaving(true);
    try {
      const data = { ...formData, bannerImage };
      
      if (mode === 'create') {
        await createCollection(data);
        toast.success("Collection created");
      } else if (collection) {
        await updateCollection(collection.id, data);
        toast.success("Collection updated");
      }
      
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save collection");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-body">{mode === 'create' ? 'Create Collection' : 'Edit Collection'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new collection' : 'Update collection information'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className={errors.slug ? 'border-red-500' : ''}
            />
            {errors.slug && <p className="text-sm text-red-500">{errors.slug}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Banner Image</Label>
            {bannerImage ? (
              <div className="relative aspect-[21/9] rounded border overflow-hidden">
                <Image src={bannerImage.secureUrl} alt="" fill className="object-cover" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => setBannerImage(undefined)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploading}
                  className="hidden"
                  id="banner-upload"
                />
                <Label htmlFor="banner-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  {uploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                  <span className="text-sm">{uploading ? 'Uploading...' : 'Upload Banner'}</span>
                </Label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}