# Design System

Visual identity for Ramazah, derived from the sage logo. Replaces the greyscale
streetwear look inherited from hoodskool.

**Direction: follow the logo.** Sage, warm off-white, a light serif with air around it.
Calm and natural — a shop selling coffee, spices, veils and homeware.

## Constraint that shapes everything

The logo's sage `#8A9276` measures **3.09:1** on the off-white ground. That fails WCAG AA
for body text *and* fails as a button background with light labels. It is a beautiful
brand colour and a poor text colour.

So: **sage is a surface colour; deep sage is the interactive colour.** The logo green
carries tints, borders, icons and large display type. Anything clickable or readable
uses `--sage-deep`.

## Palette

All ratios measured against `--ground` (`#FAF9F5`), target WCAG AA.

| Token | Hex | Role | Ratio |
|---|---|---|---|
| `--ground` | `#FAF9F5` | Page background | — |
| `--surface` | `#FFFFFF` | Cards, sheets | — |
| `--wash` | `#EFF1E9` | Sage tint — bands, thumbnails | — |
| `--rule` | `#E4E3D8` | Hairlines, borders | — |
| `--ink` | `#2A2E24` | Body text | 13.16:1 |
| `--ink-muted` | `#6B7060` | Secondary text | 4.85:1 |
| `--ink-faint` | `#9AA08D` | Decorative only — never text | 2.4:1 |
| `--sage` | `#8A9276` | Surfaces, borders, icons, display | 3.09:1 |
| `--sage-deep` | `#5C6647` | Buttons, links, focus rings | 5.78:1 |
| `--sage-light` | `#A3AB8C` | Accent text **on dark surfaces** | 5.78:1 on ink |
| `--terra` | `#B4633E` | Badges, large sale prices | 4.16:1 |
| `--terra-text` | `#AB5E3A` | Small sale text | 4.54:1 |
| `--terra-deep` | `#AB5E3A` | Badge background with a light label | 4.54:1 |
| `--terra-ink` | `#9C5433` | Terracotta text **on a terracotta tint** | 5.34:1 |
| `--danger` | `#9B3B2E` | Errors | 6.52:1 |
| `--danger-light` | `#E39182` | Error text **on dark surfaces** | 4.74:1 on the auth card |

`--success` aliases `--sage-deep`. On a sage brand a separate success green is noise.
`--warning` aliases `--terra-text`.

**`--terra-text` vs `--terra-ink`.** `--terra-text` is measured against the page ground.
Put it on a `terra/10` tint — which is where badges, pills and warning panels actually
sit — and the surface beneath rises to `#F3EAE3`, taking it to 4.03:1. `--terra-ink` is
the same hue darkened until it survives its own tint (4.74:1 there, 5.34:1 on the
ground). Rule of thumb: **terracotta text on cream is `--terra-text`; terracotta text on
terracotta is `--terra-ink`.**

The same trap catches `--ink-muted`, which reaches 4.48:1 on full `--wash`. Where muted
text sits on a sage tint the tint is softened to `wash/60`.

**Every ratio in the table above is measured against cream**, which is why every colour
in it is dark. On a dark surface they invert into the same trap from the other side:
`--danger` on the auth card measured **1.13:1** — the sign-in error was invisible on a
light background photograph. `--sage-light` and `--danger-light` are the two exceptions,
measured the other way round; they are the only accent colours to use on dark.

### Dark surfaces

Only one part of the site has them: the auth pages, where the card is an ink layer over
an ink scrim over a photograph that changes every five seconds. Nothing about that stack
is fixed, so it has to be sized for its **worst case — a white photograph**, which is
what a bright market shot effectively is.

At `bg-foreground/70` over `bg-foreground/40` the card came out at `rgb(80,84,75)`, where
`--sage-light` measured 3.24:1. At `/80` over `/70` it is `rgb(55,59,49)` and the same
colour measures 4.81:1. **The scrim is a contrast control, not a mood setting** — that is
the number to check before lightening it.

Borders on that card need 3:1 like any other non-text boundary: `background/20` measured
1.82:1, `background/45` measures 3.58:1.

`scripts/check-auth-contrast.mjs` measures the whole set.

## Brand mark

`components/brand/BrandMark.tsx` — the cart mark plus wordmark, as **live text**.

The supplied `ramazah-store-icon.svg` could not be used: it is a traced bitmap of 95
filled paths with `stroke="none"` on every one, 28 near-white fills that are
anti-aliasing artefacts, and a first path covering the whole canvas — so it is neither
strokeable nor transparent, and any recolour leaves white fringing. It was redrawn as
line art: **739 bytes against 75KB**, using `currentColor`.

The SVG is inlined as a React component rather than served through `<Image>`, because an
`<img>` cannot inherit CSS colour. Two variants: `default` (sage-deep mark, ink wordmark)
and `inverse` (all light) for the hero and footer.

The wordmark is text, not an image — it recolours, scales, stays selectable, and is
readable by search engines and screen readers.

**The mark is sage-deep, never terracotta.** Terracotta is the urgency colour; spending
it on a mark that appears on every page permanently would devalue the one colour that
means *look here now*.

## Typography

| Role | Face | Weights | Notes |
|---|---|---|---|
| Display | Cormorant Garamond | 300, 400 | **Never below 28px.** Tracking +0.03em |
| UI / body | Jost | 300, 400, 500 | All interface text, labels, buttons |
| Prices | Jost 500 | — | `font-variant-numeric: tabular-nums` |

