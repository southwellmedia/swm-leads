-- Private bucket for mobile screenshots. Object path: {run_id}/{business_id}.png
-- Private, not public: these are prospect sites tied to your lead list. The
-- dashboard reads them through short-lived signed URLs; the CLI uploads with
-- the service role key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshots', 'screenshots', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "authenticated read screenshots"
  on storage.objects for select to authenticated
  using (bucket_id = 'screenshots');

create policy "authenticated write screenshots"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'screenshots');

create policy "authenticated update screenshots"
  on storage.objects for update to authenticated
  using (bucket_id = 'screenshots') with check (bucket_id = 'screenshots');
