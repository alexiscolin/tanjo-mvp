// Types for the baby registry MVP

export interface Gift {
  id: string
  title: string
  description: string
  price: number // in yens (JPY - base currency)
  imageUrl: string
  category: GiftCategory
  externalUrl?: string
  isPot: boolean // collective pot
  potCurrentAmount?: number // in yens (JPY)
  isReserved: boolean
  reservedBy?: string
  reservedEmail?: string
  reservedAt?: string
  isOccasion?: boolean // second-hand item
}

export interface Reservation {
  id: string
  giftId: string
  name: string
  email: string
  message?: string
  createdAt: string
}

export interface Contribution {
  id: string
  giftId: string
  name: string
  email: string
  amount: number // in yens (JPY)
  message?: string
  createdAt: string
}

export type GiftCategory = 
  | 'chambre'
  | 'vetements'
  | 'repas'
  | 'bain'
  | 'transport'
  | 'jouets'
  | 'sante'
  | 'experiences'
  | 'autre'

export const categoryLabels: Record<GiftCategory, string> = {
  chambre: '🛏️ Chambre',
  vetements: '👕 Vêtements',
  repas: '🍼 Repas',
  bain: '🛁 Bain',
  transport: '🚗 Transport',
  jouets: '🧸 Jouets',
  sante: '💊 Santé',
  experiences: '✨ Expériences',
  autre: '🎁 Autre',
}

export interface ListInfo {
  title: string
  subtitle: string
  description: string
  babyName?: string
  expectedDate?: string
  coverImageUrl?: string
  enableFreeContribution?: boolean
  freeContributionTitle?: string
}

export interface AppConfig {
  potThresholdJpy: number
  minContributionJpy: number
  suggestedContributionsJpy: number[]
}

export interface PaymentConfig {
  // Europe - Wero (P2P mobile) - obfuscated server-side
  weroPhone?: string
  // Japon - PayPay
  paypayId?: string
  paypayQrUrl?: string
  // International - PayPal
  paypalMeUsername?: string
}
