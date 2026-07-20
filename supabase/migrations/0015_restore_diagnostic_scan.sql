-- Restore the client-requested diagnostic scan immediately after Road Test.
insert into checklist_sections (id, title, emoji_icon, sort_order, kind)
values (15, 'Diagnostic Scan', 'scan', 15, 'status')
on conflict (id) do update set
  title = excluded.title,
  emoji_icon = excluded.emoji_icon,
  sort_order = excluded.sort_order,
  kind = excluded.kind;

with diagnostic(label, sort_order) as (
  values
    ('Engine Control Module (ECM)', 1),
    ('Transmission Control Module (TCM)', 2),
    ('ABS System', 3),
    ('SRS/Airbag System', 4),
    ('Body Control Module', 5),
    ('AWD/4WD Module', 6),
    ('HVAC System', 7),
    ('Parking Assist System', 8),
    ('TPMS System', 9),
    ('Stored Diagnostic Trouble Codes', 10),
    ('Pending Trouble Codes', 11),
    ('Permanent Trouble Codes', 12),
    ('System Communication', 13),
    ('Live Data Check', 14),
    ('Overall Scan Result', 15)
), missing as (
  select d.*
  from diagnostic d
  where not exists (
    select 1 from checklist_items i
    where i.section_id = 15 and lower(i.label) = lower(d.label)
  )
), numbered as (
  select m.*,
    (select coalesce(max(item_number), 0) from checklist_items) +
      row_number() over (order by m.sort_order) as item_number
  from missing m
)
insert into checklist_items (section_id, item_number, label, description, sort_order)
select 15, item_number, label, null, sort_order from numbered;

