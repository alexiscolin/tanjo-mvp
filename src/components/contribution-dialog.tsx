"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { HandHeart, Gift, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { POOL_ID } from "@/lib/constants";
import {
  type Currency,
  type ExchangeRates,
  formatCurrency,
  convertToJpy,
  convertFromJpy,
  CURRENCY,
} from "@/lib/currency";
import type { Gift as GiftType, PaymentConfig } from "@/types";
import { PaymentInstructions } from "./payment-instructions";

interface ContributionDialogProps {
  gift: GiftType | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess?: (contribution: {
    giftId: string;
    name: string;
    amount: number;
    message?: string;
  }) => void;
  onCancel?: () => void; // Separate callback for cancellations
  selectedCurrency: Currency;
  exchangeRates: ExchangeRates;
  mode: "contribute" | "reserve";
}

export function ContributionDialog({
  gift,
  isOpen,
  onOpenChange,
  onSuccess,
  onCancel,
  selectedCurrency,
  exchangeRates,
  mode,
}: ContributionDialogProps) {
  const isReservation = mode === "reserve";
  const progressPercentage = gift ? ((gift.potCurrentAmount ?? 0) / gift.price) * 100 : 0;
  const remainingAmount = gift ? gift.price - (gift.potCurrentAmount ?? 0) : 0;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState(0); // In display currency (whole units)
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [suggestedAmounts, setSuggestedAmounts] = useState<number[]>([]); // In display currency (whole units)
  const [paymentMethods, setPaymentMethods] = useState<PaymentConfig>({});
  const [submittedAmount, setSubmittedAmount] = useState(0); // In display currency (whole units)
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleClose = () => onOpenChange(false);

  const formatPrice = (jpy: number) => formatCurrency(jpy, selectedCurrency, exchangeRates, true);

  // Helper to convert JPY to display currency (memoized)
  const amountToDisplay = useCallback(
    (jpy: number) =>
      selectedCurrency === CURRENCY.JPY
        ? Math.round(jpy)
        : convertFromJpy(jpy, selectedCurrency, exchangeRates, "toWholeUnits"),
    [selectedCurrency, exchangeRates]
  );

  // Fetch suggested amounts and payment methods on mount/currency change
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
        const data = await response.json();

        if (data.suggestedContributionsJpy) {
          setSuggestedAmounts(data.suggestedContributionsJpy.map(amountToDisplay));
        }

        if (data.payment) {
          setPaymentMethods(data.payment);
        }
      } catch (error) {
        console.error("Error fetching config:", error);
      }
    };

    fetchConfig();
  }, [amountToDisplay]);

  // Set default amount when dialog opens
  useEffect(() => {
    if (isOpen && gift && suggestedAmounts.length > 0) {
      if (isReservation) {
        setAmount(amountToDisplay(gift.price));
      } else {
        const remaining = amountToDisplay(remainingAmount);
        const defaultAmt = remaining > 0 ? remaining : (suggestedAmounts[1] ?? suggestedAmounts[0]);

        setAmount(defaultAmt);
      }
    }
  }, [isOpen, gift, remainingAmount, isReservation, suggestedAmounts, amountToDisplay]);

  // Build suggested amounts list
  const remaining = amountToDisplay(remainingAmount);
  const suggestedAmountsList =
    !isReservation && remaining > 0
      ? [remaining, ...suggestedAmounts]
          .filter((amt, idx, arr) => arr.indexOf(amt) === idx)
          .slice(0, 4)
      : suggestedAmounts.slice(0, 4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gift) return;

    // Get amount in user's selected currency (what user sees and enters)
    const amountInUserCurrency = customAmount ? Math.round(parseFloat(customAmount)) : amount;

    // Convert to JPY for storage in database
    const amountInJpy =
      selectedCurrency === CURRENCY.JPY
        ? Math.round(amountInUserCurrency)
        : convertToJpy(amountInUserCurrency * 100, selectedCurrency, exchangeRates);

    setIsSubmitting(true);
    setError("");

    try {
      // Use different endpoint for pool contributions
      const endpoint =
        gift.id === POOL_ID ? "/api/pool/contributions" : `/api/gifts/${gift.id}/contributions`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          amount: amountInJpy, // JPY for database storage
          currency: selectedCurrency, // User's selected currency (for email display)
          message: message || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.error ?? `Error submitting ${isReservation ? "reservation" : "contribution"}`
        );
      }

      const data = await response.json();

      // Store the amount in user's currency for display in success message
      setSubmittedAmount(amountInUserCurrency);
      setContributionId(data.contributionId);
      setIsSuccess(true);

      // Call onSuccess with contribution data for optimistic update
      if (onSuccess) {
        onSuccess({
          giftId: gift.id,
          name: name.trim(),
          amount: amountInJpy,
          message: message?.trim() || undefined,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Error submitting ${isReservation ? "reservation" : "contribution"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelContribution = async () => {
    if (!contributionId) {
      setError("Missing contribution ID");

      return;
    }

    setIsCancelling(true);
    setError("");

    try {
      const response = await fetch(`/api/contributions/${contributionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(data.error ?? "Error cancelling contribution");
      }

      setIsSuccess(false);
      setName("");
      setEmail("");
      setAmount(0);
      setCustomAmount("");
      setMessage("");
      setContributionId(null);
      setSubmittedAmount(0);

      if (onCancel) {
        onCancel();
      }

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cancelling contribution");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    setName("");
    setEmail("");
    setAmount(0);
    setCustomAmount("");
    setMessage("");
    setContributionId(null);
    setSubmittedAmount(0);
    handleClose();
  };

  const hasPaymentMethods =
    paymentMethods.weroPhone ??
    paymentMethods.paypayId ??
    paymentMethods.paypayQrUrl ??
    paymentMethods.paypalMeUsername;

  if (isSuccess) {
    return (
      <Dialog isOpen={isOpen} onOpenChange={handleSuccessClose}>
        <DialogContent
          onClose={handleSuccessClose}
          className="max-h-[90vh] overflow-y-auto sm:max-w-md"
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 shrink-0 text-green-500" />
              <div>
                <DialogTitle>Merci {name} !</DialogTitle>
                <DialogDescription>
                  Votre participation est maintenant enregistrée.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {hasPaymentMethods ? (
            <div className="mt-4">
              <p className="text-muted-foreground mb-4 text-sm">
                Il ne vous reste qu&apos;à nous faire parvenir votre paiement. On se charge du
                reste.
              </p>
              <PaymentInstructions
                amount={submittedAmount}
                currency={selectedCurrency}
                paymentConfig={paymentMethods}
                contributorName={name}
              />
            </div>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              Vous allez recevoir un email de confirmation avec les instructions de paiement.
            </p>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelContribution}
              disabled={isCancelling}
              className="w-full cursor-pointer sm:w-auto"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Annulation...
                </>
              ) : (
                `Annuler ${isReservation ? "ma réservation" : "ma contribution"}`
              )}
            </Button>
            <Button
              type="button"
              onClick={handleSuccessClose}
              className="w-full cursor-pointer sm:w-auto"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (!gift) return null;

  return (
    <Dialog isOpen={isOpen} onOpenChange={handleClose}>
      <DialogContent onClose={handleClose} className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isReservation ? (
              <Gift className="text-accent-red h-5 w-5" />
            ) : (
              <HandHeart className="text-accent-red h-5 w-5" />
            )}
            <DialogTitle>
              {isReservation ? "Offrir ce cadeau" : "Participer à ce cadeau"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isReservation
              ? "Ne vous souciez pas du reste: on se charger de l'achat."
              : gift.id === POOL_ID
                ? "Participez au montant de votre choix à notre cagnotte libre."
                : "Ne vous souciez pas du reste: on se charger de l'achat."}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 rounded-lg pt-4">
          <div className="mb-2 flex items-center gap-4">
            {gift.imageUrl && (
              <div className="relative mb-2 aspect-square w-1/4">
                <Image
                  src={gift.imageUrl}
                  alt={gift.title}
                  fill
                  className="rounded-xl object-cover"
                  unoptimized
                />
              </div>
            )}
            <div>
              <h4 className="mb-1 text-lg leading-tight font-bold">{gift.title}</h4>

              {/* Show remaining amount for gifts with target, or total collected for pool */}
              {gift.id === POOL_ID && gift.isPot ? (
                <p className="text-accent-red text-lg font-semibold">
                  {formatPrice(gift.potCurrentAmount ?? 0)} collectés
                </p>
              ) : (
                gift.price > 0 && (
                  <p className="text-accent-red text-lg font-semibold">
                    {isReservation
                      ? formatPrice(gift.price)
                      : `${formatPrice(remainingAmount)} restants`}
                  </p>
                )
              )}
            </div>
          </div>
          {!isReservation && gift.isPot && gift.price > 0 && (
            <div className="mb-2 space-y-1">
              <p className="text-muted-foreground text-sm">
                {formatPrice(gift.potCurrentAmount ?? 0)} collectés (
                <span className="text-accent-red font-medium">
                  {Math.round(progressPercentage)}%
                </span>
                )
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="from-accent-red to-accent-red/80 h-full bg-linear-to-r transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount selection (only for contribute mode) */}
          {!isReservation && (
            <div>
              <Label>Montant de votre participation</Label>
              <div className="mt-1.5 mb-2 grid grid-cols-4 gap-2">
                {suggestedAmountsList.map((amt, idx) => {
                  const isTotal = idx === 0 && amt === remaining;
                  const symbol =
                    selectedCurrency === CURRENCY.EUR
                      ? "€"
                      : selectedCurrency === CURRENCY.USD
                        ? "$"
                        : "¥";
                  const displayAmt = Math.round(amt); // Ensure no decimals

                  return (
                    <Button
                      key={amt}
                      type="button"
                      variant={amount === amt && !customAmount ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setAmount(amt);
                        setCustomAmount("");
                      }}
                      className="text-xs"
                    >
                      {isTotal ? (
                        <>
                          <span className="block">
                            {displayAmt}
                            {symbol}
                          </span>
                          <span className="block text-[10px] opacity-80">Total</span>
                        </>
                      ) : (
                        `${displayAmt}${symbol}`
                      )}
                    </Button>
                  );
                })}
              </div>

              <div className="relative">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder={`Montant personnalisé (${selectedCurrency})`}
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAmount(0);
                  }}
                />
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <Label htmlFor="name">Votre prénom *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jean"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Votre email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jean@example.com"
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="message pour Camille"
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter>
            <div className="flex w-full flex-col items-center justify-center gap-2">
              <Button type="submit" disabled={isSubmitting} className="w-full cursor-pointer">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    {isReservation ? (
                      <Gift className="mr-2 h-4 w-4" />
                    ) : (
                      <HandHeart className="mr-2 h-4 w-4" />
                    )}
                    Confirmer et payer
                  </>
                )}
              </Button>
              {gift.id !== POOL_ID && (
                <span className="text-accent-foreground text-xs">On se chargera de l’achat.</span>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
