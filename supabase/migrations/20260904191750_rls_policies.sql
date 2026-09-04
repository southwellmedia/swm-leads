-- RLS on every table. Deny-by-default: no policy is granted to `anon`, so an
-- unauthenticated caller (including anyone holding the publishable key, which
-- is public by design) sees nothing.
--
-- Access model: this is a single-team internal tool, so any signed-in user gets
-- the whole pipeline. owner_id exists for assignment and filtering, not for
-- isolation -- a small agency wants everyone able to see and pick up any lead.
-- Tightening later means editing these policies, not migrating data.
--
-- The CLI writes with the service role key, which bypasses RLS entirely.

alter table public.businesses     enable row level security;
alter table public.scan_runs      enable row level security;
alter table public.scans          enable row level security;
alter table public.scan_signals   enable row level security;
alter table public.signal_catalog enable row level security;
alter table public.leads          enable row level security;
alter table public.lead_notes     enable row level security;
alter table public.outreach       enable row level security;

create policy "authenticated full access"
  on public.businesses for all to authenticated
  using (true) with check (true);

create policy "authenticated full access"
  on public.scan_runs for all to authenticated
  using (true) with check (true);

create policy "authenticated full access"
  on public.scans for all to authenticated
  using (true) with check (true);

create policy "authenticated full access"
  on public.scan_signals for all to authenticated
  using (true) with check (true);

create policy "authenticated full access"
  on public.signal_catalog for all to authenticated
  using (true) with check (true);

create policy "authenticated full access"
  on public.leads for all to authenticated
  using (true) with check (true);

create policy "authenticated full access"
  on public.lead_notes for all to authenticated
  using (true) with check (true);

create policy "authenticated full access"
  on public.outreach for all to authenticated
  using (true) with check (true);
