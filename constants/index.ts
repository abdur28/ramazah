import { Currency } from "@/types/types";

export const availableCurrencies: Currency[] = [
    {
        name: "RUB",
        code: "rub",
        symbol: "₽",
        isDefault: true
    },
    {
        name: "USD",
        code: "usd",
        symbol: "$"
    }
]

export async function getAvailableCurrencies() {
    return availableCurrencies;
}

export const TAX_RATE = 0.08; // 8% tax
export const FREE_SHIPPING_THRESHOLD = 100;
export const STANDARD_SHIPPING = 10;