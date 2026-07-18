alter table vehicles
  add column if not exists body_type text
  check (body_type is null or body_type in (
    'suv', 'truck', 'dual_cab_ute', 'hatchback', 'sedan',
    'single_cab_ute', 'van', 'wagon'
  ));
