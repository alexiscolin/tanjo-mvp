import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL requise" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }

    // Check if it's a direct image URL
    if (isDirectImageUrl(url)) {
      return NextResponse.json({
        isDirectImage: true,
        imageUrl: url,
      });
    }

    // Fetch the page (10 second timeout)
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(10000),
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
