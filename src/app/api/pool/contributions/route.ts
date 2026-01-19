import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { POOL_ID } from "@/lib/constants";
import { getExchangeRates } from "@/lib/currency";
import { addContribution, getContributions, getPaymentConfig } from "@/lib/google-sheets";
import {
  sendContributionConfirmationEmail,
  sendContributionNotificationToAdmin,
} from "@/lib/resend";
import { validateContribution, isValidationError } from "@/lib/utils";

// GET /api/pool/contributions - List all pool contributions
export async function GET() {
  try {
    const contributions = await getContributions(POOL_ID);

    // Return anonymized data (hide email for privacy)
    const anonymizedContributions = contributions.map((c) => ({
      id: c.id,
      name: c.name,
      amount: c.amount,
      message: c.message,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ contributions: anonymizedContributions });
  } catch (error) {
    console.error("Error fetching pool contributions:", error);

    return NextResponse.json({ error: "Error fetching contributions" }, { status: 500 });
  }
}

// POST /api/pool/contributions - Contribute to the global pool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate and sanitize input
    const validation = validateContribution({
      name: body.name,
      email: body.email,
      amount: body.amount,
      message: body.message,
      currency: body.currency,
    });

    if (isValidationError(validation)) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const {
      name: sanitizedName,
      email: sanitizedEmail,
      amount: amountInJpy,
      message: sanitizedMessage,
      currency,
    } = validation;

    // Save contribution to pool (now returns { id, cancelToken })
    const { id: contributionId, cancelToken } = await addContribution({
      giftId: POOL_ID,
      name: sanitizedName,
      email: sanitizedEmail,
      amount: amountInJpy,
      message: sanitizedMessage,
    });

    // Get payment config for emails
    const paymentConfig = await getPaymentConfig();

    // Get exchange rates for currency conversion in emails
    const exchangeRates = await getExchangeRates();

    // Send emails (don't crash if it fails)
    try {
      const emailData = {
        giftId: "POOL" as const,
        contributorName: sanitizedName,
        contributorEmail: sanitizedEmail,
        amountInJpy,
        currency,
        message: sanitizedMessage || undefined,
        cancelToken,
      };

      await Promise.all([
        sendContributionConfirmationEmail(emailData, paymentConfig, exchangeRates),
        sendContributionNotificationToAdmin(emailData),
      ]);
    } catch (emailError) {
      console.error("Email sending error (non-blocking):", emailError);
    }

    return NextResponse.json({
      success: true,
      contributionId,
      newTotal: amountInJpy,
      percentage: 0,
    });
  } catch (error) {
    console.error("Error contributing to pool:", error);

    return NextResponse.json({ error: "Error contributing" }, { status: 500 });
  }
}
