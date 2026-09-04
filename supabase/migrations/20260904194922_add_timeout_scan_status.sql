-- A navigation timeout is not the same failure as a domain that does not
-- resolve: the site is usually alive, just unusable. Scoring both as
-- "unreachable" at weight 60 ranked slow-but-live sites alongside dead ones.
alter type scan_status add value if not exists 'timeout';

insert into public.signal_catalog (key, label, weight, category, outreach_snippet) values
  ('load-timeout', 'Homepage did not finish loading in time', 45, 'performance',
   'Your homepage takes so long to load that it times out for a lot of visitors before anything appears.')
on conflict (key) do nothing;

-- Weight is dynamic in code, like stale-copyright: 25 when the page still
-- loaded on a laxer retry, 45 when it never produced a usable document.
comment on column public.signal_catalog.weight is
  'Nominal/ceiling weight. Some signals (stale-copyright, load-timeout) compute a lower weight at scan time.';
