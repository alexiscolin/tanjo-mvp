import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateGift, deleteGift } from "@/lib/google-sheets";

// PATCH /api/gifts/[id] - Update a gift (partial update)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { password, updates } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
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
    const { id } = await params;
    const { password } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    await deleteGift(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gift:", error);

    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
