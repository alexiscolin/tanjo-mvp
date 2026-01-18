'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { GiftCard } from '@/components/gift-card'
import { FreeContributionCard } from '@/components/free-contribution-card'
import { ContributionDialog } from '@/components/contribution-dialog'
import { CurrencySelector } from '@/components/currency-selector'
import type { Gift, GiftCategory, ListInfo } from '@/types'
import { categoryLabels, allCategories, categoryIcons } from '@/types'
import {Gift as GiftIcon, Loader2, Sparkles as SparklesIcon } from 'lucide-react'
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
  const [showOccasionOnly, setShowOccasionOnly] = useState(false)
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)

  const fetchGifts = useCallback(async () => {
    try {
      // Fetch all registry data in one call (gifts with contributors included)
      const registryResponse = await fetch('/api/registry', { cache: 'no-store' })
      const registryData = await registryResponse.json()
      
      setGifts(registryData.gifts || [])
      setListInfo(registryData.listInfo || null)
      
      if (registryData.exchangeRates) {
        setExchangeRates(registryData.exchangeRates)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Optimistic update: add contribution to gift instantly
  const handleContributionSuccess = useCallback((contribution: {
    giftId: string
    name: string
    amount: number
    message?: string
  }) => {
    setGifts(prevGifts => prevGifts.map(gift => {
      if (gift.id !== contribution.giftId) return gift

      // Create new contribution
      const newContribution = {
        id: `temp-${Date.now()}`,
        giftId: contribution.giftId,
        name: contribution.name,
        email: '', // Not needed for display
        amount: contribution.amount,
        message: contribution.message,
        createdAt: new Date().toISOString(),
      }

      // Update gift
      const newPotAmount = (gift.potCurrentAmount || 0) + contribution.amount
      const isNowReserved = gift.isPot 
        ? newPotAmount >= gift.price 
        : true

      return {
        ...gift,
        contributors: [...(gift.contributors || []), newContribution],
        potCurrentAmount: newPotAmount,
        isReserved: isNowReserved,
        reservedBy: isNowReserved && !gift.isPot ? contribution.name : gift.reservedBy,
      }
    }))
  }, [])

  useEffect(() => {
    const preferredCurrency = detectPreferredCurrency()
    setSelectedCurrency(preferredCurrency)
  }, [])

  useEffect(() => {
    fetchGifts()
  }, [fetchGifts])

  const filteredGifts = gifts
    .filter(g => g.id !== POOL_ID) // Hide POOL gift (has its own FreeContributionCard)
    .filter(g => selectedCategory === 'all' || g.category === selectedCategory)
    .filter(g => !showOccasionOnly || g.isOccasion)
    .filter(g => !showAvailableOnly || !g.isReserved)

  // Extract POOL gift from gifts (if it exists)
  const poolGift = gifts.find(g => g.id === POOL_ID)
  const freeContributionTotal = poolGift?.potCurrentAmount || 0
  const freeContributionContributors = poolGift?.contributors || []

  // Debug: Log if POOL is not found
  useEffect(() => {
    if (listInfo?.enableFreeContribution && !poolGift && gifts.length > 0) {
      console.warn('⚠️ POOL gift not found in Google Sheets. Add a gift with ID="POOL" and isPot="OUI"')
    }
  }, [poolGift, gifts, listInfo])

  // Only show categories that have at least one gift (excluding POOL)
  const categoriesWithGifts = new Set(
    gifts
      .filter(g => g.id !== POOL_ID) // Don't count POOL in categories
      .map(g => g.category)
  )
  const availableCategories: (GiftCategory | 'all')[] = [
    'all',
    ...allCategories.filter(cat => cat !== 'all' && categoriesWithGifts.has(cat))
  ]

  const stats = {
    total: gifts.filter(g => g.id !== POOL_ID).length,
    reserved: gifts.filter(g => g.id !== POOL_ID && g.isReserved).length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-accent-red" />
      </div>
    )
  }

  return (
    <div>
      {/* Hero Section */}
      <section>
        {/* Logo fake en haut à gauche */}
        <div className="fixed top-6 left-6 z-20">
          <div className="text-2xl font-bold tracking-tight text-dark">
            CAMILLE
          </div>
        </div>

        {/* Currency selector discret en haut à droite */}
        <div className="fixed top-6 right-6 z-20">
          <div className="opacity-60 hover:opacity-100 transition-opacity">
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
            />
          </div>
        </div>

        {/* Images */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Image 1 - Large, top left */}
          <div className="absolute top-4 left-1/4 w-80 h-96 z-10 -rotate-4">
            <div className="w-full h-full bg-linear-to-br from-neutral-light-1 to-neutral-light-2 rounded-lg shadow-lg">
              <div className="w-full h-full flex items-center justify-center text-6xl text-dark/10">
                誕
              </div>
            </div>
          </div>

          {/* Image 2 - Medium, center right */}
          <div className="absolute top-64 right-20 w-64 h-80 z-10 rotate-16">
            <div className="w-full h-full bg-linear-to-br from-neutral-light-3 to-neutral-light-4 rounded-ld¥g shadow-lg">
              <div className="w-full h-full flex items-center justify-center text-5xl text-dark/10">
                生
              </div>
            </div>
          </div>

          {/* Image 3 - Small, bottom left */}
          <div className="absolute top-116 left-32 w-48 h-60 -z-10 -rotate-24">
            <div className="w-full h-full bg-linear-to-br from-neutral-light-5 to-neutral-light-6 rounded-lg shadow-lg">
              <div className="w-full h-full flex items-center justify-center text-4xl text-dark/10">
                祝
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full mx-auto justify-center pt-52 flex items-center">
          <div className="w-full">
            {/* Japanese Text */}
            <div className="mb-24">
              <div className="text-xl md:text-8xl lg:text-[14vw] font-bold text-accent-red mb-6 leading-none tracking-tight">
                <div className="flex flex-col md:flex-row items-baseline-last justify-center gap-10">
                  <span className="font-japanese">ようこそ</span>
                  <span className="text-2xl leading-tight text-dark/70 tracking-tight max-w-[14vw] mt-10 block">
                    {listInfo?.subtitle || 'Bienvenue sur notre liste de naissance'}
                  </span>
                </div>
                <span className="pl-[30vw] font-japanese">カミーユ</span>
              </div>
            </div>

            {/* Stats */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 w-full flex items-center gap-12 mb-10">
              <div>
                <p className="text-3xl font-semibold text-dark">{stats.total}</p>
                <p className="text-xs uppercase tracking-wider text-dark/60 mt-1">Cadeaux</p>
              </div>
              <div className="h-12 w-px bg-dark/20" />
              <div>
                <p className="text-3xl font-semibold text-accent-red">{stats.reserved}</p>
                <p className="text-xs uppercase tracking-wider text-dark/60 mt-1">Réservés</p>
              </div>
              <div className="h-12 w-px bg-dark/20" />
              <div>
                <p className="text-3xl font-semibold text-dark/60">{stats.total - stats.reserved}</p>
                <p className="text-xs uppercase tracking-wider text-dark/60 mt-1">Disponibles</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-7xl px-4 mx-auto md:px-6 pb-8 md:pb-12">
        {/* Category filters + Toggles */}
        <div className="mb-24 sticky top-18 2xl:top-6 z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-center gap-8 mb-4">
            {/* Category buttons */}
            <div className="overflow-x-auto flex-1">
              <div className="flex gap-2 min-w-max">
                {availableCategories.map((category) => {
                  const Icon = category === 'all' ? SparklesIcon : categoryIcons[category]
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={selectedCategory === category 
                        ? 'bg-accent-red hover:bg-accent-red/90 flex items-center gap-1.5' 
                        : 'flex items-center gap-1.5'
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {category === 'all' ? 'Tous' : categoryLabels[category]}
                    </Button>
                  )
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="occasion-toggle-home"
                  checked={showOccasionOnly}
                  onCheckedChange={setShowOccasionOnly}
                />
                <Label htmlFor="occasion-toggle-home" className="text-sm cursor-pointer whitespace-nowrap">
                  Occasion
                </Label>
              </div>
              
              <div className="flex items-center gap-1.5">
                <Switch
                  id="available-toggle-home"
                  checked={showAvailableOnly}
                  onCheckedChange={setShowAvailableOnly}
                />
                <Label htmlFor="available-toggle-home" className="text-sm cursor-pointer whitespace-nowrap">
                  Disponibles
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
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-10">
            {/* Free contribution card (always first if enabled) */}
            {listInfo?.enableFreeContribution && selectedCategory === 'all' && (
              <div className="break-inside-avoid">
                <FreeContributionCard
                  title={listInfo.freeContributionTitle || 'Contribution libre 💝'}
                  totalAmount={freeContributionTotal}
                  contributors={freeContributionContributors}
                  onContribute={() => {
                    const fakeGift: Gift = {
                      id: POOL_ID,
                      title: listInfo.freeContributionTitle || 'Contribution libre 💝',
                      description: 'Montant libre pour nous aider',
                      price: 0,
                      imageUrl: '', // Empty string is OK - GiftCard handles it with fallback
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
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>Fait avec amour pour {listInfo?.babyName || 'notre bébé'}</p>
      </footer>

      {/* Dialogs */}
      <ContributionDialog
        gift={reserveGift}
        open={!!reserveGift}
        onOpenChange={(open) => !open && setReserveGift(null)}
        onSuccess={handleContributionSuccess}
        onCancel={fetchGifts}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
        mode="reserve"
      />
      <ContributionDialog
        gift={contributeGift}
        open={!!contributeGift}
        onOpenChange={(open) => !open && setContributeGift(null)}
        onSuccess={handleContributionSuccess}
        onCancel={fetchGifts}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
        mode="contribute"
      />
    </div>
  )
}
