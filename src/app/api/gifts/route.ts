import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getGiftsAndListInfo, addGift } from "@/lib/google-sheets";

// GET /api/gifts - Fetch all gifts
export async function GET() {
  try {
    const { gifts, listInfo } = await getGiftsAndListInfo();

    // Filter empty rows
    const validGifts = gifts.filter((g) => g.title?.trim() !== "");

    const response = NextResponse.json({ gifts: validGifts, listInfo });

    // Short cache: 10 seconds to see changes quickly while reducing unnecessary calls
    // Perfect for low-traffic sites with frequent admin updates
    response.headers.set("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");

    return response;
  } catch (error) {
    console.error("Error fetching gifts:", error);

    return NextResponse.json({ error: "Error fetching gifts" }, { status: 500 });
  }
}

// POST /api/gifts - Add a gift (password protected)
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const isAuthenticated = verifySession(request);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gift } = await request.json();

    if (!gift) {
      return NextResponse.json({ error: "Gift data required" }, { status: 400 });
    }

    await addGift(gift);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding gift:", error);

    return NextResponse.json({ error: "Error adding gift" }, { status: 500 });
  }
}
