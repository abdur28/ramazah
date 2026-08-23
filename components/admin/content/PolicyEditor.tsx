"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SectionCard from "@/components/admin/ui/SectionCard";
import type { PolicyContent } from "@/lib/content-defaults";

/**
 * The six pages that share one shape: a standfirst and a list of headed
 * sections. FAQ, shipping, returns, terms, privacy and cookies are all this.
 *
 * Paragraphs are separated by a blank line rather than being their own inputs.
 * A repeatable-field-inside-a-repeatable-field is a lot of chrome for something
 * everybody already knows how to type, and it is how the rest of this admin
 * handles multi-paragraph text.
 */
export default function PolicyEditor({
  value,
  onChange,
}: {
  value: PolicyContent;
  onChange: (next: PolicyContent) => void;
}) {
  const patch = (next: Partial<PolicyContent>) => onChange({ ...value, ...next });

  const patchSection = (index: number, next: Partial<{ heading: string; body: string[] }>) =>
    patch({
      sections: value.sections.map((section, i) =>
        i === index ? { ...section, ...next } : section
      ),
    });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.sections.length) return;
    const sections = [...value.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    patch({ sections });
  };

  return (
    <div className="space-y-6">
      <SectionCard title="The line under the title">
        <div className="space-y-1.5">
          <Textarea
            rows={2}
            value={value.standfirst}
            onChange={(event) => patch({ standfirst: event.target.value })}
            placeholder="One sentence saying what this page is for."
          />
          <p className="font-body text-xs text-ink-faint">
            Sits directly beneath the heading, in larger type than the rest.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title={`${value.sections.length} ${value.sections.length === 1 ? "section" : "sections"}`}
        description="Each one gets a heading and its paragraphs."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => patch({ sections: [...value.sections, { heading: "", body: [""] }] })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        }
        flush
      >
        {value.sections.length === 0 ? (
          <p className="px-5 py-10 text-center font-body text-sm text-ink-muted">
            No sections yet. The page will show its title and the note at the foot.
          </p>
        ) : (
          <ul className="divide-y divide-rule">
            {value.sections.map((section, index) => (
              <li key={index} className="space-y-3 px-5 py-4">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label className="font-body text-xs text-ink-muted">Heading</Label>
                    <Input
                      value={section.heading}
                      onChange={(event) => patchSection(index, { heading: event.target.value })}
                      placeholder="How long does delivery take?"
                    />
                  </div>

                  <div className="flex shrink-0 gap-1 pt-6">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move this section up"
                      className="rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-wash disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === value.sections.length - 1}
                      aria-label="Move this section down"
                      className="rounded-sm p-1.5 text-ink-muted transition-colors hover:bg-wash disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patch({ sections: value.sections.filter((_, i) => i !== index) })
                      }
                      aria-label="Delete this section"
                      className="rounded-sm p-1.5 text-ink-faint transition-colors hover:bg-wash hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-ink-muted">Paragraphs</Label>
                  <Textarea
                    rows={4}
                    value={section.body.join("\n\n")}
                    onChange={(event) =>
                      patchSection(index, {
                        body: event.target.value.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
                      })
                    }
                    placeholder={"Write it as you would say it.\n\nA blank line starts a new paragraph."}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Is this finished?">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={value.awaitingCopy}
            onChange={(event) => patch({ awaitingCopy: event.target.checked })}
            className="mt-1 accent-[var(--sage-deep)]"
          />
          <span className="min-w-0">
            <span className="block font-body text-sm text-foreground">
              Still being written
            </span>
            <span className="mt-1 block font-body text-xs leading-relaxed text-ink-muted">
              Adds a note at the foot saying the page is being finalised and to ask directly
              meanwhile. Honest while a policy is incomplete — and worth turning off once it
              is not, because it reads as an excuse on a finished page.
            </span>
          </span>
        </label>
      </SectionCard>
    </div>
  );
}
