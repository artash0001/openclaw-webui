"use client";

import { useEffect, useState, useCallback } from "react";
import { Shell } from "@/components/shell";
import { AGENT_COLORS, fmtTokens, timeAgo } from "@/lib/format";

interface AgentInfo {
  id: string;
  name: string;
}

interface AgentsData {
  defaultId: string;
  agents: AgentInfo[];
}

interface StatusData {
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
    }[];
  };
}

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  enabled: boolean;
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastError?: string;
    consecutiveErrors?: number;
  };
}

interface CronData {
  jobs: CronJob[];
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentsData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [crons, setCrons] = useState<CronData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [aRes, sRes, crRes] = await Promise.all([
        fetch("/api/gateway/agents-list"),
        fetch("/api/gateway/status"),
        fetch("/api/gateway/cron-list"),
      ]);

      if (aRes.ok) setAgents(await aRes.json());
      if (sRes.ok) setStatus(await sRes.json());
      if (crRes.ok) setCrons(await crRes.json());
      setError(null);
    } catch (err) {
      setError(`Failed to connect: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Build enriched agent list
  const allAgentIds = new Set<string>();
  agents?.agents?.forEach((a) => allAgentIds.add(a.id));
  status?.sessions?.recent?.forEach((s) => allAgentIds.add(s.agentId));
  crons?.jobs?.forEach((j) => allAgentIds.add(j.agentId));

  const agentCards = Array.from(allAgentIds).map((id) => {
    const info = agents?.agents?.find((a) => a.id === id);
    const sessions =
      status?.sessions?.recent?.filter((s) => s.agentId === id) ?? [];
    const jobs = crons?.jobs?.filter((j) => j.agentId === id) ?? [];
    const lastActivity =
      sessions.length > 0 ? Math.max(...sessions.map((s) => s.updatedAt)) : 0;
    const totalAgentTokens = sessions.reduce(
      (sum, s) => sum + (s.totalTokens || 0),
      0
    );

    return {
      id,
      name: info?.name || id,
      color: AGENT_COLORS[id] || "#71717a",
      sessions,
      sessionCount: sessions.length,
      lastActivity,
      totalTokens: totalAgentTokens,
      cronJobs: jobs,
      cronErrors: jobs.filter((j) => j.state?.lastStatus === "error").length,
      isDefault: agents?.defaultId === id,
    };
  });

  agentCards.sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return b.lastActivity - a.lastActivity;
  });

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agents</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {agentCards.length} registered
              {" · "}
              {agentCards.filter((a) => a.lastActivity > Date.now() - 3600000).length} active
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="px-3 py-1.5 rounded text-sm transition-colors bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          >
            Refresh
          </button>
        </div>

        {loading && !agents && (
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-500 animate-pulse">
              Connecting to gateway...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {agentCards.length > 0 && (
          <div className="space-y-4">
            {agentCards.map((agent) => {
              const active = agent.lastActivity > Date.now() - 3600000;

              return (
                <div
                  key={agent.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
                >
                  {/* Agent Header */}
                  <a
                    href={`/agents/${agent.id}`}
                    className="block p-4 hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 ${active ? "animate-pulse-dot" : ""}`}
                          style={{ backgroundColor: agent.color }}
                        />
                        <div>
                          <h2 className="font-medium text-zinc-100">
                            {agent.name}
                            {agent.isDefault && (
                              <span className="ml-2 text-[10px] bg-orange-600/20 text-orange-400 px-1.5 py-0.5 rounded">
                                DEFAULT
                              </span>
                            )}
                          </h2>
                          <p className="text-xs text-zinc-500 font-mono">
                            {agent.id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <p className="text-lg font-bold font-mono text-zinc-200">
                            {agent.sessionCount}
                          </p>
                          <p className="text-[10px] text-zinc-500 uppercase">
                            Sessions
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-bold font-mono text-zinc-200">
                            {fmtTokens(agent.totalTokens)}
                          </p>
                          <p className="text-[10px] text-zinc-500 uppercase">
                            Tokens
                          </p>
                        </div>
                        <div>
                          <p className="text-lg font-bold font-mono text-zinc-200">
                            {agent.cronJobs.length}
                            {agent.cronErrors > 0 && (
                              <span className="text-red-400 text-xs ml-0.5">
                                !
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-500 uppercase">
                            Crons
                          </p>
                        </div>
                        {agent.lastActivity > 0 && (
                          <div className="text-right">
                            <p className="text-sm font-mono text-zinc-400">
                              {timeAgo(agent.lastActivity)}
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase">
                              Last Active
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </a>

                  {/* Sessions */}
                  {agent.sessions.length > 0 && (
                    <div className="border-t border-zinc-800/50 px-4 py-3">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                        Active Sessions
                      </p>
                      <div className="space-y-1.5">
                        {agent.sessions
                          .sort((a, b) => b.updatedAt - a.updatedAt)
                          .map((s, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-sm bg-zinc-800/30 rounded px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-zinc-300 font-mono text-xs truncate">
                                  {s.subject || s.displayName || s.key}
                                </p>
                                <p className="text-zinc-600 text-xs mt-0.5">
                                  {s.kind}
                                  {s.model && ` · ${s.model}`}
                                </p>
                              </div>
                              <div className="text-right ml-4 shrink-0 flex items-center gap-3">
                                <span className="text-zinc-300 font-mono text-xs">
                                  {(s.totalTokens / 1000).toFixed(0)}K
                                </span>
                                {s.percentUsed !== undefined && (
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          s.percentUsed > 80
                                            ? "bg-red-500"
                                            : s.percentUsed > 50
                                              ? "bg-yellow-500"
                                              : "bg-green-500"
                                        }`}
                                        style={{
                                          width: `${s.percentUsed}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 w-7 text-right">
                                      {s.percentUsed}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Cron Jobs */}
                  {agent.cronJobs.length > 0 && (
                    <div className="border-t border-zinc-800/50 px-4 py-3">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                        Cron Jobs
                      </p>
                      <div className="space-y-1">
                        {agent.cronJobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  job.state?.lastStatus === "error"
                                    ? "bg-red-500"
                                    : job.enabled
                                      ? "bg-green-500"
                                      : "bg-zinc-600"
                                }`}
                              />
                              <span className="text-zinc-300 font-mono">
                                {job.name}
                              </span>
                            </div>
                            <div className="text-zinc-500">
                              {job.state?.lastStatus === "error" && (
                                <span className="text-red-400 mr-2">
                                  {job.state.lastError}
                                  {job.state.consecutiveErrors
                                    ? ` (x${job.state.consecutiveErrors})`
                                    : ""}
                                </span>
                              )}
                              {job.state?.nextRunAtMs && (
                                <span>
                                  next: {timeAgo(job.state.nextRunAtMs)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
