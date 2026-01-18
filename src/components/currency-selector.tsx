'use client'

import { Currency, CURRENCIES, currencySymbols, currencyLabels, savePreferredCurrency } from '@/lib/currency'

interface CurrencySelectorProps {
  selectedCurrency: Currency
  onCurrencyChange: (currency: Currency) => void
}

export function CurrencySelector({ selectedCurrency, onCurrencyChange }: CurrencySelectorProps) {
  const handleCurrencyChange = (currency: Currency) => {
    onCurrencyChange(currency)
    savePreferredCurrency(currency) // Save preference
  }

  return (
    <div className="flex items-center gap-1.5 bg-surface/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-dark/10 hover:scale-105 transition-all duration-300">
      {CURRENCIES.map((currency) => (
        <button
          key={currency}
          onClick={() => handleCurrencyChange(currency)}
          className={`
            px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer
            ${selectedCurrency === currency
              ? 'bg-dark text-white'
              : 'text-dark/60 hover:text-dark hover:bg-surface/60'
            }
          `}
          title={currencyLabels[currency]}
        >
          {currencySymbols[currency]}
        </button>
      ))}
    </div>
  )
}
