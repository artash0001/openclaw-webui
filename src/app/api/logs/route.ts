import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const LOGS_DIR = "/home/openclaw/.openclaw/logs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lines = Math.min(Math.max(parseInt(searchParams.get("lines") || "200") || 200, 1), 2000);

  try {
    // Find log files
    let logFiles: string[] = [];
    try {
      const entries = await readdir(LOGS_DIR);
      logFiles = entries
        .filter((f) => f.endsWith(".log") || f.endsWith(".jsonl"))
        .sort()
        .reverse();
    } catch {
      // If no log dir, try systemd journal
    }

    if (logFiles.length === 0) {
      return NextResponse.json({ logs: [], source: "none" });
    }

    // Read the most recent log file
    const latestFile = join(LOGS_DIR, logFiles[0]);
    const content = await readFile(latestFile, "utf-8");
    const allLines = content.trim().split("\n").slice(-lines);

    return NextResponse.json({
      logs: allLines,
      file: logFiles[0],
      source: "file",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to read logs" },
      { status: 500 }
    );
  }
}
