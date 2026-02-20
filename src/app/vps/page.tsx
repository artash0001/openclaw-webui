"use client";

import { useEffect, useState, useCallback } from "react";
import { Shell } from "@/components/shell";
import { MetricCard } from "@/components/metric-card";

interface VpsStats {
  cpu: { load1: number; load5: number; load15: number; cores: number };
  memory: {
    totalMB: number;
    usedMB: number;
    availableMB: number;
    percent: number;
  };
  disk: { total: string; used: string; available: string; percent: string };
  uptime: string;
  network: { rxBytes: number; txBytes: number };
  processes: {
    user: string;
    pid: string;
    cpu: string;
    mem: string;
    command: string;
  }[];
  os: { prettyName: string; hostname: string };
  openclawStatus: string;
  timestamp: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function VpsPage() {
  const [stats, setStats] = useState<VpsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/vps");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStats(await res.json());
      setError(null);
    } catch (err) {
      setError(`Failed to fetch: ${err}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const loadPercent = stats
    ? Math.round((stats.cpu.load1 / stats.cpu.cores) * 100)
    : 0;

  return (
    <Shell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">VPS Monitor</h1>
            {stats && (
              <p className="text-sm text-zinc-500 mt-0.5">
                {stats.os.hostname} &middot; {stats.os.prettyName}
                {stats.openclawStatus && (
                  <span className="ml-2">
                    &middot; OpenClaw:{" "}
                    <span
                      className={
                        stats.openclawStatus === "active"
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {stats.openclawStatus}
                    </span>
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <span className="text-xs text-zinc-600">
                Updated {new Date(stats.timestamp).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchStats}
              className="px-3 py-1.5 rounded text-sm transition-colors bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && !stats && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500">
            Loading VPS stats...
          </div>
        )}
        {error && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                label="CPU Load"
                value={stats.cpu.load1.toFixed(2)}
                sub={`${loadPercent}% of ${stats.cpu.cores} cores · 5m: ${stats.cpu.load5.toFixed(2)} · 15m: ${stats.cpu.load15.toFixed(2)}`}
                alert={loadPercent > 90}
                warn={loadPercent > 70}
              />
              <MetricCard
                label="Memory"
                value={`${stats.memory.percent}%`}
                sub={`${stats.memory.usedMB} / ${stats.memory.totalMB} MB`}
                alert={stats.memory.percent > 90}
                warn={stats.memory.percent > 75}
              />
              <MetricCard
                label="Disk"
                value={stats.disk.percent}
                sub={`${stats.disk.used} / ${stats.disk.total}`}
                alert={parseInt(stats.disk.percent) > 90}
                warn={parseInt(stats.disk.percent) > 75}
              />
              <MetricCard
                label="Uptime"
                value={stats.uptime}
              />
              <MetricCard
                label="Network I/O"
                value={`↓ ${formatBytes(stats.network.rxBytes)}`}
                sub={`↑ ${formatBytes(stats.network.txBytes)}`}
              />
            </div>

            {/* Process Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <h2 className="text-sm font-medium text-zinc-300">
                  Top Processes by CPU
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-2">User</th>
                      <th className="text-left px-4 py-2">PID</th>
                      <th className="text-right px-4 py-2">CPU %</th>
                      <th className="text-right px-4 py-2">MEM %</th>
                      <th className="text-left px-4 py-2">Command</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {stats.processes.map((proc, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-1.5 text-zinc-400">
                          {proc.user}
                        </td>
                        <td className="px-4 py-1.5 text-zinc-500">
                          {proc.pid}
                        </td>
                        <td
                          className={`px-4 py-1.5 text-right ${
                            parseFloat(proc.cpu) > 50
                              ? "text-red-400"
                              : parseFloat(proc.cpu) > 20
                                ? "text-yellow-400"
                                : "text-zinc-300"
                          }`}
                        >
                          {proc.cpu}
                        </td>
                        <td className="px-4 py-1.5 text-right text-zinc-300">
                          {proc.mem}
                        </td>
                        <td className="px-4 py-1.5 text-zinc-400 truncate max-w-xs">
                          {proc.command}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
