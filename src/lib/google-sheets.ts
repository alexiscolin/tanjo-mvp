import crypto from "crypto";
import { google } from "googleapis";
import type { Gift, Contribution, ListInfo, AppConfig, PaymentConfig } from "@/types";
import { DEFAULT_CONFIG } from "./constants";

/**
 * Generate a secure cancellation token
 * Uses contribution ID + timestamp + random bytes for uniqueness
 */
export function generateCancelToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(16).toString("hex");

  return `${timestamp}-${randomPart}`;
}

// Google Sheets configuration
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID ?? "";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "";

// Sheet names
const SHEETS = {
  GIFTS: "Cadeaux",
  CONTRIBUTIONS: "Contributions",
  CONFIG: "Config",
};

function checkConfig() {
  if (!SPREADSHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error("Google Sheets not configured. Check your environment variables in .env.local");
  }
}

function getSheets() {
  checkConfig();

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  return sheets;
}

// ==================== GIFTS ====================

export async function getGifts(): Promise<Gift[]> {
  const sheets = await getSheets();

  // Fetch both gifts and contributions in parallel
  const [giftsResponse, contributionsResponse] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.GIFTS}!A2:O`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.CONTRIBUTIONS}!A2:H`,
    }),
  ]);

  const giftsRows = giftsResponse.data.values ?? [];
  const contributionsRows = contributionsResponse.data.values ?? [];

  // Parse contributions and group by giftId
  const contributionsByGiftId: Record<string, Contribution[]> = {};

  contributionsRows
    .filter((row) => row[0] && row[1]) // Filter empty rows
    .forEach((row) => {
      const contribution: Contribution = {
        id: row[0],
        giftId: row[1],
        name: row[2] ?? "Anonyme",
        email: row[3] ?? "",
        amount: parseInt(row[4]) || 0,
        message: row[5] ?? undefined,
        createdAt: row[6] ?? new Date().toISOString(),
        cancelToken: row[7] ?? undefined,
      };

      if (!contributionsByGiftId[contribution.giftId]) {
        contributionsByGiftId[contribution.giftId] = [];
      }
      contributionsByGiftId[contribution.giftId].push(contribution);
    });

  // Parse gifts and attach contributors
  return giftsRows.map((row, index) => {
    const giftId = row[0] ?? String(index + 1);
    const isPot = row[7]?.toLowerCase() === "oui";
    const contributors = isPot ? (contributionsByGiftId[giftId] ?? []) : undefined;

    return {
      id: giftId,
      title: row[1] ?? "",
      description: row[2] ?? "",
      price: parseInt(row[3]) || 0,
      imageUrl: row[4] ?? "",
      imageRatio: row[14] ? parseFloat(row[14]) : undefined,
      category: row[5] ?? "autre",
      externalUrl: row[6] ?? undefined,
      isPot,
      potCurrentAmount: parseInt(row[8]) || 0,
      contributors, // Contributors for pot gifts (count = contributors.length)
      isReserved: row[9]?.toLowerCase() === "oui",
      reservedBy: row[10] ?? undefined,
      reservedEmail: row[11] ?? undefined,
      reservedAt: row[12] ?? undefined,
      isOccasion: row[13]?.toLowerCase() === "oui",
    };
  });
}

