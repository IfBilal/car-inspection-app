-- Diagnostic Scan must appear immediately after Road Test and before Red Flags.
-- Migration 0015 accidentally gave Diagnostic Scan and Red Flags the same
-- sort_order, which made their report order nondeterministic.
update checklist_sections
set sort_order = case id
  when 14 then 13 -- Road Test
  when 15 then 14 -- Diagnostic Scan
  when 8 then 15  -- Red Flags
  else sort_order
end
where id in (8, 14, 15);
