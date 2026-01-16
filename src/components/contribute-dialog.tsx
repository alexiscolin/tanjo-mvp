'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Gift as GiftType } from '@/types'
import { HandHeart, Loader2, CheckCircle } from 'lucide-react'
import { type Currency, type ExchangeRates, formatCurrency, convertToJpy, convertFromJpy } from '@/lib/currency'
import { DEFAULT_CONFIG } from '@/lib/constants'

interface ContributeDialogProps {
  gift: GiftType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
}

export function ContributeDialog({ gift, open, onOpenChange, onSuccess, selectedCurrency, exchangeRates }: ContributeDialogProps) {
  const progressPercentage = gift ? ((gift.potCurrentAmount || 0) / gift.price) * 100 : 0
  const remainingAmount = gift ? gift.price - (gift.potCurrentAmount || 0) : 0
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(0) // Will be set on mount
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [configAmounts, setConfigAmounts] = useState<number[]>([...DEFAULT_CONFIG.SUGGESTED_CONTRIBUTIONS_JPY])

  const handleClose = () => onOpenChange(false)

  const formatPrice = (cents: number) => formatCurrency(cents, selectedCurrency, exchangeRates)
  
  // Set default amount to remaining amount when dialog opens
  useEffect(() => {
    if (open && gift) {
      setAmount(remainingAmount || DEFAULT_CONFIG.SUGGESTED_CONTRIBUTIONS_JPY[1])
    }
  }, [open, gift, remainingAmount])
  
  // Build suggested amounts: [total, ...config amounts] limited to 4
  const suggestedAmounts = gift && remainingAmount > 0 
    ? [remainingAmount, ...configAmounts].filter((amt, idx, arr) => arr.indexOf(amt) === idx).slice(0, 4)
    : configAmounts.slice(0, 4)
  
  // Fetch config amounts on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config')
        const data = await response.json()
        if (data.suggestedContributionsJpy) {
          setConfigAmounts(data.suggestedContributionsJpy)
        }
      } catch (error) {
        console.error('Error fetching config:', error)
      }
    }
    fetchConfig()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gift) return

    // Convert amount to JPY (base currency)
    let finalAmount: number
    if (customAmount) {
      // Custom amount entered by user (in their selected currency)
      const amountInCents = Math.round(parseFloat(customAmount) * 100)
      finalAmount = convertToJpy(amountInCents, selectedCurrency, exchangeRates)
    } else {
      // Suggested amount (already in JPY)
      finalAmount = amount
    }

    setIsSubmitting(true)
    setError('')
    
    try {
      const response = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giftId: gift.id,
          name,
          email,
          amount: finalAmount,
          message: message || undefined,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la contribution')
      }
      
      setIsSuccess(true)
      setTimeout(() => {
        setName('')
        setEmail('')
        setAmount(remainingAmount || 2500)
        setCustomAmount('')
        setMessage('')
        setIsSuccess(false)
        onOpenChange(false)
        onSuccess?.()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!gift) return null

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent onClose={handleClose} className="sm:max-w-md">
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Merci {name} !</h3>
            <p className="text-muted-foreground">
              Votre contribution a été enregistrée. Vous allez recevoir un email de confirmation.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={handleClose} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandHeart className="h-5 w-5 text-rose-500" />
            Participer
          </DialogTitle>
          <DialogDescription>
            Contribuez au montant de votre choix.
          </DialogDescription>
        </DialogHeader>

        {/* Gift info */}
        <div className="p-4 bg-rose-50 rounded-lg mb-2">
          <h4 className="font-medium mb-2">{gift.title}</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Collecté</span>
              <span className="font-medium">{formatPrice(gift.potCurrentAmount || 0)}</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reste</span>
              <span className="font-semibold text-rose-600">{formatPrice(remainingAmount)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount selection */}
          <div>
            <Label>Montant de votre participation</Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5 mb-2">
              {suggestedAmounts.map((amt, idx) => {
                // Convert JPY amount to selected currency for display
                const isTotal = idx === 0 && amt === remainingAmount
                
                const amountInSelectedCurrency = (() => {
                  if (selectedCurrency === 'JPY') {
                    return Math.round(amt)
                  }
                  // Convert JPY to EUR/USD cents first, then to currency value
                  const converted = convertFromJpy(amt, selectedCurrency, exchangeRates)
                  const value = converted / 100 // Convert cents to currency units
                  // Keep decimals for total, round for others
                  return isTotal ? value.toFixed(2) : Math.round(value)
                })()
                
                const currencySymbol = selectedCurrency === 'EUR' ? '€' : selectedCurrency === 'USD' ? '$' : '¥'
                const displayAmount = `${amountInSelectedCurrency}${currencySymbol}`
                
                return (
                  <Button
                    key={`${amt}-${idx}`}
                    type="button"
                    variant={amount === amt && !customAmount ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setAmount(amt)
                      setCustomAmount('')
                    }}
                    className={amount === amt && !customAmount ? 'bg-rose-500 hover:bg-rose-600' : ''}
                  >
                    {idx === 0 && amt === remainingAmount ? (
                      <span className="flex flex-col items-center">
                        <span className="text-[10px] opacity-70">Total</span>
                        <span>{displayAmount}</span>
                      </span>
                    ) : (
                      displayAmount
                    )}
                  </Button>
                )
              })}
            </div>
            <Input
              type="number"
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`Autre montant (${selectedCurrency})`}
              min="1"
            />
            {customAmount && parseFloat(customAmount) > 0 && (() => {
              const amountInCents = Math.round(parseFloat(customAmount) * 100)
              const amountInJpy = convertToJpy(amountInCents, selectedCurrency, exchangeRates)
              return (
                <p className="text-xs text-muted-foreground mt-1">
                  Montant final : {formatPrice(amountInJpy)}
                </p>
              )
            })()}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="contrib-name">Nom *</Label>
              <Input
                id="contrib-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marie"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="contrib-email">Email *</Label>
              <Input
                id="contrib-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marie@email.com"
                required
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contrib-message">Message (optionnel)</Label>
            <Textarea
              id="contrib-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Un petit mot..."
              rows={2}
              className="mt-1.5"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Annuler
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <HandHeart className="mr-2 h-4 w-4" />
                  Contribuer {customAmount 
                    ? formatPrice(convertToJpy(Math.round(parseFloat(customAmount) * 100), selectedCurrency, exchangeRates))
                    : formatPrice(amount)
                  }
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
