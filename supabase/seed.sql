-- Checklist seed — mirrors docs/report.pdf (JS Elite Motorworks
-- "Premium Used Car Pre-Purchase Inspection Checklist") 1:1.
-- section.kind: 'passfail' (Pass/Fail/N-A) | 'status' (OK/Needs Attention/Critical) | 'flags' (Yes/No)

-- Keep checklist expansions introduced by later migrations. This seed owns the
-- original report template only; `0006_expanded_inspection_checklist.sql`
-- supplies the detailed client additions.
delete from checklist_items where section_id <= 8;
delete from checklist_sections where id <= 8;

insert into checklist_sections (id, title, emoji_icon, sort_order, kind) values
  (1, 'Vehicle History & Records Review',              'file-search', 1, 'passfail'),
  (2, 'Exterior & Tires',                              'car',         2, 'status'),
  (3, 'Under the Hood (Initial Checks)',               'cog',         3, 'status'),
  (4, 'Under the Hood (Continued) + Diagnostic Scan',  'scan',        4, 'status'),
  (5, 'Undercarriage / Lift Inspection',               'wrench',      5, 'status'),
  (6, 'Interior & Electronics',                        'armchair',    6, 'status'),
  (7, 'Test Drive',                                    'gauge',       7, 'status'),
  (8, 'Red Flags',                                     'alert',       15, 'flags')
on conflict (id) do update set
  title = excluded.title, kind = excluded.kind, sort_order = excluded.sort_order;

