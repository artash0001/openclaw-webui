"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { CostChart } from "./cost-chart";
import { CostBreakdownChart } from "./cost-breakdown-chart";
import { MetricCard } from "./metric-card";
import { AGENT_COLORS, fmt$, fmtTokens, timeAgo } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HealthData {
  ok: boolean;
  ts: number;
  channels: Record<string, { configured: boolean; running: boolean; mode?: string; lastError?: string }>;
}

interface StatusData {
  channelSummary: string[];
  heartbeat: {
    defaultAgentId: string;
    agents: { agentId: string; enabled: boolean; every: string }[];
  };
  sessions: {
    count: number;
    recent: {
      agentId: string;
      key: string;
      kind: string;
      totalTokens: number;
      updatedAt: number;
      subject?: string;
      displayName?: string;
      model?: string;
      percentUsed?: number;
      channel?: string;
    }[];
  };
}

interface DailyEntry {
  date: string;
  totalCost: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

interface CostData {
  daily: DailyEntry[];
  totals: { totalCost: number; totalTokens: number };
}

interface AgentInfo { id: string; name: string }
interface AgentsData { defaultId: string; agents: AgentInfo[] }

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string; tz?: string };
  payload?: { kind?: string; model?: string };
  delivery?: { mode?: string; channel?: string; to?: string };
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastError?: string;
    consecutiveErrors?: number;
  };
}
interface CronData { jobs: CronJob[] }

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  reasoning: boolean;
  input: string[];
}
interface ModelsData { models: ModelInfo[] }

interface ChannelAccount {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  running: boolean;
  connected?: boolean;
  linked?: boolean;
  reconnectAttempts?: number;
  lastConnectedAt?: number;
  lastError?: string | null;
  lastInboundAt?: number | null;
  lastOutboundAt?: number | null;
  mode?: string;
  dmPolicy?: string;
}
interface ChannelsData {
  channels: Record<string, ChannelAccount[]>;
  channelAccounts?: Record<string, ChannelAccount[]>;
}

interface SkillInfo {
  name: string;
  description: string;
  source: string;
  emoji?: string;
  eligible: boolean;
  disabled: boolean;
  missing?: { bins: string[]; env: string[]; config: string[] };
}
interface SkillsData { skills: SkillInfo[] }

