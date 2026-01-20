"use client";

import { ArrowUpDown, ArrowUp, ArrowDown, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Currency, type ExchangeRates, convertFromJpy } from "@/lib/currency";

export type PriceSort = "none" | "asc" | "desc";

interface PriceFilterProps {
  sortOrder: PriceSort;
  onSortChange: (sort: PriceSort) => void;
}

const sortConfig: Record<PriceSort, { icon: LucideIcon; label: string; ariaLabel: string }> = {
  none: { icon: ArrowUpDown, label: "Prix", ariaLabel: "Trier par prix" },
  asc: { icon: ArrowUp, label: "Prix", ariaLabel: "Du moins cher au plus cher" },
  desc: { icon: ArrowDown, label: "Prix", ariaLabel: "Du plus cher au moins cher" },
};

const sortCycle: Record<PriceSort, PriceSort> = {
  none: "asc",
  asc: "desc",
  desc: "none",
};

export function PriceFilter({ sortOrder, onSortChange }: PriceFilterProps) {
  const handleSortClick = () => {
    onSortChange(sortCycle[sortOrder]);
  };

  const config = sortConfig[sortOrder];
  const Icon = config.icon;

  return (
    <Button
      variant={sortOrder === "none" ? "outline" : "default"}
      size="sm"
      onClick={handleSortClick}
      className={`flex items-center gap-1.5 ${
        sortOrder !== "none" ? "bg-accent-red hover:bg-accent-red/90" : ""
      }`}
      aria-label={config.ariaLabel}
    >
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
    </Button>
  );
}

/**
 * Sort gifts by price
 */
export function sortGiftsByPrice<T extends { price: number }>(
  gifts: T[],
  sortOrder: PriceSort,
  currency: Currency,
  exchangeRates: ExchangeRates
): T[] {
  if (sortOrder === "none") return gifts;

  const getSortPrice = (price: number) =>
    currency === "JPY" ? price : convertFromJpy(price, currency, exchangeRates, "toCents");

  return [...gifts].sort((a, b) => {
    const diff = getSortPrice(a.price) - getSortPrice(b.price);

    return sortOrder === "asc" ? diff : -diff;
  });
}
