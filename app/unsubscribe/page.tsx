import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Stopping the marketing.
 *
 * Every template linked here and the route did not exist — four of the five
 * originals carried `{{websiteUrl}}/unsubscribe` and it was a 404. A dead
 * unsubscribe link is both a compliance problem and the fastest way into a spam
 * folder, because mailbox providers watch precisely this.
 *
 * No sign-in. That is the point: this gets followed from a forwarded email on a
 * phone that has never logged in, so the token in the URL is the credential. It
 * only ever turns things off, so the worst a leaked link can do is stop
 * marketing somebody was not reading.
 *
 * It acts on load rather than showing a confirm button. A one-click unsubscribe
 * is what `List-Unsubscribe-Post` promises the mail client, and making somebody
 * hunt for a second button is how they press "spam" instead.
 */
export default async function UnsubscribePage({ searchParams }: any) {
  const { t: token, scope } = await searchParams;

  let outcome: 'done' | 'invalid' | 'missing' = 'missing';
  let email: string | null = null;

  if (token) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('unsubscribe', {
      p_token: token,
      p_scope: scope || 'all',
    });

    if (error || !data?.length) {
      outcome = 'invalid';
    } else {
      outcome = 'done';
      email = data[0].out_email;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-24">
      <div className="w-full max-w-lg">
        <p className="font-body text-[11px] uppercase tracking-[0.24em] text-ink-muted">
          Ramazah Store
        </p>

        {outcome === 'done' && (
          <>
            <h1 className="mt-5 font-heading text-4xl font-light text-foreground md:text-5xl">
              Done — you are off the list.
            </h1>
            <p className="mt-4 max-w-[56ch] font-body text-base leading-relaxed text-ink-muted">
              {email} will not get any more newsletters, offers or new-arrival emails from us.
            </p>
            {/* Said plainly, because the alternative is somebody assuming their
                invoice has stopped too and messaging to ask. */}
            <p className="mt-3 max-w-[56ch] font-body text-sm leading-relaxed text-ink-faint">
              You will still get emails about orders you place — the invoice, confirmation that
              your payment reached us, and a note when a parcel ships. Those are part of the
              order rather than something to subscribe to.
            </p>
          </>
        )}

        {outcome === 'invalid' && (
          <>
            <h1 className="mt-5 font-heading text-4xl font-light text-foreground md:text-5xl">
              That link has expired.
            </h1>
            <p className="mt-4 max-w-[56ch] font-body text-base leading-relaxed text-ink-muted">
              It may have been used already, or the address may have been removed. If you are
              still getting emails you did not ask for, reply to one of them and we will take
              you off by hand.
            </p>
          </>
        )}

        {outcome === 'missing' && (
          <>
            <h1 className="mt-5 font-heading text-4xl font-light text-foreground md:text-5xl">
              Nothing to unsubscribe.
            </h1>
            <p className="mt-4 max-w-[56ch] font-body text-base leading-relaxed text-ink-muted">
              This page needs the link from the bottom of one of our emails. You can also change
              what you hear about from your account.
            </p>
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-sm bg-sage-deep px-6 py-3 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-background transition-colors hover:bg-foreground"
          >
            Back to the shop
          </Link>
          <Link
            href="/dashboard/preferences"
            className="inline-flex items-center rounded-sm border border-rule px-6 py-3 font-body text-[11px] uppercase tracking-[0.16em] text-ink-muted transition-colors hover:border-sage-deep hover:text-sage-deep"
          >
            Manage preferences
          </Link>
        </div>
      </div>
    </main>
  );
}

export const metadata = {
  title: "Unsubscribe | Ramazah Store",
  robots: { index: false, follow: false },
};
