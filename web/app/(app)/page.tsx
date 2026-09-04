import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ScoreBadge } from "@/components/score-badge";
import { ScoreHistogram, Bars } from "@/components/charts";

export const dynamic = "force-dynamic";

const PIPELINE = ["new", "qualified", "contacted", "replied", "meeting", "won", "lost"] as const;

export default async function Overview() {
  const supabase = await createClient();

  const [{ data: leads }, { data: runs }, { data: signalRows }] = await Promise.all([
    supabase.from("v_current_leads").select("*"),
    supabase
      .from("scan_runs")
      .select("id, started_at, city, categories, business_count, scoring_version")
      .order("started_at", { ascending: false })
      .limit(5),
    supabase.from("scan_signals").select("key, label").eq("fired", true).limit(5000),
  ]);

  const rows = leads ?? [];
  const hot = rows.filter((r) => (r.score ?? 0) >= 50);
  const withEmail = rows.filter((r) => r.email).length;
  const actionable = rows.filter((r) => (r.lead_status ?? "new") === "new" && (r.score ?? 0) >= 50);

  const byStatus = Object.fromEntries(
    PIPELINE.map((s) => [s, rows.filter((r) => (r.lead_status ?? "new") === s).length]),
  );

  // Which problems show up most across the whole book — tells you which pitch
  // to lead with for this market.
  const signalCounts = new Map<string, { label: string; n: number }>();
  for (const s of signalRows ?? []) {
    const cur = signalCounts.get(s.key) ?? { label: s.label ?? s.key, n: 0 };
    cur.n++;
    signalCounts.set(s.key, cur);
  }
  const topSignals = [...signalCounts.values()].sort((a, b) => b.n - a.n).slice(0, 8);

  const byCategory = new Map<string, { n: number; total: number }>();
  for (const r of rows) {
    const k = r.category ?? "—";
    const cur = byCategory.get(k) ?? { n: 0, total: 0 };
    cur.n++;
    cur.total += r.score ?? 0;
    byCategory.set(k, cur);
  }
  const categories = [...byCategory.entries()]
    .map(([name, v]) => ({ name, n: v.n, avg: Math.round(v.total / v.n) }))
    .sort((a, b) => b.avg - a.avg);

  const panel = { borderColor: "var(--border)", background: "var(--panel)" } as const;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-xl font-semibold">Overview</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Businesses scanned" value={rows.length} />
        <Stat label="Scoring 50+" value={hot.length} accent />
        <Stat label="Ready to call" value={actionable.length} hint="new · score 50+" accent />
        <Stat label="With an email" value={`${withEmail}/${rows.length}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border p-4" style={panel}>
          <h2 className="text-sm font-semibold">Score distribution</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
            Heuristics only detect missing best practices, so a bunching at the low end means
            &ldquo;nothing measurable is wrong&rdquo;, not &ldquo;the site is good&rdquo;.
          </p>
          <ScoreHistogram scores={rows.map((r) => r.score ?? 0)} />
        </section>

        <section className="rounded-xl border p-4" style={panel}>
          <h2 className="text-sm font-semibold">Pipeline</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
            Where every lead currently sits.
          </p>
          <Bars
            items={PIPELINE.map((s) => ({ label: s, value: byStatus[s] ?? 0 }))}
            total={rows.length}
          />
        </section>

        <section className="rounded-xl border p-4" style={panel}>
          <h2 className="text-sm font-semibold">Most common problems</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
            What fires most across this market — lead your pitch with these.
          </p>
          <Bars
            items={topSignals.map((s) => ({ label: s.label, value: s.n }))}
            total={topSignals[0]?.n ?? 1}
          />
        </section>

        <section className="rounded-xl border p-4" style={panel}>
          <h2 className="text-sm font-semibold">Categories by average score</h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
            Which verticals are worth scanning more of.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {categories.map((c) => (
              <li key={c.name} className="flex items-baseline justify-between gap-3">
                <span>{c.name}</span>
                <span style={{ color: "var(--muted)" }}>
                  avg {c.avg} · {c.n} scanned
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border p-4" style={panel}>
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Call these first</h2>
          <Link href="/leads?status=new&min=50" className="text-xs underline" style={{ color: "var(--muted)" }}>
            See all
          </Link>
        </div>
        <ul className="mt-3 divide-y" style={{ borderColor: "var(--border)" }}>
          {actionable
            .sort((a, b) => (b.review_count ?? 0) - (a.review_count ?? 0))
            .slice(0, 8)
            .map((r) => (
              <li key={r.business_id} className="flex items-center gap-3 py-2">
                <ScoreBadge score={r.score} />
                <div className="min-w-0 flex-1">
                  <Link href={`/leads/${r.business_id}`} className="text-sm font-medium hover:underline">
                    {r.name}
                  </Link>
                  <div className="truncate text-xs" style={{ color: "var(--muted)" }}>
                    {r.reasons?.[0] ?? "—"}
                  </div>
                </div>
                <div className="text-right text-xs" style={{ color: "var(--muted)" }}>
                  {r.review_count ?? 0} reviews
                  {r.phone && <div>{r.phone}</div>}
                </div>
              </li>
            ))}
          {!actionable.length && (
            <li className="py-4 text-sm" style={{ color: "var(--muted)" }}>
              Nothing new above 50. Scan another category or city.
            </li>
          )}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border p-4" style={panel}>
        <h2 className="text-sm font-semibold">Recent scans</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {(runs ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-3" style={{ color: "var(--muted)" }}>
              <span style={{ color: "var(--text)" }}>{new Date(r.started_at).toLocaleString()}</span>
              <span>{r.city}</span>
              <span className="text-xs">{r.categories?.join(", ")}</span>
              <span className="text-xs">
                {r.business_count} businesses · {r.scoring_version}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--panel)" }}
    >
      <div className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div
        className="mt-1 text-2xl font-semibold tabular-nums"
        style={{ color: accent ? "var(--accent)" : "var(--text)" }}
      >
        {value}
      </div>
      {hint && (
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          {hint}
        </div>
      )}
    </div>
  );
}
