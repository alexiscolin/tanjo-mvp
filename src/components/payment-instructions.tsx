'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PaymentConfig } from '@/types'
import { Copy, Check, Smartphone, QrCode, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { type Currency, CURRENCY } from '@/lib/currency'

interface PaymentInstructionsProps {
  amount: number // in the display currency
  currency: Currency
  paymentConfig: PaymentConfig
  contributorName: string
}

export function PaymentInstructions({ 
  amount, 
  currency, 
  paymentConfig,
  contributorName,
}: PaymentInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [revealedPhone, setRevealedPhone] = useState(false)
  const [canReveal, setCanReveal] = useState(false)
  
  const isJapan = currency === CURRENCY.JPY
  const formattedAmount = isJapan 
    ? `¥${amount.toLocaleString('ja-JP')}`
    : currency === CURRENCY.EUR 
      ? `${(amount / 100).toFixed(2)}€`
      : `$${(amount / 100).toFixed(2)}`

  // Deobfuscate phone number: base64 decode + reverse
  const deobfuscatePhone = (obfuscated: string): string => {
    try {
      const decoded = atob(obfuscated)
      return decoded.split('').reverse().join('')
    } catch {
      return obfuscated // Fallback if not encoded
    }
  }

  // Get the actual phone number (decoded)
  const actualPhone = paymentConfig.weroPhone ? deobfuscatePhone(paymentConfig.weroPhone) : ''

  // Anti-bot delay: enable reveal button after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => setCanReveal(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const CopyButton = ({ text, field, label }: { text: string; field: string; label: string }) => (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono font-medium">{text}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => copyToClipboard(text, field)}
        className="shrink-0"
      >
        {copiedField === field ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )

  // Japon - PayPay
  if (isJapan && (paymentConfig.paypayId || paymentConfig.paypayQrUrl)) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <QrCode className="h-12 w-12 mx-auto text-red-500 mb-2" />
          <h3 className="font-semibold text-lg">PayPayで支払う</h3>
          <p className="text-sm text-muted-foreground">
            以下のQRコードをスキャンするか、IDで送金してください
          </p>
        </div>

        <CopyButton text={formattedAmount} field="amount" label="金額" />
        
        {paymentConfig.paypayId && (
          <CopyButton text={paymentConfig.paypayId} field="paypayId" label="PayPay ID" />
        )}

        {paymentConfig.paypayQrUrl && (
          <div className="flex justify-center p-4 bg-white rounded-lg border">
            <img 
              src={paymentConfig.paypayQrUrl} 
              alt="PayPay QR Code"
              className="w-48 h-48 object-contain"
            />
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1 p-3 bg-amber-50 rounded-lg">
          <p className="font-medium text-amber-800">手順:</p>
          <ol className="list-decimal list-inside space-y-1 text-amber-700">
            <li>PayPayアプリを開く</li>
            <li>「送る」をタップ</li>
            <li>QRコードをスキャンするかIDを入力</li>
            <li>金額を入力して送金</li>
          </ol>
        </div>
      </div>
    )
  }

  // International - Check available payment methods
  const hasPayPal = paymentConfig.paypalMeUsername
  const hasWero = paymentConfig.weroPhone

  if (!hasPayPal && !hasWero) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <p>Les informations de paiement ne sont pas configurées.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <CopyButton text={formattedAmount} field="amount" label="Montant à envoyer" />

      {/* PayPal Section - Priority */}
      {hasPayPal && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">Payer avec PayPal (Recommandé)</h4>
          </div>

          <a
            href={`https://paypal.me/${paymentConfig.paypalMeUsername}/${(amount / 100).toFixed(2)}${currency}`}
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
            ⚠️ Note : Des frais peuvent s'appliquer si vous payez par carte bancaire. 
            Le paiement par solde PayPal ou virement bancaire est gratuit.
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
            <span className="bg-white px-2 text-muted-foreground">ou (gratuit)</span>
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

          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Numéro de téléphone</p>
            <div className="flex items-center justify-between">
              <p className="font-mono font-medium">
                {revealedPhone ? actualPhone : '** ** ** ** **'}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRevealedPhone(!revealedPhone)}
                  disabled={!canReveal}
                  className="shrink-0"
                  title={!canReveal ? "Chargement..." : revealedPhone ? "Masquer" : "Révéler"}
                >
                  {revealedPhone ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                {revealedPhone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(actualPhone, 'weroPhone')}
                    className="shrink-0"
                  >
                    {copiedField === 'weroPhone' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1 p-3 bg-emerald-50 rounded-lg">
            <p className="font-medium text-emerald-800">Comment payer :</p>
            <ol className="list-decimal list-inside space-y-1 text-emerald-700">
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
  )
}
