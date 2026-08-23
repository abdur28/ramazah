import nodemailer from 'nodemailer';

/**
 * The transport.
 *
 * One connection pool for the process rather than one per email: the worker
 * sends a batch at a time, and opening an SMTP session per message is both slow
 * and the kind of thing providers rate-limit.
 *
 * Deliberately not configured with a fallback. An email that silently goes
 * nowhere is worse than one that fails loudly — the outbox records the failure
 * and the admin can see it.
 */
let transport: nodemailer.Transporter | null = null;

export function mailerConfigured(): boolean {
  return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
}

function getTransport() {
  if (transport) return transport;

  if (!mailerConfigured()) {
    throw new Error(
      'Email is not configured — set EMAIL_USER and EMAIL_PASSWORD before sending.'
    );
  }

  transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 465),
    secure: Number(process.env.EMAIL_PORT || 465) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });

  return transport;
}

export interface OutgoingEmail {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  /** Set for marketing, so a client can offer one-click unsubscribe. */
  unsubscribeUrl?: string | null;
}

export async function deliver(email: OutgoingEmail): Promise<void> {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER!;

  await getTransport().sendMail({
    // The shop's name, not the company's. This is the line an inbox shows in
    // the sender column, so it has to be the name people know the shop by.
    from: `Ramazah Store <${from}>`,
    to: email.toName ? `${email.toName} <${email.to}>` : email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    // Gmail and Apple Mail put an Unsubscribe control in their own chrome when
    // these are present, which measurably lowers the rate at which people press
    // "spam" instead.
    headers: email.unsubscribeUrl
      ? {
          'List-Unsubscribe': `<${email.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
      : undefined,
  });
}

/** Proves the credentials and the host, without sending anything. */
export async function verifyTransport(): Promise<{ ok: boolean; error?: string }> {
  try {
    await getTransport().verify();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? 'Could not reach the mail server.' };
  }
}
