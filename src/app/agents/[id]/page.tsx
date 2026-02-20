"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Shell } from "@/components/shell";

interface AgentFiles {
  files: string[];
  contents: Record<string, string>;
}

interface SessionInfo {
  key: string;
  kind: string;
  displayName?: string;
  subject?: string;
  totalTokens: number;
  updatedAt: number;
  model?: string;
  percentUsed?: number;
  contextTokens?: number;
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [files, setFiles] = useState<AgentFiles | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [fRes, sRes] = await Promise.all([
          fetch(`/api/agents/${id}/files`),
          fetch("/api/gateway/sessions-list"),
        ]);

        if (fRes.ok) {
          const data = await fRes.json();
          setFiles(data);
          if (data.files?.length > 0) {
            const identity = data.files.find((f: string) => f === "IDENTITY.md");
            setActiveFile(identity || data.files[0]);
          }
        }

        if (sRes.ok) {
          const data = await sRes.json();
          const agentSessions = (data.sessions || []).filter(
            (s: SessionInfo) => (s as { agentId?: string }).agentId === id
          );
          setSessions(agentSessions);
        }
      } catch (err) {
        setError(`Failed to load agent data: ${err}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/agents" className="text-zinc-500 hover:text-zinc-300">&larr;</Link>
          <h1 className="text-2xl font-bold">{id}</h1>
        </div>

        {error && (
          <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-zinc-500 animate-pulse">Loading agent data...</div>
        ) : !error && (
          <>
            {/* Sessions */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-zinc-400 mb-3">
                Sessions ({sessions.length})
              </h2>
              {sessions.length === 0 ? (
                <p className="text-zinc-500 text-sm">No active sessions</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm bg-zinc-800/50 rounded p-3"
                    >
                      <div>
                        <p className="text-zinc-200 font-mono text-xs">
                          {s.subject || s.displayName || s.key}
                        </p>
                        <p className="text-zinc-500 text-xs mt-1">
                          {s.kind} · {s.model}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-200 font-mono">
                          {(s.totalTokens / 1000).toFixed(0)}K
                        </p>
                        <p className="text-zinc-500 text-xs">
                          {s.percentUsed}% used
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Files */}
            {files && files.files.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
                <div className="flex border-b border-zinc-800 overflow-x-auto">
                  {files.files.map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFile(f)}
                      className={`px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                        activeFile === f
                          ? "bg-zinc-800 text-zinc-100 border-b-2 border-orange-500"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="p-4">
                  {activeFile && files.contents[activeFile] ? (
                    <pre className="font-mono text-xs text-zinc-300 whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                      {files.contents[activeFile]}
                    </pre>
                  ) : (
                    <p className="text-zinc-500 text-sm">
                      {activeFile ? "Binary or empty file" : "Select a file"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
