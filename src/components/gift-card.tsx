"use client";

import { Check, Gift, HandHeart, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type Currency, type ExchangeRates, formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { PublicGift as GiftType } from "@/types";
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

  // Check if pot is fully funded (>=99% to handle currency conversion rounding)
  const isFullyFunded = gift.isPot && progressPercentage >= 99.5;

  // Disable interaction if reserved OR fully funded
  const isDisabled = gift.isReserved || isFullyFunded;

  // Get the icon component for the category
  const CategoryIcon = categoryIcons[gift.category] ?? Gift;

  const contributors = gift.contributors ?? [];

  const handleClick = () => {
    if (isDisabled) return;
    if (gift.isPot) {
      onContribute?.(gift);
    } else {
      onReserve?.(gift);
    }
  };

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-300",
        !isDisabled && "cursor-pointer hover:-translate-y-1",
        isDisabled && "cursor-not-allowed opacity-75"
      )}
      onClick={handleClick}
    >
      {/* Image */}
      <div
        className="bg-muted relative mb-3 overflow-hidden rounded-xl"
        style={{
          aspectRatio: gift.imageUrl ? (gift.imageRatio ?? 4 / 3) : undefined,
        }}
      >
        {gift.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gift.imageUrl}
            alt={gift.title}
            className={cn(
              "h-full w-full object-cover transition-transform duration-500",
              !isDisabled && "group-hover:scale-105"
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
        {gift.isOccasion && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-accent-gold border-0 px-2 py-1 text-xs text-white">Occasion</Badge>
          </div>
        )}

        {/* Action buttons on image */}
        {!isDisabled && (
          <div className="absolute bottom-3 left-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              type="button"
              className="bg-dark hover:bg-dark/90 flex cursor-pointer items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg transition-colors"
              aria-label={gift.isPot ? "Participer" : "Confirmer et payer"}
              onClick={(e) => {
                e.stopPropagation();
                if (gift.isPot) onContribute?.(gift);
                else onReserve?.(gift);
              }}
            >
              {gift.isPot ? (
                <>
                  <HandHeart className="h-5 w-5" />
                  <span className="text-sm font-medium">Participer</span>
                </>
              ) : (
                <>
                  <Gift className="h-5 w-5" />
                  <span className="text-sm font-medium">Offrir</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* External link - bottom right */}
        {gift.externalUrl && (
          <div
            className={cn(
              "absolute right-3 bottom-3",
              !isDisabled && "opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            )}
          >
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

        {/* Reserved badge - shown at bottom for reserved/fully funded gifts */}
        {isFullyFunded ? (
          <Badge className="bg-accent-red/70 mb-3 text-xs text-white">
            <Check className="mr-1 h-3 w-3" />
            Objectif atteint
          </Badge>
        ) : gift.isReserved && !gift.isPot ? (
          <Badge className="bg-accent-red mb-3 text-xs text-white">
            <Check className="mr-1 h-3 w-3" />
            Merci à {gift.reservedBy}
          </Badge>
        ) : null}

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
