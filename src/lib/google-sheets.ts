/* eslint-disable max-lines */
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

// Cache the sheets API client instance (NOT data cache - just reuses the API client)
// Each API call still fetches fresh data from Google Sheets
let cachedSheets: ReturnType<typeof google.sheets> | null = null;

function getSheets() {
  checkConfig();

  // Reuse cached API client instance if available (saves auth initialization time)
  // This does NOT cache data - every values.get/batchGet still fetches fresh data
  if (cachedSheets) {
    return cachedSheets;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedSheets = google.sheets({ version: "v4", auth });

  return cachedSheets;
}

// ==================== GIFTS ====================

/**
 * Sanitize text values to prevent misalignment due to tabs
 * Replaces tabs and carriage returns with spaces, preserves meaningful trailing spaces
 * Only use for text fields, not numeric values
 */
function sanitizeValue(value: string | number | undefined): string {
  if (value === undefined || value === null) return "";
  const str = String(value);

  // Replace tabs and \r with spaces, only trim end (preserve leading spaces like "– ")
  return str.replace(/[\t\r]/g, " ").trimEnd();
}

/**
 * Finds the last row that contains at least one non-empty cell (checks all columns A:Z)
 * Returns 1-indexed row number (including header)
 */
async function findLastUsedRow(
  sheets: ReturnType<typeof google.sheets>,
  range: string
): Promise<number> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
    majorDimension: "ROWS",
  });

  const rows = response.data.values ?? [];

  // Search from bottom to top for the last row with any non-empty cell
  for (let idx = rows.length - 1; idx >= 0; idx--) {
    const row = rows[idx];

    if (row?.some((cell) => cell && String(cell).trim() !== "")) {
      return idx + 1; // 1-indexed (header included)
    }
  }

  return 1; // Only header exists
}

/**
 * Verifies that a row was written correctly in column A and realigns if necessary
 * Reads up to column Z to detect misaligned data beyond column O
 */
async function verifyAndRealignRow(
  sheets: ReturnType<typeof google.sheets>,
  sheetId: number,
  rowNumber: number
): Promise<void> {
  try {
    // Re-read the row to verify (read up to Z to catch misaligned data beyond O)
    const checkResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.GIFTS}!A${rowNumber}:Z${rowNumber}`,
    });

    const row = checkResponse.data.values?.[0] ?? [];
    const hasDataInA = row[0] && row[0].toString().trim() !== "";

    // Find first non-empty column
    const firstNonEmpty = row.findIndex((cell) => cell && String(cell).trim() !== "");

    // If column A is empty but data exists elsewhere, realign
    if (!hasDataInA && firstNonEmpty > 0) {
      console.warn(
        `Row ${rowNumber} misaligned detected, realigning from column ${firstNonEmpty}...`
      );

      // Calculate width: from first non-empty to end of row (or up to column O)
      const width = Math.min(row.length - firstNonEmpty, 15); // Max 15 columns (A to O)

      // Move entire data block from first non-empty column to column A
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              cutPaste: {
                source: {
                  sheetId,
                  startRowIndex: rowNumber - 1, // 0-indexed
                  endRowIndex: rowNumber,
                  startColumnIndex: firstNonEmpty,
                  endColumnIndex: firstNonEmpty + width,
                },
                destination: {
                  sheetId,
                  rowIndex: rowNumber - 1, // 0-indexed
                  columnIndex: 0, // Column A
                },
                pasteType: "PASTE_NORMAL",
              },
            },
          ],
        },
      });

      // Re-read to verify column A now has data
      const verifyResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.GIFTS}!A${rowNumber}:A${rowNumber}`,
      });

      const verifyRow = verifyResponse.data.values?.[0] ?? [];

      if (!verifyRow[0] || verifyRow[0].toString().trim() === "") {
        console.warn(`Row ${rowNumber} realignment may have failed - column A still empty`);
      }
    } else if (firstNonEmpty === -1) {
      // Row is completely empty
      console.warn(`Row ${rowNumber} is completely empty after insertion`);
    }
  } catch (error) {
    console.error(`Error verifying row ${rowNumber}:`, error);
    // Don't fail the main operation if verification fails
  }
}

