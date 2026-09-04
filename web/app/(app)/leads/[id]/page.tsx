import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreBadge } from "@/components/score-badge";
import { LeadControls } from "@/components/lead-controls";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("v_current_leads")
    .select("*")
    .eq("business_id", id)
    .single();

  if (!lead) notFound();

  const [{ data: signals }, { data: history }, { data: notes }, { data: outreach }] =
    await Promise.all([
      supabase
        .from("scan_signals")
        .select("key, label, weight, detail")
        .eq("scan_id", lead.scan_id!)
        .eq("fired", true)
        .order("weight", { ascending: false }),
      supabase
        .from("v_score_history")
        .select("scanned_at, score, scoring_version")
        .eq("business_id", id)
        .order("scanned_at", { ascending: false })
        .limit(10),
      supabase
        .from("lead_notes")
        .select("id, body, created_at")
        .eq("lead_id", lead.lead_id!)
        .order("created_at", { ascending: false }),
      supabase
        .from("outreach")
        .select("id, channel, direction, outcome, body, occurred_at")
        .eq("lead_id", lead.lead_id!)
        .order("occurred_at", { ascending: false }),
    ]);

  // Screenshots live in a private bucket; the browser needs a signed URL.
  let shotUrl: string | null = null;
  if (lead.screenshot_path) {
    const { data } = await supabase.storage
      .from("screenshots")
      .createSignedUrl(lead.screenshot_path, 60 * 60);
    shotUrl = data?.signedUrl ?? null;
  }

  const panel = { borderColor: "var(--border)", background: "var(--panel)" } as const;

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Link href="/leads" className="text-sm underline" style={{ color: "var(--muted)" }}>
        ← Lead queue
      </Link>

      <header className="mt-3 flex flex-wrap items-start gap-4">
        <ScoreBadge score={lead.score} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">{lead.name}</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
            {lead.category} · {lead.city}
            {lead.review_count ? ` · ${lead.review_count} reviews` : ""}
            {lead.rating ? ` · ★${lead.rating}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                {lead.website_host}
              </a>
            )}
            {lead.phone && <a href={`tel:${lead.phone}`}>{lead.phone}</a>}
            {lead.email && (
              <a href={`mailto:${lead.email}`} style={{ color: "var(--accent)" }}>
                {lead.email}
              </a>
            )}
            {lead.maps_url && (
              <a href={lead.maps_url} target="_blank" rel="noreferrer" style={{ color: "var(--muted)" }}>
                Maps
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border p-4" style={panel}>
            <h2 className="text-sm font-semibold">Why it scored {lead.score}</h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
              {signals?.length ?? 0} signals fired
              {lead.builder ? ` · built on ${lead.builder}` : ""}
              {lead.copyright_year ? ` · © ${lead.copyright_year}` : ""}
            </p>
            <ul className="mt-3 space-y-1.5">
              {(signals ?? []).map((s) => (
                <li key={s.key} className="flex items-baseline gap-3 text-sm">
                  <span
                    className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums"
                    style={{ color: "var(--muted)" }}
                  >
                    +{s.weight}
                  </span>
                  <span>
                    {s.label}
                    {s.detail && (
                      <span className="ml-1.5 text-xs" style={{ color: "var(--muted)" }}>
                        ({s.detail})
                      </span>
                    )}
                  </span>
                </li>
              ))}
              {!signals?.length && (
                <li className="text-sm" style={{ color: "var(--muted)" }}>
                  Nothing fired — this site passes every check the scanner makes.
                </li>
              )}
            </ul>
          </section>

          {shotUrl && (
            <section className="rounded-xl border p-4" style={panel}>
              <h2 className="text-sm font-semibold">On a phone</h2>
              {lead.screenshot_taken_at && lead.scanned_at &&
                new Date(lead.screenshot_taken_at) < new Date(lead.scanned_at) && (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                    Taken {new Date(lead.screenshot_taken_at).toLocaleString()}, before the latest
                    scan — the score is newer than this image.
                  </p>
                )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shotUrl}
                alt={`${lead.name} homepage on a phone`}
                className="mt-3 w-full max-w-[320px] rounded-lg border"
                style={{ borderColor: "var(--border)" }}
              />
            </section>
          )}

          {!!history?.length && (
            <section className="rounded-xl border p-4" style={panel}>
              <h2 className="text-sm font-semibold">Score history</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {history.map((h, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="w-8 text-right text-xs font-semibold tabular-nums">{h.score}</span>
                    <span style={{ color: "var(--muted)" }}>
                      {new Date(h.scanned_at!).toLocaleString()}
                      <span className="ml-2 text-xs">({h.scoring_version})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border p-4" style={panel}>
            <h2 className="text-sm font-semibold">Notes</h2>
            <ul className="mt-3 space-y-3">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="text-sm">
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                  <div className="mt-0.5 whitespace-pre-wrap">{n.body}</div>
                </li>
              ))}
              {!notes?.length && (
                <li className="text-sm" style={{ color: "var(--muted)" }}>
                  No notes yet.
                </li>
              )}
            </ul>
          </section>

          <section className="rounded-xl border p-4" style={panel}>
            <h2 className="text-sm font-semibold">Outreach log</h2>
            <ul className="mt-3 space-y-3">
              {(outreach ?? []).map((o) => (
                <li key={o.id} className="text-sm">
                  <div className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(o.occurred_at).toLocaleString()} · {o.channel} · {o.direction}
                    {o.outcome ? ` · ${o.outcome}` : ""}
                  </div>
                  {o.body && <div className="mt-0.5 whitespace-pre-wrap">{o.body}</div>}
                </li>
              ))}
              {!outreach?.length && (
                <li className="text-sm" style={{ color: "var(--muted)" }}>
                  Nothing sent yet.
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside className="rounded-xl border p-4 lg:sticky lg:top-6 lg:self-start" style={panel}>
          <LeadControls leadId={lead.lead_id!} status={(lead.lead_status ?? "new") as LeadStatus} />
        </aside>
      </div>
    </main>
  );
}
