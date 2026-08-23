"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * Where the shop is, when there is anywhere to say.
 *
 * This was four hundred pixels of grey reading "Map integration placeholder",
 * live at the foot of the contact page. An unfinished section left visible tells
 * a customer more about the shop than a missing one does.
 *
 * Two shapes, because a map link and a map embed are different things. Google's
 * share links (`maps.app.goo.gl`, `/maps/place/…`) refuse to load in an iframe,
 * so pasting one and hoping produces an empty box. An embed URL — the one behind
 * "Share → Embed a map" — is rendered as a map; anything else becomes a proper
 * link, which is what a phone will open in the Maps app anyway.
 */
const isEmbeddable = (url: string) => /\/maps\/embed/.test(url);

export default function ContactMap() {
  const { contact } = useSettings();

  const address = [contact.addressLine, contact.city, contact.country]
    .filter(Boolean)
    .join(", ");

  if (!contact.mapUrl && !address) return null;

  if (contact.mapUrl && isEmbeddable(contact.mapUrl)) {
    return (
      <section aria-label="Where we are" className="h-[400px] w-full">
        <iframe
          src={contact.mapUrl}
          title={address || "Where we are"}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      </section>
    );
  }

  return (
    <section className="border-t border-rule bg-wash/50 px-6 py-14 md:px-12">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-4">
        <MapPin className="h-5 w-5 shrink-0 text-sage-deep" />
        <div className="min-w-0">
          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Where we are
          </p>
          <p className="mt-1.5 font-body text-lg text-foreground">{address}</p>
        </div>

        {contact.mapUrl && (
          <a
            href={contact.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group ml-auto inline-flex items-center gap-2 font-body text-sm text-sage-deep transition-colors hover:text-foreground"
          >
            Open in Maps
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </section>
  );
}
