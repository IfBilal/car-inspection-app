-- Storage buckets: inspection photos, signatures, generated reports.
insert into storage.buckets (id, name, public)
values
  ('inspection-photos', 'inspection-photos', false),
  ('signatures', 'signatures', false),
  ('reports', 'reports', false)
on conflict (id) do nothing;

-- Authenticated users can read everything and write photos/signatures.
create policy "auth read photos" on storage.objects
  for select to authenticated using (bucket_id = 'inspection-photos');
create policy "auth write photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'inspection-photos');
create policy "auth delete photos" on storage.objects
  for delete to authenticated using (bucket_id = 'inspection-photos');

create policy "auth read signatures" on storage.objects
  for select to authenticated using (bucket_id = 'signatures');
create policy "auth write signatures" on storage.objects
  for insert to authenticated with check (bucket_id = 'signatures');

-- Reports are written only by the service role (Edge Function); app reads them.
create policy "auth read reports" on storage.objects
  for select to authenticated using (bucket_id = 'reports');
