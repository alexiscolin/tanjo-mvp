"use client";

import {
  type Currency,
  CURRENCIES,
  currencySymbols,
  currencyLabels,
  savePreferredCurrency,
} from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencySelectorProps {
  selectedCurrency: Currency;
  onCurrencyChange: (currency: Currency) => void;
}

export function CurrencySelector({ selectedCurrency, onCurrencyChange }: CurrencySelectorProps) {
  const handleCurrencyChange = (currency: Currency) => {
    onCurrencyChange(currency);
    savePreferredCurrency(currency);
  };

  return (
    <div className="bg-surface/40 border-dark/10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 backdrop-blur-sm transition-all duration-300 hover:scale-105">
      {CURRENCIES.map((currency) => (
        <button
          key={currency}
          onClick={() => handleCurrencyChange(currency)}
          className={cn(
            "cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium transition-all",
            selectedCurrency === currency
              ? "bg-accent-red text-white"
              : "text-dark/60 hover:text-dark hover:bg-surface/60"
          )}
          title={currencyLabels[currency]}
        >
          {currencySymbols[currency]}
        </button>
      ))}
    </div>
  );
}
