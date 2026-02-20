"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/agents", label: "Agents", icon: "⬡" },
  { href: "/sessions", label: "Sessions", icon: "◉" },
  { href: "/logs", label: "Logs", icon: "▤" },
  { href: "/costs", label: "Costs", icon: "$" },
  { href: "/config", label: "Config", icon: "⚙" },
  { href: "/vps", label: "VPS", icon: "◆" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🦞</span>
          <span className="font-bold text-zinc-100">OpenClaw</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <span className="mr-1.5 text-xs">{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
