import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { POOL_ID } from "@/lib/constants";
import { getContributions, getGifts } from "@/lib/google-sheets";

export async function GET(request: NextRequest) {
  // Protect contributions endpoint - only authenticated admins can access
  const isAuthenticated = verifySession(request);

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [contributions, gifts] = await Promise.all([getContributions(), getGifts()]);

    // Enrich contributions with gift details
    const enrichedContributions = contributions.map((contrib) => {
      let giftTitle = "Unknown Gift";

      if (contrib.giftId === POOL_ID) {
        giftTitle = "Contribution libre 💝";
      } else {
        const gift = gifts.find((g) => g.id === contrib.giftId);

        giftTitle = gift?.title ?? `Gift ${contrib.giftId}`;
      }

      return {
        ...contrib,
        giftTitle,
      };
    });

    // Sort by date (most recent first)
    enrichedContributions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ contributions: enrichedContributions });
  } catch (error) {
    console.error("Error fetching contributions:", error);

    return NextResponse.json({ error: "Failed to fetch contributions" }, { status: 500 });
  }
}
