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

export interface Contribution {
  id: string
  giftId: string
  name: string
  email: string
  amount: number // in yens (JPY)
  message?: string
  createdAt: string
  cancelToken?: string // secure token for cancellation link
}

/**
 * Category labels with emojis
 * This is the single source of truth for categories
 */
export const categoryLabels = {
  chambre: '🛏️ Chambre',
  vetements: '👕 Vêtements',
  repas: '🍼 Repas',
  bain: '🛁 Bain',
  transport: '🚗 Transport',
  jouets: '🧸 Jouets',
  sante: '💊 Santé',
  experiences: '✨ Expériences',
  autre: '🎁 Autre',
} as const

/**
 * Gift category type - derived from categoryLabels keys
 */
export type GiftCategory = keyof typeof categoryLabels

/**
 * All categories including 'all' for filtering
 * Derived from categoryLabels to avoid duplication
 */
export const allCategories: (GiftCategory | 'all')[] = [
  'all',
  ...Object.keys(categoryLabels) as GiftCategory[]
]

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
