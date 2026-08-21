#!/usr/bin/env node
/**
 * Contrast sweep over the admin.
 *
 * The design system's migration notes name this as the check to re-run after
 * any colour change, because the rebrand's own find-and-replace produced white
 * text on white buttons and ink labels on sage. It reads every class string in
 * the admin, resolves the design tokens (compositing `bg-terra/10` over the page
 * ground), and reports any element that sets both a background and a text colour
 * below 4.5:1.
 *
 *   node scripts/check-admin-contrast.mjs
 *
 * Exits non-zero on a failure, so it can gate a commit.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const TOKENS = {
  ground: "#FAF9F5", background: "#FAF9F5", card: "#FFFFFF", surface: "#FFFFFF",
  wash: "#EFF1E9", rule: "#E4E3D8", muted: "#EFF1E9",
  ink: "#2A2E24", foreground: "#2A2E24", "card-foreground": "#2A2E24",
  "ink-muted": "#6B7060", "muted-foreground": "#6B7060", "ink-faint": "#9AA08D",
  sage: "#8A9276", "sage-deep": "#5C6647", primary: "#5C6647", "sage-light": "#A3AB8C",
  terra: "#B4633E", "terra-text": "#AB5E3A", "terra-deep": "#AB5E3A", "terra-ink": "#9C5433",
  destructive: "#9B3B2E", success: "#5C6647", warning: "#AB5E3A",
  "primary-foreground": "#FAF9F5",
};

const PAGE = "#FAF9F5";
const ROOTS = ["app/admin", "components/admin"];
const EXTRA = ["components/layout/AdminLayout.tsx"];

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
const blend = (fg, bg, alpha) => {
  const f = fg.replace("#", ""), b = bg.replace("#", "");
  return (
    "#" +
    [0, 2, 4]
      .map((i) => {
        const value = Math.round(
          alpha * parseInt(f.slice(i, i + 2), 16) + (1 - alpha) * parseInt(b.slice(i, i + 2), 16)
        );
        return value.toString(16).padStart(2, "0");
      })
      .join("")
  );
};

/** `terra/10` and `terra/[0.06]` both mean a tint over the page. */
function resolve(token, kind) {
  const match = /^([a-z][a-z0-9-]*)(?:\/(\[?[0-9.]+\]?))?$/.exec(token);
  if (!match) return null;
  const [, name, alphaRaw] = match;
  if (!(name in TOKENS)) return null;
  if (!alphaRaw) return TOKENS[name];
  // A translucent *text* colour depends on whatever sits behind it; skip rather
  // than guess.
  if (kind === "text") return null;
  const raw = Number(alphaRaw.replace(/[[\]]/g, ""));
  return blend(TOKENS[name], PAGE, raw > 1 ? raw / 100 : raw);
}

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (path.endsWith(".tsx")) yield path;
  }
}

const CLASS = /(?:^|\s)(?:(hover|focus|group-hover|active|disabled):)?(bg|text)-([a-z][a-z0-9-]*(?:\/\[?[0-9.]+\]?)?)/g;
const failures = [];

for (const path of [...ROOTS.flatMap((root) => [...files(root)]), ...EXTRA]) {
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, index) => {
      for (const [, chunk] of line.matchAll(/"([^"]*)"/g)) {
        const found = [...chunk.matchAll(CLASS)].map(([, variant, kind, token]) => ({
          variant: variant ?? "",
          kind,
          token,
        }));

        for (const bg of found.filter((f) => f.kind === "bg")) {
          for (const fg of found.filter((f) => f.kind === "text")) {
            // Only compare states that are actually on screen together.
            if (bg.variant !== fg.variant) continue;
            const bgHex = resolve(bg.token, "bg");
            const fgHex = resolve(fg.token, "text");
            if (!bgHex || !fgHex) continue;

            const contrast = ratio(fgHex, bgHex);
            if (contrast < 4.5) {
              failures.push({
                where: `${path}:${index + 1}`,
                pair: `text-${fg.token} on bg-${bg.token}`,
                contrast: contrast.toFixed(2),
              });
            }
          }
        }
      }
    });
}

if (failures.length === 0) {
  console.log("Admin contrast: every bg/text pairing reaches 4.5:1.");
  process.exit(0);
}

console.error(`Admin contrast: ${failures.length} pairing(s) below 4.5:1\n`);
for (const failure of failures) {
  console.error(`  ${failure.where}\n    ${failure.pair} — ${failure.contrast}:1\n`);
}
process.exit(1);
