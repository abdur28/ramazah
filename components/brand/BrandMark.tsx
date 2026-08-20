import Link from "next/link";

/**
 * Ramazah lockup — store icon plus wordmark.
 *
 * Both are the supplied artwork (white on transparent) recoloured with CSS masks:
 * the PNG's alpha channel becomes the stencil and background-color fills it. That
 * keeps the artwork pixel-exact while still taking any brand colour.
 *
 * The wordmark is an image because its typeface is a thin geometric sans that is
 * not available as a webfont — an approximation would not match. Visually hidden
 * text keeps the brand name available to search engines and screen readers.
 */

const maskOf = (src: string) =>
  ({
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  }) as const;

const ICON = maskOf("/ramazah-store-icon.png");
const WORDMARK = { ...maskOf("/ramazah-store-name.png"), aspectRatio: "340 / 83" } as const;

type Props = {
  /** "inverse" for placement over the dark hero or footer */
  variant?: "default" | "inverse";
  /** icon only, for tight spaces */
  iconOnly?: boolean;
  className?: string;
  href?: string | null;
};

export default function BrandMark({
  variant = "default",
  iconOnly = false,
  className = "",
  href = "/",
}: Props) {
  const inverse = variant === "inverse";

  const lockup = (
    <span className={`flex items-center  ${className}`}>
      <span
        aria-hidden="true"
        style={ICON}
        className={`block h-10 w-10 md:h-14 md:w-14 shrink-0 ${
          inverse ? "bg-background" : "bg-sage-deep"
        }`}
      />

      {!iconOnly && (
        <span
          aria-hidden="true"
          style={WORDMARK}
          className={`block h-6 md:h-10 mt-4 shrink-0 ${
            inverse ? "bg-background" : "bg-foreground"
          }`}
        />
      )}

      <span className="sr-only">Ramazah Store</span>
    </span>
  );

  if (!href) return lockup;

  return (
    <Link href={href} aria-label="Ramazah Store — home" className="flex items-center">
      {lockup}
    </Link>
  );
}
