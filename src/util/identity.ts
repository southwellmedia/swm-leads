import { createHash } from "node:crypto";

/**
 * Normalized host (+ meaningful path) for a website URL. Drops `www.` and
 * trailing slashes so `http://www.acme.com/` and `https://acme.com` collapse
 * to the same string. Returns "" for anything unparseable.
 */
export function hostOf(url: string): string {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    const p = u.pathname.replace(/\/+$/, "");
    return u.hostname.replace(/^www\./, "") + (p && p !== "/index.html" ? p : "");
  } catch {
    return "";
  }
}

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * A business identity that stays the same across runs — the upsert target for
 * the `businesses` table.
 *
 * Order matters: Google Place IDs are assigned by Google and never move, so
 * they win. Without one we fall back to the normalized website host, then to a
 * hash of name + address.
 *
 * What this must never be is positional. An id like `csv-3` points at whatever
 * happens to be the third row today; insert a line in the CSV tomorrow and
 * `csv-3` silently becomes a different company — which is harmless for a
 * throwaway CSV export and quietly corrupting as a database key.
 *
 * Caveat: two locations of one franchise have different Place IDs, so they are
 * two rows here even though they share one website. That is the right call for
 * a lead list (two locations, two owners to call), but it means a host can
 * appear more than once.
 */
export function dedupeKeyFor(b: {
  placeId?: string;
  website?: string;
  name: string;
  address?: string;
}): string {
  if (b.placeId) return `place:${b.placeId}`;
  const host = hostOf(b.website ?? "");
  if (host) return `host:${host}`;
  return `biz:${sha1(`${norm(b.name)}|${norm(b.address ?? "")}`)}`;
}
