'use client'

import { useState } from 'react'
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
import { Gift, Loader2, CheckCircle } from 'lucide-react'
import { type Currency, type ExchangeRates, formatCurrency } from '@/lib/currency'

interface ReserveDialogProps {
  gift: GiftType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  selectedCurrency: Currency
  exchangeRates: ExchangeRates
}

export function ReserveDialog({ gift, open, onOpenChange, onSuccess, selectedCurrency, exchangeRates }: ReserveDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => onOpenChange(false)

  const formatPrice = (cents: number) => formatCurrency(cents, selectedCurrency, exchangeRates)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gift) return

    setIsSubmitting(true)
    setError('')
    
    try {
      const response = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giftId: gift.id,
          name,
          email,
          message: message || undefined,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la réservation')
      }
      
      setIsSuccess(true)
      setTimeout(() => {
        setName('')
        setEmail('')
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
              Votre réservation a été enregistrée. Vous allez recevoir un email de confirmation.
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
            <Gift className="h-5 w-5 text-rose-500" />
            Réserver ce cadeau
          </DialogTitle>
          <DialogDescription>
            Vous vous engagez à offrir ce cadeau aux futurs parents.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-rose-50 rounded-lg mb-4">
          <h4 className="font-medium mb-1">{gift.title}</h4>
          <p className="text-lg font-semibold text-rose-500">
            {formatPrice(gift.price)}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Votre nom *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marie Dupont"
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="email">Votre email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="marie@email.com"
              required
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Vous recevrez une confirmation par email
            </p>
          </div>

          <div>
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Un petit mot pour les parents..."
              rows={3}
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
                  Réservation...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Confirmer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
