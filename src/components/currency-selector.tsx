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
    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm border">
      <span className="text-sm text-gray-600">Devise:</span>
      <div className="flex gap-1">
        {CURRENCIES.map((currency) => (
          <button
            key={currency}
            onClick={() => handleCurrencyChange(currency)}
            className={`
              px-3 py-1 rounded-full text-sm font-medium transition-all
              ${selectedCurrency === currency
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            title={currencyLabels[currency]}
          >
            {currencySymbols[currency]} {currency}
          </button>
        ))}
      </div>
    </div>
  )
}
