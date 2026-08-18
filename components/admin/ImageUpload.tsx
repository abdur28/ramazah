"use client";

import React, { useState, useCallback } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/types/admin";

interface ImageUploadProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
}

export default function ImageUpload({ images, onChange, maxImages = 10 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (files.length > 0) {
        await uploadImages(files);
      }
    },
    [images]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadImages(files);
    }
    e.target.value = ""; // Reset input
  };

  const uploadImages = async (files: File[]) => {
    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload-images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      
      const newImages: ProductImage[] = result.images.map((img: any, index: number) => ({
        id: `${Date.now()}_${index}`,
        publicId: img.publicId,
        url: img.url,
        secureUrl: img.secureUrl,
        altText: "",
        order: images.length + index,
        isPrimary: images.length === 0 && index === 0,
      }));

      onChange([...images, ...newImages]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (imageId: string) => {
    const updatedImages = images
      .filter((img) => img.id !== imageId)
      .map((img, index) => ({
        ...img,
        order: index,
        isPrimary: index === 0,
      }));
    onChange(updatedImages);
  };

  const setPrimaryImage = (imageId: string) => {
    const updatedImages = images.map((img) => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    onChange(updatedImages);
  };

  const updateAltText = (imageId: string, altText: string) => {
    const updatedImages = images.map((img) =>
      img.id === imageId ? { ...img, altText } : img
    );
    onChange(updatedImages);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...images];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      order: index,
    }));
    
    onChange(reorderedImages);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <Input
          id="image-upload"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading || images.length >= maxImages}
          className="hidden"
        />
        
        <Label
          htmlFor="image-upload"
          className="flex flex-col items-center gap-2 cursor-pointer"
        >
          {uploading ? (
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-10 w-10 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {uploading ? "Uploading..." : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP up to 10MB ({images.length}/{maxImages} images)
            </p>
          </div>
        </Label>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images
            .sort((a, b) => a.order - b.order)
            .map((image, index) => (
              <div
                key={image.id}
                className="relative group border rounded-lg overflow-hidden"
              >
                {/* Image */}
                <div className="aspect-square relative bg-muted">
                  <Image
                    src={image.secureUrl}
                    alt={image.altText || "Product image"}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Primary Badge */}
                  {image.isPrimary && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Primary
                    </div>
                  )}
                  
                  {/* Remove Button */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(image.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  {/* Order Buttons */}
                  <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveImage(index, index - 1)}
                      >
                        ←
                      </Button>
                    )}
                    {index < images.length - 1 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveImage(index, index + 1)}
                      >
                        →
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Alt Text Input */}
                <div className="p-2 space-y-2">
                  <Input
                    placeholder="Alt text (SEO)"
                    value={image.altText}
                    onChange={(e) => updateAltText(image.id, e.target.value)}
                    className="text-xs"
                  />
                  {!image.isPrimary && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setPrimaryImage(image.id)}
                    >
                      Set as Primary
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}