export async function getGifts(): Promise<Gift[]> {
  const sheets = getSheets();

  // Use batchGet to fetch both ranges in a single API call (much faster!)
  const batchResponse = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [`${SHEETS.GIFTS}!A2:O`, `${SHEETS.CONTRIBUTIONS}!A2:I`],
  });

  const giftsRows = batchResponse.data.valueRanges?.[0]?.values ?? [];
  const contributionsRows = batchResponse.data.valueRanges?.[1]?.values ?? [];

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
        amount: parseInt(row[4], 10) || 0,
        message: row[5] ?? undefined,
        createdAt: row[6] ?? new Date().toISOString(),
        cancelToken: row[7] ?? undefined,
        paid: row[8]?.toString().toLowerCase() === "oui",
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
      price: parseInt(row[3], 10) || 0,
      imageUrl: row[4] ?? "",
      imageRatio: row[14] ? parseFloat(row[14]) : undefined,
      category: row[5] ?? "autre",
      externalUrl: row[6] ?? undefined,
      isPot,
      potCurrentAmount: parseInt(row[8], 10) || 0,
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
  const sheets = getSheets();
  const id = `gift_${Date.now()}`;

  // Sanitize all text fields to prevent misalignment due to tabs
  // Note: Don't sanitize numeric values (price, imageRatio) - keep them as numbers
  const sanitizedValues = [
    id,
    sanitizeValue(gift.title),
    sanitizeValue(gift.description),
    gift.price, // Keep as number
    sanitizeValue(gift.imageUrl),
    sanitizeValue(gift.category),
    sanitizeValue(gift.externalUrl ?? ""),
    gift.isPot ? "OUI" : "NON",
    0, // potCurrentAmount
    "NON", // isReserved
    "", // reservedBy
    "", // reservedEmail
    "", // reservedAt
    gift.isOccasion ? "OUI" : "NON", // isOccasion
    gift.imageRatio ?? "", // imageRatio - keep as number or empty string, don't sanitize
  ];

  // 1. Find the last row that contains any data (read A:Z to catch misaligned data)
  const lastUsedRow = await findLastUsedRow(sheets, `${SHEETS.GIFTS}!A:Z`);
  const insertRow = lastUsedRow + 1;

  // 2. Get sheetId for insertDimension
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === SHEETS.GIFTS);
  const sheetId = sheet?.properties?.sheetId ?? 0;

  // 3. Insert a new empty row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: insertRow - 1, // 0-indexed
              endIndex: insertRow, // Insert one row
            },
            inheritFromBefore: true, // Inherit formatting from previous row
          },
        },
      ],
    },
  });

  // 4. Write values to A:O of the newly created row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A${insertRow}:O${insertRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [sanitizedValues],
    },
  });

  // 5. Optional verification: re-read A:Z and realign if necessary (safety net)
  await verifyAndRealignRow(sheets, sheetId, insertRow);
}

export async function updateGift(id: string, updates: Partial<Gift>): Promise<void> {
  const sheets = getSheets();
  const gifts = await getGifts();
  const rowIndex = gifts.findIndex((g) => g.id === id);

  if (rowIndex === -1) throw new Error("Gift not found");

  const gift = { ...gifts[rowIndex], ...updates };
  const row = rowIndex + 2; // +2 because of header + index 0

  // Sanitize text values to prevent misalignment
  // Note: Don't sanitize numeric values (price, imageRatio) - keep them as numbers
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A${row}:O${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          gift.id,
          sanitizeValue(gift.title),
          sanitizeValue(gift.description),
          gift.price, // Keep as number
          sanitizeValue(gift.imageUrl),
          sanitizeValue(gift.category),
          sanitizeValue(gift.externalUrl ?? ""),
          gift.isPot ? "OUI" : "NON",
          gift.potCurrentAmount ?? 0,
          gift.isReserved ? "OUI" : "NON",
          sanitizeValue(gift.reservedBy ?? ""),
          sanitizeValue(gift.reservedEmail ?? ""),
          sanitizeValue(gift.reservedAt ?? ""),
          gift.isOccasion ? "OUI" : "NON",
          gift.imageRatio ?? "", // Keep as number or empty string, don't sanitize
        ],
      ],
    },
  });
}

