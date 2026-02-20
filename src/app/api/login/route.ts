import { NextRequest, NextResponse } from "next/server";
import {
  checkPassword,
  createSession,
  checkRateLimit,
  getSessionCookieName,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.password || !checkPassword(body.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const session = createSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(session.name, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return response;
}

// Logout — clear the cookie
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(getSessionCookieName());
  return response;
}
