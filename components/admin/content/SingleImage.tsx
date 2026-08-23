"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeError } from "@/lib/admin/errors";

/**
 * One photograph, with the words that describe it.
 *
 * `ImageUpload` handles a product's gallery — many images, ordering, a cover.
 * A page section has exactly one, so reusing that component would mean carrying
 * a `ProductImage[]` and a cover flag for something that has neither.
 *
 * Alt text sits beside the picture rather than in a separate panel, because it
 * is the one field people skip when it is somewhere else — and on a page like
 * the home hero it is the only description a screen reader gets.
 */
const MAX_BYTES = 10 * 1024 * 1024;

export default function SingleImage({
  url,
  alt,
  onChange,
  hint,
}: {
  url: string;
  alt: string;
  onChange: (next: { url: string; alt: string }) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("That is not an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`${file.name} is over 10MB. Shrink it and try again.`);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("files", file);

      const response = await fetch("/api/upload-images", { method: "POST", body: form });
      if (!response.ok) throw new Error("The upload did not go through.");

      const result = await response.json();
      const image = result.images?.[0];
      if (!image?.secureUrl) throw new Error("The upload came back empty.");

      onChange({ url: image.secureUrl, alt });
      toast.success("Uploaded.");
    } catch (error) {
      toast.error(describeError(error, "Could not upload that image."));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-sm border border-rule bg-wash">
          {url ? (
            <>
              <Image src={url} alt="" fill sizes="160px" className="object-cover" />
              <button
                type="button"
                onClick={() => onChange({ url: "", alt })}
                aria-label="Remove this image"
                className="absolute right-1.5 top-1.5 rounded-sm bg-card/90 p-1 text-ink-muted transition-colors hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center">
              <ImagePlus className="h-5 w-5 text-ink-faint" />
              <span className="font-body text-[11px] leading-tight text-ink-muted">
                Using the placeholder
              </span>
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
            ) : (
              <><ImagePlus className="mr-2 h-4 w-4" />{url ? "Replace" : "Upload"}</>
            )}
          </Button>
          {hint && <p className="font-body text-xs leading-relaxed text-ink-muted">{hint}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="font-body text-xs text-ink-muted">
          What is in the picture
        </Label>
        <Input
          value={alt}
          onChange={(event) => onChange({ url, alt: event.target.value })}
          placeholder="Folded chiffon veils in muted colours"
        />
        <p className="font-body text-xs text-ink-faint">
          Read aloud to anyone using a screen reader, and shown if the image fails to load.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload(file);
        }}
      />
    </div>
  );
}
