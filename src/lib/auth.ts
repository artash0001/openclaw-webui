import { cookies } from "next/headers";
import { timingSafeEqual, randomBytes, createHmac } from "crypto";

const COOKIE_NAME = "openclaw_session";
const SESSION_MAX_AGE_S = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET not set");
  return s;
}

/**
 * Session tokens are stateless HMAC-signed values: "timestamp.random.hmac"
 * The middleware and server routes can both verify them independently.
 */
function signToken(timestamp: number, nonce: string): string {
  const payload = `${timestamp}.${nonce}`;
  const hmac = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verifyToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [tsStr, nonce, providedHmac] = parts;
  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) return false;

  // Check expiry
  const ageS = (Date.now() - timestamp) / 1000;
  if (ageS < 0 || ageS > SESSION_MAX_AGE_S) return false;

  // Verify HMAC
  const expectedHmac = createHmac("sha256", getSecret())
    .update(`${tsStr}.${nonce}`)
    .digest("hex");

  if (providedHmac.length !== expectedHmac.length) return false;
  return timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac));
}

export function createSession(): { name: string; value: string } {
  const timestamp = Date.now();
  const nonce = randomBytes(16).toString("hex");
  return { name: COOKIE_NAME, value: signToken(timestamp, nonce) };
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

// --- Rate limiting ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= MAX_ATTEMPTS;
}

export function checkPassword(password: string): boolean {
  const expected = process.env.WEBUI_PASSWORD;
  if (!expected) return false;
  if (password.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}
