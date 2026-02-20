"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { fmt$ } from "@/lib/format";

interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
}

const COLORS = {
  input: "#3b82f6",
  output: "#ef4444",
  cacheRead: "#22c55e",
  cacheWrite: "#f59e0b",
};

export function CostBreakdownChart({ data }: { data: CostBreakdown }) {
  const entries = [
    { name: "Input", value: data.inputCost, color: COLORS.input },
    { name: "Output", value: data.outputCost, color: COLORS.output },
    { name: "Cache Read", value: data.cacheReadCost, color: COLORS.cacheRead },
    { name: "Cache Write", value: data.cacheWriteCost, color: COLORS.cacheWrite },
  ].filter((e) => e.value > 0);

  if (entries.length === 0) {
    return <p className="text-zinc-500 text-sm">No cost data yet</p>;
  }

  const total = entries.reduce((s, e) => s + e.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={entries}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={75}
            strokeWidth={0}
          >
            {entries.map((e, i) => (
              <Cell key={i} fill={e.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 8,
              fontSize: 12,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [fmt$(Number(value)), ""]}
            labelStyle={{ color: "#a1a1aa" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {entries.map((e) => (
          <div key={e.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
            <span className="text-zinc-400">{e.name}</span>
            <span className="text-zinc-300 font-mono">{((e.value / total) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
