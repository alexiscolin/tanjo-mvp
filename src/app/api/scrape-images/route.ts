import dns from "dns/promises";
import net from "net";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10000;

/**
 * Reject addresses that are not routable on the public internet.
 * Blocks loopback, RFC1918, carrier-grade NAT, and — critically — the
 * 169.254.0.0/16 link-local range that carries cloud instance metadata.
 */
function isPrivateAddress(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    const [a, b] = ip.split(".").map(Number);

    return (
      a === 0 || // 0.0.0.0/8
      a === 10 || // 10.0.0.0/8 private
      a === 127 || // 127.0.0.0/8 loopback
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 CGNAT
      (a === 169 && b === 254) || // 169.254.0.0/16 link-local (cloud metadata)
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
      (a === 192 && b === 168) || // 192.168.0.0/16 private
      (a === 192 && b === 0) || // 192.0.0.0/24 IETF protocol assignments
      (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 benchmarking
      a >= 224 // multicast + reserved
    );
  }

  if (version === 6) {
    const normalized = ip.toLowerCase();

    // IPv4-mapped (::ffff:10.0.0.1) must be judged on its IPv4 value
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);

    if (mapped) return isPrivateAddress(mapped[1]);

    return (
      normalized === "::" ||
      normalized === "::1" || // loopback
      normalized.startsWith("fc") || // fc00::/7 unique local
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") || // fe80::/10 link-local
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff") // multicast
    );
  }

  return true; // unparseable: refuse
}

/**
 * Validate a candidate URL against SSRF: http(s) only, and every address the
 * hostname resolves to must be publicly routable. Resolving all records (rather
 * than trusting the literal) blocks hostnames that point at internal space.
 */
async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let parsed: URL;

  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("URL invalide");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Seules les URLs http(s) sont autorisées");
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) throw new Error("Adresse non autorisée");

    return parsed;
  }

  let addresses: { address: string }[];

  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error("Hôte introuvable");
  }

  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Adresse non autorisée");
  }

  return parsed;
}

/**
 * Fetch following redirects manually, re-validating every hop. Automatic
 * redirect following would let a public URL bounce the request into private
 * space, defeating the check on the initial URL.
 */
async function safeFetch(startUrl: string, headers: Record<string, string>): Promise<Response> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttpUrl(current);

    const response = await fetch(current, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status < 300 || response.status >= 400) return response;

    const location = response.headers.get("location");

    if (!location) return response;

    current = new URL(location, current).href;
  }

  throw new Error("Trop de redirections");
}

// Common image extensions
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"];

function isDirectImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    return IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

function resolveUrl(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return src;
  }
}

function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const images: Set<string> = new Set();

  // Extract from <img src="...">
  const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;

  while ((match = imgSrcRegex.exec(html)) !== null) {
    const src = match[1];

    if (src && !src.startsWith("data:")) {
      images.add(resolveUrl(src, baseUrl));
    }
  }

  // Extract from srcset
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;

  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1];
    // Parse srcset (format: "url1 1x, url2 2x" or "url1 100w, url2 200w")
    const parts = srcset.split(",");

    for (const part of parts) {
      const url = part.trim().split(/\s+/)[0];

      if (url && !url.startsWith("data:")) {
        images.add(resolveUrl(url, baseUrl));
      }
    }
  }

  // Extract from CSS background-image
  const bgImageRegex = /background(?:-image)?:\s*url\(['"]?([^'")]+)['"]?\)/gi;

  while ((match = bgImageRegex.exec(html)) !== null) {
    const src = match[1];

    if (src && !src.startsWith("data:")) {
      images.add(resolveUrl(src, baseUrl));
    }
  }

  // Extract from <source srcset="...">
  const sourceSrcsetRegex = /<source[^>]+srcset=["']([^"']+)["']/gi;

  while ((match = sourceSrcsetRegex.exec(html)) !== null) {
    const srcset = match[1];
    const parts = srcset.split(",");

    for (const part of parts) {
      const url = part.trim().split(/\s+/)[0];

      if (url && !url.startsWith("data:")) {
        images.add(resolveUrl(url, baseUrl));
      }
    }
  }

  // Extract from og:image meta tags
  const ogImageRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;

  while ((match = ogImageRegex.exec(html)) !== null) {
    images.add(resolveUrl(match[1], baseUrl));
  }
  // Also try reverse order of attributes
  const ogImageRegex2 = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi;

  while ((match = ogImageRegex2.exec(html)) !== null) {
    images.add(resolveUrl(match[1], baseUrl));
  }

  // Filter to keep only image URLs
  return Array.from(images).filter((url) => {
    try {
      const urlObj = new URL(url);
      // Check if it looks like an image
      const pathname = urlObj.pathname.toLowerCase();
      const hasImageExt = IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
      const hasImageInPath = /\.(jpg|jpeg|png|gif|webp|avif|svg)/i.test(url);
      const isImageService = /(images|img|photo|media|cdn|static)/i.test(url);

      return hasImageExt || hasImageInPath || isImageService;
    } catch {
      return false;
    }
  });
}

export async function POST(request: NextRequest) {
  // ⚠️ SECURITY: this endpoint makes the server fetch an attacker-supplied URL.
  // It only ever backs the admin image picker, so it requires a session — an
  // anonymous caller must not be able to use the server as an HTTP proxy.
  if (!verifySession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL requise" }, { status: 400 });
    }

    // Validate scheme + resolved addresses before any outbound request
    let parsedUrl: URL;

    try {
      parsedUrl = await assertPublicHttpUrl(url);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "URL invalide" },
        { status: 400 }
      );
    }

    // Check if it's a direct image URL
    if (isDirectImageUrl(url)) {
      return NextResponse.json({
        isDirectImage: true,
        imageUrl: url,
      });
    }

    // Fetch the page, re-validating each redirect hop (10 second timeout)
    const response = await safeFetch(url, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Impossible de charger la page (${response.status})`,
        },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";

    // If it's an image (content-type check)
    if (contentType.startsWith("image/")) {
      return NextResponse.json({
        isDirectImage: true,
        imageUrl: url,
      });
    }

    // Parse HTML
    const html = await response.text();
    const images = extractImagesFromHtml(html, parsedUrl.origin);

    // Remove duplicates and limit to 50 images
    const uniqueImages = [...new Set(images)].slice(0, 50);

    return NextResponse.json({
      isDirectImage: false,
      images: uniqueImages,
      pageUrl: url,
    });
  } catch (error) {
    console.error("Error scraping images:", error);

    return NextResponse.json(
      {
        error: "Erreur lors du chargement de la page",
      },
      { status: 500 }
    );
  }
}
