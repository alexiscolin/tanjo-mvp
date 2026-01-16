import { google } from 'googleapis'
import type { Gift, Reservation, Contribution, ListInfo, AppConfig } from '@/types'
import { DEFAULT_CONFIG } from './constants'

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || ''
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''

// Sheet names
const SHEETS = {
  GIFTS: 'Cadeaux',
  RESERVATIONS: 'Reservations',
  CONTRIBUTIONS: 'Contributions',
  CONFIG: 'Config',
}

function checkConfig() {
  if (!SPREADSHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Sheets not configured. Check your environment variables in .env.local')
  }
}

async function getSheets() {
  checkConfig()
  
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

// ==================== GIFTS ====================

export async function getGifts(): Promise<Gift[]> {
  const sheets = await getSheets()
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A2:M`,
  })

  const rows = response.data.values || []
  
  return rows.map((row, index) => ({
    id: row[0] || String(index + 1),
    title: row[1] || '',
    description: row[2] || '',
    price: parseInt(row[3]) || 0,
    imageUrl: row[4] || '',
    category: row[5] || 'autre',
    externalUrl: row[6] || undefined,
    isPot: row[7]?.toLowerCase() === 'oui',
    potCurrentAmount: parseInt(row[8]) || 0,
    isReserved: row[9]?.toLowerCase() === 'oui',
    reservedBy: row[10] || undefined,
    reservedEmail: row[11] || undefined,
    reservedAt: row[12] || undefined,
  }))
}

export async function addGift(gift: Omit<Gift, 'id' | 'isReserved' | 'potCurrentAmount'>): Promise<void> {
  const sheets = await getSheets()
  const id = `gift_${Date.now()}`
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A:M`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        id,
        gift.title,
        gift.description,
        gift.price,
        gift.imageUrl,
        gift.category,
        gift.externalUrl || '',
        gift.isPot ? 'OUI' : 'NON',
        0, // potCurrentAmount
        'NON', // isReserved
        '', // reservedBy
        '', // reservedEmail
        '', // reservedAt
      ]],
    },
  })
}

export async function updateGift(id: string, updates: Partial<Gift>): Promise<void> {
  const sheets = await getSheets()
  const gifts = await getGifts()
  const rowIndex = gifts.findIndex(g => g.id === id)
  
  if (rowIndex === -1) throw new Error('Gift not found')
  
  const gift = { ...gifts[rowIndex], ...updates }
  const row = rowIndex + 2 // +2 because of header + index 0
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A${row}:M${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        gift.id,
        gift.title,
        gift.description,
        gift.price,
        gift.imageUrl,
        gift.category,
        gift.externalUrl || '',
        gift.isPot ? 'OUI' : 'NON',
        gift.potCurrentAmount || 0,
        gift.isReserved ? 'OUI' : 'NON',
        gift.reservedBy || '',
        gift.reservedEmail || '',
        gift.reservedAt || '',
      ]],
    },
  })
}

export async function deleteGift(id: string): Promise<void> {
  const sheets = await getSheets()
  const gifts = await getGifts()
  const rowIndex = gifts.findIndex(g => g.id === id)
  
  if (rowIndex === -1) throw new Error('Gift not found')
  
  // Clear the row (set empty cells)
  const row = rowIndex + 2
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A${row}:M${row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['', '', '', '', '', '', '', '', '', '', '', '', '']],
    },
  })
}

// ==================== RESERVATIONS ====================

export async function addReservation(reservation: Omit<Reservation, 'id' | 'createdAt'>): Promise<void> {
  const sheets = await getSheets()
  const id = `res_${Date.now()}`
  const createdAt = new Date().toISOString()
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.RESERVATIONS}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        id,
        reservation.giftId,
        reservation.name,
        reservation.email,
        reservation.message || '',
        createdAt,
      ]],
    },
  })
  
  // Mark gift as reserved
  await updateGift(reservation.giftId, {
    isReserved: true,
    reservedBy: reservation.name,
    reservedEmail: reservation.email,
    reservedAt: createdAt,
  })
}

