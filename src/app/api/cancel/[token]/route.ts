import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { POOL_ID } from "@/lib/constants";
import {
  getContributionByCancelToken,
  deleteContributionByCancelToken,
  getGifts,
} from "@/lib/google-sheets";
import {
  sendCancellationConfirmationEmail,
  sendCancellationNotificationToAdmin,
} from "@/lib/resend";

// GET /api/cancel/[token] - Get contribution info by cancel token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    const contribution = await getContributionByCancelToken(token);

    if (!contribution) {
      return NextResponse.json(
        { error: "Contribution introuvable ou déjà annulée" },
        { status: 404 }
      );
    }

    // Get gift title
    let giftTitle = "Contribution libre 💝";

    if (contribution.giftId !== POOL_ID) {
      const gifts = await getGifts();
      const gift = gifts.find((g) => g.id === contribution.giftId);

      giftTitle = gift?.title ?? "Cadeau";
    }

    // Return contribution info (without sensitive data like email)
    return NextResponse.json({
      contribution: {
        id: contribution.id,
        giftId: contribution.giftId,
        giftTitle,
        name: contribution.name,
        amount: contribution.amount,
        createdAt: contribution.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching contribution by token:", error);

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/cancel/[token] - Cancel a contribution
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const feedback = body?.feedback as string | undefined;

    if (!token) {
      return NextResponse.json({ error: "Token manquant" }, { status: 400 });
    }

    // Get contribution info before deletion
    const contribution = await getContributionByCancelToken(token);

    if (!contribution) {
      return NextResponse.json(
        { error: "Contribution introuvable ou déjà annulée" },
        { status: 404 }
      );
    }

    // Get gift title for emails
    let giftTitle = "Contribution libre 💝";

    if (contribution.giftId !== POOL_ID) {
      const gifts = await getGifts();
      const gift = gifts.find((g) => g.id === contribution.giftId);

      giftTitle = gift?.title ?? "Cadeau";
    }

    // Delete the contribution
    await deleteContributionByCancelToken(token);

    // Send confirmation emails (non-blocking)
    try {
      await Promise.all([
        sendCancellationConfirmationEmail(
          contribution.email,
          contribution.name,
          giftTitle,
          contribution.amount,
          feedback
        ),
        sendCancellationNotificationToAdmin(
          contribution.name,
          contribution.email,
          giftTitle,
          contribution.amount,
          feedback
        ),
      ]);
    } catch (emailError) {
      console.error("Error sending cancellation emails:", emailError);
      // Don't fail the request if emails fail
    }

    return NextResponse.json({
      success: true,
      message: "Contribution annulée avec succès",
    });
  } catch (error) {
    console.error("Error cancelling contribution:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
