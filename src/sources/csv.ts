import { readFile } from "node:fs/promises";
import type { Business, Source } from "../types.js";
import { dedupeKeyFor } from "../util/identity.js";

/**
 * CSV source — for testing the scanner without an API key, or for feeding in
 * lists from other places (Yelp export, chamber-of-commerce directory, etc).
 * Expected header: name,website[,category,phone,address]
 */
export class CsvSource implements Source {
  name = "csv";
  constructor(private path: string) {}

  async search(query: string, _city: string, limit: number): Promise<Business[]> {
    const text = await readFile(this.path, "utf8");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);

    const rows: Business[] = [];
    for (const line of lines.slice(1)) {
      const cols = parseLine(line);
      const name = cols[idx("name")]?.trim();
      if (!name) continue;
      const website = cols[idx("website")]?.trim() || undefined;
      const address = cols[idx("address")]?.trim() || undefined;
      rows.push({
        // Derived from content, never from row position: a positional id
        // silently re-points at a different business the moment someone
        // inserts a line in the CSV.
        id: dedupeKeyFor({ name, website, address }),
        name,
        category: cols[idx("category")]?.trim() || query,
        website,
        phone: cols[idx("phone")]?.trim() || undefined,
        address,
        source: "csv",
      });
    }
    return rows.slice(0, limit);
  }
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
