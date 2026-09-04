/**
 * Email harvesting.
 *
 * Google Places does not return an email address, so without this the outreach
 * side of the tool has nobody to send to. The scanner already has the homepage
 * open in a browser, so pulling addresses out of it is close to free.
 *
 * Expect roughly a third to a half of small-business sites to yield one. The
 * rest are contact-form-only, which is why phone stays the primary channel.
 */

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Vendor, tracking and boilerplate addresses that are never the business. */
const JUNK_DOMAINS = [
  "example.com", "example.org", "domain.com", "yourdomain.com", "email.com",
  "sentry.io", "sentry-next.wixpress.com", "wixpress.com", "wix.com",
  "squarespace.com", "godaddy.com", "weebly.com", "duda.co", "dudamobile.com",
  // Template placeholders shipped by builders and left in place by the owner.
  "mailservice.com", "yourcompany.com", "company.com", "mysite.com", "site.com",
  "wordpress.com", "wpengine.com", "gravatar.com", "schema.org", "w3.org",
  "googleapis.com", "google.com", "facebook.com", "cloudflare.com",
];

/** Local parts that indicate a template placeholder rather than a real inbox. */
const JUNK_LOCALS = ["email", "youremail", "your-email", "name", "yourname", "user", "username"];

/** Mailbox names a business actually reads, best first. */
const PREFERRED_LOCALS = [
  "info", "contact", "hello", "office", "sales", "admin", "inquiries",
  "enquiries", "support", "service", "team",
];

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|ico|css|js)$/i;

function isPlausible(email: string): boolean {
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (email.length > 254 || local.length > 64) return false;
  // "logo@2x.png", "sprite@3x.jpg" — CSS retina assets look like addresses.
  if (IMAGE_EXT.test(domain)) return false;
  if (/^\d+x$/i.test(local)) return false;
  if (JUNK_LOCALS.includes(local)) return false;
  if (JUNK_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return false;
  // Long hex local parts are build hashes, not people.
  if (/^[0-9a-f]{16,}$/i.test(local)) return false;
  return true;
}

/**
 * Picks the address most likely to reach the owner: same domain as the site
 * first (a gmail.com address on a site with its own domain is usually a
 * developer or a third party), then a preferred mailbox name.
 */
export function pickBestEmail(candidates: string[], siteHost: string): string | undefined {
  const seen = new Set<string>();
  const clean = candidates
    .map((e) => e.trim().toLowerCase().replace(/^mailto:/, "").split("?")[0])
    .filter((e) => isPlausible(e))
    .filter((e) => (seen.has(e) ? false : (seen.add(e), true)));

  if (!clean.length) return undefined;

  const root = siteHost.replace(/^www\./, "").split("/")[0];
  const score = (email: string): number => {
    const [local, domain] = email.split("@");
    let s = 0;
    if (root && (domain === root || domain.endsWith(`.${root}`))) s += 100;
    const rank = PREFERRED_LOCALS.indexOf(local);
    if (rank >= 0) s += 50 - rank;
    return s;
  };

  return clean.sort((a, b) => score(b) - score(a))[0];
}

/** Extracts every candidate address from raw page HTML plus visible text. */
export function extractEmails(html: string, text: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href=["']mailto:([^"'?]+)/gi)) out.push(m[1]);
  for (const m of text.matchAll(EMAIL_RE)) out.push(m[0]);
  // Lightly obfuscated addresses: "info [at] example.com"
  for (const m of text.matchAll(/([a-z0-9._%+-]+)\s*(?:\[at\]|\(at\))\s*([a-z0-9.-]+\.[a-z]{2,})/gi)) {
    out.push(`${m[1]}@${m[2]}`);
  }
  return out;
}
