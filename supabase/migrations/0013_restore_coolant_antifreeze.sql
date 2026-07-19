-- Restore the requested Coolant Antifreeze checkpoint under Exterior.
insert into checklist_items (section_id, item_number, label, description, sort_order)
select
  2,
  (select coalesce(max(item_number), 0) + 1 from checklist_items),
  'Coolant Antifreeze',
  'Check coolant level, color, and for signs of leaks.',
  21
where exists (select 1 from checklist_sections where id = 2)
  and not exists (
    select 1 from checklist_items
    where section_id = 2 and lower(label) = lower('Coolant Antifreeze')
  );
