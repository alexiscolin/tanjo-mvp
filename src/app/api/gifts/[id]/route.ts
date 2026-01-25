import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { updateGift, deleteGift } from "@/lib/google-sheets";

// PATCH /api/gifts/[id] - Update a gift (partial update)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const isAuthenticated = verifySession(request);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const { updates } = await request.json();

    if (!updates) {
      return NextResponse.json({ error: "Updates required" }, { status: 400 });
    }

    await updateGift(id, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating gift:", error);

    return NextResponse.json({ error: "Erreur lors de la modification" }, { status: 500 });
  }
}

// DELETE /api/gifts/[id] - Delete a gift
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthenticated = verifySession(request);

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;

    await deleteGift(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gift:", error);

    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
