"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SectionCard from "@/components/admin/ui/SectionCard";
import SingleImage from "@/components/admin/content/SingleImage";
import type { HomeContent } from "@/lib/content-defaults";

/**
 * The home page's words and photographs.
 *
 * Five sections: the opening, the two category bands, the six tiles in the
 * category table, the editorial block, and the newsletter invitation.
 *
 * Two things stay out of reach, and the screen says so rather than leaving
 * somebody hunting. The **product rail** and the **collection band** are drawn
 * from the catalogue and from Collections, so their contents change when those
 * do; editing them here would put two places in charge of the same words. And
 * the **grid the tiles sit in** — which one is wide, which one is tall — is the
 * composition that holds the top half of the page together, so it stays in code
 * while the words and photographs inside it do not.
 */
export default function HomeEditor({
  value,
  onChange,
}: {
  value: HomeContent;
  onChange: (next: HomeContent) => void;
}) {
  const patchHero = (next: Partial<HomeContent["hero"]>) =>
    onChange({ ...value, hero: { ...value.hero, ...next } });

  const patchStory = (next: Partial<HomeContent["story"]>) =>
    onChange({ ...value, story: { ...value.story, ...next } });

  const patchNewsletter = (next: Partial<HomeContent["newsletter"]>) =>
    onChange({ ...value, newsletter: { ...value.newsletter, ...next } });

  const patchTile = (index: number, next: Partial<HomeContent["tiles"][number]>) =>
    onChange({
      ...value,
      tiles: value.tiles.map((tile, i) => (i === index ? { ...tile, ...next } : tile)),
    });

  const patchBand = (index: number, next: Partial<HomeContent["bands"][number]>) =>
    onChange({
      ...value,
      bands: value.bands.map((band, i) => (i === index ? { ...band, ...next } : band)),
    });

  return (
    <div className="space-y-6">
      <SectionCard
        title="The opening"
        description="The first thing anybody sees, over the full-height photograph."
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-body text-xs text-ink-muted">
              The headline, one line at a time
            </Label>
            <Textarea
              rows={3}
              value={value.hero.lines.join("\n")}
              onChange={(event) =>
                patchHero({
                  lines: event.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                })
              }
              placeholder={"The pantry,\nThe shelf,\nThe table"}
            />
            <p className="font-body text-xs text-ink-faint">
              Each line steps further in than the one above it. Three is the shape it was
              designed around — more than four and the last line runs off a phone.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-xs text-ink-muted">The sentence under it</Label>
            <Textarea
              rows={2}
              value={value.hero.body}
              onChange={(event) => patchHero({ body: event.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-body text-xs text-ink-muted">Main button</Label>
              <Input
                value={value.hero.primaryLabel}
                onChange={(event) => patchHero({ primaryLabel: event.target.value })}
                placeholder="Start shopping"
              />
              <Input
                value={value.hero.primaryHref}
                onChange={(event) => patchHero({ primaryHref: event.target.value })}
                placeholder="/categories/veils-scarves"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-xs text-ink-muted">Quieter link</Label>
              <Input
                value={value.hero.secondaryLabel}
                onChange={(event) => patchHero({ secondaryLabel: event.target.value })}
                placeholder="How ordering works"
              />
              <Input
                value={value.hero.secondaryHref}
                onChange={(event) => patchHero({ secondaryHref: event.target.value })}
                placeholder="/contact"
              />
            </div>
          </div>

          <div className="border-t border-rule pt-4">
            <SingleImage
              url={value.hero.imageUrl}
              alt={value.hero.imageAlt}
              onChange={({ url, alt }) => patchHero({ imageUrl: url, imageAlt: alt })}
              hint="Full width and full height, with the words at the foot over a dark gradient — so a busy bottom third fights the type. Landscape, at least 2000px wide."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={`${value.bands.length} category ${value.bands.length === 1 ? "band" : "bands"}`}
        description="Photograph on one side, a few words on the other, alternating down the page."
        action={
          value.bands.length < 4 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  ...value,
                  bands: [
                    ...value.bands,
                    { eyebrow: "", title: "", body: "", href: "/", imageUrl: "", imageAlt: "" },
                  ],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          ) : undefined
        }
        flush
      >
        <ul className="divide-y divide-rule">
          {value.bands.map((band, index) => (
            <li key={index} className="space-y-4 px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                  Band {index + 1} · photograph on the {index % 2 === 0 ? "right" : "left"}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...value, bands: value.bands.filter((_, i) => i !== index) })
                  }
                  aria-label={`Delete band ${index + 1}`}
                  className="rounded-sm p-1.5 text-ink-faint transition-colors hover:bg-wash hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-ink-muted">Small label above</Label>
                  <Input
                    value={band.eyebrow}
                    onChange={(event) => patchBand(index, { eyebrow: event.target.value })}
                    placeholder="Veils & Scarves"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-ink-muted">Where it links</Label>
                  <Input
                    value={band.href}
                    onChange={(event) => patchBand(index, { href: event.target.value })}
                    placeholder="/categories/veils-scarves"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">Heading</Label>
                <Input
                  value={band.title}
                  onChange={(event) => patchBand(index, { title: event.target.value })}
                  placeholder="Chiffon that behaves in the heat"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-muted">The words</Label>
                <Textarea
                  rows={3}
                  value={band.body}
                  onChange={(event) => patchBand(index, { body: event.target.value })}
                />
              </div>

              <SingleImage
                url={band.imageUrl}
                alt={band.imageAlt}
                onChange={({ url, alt }) => patchBand(index, { imageUrl: url, imageAlt: alt })}
                hint="Roughly square or slightly tall. Leave it empty to keep the placeholder."
              />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* ─────────────────────────────────────────── the category table */}
      <SectionCard
        title="The category table"
        description="Six tiles filling one screen. Their sizes are part of the design and stay in code — the words and the photographs are yours."
        flush
      >
        <ul className="divide-y divide-rule">
          {value.tiles.map((tile, index) => (
            <li key={tile.slug} className="space-y-4 px-5 py-5">
              <p className="font-body text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                /categories/{tile.slug}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-ink-muted">Name on the tile</Label>
                  <Input
                    value={tile.name}
                    onChange={(event) => patchTile(index, { name: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-ink-muted">
                    One line under it <span className="text-ink-faint">— optional</span>
                  </Label>
                  <Input
                    value={tile.blurb}
                    onChange={(event) => patchTile(index, { blurb: event.target.value })}
                    placeholder="Chiffon, jersey and embroidered."
                  />
                </div>
              </div>

              <SingleImage
                url={tile.imageUrl}
                alt={tile.imageAlt}
                onChange={({ url, alt }) => patchTile(index, { imageUrl: url, imageAlt: alt })}
                hint="Cropped square-ish and often shown small. Something that reads at a glance — the thing in use rather than a flat-lay of stock, which the bands above already do."
              />
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* ──────────────────────────────────────────────── the story block */}
      <SectionCard
        title="The story"
        description="The one place the shop says what it is rather than what it stocks. Dark ground, one photograph."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-body text-xs text-ink-muted">Small label above</Label>
              <Input
                value={value.story.eyebrow}
                onChange={(event) => patchStory({ eyebrow: event.target.value })}
                placeholder="Why Egypt"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-xs text-ink-muted">Heading</Label>
              <Input
                value={value.story.title}
                onChange={(event) => patchStory({ title: event.target.value })}
                placeholder="Bought at the market, not from a catalogue"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-xs text-ink-muted">Paragraphs</Label>
            <Textarea
              rows={7}
              value={value.story.body.join("\n\n")}
              onChange={(event) =>
                patchStory({
                  body: event.target.value.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
                })
              }
            />
            <p className="font-body text-xs text-ink-faint">
              A blank line starts a new paragraph. Three is what the layout was built around.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-body text-xs text-ink-muted">Link says</Label>
              <Input
                value={value.story.ctaLabel}
                onChange={(event) => patchStory({ ctaLabel: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-xs text-ink-muted">Link goes to</Label>
              <Input
                value={value.story.ctaHref}
                onChange={(event) => patchStory({ ctaHref: event.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-rule pt-4">
            <SingleImage
              url={value.story.imageUrl}
              alt={value.story.imageAlt}
              onChange={({ url, alt }) => patchStory({ imageUrl: url, imageAlt: alt })}
              hint="Half the block on desktop, with a slow parallax. Portrait or square, and it sits on a dark ground — something with its own light in it."
            />
          </div>
        </div>
      </SectionCard>

      {/* ───────────────────────────────────────────────── the newsletter */}
      <SectionCard
        title="The newsletter invitation"
        description="The last thing on the page. The form itself and where it signs people up are not editable."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="font-body text-xs text-ink-muted">Small label above</Label>
              <Input
                value={value.newsletter.eyebrow}
                onChange={(event) => patchNewsletter({ eyebrow: event.target.value })}
                placeholder="Restocks and arrivals"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-xs text-ink-muted">Heading</Label>
              <Input
                value={value.newsletter.title}
                onChange={(event) => patchNewsletter({ title: event.target.value })}
                placeholder="Know when the next crate lands"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-xs text-ink-muted">The words</Label>
            <Textarea
              rows={3}
              value={value.newsletter.body}
              onChange={(event) => patchNewsletter({ body: event.target.value })}
            />
            <p className="font-body text-xs text-ink-faint">
              Worth saying what they will actually get and how to stop — this is the promise
              the unsubscribe link has to honour.
            </p>
          </div>
        </div>
      </SectionCard>

      <p className="max-w-[70ch] font-body text-xs leading-relaxed text-ink-muted">
        Two things are not here on purpose. The product rail and the collection band are drawn
        from the catalogue and from Collections, so they change when those do. And how the six
        tiles are cut across the grid — which is wide, which is tall — is the composition that
        holds the top half of the page together, so it stays in the design.
      </p>
    </div>
  );
}
