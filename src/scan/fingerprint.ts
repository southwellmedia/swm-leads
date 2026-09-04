/**
 * Lightweight site-builder / CMS fingerprinting from HTML + response headers.
 * Each entry: name, whether it's a "DIY builder" (strong lead signal), and
 * regexes tested against the raw HTML (case-insensitive).
 */
interface Fingerprint {
  name: string;
  diy: boolean;
  patterns: RegExp[];
}

const FINGERPRINTS: Fingerprint[] = [
  { name: "Wix", diy: true, patterns: [/static\.wixstatic\.com/i, /wix\.com/i, /X-Wix-/i] },
  { name: "GoDaddy Website Builder", diy: true, patterns: [/img1\.wsimg\.com/i, /godaddy/i, /websitebuilder/i] },
  { name: "Weebly", diy: true, patterns: [/weebly\.com/i, /_weebly/i] },
  { name: "Squarespace", diy: true, patterns: [/squarespace\.com/i, /static1\.squarespace/i] },
  { name: "Web.com / Yodle", diy: true, patterns: [/web\.com/i, /yodle/i, /nsads\.hostgator/i] },
  { name: "Duda", diy: true, patterns: [/duda\.co/i, /dudamobile/i, /irp\.cdn-website\.com/i] },
  { name: "Homestead", diy: true, patterns: [/homestead\.com/i] },
  { name: "Site123", diy: true, patterns: [/site123\.com/i] },
  { name: "Jimdo", diy: true, patterns: [/jimdo\.com/i] },
  { name: "Strikingly", diy: true, patterns: [/strikingly\.com/i] },
  { name: "Google Sites", diy: true, patterns: [/sites\.google\.com/i, /googleusercontent\.com\/.*sites/i] },
  { name: "1&1 IONOS MyWebsite", diy: true, patterns: [/ionos/i, /1and1/i] },
  { name: "Shopify", diy: false, patterns: [/cdn\.shopify\.com/i, /Shopify\.theme/i] },
  { name: "Webflow", diy: false, patterns: [/webflow\.com/i, /data-wf-page/i] },
  { name: "Framer", diy: false, patterns: [/framerusercontent\.com/i] },
  { name: "WordPress", diy: false, patterns: [/wp-content\//i, /wp-includes\//i, /generator" content="WordPress/i] },
  { name: "Joomla", diy: true, patterns: [/generator" content="Joomla/i, /\/media\/jui\//i] },
  { name: "Drupal", diy: false, patterns: [/generator" content="Drupal/i, /\/sites\/default\/files/i] },
  { name: "Next.js", diy: false, patterns: [/__NEXT_DATA__/i, /_next\/static/i] },
  { name: "Astro", diy: false, patterns: [/generator" content="Astro/i, /_astro\//i] },
  { name: "Nuxt", diy: false, patterns: [/__NUXT__/i, /_nuxt\//i] },
  { name: "Gatsby", diy: false, patterns: [/gatsby/i] },
  { name: "Microsoft FrontPage", diy: true, patterns: [/generator" content="Microsoft FrontPage/i] },
  { name: "Adobe Dreamweaver / GoLive", diy: true, patterns: [/generator" content="Adobe/i, /MM_preloadImages/i, /MM_swapImage/i] },
];

export interface FingerprintResult {
  builder?: string;
  diy: boolean;
  /** Older-tech tells that suggest the site hasn't been rebuilt in years. */
  legacyTells: string[];
}

export function fingerprint(html: string, headers: Record<string, string>): FingerprintResult {
  const hay = html + "\n" + Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join("\n");
  let builder: string | undefined;
  let diy = false;
  for (const fp of FINGERPRINTS) {
    if (fp.patterns.some((p) => p.test(hay))) {
      builder = fp.name;
      diy = fp.diy;
      break;
    }
  }

  const legacyTells: string[] = [];
  if (/<table[^>]*(width|cellpadding|cellspacing)=/i.test(html)) legacyTells.push("table-based layout");
  if (/<font\b/i.test(html)) legacyTells.push("<font> tags");
  if (/<center>/i.test(html)) legacyTells.push("<center> tags");
  if (/<marquee/i.test(html)) legacyTells.push("<marquee>");
  if (/<frameset|<frame\b/i.test(html)) legacyTells.push("frames");
  if (/\.swf\b|shockwave-flash/i.test(html)) legacyTells.push("Flash");
  if (/<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD (XHTML|HTML 4)/i.test(html)) legacyTells.push("XHTML/HTML4 doctype");
  if (/bootstrap\/(2|3)\./i.test(html)) legacyTells.push("Bootstrap 2/3");
  const jq = html.match(/jquery[-.](1\.\d+(?:\.\d+)?)(?:\.min)?\.js/i);
  if (jq) legacyTells.push(`jQuery ${jq[1]}`);
  if (/bgcolor=|onmouseover=/i.test(html)) legacyTells.push("inline legacy attributes");

  return { builder, diy, legacyTells };
}
