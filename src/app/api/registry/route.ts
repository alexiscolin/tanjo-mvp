import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/currency";
import { getPublicGifts, getListInfo } from "@/lib/google-sheets";

/**
 * Registry API - Fetch all registry data in one call
 * GET /api/registry
 *
 * Returns: gifts (with contributors already included), listInfo, exchangeRates
 * Single batch fetch - contributors are loaded by getGifts()
 */
export async function GET() {
  try {
    // ⚠️ SECURITY: public endpoint — getPublicGifts(), never getGifts().
    const [gifts, listInfo, rates] = await Promise.all([
      getPublicGifts(),
      getListInfo(),
      getExchangeRates(),
    ]);

    // Filter empty rows
    const validGifts = gifts.filter((g) => g.title && g.title.trim() !== "");

    const response = NextResponse.json({
      gifts: validGifts,
      listInfo,
      exchangeRates: rates,
    });

    // Short cache: 10 seconds to see changes quickly
    // Perfect for low-traffic sites with frequent admin updates
    response.headers.set("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");

    return response;
  } catch (error) {
    console.error("Error fetching registry data:", error);

    return NextResponse.json({ error: "Error fetching registry data" }, { status: 500 });
  }
}
