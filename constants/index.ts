import { Currency } from "@/types/types";

/**
 * The one currency.
 *
 * There were three — NGN, USD and EGP — behind a switcher. The shop takes
 * payment by transfer to a Naira account, so an order priced in dollars could
 * not be paid; and with only 2 of 20 variants carrying a non-Naira price,
 * switching showed ₦0 for most of the catalogue. See `contexts/CurrencyContext`.
 *
 * `product_prices` keeps its currency column. The schema can carry a second
 * currency the day the shop can actually take one.
 */
export const NAIRA: Currency = {
  name: 'NGN',
  code: 'ngn',
  symbol: '₦',
  isDefault: true,
};

export const availableCurrencies: Currency[] = [NAIRA];


/**
 * Everything that used to live here — the registered company, the bank account,
 * VAT, shipping, the delivery lead time, the WhatsApp number — is in Settings
 * now, at /admin/settings. The defaults are in `lib/settings-defaults.ts`, which
 * every read falls back to, so an empty `site_settings` table behaves exactly as
 * these constants did.
 *
 * Changing an account number was a commit and a deploy. It is a form now.
 */

/**
 * Nigerian states, plus the FCT.
 *
 * The checkout's country dropdown offered exactly one option — Russia — and the
 * form defaulted to `"RU"`. There was no state field at all, so an address in
 * Kano and one in Lagos were indistinguishable to whoever packs the parcel.
 */
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'Federal Capital Territory', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun',
  'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
  'Zamfara',
] as const;
