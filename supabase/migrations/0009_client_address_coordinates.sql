alter table clients
  add column if not exists address_latitude double precision,
  add column if not exists address_longitude double precision,
  add constraint clients_address_latitude_range check (address_latitude between -90 and 90),
  add constraint clients_address_longitude_range check (address_longitude between -180 and 180);
