import { Star } from "lucide-react";

/**
 * A rating, drawn. Half stars are done with a clipped overlay rather than a
 * half-star glyph, so 4.3 reads as 4.3 and not as "about four".
 *
 * The number is always rendered alongside in the places that use this, because
 * a row of shapes is not readable to a screen reader and colour alone never
 * carries meaning here.
 */
export default function Stars({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const dimension = size === "md" ? "h-4.5 w-4.5" : "h-3.5 w-3.5";
  const filled = Math.max(0, Math.min(5, rating));

  return (
    <span className="relative inline-flex" aria-hidden>
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star key={index} className={`${dimension} text-rule`} fill="currentColor" />
        ))}
      </span>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${(filled / 5) * 100}%` }}
      >
        <span className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className={`${dimension} shrink-0 text-terra`} fill="currentColor" />
          ))}
        </span>
      </span>
    </span>
  );
}
