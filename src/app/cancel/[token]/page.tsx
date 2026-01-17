'use client'

import { useState, useEffect, use } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, XCircle, CheckCircle, AlertTriangle, ArrowLeft, Gift } from 'lucide-react'
import Link from 'next/link'

interface ContributionInfo {
  id: string
  giftId: string
  giftTitle: string
  name: string
  amount: number
  createdAt: string
}

export default function CancelContributionPage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const { token } = use(params)
  
  const [contribution, setContribution] = useState<ContributionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [feedback, setFeedback] = useState('')

  const formatPrice = (jpy: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(jpy)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date)
  }

  // Fetch contribution info on mount
  useEffect(() => {
    const fetchContribution = async () => {
      try {
        const response = await fetch(`/api/cancel/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Contribution introuvable')
          return
        }

        setContribution(data.contribution)
      } catch {
        setError('Erreur lors du chargement')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContribution()
  }, [token])

  const handleCancel = async () => {
    if (!contribution) return

    setIsCancelling(true)
    setError(null)

    try {
      const response = await fetch(`/api/cancel/${token}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback || undefined }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'annulation')
      }

      setIsCancelled(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'annulation')
    } finally {
      setIsCancelling(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-rose-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  // Error state (contribution not found)
  if (error && !contribution) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Lien invalide</h1>
          <p className="text-muted-foreground mb-6">
            Ce lien d&apos;annulation n&apos;est plus valide ou la contribution a déjà été annulée.
          </p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la liste
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Success state (cancelled)
  if (isCancelled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Annulation confirmée</h1>
          <p className="text-muted-foreground mb-6">
            Votre participation a bien été annulée. Un email de confirmation vous a été envoyé.
          </p>
          <Link href="/">
            <Button>
              <Gift className="mr-2 h-4 w-4" />
              Voir la liste de naissance
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Main cancellation form
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-400 to-pink-400 p-6 text-white text-center">
          <XCircle className="h-12 w-12 mx-auto mb-3 opacity-90" />
          <h1 className="text-xl font-bold">Annuler ma participation</h1>
        </div>

        {/* Content */}
        <div className="p-6">
          {contribution && (
            <>
              {/* Contribution summary */}
              <div className="bg-rose-50 rounded-xl p-4 mb-6">
                <h2 className="font-semibold text-lg mb-2">{contribution.giftTitle}</h2>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="text-rose-500 font-medium">{formatPrice(contribution.amount)}</span>
                    {' '}par {contribution.name}
                  </p>
                  <p>Le {formatDate(contribution.createdAt)}</p>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Attention</p>
                    <p>
                      Cette action est irréversible. Votre participation sera supprimée de la liste.
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="mb-6">
                <Label htmlFor="feedback" className="text-sm">
                  Raison de l&apos;annulation (optionnel)
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Dites-nous pourquoi vous annulez..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              {/* Error display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleCancel}
                  disabled={isCancelling}
                  variant="destructive"
                  className="w-full"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Annulation en cours...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Confirmer l&apos;annulation
                    </>
                  )}
                </Button>

                <Link href="/" className="w-full">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Non, garder ma participation
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
