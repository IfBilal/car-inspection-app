alter table profiles           enable row level security;
alter table clients            enable row level security;
alter table vehicles           enable row level security;
alter table checklist_sections enable row level security;
alter table checklist_items    enable row level security;
alter table inspections        enable row level security;
alter table inspection_results enable row level security;
alter table inspection_photos  enable row level security;

-- Checklist definition: read-only for the app (writes only via service role / dashboard)
create policy "read checklist sections" on checklist_sections for select to authenticated using (true);
create policy "read checklist items"    on checklist_items    for select to authenticated using (true);

-- Profiles: everyone can read (inspector names on reports); users edit only their own
create policy "read profiles"  on profiles for select to authenticated using (true);
create policy "update own profile" on profiles for update to authenticated using (id = auth.uid());

-- Shared pool for business data:
create policy "all clients"     on clients            for all to authenticated using (true) with check (true);
create policy "all vehicles"    on vehicles           for all to authenticated using (true) with check (true);
create policy "all inspections" on inspections        for all to authenticated using (true) with check (true);
create policy "all results"     on inspection_results for all to authenticated using (true) with check (true);
create policy "all photos"      on inspection_photos  for all to authenticated using (true) with check (true);
