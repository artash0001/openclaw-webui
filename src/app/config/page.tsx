"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";

export default function ConfigPage() {
  const [raw, setRaw] = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          const formatted = JSON.stringify(data.parsed, null, 2);
          setRaw(formatted);
          setOriginal(formatted);
        }
      } catch (err) {
        setError(`Failed to load config: ${err}`);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setError("");
    setSaved(false);
    setSaving(true);

    try {
      // Validate JSON
      JSON.parse(raw);
    } catch {
      setError("Invalid JSON");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });

      if (res.ok) {
        setOriginal(raw);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError(`Save failed: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  const modified = raw !== original;

  return (
    <Shell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Configuration</h1>
          <div className="flex items-center gap-3">
            {saved && <span className="text-green-400 text-sm">Saved!</span>}
            {error && <span className="text-red-400 text-sm">{error}</span>}
            <button
              onClick={() => { setRaw(original); setError(""); }}
              disabled={!modified}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 rounded text-sm transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!modified || saving}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 rounded text-sm text-white transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          {loading ? (
            <div className="p-4 text-zinc-500 animate-pulse">Loading config...</div>
          ) : (
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              spellCheck={false}
              className="w-full h-[calc(100vh-200px)] bg-transparent text-zinc-300 font-mono text-xs p-4 resize-none focus:outline-none"
            />
          )}
        </div>
      </div>
    </Shell>
  );
}
