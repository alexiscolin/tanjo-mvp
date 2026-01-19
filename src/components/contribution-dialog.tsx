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
import { Gift as GiftType, PaymentConfig } from '@/types'
import { HandHeart, Gift, Loader2, CheckCircle } from 'lucide-react'
import { type Currency, type ExchangeRates, formatCurrency, convertToJpy, convertFromJpy, CURRENCY } from '@/lib/currency'
import { POOL_ID } from '@/lib/constants'
import { PaymentInstructions } from './payment-instructions'

interface ContributionDialogProps {
  gift: GiftType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (contribution: { giftId: string; name: string; amount: number; message?: string }) => void
  onCancel?: () => void // Separate callback for cancellations
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
  mode: 'contribute' | 'reserve'
}

export function ContributionDialog({ 
  gift, 
  open, 
  onOpenChange, 
  onSuccess, 
  onCancel,
  selectedCurrency, 
  exchangeRates,
  mode 
}: ContributionDialogProps) {
  const isReservation = mode === 'reserve'
  const progressPercentage = gift ? ((gift.potCurrentAmount || 0) / gift.price) * 100 : 0
  const remainingAmount = gift ? gift.price - (gift.potCurrentAmount || 0) : 0
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(0) // In display currency (whole units)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [suggestedAmounts, setSuggestedAmounts] = useState<number[]>([]) // In display currency (whole units)
  const [paymentMethods, setPaymentMethods] = useState<PaymentConfig>({})
  const [submittedAmount, setSubmittedAmount] = useState(0) // In display currency (whole units)
  const [contributionId, setContributionId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleClose = () => onOpenChange(false)

  const formatPrice = (jpy: number) => formatCurrency(jpy, selectedCurrency, exchangeRates, true)
  
  // Helper to convert JPY to display currency (whole units, already rounded by convertFromJpy)
  const amountToDisplay = (jpy: number) => 
    selectedCurrency === CURRENCY.JPY 
      ? Math.round(jpy)
      : convertFromJpy(jpy, selectedCurrency, exchangeRates, 'toWholeUnits')
  
  // Fetch suggested amounts and payment methods on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/config')
        const data = await response.json()
        
        if (data.suggestedContributionsJpy) {
          setSuggestedAmounts(data.suggestedContributionsJpy.map(amountToDisplay))
        }
        
        if (data.payment) {
          setPaymentMethods(data.payment)
        }
      } catch (error) {
        console.error('Error fetching config:', error)
      }
    }
    fetchConfig()
  }, [selectedCurrency, exchangeRates])

  // Set default amount when dialog opens
  useEffect(() => {
    if (open && gift && suggestedAmounts.length > 0) {
      if (isReservation) {
        setAmount(amountToDisplay(gift.price))
      } else {
        const remaining = amountToDisplay(remainingAmount)
        const defaultAmt = remaining > 0 ? remaining : (suggestedAmounts[1] ?? suggestedAmounts[0])
        setAmount(defaultAmt)
      }
    }
  }, [open, gift, remainingAmount, isReservation, suggestedAmounts, selectedCurrency, exchangeRates])
  
  // Build suggested amounts list
  const remaining = amountToDisplay(remainingAmount)
  const suggestedAmountsList = !isReservation && remaining > 0
    ? [remaining, ...suggestedAmounts].filter((amt, idx, arr) => arr.indexOf(amt) === idx).slice(0, 4)
    : suggestedAmounts.slice(0, 4)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gift) return

    // Get amount in user's selected currency (what user sees and enters)
    const amountInUserCurrency = customAmount ? Math.round(parseFloat(customAmount)) : amount
    
    // Convert to JPY for storage in database
    const amountInJpy = selectedCurrency === CURRENCY.JPY
      ? Math.round(amountInUserCurrency)
      : convertToJpy(amountInUserCurrency * 100, selectedCurrency, exchangeRates)

    setIsSubmitting(true)
    setError('')
    
    try {
      // Use different endpoint for pool contributions
      const endpoint = gift.id === POOL_ID 
        ? '/api/pool/contributions'
        : `/api/gifts/${gift.id}/contributions`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          amount: amountInJpy,              // JPY for database storage
          currency: selectedCurrency,       // User's selected currency (for email display)
          message: message || undefined,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Error submitting ${isReservation ? 'reservation' : 'contribution'}`)
      }
      
      const data = await response.json()
      
      // Store the amount in user's currency for display in success message
      setSubmittedAmount(amountInUserCurrency)
      setContributionId(data.contributionId)
      setIsSuccess(true)
      
      // Call onSuccess with contribution data for optimistic update
      if (onSuccess) {
        onSuccess({
          giftId: gift.id,
          name: name.trim(),
          amount: amountInJpy,
          message: message?.trim() || undefined,
        })
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Error submitting ${isReservation ? 'reservation' : 'contribution'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelContribution = async () => {
    if (!contributionId) {
      setError('Missing contribution ID')
      return
    }

    setIsCancelling(true)
    setError('')
    
    try {
      const response = await fetch(`/api/contributions/${contributionId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error cancelling contribution')
      }
      
      setIsSuccess(false)
      setName('')
      setEmail('')
      setAmount(0)
      setCustomAmount('')
      setMessage('')
      setContributionId(null)
      setSubmittedAmount(0)
      
      if (onCancel) {
        onCancel()
      }
      
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cancelling contribution')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleSuccessClose = () => {
    setIsSuccess(false)
    setName('')
    setEmail('')
    setAmount(0)
    setCustomAmount('')
    setMessage('')
    setContributionId(null)
    setSubmittedAmount(0)
    handleClose()
  }

  const hasPaymentMethods = paymentMethods.weroPhone || 
    paymentMethods.paypayId || paymentMethods.paypayQrUrl || paymentMethods.paypalMeUsername

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleSuccessClose}>
        <DialogContent onClose={handleSuccessClose} className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <DialogTitle>Merci {name} !</DialogTitle>
                <DialogDescription>
                  {isReservation ? 'Votre réservation a été enregistrée.' : 'Votre contribution a été enregistrée.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {hasPaymentMethods ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Pour finaliser {isReservation ? 'votre réservation' : 'votre contribution'}, effectuez le paiement ci-dessous :
              </p>
              <PaymentInstructions
                amount={submittedAmount}
                currency={selectedCurrency}
                paymentConfig={paymentMethods}
                contributorName={name}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Vous allez recevoir un email de confirmation avec les instructions de paiement.
            </p>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelContribution}
              disabled={isCancelling}
              className="w-full sm:w-auto cursor-pointer"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Annulation...
                </>
              ) : (
                `Annuler ${isReservation ? 'ma réservation' : 'ma contribution'}`
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSuccessClose}
              className="w-full sm:w-auto cursor-pointer"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (!gift) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose} className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isReservation ? (
              <Gift className="h-5 w-5 text-accent-red" />
            ) : (
              <HandHeart className="h-5 w-5 text-accent-red" />
            )}
            <DialogTitle>
              {isReservation ? 'Réserver ce cadeau' : 'Participer à la cagnotte'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isReservation 
              ? 'Réservez ce cadeau en remplissant le formulaire ci-dessous.'
              : gift.id === POOL_ID
                ? 'Participez au montant de votre choix à notre cagnotte libre.'
                : 'Participez au montant de votre choix pour ce cadeau.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="pt-4 rounded-lg mb-2">
          <h4 className="font-bold text-lg leading-tight mb-1">{gift.title}</h4>
          {gift.imageUrl && (
            <img src={gift.imageUrl} alt={gift.title} className="w-full aspect-video object-cover rounded-xl mb-2" />
          )}
          {!isReservation && gift.isPot && gift.price > 0 && (
            <div className="space-y-1 mb-2">
              <p className="text-sm text-muted-foreground">
                {formatPrice(gift.potCurrentAmount || 0)} collectés (<span className="text-accent-red font-medium">{Math.round(progressPercentage)}%</span>)
              </p>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-linear-to-r from-accent-red to-accent-red/80 h-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
          {/* Show remaining amount for gifts with target, or total collected for pool */}
          {gift.id === POOL_ID && gift.isPot ? (
            <p className="text-lg font-semibold text-accent-red">
              {formatPrice(gift.potCurrentAmount || 0)} collectés
            </p>
          ) : gift.price > 0 && (
            <p className="text-lg font-semibold text-accent-red">
              {isReservation ? formatPrice(gift.price) : `${formatPrice(remainingAmount)} restants`}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount selection (only for contribute mode) */}
          {!isReservation && (
            <div>
              <Label>Montant de votre participation</Label>
              <div className="grid grid-cols-4 gap-2 mt-1.5 mb-2">
                {suggestedAmountsList.map((amt, idx) => {
                  const isTotal = idx === 0 && amt === remaining
                  const symbol = selectedCurrency === CURRENCY.EUR ? '€' : selectedCurrency === CURRENCY.USD ? '$' : '¥'
                  const displayAmt = Math.round(amt) // Ensure no decimals
                  
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
                      className="text-xs"
                    >
                      {isTotal ? (
                        <>
                          <span className="block">{displayAmt}{symbol}</span>
                          <span className="block text-[10px] opacity-80">Total</span>
                        </>
                      ) : (
                        `${displayAmt}${symbol}`
                      )}
                    </Button>
                  )
                })}
              </div>
              
              <div className="relative">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder={`Montant personnalisé (${selectedCurrency})`}
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value)
                    setAmount(0)
                  }}
                />
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <Label htmlFor="name">Votre prénom *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jean"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Votre email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jean@example.com"
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Un petit mot doux..."
              rows={3}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full cursor-pointer">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  {isReservation ? <Gift className="mr-2 h-4 w-4" /> : <HandHeart className="mr-2 h-4 w-4" />}
                  {isReservation ? 'Réserver' : 'Participer'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