/**
 * Normalizes misaligned rows: realigns data starting anywhere to column A
 * Returns the number of corrected rows
 * Reads up to column Z to catch all misaligned data
 */
export async function normalizeGiftRows(): Promise<number> {
  const sheets = getSheets();
  let correctedCount = 0;
  const correctedRowNumbers = new Set<number>(); // Track corrected rows to avoid double-processing

  // Get sheetId
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === SHEETS.GIFTS);
  const sheetId = sheet?.properties?.sheetId ?? 0;

  // Get all rows to detect misaligned ones (read up to Z to catch data beyond O)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A2:Z`, // Starting from row 2 (after header), up to Z
  });

  const rows = response.data.values ?? [];
  const rowsToRealign: Array<{ rowNumber: number; data: any[] }> = [];

  // Detect misaligned rows (data exists but not in column A)
  rows.forEach((row, index) => {
    const hasDataInA = row[0] && row[0].toString().trim() !== "";

    // Find first non-empty column
    const firstNonEmpty = row.findIndex((cell) => cell && String(cell).trim() !== "");

    // If column A is empty but data exists elsewhere, mark for realignment
    if (!hasDataInA && firstNonEmpty > 0) {
      const rowNumber = index + 2; // +2 because we start at row 2 and index 0

      rowsToRealign.push({ rowNumber, data: row });
    } else if (firstNonEmpty === -1) {
      // Row is completely empty
      console.warn(`Row ${index + 2} is completely empty`);
    }
  });

  // Realign detected rows (in descending order to avoid index shifts)
  for (const { rowNumber, data } of rowsToRealign.sort((a, b) => b.rowNumber - a.rowNumber)) {
    // Skip if already corrected
    if (correctedRowNumbers.has(rowNumber)) {
      continue;
    }

    try {
      // Find first non-empty column in this row
      const firstNonEmpty = data.findIndex((cell) => cell && String(cell).trim() !== "");

      if (firstNonEmpty > 0) {
        // Calculate width: from first non-empty to end of row (or up to column O)
        const width = Math.min(data.length - firstNonEmpty, 15); // Max 15 columns (A to O)

        // Move entire data block from first non-empty column to column A
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [
              {
                cutPaste: {
                  source: {
                    sheetId,
                    startRowIndex: rowNumber - 1, // 0-indexed
                    endRowIndex: rowNumber,
                    startColumnIndex: firstNonEmpty,
                    endColumnIndex: firstNonEmpty + width,
                  },
                  destination: {
                    sheetId,
                    rowIndex: rowNumber - 1, // 0-indexed
                    columnIndex: 0, // Column A
                  },
                  pasteType: "PASTE_NORMAL",
                },
              },
            ],
          },
        });

        correctedRowNumbers.add(rowNumber);
        correctedCount++;
      }
    } catch (error) {
      console.error(`Error realigning row ${rowNumber}:`, error);
    }
  }

  return correctedCount;
}

export async function deleteGift(id: string): Promise<void> {
  const sheets = getSheets();
  const gifts = await getGifts();
  const rowIndex = gifts.findIndex((g) => g.id === id);

  if (rowIndex === -1) throw new Error("Gift not found");

  // Clear the row completely (use clear instead of update to truly empty all cells)
  const row = rowIndex + 2;

  // Use clear to completely remove all data from the row (including beyond column O)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.GIFTS}!A${row}:Z${row}`, // Clear up to Z to remove any misaligned data
  });
}

