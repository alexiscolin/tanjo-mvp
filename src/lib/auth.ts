import crypto from "crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 heures

// ⚠️ SECURITY: SESSION_SECRET must be explicitly set to a random 32+ byte value.
// Do not reuse ADMIN_PASSWORD or use fallback secrets.
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET environment variable must be set to a random value of at least 32 bytes"
    );
  }

  return secret;
}

interface SessionData {
  authenticated: boolean;
  expiresAt: number;
  sessionId?: string;
}

function createSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Verify admin password with constant-time comparison to prevent timing attacks
 */
// ⚠️ SECURITY: Password is stored in plain text and compared directly.
// For production, consider using a salted hash (Argon2id or bcrypt).
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return false;
  }

  const passwordBuf = Buffer.from(password, "utf-8");
  const adminPasswordBuf = Buffer.from(adminPassword, "utf-8");

  if (passwordBuf.length !== adminPasswordBuf.length) {
    crypto.timingSafeEqual(
      Buffer.alloc(adminPasswordBuf.length),
      Buffer.alloc(adminPasswordBuf.length)
    );

    return false;
  }

  return crypto.timingSafeEqual(passwordBuf, adminPasswordBuf);
}

// ⚠️ LIMITATION: No server-side session store.
// Sessions cannot be revoked, tracked, or detected across devices.
// Stolen cookies remain valid until expiration.
export function createSession(response: NextResponse): void {
  const sessionId = createSessionToken();
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  const sessionData: SessionData = {
    authenticated: true,
    expiresAt,
    sessionId, // Random ID for future server-side storage if needed
  };

  const encoded = Buffer.from(JSON.stringify(sessionData)).toString("base64");
  const signature = crypto.createHmac("sha256", getSessionSecret()).update(encoded).digest("hex");

  const cookieValue = `${encoded}.${signature}`;

  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS required in production
    sameSite: "strict", // Stricter CSRF protection for admin
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });
}

/**
 * Verify session from cookie
 */
export function verifySession(request: NextRequest): boolean {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!cookie?.value) {
    return false;
  }

  try {
    const [encoded, signature] = cookie.value.split(".");

    if (!encoded || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", getSessionSecret())
      .update(encoded)
      .digest("hex");

    const signatureBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");

    if (signatureBuf.length !== expectedBuf.length) {
      crypto.timingSafeEqual(Buffer.alloc(expectedBuf.length), Buffer.alloc(expectedBuf.length));

      return false;
    }

    if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
      return false;
    }

    // Validate base64 length before parsing to prevent DoS
    if (encoded.length > 1024) {
      return false;
    }

    const sessionData: SessionData = JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));

    if (sessionData.expiresAt < Date.now()) {
      return false;
    }

    return sessionData.authenticated === true;
  } catch {
    // Malformed cookie - silently reject without logging to prevent log flooding
    return false;
  }
}

/**
 * Clear session cookie
 */
export function clearSession(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}

/**
 * Middleware to check authentication
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const isAuthenticated = verifySession(request);

  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
