"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { timeAgo } from "@/lib/format";

interface Session {
  key: string;
  kind: string;
  displayName?: string;
  subject?: string;
  channel?: string;
  chatType?: string;
  updatedAt: number;
  totalTokens: number;
  percentUsed?: number;
  model?: string;
  modelProvider?: string;
  contextTokens?: number;
  agentId?: string;
  sessionId?: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/gateway/sessions-list");
        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Sessions</h1>
          <span className="text-zinc-500 text-sm">{sessions.length} total</span>
        </div>

        {loading ? (
          <div className="text-zinc-500 animate-pulse">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-zinc-500">No active sessions</div>
        ) : (
          <div className="space-y-2">
            {sessions
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((session, i) => (
                <div
                  key={i}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-zinc-200 font-medium text-sm truncate">
                        {session.subject || session.displayName || session.key}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{session.kind}</span>
                        {session.channel && (
                          <span className="bg-zinc-800 px-1.5 py-0.5 rounded">{session.channel}</span>
                        )}
                        {session.model && (
                          <span className="font-mono">{session.model}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-zinc-200 font-mono text-sm">
                        {(session.totalTokens / 1000).toFixed(0)}K
                      </p>
                      {session.percentUsed !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                session.percentUsed > 80
                                  ? "bg-red-500"
                                  : session.percentUsed > 50
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${session.percentUsed}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500">{session.percentUsed}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">
                    Updated {timeAgo(session.updatedAt)}
                    {session.agentId && ` · ${session.agentId}`}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
