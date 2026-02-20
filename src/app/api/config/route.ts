import { NextResponse } from "next/server";
import { readFile, writeFile, copyFile } from "fs/promises";

const CONFIG_PATH = "/home/openclaw/.openclaw/openclaw.json";
const BACKUP_PATH = "/home/openclaw/.openclaw/openclaw.json.bak";

// Top-level keys that are allowed in the config.
// Reject writes that introduce unknown root keys to prevent misuse.
const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "meta",
  "wizard",
  "models",
  "agents",
  "tools",
  "bindings",
  "messages",
  "commands",
  "hooks",
  "channels",
  "gateway",
  "skills",
  "plugins",
]);

const MAX_CONFIG_SIZE = 512 * 1024; // 512 KB

function validateConfig(raw: string): { ok: true; parsed: Record<string, unknown> } | { ok: false; error: string } {
  if (raw.length > MAX_CONFIG_SIZE) {
    return { ok: false, error: `Config too large (${raw.length} bytes, max ${MAX_CONFIG_SIZE})` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Invalid JSON syntax" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "Config must be a JSON object" };
  }

  const obj = parsed as Record<string, unknown>;
  const unknownKeys = Object.keys(obj).filter((k) => !ALLOWED_TOP_LEVEL_KEYS.has(k));
  if (unknownKeys.length > 0) {
    return { ok: false, error: `Unknown top-level keys: ${unknownKeys.join(", ")}` };
  }

  return { ok: true, parsed: obj };
}

export async function GET() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return NextResponse.json({ raw, parsed: JSON.parse(raw) });
  } catch {
    return NextResponse.json(
      { error: "Failed to read config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  let body: { raw?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const raw = body.raw;
  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Missing 'raw' field" }, { status: 400 });
  }

  const result = validateConfig(raw);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    // Create backup before overwrite
    await copyFile(CONFIG_PATH, BACKUP_PATH).catch(() => {});
    await writeFile(CONFIG_PATH, raw, "utf-8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to write config" },
      { status: 500 }
    );
  }
}
