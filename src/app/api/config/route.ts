import { NextResponse } from "next/server";
import { DEFAULT_CONFIG } from "@/lib/constants";
import { getAppConfig, getPaymentConfig } from "@/lib/google-sheets";

export async function GET() {
  try {
    const [appConfig, paymentConfig] = await Promise.all([getAppConfig(), getPaymentConfig()]);

    const response = NextResponse.json({
      ...appConfig,
      payment: paymentConfig,
    });

    // Cache for 5 minutes (300 seconds)
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

    return response;
  } catch (error) {
    console.error("Error fetching config:", error);

    // Return defaults on error
    return NextResponse.json({
      potThresholdJpy: DEFAULT_CONFIG.POT_THRESHOLD_JPY,
      minContributionJpy: DEFAULT_CONFIG.MIN_CONTRIBUTION_JPY,
      suggestedContributionsJpy: DEFAULT_CONFIG.SUGGESTED_CONTRIBUTIONS_JPY,
      payment: {},
    });
  }
}
