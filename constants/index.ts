import { Currency } from "@/types/types";

export const availableCurrencies: Currency[] = [
    {
        name: "NGN",
        code: "ngn",
        symbol: "₦",
        isDefault: true
    },
    {
        name: "USD",
        code: "usd",
        symbol: "$"
    },
    {
        name: "EGP",
        code: "egp",
        symbol: "E£"
    }
]

export async function getAvailableCurrencies() {
    return availableCurrencies;
}

// TEMPORARY: hardcoded until the VAT/invoice system is built.
// 7.5% is the Nigerian VAT rate (was 0.08, a US-style rate inherited from hoodskool).
export const TAX_RATE = 0.075;

// PLACEHOLDER VALUES IN NAIRA — replace with your real shipping economics.
// These were 100 and 10 (USD-scaled); left as-is every order would ship free.
export const FREE_SHIPPING_THRESHOLD = 100_000;
export const STANDARD_SHIPPING = 2_500;

/**
 * Who the shop legally is.
 *
 * Two names, and they are not interchangeable.
 *
 * `tradingName` is the shop — what customers know it as, what goes in an email
 * header, a page title, a copyright line. `legalName` is the registered company
 * at the CAC, and belongs anywhere a party is being named rather than a brand:
 * the invoice, the terms, and the bank account a customer transfers to.
 *
 * The first version of this used "Ramazah Group", which is not a registered
 * entity at all — it was on the invoice, the packing slip, every email footer
 * and, worst, as the name on the bank account customers were told to pay.
 *
 * PLACEHOLDER: `rcNumber` and `address` still need the real values. An invoice
 * is a tax document and a Nigerian one is expected to carry the RC number.
 */
export const COMPANY = {
  legalName: 'RAMAZAH GLOBAL EMPORIUM LIMITED',
  tradingName: 'Ramazah Store',
  /** CAC registration number — goes on the invoice. */
  rcNumber: '',
  /** The registered address, not the buying office. */
  address: 'Alexandria, Egypt',
} as const;

/**
 * Where the money goes.
 *
 * Ramazah takes no card payment: an order raises an invoice and the customer
 * settles it by bank transfer, quoting the order number as the reference. The
 * invoice has said "payable by bank transfer" since it was built and never said
 * *to which account* — so a customer who wanted to pay had to ask.
 *
 * PLACEHOLDER VALUES — replace with the real account before launch. Nothing here
 * is secret (these are the details you would print on an invoice anyway), which
 * is why they are a constant rather than an env var.
 *
 * This is the first thing the admin settings screen should own. Until it exists,
 * changing an account number means changing this file and redeploying.
 */
export const BANK_DETAILS = {
  bankName: 'Bank name',
  /**
   * Must match the name on the actual account, letter for letter.
   *
   * A customer transferring money compares this against what their banking app
   * shows when they enter the account number. A mismatch is the moment somebody
   * stops and messages to ask whether the shop is real — and with a manual
   * payment model that hesitation is the whole sale.
   */
  accountName: COMPANY.legalName,
  accountNumber: '0000000000',
  /** Shown under the account, for anyone paying from outside Nigeria. */
  swift: '',
} as const;

/**
 * How long the customer should expect to wait, in their own words.
 *
 * The shop buys in runs and ships from Egypt, so this is weeks rather than days.
 * Said at checkout, on the confirmation, and on the product page — a customer
 * who expects next-day and waits three weeks is a refund request.
 */
export const DELIVERY_LEAD_TIME = '2–3 weeks';

/** Where to chase an order. The business runs on WhatsApp. */
export const SUPPORT_WHATSAPP = '2348000000000';
