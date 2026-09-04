"use client";

import { useTransition } from "react";
import { setLeadStatus } from "@/app/actions";
import type { Database } from "@/lib/database.types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

export function StatusMover({
  leadId,
  status,
  columns,
}: {
  leadId: string;
  status: LeadStatus;
  columns: LeadStatus[];
}) {
  const [pending, start] = useTransition();
  const i = columns.indexOf(status);

  const move = (delta: number) => {
    const next = columns[i + delta];
    if (!next) return;
    start(() => void setLeadStatus(leadId, next));
  };

  const btn = {
    borderColor: "var(--border)",
    background: "var(--panel)",
    color: "var(--muted)",
  } as const;

  return (
    <div className="mt-1.5 flex gap-1">
      <button
        onClick={() => move(-1)}
        disabled={pending || i <= 0}
        className="rounded border px-1.5 py-0.5 text-xs disabled:opacity-30"
        style={btn}
        title="Move back"
      >
        ←
      </button>
      <button
        onClick={() => move(1)}
        disabled={pending || i < 0 || i >= columns.length - 1}
        className="rounded border px-1.5 py-0.5 text-xs disabled:opacity-30"
        style={btn}
        title="Move forward"
      >
        →
      </button>
      <button
        onClick={() => start(() => void setLeadStatus(leadId, "disqualified"))}
        disabled={pending}
        className="ml-auto rounded border px-1.5 py-0.5 text-xs disabled:opacity-30"
        style={btn}
        title="Disqualify"
      >
        ✕
      </button>
    </div>
  );
}
