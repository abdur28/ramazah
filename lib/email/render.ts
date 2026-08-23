import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { EMAILS, type RenderContext } from './templates';
import { getSettings } from '@/lib/settings';

/**
 * Turning an outbox row into an email.
 *
 * Templates are read from disk and compiled once per process. In development
 * Next reloads the module on edit, so a changed template shows up without a
 * restart; in production this is a cold-start cost paid once.
 */
const cache = new Map<string, HandlebarsTemplateDelegate>();
const EMAIL_DIR = path.join(process.cwd(), 'emails');

let partialsReady = false;

function registerPartials() {
  if (partialsReady) return;

  const partials = {
    orderLines: 'order-lines.html',
    button: 'button.html',
    paymentBlock: 'payment-block.html',
    otpCode: 'otp-code.html',
  };

  for (const [name, file] of Object.entries(partials)) {
    Handlebars.registerPartial(
      name,
      fs.readFileSync(path.join(EMAIL_DIR, 'partials', file), 'utf-8')
    );
  }

  partialsReady = true;
}

function compile(file: string): HandlebarsTemplateDelegate {
  const cached = cache.get(file);
  if (cached && process.env.NODE_ENV === 'production') return cached;

  const source = fs.readFileSync(path.join(EMAIL_DIR, file), 'utf-8');
  const template = Handlebars.compile(source);
  cache.set(file, template);
  return template;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Render one outbox row.
 *
 * Returns null when the email should no longer be sent — a reminder for an order
 * that has since been paid, a review invitation for an order that was cancelled.
 * That check lives in each template's `build`, because only the template knows
 * what would make it wrong.
 */
export async function renderEmail(
  context: RenderContext,
  options: { unsubscribeUrl?: string | null } = {}
): Promise<RenderedEmail | null> {
  const definition = EMAILS[context.row.template];
  if (!definition) {
    throw new Error(`No such template: ${context.row.template}`);
  }

  const data = await definition.build(context);
  if (!data) return null;

  registerPartials();

  const site = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  // The context's client, not the default one: a worker render has no session
  // and would otherwise read code defaults for any admin-only group.
  const settings = await getSettings(context.db);

  const model = {
    ...data,
    subject: definition.subject(data),
    preheader: definition.preheader(data),
    eyebrow: definition.eyebrow,
    websiteUrl: (data as any).websiteUrl ?? site,
    websiteHost: site.replace(/^https?:\/\//, ''),
    supportWhatsapp: settings.contact.whatsapp,
    // The registered company in the footer, the trading name in the header —
    // see the note in partials/layout.html.
    companyName: settings.business.legalName,
    companyAddress: [settings.business.city, settings.business.country]
      .filter(Boolean).join(', '),
    // Only marketing carries one. Transactional mail has nothing to unsubscribe
    // from, and offering it there invites somebody to switch off their own
    // invoices.
    unsubscribeUrl:
      definition.category === 'marketing' ? options.unsubscribeUrl ?? null : null,
  };

  const body = compile(`${context.row.template}.html`)(model);
  const html = compile('partials/layout.html')({ ...model, body });

  return {
    subject: model.subject,
    html,
    text: definition.text(data).trim(),
  };
}

export { EMAILS };
