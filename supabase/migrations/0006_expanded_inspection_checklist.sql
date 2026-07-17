-- Add the client-supplied detailed inspection rows without changing historical
-- checklist results. Status rows use the existing OK / Needs Attention / Critical UI.
insert into checklist_sections (id, title, emoji_icon, sort_order, kind) values
  (9,  'Wheels and Tyres', 'circle-dot', 9,  'status'),
  (10, 'Engine Bay', 'cog', 10, 'status'),
  (11, 'Underbody, Steering & Suspension', 'wrench', 11, 'status'),
  (12, 'Braking System', 'circle-stop', 12, 'status'),
  (13, 'Interior and Electrical', 'armchair', 13, 'status'),
  (14, 'Road Test', 'gauge', 14, 'status'),
  (15, 'Diagnostic Scan', 'scan', 15, 'status')
on conflict (id) do update set
  title = excluded.title,
  emoji_icon = excluded.emoji_icon,
  sort_order = excluded.sort_order,
  kind = excluded.kind;

with supplied(section_id, labels) as (
  values
    (9, array[
      'Front left tyre condition', 'Front right tyre condition', 'Rear left tyre condition', 'Rear right tyre condition',
      'Spare tyre condition', 'Front left wheel/rim condition', 'Front right wheel/rim condition', 'Rear left wheel/rim condition',
      'Rear right wheel/rim condition', 'Wheel nuts secure', 'Tyre pressure', 'Sidewall damage', 'Wheel bearing noise/play',
      'Valve stems/caps', 'Jack present', 'Wheel brace & tools', 'TPMS warning light (if fitted)', 'Overall wheels & tyres condition'
    ]::text[]),
    (10, array[
      'Engine oil level', 'Engine oil condition', 'Coolant level', 'Coolant condition', 'Brake fluid level', 'Brake fluid condition',
      'Power steering fluid (if fitted)', 'Washer bottle level', 'Battery condition', 'Battery terminals', 'Battery secure',
      'Drive belts condition', 'Belt tension', 'Radiator condition', 'Radiator cap', 'Coolant hoses', 'Heater hoses', 'Vacuum hoses',
      'Fuel lines', 'Air intake system', 'Air filter condition', 'Engine mounts', 'Engine noise at idle', 'Oil leaks', 'Coolant leaks',
      'Fuel leaks', 'Vacuum leaks', 'Exhaust leaks (engine bay)', 'Turbocharger (if fitted)', 'Wiring condition', 'Wiring modifications',
      'Engine covers secure', 'ECU fault lights', 'Engine start-up', 'Engine idle quality', 'Excessive engine vibration',
      'Engine smoke on start-up', 'Engine bay cleanliness', 'Signs of poor repairs', 'Overall engine bay condition'
    ]::text[]),
    (11, array[
      'Engine oil leaks (underbody)', 'Transmission leaks', 'Differential leaks (if fitted)', 'Transfer case leaks (4WD/AWD)',
      'Driveshaft condition', 'CV boots', 'CV joints', 'Steering rack', 'Steering rack boots', 'Tie rod ends', 'Ball joints',
      'Control arms', 'Control arm bushes', 'Sway bar links', 'Sway bar bushes', 'Shock absorbers', 'Struts', 'Coil springs',
      'Leaf springs (if fitted)', 'Suspension bushes', 'Chassis condition', 'Subframe condition', 'Floor pan damage', 'Underbody rust',
      'Underbody impact damage', 'Exhaust system', 'Exhaust mounts', 'Catalytic converter', 'Heat shields', 'Fuel tank condition',
      'Fuel lines', 'Brake lines', 'Handbrake cables', 'Steering operation', 'Suspension noise', 'Chassis repairs',
      'Underbody modifications', 'Splash shields', 'Overall underbody condition', 'Overall steering & suspension condition'
    ]::text[]),
    (12, array[
      'Front brake pads', 'Rear brake pads', 'Front brake discs/rotors', 'Rear brake discs/rotors', 'Brake calipers', 'Brake hoses',
      'Brake pipes', 'Brake fluid leaks', 'Brake booster operation', 'Master cylinder', 'ABS warning light', 'ABS operation (road test)',
      'Electronic parking brake (if fitted)', 'Handbrake operation', 'Brake pedal feel', 'Brake pedal travel', 'Brake noise',
      'Brake vibration', 'Brake warning lights', 'Overall braking performance', 'Overall braking system condition'
    ]::text[]),
    (13, array[
      'Driver seat condition', 'Front passenger seat condition', 'Rear seat condition', 'Seat adjustment operation', 'Seat rails',
      'Headrests', 'Seat belts', 'Seat belt buckles', 'Child restraint anchor points', 'Interior trim', 'Door trims',
      'Dashboard condition', 'Centre console', 'Carpets', 'Roof lining', 'Sun visors', 'Interior mirrors', 'Interior lights',
      'Cabin cleanliness', 'Cigarette lighter / 12V socket', 'USB ports', 'Instrument cluster', 'Odometer display', 'Warning lights',
      'Horn operation', 'Steering wheel condition', 'Steering wheel controls', 'Cruise control', 'Air conditioning', 'Heater operation',
      'Fan speeds', 'Air vents', 'Demister', 'Power windows', 'Window lock switch', 'Central locking', 'Remote key/fob', 'Spare key',
      'Electric mirrors', 'Mirror folding (if fitted)', 'Audio system', 'Speakers', 'Bluetooth connectivity',
      'Apple CarPlay / Android Auto', 'Navigation system (if fitted)', 'Reverse camera', 'Parking sensors', 'Interior accessories',
      'Dash warning messages', 'Airbag warning light', 'SRS system', 'Immobiliser operation', 'Keyless entry (if fitted)',
      'Push-button start (if fitted)', 'Electric handbrake switch', 'Interior odours', 'Signs of water leaks',
      'Signs of flood damage', 'Signs of smoking', 'Overall interior condition', 'Overall electrical system condition'
    ]::text[]),
    (14, array[
      'Engine starts easily', 'Cold start performance', 'Engine idle during warm-up', 'Engine acceleration', 'Engine power',
      'Engine misfire', 'Engine noises', 'Exhaust smoke', 'Automatic transmission operation', 'Manual clutch operation (if fitted)',
      'Gear shifting performance', 'Steering response', 'Steering vibration', 'Steering noise', 'Vehicle tracks straight',
      'Suspension comfort', 'Suspension noises', 'Brake effectiveness', 'Brake vibration', 'Brake noise', 'Handbrake operation',
      'ABS operation', 'Cruise control', 'Air conditioning while driving', 'Engine operating temperature',
      'Warning lights during road test', 'Speedometer operation', 'Instrument gauges', 'AWD/4WD operation (if fitted)',
      'Vehicle vibrations', 'Wheel bearing noise', 'Wind noise', 'Driveline noise', 'Overall driving performance', 'Overall road test result'
    ]::text[]),
    (15, array[
      'Engine Control Module (ECM)', 'Transmission Control Module (TCM)', 'ABS System', 'SRS/Airbag System',
      'Body Control Module', 'AWD/4WD Module', 'HVAC System', 'Parking Assist System', 'TPMS System',
      'Stored Diagnostic Trouble Codes', 'Pending Trouble Codes', 'Permanent Trouble Codes', 'System Communication',
      'Live Data Check', 'Overall Scan Result'
    ]::text[])
),
expanded as (
  select section_id, label, ordinal::int as sort_order
  from supplied cross join lateral unnest(labels) with ordinality as item(label, ordinal)
),
missing as (
  select distinct on (lower(regexp_replace(e.label, '[^a-z0-9]+', '', 'g'))) e.*
  from expanded e
  where not exists (
    select 1
    from checklist_items existing
    where lower(regexp_replace(existing.label, '[^a-z0-9]+', '', 'g')) =
          lower(regexp_replace(e.label, '[^a-z0-9]+', '', 'g'))
  )
  order by lower(regexp_replace(e.label, '[^a-z0-9]+', '', 'g')), section_id, sort_order
),
numbered as (
  select m.*, (select coalesce(max(item_number), 0) from checklist_items) +
    row_number() over (order by section_id, sort_order) as item_number
  from missing m
)
insert into checklist_items (section_id, item_number, label, description, sort_order)
select section_id, item_number, label, null, sort_order
from numbered;
