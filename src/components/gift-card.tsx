'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Gift as GiftType, categoryLabels, categoryIcons } from '@/types'
import { Check, Gift, HandHeart, ExternalLink, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Currency, type ExchangeRates, formatCurrency } from '@/lib/currency'
import { ContributorsProgress } from './contributors-progress'

interface GiftCardProps {
  gift: GiftType
  onReserve?: (gift: GiftType) => void
  onContribute?: (gift: GiftType) => void
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
}

export function GiftCard({ gift, onReserve, onContribute, selectedCurrency, exchangeRates }: GiftCardProps) {
  const formatPrice = (cents: number) => formatCurrency(cents, selectedCurrency, exchangeRates, true)

  const progressPercentage = gift.isPot && gift.potCurrentAmount 
    ? Math.min((gift.potCurrentAmount / gift.price) * 100, 100)
    : 0

  // Get the icon component for the category
  const CategoryIcon = categoryIcons[gift.category] || Gift
  
  const contributors = gift.contributors || []

  return (
    <Card 
      className={cn(
        "group overflow-hidden transition-all duration-300",
        !gift.isReserved && "hover:-translate-y-1 cursor-pointer",
        gift.isReserved && "cursor-default"
      )}
      onClick={() => !gift.isReserved && (gift.isPot ? onContribute?.(gift) : onReserve?.(gift))}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-muted rounded-xl mb-3">
        {gift.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gift.imageUrl}
            alt={gift.title}
            className={cn(
              "w-full h-auto object-cover transition-transform duration-500",
              !gift.isReserved && "group-hover:scale-105"
            )}
          />
        ) : (
          <div className="aspect-square flex items-center justify-center bg-[#f5f5f5]">
            <Gift className="h-12 w-12 text-dark/10" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-surface/90 backdrop-blur-sm text-xs flex items-center gap-1">
            <CategoryIcon className="h-3 w-3" />
            {categoryLabels[gift.category] || 'Autre'}
          </Badge>
        </div>


        {/* Occasion badge */}
        {gift.isOccasion && !gift.isReserved && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-accent-gold text-white text-xs border-0 px-2 py-1">
              Occasion
            </Badge>
          </div>
        )}

        {/* Action buttons on image */}
        {!gift.isReserved && (
          <>
            {/* Reserve/Contribute button - bottom left */}
            <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button

                className="flex items-center gap-2 px-4 py-3 rounded-full bg-dark text-white hover:bg-dark/90 transition-colors shadow-lg cursor-pointer"
                aria-label={gift.isPot ? 'Participer' : 'Réserver'}
              >
                {gift.isPot ? (
                  <>
                    <HandHeart className="h-5 w-5" />
                    <span className="text-sm font-medium">Cagnotter</span>
                  </>
                ) : (
                  <>
                    <Gift className="h-5 w-5" />
                    <span className="text-sm font-medium">Offrir</span>
                  </>
                )}
              </button>
            </div>

            {/* External link - bottom right */}
            {gift.externalUrl && (
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <a
                  href={gift.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-surface text-dark hover:bg-surface/90 transition-colors shadow-lg"
                  aria-label="Voir le produit"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
            )}
          </>
        )}
      </div>

      <CardContent className="p-0">
        {/* Title */}
        <h3 className="font-medium text-lg leading-tight mb-1 line-clamp-2 text-dark">
          {gift.title}
        </h3>
        
        {/* Description & Price */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {gift.description} - <span className="text-dark/60 font-bold">{formatPrice(gift.price)}</span>
        </p>

        {/* Reserved badge - shown at bottom for reserved gifts */}
        {gift.isReserved && (
          <Badge className="text-white bg-accent-red text-xs mb-3">
            <Check className="h-3 w-3 mr-1" />
            {gift.isPot ? 'Réservé' : `Réservé par ${gift.reservedBy}`}
          </Badge>
        )}

        {/* Progress for pots - Always show for pot gifts */}
        {gift.isPot && (
          <ContributorsProgress
            currentAmount={gift.potCurrentAmount || 0}
            goalAmount={gift.price}
            contributors={contributors}
            selectedCurrency={selectedCurrency}
            exchangeRates={exchangeRates}
            variant="default"
            progressPercentage={progressPercentage}
          />
        )}
      </CardContent>
    </Card>
  )
}
