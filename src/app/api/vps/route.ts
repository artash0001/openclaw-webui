import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { execFileSync } from "child_process";

function run(bin: string, args: string[]): string {
  try {
    return execFileSync(bin, args, { timeout: 5000 }).toString().trim();
  } catch {
    return "";
  }
}

async function read(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    // CPU: load averages and core count
    const loadavg = await read("/proc/loadavg");
    const [load1, load5, load15] = loadavg.split(" ").map(Number);
    const cpuinfo = await read("/proc/cpuinfo");
    const cores = (cpuinfo.match(/^processor\s/gm) || []).length || 1;

    // Memory from /proc/meminfo
    const meminfo = await read("/proc/meminfo");
    const memVal = (key: string): number => {
      const m = meminfo.match(new RegExp(`${key}:\\s+(\\d+)`));
      return m ? parseInt(m[1], 10) : 0;
    };
    const memTotalKB = memVal("MemTotal");
    const memAvailKB = memVal("MemAvailable");
    const memUsedKB = memTotalKB - memAvailKB;

    // Disk usage
    const dfRaw = run("df", ["-h", "/"]);
    const dfLine = dfRaw.split("\n")[1] || "";
    const dfParts = dfLine.split(/\s+/);
    const disk = {
      total: dfParts[1] || "?",
      used: dfParts[2] || "?",
      available: dfParts[3] || "?",
      percent: dfParts[4] || "?",
    };

    // Uptime
    const uptimeRaw = await read("/proc/uptime");
    const uptimeSec = parseFloat(uptimeRaw.split(" ")[0]) || 0;
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const uptime = `${days}d ${hours}h ${minutes}m`;

    // Network I/O from /proc/net/dev
    const netdev = await read("/proc/net/dev");
    let rxBytes = 0;
    let txBytes = 0;
    for (const line of netdev.split("\n")) {
      if (line.includes(":") && !line.includes("lo:")) {
        const parts = line.split(":")[1]?.trim().split(/\s+/);
        if (parts) {
          rxBytes += parseInt(parts[0], 10) || 0;
          txBytes += parseInt(parts[8], 10) || 0;
        }
      }
    }

    // Top processes by CPU (show only binary name, not full args which may contain secrets)
    const psRaw = run("ps", ["-eo", "user,pid,%cpu,%mem,comm", "--sort=-%cpu"]);
    const psLines = psRaw.split("\n").slice(1, 9); // skip header, take top 8
    const processes = psLines.map((line) => {
      const cols = line.trim().split(/\s+/);
      return {
        user: cols[0],
        pid: cols[1],
        cpu: cols[2],
        mem: cols[3],
        command: cols[4] || "",
      };
    });

    // OS info
    const osRelease = await read("/etc/os-release");
    const prettyName =
      osRelease.match(/PRETTY_NAME="(.+?)"/)?.[1] || "Linux";
    const hostname = run("hostname", []);

    // OpenClaw service status
    const openclawUid = run("id", ["-u", "openclaw"]);
    const serviceStatus = openclawUid
      ? run("sudo", [
          "-u", "openclaw",
          "env", `XDG_RUNTIME_DIR=/run/user/${openclawUid}`,
          "systemctl", "--user", "is-active", "openclaw.service",
        ])
      : "unknown";

    return NextResponse.json({
      cpu: { load1, load5, load15, cores },
      memory: {
        totalMB: Math.round(memTotalKB / 1024),
        usedMB: Math.round(memUsedKB / 1024),
        availableMB: Math.round(memAvailKB / 1024),
        percent: Math.round((memUsedKB / memTotalKB) * 100),
      },
      disk,
      uptime,
      network: { rxBytes, txBytes },
      processes,
      os: { prettyName, hostname },
      openclawStatus: serviceStatus || "unknown",
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to read VPS stats" },
      { status: 500 }
    );
  }
}
