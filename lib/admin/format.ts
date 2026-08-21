/**
 * Formatting for the admin screens.
 *
 * These exist because the admin was formatting money with a symbol table
 * inherited from hoodskool — `{ USD, EUR, GBP, RUB }` — which has no entry for
 * the currency this shop actually trades in. Every Naira figure in the admin
 * fell through to the `|| currency` fallback and rendered as `NGN410005.00`:
 * unsymbolled, ungrouped, and quoting a subunit nobody prices in.
 *
 * The rules mirror `CurrencyContext.formatPrice` on the storefront, so the same
 * order reads the same way to the customer and to the shopkeeper.
 */

const SYMBOLS: Record<string, string> = {
  ngn: '₦',
  usd: '$',
  egp: 'E£',
};

/** Naira is priced in whole units; kobo is not a thing anyone quotes. */
const FRACTION_DIGITS: Record<string, number> = {
  ngn: 0,
};

export function currencySymbol(currency: string | null | undefined): string {
  const key = String(currency ?? 'ngn').toLowerCase();
  return SYMBOLS[key] ?? `${key.toUpperCase()} `;
}

/**
 * `₦410,005` — grouped, symbolled, and pinned to en-NG so the server and the
 * browser render the same string (a locale left to the host hydrates differently
 * on a machine set to de-DE and React logs a mismatch).
 */
export function formatMoney(amount: number, currency: string | null | undefined = 'ngn'): string {
  const key = String(currency ?? 'ngn').toLowerCase();
  const digits = FRACTION_DIGITS[key] ?? 2;

  return `${currencySymbol(key)}${(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/**
 * Money for a stat card, where the column is narrow and the exact naira is not
 * the point. ₦1,240,000 becomes ₦1.24M.
 */
export function formatMoneyCompact(amount: number, currency: string | null | undefined = 'ngn'): string {
  const value = amount || 0;
  const symbol = currencySymbol(currency);

  if (Math.abs(value) >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 100_000) return `${symbol}${Math.round(value / 1_000)}k`;
  return formatMoney(value, currency);
}

/**
 * Several currencies at once, for the totals that group by currency. Falls back
 * to a dash rather than the string 'No revenue', which used to appear inside a
 * slot styled as a number and read as a broken value.
 */
export function formatMoneyByCurrency(
  entries: Array<{ currency: string; amount: number }> | undefined,
  compact = false
): string {
  if (!entries || entries.length === 0) return '—';
  const format = compact ? formatMoneyCompact : formatMoney;
  return entries.map((entry) => format(entry.amount, entry.currency)).join('  ·  ');
}

export function formatNumber(value: number | null | undefined): string {
  return (value || 0).toLocaleString('en-NG');
}

/** `21 Aug 2026` */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** `21 Aug 2026, 14:05` */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';
  return `${formatDate(date)}, ${date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
}

/** `3 days ago` — for queues, where age is the thing that matters. */
export function formatRelative(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '—';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  const formatter = new Intl.RelativeTimeFormat('en-NG', { numeric: 'auto' });

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return formatter.format(-Math.round(seconds / size), unit);
    }
  }
  return 'just now';
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${(value || 0).toFixed(1)}%`;
}

/**
 * The admin still receives dates from three shapes: ISO strings from Supabase,
 * `Date` objects built client-side, and — in a few untouched corners — the
 * `{ toDate() }` shape Firestore timestamps had. The last one cannot occur any
 * more, but the guard costs nothing and an `Invalid date` in a money table does.
 */
function toDate(value: any): Date | null {
  if (!value) return null;
  try {
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}
