import { chromium, errors as pwErrors, type Browser, type BrowserContext } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Business, ScanResult, Signal } from "../types.js";
import { fingerprint } from "./fingerprint.js";
import { extractEmails, pickBestEmail } from "./email.js";
import { hostOf } from "../util/identity.js";

const CURRENT_YEAR = new Date().getFullYear();
/** Budget for a full `load` (all subresources). Slow sites routinely exceed it. */
const NAV_TIMEOUT_MS = 25_000;
/** Second, laxer attempt: just get a document we can fingerprint. */
const SLOW_RETRY_TIMEOUT_MS = 45_000;

/**
 * Bump whenever a signal weight below changes, or a signal is added/removed.
 * Every persisted scan records this, so a score from an old ruleset is never
 * silently compared against one from a new ruleset in the history views.
 */
export const SCORING_VERSION = "v2";

const isTimeout = (err: unknown) =>
  err instanceof pwErrors.TimeoutError || (err as Error | undefined)?.name === "TimeoutError";

export interface ScannerOptions {
  screenshotDir: string;
  screenshots: boolean;
}

export class Scanner {
  private browser?: Browser;
  constructor(private opts: ScannerOptions) {}

  async start() {
    this.browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROMIUM_PATH || undefined,
    });
    if (this.opts.screenshots) await mkdir(this.opts.screenshotDir, { recursive: true });
  }

  async stop() {
    await this.browser?.close();
  }

  async scan(biz: Business): Promise<ScanResult> {
    const base: ScanResult = {
      business: biz,
      status: "scanned",
      signals: [],
      score: 0,
      reasons: [],
      scannedAt: new Date().toISOString(),
    };

    if (!biz.website) {
      base.status = "no-website";
      base.signals.push(sig("no-website", "No website listed on Google", 100, true));
      return finalize(base);
    }

    const ctx = await this.browser!.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ignoreHTTPSErrors: true,
    });

    try {
      return await this.scanInContext(ctx, biz, base);
    } catch (err) {
      base.error = (err as Error).message.split("\n")[0].slice(0, 200);
      if (isTimeout(err)) {
        // Never produced a usable document, even on the laxer retry. Bad, but
        // not the same as a domain that does not resolve — the site is likely
        // alive and merely unusable, so it scores below a hard failure.
        base.status = "timeout";
        base.signals.push(sig("load-timeout", "Homepage never finished loading", 45, true, base.error));
      } else {
        base.status = "unreachable";
        base.signals.push(sig("unreachable", "Website unreachable or errored", 60, true, base.error));
      }
      return finalize(base);
    } finally {
      await ctx.close();
    }
  }

  private async scanInContext(ctx: BrowserContext, biz: Business, r: ScanResult): Promise<ScanResult> {
    const page = await ctx.newPage();
    let totalBytes = 0;
    page.on("response", async (res) => {
      try {
        const len = res.headers()["content-length"];
        if (len) totalBytes += parseInt(len, 10) || 0;
      } catch { /* ignore */ }
    });

    const startUrl = normalizeUrl(biz.website!);
    const t0 = Date.now();
    let loadTimedOut = false;
    let resp;
    try {
      resp = await page.goto(startUrl, { waitUntil: "load", timeout: NAV_TIMEOUT_MS });
    } catch (err) {
      if (!isTimeout(err)) throw err;
      // A slow site is still a live site, and usually a better lead than a fast
      // one. Retry with a laxer wait so we can still fingerprint it; giving up
      // here would throw away every other signal and score it as if it were
      // dead. Re-navigating rather than reusing the partial page, so we never
      // fingerprint a half-committed about:blank.
      loadTimedOut = true;
      resp = await page.goto(startUrl, {
        waitUntil: "domcontentloaded",
        timeout: SLOW_RETRY_TIMEOUT_MS,
      });
    }
    await page.waitForTimeout(800); // let late scripts settle
    r.loadMs = Date.now() - t0;
    r.finalUrl = page.url();
    r.pageBytes = totalBytes;

    const status = resp?.status() ?? 0;
    const headers = resp?.headers() ?? {};
    const html = await page.content();
    r.title = (await page.title()).trim();

    // --- Signals ------------------------------------------------------------
    const S = r.signals;

    S.push(sig("http-error", `Homepage returned HTTP ${status}`, 40, status >= 400, String(status)));
    S.push(sig("no-https", "Not served over HTTPS", 18, !r.finalUrl.startsWith("https://")));

    // Mobile responsiveness
    const mobile = await page.evaluate(() => {
      const vp = document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "";
      const overflow = document.documentElement.scrollWidth - window.innerWidth;
      const smallFontRatio = (() => {
        const els = Array.from(document.querySelectorAll("p, li, a, span, td")).slice(0, 300);
        if (!els.length) return 0;
        const small = els.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).length;
        return small / els.length;
      })();
      return { viewport: vp, overflowPx: overflow, smallFontRatio };
    });
    S.push(sig("no-viewport", "No mobile viewport meta tag", 20, !/width=device-width/i.test(mobile.viewport)));
    S.push(sig("h-overflow", "Horizontal overflow on a phone-sized screen", 15, mobile.overflowPx > 30, `${mobile.overflowPx}px`));
    S.push(sig("tiny-text", "Most text is unreadably small on mobile", 10, mobile.smallFontRatio > 0.5, `${Math.round(mobile.smallFontRatio * 100)}%`));

    // Contact email. Not scored — it is not a quality signal, it is the thing
    // that makes outreach possible at all, since Places never returns one.
    try {
      const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
      r.email = pickBestEmail(extractEmails(html, bodyText), hostOf(r.finalUrl ?? biz.website ?? ""));
    } catch {
      /* a page that will not give up its text is not a scan failure */
    }

    // Builder / legacy tech
    const fp = fingerprint(html, headers);
    r.builder = fp.builder;
    S.push(sig("diy-builder", "Built on a DIY builder", 15, fp.diy, fp.builder));
    S.push(sig("legacy-tech", "Legacy HTML/tech detected", 20, fp.legacyTells.length > 0, fp.legacyTells.join(", ")));

    // Copyright year
    const yearMatches = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map((m) => parseInt(m[1], 10));
    if (yearMatches.length) {
      r.copyrightYear = Math.max(...yearMatches);
      const age = CURRENT_YEAR - r.copyrightYear;
      S.push(sig("stale-copyright", `Footer copyright is ${age} year${age === 1 ? "" : "s"} old`, Math.min(20, age * 6), age >= 2, String(r.copyrightYear)));
    } else {
      S.push(sig("stale-copyright", "Stale copyright year", 0, false));
    }

    // Performance-ish
    S.push(sig("slow-load", "Slow to load", 10, (r.loadMs ?? 0) > 6000, `${r.loadMs}ms`));
    // Loaded only on the laxer retry: real, scannable, and painfully slow.
    S.push(sig("load-timeout", "Homepage did not finish loading in time", 25, loadTimedOut, `>${NAV_TIMEOUT_MS}ms to full load`));
    S.push(sig("heavy-page", "Very heavy page", 8, (r.pageBytes ?? 0) > 6_000_000, `${Math.round((r.pageBytes ?? 0) / 1024)}KB`));

    // SEO / content basics
    const seo = await page.evaluate(() => {
      const ld = document.querySelectorAll('script[type="application/ld+json"]').length;
      const desc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
      const h1 = document.querySelectorAll("h1").length;
      const imgs = Array.from(document.images);
      const noAlt = imgs.filter((i) => !i.alt).length;
      const text = document.body?.innerText?.trim() ?? "";
      const og = !!document.querySelector('meta[property="og:title"], meta[property="og:image"]');
      const favicon = !!document.querySelector('link[rel*="icon"]');
      const forms = document.querySelectorAll("form").length;
      const tel = !!document.querySelector('a[href^="tel:"]');
      const placeholder = /coming soon|under construction|lorem ipsum|welcome to (wordpress|your new site)/i.test(text);
      return { ld, desc, h1, imgCount: imgs.length, noAlt, textLen: text.length, og, favicon, forms, tel, placeholder };
    });
    S.push(sig("no-schema", "No structured data (schema.org)", 6, seo.ld === 0));
    S.push(sig("no-meta-desc", "Missing meta description", 5, !seo.desc));
    S.push(sig("no-h1", "No H1 heading", 4, seo.h1 === 0));
    S.push(sig("no-og", "No Open Graph tags (bad link previews)", 4, !seo.og));
    S.push(sig("no-favicon", "No favicon", 3, !seo.favicon));
    S.push(sig("missing-alt", "Most images lack alt text", 4, seo.imgCount > 3 && seo.noAlt / seo.imgCount > 0.6, `${seo.noAlt}/${seo.imgCount}`));
    S.push(sig("thin-content", "Very little text on the homepage", 8, seo.textLen < 300, `${seo.textLen} chars`));
    S.push(sig("placeholder", "Placeholder / under-construction content", 25, seo.placeholder));
    S.push(sig("no-contact", "No click-to-call or contact form", 8, !seo.tel && seo.forms === 0));
    S.push(sig("parked", "Looks like a parked domain", 40, /domain (is )?for sale|parked|buy this domain|hugedomains|godaddy\.com\/forsale/i.test(html)));

    if (this.opts.screenshots) {
      const file = path.join(this.opts.screenshotDir, `${slug(biz.name)}-${biz.id.slice(-6)}.jpg`);
      await page.screenshot({ path: file, type: "jpeg", quality: 70, fullPage: false });
      r.screenshotPath = file;
    }

    return finalize(r);
  }
}

// ---------------------------------------------------------------------------

function sig(key: string, label: string, weight: number, fired: boolean, detail?: string): Signal {
  return { key, label, weight, fired, detail };
}

function finalize(r: ScanResult): ScanResult {
  const fired = r.signals.filter((s) => s.fired && s.weight > 0);
  const raw = fired.reduce((a, s) => a + s.weight, 0);
  r.score = Math.min(100, Math.round(raw));
  r.reasons = fired
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((s) => (s.detail ? `${s.label} (${s.detail})` : s.label));
  return r;
}

function normalizeUrl(u: string): string {
  const t = u.trim();
  return /^https?:\/\//i.test(t) ? t : `http://${t}`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
