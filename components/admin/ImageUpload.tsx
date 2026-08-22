"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ImageIcon, Loader2, Star, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/types/admin";
import { describeError } from "@/lib/admin/errors";

/**
 * Product photographs.
 *
 * The important fix here is not visual. **None of the buttons set `type`**, so
 * every one of them defaulted to `type="submit"` — and this component lives
 * inside the product form. Removing an image, reordering one, or setting a
 * cover submitted the whole product.
 *
 * Two more: removing any image forced `isPrimary` back onto the first one, so
 * deleting a photo silently discarded a chosen cover; and the render called
 * `images.sort()`, which sorts in place and so mutated the array held in the
 * parent's state.
 *
 * Errors used to be `alert()`. They are toasts now, and they say which files
 * failed rather than reporting "Failed to upload images" for a batch.
 */
const MAX_BYTES = 10 * 1024 * 1024;

export default function ImageUpload({
  images,
  onChange,
  maxImages = 10,
}: {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  maxImages?: number;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Never sorted in place: `Array.prototype.sort` mutates, and this array is
  // the parent's state.
  const ordered = [...images].sort((a, b) => a.order - b.order);

  const upload = useCallback(
    async (files: File[]) => {
      const pictures = files.filter((file) => file.type.startsWith("image/"));
      if (pictures.length === 0) return;

      const room = maxImages - images.length;
      if (room <= 0) {
        toast.error(`That is the limit — ${maxImages} photographs.`);
        return;
      }

      const tooBig = pictures.filter((file) => file.size > MAX_BYTES);
      if (tooBig.length > 0) {
        toast.error(
          `${tooBig.map((file) => file.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over 10MB.`
        );
      }

      const accepted = pictures.filter((file) => file.size <= MAX_BYTES).slice(0, room);
      if (accepted.length === 0) return;
      if (accepted.length < pictures.length - tooBig.length) {
        toast.message(`Only ${room} more will fit, so the rest were left out.`);
      }

      setIsUploading(true);
      try {
        const body = new FormData();
        accepted.forEach((file) => body.append("files", file));

        const response = await fetch("/api/upload-images", { method: "POST", body });
        if (!response.ok) throw new Error(await response.text());

        const result = await response.json();
        const added: ProductImage[] = (result.images ?? []).map((image: any, index: number) => ({
          id: `${Date.now()}_${index}`,
          publicId: image.publicId,
          url: image.url,
          secureUrl: image.secureUrl,
          altText: "",
          order: images.length + index,
          // Only the very first photograph a product ever gets is the cover;
          // later uploads never steal it.
          isPrimary: images.length === 0 && index === 0,
        }));

        onChange([...images, ...added]);
        toast.success(`${added.length} photograph${added.length === 1 ? "" : "s"} added.`);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(describeError(error, "Could not upload those. Try again."));
      } finally {
        setIsUploading(false);
      }
    },
    [images, maxImages, onChange]
  );

  /** Reindex after any change so `order` stays 0..n-1 with no gaps. */
  const commit = (next: ProductImage[]) =>
    onChange(next.map((image, index) => ({ ...image, order: index })));

  const remove = (id: string) => {
    const next = ordered.filter((image) => image.id !== id);
    // If the cover was the one removed, the next photograph takes over — but a
    // cover that is still here keeps the job.
    if (next.length > 0 && !next.some((image) => image.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    commit(next);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ordered.length) return;
    const next = [...ordered];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const setCover = (id: string) =>
    commit(ordered.map((image) => ({ ...image, isPrimary: image.id === id })));

  const setAlt = (id: string, altText: string) =>
    onChange(images.map((image) => (image.id === id ? { ...image, altText } : image)));

  const full = images.length >= maxImages;

  return (
    <div className="space-y-4">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          upload(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "rounded-sm border border-dashed px-6 py-8 text-center transition-colors",
          isDragging ? "border-sage-deep bg-wash/60" : "border-rule",
          full && "opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(event) => {
            upload(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
          disabled={isUploading || full}
          className="sr-only"
        />

        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-wash">
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-sage-deep" />
          ) : (
            <Upload className="h-5 w-5 text-sage" />
          )}
        </span>

        <p className="font-body text-sm text-foreground">
          {isUploading ? "Uploading…" : full ? "That is the limit" : "Drop photographs here"}
        </p>
        <p className="mt-1 font-body text-xs text-ink-muted">
          {images.length} of {maxImages} · JPG, PNG or WEBP up to 10MB
        </p>

        {/* A real button, typed, because this sits inside the product form. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || full}
        >
          Choose files
        </Button>
      </div>

      {ordered.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ordered.map((image, index) => (
            <li
              key={image.id}
              className={cn(
                "overflow-hidden rounded-sm border bg-card",
                image.isPrimary ? "border-sage-deep" : "border-rule"
              )}
            >
              <div className="relative aspect-square bg-wash">
                {image.secureUrl ? (
                  <Image
                    src={image.secureUrl}
                    alt={image.altText || ""}
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-ink-faint" />
                  </span>
                )}

                {image.isPrimary && (
                  <span className="absolute left-2 top-2 rounded-sm bg-sage-deep px-1.5 py-0.5 font-body text-[10px] uppercase tracking-[0.1em] text-background">
                    Cover
                  </span>
                )}

                {/* Always visible, not hover-only: on a touchscreen there is no
                    hover, and these were the only way to reorder or delete. */}
                <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1">
                  <span className="flex gap-1">
                    <IconButton
                      label={`Move ${index + 1} earlier`}
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </IconButton>
                    <IconButton
                      label={`Move ${index + 1} later`}
                      onClick={() => move(index, index + 1)}
                      disabled={index === ordered.length - 1}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </IconButton>
                  </span>

                  <span className="flex gap-1">
                    {!image.isPrimary && (
                      <IconButton label="Make this the cover" onClick={() => setCover(image.id)}>
                        <Star className="h-3.5 w-3.5" />
                      </IconButton>
                    )}
                    <IconButton
                      label="Remove this photograph"
                      onClick={() => remove(image.id)}
                      destructive
                    >
                      <X className="h-3.5 w-3.5" />
                    </IconButton>
                  </span>
                </div>
              </div>

              <div className="p-2">
                <Input
                  value={image.altText}
                  onChange={(event) => setAlt(image.id, event.target.value)}
                  placeholder="Describe it, for screen readers"
                  aria-label={`Description of photograph ${index + 1}`}
                  className="h-8 text-xs"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      // Typed. Every button in the old version defaulted to submit and saved the
      // product instead of doing its own job.
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-sm border border-rule bg-card/95 text-ink-muted shadow-sm transition-colors",
        "hover:bg-card hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
        destructive && "hover:text-destructive"
      )}
    >
      {children}
    </button>
  );
}
