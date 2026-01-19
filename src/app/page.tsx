'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { GiftCard } from '@/components/gift-card'
import { FreeContributionCard } from '@/components/free-contribution-card'
import { ContributionDialog } from '@/components/contribution-dialog'
import { CurrencySelector } from '@/components/currency-selector'
import { ScrollToTopButton } from '@/components/scroll-to-top-button'
import { PriceFilter, type PriceSort, sortGiftsByPrice } from '@/components/price-filter'
import { Masonry } from 'masonic'
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
  const [priceSort, setPriceSort] = useState<PriceSort>('none')
  const cardsSectionRef = useRef<HTMLElement>(null)

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

  // Reset price sort when currency changes
  useEffect(() => {
    setPriceSort('none')
  }, [selectedCurrency])

  useEffect(() => {
    fetchGifts()
  }, [fetchGifts])

  const filteredGifts = sortGiftsByPrice(
    gifts
      .filter(g => g.id !== POOL_ID) // Hide POOL gift (has its own FreeContributionCard)
      .filter(g => selectedCategory === 'all' || g.category === selectedCategory)
      .filter(g => !showOccasionOnly || g.isOccasion)
      .filter(g => !showAvailableOnly || !g.isReserved),
    priceSort,
    selectedCurrency,
    exchangeRates
  )

  // Extract POOL gift from gifts (if it exists)
  const poolGift = gifts.find(g => g.id === POOL_ID)
  const freeContributionTotal = poolGift?.potCurrentAmount || 0
  const freeContributionContributors = poolGift?.contributors || []

  // Prepare items for masonry (include free contribution card if needed)
  // Memoize to prevent recreation when dialog opens
  const masonryItems = useMemo(() => {
    const freeContributionItem = listInfo?.enableFreeContribution && selectedCategory === 'all' 
      ? [{ type: 'free-contribution' as const, id: 'free-contribution', data: { title: listInfo.freeContributionTitle || 'Contribution libre 💝', totalAmount: freeContributionTotal, contributors: freeContributionContributors } }]
      : [];
    
    return [
      ...freeContributionItem,
      ...filteredGifts.map(g => ({ type: 'gift' as const, id: g.id, data: g }))
    ];
  }, [listInfo?.enableFreeContribution, selectedCategory, listInfo?.freeContributionTitle, freeContributionTotal, freeContributionContributors, filteredGifts]);

  // Memoize render function to prevent Masonry from recalculating
  const renderMasonryItem = useCallback(({ data: item }: { data: { type: 'free-contribution' | 'gift'; id: string; data: any } }) => {
    if (item.type === 'free-contribution') {
      return (
        <FreeContributionCard
          title={item.data.title}
          totalAmount={item.data.totalAmount}
          contributors={item.data.contributors}
          onContribute={() => {
            const fakeGift: Gift = {
              id: POOL_ID,
              title: item.data.title,
              description: 'Montant libre pour nous aider',
              price: 0,
              imageUrl: '',
              category: 'autre',
              isPot: true,
              potCurrentAmount: item.data.totalAmount,
              isReserved: false,
            }
            setContributeGift(fakeGift)
          }}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
        />
      )
    }
    return (
      <GiftCard 
        gift={item.data} 
        onReserve={setReserveGift}
        onContribute={setContributeGift}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
      />
    )
  }, [selectedCurrency, exchangeRates, setReserveGift, setContributeGift]);

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
      <section className="overflow-x-clip relative">
        <div className="fixed top-6 left-6 z-20">
          <div className="text-2xl font-bold tracking-tight text-dark">
            CAMILLE
          </div>
        </div>

        {/* Currency selector */}
        <div className="fixed top-6 right-6 z-20">
          <div className="opacity-60 hover:opacity-100 transition-opacity">
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
            />
          </div>
        </div>

        {/* Images */}
        <div className="xl:container mx-auto px-4 md:px-6 absolute inset-0 pointer-events-none">
          {/* Image 1 - Large, top left */}
          <div className="absolute md:top-4 top-16 left-1/4 w-48 h-60 md:w-80 md:h-96 z-10 -rotate-4">
            <div className="w-full h-full bg-neutral-light-3 rounded-lg shadow-lg">
              <div className="w-full h-full flex items-center justify-center text-6xl text-dark/10">
                誕
              </div>
            </div>
          </div>

          {/* Image 2 - Medium, center right */}
          <div className="absolute top-64 xl:right-0 md:right-38 right-8 w-32 h-40 md:w-64 md:h-80 z-10 rotate-16">
            <div className="w-full h-full bg-neutral-light-3 rounded-lg shadow-lg">
              <div className="w-full h-full flex items-center justify-center text-5xl text-dark/10">
                生
              </div>
            </div>
          </div>

          {/* Image 3 - Small, bottom left */}
          <div className="absolute md:top-116 top-84 left-13 md:left-32 xl:left-0 w-24 h-32 md:w-48 md:h-60 -z-10 -rotate-24">
            <div className="w-full h-full bg-neutral-light-3 rounded-lg shadow-lg">
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
            <div className="mb-24 lx:container mx-auto px-4 md:px-6">
              <div className="text-[19vw] md:text-[16vw] lg:text-[clamp(1rem,14vw,14rem)] font-bold text-accent-red mb-6 leading-none tracking-tight">
                <div className="flex flex-col md:flex-row md:items-baseline-last justify-center gap-4 xl:gap-8 text-center md:text-left items-center">
                  <span className="font-japanese">ようこそ</span>
                  <span className="text-lg lg:text-xl xl:text-2xl leading-tight text-dark/70 tracking-tight md:max-w-[18vw] lg:max-w-[18vw] xl:max-w-84 md:mt-10 block">
                    {listInfo?.subtitle || 'Bienvenue sur notre liste de naissance'}
                  </span>
                </div>
                <span className="mx-auto block text-center md:pl-52 xl:pl-96 font-japanese">カミーユ</span>
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
      <main ref={cardsSectionRef} className="max-w-7xl px-4 mx-auto md:px-6 pb-8 md:pb-12">
        {/* Category filters + Toggles */}
        <div className="lg:mb-24 md:mb-16 mb-8 lg:sticky lg:top-18 2xl:top-6 z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-center lg:gap-8 gap-6 mb-4">
            {/* Category buttons */}
            <div className="overflow-x-auto flex-1 scrollbar-hide">
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

            {/* Toggles + Price filter */}
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

              <PriceFilter
                sortOrder={priceSort}
                onSortChange={setPriceSort}
              />
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
          <Masonry
            key={`${selectedCategory}-${showOccasionOnly}-${showAvailableOnly}-${priceSort}`}
            items={masonryItems}
            itemKey={(item) => item.id}
            render={renderMasonryItem}
            columnWidth={280}
            columnGutter={26}
            rowGutter={48}
            overscanBy={2}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground">
        <p>Fait avec amour pour {listInfo?.babyName || 'notre bébé'}</p>
      </footer>

      {/* Scroll to top button (mobile only) */}
      <ScrollToTopButton targetRef={cardsSectionRef} />

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
