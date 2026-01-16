'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GiftCard } from '@/components/gift-card'
import { FreeContributionCard } from '@/components/free-contribution-card'
import { ReserveDialog } from '@/components/reserve-dialog'
import { ContributeDialog } from '@/components/contribute-dialog'
import { CurrencySelector } from '@/components/currency-selector'
import type { Gift, GiftCategory, ListInfo } from '@/types'
import { categoryLabels } from '@/types'
import { Heart, Calendar, Gift as GiftIcon, Loader2, Settings } from 'lucide-react'
import Link from 'next/link'
import { type Currency, type ExchangeRates, detectPreferredCurrency } from '@/lib/currency'
import { FREE_CONTRIBUTION_ID, FREE_CONTRIBUTION_PRICE } from '@/lib/constants'

const categories: (GiftCategory | 'all')[] = ['all', 'chambre', 'vetements', 'repas', 'bain', 'transport', 'jouets', 'experiences', 'autre']

export default function HomePage() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [listInfo, setListInfo] = useState<ListInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<GiftCategory | 'all'>('all')
  const [reserveGift, setReserveGift] = useState<Gift | null>(null)
  const [contributeGift, setContributeGift] = useState<Gift | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('JPY')
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ EUR: 0.00625, USD: 0.0069 })
  const [freeContributionTotal, setFreeContributionTotal] = useState(0)

  const fetchGifts = useCallback(async () => {
    try {
      // Fetch gifts, exchange rates and free contributions in parallel
      const [giftsResponse, ratesResponse, freeContribResponse] = await Promise.all([
        fetch('/api/gifts'),
        fetch('/api/exchange-rate'),
        fetch(`/api/gifts/${FREE_CONTRIBUTION_ID}/contributions`).catch(() => ({ json: () => ({ contributions: [] }) }))
      ])
      
      const giftsData = await giftsResponse.json()
      const ratesData = await ratesResponse.json()
      const freeContribData = await freeContribResponse.json()
      
      setGifts(giftsData.gifts || [])
      setListInfo(giftsData.listInfo || null)
      
      if (ratesData.rates) {
        setExchangeRates(ratesData.rates)
      }
      
      // Calculate total free contributions
      const total = (freeContribData.contributions || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
      setFreeContributionTotal(total)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Detect preferred currency on load (no permission needed!)
  useEffect(() => {
    const preferredCurrency = detectPreferredCurrency()
    setSelectedCurrency(preferredCurrency)
    console.log('🌍 Currency automatically detected:', preferredCurrency)
  }, [])

  useEffect(() => {
    fetchGifts()
  }, [fetchGifts])

  const filteredGifts = selectedCategory === 'all' 
    ? gifts 
    : gifts.filter(g => g.category === selectedCategory)

  const stats = {
    total: gifts.length,
    reserved: gifts.filter(g => g.isReserved).length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero / Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(#fda4af_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
        
        <div className="relative container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* Cover image */}
            {listInfo?.coverImageUrl && (
              <div className="relative w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-4 border-white shadow-xl">
                <Image
                  src={listInfo.coverImageUrl}
                  alt="Photo"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            
            <Badge className="mb-4 bg-rose-100 text-rose-700 border-rose-200">
              <Heart className="mr-1 h-3 w-3 fill-current" />
              Liste de Naissance
            </Badge>
            
            <h1 className="font-serif text-3xl md:text-5xl font-medium tracking-tight mb-3">
              {listInfo?.title || 'Notre Liste de Naissance'}
            </h1>
            
            {listInfo?.subtitle && (
              <p className="text-xl text-muted-foreground mb-4">
                {listInfo.subtitle}
              </p>
            )}
            
            {listInfo?.expectedDate && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 mb-6">
                <Calendar className="h-4 w-4" />
                Prévu pour {listInfo.expectedDate}
              </p>
            )}
            
            {listInfo?.description && (
              <p className="text-muted-foreground max-w-xl mx-auto">
                {listInfo.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mt-8">
              <div className="text-center">
                <p className="text-2xl font-semibold text-rose-500">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Cadeaux</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-500">{stats.reserved}</p>
                <p className="text-sm text-muted-foreground">Réservés</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-semibold text-muted-foreground">{stats.total - stats.reserved}</p>
                <p className="text-sm text-muted-foreground">Disponibles</p>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="flex justify-center mt-6">
              <CurrencySelector
                selectedCurrency={selectedCurrency}
                onCurrencyChange={setSelectedCurrency}
              />
            </div>
          </div>
        </div>

        {/* Admin link (discreet) */}
        <Link 
          href="/admin" 
          className="absolute top-4 right-4 p-2 text-muted-foreground/30 hover:text-muted-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Category filters */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category 
                  ? 'bg-rose-500 hover:bg-rose-600' 
                  : ''
                }
              >
                {category === 'all' ? '✨ Tous' : categoryLabels[category]}
              </Button>
            ))}
          </div>
        </div>

        {/* Gifts Grid */}
        {filteredGifts.length === 0 && !listInfo?.enableFreeContribution ? (
          <div className="text-center py-16">
            <GiftIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {gifts.length === 0 
                ? 'Aucun cadeau pour le moment.' 
                : 'Aucun cadeau dans cette catégorie.'}
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {/* Free contribution card (always first if enabled) */}
            {listInfo?.enableFreeContribution && selectedCategory === 'all' && (
              <div className="break-inside-avoid">
                <FreeContributionCard
                  title={listInfo.freeContributionTitle || 'Contribution libre 💝'}
                  totalAmount={freeContributionTotal}
                  onContribute={() => {
                    // Create a fake gift for free contribution
                    const fakeGift: Gift = {
                      id: FREE_CONTRIBUTION_ID,
                      title: listInfo.freeContributionTitle || 'Contribution libre 💝',
                      description: 'Montant libre pour nous aider',
                      price: FREE_CONTRIBUTION_PRICE, // Very high so there's no "goal"
                      imageUrl: '',
                      category: 'autre',
                      isPot: true,
                      potCurrentAmount: freeContributionTotal,
                      isReserved: false,
                    }
                    setContributeGift(fakeGift)
                  }}
                  selectedCurrency={selectedCurrency}
                  exchangeRates={exchangeRates}
                />
              </div>
            )}
            
            {/* Regular gift cards */}
            {filteredGifts.map((gift) => (
              <div key={gift.id} className="break-inside-avoid">
                <GiftCard 
                  gift={gift} 
                  onReserve={setReserveGift}
                  onContribute={setContributeGift}
                  selectedCurrency={selectedCurrency}
                  exchangeRates={exchangeRates}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>Fait avec 💕 pour {listInfo?.babyName || 'notre bébé'}</p>
      </footer>

      {/* Dialogs */}
      <ReserveDialog
        gift={reserveGift}
        open={!!reserveGift}
        onOpenChange={(open) => !open && setReserveGift(null)}
        onSuccess={fetchGifts}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
      />
      <ContributeDialog
        gift={contributeGift}
        open={!!contributeGift}
        onOpenChange={(open) => !open && setContributeGift(null)}
        onSuccess={fetchGifts}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
      />
    </div>
  )
}