Scale: 12 · 14 · 16 · 18 · 22 · 28 · 36 · 48 · 60.
Uppercase labels take +0.16em tracking. Running text stays near 65 characters.

## Rules

1. **Sage is a surface; deep sage is the interaction.** Keeps the brand legal at AA.
   Concretely: every primary action — Add to cart, Checkout, Sign in, Subscribe — is
   `bg-sage-deep text-background`, hovering to `bg-sage-deep/90`. Terracotta is **never**
   a button; it is reserved for badges and urgency (New, Sale, low stock).
2. **Cormorant never below 28px** *at weight 300* — a light serif at small sizes is
   unreadable; that is what Jost is for. The **logotype is the one exemption**: it is set
   at weight 500 with 0.26em tracking, which holds down to 21px. Weight and tracking are
   what make it legal, so neither may be reduced.
3. **Colour never carries meaning alone.** Errors and stock warnings pair an icon with
   words. Terracotta and danger sit close on hue; this rule makes that safe.
4. **Radius 4px** (was 0.625rem). The logo is fine-lined and geometric; soft-rounded
   cards fight it.
5. **Light theme only.** Dark mode never worked — no `ThemeProvider` existed and nothing
   set `.dark`. Removed rather than half-designed.

## Decision log

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| 1 | Direction A — follow the logo | Accent-only · earthy · minimal | A site that contradicts its own logo reads unfinished. Minimal was rejected because it leans on product photography that does not exist yet |
| 2 | Terracotta as the urgency accent | Amber · brick red · none | Sage cannot signal urgency at any depth; terracotta complements without competing |
| 3 | Sage demoted to a surface role | Sage as the primary button | Measured 3.09:1 — fails AA for text and for light-label buttons |
| 4 | Light theme only | Build dark · keep scaffolding | Dead scaffolding; designing it properly doubles the palette work |
| 5 | Jost + Cormorant Garamond | Inter body · other serifs | Jost's geometry matches the wide tracking of the wordmark |
| 6 | Radius 4px | Keep 0.625rem | Fine-lined logo; soft cards clash |
| 7 | `--success` aliases sage-deep | A separate success green | Two greens on a sage brand read as a mistake |
| 8 | Two pagers, not one | One shared control | A shelf's page belongs in the URL — shareable, crawlable, walkable with the back button. An admin list's filters are local state, and a link that restores the page but not the filter is worse than no link. `CategoryPagination` is links; `components/ui/Pager.tsx` is buttons. They share the page-number window and nothing else |
| 9 | The pager states the range | Page numbers alone | "51–100 of 1,284" answers how long the list is without walking to the end of it. It stays visible on a single page, because knowing there are eleven orders is useful even when they all fit |
| 10 | `--danger-light` for dark surfaces | Reuse `--danger` · drop the colour | The palette is measured against cream, so every semantic colour in it is dark. `--sage-light` already existed for this reason; errors needed the same treatment or they could not be read at all |
| 11 | Links are underlined, never struck through | Keep `CrossedLink` | The inherited component drew an X across a link on hover — at the moment someone is deciding to click it. It was the last hoodskool component in the tree |

## Migration (done)

**685 hardcoded colour values replaced** across the codebase:

- 549 Tailwind colour utilities in 65 files, mapped by meaning — `black` → `foreground`,
  `white` → `card` for surfaces and `background` for text, greys → `wash` / `rule` /
  `ink-muted`, semantic families → `destructive` / `success` / `warning`.
- 136 **arbitrary values** (`bg-[#F8E231]`) carrying hoodskool's acid yellow across 31
  files. These were invisible to a colour-family search — worth remembering, since a
  rebrand that only greps for `bg-yellow-*` would have missed every one.
- 41 dead `dark:` variants removed.
- All five email templates recoloured off black-and-yellow, with the Cloudinary skull
  watermark and hoodskool logo image replaced by a text wordmark.

A contrast check run over the result caught defects the migration itself introduced.
The same over-broad heuristic — rewriting labels in any rule that merely *contained* the
accent colour — fired twice: three times in the email templates, and **23 times in the
components**, producing white text on white buttons (1.05:1) and ink labels on sage
buttons (2.28:1).

It also mapped every former acid-yellow surface to terracotta, including primary
buttons, which contradicted rule 1 above. Corrected: 9 primary CTAs, 31 selected/active
states and 10 hover states moved to sage-deep; only genuine badges kept terracotta.

An automated bg/text contrast sweep over every class string now reports clean, and is
the check to re-run after any future colour change.

## Checking contrast

`scripts/check-admin-contrast.mjs` is that sweep, made permanent:

```
node scripts/check-admin-contrast.mjs
```

It reads every class string under `app/admin`, `components/admin` and the admin shell,
resolves the tokens above, composites tinted backgrounds (`bg-terra/10`) over the page
ground, and fails any element that sets both a background and a text colour below 4.5:1.
Only states that appear together are compared, so a `hover:` background is checked
against the `hover:` text rather than the resting one. It exits non-zero, so it can gate
a commit.

Run on the admin rebuild (2026-08-22) it caught nine pairings: the ink-on-sage active
item at 2.28:1 that the customer rail had already been fixed for, four uses of
`--ink-faint` as running text, a translucent cream badge on sage-deep at 3.75:1, and
terracotta on its own tint — which is what `--terra-ink` exists to solve.
