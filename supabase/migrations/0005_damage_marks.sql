-- Damage diagram marks placed in-app: [{x, y, t}] with x/y normalized 0..1
-- against the diagram image, t in ('dent','scratch','rust').
alter table inspections add column if not exists damage_marks jsonb not null default '[]';
