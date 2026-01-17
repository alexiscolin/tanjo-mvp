'use client'

import * as React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Users, Loader2, Heart, ArrowLeft } from 'lucide-react'
import { type Currency, type ExchangeRates, formatCurrency } from '@/lib/currency'
import { POOL_ID } from '@/lib/constants'

interface Contribution {
  id: string
  name: string
  amount: number
  message?: string
  createdAt: string
}

interface ContributorsListProps {
  giftId: string
  giftTitle: string
  giftPrice?: number
  giftCurrentAmount?: number
  isCompleted?: boolean
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
  onBack?: () => void // Callback to return to card view
}

export function ContributorsList({ 
  giftId, 
  giftTitle, 
  giftPrice,
  isCompleted,
  selectedCurrency, 
  exchangeRates,
  onBack
}: ContributorsListProps) {
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const isFreeContribution = giftId === POOL_ID
  const showAmounts = !isFreeContribution && !isCompleted
  
  // Calculate percentage for each contribution
  const getContributionPercentage = (amount: number) => {
    if (!giftPrice || giftPrice === 0) return 0
    return Math.round((amount / giftPrice) * 100)
  }

  const fetchContributions = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/gifts/${giftId}/contributions`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement')
      }
      
      setContributions(data.contributions || [])
    } catch (err) {
      console.error('Error fetching contributions:', err)
      setError('Unable to load contributions')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch on mount
  React.useEffect(() => {
    fetchContributions()
  }, [giftId])

  const formatDate = (isoDate: string) => {
    try {
      const date = new Date(isoDate)
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date)
    } catch {
      return ''
    }
  }

  // Contributors list view (replaces card content)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-xs"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Retour
          </Button>
        )}
        <div className="flex items-center gap-2 text-rose-500 ml-auto">
          <Heart className="h-4 w-4" />
          <span className="text-sm font-medium">Contributeurs</span>
        </div>
      </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-sm text-destructive">
              {error}
            </div>
          ) : contributions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Aucune contribution pour le moment
            </div>
          ) : (
            contributions.map((contribution) => (
              <div 
                key={contribution.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border"
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white font-medium text-xs shrink-0">
                  {contribution.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-xs">{contribution.name}</p>
                    {showAmounts && (
                      <span className="font-semibold text-amber-600 text-xs whitespace-nowrap">
                        {getContributionPercentage(contribution.amount)}%
                      </span>
                    )}
                  </div>
                  {contribution.message && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-2">
                      &quot;{contribution.message}&quot;
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(contribution.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
}
