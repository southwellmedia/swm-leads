-- leadscout core schema
-- Three layers, deliberately separated:
--   businesses  : entities that persist (one row per real business, ever)
--   scan_runs / scans / scan_signals : append-only observations over time
--   leads / lead_notes / outreach    : human workflow, never touched by a re-scan

create type business_source as enum ('places', 'csv');
create type scan_status as enum ('scanned', 'no-website', 'unreachable');
create type lead_status as enum (
  'new', 'qualified', 'contacted', 'replied', 'meeting', 'won', 'lost', 'disqualified'
);
create type outreach_channel as enum ('email', 'phone', 'form', 'linkedin', 'in_person', 'other');
create type outreach_direction as enum ('outbound', 'inbound');

-- Shared updated_at trigger. search_path pinned; now() resolves from pg_catalog.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- businesses

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  -- Google Place ID: stable across runs, the natural key when present.
  place_id text unique,
  -- Always set by the app. place_id when we have one, else a hash of the
  -- normalized host, else a hash of name+address. This is the upsert target;
  -- without it re-runs would duplicate every business.
  dedupe_key text not null unique,
  name text not null,
  website text,
  website_host text,
  phone text,
  address text,
  city text,
  category text,
  rating numeric(2,1) check (rating >= 0 and rating <= 5),
  review_count integer check (review_count >= 0),
  maps_url text,
  source business_source not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_website_host_idx on public.businesses (website_host);
create index businesses_city_category_idx on public.businesses (city, category);
create index businesses_last_seen_idx on public.businesses (last_seen_at desc);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- scan_runs

create table public.scan_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  city text,
  categories text[] not null default '{}',
  source business_source not null,
  limit_per_category integer,
  -- Signal weights live in src/scan/scanner.ts. Retuning them makes old scores
  -- incomparable to new ones, so every run records which ruleset produced it.
  scoring_version text not null default 'v1',
  options jsonb not null default '{}'::jsonb,
  business_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index scan_runs_started_idx on public.scan_runs (started_at desc);

-- -------------------------------------------------------------------- scans

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  run_id uuid not null references public.scan_runs (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  status scan_status not null,
  score integer not null check (score between 0 and 100),
  final_url text,
  builder text,
  copyright_year integer,
  load_ms integer,
  page_bytes bigint,
  title text,
  error text,
  reasons text[] not null default '{}',
  -- Object path within the private `screenshots` bucket.
  screenshot_path text,
  scoring_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique (business_id, run_id)
);

create index scans_business_time_idx on public.scans (business_id, scanned_at desc);
create index scans_run_idx on public.scans (run_id);
create index scans_score_idx on public.scans (score desc);

-- ------------------------------------------------------------- scan_signals

-- Normalized rather than jsonb: the useful queries are cross-cutting, e.g.
-- "every plumber where diy-builder AND stale-copyright both fired".
-- ~25 rows per scan; a 200-business run is 5k rows, which is nothing.
create table public.scan_signals (
  scan_id uuid not null references public.scans (id) on delete cascade,
  key text not null,
  label text,
  weight integer not null default 0,
  fired boolean not null,
  detail text,
  primary key (scan_id, key)
);

create index scan_signals_fired_key_idx on public.scan_signals (key) where fired;

-- ----------------------------------------------------------- signal_catalog

-- Moves weights out of TypeScript so retuning is a row update, not a deploy.
-- outreach_snippet is the bridge from a fired signal to a sentence you can send.
create table public.signal_catalog (
  key text primary key,
  label text not null,
  weight integer not null,
  category text,
  outreach_snippet text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger signal_catalog_set_updated_at
  before update on public.signal_catalog
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------------- leads

-- Separate from scans on purpose: a re-scan must never clobber your notes.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  status lead_status not null default 'new',
  owner_id uuid references auth.users (id) on delete set null,
  priority smallint check (priority between 1 and 5),
  next_action_at timestamptz,
  disqualified_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads (status);
create index leads_owner_idx on public.leads (owner_id);
create index leads_next_action_idx on public.leads (next_action_at) where next_action_at is not null;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------- lead_notes

-- Append-only. A single overwritable notes column loses history.
create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null,
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- ----------------------------------------------------------------- outreach

create table public.outreach (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  channel outreach_channel not null,
  direction outreach_direction not null default 'outbound',
  subject text,
  body text,
  outcome text,
  occurred_at timestamptz not null default now(),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index outreach_lead_idx on public.outreach (lead_id, occurred_at desc);

-- -------------------------------------------------------------------- views

-- security_invoker so the RLS of the caller applies, not that of the view owner.

-- The one query a dashboard needs: newest scan per business + pipeline state.
create view public.v_current_leads with (security_invoker = true) as
select distinct on (b.id)
  b.id            as business_id,
  b.name,
  b.website,
  b.website_host,
  b.city,
  b.category,
  b.phone,
  b.address,
  b.rating,
  b.review_count,
  b.maps_url,
  b.source,
  s.id            as scan_id,
  s.score,
  s.status        as scan_status,
  s.builder,
  s.copyright_year,
  s.reasons,
  s.screenshot_path,
  s.scanned_at,
  l.id            as lead_id,
  l.status        as lead_status,
  l.owner_id,
  l.priority,
  l.next_action_at
from public.businesses b
left join public.scans s on s.business_id = b.id
left join public.leads l on l.business_id = b.id
order by b.id, s.scanned_at desc nulls last;

-- Score over time: who got worse, who rebuilt, who has ignored it for months.
create view public.v_score_history with (security_invoker = true) as
select
  b.id as business_id,
  b.name,
  b.website_host,
  s.scanned_at,
  s.score,
  s.status,
  s.builder,
  s.scoring_version
from public.businesses b
join public.scans s on s.business_id = b.id
order by b.id, s.scanned_at;