interface VpsData {
  cpu: { load1: number; load5: number; load15: number; cores: number };
  memory: { totalMB: number; usedMB: number; availableMB: number; percent: number };
  disk: { total: string; used: string; available: string; percent: string };
  uptime: string;
  network: { rxBytes: number; txBytes: number };
  os: { prettyName: string; hostname: string };
  openclawStatus: string;
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const BUDGET = 500;

function fmtBytes(b: number): string {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(1) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b + " B";
}

function cronHuman(expr: string): string {
  const p = expr.split(" ");
  if (p.length < 5) return expr;
  const [min, hr, , , dow] = p;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayStr = dow === "*" ? "daily" : days[parseInt(dow)] || dow;
  return `${dayStr} ${hr}:${min.padStart(2, "0")}`;
}

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <div
      className={`w-2 h-2 rounded-full shrink-0 ${pulse ? "animate-pulse-dot" : ""}`}
      style={{ backgroundColor: color }}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-zinc-100">{children}</h2>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}

function Collapsible({ title, defaultOpen = false, count, children }: {
  title: string; defaultOpen?: boolean; count?: number; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 group w-full text-left"
      >
        <span className="text-zinc-500 text-xs transition-transform group-hover:text-zinc-400"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
          ▶
        </span>
        <SectionTitle>{title}</SectionTitle>
        {count !== undefined && (
          <span className="text-xs text-zinc-500 font-mono">{count}</span>
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export function Dashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [costs, setCosts] = useState<CostData | null>(null);
  const [agents, setAgents] = useState<AgentsData | null>(null);
  const [crons, setCrons] = useState<CronData | null>(null);
  const [models, setModels] = useState<ModelsData | null>(null);
  const [channels, setChannels] = useState<ChannelsData | null>(null);
  const [skills, setSkills] = useState<SkillsData | null>(null);
  const [vps, setVps] = useState<VpsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const lastRefresh = useRef(0);

  // Clock tick every second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Gateway data (30s)
  const fetchGateway = useCallback(async () => {
    try {
      const [hR, sR, cR, aR, crR, mR, chR, skR] = await Promise.all([
        fetch("/api/gateway/health"),
        fetch("/api/gateway/status"),
        fetch("/api/gateway/usage-cost"),
        fetch("/api/gateway/agents-list"),
        fetch("/api/gateway/cron-list"),
        fetch("/api/gateway/models-list"),
        fetch("/api/gateway/channels-status"),
        fetch("/api/gateway/skills-status"),
      ]);
      if (hR.ok) setHealth(await hR.json());
      if (sR.ok) setStatus(await sR.json());
      if (cR.ok) setCosts(await cR.json());
      if (aR.ok) setAgents(await aR.json());
      if (crR.ok) setCrons(await crR.json());
      if (mR.ok) setModels(await mR.json());
      if (chR.ok) setChannels(await chR.json());
      if (skR.ok) setSkills(await skR.json());
      setError(null);
      lastRefresh.current = Date.now();
    } catch (err) {
      setError(`Failed to connect: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // VPS data (10s)
  const fetchVps = useCallback(async () => {
    try {
      const r = await fetch("/api/vps");
      if (r.ok) setVps(await r.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchGateway();
    fetchVps();
    const g = setInterval(fetchGateway, 30000);
    const v = setInterval(fetchVps, 10000);
    return () => { clearInterval(g); clearInterval(v); };
  }, [fetchGateway, fetchVps]);

  /* Loading / Error states */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 animate-pulse">Connecting to gateway...</div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 bg-red-950/30 border border-red-900 rounded-lg p-6 max-w-md text-center">
          <p className="font-medium mb-2">Gateway Unreachable</p>
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={() => { fetchGateway(); fetchVps(); }}
            className="mt-4 px-4 py-2 bg-red-900/50 hover:bg-red-900 rounded text-sm transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* Derived data */
  const totalCost = costs?.totals?.totalCost ?? 0;
  const budgetPercent = (totalCost / BUDGET) * 100;
  const todayCost = costs?.daily?.[costs.daily.length - 1]?.totalCost ?? 0;
  const totalTokens = costs?.totals?.totalTokens ?? 0;
  const sessionCount = status?.sessions?.count ?? 0;

  const runningChannels = health
    ? Object.values(health.channels || {}).filter((c) => c.running).length
    : 0;
  const totalChannels = health ? Object.keys(health.channels || {}).length : 0;

  const cronErrors = crons?.jobs?.filter((j) => j.state?.lastStatus === "error").length ?? 0;

  // Cost breakdown totals across all days
  const costBreakdown = (costs?.daily ?? []).reduce(
    (acc, d) => ({
      inputCost: acc.inputCost + d.inputCost,
      outputCost: acc.outputCost + d.outputCost,
      cacheReadCost: acc.cacheReadCost + d.cacheReadCost,
      cacheWriteCost: acc.cacheWriteCost + d.cacheWriteCost,
    }),
    { inputCost: 0, outputCost: 0, cacheReadCost: 0, cacheWriteCost: 0 }
  );

  // Agent cards
  const allAgentIds = new Set<string>();
  agents?.agents?.forEach((a) => allAgentIds.add(a.id));
  status?.sessions?.recent?.forEach((s) => allAgentIds.add(s.agentId));
  crons?.jobs?.forEach((j) => allAgentIds.add(j.agentId));

  const agentCards = Array.from(allAgentIds).map((id) => {
    const info = agents?.agents?.find((a) => a.id === id);
    const sessions = status?.sessions?.recent?.filter((s) => s.agentId === id) ?? [];
    const jobs = crons?.jobs?.filter((j) => j.agentId === id) ?? [];
    const lastActivity = sessions.length > 0 ? Math.max(...sessions.map((s) => s.updatedAt)) : 0;
    const totalAgentTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
    const latestModel = sessions.length > 0
      ? sessions.sort((a, b) => b.updatedAt - a.updatedAt)[0]?.model
      : undefined;

    return {
      id,
      name: info?.name || id,
      color: AGENT_COLORS[id] || "#71717a",
      sessions: sessions.length,
      lastActivity,
      totalTokens: totalAgentTokens,
      cronJobs: jobs.length,
      cronErrors: jobs.filter((j) => j.state?.lastStatus === "error").length,
      isDefault: agents?.defaultId === id,
      model: latestModel,
    };
  });

  agentCards.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return b.lastActivity - a.lastActivity;
  });

  // Recent sessions (top 10)
  const recentSessions = [...(status?.sessions?.recent ?? [])]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10);

  // Default model ID
  const defaultModelId = status?.sessions?.recent?.[0]?.model;

  return (
    <div className="space-y-6">

      {/* ── Section 1: Status Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Dot color={health?.ok ? "#22c55e" : "#ef4444"} pulse={health?.ok} />
            <span className="text-zinc-100 font-medium">
              Gateway {health?.ok ? "Online" : "Offline"}
            </span>
          </div>
          {vps && (
            <>
              <span className="text-zinc-600">|</span>
              <span className="text-xs text-zinc-400">
                {vps.os.hostname}
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                {vps.openclawStatus === "active" ? (
                  <span className="text-green-500">service active</span>
                ) : (
                  <span className="text-red-400">service {vps.openclawStatus}</span>
                )}
              </span>
              <span className="text-xs text-zinc-600">up {vps.uptime}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 font-mono">
            {new Date(now).toLocaleString("en-US", {
              weekday: "short", month: "short", day: "numeric",
              hour: "2-digit", minute: "2-digit", second: "2-digit",
            })}
          </span>
          <button
            onClick={() => { fetchGateway(); fetchVps(); }}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-xs transition-colors text-zinc-300"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── Section 2: Key Metrics ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Month Cost"
          value={fmt$(totalCost)}
          sub={`${budgetPercent.toFixed(0)}% of ${fmt$(BUDGET)}`}
          alert={budgetPercent > 75}
          warn={budgetPercent > 50}
        />
        <MetricCard
          label="Today"
          value={fmt$(todayCost)}
          sub={new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        />
        <MetricCard
          label="Tokens"
          value={fmtTokens(totalTokens)}
          sub="this period"
        />
        <MetricCard
          label="Sessions"
          value={sessionCount}
          sub={`${agentCards.length} agents`}
        />
        <MetricCard
          label="Channels"
          value={`${runningChannels}/${totalChannels}`}
          sub={health
            ? Object.entries(health.channels || {}).map(([k, v]) => `${k}: ${v.running ? "up" : "down"}`).join(", ")
            : ""}
        />
        <MetricCard
          label="Cron Jobs"
          value={crons?.jobs?.length ?? 0}
          sub={cronErrors > 0 ? `${cronErrors} error${cronErrors > 1 ? "s" : ""}` : "all healthy"}
          alert={cronErrors > 0}
        />
      </div>

      {/* ── Section 3: Budget Bar ── */}
      <Card>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">Budget: {fmt$(BUDGET)}/month</span>
          <span className={budgetPercent > 75 ? "text-red-400" : budgetPercent > 50 ? "text-yellow-400" : "text-green-400"}>
            {fmt$(BUDGET - totalCost)} remaining
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              budgetPercent > 75 ? "bg-red-500" : budgetPercent > 50 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>
      </Card>

      {/* ── Section 4: Cost Analytics ── */}
      {costs?.daily && costs.daily.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Daily Cost (last 14 days)</h3>
            <CostChart data={costs.daily.slice(-14)} />
          </Card>
          <Card>
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Cost Breakdown</h3>
            <CostBreakdownChart data={costBreakdown} />
          </Card>
        </div>
      )}

      {/* ── Section 5: Agent Fleet ── */}
      <div>
        <SectionTitle>Agent Fleet</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {agentCards.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* ── Section 6: Channel Status ── */}
      {channels && (() => {
        const accts = channels.channelAccounts || {};
        const hasAccounts = Object.keys(accts).length > 0;
        if (!hasAccounts) return null;
        return (
          <div>
            <SectionTitle>Channels</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {Object.entries(accts).map(([name, accounts]) => (
                <Card key={name}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-zinc-200 capitalize">{name}</h3>
                    <span className="text-xs text-zinc-500">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-2">
                    {accounts.map((acc) => (
                      <div key={acc.accountId} className="flex items-start justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Dot color={acc.running ? "#22c55e" : acc.configured ? "#f59e0b" : "#ef4444"} />
                          <span className="text-zinc-300 font-mono truncate">{acc.accountId}</span>
                          {acc.mode && <span className="text-zinc-600">{acc.mode}</span>}
                          {acc.dmPolicy && <span className="text-zinc-600">dm:{acc.dmPolicy}</span>}
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          {acc.running ? (
                            <span className="text-green-500">running</span>
                          ) : acc.configured ? (
                            <span className="text-yellow-500">configured</span>
                          ) : (
                            <span className="text-red-400">offline</span>
                          )}
                          {acc.linked === false && <span className="text-red-400 ml-1">unlinked</span>}
                          {(acc.reconnectAttempts ?? 0) > 0 && (
                            <span className="text-yellow-400 ml-1">reconnect x{acc.reconnectAttempts}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {accounts.some((a) => a.lastError) && (
                      <div className="mt-1 text-xs text-red-400 truncate">
                        {accounts.find((a) => a.lastError)?.lastError}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Section 7: Model Providers ── */}
      {models && models.models.length > 0 && (
        <div>
          <SectionTitle>Models</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {models.models
              .filter((m) => ["anthropic", "minimax"].includes(m.provider))
              .map((m) => (
              <Card key={`${m.provider}/${m.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{m.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{m.provider}/{m.id}</p>
                  </div>
                  {m.id === defaultModelId && (
                    <span className="text-[10px] bg-orange-600/20 text-orange-400 px-1.5 py-0.5 rounded shrink-0">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                    {(m.contextWindow / 1000).toFixed(0)}K ctx
                  </span>
                  {m.input.map((cap) => (
                    <span key={cap} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                      {cap}
                    </span>
                  ))}
                  {m.reasoning && (
                    <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">
                      reasoning
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 8: Cron Scheduler ── */}
      {crons && crons.jobs.length > 0 && (
        <div>
          <SectionTitle>Cron Scheduler</SectionTitle>
          <Card className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-zinc-800">
                  <th className="pb-2 font-medium">Job</th>
                  <th className="pb-2 font-medium">Agent</th>
                  <th className="pb-2 font-medium">Schedule</th>
                  <th className="pb-2 font-medium">Last Run</th>
                  <th className="pb-2 font-medium">Next Run</th>
                  <th className="pb-2 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {crons.jobs.map((job) => (
                  <tr key={job.id} className={!job.enabled ? "opacity-40" : ""}>
                    <td className="py-2 pr-3">
                      <span className="text-zinc-200 font-mono">{job.name}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        <Dot color={AGENT_COLORS[job.agentId] || "#71717a"} />
                        <span className="text-zinc-400">{job.agentId}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-zinc-400 font-mono">
                      {cronHuman(job.schedule.expr)}
                      {job.schedule.tz && <span className="text-zinc-600 ml-1">{job.schedule.tz}</span>}
                    </td>
                    <td className="py-2 pr-3 text-zinc-500">
                      {job.state.lastRunAtMs ? timeAgo(job.state.lastRunAtMs) : "never"}
                    </td>
                    <td className="py-2 pr-3 text-zinc-500">
                      {job.state.nextRunAtMs
                        ? new Date(job.state.nextRunAtMs).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="py-2 text-right">
                      {job.state.lastStatus === "error" ? (
                        <span className="text-red-400">
                          error
                          {(job.state.consecutiveErrors ?? 0) > 1 && (
                            <span className="ml-1">x{job.state.consecutiveErrors}</span>
                          )}
                        </span>
                      ) : job.state.lastStatus ? (
                        <span className="text-green-500">{job.state.lastStatus}</span>
                      ) : (
                        <span className="text-zinc-600">{job.enabled ? "pending" : "disabled"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Section 9: VPS Health ── */}
      {vps && (
        <div>
          <SectionTitle>VPS Health</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
            <MetricCard
              label="CPU Load"
              value={`${vps.cpu.load1.toFixed(1)}`}
              sub={`${vps.cpu.cores} cores · avg ${vps.cpu.load5.toFixed(1)} / ${vps.cpu.load15.toFixed(1)}`}
              alert={vps.cpu.load1 / vps.cpu.cores > 0.9}
              warn={vps.cpu.load1 / vps.cpu.cores > 0.7}
            />
            <MetricCard
              label="RAM"
              value={`${vps.memory.percent}%`}
              sub={`${vps.memory.usedMB} / ${vps.memory.totalMB} MB`}
              alert={vps.memory.percent > 90}
              warn={vps.memory.percent > 75}
            />
            <MetricCard
              label="Disk"
              value={vps.disk.percent}
              sub={`${vps.disk.used} / ${vps.disk.total}`}
              alert={parseInt(vps.disk.percent) > 85}
              warn={parseInt(vps.disk.percent) > 70}
            />
            <MetricCard
              label="Network"
              value={`${fmtBytes(vps.network.rxBytes)}`}
              sub={`TX: ${fmtBytes(vps.network.txBytes)}`}
            />
            <MetricCard
              label="Uptime"
              value={vps.uptime}
              sub={vps.os.prettyName}
            />
          </div>
        </div>
      )}

      {/* ── Section 10: Skills ── */}
      {skills && skills.skills.length > 0 && (
        <Collapsible title="Skills" count={skills.skills.length}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {skills.skills.map((sk) => (
              <div
                key={sk.name}
                className={`flex items-center gap-2 px-3 py-2 rounded border text-xs ${
                  sk.disabled
                    ? "bg-zinc-900/50 border-zinc-800/50 opacity-50"
                    : sk.eligible
                    ? "bg-zinc-900 border-zinc-800"
                    : "bg-red-950/20 border-red-900/30"
                }`}
              >
                {sk.emoji && <span className="text-sm">{sk.emoji}</span>}
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-200 font-medium truncate">{sk.name}</p>
                  <p className="text-zinc-500 truncate">{sk.description}</p>
                </div>
                <span className="text-zinc-600 shrink-0">{sk.source.replace("openclaw-", "")}</span>
              </div>
            ))}
          </div>
        </Collapsible>
      )}

      {/* ── Section 11: Recent Sessions ── */}
      {recentSessions.length > 0 && (
        <Collapsible title="Recent Sessions" defaultOpen count={recentSessions.length}>
          <div className="space-y-2">
            {recentSessions.map((s, i) => (
              <Card key={i} className="!p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Dot color={AGENT_COLORS[s.agentId] || "#71717a"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-200 truncate">
                        {s.subject || s.displayName || s.key}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{s.agentId}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{s.kind}</span>
                        {s.channel && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{s.channel}</span>
                        )}
                        {s.model && (
                          <span className="text-[10px] text-zinc-500 font-mono">{s.model}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-zinc-200 font-mono">{fmtTokens(s.totalTokens)}</p>
                    {s.percentUsed !== undefined && (
                      <div className="flex items-center gap-1.5 mt-1 justify-end">
                        <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              s.percentUsed > 80 ? "bg-red-500" : s.percentUsed > 50 ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${s.percentUsed}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">{s.percentUsed}%</span>
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(s.updatedAt)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Collapsible>
      )}

      {/* ── Cron Errors Alert ── */}
      {cronErrors > 0 && (
        <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-400 mb-2">Cron Errors</h3>
          <div className="space-y-1">
            {crons!.jobs
              .filter((j) => j.state?.lastStatus === "error")
              .map((job) => (
                <div key={job.id} className="text-xs">
                  <span className="text-red-300 font-mono">{job.name}</span>
                  <span className="text-zinc-500 ml-2">({job.agentId})</span>
                  {job.state?.lastError && (
                    <span className="text-red-400 ml-2">{job.state.lastError}</span>
                  )}
                  {(job.state?.consecutiveErrors ?? 0) > 1 && (
                    <span className="text-red-500 ml-1">x{job.state.consecutiveErrors}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Card                                                         */
/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
}: {
  agent: {
    id: string;
    name: string;
    color: string;
    sessions: number;
    lastActivity: number;
    totalTokens: number;
    cronJobs: number;
    cronErrors: number;
    isDefault: boolean;
    model?: string;
  };
}) {
  const [now] = useState(() => Date.now());
  const active = agent.lastActivity > now - 3600000;

  return (
    <a
      href={`/agents/${agent.id}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Dot color={agent.color} pulse={active} />
          <div>
            <h3 className="font-medium text-zinc-100">
              {agent.name}
              {agent.isDefault && (
                <span className="ml-2 text-[10px] bg-orange-600/20 text-orange-400 px-1.5 py-0.5 rounded">
                  DEFAULT
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-500 font-mono">{agent.id}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold font-mono text-zinc-200">{agent.sessions}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Sessions</p>
        </div>
        <div>
          <p className="text-lg font-bold font-mono text-zinc-200">{fmtTokens(agent.totalTokens)}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Tokens</p>
        </div>
        <div>
          <p className="text-lg font-bold font-mono text-zinc-200">
            {agent.cronJobs}
            {agent.cronErrors > 0 && <span className="text-red-400 text-xs ml-0.5">!</span>}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase">Crons</p>
        </div>
      </div>

      {(agent.lastActivity > 0 || agent.model) && (
        <div className="flex items-center justify-between mt-3">
          {agent.lastActivity > 0 && (
            <p className="text-[10px] text-zinc-600">Last active: {timeAgo(agent.lastActivity)}</p>
          )}
          {agent.model && (
            <p className="text-[10px] text-zinc-600 font-mono truncate ml-2">{agent.model}</p>
          )}
        </div>
      )}
    </a>
  );
}
