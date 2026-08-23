import { NextResponse, type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderEmail } from '@/lib/email/render';
import { deliver, mailerConfigured, senderFor } from '@/lib/email/send';
import { getSettings } from '@/lib/settings';

/**
 * Supabase Auth's Send Email Hook.
 *
 * Auth is the one part of the shop that sends mail we do not compose: Supabase
 * owns the token, its expiry and the thing that verifies it. Left alone it also
 * owns the *email*, which meant the five messages standing between a customer
 * and their account were the only ones not built from `emails/` — different
 * type, different sender, someone else's branding.
 *
 * This hook takes that last part back. Supabase still mints the code; it hands
 * it to us instead of posting it, and we render one of our own templates and
 * send it through the same transport as everything else.
 *
 * **These do not go through the outbox.** Everything else in the shop is queued
 * and drained, because a delayed invoice is still an invoice. A confirmation
 * code that arrives after the queue runs is a customer staring at a form. The
 * hook is also synchronous by contract — Supabase reports our failure to the
 * caller — so a queue would be reporting success for something that has not
 * happened yet.
 */

/**
 * How long a code lasts, in minutes.
 *
 * Not in the payload, so it is stated here and has to match Authentication →
 * Emails → Email OTP Expiration in the dashboard. Wrong in one direction the
 * email promises more time than the code has; wrong in the other it tells
 * someone to hurry for no reason.
 */
const OTP_MINUTES = 60;

/** Five minutes either way, which is what Standard Webhooks recommends. */
const TIMESTAMP_TOLERANCE_SECONDS = 300;

type AuthAction =
  | 'signup'
  | 'invite'
  | 'recovery'
  | 'magiclink'
  | 'email_change'
  | 'email_change_current'
  | 'email_change_new'
  | 'reauthentication';

/**
 * Which of our templates answers which action.
 *
 * An action with no entry is not an error — it is a Supabase feature this shop
 * does not use. It is logged and accepted rather than failed, because failing
 * the hook blocks the auth operation itself: an unknown action type would stop
 * someone signing in over an email nobody needed.
 */
const TEMPLATE: Partial<Record<AuthAction, string>> = {
  signup: 'verify_email',
  invite: 'verify_email',
  recovery: 'password_reset',
  magiclink: 'magic_link',
  email_change: 'email_change',
  email_change_current: 'email_change',
  email_change_new: 'email_change',
  reauthentication: 'reauthentication',
};

/**
 * Standard Webhooks, verified here rather than through a dependency.
 *
 * Twenty lines against a package in the auth path, where the whole point is
 * that the code is auditable. The signed content is `id.timestamp.body`, so the
 * body must be the *raw* text — re-serialising the parsed JSON changes key
 * order and whitespace and the signature stops matching.
 */
function verifySignature(
  secret: string,
  headers: Headers,
  rawBody: string
): { ok: true } | { ok: false; reason: string } {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signature = headers.get('webhook-signature');

  if (!id || !timestamp || !signature) return { ok: false, reason: 'missing signature headers' };

  // Without this, a signed request captured once could be replayed for ever.
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > TIMESTAMP_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'timestamp outside tolerance' };
  }

  // The dashboard shows the secret as `v1,whsec_…`; the key is what follows,
  // base64-decoded. Both spellings are accepted because both get pasted.
  const key = Buffer.from(secret.replace(/^v1,/, '').replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();

  // The header carries a space-separated list so a secret can be rotated with
  // both old and new signatures in flight.
  const offered = signature
    .split(' ')
    .map((part) => part.split(',')[1])
    .filter(Boolean);

  const matched = offered.some((candidate) => {
    const given = Buffer.from(candidate, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });

  return matched ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}

/** The shape Supabase reports back to whoever triggered the auth call. */
const fail = (status: number, message: string) =>
  NextResponse.json({ error: { http_code: status, message } }, { status });

export async function POST(request: NextRequest) {
  const secret = process.env.AUTH_EMAIL_HOOK_SECRET;
  if (!secret) {
    console.error('[auth-mail] AUTH_EMAIL_HOOK_SECRET is not set — refusing the request');
    return fail(500, 'Email is not configured. Please try again shortly.');
  }

  const rawBody = await request.text();

  const verified = verifySignature(secret, request.headers, rawBody);
  if (!verified.ok) {
    // Deliberately vague to the caller, specific in the log: an attacker
    // learning *which* check failed is halfway to passing it.
    console.error(`[auth-mail] rejected: ${verified.reason}`);
    return fail(401, 'Unauthorized');
  }

  if (!mailerConfigured()) {
    console.error('[auth-mail] EMAIL_USER / EMAIL_PASSWORD are not set');
    return fail(500, 'Email is not configured. Please try again shortly.');
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return fail(400, 'Malformed request.');
  }

  const user = payload?.user ?? {};
  const data = payload?.email_data ?? {};
  const action = data.email_action_type as AuthAction;
  const template = TEMPLATE[action];

  if (!template) {
    console.warn(`[auth-mail] no template for "${action}" — accepted, nothing sent`);
    return NextResponse.json({});
  }

  // `email_change_new` is the one addressed to the address being moved *to*,
  // and carries its code in `token_new`. Sending `token` there would give
  // someone the code for an address they are trying to leave.
  const isNewAddress = action === 'email_change_new';
  const code = isNewAddress ? data.token_new : data.token;
  const to = isNewAddress ? (user.new_email ?? user.email) : user.email;

  if (!code || !to) {
    console.error(`[auth-mail] "${action}" arrived without a code or an address`);
    return fail(400, 'Malformed request.');
  }

  try {
    const rendered = await renderEmail({
      db: createAdminClient(),
      row: {
        id: `auth:${action}`,
        template,
        to_email: to,
        to_name: user.user_metadata?.full_name ?? null,
        subject_type: 'auth',
        subject_id: user.id ?? null,
        payload: { code, email: to, expiryMinutes: OTP_MINUTES },
      },
    });

    if (!rendered) throw new Error(`${template} rendered nothing`);

    await deliver({
      to,
      toName: user.user_metadata?.full_name ?? null,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      // Always transactional. Nobody opts out of getting into their account.
      sender: senderFor('transactional', await getSettings()),
    });
  } catch (error: any) {
    // Never log `code` — this is the one payload in the shop that is a
    // credential, and logs are the easiest place to leak one from.
    console.error(`[auth-mail] "${action}" failed to send:`, error?.message ?? error);
    return fail(500, 'Could not send the email. Please try again.');
  }

  return NextResponse.json({});
}
