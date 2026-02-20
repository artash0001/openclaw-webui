"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
    } else {
      setError("Invalid password");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-lg p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">🦞</span>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">OpenClaw</h1>
            <p className="text-xs text-zinc-500">Agent Control Center</p>
          </div>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
        />

        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full mt-4 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 rounded transition-colors"
        >
          {loading ? "..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
