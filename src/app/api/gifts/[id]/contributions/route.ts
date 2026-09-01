import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/currency";
import {
  addContribution,
  getGifts,
  getContributions,
  getPaymentConfig,
  toPublicContributor,
} from "@/lib/google-sheets";
import {
  sendContributionConfirmationEmail,
  sendContributionNotificationToAdmin,
} from "@/lib/resend";
import { validateContribution, isValidationError } from "@/lib/utils";

// GET /api/gifts/[id]/contributions - List all contributors for a gift
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contributions = await getContributions(id);

    // Return anonymized data (hides email + cancelToken)
    const anonymizedContributions = contributions.map(toPublicContributor);

    return NextResponse.json({ contributions: anonymizedContributions });
  } catch (error) {
    console.error("Error fetching contributions:", error);

    return NextResponse.json({ error: "Error fetching contributions" }, { status: 500 });
  }
}

// POST /api/gifts/[id]/contributions - Contribute to a gift (pot or full reservation)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    // Check that gift exists
    const gifts = await getGifts();
    const gift = gifts.find((g) => g.id === id);

    if (!gift) {
      return NextResponse.json({ error: "Gift not found" }, { status: 404 });
    }

    // Check if it's already fully reserved
    if (gift.isReserved && !gift.isPot) {
      return NextResponse.json({ error: "This gift has already been reserved" }, { status: 400 });
    }

    // Save contribution (now returns { id, cancelToken })
    const { id: contributionId, cancelToken } = await addContribution({
      giftId: id,
      name: sanitizedName,
      email: sanitizedEmail,
      amount: amountInJpy,
      message: sanitizedMessage,
    });

    // Calculate new total
    const newTotal = (gift.potCurrentAmount ?? 0) + amountInJpy;

    // Get payment config for emails
    const paymentConfig = await getPaymentConfig();

    // Get exchange rates for currency conversion in emails
    const exchangeRates = await getExchangeRates();

    // Send emails (don't crash if it fails)
    try {
      const emailData = {
        giftId: id,
        giftTitle: gift.title,
        giftImageUrl: gift.imageUrl ?? undefined,
        contributorName: sanitizedName,
        contributorEmail: sanitizedEmail,
        amountInJpy, // JPY for database storage
        currency,
        message: sanitizedMessage ?? undefined,
        totalCollected: newTotal,
        goal: gift.price,
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
      newTotal,
      percentage: Math.round((newTotal / gift.price) * 100),
      giftPrice: gift.price,
    });
  } catch (error) {
    console.error("Error contributing:", error);

    return NextResponse.json({ error: "Error contributing" }, { status: 500 });
  }
}
