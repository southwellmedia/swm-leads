#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import pLimit from "p-limit";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PlacesSource } from "./sources/places.js";
import { CsvSource } from "./sources/csv.js";
import { Scanner } from "./scan/scanner.js";
import { writeCsv, writeJson, printSummary } from "./output/writers.js";
import type { Business, ScanResult, Source } from "./types.js";

const program = new Command();
program.name("leadscout").description("Find local businesses with outdated or missing websites.");

program
  .command("scan")
  .description("Pull businesses for a category + city, scan their sites, and rank them.")
  .option("-c, --category <name>", "Search query (e.g. 'roofing contractor') — repeatable", collect, [])
  .option("-g, --group <name>", "Category group from config/categories.json (portfolio | home-services | professional)", collect, [])
  .option("--city <city>", "City / area to search", "Dallas, TX")
  .option("-n, --limit <n>", "Max businesses per category", "20")
  .option("--csv <file>", "Use a CSV of businesses instead of Google Places (name,website,...)")
  .option("-o, --out <dir>", "Output directory", "out")
  .option("--no-screenshots", "Skip screenshots")
  .option("--min-score <n>", "Only include results at or above this score in the CSV", "0")
  .action(async (opts) => {
    const outDir = path.resolve(opts.out);
    await mkdir(outDir, { recursive: true });

    // Resolve categories
    let categories: string[] = [...opts.category];
    if (opts.group.length) {
      const cfg = JSON.parse(await readFile(new URL("../config/categories.json", import.meta.url), "utf8"));
      for (const g of opts.group) {
        if (!cfg[g]) throw new Error(`Unknown group "${g}". Options: ${Object.keys(cfg).join(", ")}`);
        categories.push(...cfg[g]);
      }
    }
    if (!categories.length && !opts.csv) categories = ["roofing contractor"];
    if (opts.csv && !categories.length) categories = ["csv"];

    const source: Source = opts.csv
      ? new CsvSource(path.resolve(opts.csv))
      : new PlacesSource(process.env.GOOGLE_PLACES_API_KEY ?? "");

    // Gather businesses
    const seen = new Set<string>();
    const businesses: Business[] = [];
    for (const cat of categories) {
      process.stdout.write(`Searching "${cat}" in ${opts.city} via ${source.name}… `);
      const found = await source.search(cat, opts.city, parseInt(opts.limit, 10));
      let added = 0;
      for (const b of found) {
        const key = (b.website ? hostOf(b.website) : "") || `${b.name}|${b.address ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        businesses.push(b);
        added++;
      }
      console.log(`${found.length} found, ${added} new`);
    }
    console.log(`\n${businesses.length} unique businesses to scan\n`);

    // Scan
    const scanner = new Scanner({ screenshotDir: path.join(outDir, "screenshots"), screenshots: opts.screenshots });
    await scanner.start();
    const limit = pLimit(parseInt(process.env.SCAN_CONCURRENCY ?? "4", 10));
    let done = 0;
    const results: ScanResult[] = await Promise.all(
      businesses.map((b) =>
        limit(async () => {
          const r = await scanner.scan(b);
          done++;
          console.log(`[${done}/${businesses.length}] ${String(r.score).padStart(3)}  ${b.name}${r.error ? `  (${r.error})` : ""}`);
          return r;
        }),
      ),
    );
    await scanner.stop();

    results.sort((a, b) => b.score - a.score || (b.business.reviewCount ?? 0) - (a.business.reviewCount ?? 0));
    const minScore = parseInt(opts.minScore, 10);
    const filtered = results.filter((r) => r.score >= minScore);

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const csvFile = path.join(outDir, `leads-${stamp}.csv`);
    const jsonFile = path.join(outDir, `leads-${stamp}.json`);
    await writeCsv(filtered, csvFile);
    await writeJson(results, jsonFile);

    printSummary(results);
    console.log(`CSV:  ${csvFile}\nJSON: ${jsonFile}`);
  });

program.parseAsync().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});

function collect(v: string, prev: string[]) {
  return [...prev, v];
}

function hostOf(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    const p = u.pathname.replace(/\/+$/, "");
    return u.hostname.replace(/^www\./, "") + (p && p !== "/index.html" ? p : "");
  } catch {
    return "";
  }
}
