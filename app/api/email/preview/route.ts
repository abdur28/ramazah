import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminApi } from '@/lib/auth/api';
import { renderEmail, EMAILS } from '@/lib/email/render';
import { deliver, mailerConfigured } from '@/lib/email/send';

/**
 * See a template before anybody else does, and send yourself one.
 *
 * The old mailer's first preview of a campaign was the copy the customers got.
 * `GET` renders a template against a real recent record and returns the HTML;
 * `POST` delivers that same render to one address.
 *
 * Admin-only. It renders other people's orders and can put mail on the wire.
 */
export const dynamic = 'force-dynamic';

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );
}

/** The most recent real thing of the right kind, so a preview is not lorem. */
async function subjectFor(db: any, template: string) {
  const orderish = /^(order_|payment_|refund_|review_invite|admin_new_order)/.test(template);
  const requestish = /^(request_|quote_|admin_new_request)/.test(template);

  if (orderish) {
    const { data } = await db.from('orders').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data ? { subject_type: 'order', subject_id: data.id } : null;
  }
  if (requestish) {
    const { data } = await db.from('product_requests').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data ? { subject_type: 'request', subject_id: data.id } : null;
  }
  if (template === 'review_published') {
    const { data } = await db.from('reviews').select('id').limit(1).maybeSingle();
    return data ? { subject_type: 'review', subject_id: data.id } : null;
  }
  if (/^(welcome|account_|credentials_|abandoned_)/.test(template)) {
    const { data } = await db.from('profiles').select('id').limit(1).maybeSingle();
    return data ? { subject_type: 'profile', subject_id: data.id } : null;
  }
  return { subject_type: null, subject_id: null };
}

/**
 * The auth templates have no record to preview against.
 *
 * Their content comes from Supabase at send time — the code is minted by the
 * thing that will later verify it, so there is nothing in this database to read
 * it from. A fixed sample stands in, and it is deliberately not a plausible
 * code: seeing 123456 in a preview should never make anybody wonder whether a
 * real one leaked into the admin.
 */
const AUTH_SAMPLE = {
  code: '123456',
  email: 'preview@ramazah.test',
  expiryMinutes: 60,
};

const isAuthTemplate = (template: string) =>
  ['verify_email', 'password_reset', 'magic_link', 'email_change', 'reauthentication']
    .includes(template);

async function build(template: string, payload: Record<string, any>, to: string) {
  if (!EMAILS[template]) throw new Error(`No such template: ${template}`);

  const db = service();

  if (isAuthTemplate(template)) {
    const rendered = await renderEmail({
      db,
      row: {
        id: 'preview', template, to_email: to, to_name: 'Preview',
        subject_type: 'auth', subject_id: null,
        payload: { ...AUTH_SAMPLE, ...payload },
      },
    });
    if (!rendered) throw new Error('This template rendered nothing.');
    return rendered;
  }

  const subject = await subjectFor(db, template);
  if (!subject) throw new Error('Nothing to preview this against yet.');

  const rendered = await renderEmail(
    {
      db,
      row: {
        id: 'preview', template, to_email: to, to_name: 'Preview',
        subject_type: subject.subject_type, subject_id: subject.subject_id, payload,
      },
    },
    { unsubscribeUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/unsubscribe?t=preview` }
  );

  if (!rendered) {
    throw new Error('This template decided it should not send for that record.');
  }
  return rendered;
}

export async function GET(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const template = url.searchParams.get('template') ?? '';

  try {
    const rendered = await build(template, {}, 'preview@ramazah.test');
    // Returned as a document so the admin can drop it straight into an iframe,
    // which is the only honest way to look at email HTML.
    return new NextResponse(rendered.html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

/**
 * The same render, but with a payload the caller supplies.
 *
 * `GET` previews a transactional template, which builds its own content from a
 * record. A campaign has no record — its content is being typed at that moment —
 * so it comes in the body. PUT rather than POST because POST here sends.
 */
export async function PUT(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const template = url.searchParams.get('template') ?? '';

  try {
    const { payload } = await request.json();
    const rendered = await build(template, payload ?? {}, 'preview@ramazah.test');
    return new NextResponse(rendered.html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  if (!mailerConfigured()) {
    return NextResponse.json(
      { error: 'Email is not configured — set EMAIL_USER and EMAIL_PASSWORD.' },
      { status: 400 }
    );
  }

  try {
    const { template, to, payload } = await request.json();
    if (!to) return NextResponse.json({ error: 'Where should it go?' }, { status: 400 });

    const rendered = await build(template, payload ?? {}, to);
    await deliver({
      to, toName: 'Test', subject: `[test] ${rendered.subject}`,
      html: rendered.html, text: rendered.text,
    });

    return NextResponse.json({ ok: true, subject: rendered.subject });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
