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