export const AGENT_COLORS: Record<string, string> = {
  "growth-agent": "#ea580c",
  "feniks": "#8b5cf6",
  "property-agent": "#06b6d4",
  "business-agent": "#22c55e",
  "marketing-agent": "#f43f5e",
  "realty-hunter": "#eab308",
  "podcast-agent": "#64748b",
  "designer-agent": "#ec4899",
  "editor-agent": "#14b8a6",
  "main": "#f97316",
  "contacts-agent": "#3b82f6",
  "design-agent": "#a855f7",
  "psych-agent": "#10b981",
  "smm-manager": "#f59e0b",
  "video-editor": "#ef4444",
};

export function fmt$(n: number) {
  return "$" + n.toFixed(2);
}

export function fmtTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

export function timeAgo(ms: number) {
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}