// ==================== CONTRIBUTIONS ====================

export async function getContributions(giftId?: string): Promise<Contribution[]> {
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A2:I`, // H = CancelToken, I = Payé
  });

  const rows = response.data.values ?? [];

  const contributions = rows
    .filter((row) => row[0] && row[1]) // Filter empty rows (pas d'id ou giftId)
    .map(
      (row): Contribution => ({
        id: row[0] ?? "",
        giftId: row[1] ?? "",
        name: row[2] ?? "",
        email: row[3] ?? "",
        amount: parseInt(row[4], 10) || 0,
        message: row[5] ?? undefined,
        createdAt: row[6] ?? new Date().toISOString(),
        cancelToken: row[7] ?? undefined,
        paid: row[8]?.toString().toLowerCase() === "oui",
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

/**
 * Update the paid status of a contribution (column I).
 * Used when payment is received outside the platform.
 */
export async function updateContributionPaid(id: string, paid: boolean): Promise<void> {
  const sheets = getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A2:I`,
  });

  const rows = response.data.values ?? [];
  const rowIndex = rows.findIndex((row) => row[0] === id);

  if (rowIndex === -1) throw new Error("Contribution not found");

  const row = rowIndex + 2; // +2 for header + 0-based index

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!I${row}:I${row}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[paid ? "OUI" : "NON"]],
    },
  });
}

export interface AddContributionResult {
  id: string;
  cancelToken: string;
}

export async function addContribution(
  contribution: Omit<Contribution, "id" | "createdAt" | "cancelToken">
): Promise<AddContributionResult> {
  const sheets = getSheets();
  const id = `contrib_${Date.now()}`;
  const createdAt = new Date().toISOString();
  const cancelToken = generateCancelToken();

  // Sanitize text fields to prevent misalignment
  const sanitizedValues = [
    id,
    contribution.giftId,
    sanitizeValue(contribution.name),
    sanitizeValue(contribution.email),
    contribution.amount, // Keep as number, don't sanitize
    sanitizeValue(contribution.message ?? ""),
    createdAt,
    cancelToken,
    "NON", // Payé (payment tracked manually off-platform)
  ];

  // 1. Find the last row that contains any data (read A:Z to catch misaligned data)
  const lastUsedRow = await findLastUsedRow(sheets, `${SHEETS.CONTRIBUTIONS}!A:Z`);
  const insertRow = lastUsedRow + 1;

  // 2. Get sheetId for insertDimension
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheet = spreadsheet.data.sheets?.find((s) => s.properties?.title === SHEETS.CONTRIBUTIONS);
  const sheetId = sheet?.properties?.sheetId ?? 0;

  // 3. Insert a new empty row
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: insertRow - 1, // 0-indexed
              endIndex: insertRow, // Insert one row
            },
            inheritFromBefore: true, // Inherit formatting from previous row
          },
        },
      ],
    },
  });

  // 4. Write values to A:I of the newly created row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A${insertRow}:I${insertRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [sanitizedValues],
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
  const sheets = getSheets();

  // Get all rows including empty ones to find the exact row index
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A2:I`,
  });

  const rows = response.data.values ?? [];
  const rowIndex = rows.findIndex((row) => row[0] === id);

  if (rowIndex === -1) throw new Error("Contribution not found");

  // Parse the contribution before deleting it to return it
  const rowData = rows[rowIndex];
  const contribution: Contribution = {
    id: rowData[0] ?? "",
    giftId: rowData[1] ?? "",
    name: rowData[2] ?? "",
    email: rowData[3] ?? "",
    amount: parseInt(rowData[4], 10) || 0,
    message: rowData[5] ?? undefined,
    createdAt: rowData[6] ?? new Date().toISOString(),
    cancelToken: rowData[7] ?? undefined,
    paid: rowData[8]?.toString().toLowerCase() === "oui",
  };

  const row = rowIndex + 2; // +2 because of header (line 1) + index 0

  // Use clear to completely remove all data from the row (including beyond column H)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEETS.CONTRIBUTIONS}!A${row}:Z${row}`, // Clear up to Z to remove any misaligned data
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

