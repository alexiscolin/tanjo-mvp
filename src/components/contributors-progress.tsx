'use client'

import { useState } from 'react'
import { type Currency, type ExchangeRates, formatCurrency } from '@/lib/currency'
import { type Contribution } from '@/types'
import { cn } from '@/lib/utils'

interface ContributorsProgressProps {
  currentAmount: number
  goalAmount?: number // Optional - if provided, shows "X / Y €"
  contributors: Contribution[]
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
  variant?: 'default' | 'inverted' // default = dark text, inverted = white text
  progressPercentage?: number // For pot gifts with goal
}

export function ContributorsProgress({
  currentAmount,
  goalAmount,
  contributors,
  selectedCurrency,
  exchangeRates,
  variant = 'default',
  progressPercentage = 100,
}: ContributorsProgressProps) {
  const [showContributors, setShowContributors] = useState(false)
  const formatPrice = (cents: number) => formatCurrency(cents, selectedCurrency, exchangeRates, true)
  const hasContributors = contributors.length > 0

  const isInverted = variant === 'inverted'
  
  return (
    <div className="space-y-2">
      {/* Amount and contributors button on same line */}
      <div className="flex items-center justify-between gap-3">
        <p className={cn(
          "text-xs font-medium whitespace-nowrap",
          isInverted ? "text-white" : "text-dark/50"
        )}>
          {goalAmount 
            ? `${formatPrice(currentAmount)} / ${formatPrice(goalAmount)}`
            : formatPrice(currentAmount)
          }
        </p>
        
        {/* Contributors toggle - disabled if no contributors */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasContributors) {
              setShowContributors(!showContributors)
            }
          }}
          disabled={!hasContributors}
          className={cn(
            "flex items-center gap-1 text-xs transition-colors whitespace-nowrap",
            hasContributors
              ? isInverted 
                ? "text-white/80 hover:text-white cursor-pointer"
                : "text-dark/60 hover:text-dark cursor-pointer"
              : isInverted
                ? "text-white/30 cursor-not-allowed"
                : "text-dark/30 cursor-not-allowed"
          )}
        >
          Contributeurs
          <sup>{contributors.length}</sup>
        </button>
      </div>

      {/* Progress bar below */}
      <div className={cn(
        "relative h-1 rounded-full overflow-hidden",
        isInverted ? "bg-white/30" : "bg-dark/10"
      )}>
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isInverted ? "bg-white" : "bg-accent-red"
          )}
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        />
      </div>

      {/* Contributors list - Animated show/hide */}
      <div 
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          showContributors && hasContributors ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {hasContributors && (
          <div className={cn(
            "mt-3 pt-3 border-t",
            isInverted ? "border-white/20" : "border-dark/10"
          )}>
            <div className="space-y-2">
              {contributors.map((contributor, index) => (
                <div 
                  key={contributor.id || index}
                  className="flex items-center justify-between text-xs"
                >
                  <span className={isInverted ? "text-white/80" : "text-dark/60"}>
                    {contributor.name || 'Anonyme'}
                  </span>
                  <span className={cn(
                    "font-medium",
                    isInverted ? "text-white" : "text-dark"
                  )}>
                    {formatPrice(contributor.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
