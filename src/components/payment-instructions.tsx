"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Copy, Check, Smartphone, QrCode, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Currency, CURRENCY } from "@/lib/currency";
import { deobfuscatePhone } from "@/lib/utils";
import type { PaymentConfig } from "@/types";

interface CopyButtonProps {
  text: string;
  field: string;
  label: string;
  copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}

function CopyButton({ text, field, label, copiedField, onCopy }: CopyButtonProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate font-mono text-sm font-medium">{text}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onCopy(text, field)} className="shrink-0">
        {copiedField === field ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

interface PaymentInstructionsProps {
  amount: number; // in whole units (14€, 2500¥)
  currency: Currency;
  paymentConfig: PaymentConfig;
  contributorName: string;
}

export function PaymentInstructions({
  amount,
  currency,
  paymentConfig,
  contributorName,
}: PaymentInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);
  const [canReveal, setCanReveal] = useState(false);

  const isJapan = currency === CURRENCY.JPY;
  const formattedAmount = isJapan
    ? `¥${amount.toLocaleString("ja-JP")}`
    : currency === CURRENCY.EUR
      ? `${amount.toFixed(2)}€`
      : `$${amount.toFixed(2)}`;

  // Get the actual phone number (decoded from utils)
  const actualPhone = paymentConfig.weroPhone ? deobfuscatePhone(paymentConfig.weroPhone) : "";

  // Anti-bot delay: enable reveal button after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setCanReveal(true), 2000);

    return () => clearTimeout(timer);
  }, []);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Japon - PayPay
  if (isJapan && (paymentConfig.paypayId || paymentConfig.paypayQrUrl)) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <QrCode className="mx-auto mb-2 h-12 w-12 text-red-500" />
          <h3 className="text-lg font-semibold">Pay with PayPay</h3>
          <p className="text-muted-foreground text-sm">
            Scan the QR code below or send money using the ID
          </p>
        </div>

        <CopyButton
          text={formattedAmount}
          field="amount"
          label="Amount"
          copiedField={copiedField}
          onCopy={copyToClipboard}
        />

        {paymentConfig.paypayId && (
          <CopyButton
            text={paymentConfig.paypayId}
            field="paypayId"
            label="PayPay Link"
            copiedField={copiedField}
            onCopy={copyToClipboard}
          />
        )}

        {paymentConfig.paypayQrUrl && (
          <div className="bg-surface flex justify-center rounded-lg border p-4">
            <Image
              src={
                paymentConfig.paypayQrUrl.startsWith("http")
                  ? paymentConfig.paypayQrUrl
                  : `/qr/${paymentConfig.paypayQrUrl}`
              }
              alt="PayPay QR Code"
              width={192}
              height={192}
              className="object-contain"
              unoptimized={paymentConfig.paypayQrUrl.startsWith("http")}
              priority
            />
          </div>
        )}

        <div className="text-muted-foreground space-y-1 rounded-lg bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-800">Instructions:</p>
          <ol className="list-inside list-decimal space-y-1 text-amber-700">
            <li>Open the PayPay app</li>
            <li>Tap &quot;Send&quot;</li>
            <li>Scan the QR code or enter the ID</li>
            <li>Enter the amount and send</li>
          </ol>
        </div>
      </div>
    );
  }

  // International - Check available payment methods
  const hasPayPal = paymentConfig.paypalMeUsername;
  const hasWero = paymentConfig.weroPhone;

  if (!hasPayPal && !hasWero) {
    return (
      <div className="text-muted-foreground p-4 text-center">
        <p>Les informations de paiement ne sont pas configurées.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CopyButton
        text={formattedAmount}
        field="amount"
        label="Montant à envoyer"
        copiedField={copiedField}
        onCopy={copyToClipboard}
      />

      {/* PayPal Section - Priority */}
      {hasPayPal && (
        <div className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">Payer avec PayPal (Recommandé)</h4>
          </div>

          <a
            href={`https://paypal.me/${paymentConfig.paypalMeUsername}/${amount}${currency}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir PayPal.me ({formattedAmount})
            </Button>
          </a>

          <p className="text-xs text-blue-700">
            ⚠️ Note : Des frais peuvent s&apos;appliquer si vous payez par carte bancaire. Le
            paiement par solde PayPal ou virement bancaire est gratuit.
          </p>
        </div>
      )}

      {/* Separator if multiple methods */}
      {hasPayPal && hasWero && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-surface text-muted-foreground px-2">ou (gratuit)</span>
          </div>
        </div>
      )}

      {/* Wero Section with protection */}
      {hasWero && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-500" />
            <h4 className="font-semibold">Payer avec Wero (Gratuit)</h4>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-muted-foreground mb-1 text-xs">Numéro de téléphone</p>
            <div className="flex items-center justify-between">
              <p className="font-mono font-medium">
                {isPhoneRevealed ? actualPhone : "** ** ** ** **"}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPhoneRevealed(!isPhoneRevealed)}
                  disabled={!canReveal}
                  className="shrink-0"
                  title={!canReveal ? "Chargement..." : isPhoneRevealed ? "Masquer" : "Révéler"}
                >
                  {isPhoneRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {isPhoneRevealed && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(actualPhone, "weroPhone")}
                    className="shrink-0"
                  >
                    {copiedField === "weroPhone" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="text-muted-foreground space-y-1 rounded-lg bg-emerald-50 p-3 text-sm">
            <p className="font-medium text-emerald-800">Comment payer :</p>
            <ol className="list-inside list-decimal space-y-1 text-emerald-700">
              <li>Ouvrez votre application bancaire</li>
              <li>Allez dans Wero → Envoyer</li>
              <li>Entrez le numéro ci-dessus</li>
              <li>Envoyez {formattedAmount}</li>
              <li>Ajoutez &quot;{contributorName}&quot; en message</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
