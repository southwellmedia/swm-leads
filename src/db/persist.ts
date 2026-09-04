import { readFile } from "node:fs/promises";
import path from "node:path";
import pLimit from "p-limit";
import type { Db } from "./client.js";
import type { Json } from "./types.js";
import type { ScanResult } from "../types.js";
import { dedupeKeyFor, hostOf } from "../util/identity.js";

export interface RunMeta {
  city: string;
  categories: string[];
  source: "places" | "csv";
  limitPerCategory: number;
  scoringVersion: string;
  options: Json;
}

export interface PersistSummary {
  runId: string;
  businesses: number;
  scans: number;
  signals: number;
  emails: number;
  screenshots: number;
  screenshotErrors: number;
}

const BUCKET = "screenshots";

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * Writes one scan run to Supabase.
 *
 * Businesses are upserted on their stable dedupe_key, so re-running the same
 * category updates the existing rows rather than duplicating them. Scans are
 * append-only — every run adds a row per business, which is what makes score
 * history possible. Nothing here touches `leads`, `lead_notes` or `outreach`:
 * a re-scan must never overwrite human work.
 */
export async function persistRun(db: Db, results: ScanResult[], meta: RunMeta): Promise<PersistSummary> {
  const { data: run, error: runErr } = await db
    .from("scan_runs")
    .insert({
      city: meta.city,
      categories: meta.categories,
      source: meta.source,
      limit_per_category: meta.limitPerCategory,
      scoring_version: meta.scoringVersion,
      options: meta.options,
      business_count: results.length,
    })
    .select("id")
    .single();
  if (runErr || !run) throw new Error(`Could not create scan run: ${runErr?.message}`);
  const runId = run.id;

  // ---- businesses: upsert on the stable key, keep first_seen_at intact -----
  const bizRows = results.map((r) => {
    const b = r.business;
    return {
      place_id: b.placeId ?? null,
      dedupe_key: dedupeKeyFor(b),
      name: b.name,
      website: b.website ?? null,
      website_host: b.website ? hostOf(b.website) || null : null,
      phone: b.phone ?? null,
      address: b.address ?? null,
      city: meta.city,
      category: b.category,
      rating: b.rating ?? null,
      review_count: b.reviewCount ?? null,
      maps_url: b.mapsUrl ?? null,
      source: b.source,
      last_seen_at: new Date().toISOString(),
    };
  });

  const idByKey = new Map<string, string>();
  for (const batch of chunk(bizRows, 500)) {
    const { data, error } = await db
      .from("businesses")
      .upsert(batch, { onConflict: "dedupe_key" })
      .select("id, dedupe_key");
    if (error) throw new Error(`Could not upsert businesses: ${error.message}`);
    for (const row of data ?? []) idByKey.set(row.dedupe_key, row.id);
  }

  // ---- emails: only where we actually found one ---------------------------
  // A targeted second pass rather than a column on the upsert above: a scan
  // that finds nothing must leave a previously discovered address alone, and a
  // batch upsert would write null across the board.
  const emailLimit = pLimit(8);
  let emails = 0;
  await Promise.all(
    results.map((r) =>
      emailLimit(async () => {
        if (!r.email) return;
        const businessId = idByKey.get(dedupeKeyFor(r.business));
        if (!businessId) return;
        const { error } = await db.from("businesses").update({ email: r.email }).eq("id", businessId);
        if (!error) emails++;
      }),
    ),
  );

  // ---- screenshots: upload before the scan rows so paths go in with them ---
  const limit = pLimit(4);
  let screenshots = 0;
  let screenshotErrors = 0;
  const pathByKey = new Map<string, string>();

  await Promise.all(
    results.map((r) =>
      limit(async () => {
        if (!r.screenshotPath) return;
        const key = dedupeKeyFor(r.business);
        const businessId = idByKey.get(key);
        if (!businessId) return;
        const ext = path.extname(r.screenshotPath).toLowerCase() || ".jpg";
        const objectPath = `${runId}/${businessId}${ext}`;
        try {
          const body = await readFile(r.screenshotPath);
          const { error } = await db.storage.from(BUCKET).upload(objectPath, body, {
            contentType: ext === ".png" ? "image/png" : "image/jpeg",
            upsert: true,
          });
          if (error) throw new Error(error.message);
          pathByKey.set(key, objectPath);
          screenshots++;
        } catch {
          // A failed upload must not lose the scan itself.
          screenshotErrors++;
        }
      }),
    ),
  );

  // ---- scans -------------------------------------------------------------
  const scanRows = results
    .map((r) => {
      const key = dedupeKeyFor(r.business);
      const businessId = idByKey.get(key);
      if (!businessId) return null;
      return {
        business_id: businessId,
        run_id: runId,
        scanned_at: r.scannedAt,
        status: r.status,
        score: r.score,
        final_url: r.finalUrl ?? null,
        builder: r.builder ?? null,
        copyright_year: r.copyrightYear ?? null,
        load_ms: r.loadMs ?? null,
        page_bytes: r.pageBytes ?? null,
        title: r.title ?? null,
        error: r.error ?? null,
        reasons: r.reasons,
        screenshot_path: pathByKey.get(key) ?? null,
        scoring_version: meta.scoringVersion,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const scanIdByBusiness = new Map<string, string>();
  for (const batch of chunk(scanRows, 500)) {
    const { data, error } = await db.from("scans").insert(batch).select("id, business_id");
    if (error) throw new Error(`Could not insert scans: ${error.message}`);
    for (const row of data ?? []) scanIdByBusiness.set(row.business_id, row.id);
  }

  // ---- scan_signals ------------------------------------------------------
  const signalRows = results.flatMap((r) => {
    const businessId = idByKey.get(dedupeKeyFor(r.business));
    const scanId = businessId ? scanIdByBusiness.get(businessId) : undefined;
    if (!scanId) return [];
    return r.signals.map((s) => ({
      scan_id: scanId,
      key: s.key,
      label: s.label,
      weight: s.weight,
      fired: s.fired,
      detail: s.detail ?? null,
    }));
  });

  for (const batch of chunk(signalRows, 1000)) {
    const { error } = await db.from("scan_signals").insert(batch);
    if (error) throw new Error(`Could not insert scan signals: ${error.message}`);
  }

  // ---- open a lead row for anything new, without disturbing existing ones --
  const leadRows = [...idByKey.values()].map((business_id) => ({ business_id }));
  for (const batch of chunk(leadRows, 500)) {
    const { error } = await db
      .from("leads")
      .upsert(batch, { onConflict: "business_id", ignoreDuplicates: true });
    if (error) throw new Error(`Could not create lead rows: ${error.message}`);
  }

  await db.from("scan_runs").update({ finished_at: new Date().toISOString() }).eq("id", runId);

  return {
    runId,
    businesses: idByKey.size,
    scans: scanRows.length,
    signals: signalRows.length,
    emails,
    screenshots,
    screenshotErrors,
  };
}
