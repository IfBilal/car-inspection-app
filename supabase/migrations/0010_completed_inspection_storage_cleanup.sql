-- Allow authenticated inspectors to remove generated assets when deleting an inspection.
create policy "auth delete signatures" on storage.objects
  for delete to authenticated using (bucket_id = 'signatures');

create policy "auth delete reports" on storage.objects
  for delete to authenticated using (bucket_id = 'reports');
