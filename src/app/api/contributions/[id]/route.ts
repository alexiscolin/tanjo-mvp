import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { deleteContribution, updateContributionPaid } from "@/lib/google-sheets";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthenticated = verifySession(request);

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing contribution ID" }, { status: 400 });
    }

    const body = await request.json();
    const paid = body?.paid;

    if (typeof paid !== "boolean") {
      return NextResponse.json({ error: "Body must include paid: boolean" }, { status: 400 });
    }

    await updateContributionPaid(id, paid);

    return NextResponse.json({ success: true, paid });
  } catch (error) {
    console.error("Error updating contribution paid status:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error updating contribution paid status",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing contribution ID" }, { status: 400 });
    }

    await deleteContribution(id);

    return NextResponse.json({
      success: true,
      message: "Contribution cancelled successfully",
    });
  } catch (error) {
    console.error("Error cancelling contribution:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error cancelling contribution" },
      { status: 500 }
    );
  }
}
