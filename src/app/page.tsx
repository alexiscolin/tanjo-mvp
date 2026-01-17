'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { GiftCard } from '@/components/gift-card'
import { FreeContributionCard } from '@/components/free-contribution-card'
import { ContributionDialog } from '@/components/contribution-dialog'
import { CurrencySelector } from '@/components/currency-selector'
import type { Gift, GiftCategory, ListInfo } from '@/types'
import { categoryLabels, allCategories } from '@/types'
import { Heart, Calendar, Gift as GiftIcon, Loader2, Settings } from 'lucide-react'
import Link from 'next/link'
import { type Currency, type ExchangeRates, detectPreferredCurrency } from '@/lib/currency'
import { POOL_ID } from '@/lib/constants'

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
  const [showOccasionOnly, setShowOccasionOnly] = useState(false)
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)

  const fetchGifts = useCallback(async () => {
    try {
      // Fetch registry data (cached) + free contributions (always fresh)
      const [registryResponse, freeContribResponse] = await Promise.all([
        fetch('/api/registry', { cache: 'no-store' }), // Force fresh data
        fetch(`/api/gifts/${POOL_ID}/contributions`).catch(() => ({ json: () => ({ contributions: [] }) }))
      ])
      
      const registryData = await registryResponse.json()
      const freeContribData = await freeContribResponse.json()
      
      setGifts(registryData.gifts || [])
      setListInfo(registryData.listInfo || null)
      
      if (registryData.exchangeRates) {
        setExchangeRates(registryData.exchangeRates)
      }
      
      // Calculate total free contributions (always fresh, not cached)
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

  const filteredGifts = gifts
    .filter(g => selectedCategory === 'all' || g.category === selectedCategory)
    .filter(g => !showOccasionOnly || g.isOccasion)
    .filter(g => !showAvailableOnly || !g.isReserved)

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
      <header className="relative overflow-hidden bg-linear-to-br from-rose-50 via-pink-50 to-white">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(#fda4af_1px,transparent_1px)] bg-size-[24px_24px]" />
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
        {/* Category filters + Toggles */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-4">
            {/* Category buttons */}
            <div className="overflow-x-auto pb-2 flex-1">
              <div className="flex gap-2 min-w-max">
                {allCategories.map((category) => (
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

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <Switch
                  id="occasion-toggle-home"
                  checked={showOccasionOnly}
                  onCheckedChange={setShowOccasionOnly}
                />
                <Label htmlFor="occasion-toggle-home" className="text-sm cursor-pointer whitespace-nowrap">
                  Occasion uniquement
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="available-toggle-home"
                  checked={showAvailableOnly}
                  onCheckedChange={setShowAvailableOnly}
                />
                <Label htmlFor="available-toggle-home" className="text-sm cursor-pointer whitespace-nowrap">
                  Disponibles uniquement
                </Label>
              </div>
            </div>
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
                      id: POOL_ID,
                      title: listInfo.freeContributionTitle || 'Contribution libre 💝',
                      description: 'Montant libre pour nous aider',
                      price: 0, // Pool has no target price
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
      <ContributionDialog
        gift={reserveGift}
        open={!!reserveGift}
        onOpenChange={(open) => !open && setReserveGift(null)}
        onSuccess={fetchGifts}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
        mode="reserve"
      />
      <ContributionDialog
        gift={contributeGift}
        open={!!contributeGift}
        onOpenChange={(open) => !open && setContributeGift(null)}
        onSuccess={fetchGifts}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
        mode="contribute"
      />
    </div>
  )
}
