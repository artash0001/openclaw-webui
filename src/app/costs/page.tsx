"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { CostChart } from "@/components/cost-chart";
import { fmt$, fmtTokens } from "@/lib/format";

interface DailyData {
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
  daily: DailyData[];
  totals: {
    totalCost: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    cacheReadCost: number;
    cacheWriteCost: number;
  };
}

const BUDGET = 500;

export default function CostsPage() {
  const [costs, setCosts] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/gateway/usage-cost");
        if (res.ok) setCosts(await res.json());
      } catch (err) {
        console.error("Failed to fetch costs:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Shell>
        <div className="text-zinc-500 animate-pulse">Loading cost data...</div>
      </Shell>
    );
  }

  if (!costs) {
    return (
      <Shell>
        <div className="text-red-400">Failed to load cost data</div>
      </Shell>
    );
  }

  const total = costs.totals.totalCost;
  const budgetPercent = (total / BUDGET) * 100;
  const daysWithCost = costs.daily.filter((d) => d.totalCost > 0);
  const avgDaily = daysWithCost.length > 0 ? total / daysWithCost.length : 0;
  const projectedMonthly = avgDaily * 30;

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Cost Tracking</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase">Period Total</p>
            <p className="text-3xl font-bold font-mono mt-1">{fmt$(total)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase">Avg Daily</p>
            <p className="text-3xl font-bold font-mono mt-1">{fmt$(avgDaily)}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase">Projected / Month</p>
            <p className={`text-3xl font-bold font-mono mt-1 ${projectedMonthly > BUDGET ? "text-red-400" : ""}`}>
              {fmt$(projectedMonthly)}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 uppercase">Budget Left</p>
            <p className={`text-3xl font-bold font-mono mt-1 ${budgetPercent > 75 ? "text-red-400" : budgetPercent > 50 ? "text-yellow-400" : "text-green-400"}`}>
              {fmt$(BUDGET - total)}
            </p>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Budget: {fmt$(BUDGET)}/month</span>
            <span className="text-zinc-400">{budgetPercent.toFixed(1)}% used</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                budgetPercent > 75 ? "bg-red-500" : budgetPercent > 50 ? "bg-yellow-500" : "bg-green-500"
              }`}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          {/* Alert thresholds */}
          <div className="flex justify-between mt-2">
            {[50, 75, 90].map((threshold) => (
              <span
                key={threshold}
                className={`text-xs ${budgetPercent >= threshold ? "text-red-400" : "text-zinc-600"}`}
              >
                {threshold}%: {fmt$(BUDGET * threshold / 100)}
              </span>
            ))}
          </div>
        </div>

        {/* Daily Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Daily Spend</h2>
          <CostChart data={costs.daily} />
        </div>

        {/* Cost Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Cost Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Input</p>
              <p className="font-mono text-zinc-200">{fmt$(costs.totals.inputCost)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Output</p>
              <p className="font-mono text-zinc-200">{fmt$(costs.totals.outputCost)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Cache Read</p>
              <p className="font-mono text-zinc-200">{fmt$(costs.totals.cacheReadCost)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Cache Write</p>
              <p className="font-mono text-zinc-200">{fmt$(costs.totals.cacheWriteCost)}</p>
            </div>
          </div>
        </div>

        {/* Daily Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-zinc-500 font-normal">Date</th>
                <th className="text-right p-3 text-zinc-500 font-normal">Cost</th>
                <th className="text-right p-3 text-zinc-500 font-normal">Tokens</th>
                <th className="text-right p-3 text-zinc-500 font-normal hidden md:table-cell">Input</th>
                <th className="text-right p-3 text-zinc-500 font-normal hidden md:table-cell">Output</th>
              </tr>
            </thead>
            <tbody>
              {[...costs.daily].reverse().filter(d => d.totalCost > 0).map((day) => (
                <tr key={day.date} className="border-b border-zinc-800/50">
                  <td className="p-3 font-mono text-zinc-300">{day.date}</td>
                  <td className="p-3 text-right font-mono text-zinc-200">{fmt$(day.totalCost)}</td>
                  <td className="p-3 text-right font-mono text-zinc-400">{fmtTokens(day.totalTokens)}</td>
                  <td className="p-3 text-right font-mono text-zinc-400 hidden md:table-cell">{fmt$(day.inputCost)}</td>
                  <td className="p-3 text-right font-mono text-zinc-400 hidden md:table-cell">{fmt$(day.outputCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
