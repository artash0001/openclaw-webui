import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "openclaw_session";
const SESSION_MAX_AGE_S = 60 * 60 * 24; // 24 hours

/**
 * Verify HMAC-signed session token using Web Crypto API (Edge-compatible).
 * Token format: "timestamp.nonce.hmac"
 */
async function verifyTokenEdge(token: string): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tsStr, nonce, providedHmac] = parts;
  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) return false;

  // Check expiry
  const ageS = (Date.now() - timestamp) / 1000;
  if (ageS < 0 || ageS > SESSION_MAX_AGE_S) return false;

  // Verify HMAC using Web Crypto
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${tsStr}.${nonce}`));
  const expectedHmac = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (providedHmac.length !== expectedHmac.length) return false;

  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < expectedHmac.length; i++) {
    mismatch |= expectedHmac.charCodeAt(i) ^ providedHmac.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and login API
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  // Verify session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const valid = token ? await verifyTokenEdge(token) : false;

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
