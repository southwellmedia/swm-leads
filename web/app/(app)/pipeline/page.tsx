import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScoreBadge } from "@/components/score-badge";
import { StatusMover } from "@/components/status-mover";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

const COLUMNS: { key: LeadStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "qualified", label: "Qualified" },
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "meeting", label: "Meeting" },
  { key: "won", label: "Won" },
];

export default async function Pipeline() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_current_leads")
    .select("business_id, lead_id, name, score, category, lead_status, review_count, phone")
    .order("score", { ascending: false });

  const rows = data ?? [];

  return (
    <main className="mx-auto max-w-[1600px] p-6">
      <h1 className="text-xl font-semibold">Pipeline</h1>
      <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
        Move a lead with the arrows. Lost and disqualified are hidden here — find them in the queue.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-6">
        {COLUMNS.map((col) => {
          const items = rows.filter((r) => (r.lead_status ?? "new") === col.key);
          return (
            <section
              key={col.key}
              className="rounded-xl border p-2.5"
              style={{ borderColor: "var(--border)", background: "var(--panel)" }}
            >
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-wide">{col.label}</h2>
                <span className="text-xs tabular-nums" style={{ color: "var(--muted)" }}>
                  {items.length}
                </span>
              </div>

              <ul className="mt-2 space-y-2">
                {items.map((r) => (
                  <li
                    key={r.business_id}
                    className="rounded-lg border p-2"
                    style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  >
                    <div className="flex items-start gap-2">
                      <ScoreBadge score={r.score} />
                      <Link
                        href={`/leads/${r.business_id}`}
                        className="min-w-0 flex-1 text-sm font-medium leading-snug hover:underline"
                      >
                        {r.name}
                      </Link>
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                      {r.category} · {r.review_count ?? 0} reviews
                    </div>
                    <StatusMover
                      leadId={r.lead_id!}
                      status={(r.lead_status ?? "new") as LeadStatus}
                      columns={COLUMNS.map((c) => c.key)}
                    />
                  </li>
                ))}
                {!items.length && (
                  <li className="px-1 py-3 text-xs" style={{ color: "var(--muted)" }}>
                    Empty
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
