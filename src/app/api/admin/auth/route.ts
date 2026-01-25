import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/auth";

// ⚠️ LIMITATION MVP: In-memory rate limiting
// This resets on Netlify Function cold starts and doesn't work across concurrent instances.
// For production with multiple instances, use a persistent store.
// For this MVP, this provides basic protection against casual brute-force attempts.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : (request.headers.get("x-real-ip") ?? "unknown");

  return `login:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean } {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || attempt.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });

    return { allowed: true };
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    return { allowed: false };
  }

  attempt.count++;

  return { allowed: true };
}

// ⚠️ CSRF: Protected by SameSite=Strict cookies (stricter than Lax for admin).
export async function POST(request: NextRequest) {
  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = checkRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Veuillez réessayer dans 15 minutes." },
      { status: 429 }
    );
  }

  let body: { password?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { password } = body;

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  try {
    if (!verifyPassword(password)) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });

    createSession(response);

    loginAttempts.delete(rateLimitKey);

    return response;
  } catch (error) {
    console.error("Error verifying password:", error);

    return NextResponse.json({ error: "Erreur lors de la vérification" }, { status: 500 });
  }
}

export function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete("admin_session");

  return response;
}
