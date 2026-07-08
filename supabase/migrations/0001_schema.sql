-- ============ EXTENSIONS ============
create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";       -- fuzzy search on names/plates

-- ============ ENUMS ============
create type inspection_status as enum ('draft', 'completed');
create type item_result       as enum ('pass', 'fail', 'na', 'repair');
create type recommendation    as enum ('recommended', 'recommended_with_repairs', 'not_recommended');

-- ============ PROFILES ============
-- 1:1 with auth.users; created by trigger on signup.
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  company_name text not null default '',
  phone        text,
  created_at   timestamptz not null default now()
);

-- security definer + pinned search_path: auth triggers run under the
-- supabase_auth_admin role whose search_path does not include public.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============ CLIENTS (car owners) ============
create table clients (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  email      text not null,
  phone      text,
  address    text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index clients_name_trgm  on clients using gin (full_name gin_trgm_ops);
create index clients_email_idx  on clients (lower(email));

-- ============ VEHICLES ============
create table vehicles (
  id                 uuid primary key default gen_random_uuid(),
  registration_plate text,                     -- normalized: upper, no spaces
  chassis_number     text,
  vin                text,
  make               text not null,
  model              text not null,
  year               int  check (year between 1900 and 2100),
  colour             text,
  engine_size        text,
  transmission       text,                     -- 'Automatic' | 'Manual' | 'CVT' | 'DCT' | other
  fuel_type          text,                     -- 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric' | 'LPG'
  drive_type         text,                     -- 'FWD' | 'RWD' | 'AWD' | '4WD'
  created_by         uuid references profiles(id),
  created_at         timestamptz not null default now(),
  constraint vehicle_has_identifier check (
    registration_plate is not null or chassis_number is not null or vin is not null
  )
);
-- Fast exact lookup on any identifier (normalized in app layer before insert/search):
create unique index vehicles_plate_uq   on vehicles (registration_plate) where registration_plate is not null;
create unique index vehicles_chassis_uq on vehicles (chassis_number)     where chassis_number is not null;
create unique index vehicles_vin_uq     on vehicles (vin)                where vin is not null;
create index vehicles_plate_trgm on vehicles using gin (registration_plate gin_trgm_ops);

-- ============ CHECKLIST DEFINITION (seed data) ============
create table checklist_sections (
  id         serial primary key,
  title      text not null,                    -- 'Exterior', 'Wheels & Tyres', …
  emoji_icon text not null default '',         -- icon name used by the app UI
  sort_order int  not null
);

create table checklist_items (
  id          serial primary key,
  section_id  int  not null references checklist_sections(id),
  item_number int  not null unique,            -- 1..220 (202 skipped)
  label       text not null,
  sort_order  int  not null
);
create index checklist_items_section_idx on checklist_items (section_id, sort_order);

-- ============ INSPECTIONS ============
create table inspections (
  id              uuid primary key default gen_random_uuid(),
  vehicle_id      uuid not null references vehicles(id),
  client_id       uuid not null references clients(id),
  inspector_id    uuid not null references profiles(id),
  status          inspection_status not null default 'draft',
  -- snapshot fields (change per visit):
  odometer_km     int,
  seller          text,
  purchase_price  numeric(12,2),
  -- outcome:
  overall_rating  int check (overall_rating between 1 and 5),
  recommendation  recommendation,
  inspector_notes text,
  signature_path  text,                        -- storage path of signature PNG
  pdf_path        text,                        -- storage path of generated report
  email_sent_at   timestamptz,
  -- wizard bookkeeping:
  current_step    int not null default 1,      -- resume point for drafts
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index inspections_vehicle_idx   on inspections (vehicle_id, created_at desc);
create index inspections_drafts_idx    on inspections (inspector_id, status) where status = 'draft';

-- updated_at maintenance
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger inspections_touch before update on inspections
  for each row execute function touch_updated_at();

-- Immutability: completed inspections only allow pdf_path / email_sent_at updates
create or replace function guard_completed_inspection() returns trigger language plpgsql as $$
begin
  if old.status = 'completed' and (
       new.vehicle_id      is distinct from old.vehicle_id
    or new.client_id       is distinct from old.client_id
    or new.overall_rating  is distinct from old.overall_rating
    or new.recommendation  is distinct from old.recommendation
    or new.inspector_notes is distinct from old.inspector_notes
    or new.signature_path  is distinct from old.signature_path
    or new.status          is distinct from old.status
  ) then
    raise exception 'completed inspections are immutable';
  end if;
  return new;
end $$;
create trigger inspections_guard before update on inspections
  for each row execute function guard_completed_inspection();

-- ============ RESULTS (one row per answered item) ============
create table inspection_results (
  inspection_id uuid not null references inspections(id) on delete cascade,
  item_id       int  not null references checklist_items(id),
  result        item_result not null,
  note          text,
  primary key (inspection_id, item_id)
);

-- ============ PHOTOS ============
create table inspection_photos (
  id            uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references inspections(id) on delete cascade,
  storage_path  text not null,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now()
);
create index photos_inspection_idx on inspection_photos (inspection_id, sort_order);
-- Max 12 photos enforced by trigger:
create or replace function enforce_photo_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from inspection_photos where inspection_id = new.inspection_id) >= 12 then
    raise exception 'maximum 12 photos per inspection';
  end if;
  return new;
end $$;
create trigger photos_limit before insert on inspection_photos
  for each row execute function enforce_photo_limit();
