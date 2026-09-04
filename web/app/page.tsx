import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import { ScoreBadge } from "@/components/score-badge";
import { Filters } from "@/components/filters";
import type { Database } from "@/lib/database.types";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  city?: string;
  category?: string;
  min?: string;
  q?: string;
}>;

export default async function LeadQueue({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("v_current_leads")
    .select("*")
    .order("score", { ascending: false })
    .order("review_count", { ascending: false, nullsFirst: false })
    .limit(300);

  if (sp.status && sp.status !== "all") query = query.eq("lead_status", sp.status as LeadStatus);
  if (sp.city && sp.city !== "all") query = query.eq("city", sp.city);
  if (sp.category && sp.category !== "all") query = query.eq("category", sp.category);
  if (sp.min) query = query.gte("score", Number(sp.min) || 0);
  if (sp.q) query = query.ilike("name", `%${sp.q}%`);

  const { data: leads, error } = await query;

  // Distinct values for the filter dropdowns.
  const { data: all } = await supabase.from("v_current_leads").select("city, category");
  const cities = [...new Set((all ?? []).map((r) => r.city).filter(Boolean))].sort() as string[];
  const categories = [...new Set((all ?? []).map((r) => r.category).filter(Boolean))].sort() as string[];

  const rows = leads ?? [];
  const hot = rows.filter((r) => (r.score ?? 0) >= 50).length;
  const withEmail = rows.filter((r) => r.email).length;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lead queue</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {rows.length} leads · {hot} scoring 50+ · {withEmail} with an email address
          </p>
        </div>
        <form action={signOut}>
          <button className="text-sm underline" style={{ color: "var(--muted)" }}>
            Sign out
          </button>
        </form>
      </header>

      <Filters cities={cities} categories={categories} />

      {error && (
        <p className="mt-6 text-sm" style={{ color: "#dc2626" }}>
          {error.message}
        </p>
      )}

      <div
        className="mt-4 overflow-x-auto rounded-xl border"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              <th className="px-3 py-2.5 font-medium">Score</th>
              <th className="px-3 py-2.5 font-medium">Business</th>
              <th className="px-3 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">Built on</th>
              <th className="px-3 py-2.5 font-medium">Reviews</th>
              <th className="px-3 py-2.5 font-medium">Contact</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Top reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.business_id}
                className="border-t align-top"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-3 py-2.5">
                  <ScoreBadge score={r.score} />
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/leads/${r.business_id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  {r.website_host && (
                    <div className="text-xs" style={{ color: "var(--muted)" }}>
                      {r.website_host}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>
                  {r.category}
                </td>
                <td className="px-3 py-2.5" style={{ color: "var(--muted)" }}>
                  {r.builder ?? "—"}
                </td>
                <td className="px-3 py-2.5 tabular-nums" style={{ color: "var(--muted)" }}>
                  {r.review_count ?? "—"}
                  {r.rating ? <span className="ml-1 text-xs">★{r.rating}</span> : null}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {r.phone && <div>{r.phone}</div>}
                  {r.email ? (
                    <div style={{ color: "var(--accent)" }}>{r.email}</div>
                  ) : (
                    <div style={{ color: "var(--muted)" }}>no email</div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ background: "var(--bg)", color: "var(--muted)" }}
                  >
                    {r.lead_status ?? "new"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs" style={{ color: "var(--muted)" }}>
                  {r.reasons?.[0] ?? "—"}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
                  No leads match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
