'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Users, Loader2, Heart } from 'lucide-react'
import { type Currency, type ExchangeRates, formatCurrency } from '@/lib/currency'
import { FREE_CONTRIBUTION_ID } from '@/lib/constants'

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
}

export function ContributorsList({ 
  giftId, 
  giftTitle, 
  giftPrice,
  isCompleted,
  selectedCurrency, 
  exchangeRates 
}: ContributorsListProps) {
  const [open, setOpen] = useState(false)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const isFreeContribution = giftId === FREE_CONTRIBUTION_ID
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
      setError('Impossible de charger les contributions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    fetchContributions()
  }

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

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleOpen}
        className="w-full text-xs text-muted-foreground hover:text-foreground"
      >
        <Users className="mr-1.5 h-3.5 w-3.5" />
        Voir les contributeurs
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Contributeurs
            </DialogTitle>
            <DialogDescription>
              {giftTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
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
              <div className="space-y-3">
                {contributions.map((contribution) => (
                  <div 
                    key={contribution.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                      {contribution.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{contribution.name}</p>
                        {showAmounts && (
                          <span className="font-semibold text-amber-600 text-sm whitespace-nowrap">
                            {getContributionPercentage(contribution.amount)}%
                          </span>
                        )}
                      </div>
                      {contribution.message && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          &quot;{contribution.message}&quot;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(contribution.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
