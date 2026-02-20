"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyData {
  date: string;
  totalCost: number;
}

export function CostChart({ data }: { data: DailyData[] }) {
  const chartData = data
    .filter((d) => d.totalCost > 0)
    .map((d) => ({
      date: d.date.slice(5), // MM-DD
      cost: parseFloat(d.totalCost.toFixed(2)),
    }));

  if (chartData.length === 0) {
    return <p className="text-zinc-500 text-sm">No cost data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#71717a", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 8,
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Cost"]}
          labelStyle={{ color: "#a1a1aa" }}
        />
        <Bar dataKey="cost" fill="#ea580c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
