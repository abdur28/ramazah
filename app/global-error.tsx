"use client";

/**
 * When the root layout itself throws.
 *
 * This replaces the whole document, so it has to bring its own `<html>` and
 * `<body>` — and it cannot rely on anything the layout provides. No fonts, no
 * theme tokens, no Tailwind guarantee, because the failure may be *in* the
 * thing that loads them. Every value here is inline and literal for that
 * reason; it is the one file in the project where hardcoding the palette is
 * correct rather than lazy.
 *
 * It should almost never be seen. `app/error.tsx` catches anything inside a
 * page; this only fires when the shell around them is what broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#FAF9F5", color: "#2A2E24" }}>
        <div
          style={{
            maxWidth: "34rem",
            margin: "0 auto",
            padding: "18vh 1.5rem 4rem",
            fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6B7060",
            }}
          >
            Ramazah Store
          </p>

          <h1
            style={{
              margin: "1rem 0 0",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 40,
              fontWeight: 300,
              lineHeight: 1.15,
            }}
          >
            The shop is having a moment.
          </h1>

          <p style={{ margin: "1rem 0 0", fontSize: 14, lineHeight: 1.7, color: "#6B7060" }}>
            Something failed before the page could be built. Reloading usually
            clears it. If it does not, it is our end and we are already the ones
            who need to fix it.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              padding: "0.8rem 1.6rem",
              background: "#5C6647",
              color: "#FAF9F5",
              border: 0,
              borderRadius: 4,
              font: "inherit",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Reload
          </button>

          {error.digest && (
            <p style={{ margin: "1.5rem 0 0", fontSize: 12, color: "#6B7060" }}>
              Reference <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
