import nodemailer from 'nodemailer';
import type { EmailCategory } from './templates';
import type { Settings } from '@/lib/settings-defaults';

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

export interface Sender {
  /** The line an inbox shows in its sender column. */
  name: string;
  address: string;
  replyTo?: string;
}

const domainOf = (address: string) => address.split('@')[1]?.toLowerCase() ?? '';

/**
 * Who an email comes from, and where a reply to it goes.
 *
 * Two addresses, split by category. Spam complaints attach to the sending
 * identity, and people do mark newsletters as junk — letting that land on the
 * address invoices come from is how a shop stops getting paid because of a
 * promotion. Marketing falls back to the transactional address when no separate
 * one is set, which is the behaviour this replaced.
 *
 * **The domain is checked against `EMAIL_FROM`.** A sending provider rejects
 * any From on a domain it has not verified, and Settings is a text box: someone
 * can type an address that silently breaks every email in the shop. `EMAIL_FROM`
 * was set by whoever configured the transport, so its domain is the one known
 * to work. A mismatch falls back to it rather than failing — an invoice sent
 * from a slightly wrong address beats an invoice not sent.
 */
export function senderFor(category: EmailCategory, settings: Settings): Sender {
  const fallback = process.env.EMAIL_FROM || process.env.EMAIL_USER!;
  const email = settings.email;

  const wanted =
    (category === 'marketing' ? email.marketingFromAddress : '') ||
    email.fromAddress ||
    fallback;

  const usable =
    domainOf(wanted) && domainOf(wanted) === domainOf(fallback) ? wanted : fallback;

  if (usable !== wanted) {
    console.warn(
      `[mail] "${wanted}" is not on the sending domain (${domainOf(fallback)}) — ` +
      `used ${usable} instead. Set it in Admin -> Settings -> Email.`
    );
  }

  return {
    name: email.fromName?.trim() || 'Ramazah Store',
    address: usable,
    replyTo: email.replyTo?.trim() || undefined,
  };
}

export interface OutgoingEmail {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  text: string;
  /** Set for marketing, so a client can offer one-click unsubscribe. */
  unsubscribeUrl?: string | null;
  /** Omitted falls back to EMAIL_FROM under the shop's name, as before. */
  sender?: Sender;
}

export async function deliver(email: OutgoingEmail): Promise<void> {
  const sender = email.sender ?? {
    name: 'Ramazah Store',
    address: process.env.EMAIL_FROM || process.env.EMAIL_USER!,
  };

  await getTransport().sendMail({
    // The shop's name, not the company's. This is the line an inbox shows in
    // the sender column, so it has to be the name people know the shop by.
    from: `${sender.name} <${sender.address}>`,
    // Without this a reply goes to whichever address sent the mail, and the
    // sending addresses deliberately have no inbox behind them.
    replyTo: sender.replyTo,
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
