"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/leads", label: "Queue" },
  { href: "/map", label: "Map" },
  { href: "/pipeline", label: "Pipeline" },
];

export function Nav() {
  const path = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-2.5 py-1.5 text-sm transition-colors"
            style={{
              background: active ? "var(--panel)" : "transparent",
              color: active ? "var(--text)" : "var(--muted)",
              fontWeight: active ? 600 : 400,
            }}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
