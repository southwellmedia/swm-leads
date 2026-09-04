# leadscout

Finds local small businesses whose websites are outdated — or missing entirely — and ranks them as leads. Built for Southwell Media; runs for free on Google's Places credit and a headless browser.

## How it works

1. **Source** — pulls businesses for a category + city from Google Places API (New): name, website, phone, rating, review count, Maps link. A CSV source is included for testing or for feeding lists from elsewhere (Yelp exports, chamber directories).
2. **Scan** — loads each homepage in headless Chromium at phone size and checks ~25 signals: no website at all, DIY builder (Wix, GoDaddy, Weebly, FrontPage…), legacy HTML (table layouts, `<font>`, jQuery 1.x, XHTML doctype), no viewport meta, horizontal overflow, stale copyright year, no HTTPS, slow load, thin/placeholder content, parked domain, no click-to-call, missing schema/meta/OG/favicon.
3. **Score** — weighted signals sum to a 0–100 "needs help" score. Businesses with no website score 100 automatically. Ties break on review count (more reviews = more revenue = better lead).
4. **Output** — ranked CSV + full JSON + a mobile screenshot per site in `out/`.

## Setup

```bash
npm install
cp .env.example .env   # add GOOGLE_PLACES_API_KEY
npx playwright install chromium   # or set CHROMIUM_PATH to an existing binary
```

Get a key: Google Cloud Console → enable **Places API (New)** → create an API key restricted to that API. The $200/month credit covers roughly 5,000+ text-search pages (20 businesses each).

## Usage

```bash
# One category
npm run scan -- -c "roofing contractor" --city "Dallas, TX" -n 40

# Several categories at once
npm run scan -- -c "plumber" -c "electrician" -c "med spa" --city "Plano, TX"

# A whole group from config/categories.json (portfolio | home-services | professional)
npm run scan -- -g portfolio -g home-services --city "Fort Worth, TX" -n 20

# Only keep strong leads in the CSV, skip screenshots
npm run scan -- -g professional --min-score 50 --no-screenshots

# Test without an API key
npm run scan -- --csv samples/test-businesses.csv
```

Edit `config/categories.json` to add or change category groups.

## Reading the results

| Score | Meaning |
|-------|---------|
| 100 | No website, or a site that is broken/parked/ancient |
| 60–99 | Clearly dated: DIY builder + stale copyright + mobile problems |
| 30–59 | Functional but weak; good for a "quick wins" audit pitch |
| < 30 | Modern site; skip unless you're selling something other than a rebuild |

The `reasons` column lists the top five fired signals so you can write a specific, non-generic first line in outreach ("your site still shows © 2017 and doesn't fit on a phone screen").

## Tuning the scoring

All weights live in `src/scan/scanner.ts` — each `sig(key, label, weight, fired, detail)` call is one signal. Builder fingerprints and legacy-tech tells are in `src/scan/fingerprint.ts`.

## Roadmap

- Supabase schema + Next.js dashboard for the lead queue (status, notes, outreach log)
- Demand-signal feeds: Reddit, Craigslist gigs, Indeed/LinkedIn contract dev posts, Google Alerts RSS
- One-click mini audit PDF per lead (hooks into the existing SEO audit skill)
- Scheduled runs via GitHub Actions / Vercel cron
- Outreach via Resend (free tier)