// ==================== CONTRIBUTIONS ====================

export async function getContributions(giftId?: string): Promise<Contribution[]> {
  const sheets = await getSheets()
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A2:G`,
  })

  const rows = response.data.values || []
  
  const contributions = rows.map((row): Contribution => ({
    id: row[0] || '',
    giftId: row[1] || '',
    name: row[2] || '',
    email: row[3] || '',
    amount: parseInt(row[4]) || 0,
    message: row[5] || undefined,
    createdAt: row[6] || new Date().toISOString(),
  }))
  
  // Filter by giftId if provided
  if (giftId) {
    return contributions.filter(c => c.giftId === giftId)
  }
  
  return contributions
}

export async function addContribution(contribution: Omit<Contribution, 'id' | 'createdAt'>): Promise<void> {
  const sheets = await getSheets()
  const id = `contrib_${Date.now()}`
  const createdAt = new Date().toISOString()
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A:G`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        id,
        contribution.giftId,
        contribution.name,
        contribution.email,
        contribution.amount,
        contribution.message || '',
        createdAt,
      ]],
    },
  })
  
  // Update pot amount
  const gifts = await getGifts()
  const gift = gifts.find(g => g.id === contribution.giftId)
  if (gift) {
    const newAmount = (gift.potCurrentAmount || 0) + contribution.amount
    await updateGift(contribution.giftId, {
      potCurrentAmount: newAmount,
      isReserved: newAmount >= gift.price, // Reserved if goal reached
    })
  }
}

// ==================== CONFIG ====================

export async function getListInfo(): Promise<ListInfo> {
  const sheets = await getSheets()
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONFIG}!B1:B8`,
  })

  const values = response.data.values || []
  
  return {
    title: values[0]?.[0] || 'Notre Liste de Naissance',
    subtitle: values[1]?.[0] || 'Bienvenue !',
    description: values[2]?.[0] || '',
    babyName: values[3]?.[0] || undefined,
    expectedDate: values[4]?.[0] || undefined,
    coverImageUrl: values[5]?.[0] || undefined,
    enableFreeContribution: values[6]?.[0]?.toLowerCase() === 'oui',
    freeContributionTitle: values[7]?.[0] || 'Contribution libre 💝',
  }
}

export async function getAppConfig(): Promise<AppConfig> {
  const sheets = await getSheets()
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.CONFIG}!B9:B11`,
    })

    const values = response.data.values || []
    
    // Parse suggested contributions (format: "1000,2500,5000,10000")
    const suggestedStr = values[2]?.[0] || '1000,2500,5000,10000'
    const suggestedContributions = suggestedStr
      .split(',')
      .map((v: string) => parseInt(v.trim()))
      .filter((v: number) => !isNaN(v))
    
    return {
      potThresholdJpy: parseInt(values[0]?.[0]) || DEFAULT_CONFIG.POT_THRESHOLD_JPY,
      minContributionJpy: parseInt(values[1]?.[0]) || DEFAULT_CONFIG.MIN_CONTRIBUTION_JPY,
      suggestedContributionsJpy: suggestedContributions.length > 0 ? suggestedContributions : [...DEFAULT_CONFIG.SUGGESTED_CONTRIBUTIONS_JPY],
    }
  } catch (error) {
    // Return defaults if config sheet doesn't have these values yet
    console.warn('Using default app config:', error)
    return {
      potThresholdJpy: DEFAULT_CONFIG.POT_THRESHOLD_JPY,
      minContributionJpy: DEFAULT_CONFIG.MIN_CONTRIBUTION_JPY,
      suggestedContributionsJpy: [...DEFAULT_CONFIG.SUGGESTED_CONTRIBUTIONS_JPY],
    }
  }
}
