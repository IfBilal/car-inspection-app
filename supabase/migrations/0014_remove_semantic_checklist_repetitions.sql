-- Remove repeated concepts while retaining their more complete counterpart.
delete from inspection_results
where item_id in (
  select id from checklist_items
  where label in (
    'Suspension noises',
    'Wheel bearing noise',
    'ABS operation',
    'Engine starts easily',
    'Engine noises',
    'Air conditioning while driving',
    'Warning lights during road test',
    'Signs of flood damage',
    'Coolant level',
    'Coolant condition'
  )
);

delete from checklist_items
where label in (
  'Suspension noises',
  'Wheel bearing noise',
  'ABS operation',
  'Engine starts easily',
  'Engine noises',
  'Air conditioning while driving',
  'Warning lights during road test',
  'Signs of flood damage',
  'Coolant level',
  'Coolant condition'
);
