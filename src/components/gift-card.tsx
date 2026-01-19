"use client";

import { Check, Gift, HandHeart, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Currency, type ExchangeRates, formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Gift as GiftType } from "@/types";
import { categoryLabels, categoryIcons } from "@/types";
import { ContributorsProgress } from "./contributors-progress";

interface GiftCardProps {
  gift: GiftType;
  onReserve?: (gift: GiftType) => void;
  onContribute?: (gift: GiftType) => void;
  selectedCurrency: Currency;
  exchangeRates: ExchangeRates;
}

export function GiftCard({
  gift,
  onReserve,
  onContribute,
  selectedCurrency,
  exchangeRates,
}: GiftCardProps) {
  const formatPrice = (jpy: number) => formatCurrency(jpy, selectedCurrency, exchangeRates, true);

  const progressPercentage =
    gift.isPot && gift.potCurrentAmount
      ? Math.min((gift.potCurrentAmount / gift.price) * 100, 100)
      : 0;

  // Get the icon component for the category
  const CategoryIcon = categoryIcons[gift.category] ?? Gift;

  const contributors = gift.contributors ?? [];

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-300",
        !gift.isReserved && "cursor-pointer hover:-translate-y-1",
        gift.isReserved && "cursor-default"
      )}
      onClick={() => !gift.isReserved && (gift.isPot ? onContribute?.(gift) : onReserve?.(gift))}
    >
      {/* Image */}
      <div className="bg-muted relative mb-3 overflow-hidden rounded-xl">
        {gift.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gift.imageUrl}
            alt={gift.title}
            className={cn(
              "h-auto w-full object-cover transition-transform duration-500",
              !gift.isReserved && "group-hover:scale-105"
            )}
          />
        ) : (
          <div className="flex aspect-square items-center justify-center bg-[#f5f5f5]">
            <Gift className="text-dark/10 h-12 w-12" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="bg-surface/90 flex items-center gap-1 text-xs backdrop-blur-sm"
          >
            <CategoryIcon className="h-3 w-3" />
            {categoryLabels[gift.category] || "Autre"}
          </Badge>
        </div>

        {/* Occasion badge */}
        {gift.isOccasion && !gift.isReserved && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-accent-gold border-0 px-2 py-1 text-xs text-white">Occasion</Badge>
          </div>
        )}

        {/* Action buttons on image */}
        {!gift.isReserved && (
          <>
            {/* Reserve/Contribute button - bottom left */}
            <div className="absolute bottom-3 left-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button
                className="bg-dark hover:bg-dark/90 flex cursor-pointer items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg transition-colors"
                aria-label={gift.isPot ? "Participer" : "Réserver"}
              >
                {gift.isPot ? (
                  <>
                    <HandHeart className="h-5 w-5" />
                    <span className="text-sm font-medium">Cagnotter</span>
                  </>
                ) : (
                  <>
                    <Gift className="h-5 w-5" />
                    <span className="text-sm font-medium">Offrir</span>
                  </>
                )}
              </button>
            </div>

            {/* External link - bottom right */}
            {gift.externalUrl && (
              <div className="absolute right-3 bottom-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <a
                  href={gift.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-surface text-dark hover:bg-surface/90 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors"
                  aria-label="Voir le produit"
                >
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>
            )}
          </>
        )}
      </div>

      <CardContent className="p-0">
        {/* Title */}
        <h3 className="text-dark mb-1 line-clamp-2 text-lg leading-tight font-medium">
          {gift.title}
        </h3>

        {/* Description & Price */}
        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
          {gift.description} -{" "}
          <span className="text-dark/60 font-bold">{formatPrice(gift.price)}</span>
        </p>

        {/* Reserved badge - shown at bottom for reserved gifts */}
        {gift.isReserved && (
          <Badge className="bg-accent-red mb-3 text-xs text-white">
            <Check className="mr-1 h-3 w-3" />
            {gift.isPot ? "Réservé" : `Réservé par ${gift.reservedBy}`}
          </Badge>
        )}

        {/* Progress for pots - Always show for pot gifts */}
        {gift.isPot && (
          <ContributorsProgress
            currentAmount={gift.potCurrentAmount ?? 0}
            goalAmount={gift.price}
            contributors={contributors}
            selectedCurrency={selectedCurrency}
            exchangeRates={exchangeRates}
            variant="default"
            progressPercentage={progressPercentage}
          />
        )}
      </CardContent>
    </Card>
  );
}
