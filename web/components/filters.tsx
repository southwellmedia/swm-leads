"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const STATUSES = [
  "all", "new", "qualified", "contacted", "replied", "meeting", "won", "lost", "disqualified",
];

export function Filters({ cities, categories }: { cities: string[]; categories: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      router.push(`/?${next.toString()}`);
    },
    [params, router],
  );

  const box = {
    borderColor: "var(--border)",
    background: "var(--panel)",
    color: "var(--text)",
  } as const;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <input
        defaultValue={params.get("q") ?? ""}
        placeholder="Search name…"
        onKeyDown={(e) => {
          if (e.key === "Enter") set("q", (e.target as HTMLInputElement).value);
        }}
        className="rounded-md border px-3 py-1.5 text-sm outline-none"
        style={box}
      />

      <select
        value={params.get("status") ?? "all"}
        onChange={(e) => set("status", e.target.value)}
        className="rounded-md border px-2 py-1.5 text-sm"
        style={box}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? "All statuses" : s}
          </option>
        ))}
      </select>

      <select
        value={params.get("city") ?? "all"}
        onChange={(e) => set("city", e.target.value)}
        className="rounded-md border px-2 py-1.5 text-sm"
        style={box}
      >
        <option value="all">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={params.get("category") ?? "all"}
        onChange={(e) => set("category", e.target.value)}
        className="rounded-md border px-2 py-1.5 text-sm"
        style={box}
      >
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={params.get("min") ?? "0"}
        onChange={(e) => set("min", e.target.value)}
        className="rounded-md border px-2 py-1.5 text-sm"
        style={box}
      >
        <option value="0">Any score</option>
        <option value="25">25+</option>
        <option value="50">50+ (strong)</option>
        <option value="70">70+ (hot)</option>
      </select>
    </div>
  );
}