export async function addGift(
  gift: Omit<Gift, "id" | "isReserved" | "potCurrentAmount">
): Promise<void> {
  const sheets = await getSheets();
  const id = `gift_${Date.now()}`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A:O`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          id,
          gift.title,
          gift.description,
          gift.price,
          gift.imageUrl,
          gift.category,
          gift.externalUrl ?? "",
          gift.isPot ? "OUI" : "NON",
          0, // potCurrentAmount
          "NON", // isReserved
          "", // reservedBy
          "", // reservedEmail
          "", // reservedAt
          gift.isOccasion ? "OUI" : "NON", // isOccasion
          gift.imageRatio ?? "", // imageRatio (width/height)
        ],
      ],
    },
  });
}

export async function updateGift(id: string, updates: Partial<Gift>): Promise<void> {
  const sheets = await getSheets();
  const gifts = await getGifts();
  const rowIndex = gifts.findIndex((g) => g.id === id);

  if (rowIndex === -1) throw new Error("Gift not found");

  const gift = { ...gifts[rowIndex], ...updates };
  const row = rowIndex + 2; // +2 because of header + index 0

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A${row}:O${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          gift.id,
          gift.title,
          gift.description,
          gift.price,
          gift.imageUrl,
          gift.category,
          gift.externalUrl ?? "",
          gift.isPot ? "OUI" : "NON",
          gift.potCurrentAmount ?? 0,
          gift.isReserved ? "OUI" : "NON",
          gift.reservedBy ?? "",
          gift.reservedEmail ?? "",
          gift.reservedAt ?? "",
          gift.isOccasion ? "OUI" : "NON",
          gift.imageRatio ?? "",
        ],
      ],
    },
  });
}

export async function deleteGift(id: string): Promise<void> {
  const sheets = await getSheets();
  const gifts = await getGifts();
  const rowIndex = gifts.findIndex((g) => g.id === id);

  if (rowIndex === -1) throw new Error("Gift not found");

  // Clear the row (set empty cells)
  const row = rowIndex + 2;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A${row}:O${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]],
    },
  });
}

// ==================== CONTRIBUTIONS ====================

export async function getContributions(giftId?: string): Promise<Contribution[]> {
  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A2:H`, // Extended to include cancelToken (column H)
  });

  const rows = response.data.values ?? [];

  const contributions = rows
    .filter((row) => row[0] && row[1]) // Filter out empty rows (no id or giftId)
    .map(
      (row): Contribution => ({
        id: row[0] ?? "",
        giftId: row[1] ?? "",
        name: row[2] ?? "",
        email: row[3] ?? "",
        amount: parseInt(row[4]) || 0,
        message: row[5] ?? undefined,
        createdAt: row[6] ?? new Date().toISOString(),
        cancelToken: row[7] ?? undefined,
      })
    );

  // Filter by giftId if provided
  if (giftId) {
    return contributions.filter((c) => c.giftId === giftId);
  }

  return contributions;
}

/**
 * Find a contribution by its cancellation token
 */
export async function getContributionByCancelToken(
  cancelToken: string
): Promise<Contribution | null> {
  const contributions = await getContributions();

  return contributions.find((c) => c.cancelToken === cancelToken) ?? null;
}

export interface AddContributionResult {
  id: string;
  cancelToken: string;
}

