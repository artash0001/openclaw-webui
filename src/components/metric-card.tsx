export function MetricCard({
  label,
  value,
  sub,
  alert,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 font-mono ${
          alert ? "text-red-400" : warn ? "text-yellow-400" : "text-zinc-100"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-1 truncate">{sub}</p>}
    </div>
  );
}
