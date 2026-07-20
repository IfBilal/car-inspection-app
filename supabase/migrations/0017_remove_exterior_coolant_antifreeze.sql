-- Remove Coolant Antifreeze from Exterior and discard saved results for
-- that retired checklist checkpoint before deleting the protected item row.
delete from inspection_results
where item_id in (
  select id from checklist_items
  where section_id = 2 and lower(label) = lower('Coolant Antifreeze')
);

delete from checklist_items
where section_id = 2 and lower(label) = lower('Coolant Antifreeze');
