-- Seeded from the sig() calls in src/scan/scanner.ts as of the initial commit.
-- Weights here are documentation + a place to retune from; scanner.ts is still
-- the runtime source until the scanner is switched to read this table.
-- stale-copyright is dynamic in code (min(20, age*6)); 20 is its ceiling.
insert into public.signal_catalog (key, label, weight, category, outreach_snippet) values
  ('no-website',      'No website listed on Google',                 100, 'availability', 'You don''t have a website listed on your Google Business Profile, so customers searching for you have nowhere to land.'),
  ('unreachable',     'Website unreachable or errored',                60, 'availability', 'Your website didn''t load when we checked it -- customers clicking through from Google are hitting the same wall.'),
  ('parked',          'Looks like a parked domain',                   40, 'availability', 'Your domain is parked rather than pointing at a real site.'),
  ('http-error',      'Homepage returned an HTTP error',              40, 'availability', 'Your homepage is returning a server error instead of loading.'),
  ('placeholder',     'Placeholder / under-construction content',     25, 'content',      'Your site still shows placeholder or "under construction" content.'),
  ('legacy-tech',     'Legacy HTML/tech detected',                    20, 'tech',         'Your site is built on markup that predates the mobile web, which is why it struggles on phones.'),
  ('no-viewport',     'No mobile viewport meta tag',                  20, 'mobile',       'Your site has no mobile viewport tag, so phones render it as a shrunken desktop page.'),
  ('no-https',        'Not served over HTTPS',                        18, 'trust',        'Your site isn''t served over HTTPS -- Chrome shows visitors a "Not secure" warning before they read a word.'),
  ('stale-copyright', 'Footer copyright is out of date',              20, 'trust',        'Your footer still shows an old copyright year, which reads as abandoned to anyone checking you out.'),
  ('diy-builder',     'Built on a DIY builder',                       15, 'tech',         'Your site is on a DIY builder template, which is why it looks like a lot of your competitors.'),
  ('h-overflow',      'Horizontal overflow on a phone-sized screen',  15, 'mobile',       'Your site scrolls sideways on a phone -- visitors have to pinch and drag to read it.'),
  ('tiny-text',       'Most text is unreadably small on mobile',      10, 'mobile',       'Most of the text on your site is too small to read on a phone without zooming.'),
  ('slow-load',       'Slow to load',                                 10, 'performance',  'Your homepage takes long enough to load that a meaningful share of visitors leave first.'),
  ('heavy-page',      'Very heavy page',                               8, 'performance',  'Your homepage is very heavy, which is slow and expensive on mobile data.'),
  ('thin-content',    'Very little text on the homepage',              8, 'content',      'There''s very little content on your homepage for Google or a customer to work with.'),
  ('no-contact',      'No click-to-call or contact form',              8, 'content',      'There''s no tap-to-call link or contact form, so a phone visitor has to copy your number by hand.'),
  ('no-schema',       'No structured data (schema.org)',               6, 'seo',          'Your site has no structured data, so Google can''t show your hours, rating, or location in results.'),
  ('no-meta-desc',    'Missing meta description',                      5, 'seo',          'Your pages have no meta description, so Google invents the snippet shown in search results.'),
  ('no-h1',           'No H1 heading',                                 4, 'seo',          'Your homepage has no main heading for search engines to read.'),
  ('no-og',           'No Open Graph tags (bad link previews)',        4, 'seo',          'When someone shares your site on Facebook or in a text, the preview comes up blank.'),
  ('missing-alt',     'Most images lack alt text',                     4, 'seo',          'Most images on your site have no alt text -- bad for search and unusable with a screen reader.'),
  ('no-favicon',      'No favicon',                                    3, 'trust',        'Your site has no favicon, so it shows as a blank page icon in browser tabs and bookmarks.')
on conflict (key) do nothing;
