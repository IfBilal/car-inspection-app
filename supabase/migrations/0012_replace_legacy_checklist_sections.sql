-- Replace the superseded broad checklist with the requested exterior points.
-- Existing result rows for removed checklist items must be cleared first because
-- checklist_items is intentionally protected by a restrictive foreign key.
delete from inspection_results
where item_id in (
  select id from checklist_items
  where section_id in (3, 4, 5, 6, 7, 15)
     or (section_id = 2 and label in (
       'Glass & Lights', 'Tires Condition', 'Wheels Rims', 'Spare Tire & Jack'
     ))
);

delete from checklist_items
where section_id in (3, 4, 5, 6, 7, 15)
   or (section_id = 2 and label in (
     'Glass & Lights', 'Tires Condition', 'Wheels Rims', 'Spare Tire & Jack'
   ));

delete from checklist_sections where id in (3, 4, 5, 6, 7, 15);

update checklist_sections set title = 'Exterior' where id = 2;

update checklist_items
set sort_order = case label
  when 'Body & Paint Condition' then 1
  when 'Rust & Corrosion' then 2
  when 'Exterior Trim & Seals' then 3
end
where section_id = 2;

with exterior(label, sort_order) as (
  values
    ('Bonnet', 4), ('Roof', 5), ('Tailgate/Boot', 6), ('Doors', 7),
    ('Hinges and Struts', 8), ('Locks and Latches', 9), ('Front Bumper', 10),
    ('Rear Bumper', 11), ('Panel Alignment', 12), ('Paint Match', 13),
    ('Windscreen and Windows', 14), ('Mirrors', 15), ('Headlights', 16),
    ('Indicators', 17), ('Brake & Taillights', 18), ('Wiper Blades', 19),
    ('Windscreen Washer & Pump', 20)
), missing as (
  select e.*
  from exterior e
  where not exists (
    select 1 from checklist_items i
    where i.section_id = 2 and lower(i.label) = lower(e.label)
  )
), numbered as (
  select m.*, (select coalesce(max(item_number), 0) from checklist_items) +
    row_number() over (order by m.sort_order) as item_number
  from missing m
)
insert into checklist_items (section_id, item_number, label, description, sort_order)
select 2, item_number, label, null, sort_order from numbered;
