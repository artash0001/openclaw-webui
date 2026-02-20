import { NextRequest, NextResponse } from "next/server";
import { gatewayCall } from "@/lib/gateway";

const ALLOWED_METHODS = new Set([
  "health",
  "status",
  "usage.cost",
  "agents.list",
  "sessions.list",
  "cron.list",
  "models.list",
  "skills.status",
  "channels.status",
]);

function resolveMethod(slug: string): string | null {
  const method = slug.replace(/-/g, ".");
  return ALLOWED_METHODS.has(method) ? method : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ method: string }> }
) {
  const { method } = await params;
  const rpcMethod = resolveMethod(method);
  if (!rpcMethod) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 403 });
  }
  const result = await gatewayCall(rpcMethod);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ method: string }> }
) {
  const { method } = await params;
  const rpcMethod = resolveMethod(method);
  if (!rpcMethod) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 403 });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {}

  const result = await gatewayCall(rpcMethod, body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
