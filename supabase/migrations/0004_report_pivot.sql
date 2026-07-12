-- Pivot to the client's report.pdf format (JS Elite Motorworks).
-- Old 219-item checklist and all test data are wiped by agreement.

-- ===== wipe test data =====
delete from inspection_photos;
delete from inspection_results;
delete from inspections;
delete from clients;
delete from vehicles;
delete from checklist_items;
delete from checklist_sections;

-- ===== checklist structure =====
-- kind drives the rating labels in app + PDF:
--   'status'   -> OK / Needs Attention / Critical   (pass / repair / fail)
--   'passfail' -> Pass / Fail / N/A                 (pass / fail / na)
--   'flags'    -> Yes / No                          (fail / pass)  [Yes = bad]
alter table checklist_sections add column if not exists kind text not null default 'status';
alter table checklist_items add column if not exists description text;

-- ===== vehicles =====
alter table vehicles add column if not exists trim text;

-- ===== inspections =====
-- recommendation becomes BUY / NEGOTIATE / WALK AWAY
alter table inspections alter column recommendation type text using recommendation::text;
drop type if exists recommendation;
create type recommendation as enum ('buy', 'negotiate', 'walk_away');
alter table inspections
  alter column recommendation type recommendation using null;

alter table inspections
  add column if not exists overall_score int check (overall_score between 1 and 10),
  add column if not exists estimated_repair_cost numeric(12,2),
  add column if not exists obd_ready boolean,
  add column if not exists obd_codes text,
  add column if not exists obd_notes text;
alter table inspections drop column if exists overall_rating;

-- immutability guard now watches the new outcome fields
create or replace function guard_completed_inspection() returns trigger language plpgsql as $$
begin
  if old.status = 'completed' and (
       new.vehicle_id            is distinct from old.vehicle_id
    or new.client_id             is distinct from old.client_id
    or new.overall_score         is distinct from old.overall_score
    or new.recommendation        is distinct from old.recommendation
    or new.inspector_notes       is distinct from old.inspector_notes
    or new.estimated_repair_cost is distinct from old.estimated_repair_cost
    or new.signature_path        is distinct from old.signature_path
    or new.status                is distinct from old.status
  ) then
    raise exception 'completed inspections are immutable';
  end if;
  return new;
end $$;
