"use client";

import { HandHeart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { type Currency, type ExchangeRates } from "@/lib/currency";
import { type Contribution } from "@/types";
import { ContributorsProgress } from "./contributors-progress";

interface FreeContributionCardProps {
  title: string;
  totalAmount: number;
  contributors: Contribution[];
  onContribute: () => void;
  selectedCurrency: Currency;
  exchangeRates: ExchangeRates;
}

export function FreeContributionCard({
  title,
  totalAmount,
  contributors,
  onContribute,
  selectedCurrency,
  exchangeRates,
}: FreeContributionCardProps) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1"
      onClick={onContribute}
    >
      <div className="bg-accent-red relative mb-3 overflow-hidden rounded-xl">
        <div className="flex items-center justify-center">
          <div className="p-4 text-center">
            <div className="bg-surface mt-12 mb-4 inline-flex h-24 w-24 items-center justify-center rounded-full">
              <HandHeart className="text-accent-red h-12 w-12" strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 line-clamp-2 text-xl leading-tight font-bold text-white">
              {title}
            </h3>
            <p className="mb-4 line-clamp-2 text-sm text-white/80">
              Contribuez librement au montant de votre choix pour soutenir notre projet
            </p>

            {/* Contributors progress - Always show */}
            <div className="mx-4 mb-6">
              <ContributorsProgress
                currentAmount={totalAmount}
                contributors={contributors}
                selectedCurrency={selectedCurrency}
                exchangeRates={exchangeRates}
                variant="inverted"
                progressPercentage={100}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
