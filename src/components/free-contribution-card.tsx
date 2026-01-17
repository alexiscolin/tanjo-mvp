'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HandHeart, Sparkles } from 'lucide-react'
import { type Currency, type ExchangeRates, formatCurrency } from '@/lib/currency'
import { ContributorsList } from './contributors-list'
import { POOL_ID } from '@/lib/constants'

interface FreeContributionCardProps {
  title: string
  totalAmount: number
  onContribute: () => void
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
}

export function FreeContributionCard({ 
  title, 
  totalAmount, 
  onContribute,
  selectedCurrency,
  exchangeRates
}: FreeContributionCardProps) {
  const formatPrice = (cents: number) => formatCurrency(cents, selectedCurrency, exchangeRates)

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-rose-50">
      {/* Header with icon */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-400 via-rose-400 to-pink-500">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/30 backdrop-blur-sm mb-4">
              <Sparkles className="h-12 w-12 text-white" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-white drop-shadow-lg">
              {title}
            </h3>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Vous souhaitez contribuer sans choisir de cadeau précis ? Participez librement au montant de votre choix. 🎁
        </p>

        {/* Total collected */}
        {totalAmount > 0 && (
          <div className="text-center mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-muted-foreground mb-1">Total collecté</p>
            <p className="text-2xl font-bold text-amber-600">
              {formatPrice(totalAmount)}
            </p>
          </div>
        )}

        {/* Action button */}
        <Button 
          className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-md"
          onClick={onContribute}
        >
          <HandHeart className="mr-2 h-4 w-4" />
          Contribuer librement
        </Button>

        {/* Contributors list */}
        {totalAmount > 0 && (
          <ContributorsList 
            giftId={POOL_ID}
            giftTitle={title}
            isCompleted={false}
            selectedCurrency={selectedCurrency}
            exchangeRates={exchangeRates}
          />
        )}
      </CardContent>
    </Card>
  )
}
