-- Keep the original checklist first, then the detailed additions, then the
-- vehicle diagram and red flags (the PDF renderer inserts the diagram directly
-- before the Red Flags section).
update checklist_sections
set sort_order = case id
  when 9 then 8
  when 10 then 9
  when 11 then 10
  when 12 then 11
  when 13 then 12
  when 14 then 13
  when 15 then 14
  when 8 then 15
  else sort_order
end
where id between 8 and 15;
