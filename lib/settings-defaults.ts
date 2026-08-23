/**
 * Shop configuration, with the code as the fallback.
 *
 * Everything here used to be a literal in `constants/index.ts` — the registered
 * company, the bank account, VAT, shipping, the WhatsApp number — and half of it
 * is still marked PLACEHOLDER. Changing an account number meant a commit and a
 * deploy.
 *
 * Same rule as page content: **every default below is what the app did before
 * this existed.** An empty `site_settings` table behaves exactly like the
 * constants did, and a stored row is merged over the default per field, so a row
 * written before a field existed still gets that field.
 *
 * No server imports — the admin editor and several client components read these
 * from the browser.
 */

export interface BusinessSettings {
  /** The CAC-registered company. Goes wherever a party is named. */
  legalName: string;
  /** What customers call the shop. Goes wherever a brand is named. */
  tradingName: string;
  /** CAC registration number. A Nigerian invoice is expected to carry it. */
  rcNumber: string;
  /** Tax identification number, if the business has one. */
  tin: string;
  /** The registered address — not the buying office. */
  addressLine: string;
  city: string;
  country: string;
}

export interface ContactSettings {
  email: string;
  phone: string;
  /** Digits only, country code included, no plus — this goes into a wa.me URL. */
  whatsapp: string;
  /** The shop's own address, if customers can visit. */
  addressLine: string;
  city: string;
  country: string;
  mapUrl: string;
  openingHours: { days: string; hours: string }[];
  instagram: string;
  facebook: string;
  tiktok: string;
  x: string;
}

export interface MoneySettings {
  /** 0.075 is Nigerian VAT. Zero switches the line off entirely. */
  taxRate: number;
  standardShipping: number;
  freeShippingThreshold: number;
  expressSurcharge: number;
  /** In the customer's words: "2–3 weeks". */
  deliveryLeadTime: string;
  orderNumberPrefix: string;
}

export interface PaymentSettings {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swift: string;
  /** Shown under the account details on the invoice and the payment emails. */
  note: string;
}

export interface EmailSettings {
  /** The name an inbox shows in its sender column. */
  fromName: string;
  /** Blank falls back to EMAIL_FROM, then EMAIL_USER. */
  fromAddress: string;
  replyTo: string;
  paymentReminderDays: number;
  paymentSecondReminderDays: number;
  quoteReminderDays: number;
  reviewInviteDays: number;
  /** Send the morning digest at all. */
  digestEnabled: boolean;
  /**
   * How many emails a campaign may take from one day's sending allowance.
   *
   * Not the plan's whole daily limit. The invoices share the transport, so a
   * campaign that eats the day's quota is exactly the failure this exists to
   * prevent — leave headroom. Zero means send the whole list at once, which is
   * right on a plan with no daily cap.
   *
   * Free tiers sit around 100/day (Resend) to 300/day (Brevo); 80 leaves room
   * for roughly ten orders' worth of transactional mail on the smaller of the
   * two.
   */
  campaignDailyBudget: number;
}

export interface ShopSettings {
  /** Default for a new product's "warn me below". */
  lowStockThreshold: number;
  /** Turn the sourcing form off when a run is already full. */
  acceptingRequests: boolean;
  /** What the sourcing page says when it is closed. */
  requestsClosedNote: string;
}

export interface Settings {
  business: BusinessSettings;
  contact: ContactSettings;
  money: MoneySettings;
  payment: PaymentSettings;
  email: EmailSettings;
  shop: ShopSettings;
}

export type SettingsKey = keyof Settings;

export const SETTINGS_DEFAULTS: Settings = {
  business: {
    legalName: 'RAMAZAH GLOBAL EMPORIUM LIMITED',
    tradingName: 'Ramazah Store',
    rcNumber: '',
    tin: '',
    addressLine: '',
    city: 'Alexandria',
    country: 'Egypt',
  },

  contact: {
    email: '',
    phone: '',
    whatsapp: '',
    addressLine: '',
    city: '',
    country: 'Nigeria',
    mapUrl: '',
    openingHours: [
      { days: 'Monday – Saturday', hours: '9:00 – 18:00' },
    ],
    instagram: '',
    facebook: '',
    tiktok: '',
    x: '',
  },

  money: {
    taxRate: 0.075,
    standardShipping: 2500,
    freeShippingThreshold: 100000,
    expressSurcharge: 0,
    deliveryLeadTime: '2–3 weeks',
    orderNumberPrefix: 'RMZ',
  },

  payment: {
    bankName: '',
    accountName: 'RAMAZAH GLOBAL EMPORIUM LIMITED',
    accountNumber: '',
    swift: '',
    note: 'Quote the reference, or we cannot match your payment to this order.',
  },

  email: {
    fromName: 'Ramazah Store',
    fromAddress: '',
    replyTo: '',
    paymentReminderDays: 3,
    paymentSecondReminderDays: 7,
    quoteReminderDays: 5,
    reviewInviteDays: 7,
    digestEnabled: true,
    campaignDailyBudget: 80,
  },

  shop: {
    lowStockThreshold: 5,
    acceptingRequests: true,
    requestsClosedNote:
      'We are not taking new sourcing requests at the moment — the next run is full. Try again in a week.',
  },
};

/** One group, merged over its default. */
export function mergeSettings<K extends SettingsKey>(
  key: K,
  stored: unknown
): Settings[K] {
  const fallback = SETTINGS_DEFAULTS[key];
  if (!stored || typeof stored !== 'object') return fallback;
  return { ...fallback, ...(stored as object) } as Settings[K];
}

/** The whole set, merged. */
export function mergeAll(rows: Record<string, unknown>): Settings {
  return (Object.keys(SETTINGS_DEFAULTS) as SettingsKey[]).reduce((all, key) => {
    (all as any)[key] = mergeSettings(key, rows[key]);
    return all;
  }, {} as Settings);
}
