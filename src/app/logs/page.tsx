"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Shell } from "@/components/shell";

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/logs?lines=500");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filtered = filter
    ? logs.filter((l) => l.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Logs</h1>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 w-48"
            />
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                autoScroll ? "bg-orange-600 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              Auto-scroll
            </button>
            <button
              onClick={fetchLogs}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto font-mono">
          {loading ? (
            <div className="text-zinc-500 animate-pulse">Loading logs...</div>
          ) : filtered.length === 0 ? (
            <div className="text-zinc-500">No logs found</div>
          ) : (
            <div className="space-y-0">
              {filtered.map((line, i) => {
                const isError = /error|fail|crash/i.test(line);
                const isWarn = /warn|timeout/i.test(line);
                return (
                  <div
                    key={i}
                    className={`log-line font-mono text-xs py-0.5 ${
                      isError
                        ? "text-red-400"
                        : isWarn
                        ? "text-yellow-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {line}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