// ==================== OPTIMIZED BATCH FUNCTIONS ====================

/**
 * Optimized function to fetch both gifts and listInfo in a single API call
 */
export async function getGiftsAndListInfo(): Promise<{ gifts: Gift[]; listInfo: ListInfo }> {
  const sheets = getSheets();

  // Fetch all required data in a single batch API call (3 ranges at once)
  const batchResponse = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SPREADSHEET_ID,
    ranges: [`${SHEETS.GIFTS}!A2:O`, `${SHEETS.CONTRIBUTIONS}!A2:I`, `${SHEETS.CONFIG}!B1:B8`],
  });

  const giftsRows = batchResponse.data.valueRanges?.[0]?.values ?? [];
  const contributionsRows = batchResponse.data.valueRanges?.[1]?.values ?? [];
  const configValues = batchResponse.data.valueRanges?.[2]?.values ?? [];

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
        amount: parseInt(row[4], 10) || 0,
        message: row[5] ?? undefined,
        createdAt: row[6] ?? new Date().toISOString(),
        cancelToken: row[7] ?? undefined,
        paid: row[8]?.toString().toLowerCase() === "oui",
      };

      if (!contributionsByGiftId[contribution.giftId]) {
        contributionsByGiftId[contribution.giftId] = [];
      }
      contributionsByGiftId[contribution.giftId].push(contribution);
    });

  // Parse gifts and attach contributors
  const gifts = giftsRows.map((row, index) => {
    const giftId = row[0] ?? String(index + 1);
    const isPot = row[7]?.toLowerCase() === "oui";
    const contributors = isPot ? (contributionsByGiftId[giftId] ?? []) : undefined;

    return {
      id: giftId,
      title: row[1] ?? "",
      description: row[2] ?? "",
      price: parseInt(row[3], 10) || 0,
      imageUrl: row[4] ?? "",
      imageRatio: row[14] ? parseFloat(row[14]) : undefined,
      category: row[5] ?? "autre",
      externalUrl: row[6] ?? undefined,
      isPot,
      potCurrentAmount: parseInt(row[8], 10) || 0,
      contributors, // Contributors for pot gifts (count = contributors.length)
      isReserved: row[9]?.toLowerCase() === "oui",
      reservedBy: row[10] ?? undefined,
      reservedEmail: row[11] ?? undefined,
      reservedAt: row[12] ?? undefined,
      isOccasion: row[13]?.toLowerCase() === "oui",
    };
  });

  // Parse listInfo
  const listInfo: ListInfo = {
    title: configValues[0]?.[0] ?? "Notre Liste de Naissance",
    subtitle: configValues[1]?.[0] ?? "Bienvenue !",
    description: configValues[2]?.[0] ?? "",
    babyName: configValues[3]?.[0] ?? undefined,
    expectedDate: configValues[4]?.[0] ?? undefined,
    coverImageUrl: configValues[5]?.[0] ?? undefined,
    enableFreeContribution: configValues[6]?.[0]?.toLowerCase() === "oui",
    freeContributionTitle: configValues[7]?.[0] ?? "Contribution libre 💝",
  };

  return { gifts, listInfo };
}

// ==================== CONFIG ====================

export async function getListInfo(): Promise<ListInfo> {
  const sheets = getSheets();

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
  const sheets = getSheets();

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
      .map((v: string) => parseInt(v.trim(), 10))
      .filter((v: number) => !isNaN(v));

    return {
      potThresholdJpy: parseInt(values[0]?.[0], 10) || DEFAULT_CONFIG.POT_THRESHOLD_JPY,
      minContributionJpy: parseInt(values[1]?.[0], 10) || DEFAULT_CONFIG.MIN_CONTRIBUTION_JPY,
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
  const sheets = getSheets();

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
