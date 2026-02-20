import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const OPENCLAW_BIN = "/home/openclaw/openclaw/openclaw.mjs";
const NODE_BIN = "/usr/bin/node";

interface RpcResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export async function gatewayCall(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 15000
): Promise<RpcResult> {
  try {
    const args = [
      OPENCLAW_BIN,
      "gateway",
      "call",
      method,
      "--json",
      "--timeout",
      String(timeoutMs),
    ];

    if (Object.keys(params).length > 0) {
      args.push("--params", JSON.stringify(params));
    }

    // Only pass required env vars to child process (never spread process.env)
    const { stdout } = await execFileAsync(NODE_BIN, args, {
      timeout: timeoutMs + 5000,
      env: {
        HOME: "/home/openclaw",
        PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
        NODE_ENV: process.env.NODE_ENV || "production",
      },
      cwd: "/home/openclaw/openclaw",
    });

    const data = JSON.parse(stdout.trim());
    return { ok: true, data };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    // Try to parse stdout even on non-zero exit
    if (error.stdout) {
      try {
        const data = JSON.parse(error.stdout.trim());
        return { ok: true, data };
      } catch {}
    }
    return {
      ok: false,
      error: error.stderr || error.message || String(err),
    };
  }
}

export async function gatewayHealth() {
  return gatewayCall("health");
}

export async function gatewayAgentsList() {
  return gatewayCall("agents.list");
}

export async function gatewayStatus() {
  return gatewayCall("status");
}

export async function gatewayUsageCost() {
  return gatewayCall("usage.cost");
}

export async function gatewaySessionsList() {
  return gatewayCall("sessions.list");
}

export async function gatewayChannelsStatus() {
  return gatewayCall("channels.status");
}

export async function gatewayConfigGet() {
  return gatewayCall("config.get");
}

export async function gatewayCronList() {
  return gatewayCall("cron.list");
}

export async function gatewayAgentFiles(agentId: string) {
  return gatewayCall("agents.files.list", { agentId });
}

export async function gatewayAgentFileGet(agentId: string, path: string) {
  return gatewayCall("agents.files.get", { agentId, path });
}
