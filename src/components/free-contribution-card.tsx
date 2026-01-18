'use client'

import { Card } from '@/components/ui/card'
import { HandHeart } from 'lucide-react'
import { type Currency, type ExchangeRates } from '@/lib/currency'
import { type Contribution } from '@/types'
import { ContributorsProgress } from './contributors-progress'

interface FreeContributionCardProps {
  title: string
  totalAmount: number
  contributors: Contribution[]
  onContribute: () => void
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
}

export function FreeContributionCard({ 
  title, 
  totalAmount,
  contributors,
  onContribute,
  selectedCurrency,
  exchangeRates
}: FreeContributionCardProps) {
  return (
    <Card 
      className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={onContribute}
    >
      <div className="relative overflow-hidden bg-accent-red rounded-xl mb-3">
        <div className="flex items-center justify-center">
          <div className="text-center p-4">
            <div className="inline-flex items-center justify-center w-24 h-24 mt-12 rounded-full bg-surface mb-4">
              <HandHeart className="h-12 w-12 text-accent-red" strokeWidth={1.5} />
            </div>
            <h3 className="font-bold text-xl leading-tight line-clamp-2 text-white mb-2">
              {title}
            </h3>
            <p className="text-sm text-white/80 line-clamp-2 mb-4">
              Contribuez librement au montant de votre choix pour soutenir notre projet
            </p>

            {/* Contributors progress - Always show */}
            <div className="mb-6 mx-4">
              <ContributorsProgress
                currentAmount={totalAmount}
                contributors={contributors}
                selectedCurrency={selectedCurrency}
                exchangeRates={exchangeRates}
                variant="inverted"
                progressPercentage={100}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
