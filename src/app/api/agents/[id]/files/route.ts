import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const OPENCLAW_DIR = "/home/openclaw/.openclaw";
const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
const TEXT_EXT = /\.(md|txt|json)$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
  }

  const dirs = [
    join(OPENCLAW_DIR, "agents", id, "agent"),
    join(OPENCLAW_DIR, "workspace", "agents", id),
  ];

  const allFiles: string[] = [];
  const contents: Record<string, string> = {};

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir);
      for (const file of entries) {
        if (TEXT_EXT.test(file) && !allFiles.includes(file)) {
          allFiles.push(file);
          try {
            contents[file] = await readFile(join(dir, file), "utf-8");
          } catch {}
        }
      }
    } catch {}
  }

  if (allFiles.length === 0) {
    return NextResponse.json({ files: [], contents: {} });
  }

  return NextResponse.json({ files: allFiles, contents });
}
