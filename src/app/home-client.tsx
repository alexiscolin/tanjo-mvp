"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { Gift as GiftIcon, Loader2, Sparkles as SparklesIcon } from "lucide-react";
import { ContributionDialog } from "@/components/contribution-dialog";
import { CurrencySelector } from "@/components/currency-selector";
import { FreeContributionCard } from "@/components/free-contribution-card";
import { GiftCard } from "@/components/gift-card";
import { PriceFilter, type PriceSort, sortGiftsByPrice } from "@/components/price-filter";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { POOL_ID } from "@/lib/constants";
import { type Currency, type ExchangeRates, detectPreferredCurrency } from "@/lib/currency";
import { filterGifts } from "@/lib/utils";
import { categoryLabels, allCategories, categoryIcons } from "@/types";
import type { Gift, GiftCategory, ListInfo, Contribution } from "@/types";
import type { Masonry as MasonryType } from "masonic";

// Masonry uses ResizeObserver (no SSR)
const Masonry = dynamic(() => import("masonic").then((mod) => mod.Masonry), {
  ssr: false,
}) as typeof MasonryType;

export function HomeClient() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [listInfo, setListInfo] = useState<ListInfo | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ EUR: 0.00625, USD: 0.0069 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<GiftCategory | "all">("all");
  const [reserveGift, setReserveGift] = useState<Gift | null>(null);
  const [contributeGift, setContributeGift] = useState<Gift | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("JPY");
  const [showOccasionOnly, setShowOccasionOnly] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [priceSort, setPriceSort] = useState<PriceSort>("none");
  const cardsSectionRef = useRef<HTMLElement>(null);

  // Fetch data on mount
  const fetchGifts = useCallback(async () => {
    try {
      const registryResponse = await fetch("/api/registry", { cache: "no-store" });
      const registryData = await registryResponse.json();

      setGifts(registryData.gifts ?? []);
      setListInfo(registryData.listInfo ?? null);
      if (registryData.exchangeRates) {
        setExchangeRates(registryData.exchangeRates);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount + detect currency
  useEffect(() => {
    setSelectedCurrency(detectPreferredCurrency());
    fetchGifts();
  }, [fetchGifts]);

  // Handle currency change with price sort reset
  const handleCurrencyChange = useCallback((currency: Currency) => {
    setSelectedCurrency(currency);
    setPriceSort("none");
  }, []);

  // Optimistic update: add contribution to gift instantly
  const handleContributionSuccess = useCallback(
    (contribution: { giftId: string; name: string; amount: number; message?: string }) => {
      setGifts((prevGifts) =>
        prevGifts.map((gift) => {
          if (gift.id !== contribution.giftId) return gift;

          // Create new contribution
          const newContribution = {
            id: `temp-${Date.now()}`,
            giftId: contribution.giftId,
            name: contribution.name,
            email: "",
            amount: contribution.amount,
            message: contribution.message,
            createdAt: new Date().toISOString(),
          };

          // Update gift
          const newPotAmount = (gift.potCurrentAmount ?? 0) + contribution.amount;
          const isNowReserved = gift.isPot ? newPotAmount >= gift.price : true;

          return {
            ...gift,
            contributors: [...(gift.contributors ?? []), newContribution],
            potCurrentAmount: newPotAmount,
            isReserved: isNowReserved,
            reservedBy: isNowReserved && !gift.isPot ? contribution.name : gift.reservedBy,
          };
        })
      );
    },
    []
  );

  const filteredGifts = sortGiftsByPrice(
    filterGifts(gifts, {
      category: selectedCategory,
      showOccasionOnly,
      showAvailableOnly,
      shouldExcludePool: true,
    }),
    priceSort,
    selectedCurrency,
    exchangeRates
  );

  // Extract POOL gift from gifts (if it exists)
  const poolGift = gifts.find((g) => g.id === POOL_ID);
  const freeContributionTotal = poolGift?.potCurrentAmount ?? 0;

  // Type for masonry items
  interface FreeContributionData {
    title: string;
    totalAmount: number;
    contributors: Contribution[];
  }
  type MasonryItem =
    | { type: "free-contribution"; id: string; data: FreeContributionData }
    | { type: "gift"; id: string; data: Gift };

  // Prepare items for masonry
  const masonryItems = useMemo((): MasonryItem[] => {
    const contributors = poolGift?.contributors ?? [];
    const freeContributionItem: MasonryItem[] =
      listInfo?.enableFreeContribution && selectedCategory === "all"
        ? [
            {
              type: "free-contribution" as const,
              id: "free-contribution",
              data: {
                title: listInfo?.freeContributionTitle ?? "Contribution libre",
                totalAmount: freeContributionTotal,
                contributors,
              },
            },
          ]
        : [];

    return [
      ...freeContributionItem,
      ...filteredGifts.map((g): MasonryItem => ({ type: "gift" as const, id: g.id, data: g })),
    ];
  }, [
    listInfo?.enableFreeContribution,
    selectedCategory,
    listInfo?.freeContributionTitle,
    freeContributionTotal,
    poolGift?.contributors,
    filteredGifts,
  ]);

  // Memoize render function
  const renderMasonryItem = useCallback(
    ({ data: item }: { data: MasonryItem }) => {
      if (item.type === "free-contribution") {
        return (
          <FreeContributionCard
            title={item.data.title}
            totalAmount={item.data.totalAmount}
            contributors={item.data.contributors}
            onContribute={() => {
              const fakeGift: Gift = {
                id: POOL_ID,
                title: item.data.title,
                description: "Montant libre pour nous aider",
                price: 0,
                imageUrl: "",
                category: "autre",
                isPot: true,
                potCurrentAmount: item.data.totalAmount,
                isReserved: false,
              };

              setContributeGift(fakeGift);
            }}
            selectedCurrency={selectedCurrency}
            exchangeRates={exchangeRates}
          />
        );
      }

      return (
        <GiftCard
          gift={item.data}
          onReserve={setReserveGift}
          onContribute={setContributeGift}
          selectedCurrency={selectedCurrency}
          exchangeRates={exchangeRates}
        />
      );
    },
    [selectedCurrency, exchangeRates, setReserveGift, setContributeGift]
  );

  // Debug: Log if POOL is not found
  useEffect(() => {
    if (listInfo?.enableFreeContribution && !poolGift && gifts.length > 0) {
      console.warn(
        '⚠️ POOL gift not found in Google Sheets. Add a gift with ID="POOL" and isPot="OUI"'
      );
    }
  }, [poolGift, gifts, listInfo]);

  // Only show categories that have at least one gift (excluding POOL)
  const categoriesWithGifts = new Set(gifts.filter((g) => g.id !== POOL_ID).map((g) => g.category));
  const availableCategories: (GiftCategory | "all")[] = [
    "all",
    ...allCategories.filter((cat) => cat !== "all" && categoriesWithGifts.has(cat)),
  ];

  const stats = {
    total: gifts.filter((g) => g.id !== POOL_ID).length,
    reserved: gifts.filter((g) => g.id !== POOL_ID && g.isReserved).length,
    contributions: gifts.reduce((total, gift) => {
      // For pots (including the main pool): count all contributors
      if (gift.contributors && gift.contributors.length > 0) {
        return total + gift.contributors.length;
      }
      // For simple reservations (not pools): count 1 if reserved
      if (!gift.isPot && gift.isReserved && gift.reservedBy) {
        return total + 1;
      }

      return total;
    }, 0),
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-x-clip">
        <div className="fixed top-6 left-6 z-20">
          <div className="text-dark text-2xl font-bold tracking-tight">CAMILLE</div>
        </div>

        {/* Currency selector */}
        <div className="fixed top-6 right-6 z-20">
          <div className="opacity-60 transition-opacity hover:opacity-100">
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onCurrencyChange={handleCurrencyChange}
            />
          </div>
        </div>

        {/* Images */}
        <div className="pointer-events-none absolute inset-0 mx-auto px-4 md:px-6 xl:container">
          {/* Image 1 - Large, top left */}
          <div className="absolute top-16 left-1/4 z-10 h-60 w-48 -rotate-4 md:top-4 md:h-96 md:w-80">
            <div className="bg-neutral-light-3 h-full w-full rounded-lg shadow-lg">
              <div className="text-dark/10 flex h-full w-full items-center justify-center text-6xl">
                誕
              </div>
            </div>
          </div>

          {/* Image 2 - Medium, center right */}
          <div className="absolute top-64 right-8 z-10 h-40 w-32 rotate-16 md:right-38 md:h-80 md:w-64 xl:right-0">
            <div className="bg-neutral-light-3 h-full w-full rounded-lg shadow-lg">
              <div className="text-dark/10 flex h-full w-full items-center justify-center text-5xl">
                生
              </div>
            </div>
          </div>

          {/* Image 3 - Small, bottom left */}
          <div className="absolute top-84 left-13 -z-10 h-32 w-24 -rotate-24 md:top-116 md:left-32 md:h-60 md:w-48 xl:left-0">
            <div className="bg-neutral-light-3 h-full w-full rounded-lg shadow-lg">
              <div className="text-dark/10 flex h-full w-full items-center justify-center text-4xl">
                祝
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 mx-auto flex w-full items-center justify-center pt-52">
          <div className="w-full">
            {/* Japanese Text */}
            <div className="lx:container mx-auto mb-24 px-4 md:px-6">
              <div className="text-accent-red mb-6 text-[19vw] leading-none font-bold tracking-tight md:text-[16vw] lg:text-[clamp(1rem,14vw,14rem)]">
                <div className="flex flex-col items-center justify-center gap-4 text-center md:flex-row md:items-baseline-last md:text-left xl:gap-8">
                  <span className="font-japanese">ようこそ</span>
                  <span className="text-dark/70 block text-lg leading-tight tracking-tight md:mt-10 md:max-w-[18vw] lg:max-w-[18vw] lg:text-xl xl:max-w-84 xl:text-2xl">
                    {listInfo?.subtitle}
                  </span>
                </div>
                <span className="font-japanese mx-auto block text-center md:pl-52 xl:pl-96">
                  カミーユ
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="mx-auto mb-10 flex w-full max-w-7xl items-center gap-4 px-6 sm:gap-12">
              <div>
                <p className="text-dark text-3xl font-semibold">{stats.total}</p>
                <p className="text-dark/60 mt-1 text-xs tracking-wider uppercase">
                  Cadeau{stats.total > 1 && "x"}
                </p>
              </div>
              <div className="bg-dark/20 h-12 w-px" />
              <div>
                <p className="text-dark/60 text-3xl font-semibold">
                  {stats.total - stats.reserved}
                </p>
                <p className="text-dark/60 mt-1 text-xs tracking-wider uppercase">
                  Disponible{stats.total - stats.reserved > 1 && "s"}
                </p>
              </div>
              <div className="bg-dark/20 h-12 w-px" />
              <div>
                <p className="text-accent-red text-3xl font-semibold">{stats.contributions}</p>
                <p className="text-dark/60 mt-1 text-xs tracking-wider uppercase">
                  Contributeur{stats.contributions > 1 && "s"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <main ref={cardsSectionRef} className="mx-auto max-w-7xl px-4 pb-8 md:px-6 md:pb-12">
        {/* Category filters + Toggles */}
        <div className="z-10 mb-8 md:mb-16 lg:sticky lg:top-18 lg:mb-24 2xl:top-6">
          <div className="mb-4 flex flex-col justify-center gap-6 lg:flex-row lg:items-center lg:gap-8">
            {/* Category buttons */}
            <div className="scrollbar-hide flex-1 overflow-x-auto">
              <div className="flex min-w-max gap-2">
                {availableCategories.map((category) => {
                  const Icon = category === "all" ? SparklesIcon : categoryIcons[category];

                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={
                        selectedCategory === category
                          ? "bg-accent-red hover:bg-accent-red/90 flex items-center gap-1.5"
                          : "flex items-center gap-1.5"
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {category === "all" ? "Tous" : categoryLabels[category]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Toggles + Price filter */}
            <div className="flex shrink-0 flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="occasion-toggle-home"
                  checked={showOccasionOnly}
                  onCheckedChange={setShowOccasionOnly}
                />
                <Label
                  htmlFor="occasion-toggle-home"
                  className="cursor-pointer text-sm whitespace-nowrap"
                >
                  Occasion
                </Label>
              </div>

              <div className="flex items-center gap-1.5">
                <Switch
                  id="available-toggle-home"
                  checked={showAvailableOnly}
                  onCheckedChange={setShowAvailableOnly}
                />
                <Label
                  htmlFor="available-toggle-home"
                  className="cursor-pointer text-sm whitespace-nowrap"
                >
                  Disponibles
                </Label>
              </div>

              <PriceFilter sortOrder={priceSort} onSortChange={setPriceSort} />
            </div>
          </div>
        </div>

        {/* Gifts Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="text-accent-red h-8 w-8 animate-spin" />
          </div>
        ) : filteredGifts.length === 0 && !listInfo?.enableFreeContribution ? (
          <div className="py-16 text-center">
            <GiftIcon className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">
              {gifts.length === 0
                ? "Aucun cadeau pour le moment."
                : "Aucun cadeau dans cette catégorie."}
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
      <footer className="text-muted-foreground py-8 text-center text-sm">
        <p>Fait avec amour pour {listInfo?.babyName ?? "notre bébé"}</p>
      </footer>

      {/* Scroll to top button (mobile only) */}
      <ScrollToTopButton targetRef={cardsSectionRef} />

      {/* Dialogs */}
      <ContributionDialog
        gift={reserveGift}
        isOpen={!!reserveGift}
        onOpenChange={(open) => !open && setReserveGift(null)}
        onSuccess={handleContributionSuccess}
        onCancel={fetchGifts}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
        mode="reserve"
      />
      <ContributionDialog
        gift={contributeGift}
        isOpen={!!contributeGift}
        onOpenChange={(open) => !open && setContributeGift(null)}
        onSuccess={handleContributionSuccess}
        onCancel={fetchGifts}
        selectedCurrency={selectedCurrency}
        exchangeRates={exchangeRates}
        mode="contribute"
      />
    </div>
  );
}
