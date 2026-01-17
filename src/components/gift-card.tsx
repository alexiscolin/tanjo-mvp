'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Gift as GiftType, categoryLabels } from '@/types'
import { Check, Gift, HandHeart, ExternalLink, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Currency, type ExchangeRates, formatCurrency } from '@/lib/currency'
import { ContributorsList } from './contributors-list'

interface GiftCardProps {
  gift: GiftType
  onReserve?: (gift: GiftType) => void
  onContribute?: (gift: GiftType) => void
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
}

export function GiftCard({ gift, onReserve, onContribute, selectedCurrency, exchangeRates }: GiftCardProps) {
  const [showContributors, setShowContributors] = useState(false)
  const formatPrice = (cents: number) => formatCurrency(cents, selectedCurrency, exchangeRates)

  const progressPercentage = gift.isPot && gift.potCurrentAmount 
    ? Math.min((gift.potCurrentAmount / gift.price) * 100, 100)
    : 0

  const hasContributors = gift.isPot && (gift.potCurrentAmount || 0) > 0

  return (
    <Card className={cn(
      "group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
      gift.isReserved && "opacity-75"
    )}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {gift.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gift.imageUrl}
            alt={gift.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100">
            <Gift className="h-12 w-12 text-rose-300" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-xs">
            {categoryLabels[gift.category] || '🎁 Autre'}
          </Badge>
        </div>

        {/* Reserved overlay */}
        {gift.isReserved && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <Badge className="bg-green-500 text-white border-0 text-sm px-4 py-2">
              <Check className="mr-2 h-4 w-4" />
              {gift.isPot ? 'Objectif atteint !' : 'Réservé'}
            </Badge>
          </div>
        )}

        {/* External link */}
        {gift.externalUrl && (
          <a
            href={gift.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}
      </div>

      <CardContent className="p-4">
        {showContributors && hasContributors ? (
          /* Contributors view - remplace tout le contenu */
          <ContributorsList 
            giftId={gift.id}
            giftTitle={gift.title}
            giftPrice={gift.price}
            giftCurrentAmount={gift.potCurrentAmount}
            isCompleted={gift.isReserved}
            selectedCurrency={selectedCurrency}
            exchangeRates={exchangeRates}
            onBack={() => setShowContributors(false)}
          />
        ) : (
          /* Normal view */
          <>
            {/* Title & Description */}
            <h3 className="font-medium text-lg leading-tight mb-2 line-clamp-2">
              {gift.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {gift.description}
            </p>

            {/* Price */}
            <div className="mb-4">
              <p className="text-xl font-semibold text-foreground mb-2">
                {formatPrice(gift.price)}
              </p>
              
              {gift.isPot && (gift.potCurrentAmount || 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(gift.potCurrentAmount || 0)} collectés (<span className="text-rose-500 font-medium">{Math.round(progressPercentage)}%</span>)
                  </p>
                  <div className="relative h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action button */}
            {!gift.isReserved && (
              <>
                {gift.isPot ? (
                  <Button 
                    className="w-full bg-rose-500 hover:bg-rose-600"
                    onClick={() => onContribute?.(gift)}
                  >
                    <HandHeart className="mr-2 h-4 w-4" />
                    Participer
                  </Button>
                ) : (
                  <Button 
                    className="w-full bg-rose-500 hover:bg-rose-600"
                    onClick={() => onReserve?.(gift)}
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Je l'offre
                  </Button>
                )}
              </>
            )}

            {/* Contributors button */}
            {hasContributors && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowContributors(true)}
                className="w-full text-xs text-muted-foreground hover:text-foreground mt-2"
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Voir les contributeurs
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
