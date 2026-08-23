/**
 * Contrast on the auth pages.
 *
 * These are the only dark surfaces in the site, and the only ones whose
 * background is not fixed: a photograph, an ink scrim, an ink card. So the
 * numbers have to be computed for the worst case rather than eyeballed against
 * whichever image happened to be showing.
 *
 * The worst case is a white photograph, which a bright market shot effectively
 * is. Run after touching the scrim, the card, or any colour on them.
 *
 *   node scripts/check-auth-contrast.mjs
 */

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const over = (fg, a, bg) => fg.map((c, i) => c * a + bg[i] * (1 - a));

const lum = (c) => {
  const s = c.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const INK = hex('#2A2E24');
const T = {
  background: hex('#FAF9F5'),
  sageLight: hex('#A3AB8C'),
  dangerLight: hex('#E39182'),
};

const SCRIM = 0.8;  // bg-foreground/80
const CARD = 0.7;   // bg-foreground/70
const WHITE = [255, 255, 255];

const card = over(INK, CARD, over(INK, SCRIM, WHITE));

console.log(
  `auth card = bg-foreground/${SCRIM * 100} scrim + bg-foreground/${CARD * 100} card\n` +
  `over a white photograph  ->  rgb(${card.map(Math.round).join(', ')})\n`
);

let failed = 0;

/** `floor` is 4.5 for text and 3 for borders, icons and other non-text marks. */
const check = (label, colour, alpha, floor) => {
  const r = ratio(over(colour, alpha, card), card);
  const ok = r >= floor;
  if (!ok) failed++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (needs ${floor})  ${label}`
  );
};

check('body            text-background', T.background, 1, 4.5);
check('field label     text-background/80', T.background, 0.8, 4.5);
check('back link       text-background/85', T.background, 0.85, 4.5);
check('sub copy        text-background/70', T.background, 0.7, 4.5);
check('helper text     text-background/60', T.background, 0.6, 4.5);
check('inline link     text-sage-light', T.sageLight, 1, 4.5);
check('eyebrow         text-sage-light', T.sageLight, 1, 4.5);
check('success text    text-sage-light', T.sageLight, 1, 4.5);
check('error text      text-danger-light', T.dangerLight, 1, 4.5);
check('google label    text-background', T.background, 1, 4.5);
check('placeholder     text-background/50', T.background, 0.5, 3);
check('field icon      text-background/60', T.background, 0.6, 3);
check('field border    border-background/45', T.background, 0.45, 3);
check('google border   border-background/45', T.background, 0.45, 3);
check('divider rule    bg-background/40', T.background, 0.4, 3);

console.log(failed === 0 ? '\nevery check passed' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
