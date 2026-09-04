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

**Google Cloud:** create (or pick) a project → **link a billing account** → enable **Places API (New)** → create an API key and restrict it to that API. Two things bite people here: billing must be attached or every call returns `REQUEST_DENIED` even inside the free allowance, and the console also lists a legacy "Places API" — enabling that one gives 404s, since this code calls `places.googleapis.com/v1/places:searchText`. For key restrictions use IP-based (or none); HTTP-referrer restriction blocks server-side calls.

Two cost notes worth checking before you scale up runs. The field mask in `src/sources/places.ts` requests `websiteUri`, `nationalPhoneNumber`, `rating` and `userRatingCount`, which bill at the **Enterprise** SKU rather than Pro — unavoidable, since the website is the whole point, but it's the pricier tier. And Google replaced the flat $200/month credit with per-SKU monthly free tiers in 2025, so verify current terms on the pricing page rather than trusting a fixed number. Set a budget alert.

Text Search also returns at most ~60 results per query (3 pages of 20), so `-n 200` won't return 200 — scale by adding categories and cities, not by raising `-n`.

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

## Database (Supabase)

Optional. With no Supabase env set the CLI behaves exactly as before and just writes CSV/JSON; add the two vars and every run also persists.

```bash
# .env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>   # bypasses RLS — .env only, never committed
```

Schema lives in `supabase/migrations/` and is already applied to the project. To push it somewhere else:

```bash
supabase link --project-ref <ref>
supabase db push
```

The schema separates three things that have different lifecycles:

| Layer | Tables | Behaviour |
|---|---|---|
| Entities | `businesses` | One row per business, ever. Upserted on a stable `dedupe_key`. |
| Observations | `scan_runs`, `scans`, `scan_signals` | Append-only. One `scans` row per business per run. |
| Workflow | `leads`, `lead_notes`, `outreach` | Yours. **Never** written by a re-scan. |

Keeping workflow state off the scan row is the point: it means re-scanning is free and safe, and it can't clobber your notes. It also gives you score history — `v_score_history` shows whose site got worse, who rebuilt (drop them), and who has sat at 90+ for six months without fixing it, which is a warmer lead than a one-time high score. `v_current_leads` is the single view a dashboard reads: latest scan per business joined to pipeline status.

Two supporting pieces: `signal_catalog` holds the weights and a reusable `outreach_snippet` per signal, so a fired signal turns straight into a sentence you can send; and every run records a `scoring_version`, so retuning weights in `scanner.ts` doesn't silently make old and new scores look comparable.

RLS is on for every table with no `anon` policy, so nothing is readable without signing in. Screenshots go to a private `screenshots` bucket at `{run_id}/{business_id}.jpg`, read via signed URLs.

## Roadmap

- Next.js dashboard for the lead queue (schema is in place; `v_current_leads` is the read model)
- Switch the scanner to read weights from `signal_catalog` instead of hardcoding them
- Demand-signal feeds: Reddit, Craigslist gigs, Indeed/LinkedIn contract dev posts, Google Alerts RSS
- One-click mini audit PDF per lead (hooks into the existing SEO audit skill)
- Scheduled runs via GitHub Actions / Vercel cron
- Outreach via Resend (free tier)
