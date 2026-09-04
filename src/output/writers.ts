import { writeFile } from "node:fs/promises";
import type { ScanResult } from "../types.js";

const COLUMNS = [
  "score", "status", "name", "category", "website", "final_url", "builder", "copyright_year",
  "load_ms", "rating", "review_count", "phone", "address", "maps_url", "reasons", "screenshot", "error",
] as const;

export async function writeCsv(results: ScanResult[], file: string) {
  const rows = results.map((r) => [
    r.score,
    r.status,
    r.business.name,
    r.business.category,
    r.business.website ?? "",
    r.finalUrl ?? "",
    r.builder ?? "",
    r.copyrightYear ?? "",
    r.loadMs ?? "",
    r.business.rating ?? "",
    r.business.reviewCount ?? "",
    r.business.phone ?? "",
    r.business.address ?? "",
    r.business.mapsUrl ?? "",
    r.reasons.join(" | "),
    r.screenshotPath ?? "",
    r.error ?? "",
  ]);
  const csv = [COLUMNS.join(","), ...rows.map((row) => row.map(esc).join(","))].join("\n");
  await writeFile(file, csv, "utf8");
}

export async function writeJson(results: ScanResult[], file: string) {
  await writeFile(file, JSON.stringify(results, null, 2), "utf8");
}

export function printSummary(results: ScanResult[]) {
  const top = results.slice(0, 25);
  const pad = (s: string | number, n: number) => String(s).padEnd(n).slice(0, n);
  console.log("\n" + pad("SCORE", 6) + pad("BUSINESS", 34) + pad("BUILDER", 20) + "TOP REASON");
  console.log("-".repeat(110));
  for (const r of top) {
    console.log(
      pad(r.score, 6) + pad(r.business.name, 34) + pad(r.builder ?? (r.status === "no-website" ? "—" : "?"), 20) + (r.reasons[0] ?? ""),
    );
  }
  const noSite = results.filter((r) => r.status === "no-website").length;
  const hot = results.filter((r) => r.score >= 50).length;
  console.log(`\n${results.length} businesses · ${noSite} with no website · ${hot} scoring 50+\n`);
}

function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