insert into checklist_items (section_id, item_number, label, description, sort_order) values
-- 1. Vehicle History & Records Review (Pass / Fail / N-A)
(1,  1, 'Clean title verified', 'No salvage, rebuilt, or junk history.', 1),
(1,  2, 'No open recalls', 'Checked via NHTSA or manufacturer.', 2),
(1,  3, 'Service records available and reviewed', null, 3),
(1,  4, 'No major accidents reported', 'Verified via history report.', 4),
(1,  5, 'Odometer reading consistent with history report', null, 5),
-- 2. Exterior & Tires (OK / Needs Attention / Critical)
(2,  6, 'Body & Paint Condition', 'Check for dents, dings, scratches, mismatched paint, and overall finish quality.', 6),
(2,  7, 'Rust & Corrosion', 'Inspect common rust areas: wheel arches, rocker panels, undercarriage, door bottoms.', 7),
(2,  8, 'Glass & Lights', 'Check windshield, windows, mirrors, headlights, taillights, turn signals, and fog lights.', 8),
(2,  9, 'Tires Condition', 'Check tread depth, even wear, sidewalls, and overall condition.', 9),
(2, 10, 'Wheels Rims', 'Inspect for cracks, bends, curb rash, and proper lug nut condition.', 10),
(2, 11, 'Exterior Trim & Seals', 'Check door seals, weather stripping, emblems, and exterior trim condition.', 11),
(2, 12, 'Spare Tire & Jack', 'Verify spare tire condition and presence of jack, lug wrench, and tools.', 12),
-- 3. Under the Hood — initial checks
(3, 13, 'Engine Oil Condition', 'Check oil level and condition (color, consistency, signs of contamination).', 13),
(3, 14, 'Coolant Antifreeze', 'Check coolant level, color, and for signs of leaks.', 14),
(3, 15, 'Belts & Hoses', 'Inspect for cracks, fraying, leaks, or signs of wear.', 15),
(3, 16, 'Battery Condition', 'Check battery terminals, corrosion, hold-down, and overall condition.', 16),
(3, 17, 'Transmission Fluid (if dipstick available)', 'Check level and condition.', 17),
(3, 18, 'Engine Mounts', 'Check for cracks or excessive wear.', 18),
(3, 19, 'Visible Fluid Leaks', 'General inspection for any active leaks.', 19),
-- 4. Under the Hood (continued) + OBD-II
(4, 20, 'Air Filter', 'Inspect air filter condition and cleanliness.', 20),
(4, 21, 'Brake Fluid', 'Check brake fluid level and condition.', 21),
(4, 22, 'Power Steering Fluid', 'Check power steering fluid level and condition.', 22),
(4, 23, 'Fluid Leaks', 'Inspect for oil, coolant, fuel, or other fluid leaks.', 23),
(4, 24, 'Radiator & Hoses', 'Check radiator condition, hoses, and clamps.', 24),
(4, 25, 'Diagnostic Scan (OBD-II)', 'Perform full system scan for stored codes.', 25),
-- 5. Undercarriage / Lift Inspection
(5, 26, 'Frame Chassis Condition', 'Check for bends, cracks or damage.', 26),
(5, 27, 'Exhaust System', 'Inspect rust, leaks, and hangers condition.', 27),
(5, 28, 'Suspension Components', 'Check for excessive play or visible damage.', 28),
(5, 29, 'Fuel Lines and Brake Lines', 'Inspect condition and secure mounting.', 29),
(5, 30, 'Visible Oil or Fluid Leaks', 'Inspect from underneath the vehicle.', 30),
-- 6. Interior & Electronics
(6, 31, 'Seats & Upholstery', 'Check for tears, stains, adjustability, and overall condition.', 31),
(6, 32, 'Dashboard & Controls', 'Inspect for cracks, wear, and proper function of all controls.', 32),
(6, 33, 'Electronics & Infotainment', 'Test radio, display screen, Bluetooth, USB, and navigation (if equipped).', 33),
(6, 34, 'A/C & Heat', 'Test temperature, fan speed, and airflow in all settings.', 34),
(6, 35, 'Power Features', 'Test windows, locks, mirrors, sunroof, and seat adjustments.', 35),
(6, 36, 'Warning Lights', 'Verify no warning lights on the dashboard at rest.', 36),
-- 7. Test Drive
(7, 37, 'Engine Performance', 'Check startup, idle, acceleration, and overall power.', 37),
(7, 38, 'Transmission Performance', 'Check smooth shifting, no slipping or hesitation.', 38),
(7, 39, 'Braking Performance', 'Test braking response, pedal feel, and ABS function.', 39),
(7, 40, 'Steering & Handling', 'Check for vibrations, pulling, or loose steering.', 40),
(7, 41, 'Suspension & Ride Quality', 'Listen for unusual noises over bumps and uneven roads.', 41),
(7, 42, 'Unusual Noises', 'Listen for rattles, clunks, squeaks, or grinding noises.', 42),
-- 8. Red Flags (Yes / No — Yes is bad)
(8, 43, 'Evidence of major accident or structural damage', null, 43),
(8, 44, 'Salvage, rebuilt, or branded title', null, 44),
(8, 45, 'Odometer rollback suspected', null, 45),
(8, 46, 'Engine or transmission issues detected', null, 46),
(8, 47, 'Flood damage or signs of water intrusion', null, 47),
(8, 48, 'Multiple warning lights or unresolved codes', null, 48)
on conflict (item_number) do update set
  label = excluded.label, description = excluded.description,
  section_id = excluded.section_id, sort_order = excluded.sort_order;

-- Remove the superseded broad checklist sections and the diagnostic/OBD section.
-- Detailed sections from migration 0006 remain as the active mechanical checklist.
delete from checklist_items where section_id in (3, 4, 5, 6, 7, 15);
delete from checklist_sections where id in (3, 4, 5, 6, 7, 15);

update checklist_sections set title = 'Exterior' where id = 2;
delete from checklist_items
where section_id = 2
  and label in ('Glass & Lights', 'Tires Condition', 'Wheels Rims', 'Spare Tire & Jack');

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
), numbered as (
  select e.*, (select coalesce(max(item_number), 0) from checklist_items) +
    row_number() over (order by e.sort_order) as item_number
  from exterior e
)
insert into checklist_items (section_id, item_number, label, description, sort_order)
select 2, item_number, label, null, sort_order from numbered;