export async function addContribution(
  contribution: Omit<Contribution, "id" | "createdAt" | "cancelToken">
): Promise<AddContributionResult> {
  const sheets = await getSheets();
  const id = `contrib_${Date.now()}`;
  const createdAt = new Date().toISOString();
  const cancelToken = generateCancelToken();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A:H`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          id,
          contribution.giftId,
          contribution.name,
          contribution.email,
          contribution.amount,
          contribution.message ?? "",
          createdAt,
          cancelToken,
        ],
      ],
    },
  });

  // Update pot amount and reservation status
  const gifts = await getGifts();
  const gift = gifts.find((g) => g.id === contribution.giftId);

  if (gift) {
    const newAmount = (gift.potCurrentAmount ?? 0) + contribution.amount;

    // For pots: reserve when goal is reached
    // For non-pots: reserve immediately when someone contributes
    const isNowReserved = gift.isPot ? newAmount >= gift.price : true; // Always reserve non-pot gifts

    await updateGift(contribution.giftId, {
      potCurrentAmount: newAmount,
      isReserved: isNowReserved,
      // Set reservedBy when gift becomes reserved
      reservedBy: isNowReserved ? contribution.name : gift.reservedBy,
    });
  }

  return { id, cancelToken };
}

export async function deleteContribution(id: string): Promise<Contribution> {
  const sheets = await getSheets();
  const contributions = await getContributions();
  const contribution = contributions.find((c) => c.id === id);

  if (!contribution) throw new Error("Contribution not found");

  const rowIndex = contributions.findIndex((c) => c.id === id);

  if (rowIndex === -1) throw new Error("Contribution not found");

  // Clear the row
  const row = rowIndex + 2; // +2 because of header + index 0

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A${row}:H${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["", "", "", "", "", "", "", ""]],
    },
  });

  // Update pot amount (subtract the contribution)
  const gifts = await getGifts();
  const gift = gifts.find((g) => g.id === contribution.giftId);

  if (gift) {
    if (gift.isPot) {
      // For pot gifts, update the current amount and reservation status
      const newAmount = Math.max(0, (gift.potCurrentAmount ?? 0) - contribution.amount);
      const isStillReserved = newAmount >= gift.price;

      await updateGift(contribution.giftId, {
        potCurrentAmount: newAmount,
        isReserved: isStillReserved,
        reservedBy: isStillReserved ? gift.reservedBy : undefined,
      });
    } else {
      // For non-pot gifts (full reservations), simply unreserve when cancelled
      await updateGift(contribution.giftId, {
        potCurrentAmount: 0,
        isReserved: false,
        reservedBy: undefined,
      });
    }
  }

  return contribution;
}

/**
 * Delete a contribution by its cancellation token
 */
export async function deleteContributionByCancelToken(cancelToken: string): Promise<Contribution> {
  const contribution = await getContributionByCancelToken(cancelToken);

  if (!contribution) throw new Error("Contribution not found");

  return deleteContribution(contribution.id);
}

// ==================== CONFIG ====================

export async function getListInfo(): Promise<ListInfo> {
  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONFIG}!B1:B8`,
  });

  const values = response.data.values ?? [];

  return {
    title: values[0]?.[0] ?? "Notre Liste de Naissance",
    subtitle: values[1]?.[0] ?? "Bienvenue !",
    description: values[2]?.[0] ?? "",
    babyName: values[3]?.[0] ?? undefined,
    expectedDate: values[4]?.[0] ?? undefined,
    coverImageUrl: values[5]?.[0] ?? undefined,
    enableFreeContribution: values[6]?.[0]?.toLowerCase() === "oui",
    freeContributionTitle: values[7]?.[0] ?? "Contribution libre 💝",
  };
}

export async function getAppConfig(): Promise<AppConfig> {
  const sheets = await getSheets();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.CONFIG}!B9:B11`,
    });

    const values = response.data.values ?? [];

    // Parse suggested contributions (format: "1000,2500,5000,10000")
    const suggestedStr = values[2]?.[0] ?? "1000,2500,5000,10000";
    const suggestedContributions = suggestedStr
      .split(",")
      .map((v: string) => parseInt(v.trim()))
      .filter((v: number) => !isNaN(v));

    return {
      potThresholdJpy: parseInt(values[0]?.[0]) || DEFAULT_CONFIG.POT_THRESHOLD_JPY,
      minContributionJpy: parseInt(values[1]?.[0]) || DEFAULT_CONFIG.MIN_CONTRIBUTION_JPY,
      suggestedContributionsJpy:
        suggestedContributions.length > 0
          ? suggestedContributions
          : [...DEFAULT_CONFIG.SUGGESTED_CONTRIBUTIONS_JPY],
    };
  } catch (error) {
    // Return defaults if config sheet doesn't have these values yet
    console.warn("Using default app config:", error);

    return {
      potThresholdJpy: DEFAULT_CONFIG.POT_THRESHOLD_JPY,
      minContributionJpy: DEFAULT_CONFIG.MIN_CONTRIBUTION_JPY,
      suggestedContributionsJpy: [...DEFAULT_CONFIG.SUGGESTED_CONTRIBUTIONS_JPY],
    };
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const sheets = await getSheets();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.CONFIG}!B12:B15`,
    });

    const values = response.data.values ?? [];

    // Obfuscate phone number: reverse + base64
    const obfuscatePhone = (phone: string) => {
      if (!phone) return undefined;
      const reversed = phone.split("").reverse().join("");

      return Buffer.from(reversed).toString("base64");
    };

    return {
      // Europe - Wero (phone number obfuscated)
      weroPhone: obfuscatePhone(values[0]?.[0]),
      // Japon - PayPay
      paypayId: values[1]?.[0] ?? undefined,
      paypayQrUrl: values[2]?.[0] ?? undefined,
      // International - PayPal
      paypalMeUsername: values[3]?.[0] ?? undefined,
    };
  } catch (error) {
    console.warn("Payment config not found:", error);

    return {};
  }
}
