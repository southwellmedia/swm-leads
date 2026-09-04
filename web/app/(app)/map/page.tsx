import { createClient } from "@/lib/supabase/server";
import { MapShell } from "@/components/map-shell";
import type { MapLead } from "@/components/lead-map";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_current_leads")
    .select("business_id, name, lat, lng, score, category, phone, lead_status, reasons, review_count")
    .not("lat", "is", null);

  const leads: MapLead[] = (data ?? [])
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      business_id: r.business_id!,
      name: r.name!,
      lat: r.lat!,
      lng: r.lng!,
      score: r.score,
      category: r.category,
      phone: r.phone,
      lead_status: r.lead_status,
      reason: r.reasons?.[0] ?? null,
      review_count: r.review_count,
    }));

  return (
    <main className="mx-auto max-w-7xl p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Map</h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
            {leads.length} leads plotted. Colour is score, size is review count — big and red is a
            high-revenue business with a bad website.
          </p>
        </div>
        <Legend />
      </div>

      <div
        className="mt-4 h-[70vh] overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--border)" }}
      >
        <MapShell leads={leads} />
      </div>

      {!leads.length && (
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          No coordinates yet. Re-run a scan — coordinates come from the Places field mask.
        </p>
      )}
    </main>
  );
}

function Legend() {
  const items = [
    { c: "#dc2626", l: "70+" },
    { c: "#ea580c", l: "50–69" },
    { c: "#ca8a04", l: "25–49" },
    { c: "#3f6212", l: "1–24" },
    { c: "#a1a1aa", l: "0" },
  ];
  return (
    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
      {items.map((i) => (
        <span key={i.l} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: i.c }} />
          {i.l}
        </span>
      ))}
    </div>
  );
}
