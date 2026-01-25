import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

// GET /api/admin/verify - Check if user is authenticated
export function GET(request: NextRequest) {
  try {
    const isAuthenticated = verifySession(request);

    if (!isAuthenticated) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("Error verifying session:", error);

    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
