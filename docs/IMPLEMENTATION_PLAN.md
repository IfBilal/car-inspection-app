# Car Inspection App — Full End-to-End Implementation Plan

> **Status:** planning document — no code exists yet.
> **Companion docs:** [`PLAN.md`](PLAN.md) (high-level agreement), [`CHECKLIST.md`](CHECKLIST.md) (all 220 checklist items).
> **Important:** the prototype screenshots in this folder are **functionality inspiration only**. The UI we build is a from-scratch premium design — see Part 4 (Design System) and Part 5 (Screens).

---

## Table of contents

- **Part 1 — Product definition**: goals, users, user journeys
- **Part 2 — Architecture & stack**: packages, repo structure, environments
- **Part 3 — Database**: full schema SQL, RLS, storage, seed strategy
- **Part 4 — Design system**: colors, typography, spacing, components, motion
- **Part 5 — Screens**: every screen, spec'd in detail

- **Part 6 — Navigation & routing**: expo-router file map
- **Part 7 — Data layer & state**: queries, mutations, draft autosave engine
- **Part 8 — Server side**: `send-report` Edge Function, PDF layout, email
- **Part 9 — Validation, errors, empty states**
- **Part 10 — Security**
- **Part 11 — Performance**
- **Part 12 — Testing & verification**
- **Part 13 — Build, release & store submission**
- **Part 14 — Milestones & build order**
- **Part 15 — Acceptance criteria (definition of done)**

---

# Part 1 — Product definition

## 1.1 One-line pitch

A mobile tool for vehicle inspection businesses: register a car, run a 220-point inspection with photos on the phone, and the client automatically receives a polished PDF report by email — with every inspection permanently searchable by plate, chassis, or VIN.

## 1.2 Users

- **Primary:** mechanics / inspectors at a car inspection company. They may be non-technical; big touch targets and an "impossible to get lost" flow matter more than feature density.
- **Secondary (indirect):** the car owner (client). They never open the app; their entire experience is **the PDF report in their inbox**, so the PDF is a first-class product surface, not an afterthought.

## 1.3 Core user journeys

### Journey A — brand new car walks in
1. Mechanic opens app → already logged in (session persisted).
2. Taps **New Inspection**.
3. Fills client details (name, email, phone, address) — or picks an existing client via type-ahead.
4. Fills vehicle details (make, model, year, colour, VIN, chassis, plate, odometer, transmission, fuel, engine size, drive type, seller, price).
5. Sweeps through 7 checklist sections, tapping P / F / NA / R per item, adding notes on failures.
6. Adds up to 12 photos (camera or gallery).
7. Summary: star rating, recommendation, final notes, draws signature.
8. Taps **Submit** → success screen → client gets the PDF by email within ~30 seconds.

### Journey B — returning car
1. Taps **Find Vehicle** on home.
2. Enters plate (or chassis or VIN) → vehicle card appears with full inspection history.
3. Opens any past inspection read-only, or starts a **new inspection for this car** with vehicle + client details pre-filled.

### Journey C — interrupted inspection
1. Mid-inspection, mechanic gets pulled away; everything typed so far is already auto-saved as a **draft** on the server.
2. Later (any device, same account pool), home screen shows the draft under **Continue inspection** → resumes exactly where they left off.

### Journey D — re-send a report
1. Client says "I never got the email."
2. Mechanic finds the vehicle → opens the completed inspection → taps **Re-send report** → done. Can also view the PDF in-app and share it via the native share sheet (WhatsApp, etc.).

## 1.4 Explicitly out of scope for v1

- Offline mode / local-first sync (online-only, decided).
- Client-facing portal or app.
- Payments/invoicing.
- Multi-company data separation (single shared pool, decided).
- Government defect-clearance flows ("Defect Inspection" from the prototype — dropped).
- Per-item photos (one pool of 12 per inspection, decided).

---

# Part 2 — Architecture & stack

## 2.1 High-level architecture

```
┌─────────────────────────────┐
│  Expo app (iOS + Android)   │
│  expo-router · TypeScript   │
│  React Query · Zustand      │
└──────────────┬──────────────┘
               │ supabase-js (HTTPS)
┌──────────────▼──────────────┐
│          Supabase           │
│  ┌───────────────────────┐  │
│  │ Postgres (schema §3)  │  │
│  │ Auth (email/password) │  │
│  │ Storage: photos,      │  │
│  │   signatures, reports │  │
│  │ Edge Fn: send-report  │──┼──▶ SMTP (nodemailer) ──▶ client's inbox
│  └───────────────────────┘  │
└─────────────────────────────┘
```

## 2.2 Key packages (mobile)

| Package | Purpose |
|---|---|
| `expo` (SDK latest stable) | Base platform, managed workflow |
| `expo-router` | File-based navigation, typed routes |
| `@supabase/supabase-js` | DB/auth/storage client |
| `@tanstack/react-query` | Server state: caching, retries, mutation lifecycle |
| `zustand` | Tiny local state (wizard in-memory buffer before autosave flush) |
| `react-hook-form` + `zod` | Forms + schema validation shared with API layer |
| `expo-image-picker` + `expo-camera` | Photo capture/selection |
| `expo-image` | Fast cached image rendering (photo grid) |
| `react-native-signature-canvas` | Signature pad (webview-based, outputs PNG base64) |
| `expo-secure-store` | Supabase session persistence (secure) |
| `expo-haptics` | Tactile feedback on checklist taps |
| `react-native-reanimated` | Micro-animations (checklist rows, progress ring, transitions) |
| `expo-linear-gradient` | Hero surfaces, button sheens |
| `@expo-google-fonts/inter` (or `general-sans` via expo-font) | Typography (§4.3) |
| `expo-sharing` + `expo-file-system` | Download/share PDF from inspection detail |
| `sonner-native` (or custom) | Toasts |

Server side (Edge Function, Deno runtime): `pdf-lib`, `nodemailer` (via `npm:` specifier), `@supabase/supabase-js` (service role).

## 2.3 Repo structure

```
car-inspection/
├── docs/                          # this plan, PLAN.md, CHECKLIST.md, prototype refs
├── mobile/
│   ├── app/                       # expo-router routes (see Part 6)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # design-system primitives: Button, Input, Card,
│   │   │   │                      #   Chip, Sheet, Toast, Stars, ProgressRing, Skeleton
│   │   │   ├── checklist/         # SectionCard, ItemRow, ResultSegment, SectionProgress
│   │   │   ├── photos/            # PhotoGrid, PhotoTile, CameraSheet
│   │   │   ├── vehicle/           # VehicleCard, VehicleForm, PlateBadge
│   │   │   ├── client/            # ClientForm, ClientPicker
│   │   │   └── signature/         # SignaturePad, SignaturePreview
│   │   ├── lib/
│   │   │   ├── supabase.ts        # client init + SecureStore adapter
│   │   │   ├── queries.ts         # React Query hooks (useVehicleSearch, useInspection…)
│   │   │   ├── mutations.ts       # create/update/submit hooks
│   │   │   ├── autosave.ts        # debounced draft autosave engine (§7.4)
│   │   │   ├── validation.ts      # zod schemas (client, vehicle, summary)
│   │   │   └── types.ts           # DB row types (generated via supabase gen types)
│   │   ├── theme/
│   │   │   ├── tokens.ts          # colors, spacing, radii, type scale (§4)
│   │   │   └── ThemeProvider.tsx
│   │   └── store/
│   │       └── wizard.ts          # zustand wizard buffer
│   ├── assets/                    # icon, splash, fonts
│   ├── app.json / eas.json
│   └── package.json
└── supabase/
    ├── migrations/
    │   ├── 0001_schema.sql
    │   ├── 0002_rls.sql
    │   └── 0003_storage.sql
    ├── seed.sql                   # 7 sections + 219 checklist items
    ├── functions/
    │   └── send-report/
    │       ├── index.ts           # handler: fetch → PDF → upload → email
    │       ├── pdf.ts             # report renderer (pdf-lib) (§8.3)
    │       └── email.ts           # nodemailer transport + template (§8.4)
    └── config.toml
```

## 2.4 Environments & secrets

- **Local dev:** `supabase start` (local stack) or a dedicated `car-inspection-dev` Supabase project; Expo Go / dev client on device.
- **Production:** `car-inspection-prod` Supabase project; EAS builds pointing at prod URL.
- Mobile env (public, baked into build via `app.config.ts` → `expo-constants`):
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Edge Function secrets (set with `supabase secrets set`, never in repo):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (email + app password, per client), `SMTP_FROM_NAME`, `SMTP_FROM_ADDRESS`
  - `SUPABASE_SERVICE_ROLE_KEY` (auto-provided in Edge runtime)
- `.env.example` committed; real `.env` git-ignored.

---

# Part 3 — Database

## 3.1 Design principles

- **Checklist is data, not code.** The app renders whatever is in `checklist_sections` / `checklist_items`. Changing wording or adding an item is a DB update, not an app release.
- **Inspections are immutable once completed.** Drafts are mutable; on submit, status flips to `completed` and the app never edits them again (enforced by a DB trigger).
- **Vehicles and clients are shared entities** with history. A vehicle found by plate shows every inspection ever done on it, regardless of which account created it.
- **Snapshot what matters at inspection time.** Odometer, seller, price live on the inspection (they change per visit), while make/model/VIN live on the vehicle.

## 3.2 Full schema (migration `0001_schema.sql`)

```sql
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

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name)
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
```

## 3.3 RLS policies (migration `0002_rls.sql`)

Shared-pool model: **any authenticated user can read and write everything; anonymous users get nothing.** Immutability of completed inspections is enforced by the trigger above, not RLS.

```sql
alter table profiles           enable row level security;
alter table clients            enable row level security;
alter table vehicles           enable row level security;
alter table checklist_sections enable row level security;
alter table checklist_items    enable row level security;
alter table inspections        enable row level security;
alter table inspection_results enable row level security;
alter table inspection_photos  enable row level security;

-- Checklist definition: read-only for the app (writes only via service role / dashboard)
create policy "read checklist sections" on checklist_sections for select to authenticated using (true);
create policy "read checklist items"    on checklist_items    for select to authenticated using (true);

-- Profiles: everyone can read (inspector names on reports); users edit only their own
create policy "read profiles"  on profiles for select to authenticated using (true);
create policy "update own profile" on profiles for update to authenticated using (id = auth.uid());

-- Shared pool for business data:
create policy "all clients"     on clients            for all to authenticated using (true) with check (true);
create policy "all vehicles"    on vehicles           for all to authenticated using (true) with check (true);
create policy "all inspections" on inspections        for all to authenticated using (true) with check (true);
create policy "all results"     on inspection_results for all to authenticated using (true) with check (true);
create policy "all photos"      on inspection_photos  for all to authenticated using (true) with check (true);
```

## 3.4 Storage buckets (migration `0003_storage.sql`)

| Bucket | Contents | Access |
|---|---|---|
| `inspection-photos` | JPEGs, path `inspections/{inspection_id}/{uuid}.jpg`, client-side resized to ≤1600px, ~80% quality | authenticated read/write |
| `signatures` | PNGs, path `inspections/{inspection_id}/signature.png` | authenticated read/write |
| `reports` | PDFs, path `inspections/{inspection_id}/report.pdf` | authenticated read; **write only by service role** (Edge Function) |

App displays images via short-lived signed URLs (1 hour), generated on demand.

## 3.5 Seed data (`seed.sql`)

- Insert the 7 sections with icons: Exterior (`car`), Wheels & Tyres (`disc`), Engine Bay (`cog`), Underbody (`wrench`), Brakes (`octagon`), Interior & Electrical (`armchair`), Test Drive & Performance (`gauge`).
- Insert all **219 readable items** from [`CHECKLIST.md`](CHECKLIST.md) with their original `item_number` (1–220, skipping 202) so the app and PDF show the same numbering as the paper form.
- Seed is idempotent (`on conflict (item_number) do update set label = excluded.label`), so wording fixes are re-runnable.

## 3.6 Type generation

`supabase gen types typescript` → `mobile/src/lib/types.ts`, regenerated whenever migrations change; all queries typed end-to-end.

# Part 4 — Design system ("premium, locked-in UI")

The screenshots in `docs/` are **not** the design reference. The design target: the app should feel like a modern fintech/professional tool (think Linear, Mercury, Stripe dashboards translated to mobile) — calm surfaces, one confident green accent, generous whitespace, crisp typography, tactile feedback on every interaction. A mechanic should *feel* the quality in the first five seconds.

## 4.1 Design principles

1. **One accent, used sparingly.** Green appears on primary actions, active states, and "pass" semantics — never as large background floods. Premium feel comes from restraint.
2. **Cards on canvas.** A soft off-white canvas with white elevated cards (subtle borders + faint shadows). No hard gray boxes, no default-blue headers.
3. **Big type, clear hierarchy.** Every screen has exactly one obvious title and one obvious primary action.
4. **Everything responds.** Press states scale to 0.97 with a spring, checklist taps tick with haptics, progress animates. Nothing snaps or jumps.
5. **Glove-friendly.** Minimum touch target 48×48. The checklist is operable with a thumb while holding a phone one-handed next to an open bonnet.
6. **Light mode first-class; dark mode supported** from day one via tokens (mechanics work in dark garages).

## 4.2 Color tokens

```ts
// theme/tokens.ts  (light  /  dark)
const colors = {
  // Brand — green, deep and confident (not the prototype's lime)
  primary:        '#16A34A',  /  '#22C55E',   // actions, active states
  primaryPressed: '#15803D',  /  '#16A34A',
  primarySoft:    '#DCFCE7',  /  '#14532D33', // tinted chips/backgrounds
  primaryText:    '#14532D',  /  '#BBF7D0',   // text on primarySoft

  // Canvas & surfaces
  canvas:         '#F7F8F7',  /  '#0C0F0D',   // app background (faint green-gray cast)
  surface:        '#FFFFFF',  /  '#161A17',   // cards
  surfaceRaised:  '#FFFFFF',  /  '#1D231F',   // sheets, modals
  border:         '#E6E9E6',  /  '#2A322C',
  divider:        '#EFF1EF',  /  '#222824',

  // Text
  textPrimary:    '#171D19',  /  '#F2F5F2',
  textSecondary:  '#5C665F',  /  '#A7B0A9',
  textTertiary:   '#8B948D',  /  '#6E776F',
  textOnPrimary:  '#FFFFFF',  /  '#052E12',

  // Semantic (checklist results + system states)
  pass:           '#16A34A',  /  '#22C55E',
  fail:           '#DC2626',  /  '#F87171',
  repair:         '#D97706',  /  '#FBBF24',   // amber — "attention required"
  na:             '#8B948D',  /  '#6E776F',   // neutral gray
  info:           '#2563EB',  /  '#60A5FA',
  // soft tinted backgrounds for each: passSoft, failSoft, repairSoft, naSoft
};
```

Rule: semantic colors are the **only** place red/amber appear. Star rating uses `#F59E0B` gold.

## 4.3 Typography

Font: **Inter** (variable) — neutral, extremely legible at small sizes, professional. Numeric tables in the PDF and odometer inputs use tabular figures.

| Token | Size / line height / weight | Used for |
|---|---|---|
| `display` | 32 / 38 / 700 | Auth title, success screen |
| `title1` | 24 / 30 / 700 | Screen titles |
| `title2` | 20 / 26 / 600 | Card titles, section headers |
| `body` | 16 / 24 / 400 | Default text, inputs |
| `bodyStrong` | 16 / 24 / 600 | Checklist item labels, button labels |
| `caption` | 13 / 18 / 500 | Field labels, meta, timestamps |
| `micro` | 11 / 14 / 600, +0.5 tracking, uppercase | Badges, section eyebrows |

## 4.4 Spacing, radii, elevation

- Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40. Screen gutter: **20**. Card padding: **16–20**.
- Radii: inputs & buttons **14**, cards **20**, sheets **28** (top corners), photo tiles **12**, full-round for chips/avatars.
- Elevation: cards get `borderWidth 1, borderColor border` + shadow `(0, 2, 8, rgba(23,29,25,0.06))`. Sheets/modals: `(0, 8, 28, rgba(23,29,25,0.16))`. Never harsh Android default elevation.

## 4.5 Core components (`src/components/ui/`)

- **Button** — variants: `primary` (green fill, white bold label, 52px tall), `secondary` (surface + border), `ghost` (text-only), `destructive` (fail-red fill, only for "discard draft"). States: pressed (scale 0.97 spring + darker fill), loading (label fades, spinner in place — width unchanged), disabled (40% opacity). Optional leading icon.
- **Input** — 52px, surface bg, 14 radius, 1px border; focus = primary border + soft green glow ring; error = fail border + 13px message below; floating-free (label above, caption style). Support prefixes (e.g. `KM`), `autoCapitalize="characters"` for plates/VIN.
- **Card** — surface, radius 20, optional `onPress` with scale press state.
- **Chip / Badge** — capsule, soft tinted backgrounds (`primarySoft`, `failSoft`…); used for status (Draft, Completed), result counts, filters.
- **ResultSegment** — *the* signature control (§5.6): 4-segment P / F / NA / R selector per checklist item.
- **Stars** — 5 tappable stars, 36px, gold fill with spring pop animation on select.
- **ProgressRing** — animated circular progress (checklist completion %); also a linear **StepBar** for the wizard header.
- **Sheet** — bottom sheet (detents), used for photo source picker, item notes, confirmations.
- **Toast** — top-floating pill, icon + message, auto-dismiss 3s; success/error variants.
- **Skeleton** — shimmering placeholders matching each list's exact layout (never spinners for lists).
- **EmptyState** — centered illustration-ish icon in a soft green circle, title, sub-line, optional action button.
- **ListRow** — pressable row with title/subtitle/right accessory, used in history and drafts.

## 4.6 Motion & haptics

- Screen transitions: expo-router defaults (iOS push, Android fade-through); wizard steps slide horizontally with a 250ms ease-out.
- Checklist row tap: selected segment springs (scale 1 → 1.08 → 1), row background flashes soft tint 200ms, `Haptics.selectionAsync()`.
- Submit success: full-screen with an animated draw-on checkmark circle (Reanimated stroke animation, ~600ms) + `notificationAsync(Success)`.
- All layout changes (rows expanding for notes, photos added) use `LinearTransition` springs — nothing jumps.

## 4.7 Iconography & app identity

- Icon set: **Lucide** (via `lucide-react-native`) — consistent 1.5px stroke, matches the clean aesthetic.
- App icon: rounded-square deep-green (`#14532D`) with a white checkmark-inside-shield glyph; splash: canvas color with centered logo. (Placeholder until client branding arrives — easy swap, per client.)

---

# Part 5 — Screens (full spec)

Conventions: every screen uses `canvas` background, 20px gutters, safe-area aware. "Primary CTA" = full-width primary Button pinned above the keyboard/safe-area. All lists use skeletons while loading and EmptyState when empty.

## 5.1 Login

**Route:** `/(auth)/login`

- Layout: top third = brand block — app logo mark (40px) + app name in `display`, sub-line in `textSecondary` ("Vehicle inspections, done properly."). Bottom two-thirds = form card.
- Fields: Email (keyboard `email-address`, autocomplete), Password (secure, eye toggle).
- Primary CTA: **Log in**. Below: `ghost` link **Forgot password?** and a bottom line: "New here? **Create an account**".
- Behavior: button loading state during auth; on error, toast "Wrong email or password" + shake animation on the card (subtle, 3 oscillations); on success → replace to `/home`.
- Session persisted via SecureStore → subsequent launches skip login (splash → home directly).

## 5.2 Create account (Enrol)

**Route:** `/(auth)/register`

- Fields: Full name, Company name (optional), Email, Password (with live strength hint: min 8 chars), Confirm password.
- zod-validated on blur; primary CTA **Create account**.
- On success: profile row auto-created by DB trigger; straight into `/home` (no email-confirmation gate for v1 — Supabase "confirm email" disabled; revisit post-launch).

## 5.3 Forgot password

**Route:** `/(auth)/forgot`

- Single email field + CTA **Send reset link**; success state swaps the form for an EmptyState-style confirmation ("Check your inbox"). Uses Supabase `resetPasswordForEmail` with a deep link back into the app (`carinspect://reset`) → reset screen with new-password fields.

## 5.4 Home

**Route:** `/home` (default after auth)

- **Header row:** left — "Good morning, {firstName}" (`caption`, textSecondary) over company name (`title1`); right — circular avatar button (initials on `primarySoft`) → profile/settings.
- **Action block:** two large cards side-by-side (49% width each, height ~120):
  - **New Inspection** — primary-green card (the one allowed green flood, with a subtle darker-green gradient), white `plus-circle` icon + label.
  - **Find Vehicle** — surface card, green `search` icon in soft circle + label.
- **Continue inspection** section (only if the user has drafts): horizontal cards — vehicle make/model + plate badge, client name, ProgressRing with "{answered}/{220}", "Updated 2h ago". Tap → resumes wizard at `current_step`. Long-press → sheet with **Discard draft** (destructive confirm).
- **Recent inspections** section: last 10 completed (pool-wide), ListRows — left: vehicle + plate chip; middle: client name + date; right: recommendation chip (green/amber/red). Tap → inspection detail.
- Pull-to-refresh. Empty state (first run): "No inspections yet — start your first one" + CTA.

## 5.5 Find Vehicle (search)

**Route:** `/search`

- Search field autofocused, `characters` capitalization, with an inline segmented hint: **Plate · Chassis · VIN** (auto-detects: 17 alphanumerics → VIN; otherwise matches against all three columns, normalized upper/no-spaces).
- Results appear live (300ms debounce, trigram-backed) as VehicleCards: make model year, plate badge (styled like a license plate: bordered capsule, mono-ish bold), colour dot, "{n} inspections · last {date}".
- Tap result → **Vehicle profile** `/vehicle/[id]`:
  - Hero card: vehicle title (`title1`), plate badge, spec chips (year, colour, transmission, fuel, engine, drive).
  - Primary CTA: **New inspection for this vehicle** (pre-fills wizard: vehicle locked in, last client suggested).
  - **History** list: every inspection, newest first — date, inspector name, rating stars (small), recommendation chip, status chip if draft. Tap → detail.
- No results → EmptyState: "No vehicle found for 'ABC123'" + button **Register this vehicle** → starts wizard with the plate pre-filled.

## 5.6 Inspection wizard

**Route group:** `/inspection/[id]/…` — the draft row is created in the DB the moment the wizard opens (so autosave always has a target). A persistent **wizard header** across steps: back chevron, step title, StepBar (6 dots/segments), and a kebab menu (Save & exit · Discard draft).

### Step 1 — Client details (`/inspection/[id]/client`)
- Type-ahead on name/email over existing `clients` (dropdown of matches with avatar initials); picking one fills the form and links `client_id`; otherwise a new client row is created on step completion.
- Fields: Full name*, Email* (validated — this is where the report goes, so the field carries helper text "The PDF report will be sent here"), Phone, Address (multiline).
- CTA: **Continue** (disabled until name + valid email).

### Step 2 — Vehicle details (`/inspection/[id]/vehicle`)
- If arrived from a vehicle profile: fields pre-filled and identifier fields (plate/chassis/VIN) locked with a "linked vehicle" chip.
- Fields: Registration plate, Chassis number, VIN (at least one required — live cross-check: on blur, query for an existing vehicle with that identifier; if found, sheet: "This car is already registered — use it?" → links instead of duplicating), Make*, Model*, Year (numeric wheel-friendly), Colour, Engine size, Transmission / Fuel / Drive type (chip selectors, not dropdowns), Odometer (km, tabular numerals), Seller, Purchase price (optional).
- CTA: **Start checklist**.

### Step 3 — Checklist (`/inspection/[id]/checklist`)
The heart of the app; must be *fast*.

- **Section rail:** horizontally scrollable pinned bar of 7 section pills — icon + short name + mini progress ("18/25"); active pill filled green. Tapping scrolls to that section; the checklist itself is one continuous virtualized list (FlashList) with sticky section headers, so power users can also just swipe through.
- **Item row:** number (`micro`, tertiary) + label (`bodyStrong`, wraps to 2 lines) on the left; **ResultSegment** on the right or below on narrow screens: four 44px capsule segments — `P` (green), `F` (red), `NA` (gray), `R` (amber). Unselected: outline; selected: filled with white letter + spring pop + haptic.
- Selecting **F** or **R** expands the row (LayoutAnimation) with a one-line **note field** ("What's wrong?") + optional shortcut to jump to Photos. Note saves into `inspection_results.note`.
- **Bulk affordance per section header:** "Mark remaining as Pass" ghost button (with undo toast, 5s) — real inspectors pass 90% of items; this is the single biggest speed win.
- Progress: ProgressRing in the wizard header shows overall {answered}/219; sections show their own counts. Unanswered items are allowed at this step (validated at submit).
- Every result tap fires the autosave engine (§7.4) — leaving mid-section loses nothing.
- CTA (sticky): **Continue to photos** (always enabled; shows "{n} unanswered" caption if any).

### Step 4 — Photos (`/inspection/[id]/photos`)
- 3-column grid of 12 slots: filled tiles (expo-image, 12 radius, tap → full-screen viewer with zoom + delete) and one **Add** tile (dashed border, camera icon) while under 12.
- Add → bottom Sheet: **Take photo** (expo-camera, full-screen with capture button, stays open for rapid multi-shot) / **Choose from gallery** (multi-select up to remaining count).
- Each image: client-side resize to max 1600px @ 0.8 JPEG, uploads immediately with a per-tile progress ring overlay; failed upload shows retry badge on the tile.
- Counter "8/12" top-right. CTA: **Continue** (photos optional).

### Step 5 — Summary & sign-off (`/inspection/[id]/summary`)
- **Review strip:** compact cards for Client, Vehicle, and per-section result tallies (e.g. "Brakes — 17 P · 2 R · 1 F" with colored dot counts). Tapping a card jumps back to that step. If any items are unanswered, an amber banner: "{n} items unanswered — they'll be marked N/A" with a **Review** link (jumps to first unanswered).
- **Overall rating:** the 5 Stars control, big and centered.
- **Recommendation:** three stacked selectable cards — ✅ Recommended / 🛠 Recommended with repairs / ⛔ Not recommended (soft green/amber/red tints when selected).
- **Inspector notes:** multiline (this prints on the PDF's final page).
- **Signature:** card with dashed pad area, "Sign here" ghost text; opens full-screen landscape-friendly SignaturePad (clear / done). Preview renders inked signature; inspector name + date printed beneath, auto-filled from profile.
- CTA: **Submit inspection** — disabled until rating + recommendation + signature exist.

### Step 6 — Submit & success (`/inspection/[id]/done`)
- On submit: (1) unanswered items bulk-inserted as `na`; (2) status → `completed`, `completed_at` stamped; (3) Edge Function `send-report` invoked. Button shows staged loading text: "Saving… → Generating report… → Sending email…".
- **Success screen:** animated green checkmark, "Inspection complete", sub-line "Report sent to {client email}", then three buttons: **View PDF** (opens once ready), **Done** (→ home), ghost **Re-send email**.
- If the Edge Function fails (SMTP down etc.): inspection is still saved; screen shows an amber state "Saved — but the email didn't send" + **Retry sending** button. Data is never lost because PDF/email is decoupled from the DB write.

## 5.7 Inspection detail (read-only)

**Route:** `/inspections/[id]`

- Header card: vehicle + plate badge, client name, date, inspector, stars, recommendation chip.
- Tabs (segmented control): **Results** (the 7 sections, collapsed accordions showing tallies; expand to see each item with its colored result letter + note) · **Photos** (grid → viewer) · **Report** (embedded PDF preview).
- Action bar: **Re-send email** (confirm sheet, then invokes `send-report` with `resend: true`) · **Share PDF** (downloads via signed URL → native share sheet).
- Draft inspections opened here instead deep-link back into the wizard.

## 5.8 Profile / settings

**Route:** `/profile`

- Edit full name, company name, phone (prints on reports).
- Appearance: System / Light / Dark selector.
- **Log out** (confirm sheet). App version footer.

---

# Part 6 — Navigation & routing (expo-router)

```
app/
├── _layout.tsx              # ThemeProvider, QueryClientProvider, AuthGate, fonts, toasts
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot.tsx
│   └── reset.tsx            # deep-link target carinspect://reset
├── (app)/                   # requires session; redirect to /(auth)/login otherwise
│   ├── home.tsx
│   ├── search.tsx
│   ├── profile.tsx
│   ├── vehicle/[id].tsx
│   ├── inspections/[id].tsx # read-only detail
│   └── inspection/[id]/     # wizard (stack with slide transitions)
│       ├── client.tsx
│       ├── vehicle.tsx
│       ├── checklist.tsx
│       ├── photos.tsx
│       ├── summary.tsx
│       └── done.tsx
```

- **AuthGate** in root layout: listens to `supabase.auth.onAuthStateChange`, holds splash until the persisted session resolves, then routes to `(app)` or `(auth)`. No flicker of the wrong screen.
- Android hardware back inside the wizard: goes to previous step (never exits losing state — state is on the server anyway); on step 1, confirm sheet "Keep draft / Discard".

# Part 7 — Data layer & state

## 7.1 Layers

1. **Server state (React Query):** every read is a query hook; every write a mutation hook. Query keys: `['vehicleSearch', term]`, `['vehicle', id]`, `['inspection', id]`, `['inspectionResults', id]`, `['drafts', userId]`, `['recentInspections']`, `['checklist']` (staleTime `Infinity` — it changes ~never; cached across sessions with a persisted query cache).
2. **Wizard buffer (Zustand):** current in-memory answers/fields for instant UI (a checklist tap must render in <16ms, not wait for network). The buffer is the source for the UI; the autosave engine reconciles it to the server.
3. **No global app state beyond that.** Auth session lives in the Supabase client; theme in context.

## 7.2 Key query hooks

- `useVehicleSearch(term)` — debounced 300ms; normalizes term (upper, strip spaces); OR-matches plate/chassis/VIN; disabled under 2 chars.
- `useVehicleWithHistory(id)` — vehicle + inspections joined with client + inspector names.
- `useChecklist()` — sections with nested items, ordered.
- `useInspectionFull(id)` — inspection + client + vehicle + results + photos (single RPC or parallel queries).
- `useDrafts()` — current user's drafts for the home screen.
- `useClientSearch(term)` — type-ahead for wizard step 1.

## 7.3 Key mutations

- `useCreateDraft()` — inserts inspection row (status `draft`) + navigates into wizard.
- `useUpsertClient / useUpsertVehicle` — step completions; vehicle insert handles unique-identifier conflict by linking to the existing row (§5.6 step 2).
- `useSaveResult()` — upsert single `inspection_results` row (fired via autosave).
- `useBulkPass(sectionId)` — one upsert for all unanswered items in a section.
- `useUploadPhoto / useDeletePhoto` — storage upload + row insert; optimistic tile.
- `useSubmitInspection()` — the transaction described in §5.6 step 6; invalidates `['drafts']`, `['recentInspections']`, vehicle history.
- `useSendReport(id, {resend})` — `supabase.functions.invoke('send-report')`.

## 7.4 Draft autosave engine (`lib/autosave.ts`)

The wizard must survive interruption at any moment (Journey C) without ever blocking the UI.

- **Write path:** UI event → update Zustand buffer (instant render) → push change onto an in-memory **dirty queue** → debounce flush (800ms of quiet, or immediately on step change / app background via `AppState` listener).
- **Flush:** batches queue into grouped upserts (results in one bulk upsert, scalar fields in one `update inspections`). Marks `current_step`.
- **Failure handling:** flush failure keeps items queued, retries with backoff (1s/3s/9s), shows a quiet "Saving…" → "Couldn't save — retrying" pill in the wizard header (never a blocking modal). Explicit "Save & exit" forces a flush and confirms.
- **Resume:** opening a draft hydrates the Zustand buffer from `useInspectionFull`, routes to `current_step`.
- **Conflict policy:** last-write-wins (single-user editing in practice; two people editing one draft simultaneously is out of scope and harmless — worst case a result flips).

---

# Part 8 — Server side: `send-report` Edge Function

## 8.1 Contract

`POST /functions/v1/send-report` — body `{ inspection_id: string, resend?: boolean }`, caller must be authenticated (JWT verified). Steps:

1. Load inspection (must be `completed`) + client + vehicle + inspector profile + all results joined to item labels/sections + photo paths + signature, using the **service role** client.
2. If `pdf_path` exists and `resend` — skip regeneration, reuse the stored PDF.
3. Render PDF (§8.3), upload to `reports/inspections/{id}/report.pdf` (upsert).
4. Email it (§8.4). Stamp `pdf_path`, `email_sent_at`.
5. Respond `{ ok: true, pdf_path }` or a structured error `{ ok: false, stage: 'pdf'|'email', message }` so the app can show precise failure states.

Idempotent & safely re-invokable (retry button, re-send button).

## 8.2 Runtime notes

- Deno Edge runtime with `npm:nodemailer` and `npm:pdf-lib` imports.
- Fonts: embed Inter regular/semibold TTFs (bundled with the function) via `pdf-lib` + `@pdf-lib/fontkit`.
- Photos: fetched from storage, embedded as JPEG; capped total pages guard.

## 8.3 PDF report layout (the client-facing artifact — match the app's design language)

A4, generated page-by-page:

- **Page 1 — Cover / summary:**
  - Header band: company name + logo placeholder (deep green `#14532D` text on white, thin green rule), report title "Pre-Purchase Vehicle Inspection Report", report ID (short inspection id) + date.
  - Vehicle block: make model year in large type, plate / VIN / chassis, colour, odometer, transmission, fuel, engine, drive type — two-column label/value grid.
  - Client block: name, email, phone, address.
  - **Result hero:** overall star rating (drawn star glyphs, gold), recommendation as a colored capsule (green/amber/red), counts strip: "182 Passed · 6 Repair · 3 Failed · 28 N/A".
- **Pages 2–n — Checklist sections:** each of the 7 sections as a table: item number, label, result column with a colored letter chip (P green / F red / R amber / NA gray), note in italic gray beneath the label when present. Section header row with section tally. Zebra striping (very faint), repeat table header on page breaks.
- **Photos pages:** 2×3 grid per page, numbered captions.
- **Final page:** inspector notes (if any), then sign-off block — inspector name, embedded signature image, date — and the disclaimer paragraph in small gray type (placeholder wording until client supplies theirs).
- Footer on every page: "{company} · generated {date} · page x of y".

## 8.4 Email

- nodemailer SMTP transport from env secrets (host/port/user/app-password).
- Subject: `Vehicle Inspection Report — {year} {make} {model} ({plate})`.
- Body: clean minimal HTML (inline CSS only): company header, "Hi {client first name}", one-paragraph summary (vehicle, date, recommendation sentence), note that the full report is attached, company sign-off. Plain-text alternative included.
- Attachment: `Inspection-Report-{plate}-{date}.pdf`.
- Failures logged with stage + message; app surfaces "Saved, but email failed — retry" (§5.6).

---

# Part 9 — Validation, errors, empty states

- **Single source of validation:** zod schemas in `lib/validation.ts` — `clientSchema` (name ≥ 2 chars, RFC email), `vehicleSchema` (≥1 identifier, make/model required, year range, odometer ≥ 0), `summarySchema` (rating 1–5, recommendation, signature present). react-hook-form resolvers use them; the submit mutation re-checks them.
- **Identifier normalization:** one utility (`normalizeIdentifier`) — trim, uppercase, strip spaces/dashes — applied on save *and* search so lookups never miss.
- **Error taxonomy:** network (toast "You're offline — check connection", queries auto-retry ×2), auth expiry (silent refresh; hard sign-out → login with toast), validation (inline, field-level, never toasts), server/unexpected (toast + Sentry-style log via `expo-application` + console for v1).
- **Every list has three states designed:** skeleton → content → EmptyState. No blank screens, ever.

# Part 10 — Security

- RLS on all tables; anonymous role has zero access. Storage buckets non-public; all media via signed URLs (1h).
- Service-role key exists **only** inside the Edge Function environment.
- Session tokens in SecureStore (Keychain/Keystore), not AsyncStorage.
- Edge Function verifies the caller's JWT before doing anything.
- Completed-inspection immutability enforced at the DB (trigger), not just UI.
- SMTP credentials only in Supabase secrets; `.env` git-ignored; repo contains `.env.example` with blanks.
- No PII in logs (email addresses masked in function logs).

# Part 11 — Performance

- Checklist list: **FlashList** with fixed-height item estimation; ResultSegment memoized per row; result state read via per-item Zustand selectors so one tap re-renders exactly one row (219 rows must scroll at 60fps on a mid-range Android).
- Photos: resized client-side before upload (≤1600px, 0.8) — uploads stay ~200–400KB; `expo-image` with `contentFit`, recycling keys, and blurhash-free placeholders (solid tint).
- Query cache persisted (checklist + recent lists warm at launch); Supabase realtime not used in v1 (pull-to-refresh is enough).
- Hermes engine (default), Reanimated on UI thread for all animations.
- App start target: interactive home in <2s warm, <4s cold on a mid-range device.

# Part 12 — Testing & verification

- **Unit (Jest):** validation schemas, identifier normalization, autosave queue (debounce/batch/retry logic with fake timers), tally calculations.
- **Component (RN Testing Library):** ResultSegment interaction, checklist row note expansion, wizard step gating (CTA disabled states).
- **Edge Function (Deno test):** PDF renderer with a fixture inspection (assert page count, key strings); email template snapshot; contract errors (draft id → 400, missing id → 400).
- **Manual E2E script (per release):**
  1. Enrol fresh account → land on home.
  2. Full Journey A on a real device — verify draft rows appearing live in Supabase table editor while tapping.
  3. Kill the app mid-checklist → relaunch → resume → nothing lost.
  4. Submit → confirm: `inspections.status=completed`, 219 result rows, PDF in `reports` bucket opens correctly, email arrives with attachment at a real inbox (check spam).
  5. Journey B: search by plate, chassis, and VIN (with spaces/lowercase) → all find the car.
  6. Journey D: re-send → second email arrives; Share PDF works.
  7. Airplane-mode sweep: checklist taps queue, pill shows retry, reconnect → flush succeeds.
  8. Dark mode + small-screen (SE-size) + large-font accessibility pass.
- **Load sanity:** seed 1,000 vehicles + 5,000 inspections locally; search stays <300ms; vehicle history paginates.

# Part 13 — Build, release & store submission

- **EAS profiles (`eas.json`):** `development` (dev client, local Supabase), `preview` (internal distribution APK/TestFlight, prod backend), `production` (store builds, auto-increment build numbers).
- **App identity:** name TBD with client (working title "CarInspect Pro"), bundle ids `com.{client}.carinspect` (iOS/Android), scheme `carinspect://`.
- **Store requirements checklist:** privacy policy URL (required by both stores — data collected: client contact info, photos; needs a hosted page), App Store privacy nutrition labels, Play Data Safety form, camera & photo-library permission strings ("Used to attach photos of the vehicle to inspection reports"), screenshots (6.7"/6.1" iOS + phone/7" Android), app category: Business.
- **Pipeline:** `eas build` → `eas submit` for both stores; TestFlight + Play internal testing track for client UAT before public release.
- **Versioning:** semver; `runtimeVersion` policy `appVersion`; EAS Update (OTA) enabled for JS-only hotfixes post-launch.

# Part 14 — Phase-by-phase implementation plan

Eight phases, strictly ordered — each phase produces something **demonstrable** and ends with an explicit exit test. Don't start phase N+1 until phase N's exit test passes. Overview:

| Phase | Name | Est. | Demo at the end |
|---|---|---|---|
| P0 | Foundations | 3–4 days | Log in on a real phone; themed UI kit gallery screen |
| P1 | Vehicles & search | 2–3 days | Find a seeded car by plate/chassis/VIN, see its profile |
| P2 | Wizard core + autosave | 3–4 days | Start inspection, kill app, resume with nothing lost |
| P3 | Checklist | 3–4 days | Full 219-item checklist at 60fps with notes & bulk-pass |
| P4 | Photos, summary, signature | 3–4 days | Complete inspection end-to-end (no PDF yet) |
| P5 | Report pipeline | 3–4 days | Client receives the PDF by email |
| P6 | Detail, settings & polish | 2–3 days | Full app tour incl. dark mode, re-send, share |
| P7 | Hardening & release | 3–5 days | Builds live on TestFlight + Play internal track |

~4–5 working weeks for one developer. With two, P1+P2 and P3+P4 pair well; P5 is independent of P3/P4 UI and can run in parallel once P2 exists.

## P0 — Foundations (3–4 days)

**Goal:** a themed, authenticated, empty app running on both platforms; all infrastructure decisions locked.

1. Repo init (`mobile/` + `supabase/` structure per §2.3), Expo scaffold with expo-router + TypeScript, ESLint/Prettier.
2. Supabase projects (dev + prod), run migrations `0001_schema` / `0002_rls` / `0003_storage` (§3.2–3.4), run `seed.sql` (Appendix D), generate types.
3. **Spike (½ day, de-risks P5 now):** deploy a hello-world Edge Function that sends one nodemailer email and returns a 2-page pdf-lib PDF. If nodemailer misbehaves in Deno, switch `email.ts` to denomailer *today* (Appendix I).
4. Theme: `tokens.ts` (light+dark, §4.2–4.4), ThemeProvider, Inter fonts loaded.
5. UI kit: Button, Input, Card, Chip, Toast, Skeleton, EmptyState, Sheet, ListRow (§4.5) + a hidden `/dev/ui` gallery screen rendering all of them in both themes.
6. Supabase client with SecureStore session adapter; AuthGate in root layout (§6).
7. Screens: login, register, forgot/reset (§5.1–5.3) wired to real auth.

**Exit test:** fresh install on a physical iPhone + Android → enrol → relaunch app → still logged in, lands on an empty home; `/dev/ui` looks right in light and dark; spike email arrived with PDF attached.

## P1 — Vehicles & search (2–3 days)

**Goal:** the read side of the product works against seeded data.

1. Home screen (§5.4): header, action cards, recent list (empty states first-class).
2. `normalizeIdentifier` util + unit tests (§9) — built *before* any insert/search code uses it.
3. Search screen with debounced `useVehicleSearch`, VehicleCard, plate badge (§5.5).
4. Vehicle profile `/vehicle/[id]`: hero card, spec chips, history list.
5. Seed a handful of fake vehicles/inspections in dev for realistic lists.

**Exit test:** search "abc 123", "ABC123", a chassis and a 17-char VIN → all resolve to the seeded car; profile shows history; no-result state offers "Register this vehicle".

## P2 — Wizard core + autosave (3–4 days)

**Goal:** the inspection skeleton and the durability guarantee — the riskiest client-side code, done early.

1. Wizard route group + header (StepBar, kebab: Save & exit / Discard) (§5.6).
2. `useCreateDraft` — DB row created the instant the wizard opens.
3. Zustand wizard store (Appendix B state contract) + hydrate-from-server for resume.
4. **Autosave engine** (Appendix E): dedupe queue, 800ms debounce, batch flush, backoff retry, AppState-background flush, status pill. Unit-test with fake timers.
5. Step 1 Client (type-ahead picker, validation) and Step 2 Vehicle (dupe-detection sheet, chip selectors, identifier lock) (§5.6).
6. Home "Continue inspection" cards wired to `current_step` resume; long-press discard.

**Exit test:** start inspection, fill both steps, force-kill the app mid-typing → relaunch → draft card on home → resumes on the right step with all data; Supabase table editor shows rows updating live while typing; airplane mode shows the retry pill and recovers.

## P3 — Checklist (3–4 days)

**Goal:** the heart of the app, at production quality and production speed.

1. FlashList checklist with sticky section headers; section rail with per-section progress pills (§5.6 step 3).
2. ItemRow + ResultSegment (memoized, per-item store selectors) with haptics + spring animation.
3. F/R note expansion (LayoutAnimation) writing `inspection_results.note`.
4. "Mark remaining as Pass" per section with 5s undo toast.
5. Overall ProgressRing in header; unanswered count on the CTA.
6. **Perf gate on a real low-end Android:** full-speed scroll + rapid tapping stays at 60fps; fix before proceeding, not in P6.

**Exit test:** answer all 219 items on-device in under 4 minutes using bulk-pass; every answer visible in the DB; scroll/tap perf signed off on cheap hardware.

## P4 — Photos, summary, signature (3–4 days)

**Goal:** an inspection can be *completed* end-to-end (report pipeline still stubbed).

1. Photo grid (12 slots), camera sheet (rapid multi-shot), gallery multi-select, client-side resize, immediate upload with per-tile progress + retry, full-screen viewer with delete (§5.6 step 4).
2. Summary: review strip with section tallies + jump-back, unanswered banner, Stars, recommendation cards, inspector notes (§5.6 step 5).
3. SignaturePad full-screen modal → PNG → `signatures` bucket → preview with name/date.
4. Submit mutation: auto-N/A unanswered, flip to `completed`, stamp `completed_at` (Edge Function call stubbed as no-op) → success screen with animated checkmark.
5. Verify immutability trigger fires (attempt an update post-submit → rejected).

**Exit test:** full Journey A minus email: 12 photos survive an app kill (retry tiles), submit produces a completed immutable inspection with 219 results + photos + signature in the DB, success screen plays.

## P5 — Report pipeline (3–4 days)

**Goal:** the client-facing artifact — PDF + email — production quality.

1. `send-report` skeleton: JWT check, service-role data load, structured `{stage, message}` errors (§8.1).
2. `pdf.ts` Painter + cover page → section tables with page-break handling → photo pages → sign-off page (§8.3, Appendix F). Fixture-driven Deno tests (page count, key strings).
3. `email.ts`: nodemailer transport from secrets, HTML + plain-text template (Appendix G), attachment naming.
4. Wire real function into submit: staged button copy, amber "email didn't send → Retry" path, re-send with recipient override (Appendix H #3, #5).
5. Idempotency: re-invoke reuses stored PDF on resend; duplicate submit no-ops.

**Exit test:** submit a real inspection → email lands in a real Gmail inbox (and not spam) with a correct multi-page PDF within 60s; kill SMTP creds → submit still saves, amber state shows, retry after restoring creds succeeds.

## P6 — Detail, settings & polish (2–3 days)

**Goal:** everything around the core loop, and the quality pass that makes it feel premium.

1. Inspection detail: Results accordions, Photos tab, embedded PDF preview, Re-send + Share via signed URL (§5.7).
2. Profile/settings: edit name/company/phone, theme selector, logout (§5.8).
3. Dark-mode sweep of every screen; small-screen (SE) and large-font passes.
4. Motion/haptics polish pass against §4.6; every list checked for skeleton/empty/error states (§9).
5. Weekly orphan-photo cleanup scheduled function (Appendix H #4).

**Exit test:** 15-minute full app tour touching every screen in both themes with zero visual defects; share a PDF to WhatsApp; re-send from detail works.

## P7 — Hardening & release (3–5 days)

**Goal:** shipped.

1. Test suite complete per Part 12 (unit + component + function tests) and green in CI (GitHub Actions: lint, tsc, jest, deno test).
2. Load sanity: 1k vehicles / 5k inspections seeded; search + history timings measured.
3. Manual E2E script (Part 12) executed on physical iPhone + mid-range Android; findings fixed.
4. RLS audit (anonymous access attempts), secret scan, log PII check (Part 10).
5. Store prep: icons/splash, screenshots, privacy policy page, data-safety forms, permission strings (Part 13).
6. `eas build` production for both platforms → TestFlight + Play internal track → **client UAT round** → fix list → resubmit → store review.

**Exit test / definition of shipped:** Part 15 acceptance criteria all pass; client has signed off on UAT builds; both store submissions accepted.

# Part 15 — Acceptance criteria (definition of done)

1. A fresh user can enrol, log in, and stay logged in across app restarts.
2. A full inspection (client + vehicle + 219 items + 12 photos + rating + recommendation + signature) can be completed on iOS and Android without touching a keyboard except for text fields.
3. Killing the app at any point during a draft loses at most the last ~1 second of input.
4. Submitting produces: immutable DB record, a PDF in storage that renders all sections/results/photos/signature correctly, and an email with the PDF attached delivered to the client address — all within 60 seconds.
5. The car is findable afterwards by plate, chassis, or VIN (case/spacing-insensitive), showing full history; any past report can be re-sent and shared.
6. All lists have skeleton/empty/error states; app passes the manual E2E script (Part 12) on a mid-range Android and an iPhone; dark mode has no unreadable surfaces.
7. No secrets in the repo; RLS verified by attempting anonymous reads (must fail).

---

*Open items still pending from the client: final branding (logo, colors can shift from the green tokens, disclaimer wording), app display name, SMTP account, privacy policy hosting.*

---

# Appendix A — Wireframes (key screens)

Low-fi structural wireframes; visual treatment per Part 4.

## A.1 Home

```
┌──────────────────────────────────────┐
│ Good morning, Bilal            (BT)  │  ← caption + avatar button
│ Sandhu Motors                        │  ← title1
│                                      │
│ ┌────────────────┐ ┌───────────────┐ │
│ │   ⊕            │ │   🔍          │ │
│ │  New           │ │  Find         │ │  ← green card / surface card
│ │  Inspection    │ │  Vehicle      │ │     height ~120
│ └────────────────┘ └───────────────┘ │
│                                      │
│ CONTINUE INSPECTION            micro │
│ ┌──────────────────────────────────┐ │
│ │ Toyota Corolla 2019   [ABC·123]  │ │
│ │ Ahmed Khan            ◔ 143/219  │ │  ← progress ring
│ │ Updated 2h ago              →    │ │
│ └──────────────────────────────────┘ │
│                                      │
│ RECENT INSPECTIONS             micro │
│ ┌──────────────────────────────────┐ │
│ │ Honda Civic 2021      [XYZ·987]  │ │
│ │ Sara Ali · 6 Jul   [Recommended] │ │  ← green chip
│ ├──────────────────────────────────┤ │
│ │ BMW 320i 2015         [LMN·456]  │ │
│ │ J. Smith · 5 Jul [With repairs]  │ │  ← amber chip
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## A.2 Checklist step

```
┌──────────────────────────────────────┐
│ ←  Checklist              ◔ 143/219  │  ← wizard header + overall ring
│ ●●●○○○                               │  ← step bar
│ ┌─────┐┌───────┐┌──────┐┌─────────┐  │
│ │🚗 Ext││⊙ Whl ✓││⚙ Eng ││🔧 Under │  │  ← section rail (scrolls)
│ │18/25 ││15/15  ││ 4/30 ││  0/25   │  │     active pill = green fill
│ └─────┘└───────┘└──────┘└─────────┘  │
│                                      │
│ 3 · ENGINE BAY          Mark rest ✓P │  ← sticky section header + bulk
│ ┌──────────────────────────────────┐ │
│ │ 41  Engine starts – cold start   │ │
│ │            (P)(F)(NA)(R)         │ │  ← ResultSegment, P filled green
│ ├──────────────────────────────────┤ │
│ │ 44  Unusual engine noises        │ │
│ │            (P)(F)(NA)(R)         │ │     F filled red, row expanded:
│ │ ✎ Ticking at idle, worse warm    │ │  ← note field appears
│ ├──────────────────────────────────┤ │
│ │ 45  Check engine light (off)     │ │
│ │            (P)(F)(NA)(R)         │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │      Continue to photos          │ │  ← sticky CTA, "76 unanswered"
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## A.3 Summary & sign-off

```
┌──────────────────────────────────────┐
│ ←  Summary                ●●●●●○     │
│ ┌───────┐ ┌───────┐ ┌──────────────┐ │
│ │Client │ │Vehicle│ │Results       │ │  ← review strip (tap = jump back)
│ │Ahmed K│ │Corolla│ │182P 6R 3F    │ │
│ └───────┘ └───────┘ └──────────────┘ │
│ ⚠ 28 items unanswered → will be N/A  │  ← amber banner + Review link
│                                      │
│ OVERALL RATING                       │
│        ★ ★ ★ ★ ☆                     │  ← 36px gold stars
│                                      │
│ RECOMMENDATION                       │
│ ┌ ✅ Recommended ──────────────────┐ │
│ ┌ 🛠 Recommended with repairs ─────┐ │  ← selected = amber tint
│ ┌ ⛔ Not recommended ──────────────┐ │
│                                      │
│ INSPECTOR NOTES                      │
│ ┌──────────────────────────────────┐ │
│ │ Solid car overall; front pads…   │ │
│ └──────────────────────────────────┘ │
│ SIGNATURE                            │
│ ┌ ~~~~ signature ink ~~~~ ─────────┐ │  ← tap opens full-screen pad
│ │ Jagjit Sandhu · 8 Jul 2026       │ │
│ └──────────────────────────────────┘ │
│ [        Submit inspection        ]  │
└──────────────────────────────────────┘
```

## A.4 Vehicle profile

```
┌──────────────────────────────────────┐
│ ←  Vehicle                           │
│ ┌──────────────────────────────────┐ │
│ │ Toyota Corolla 2019   [ABC·123]  │ │
│ │ ● White  ⚙ Auto  ⛽ Petrol  1.8L │ │  ← spec chips
│ │ VIN JTDBR32E…   Chassis NZE141…  │ │
│ │ [  New inspection for this car ] │ │
│ └──────────────────────────────────┘ │
│ HISTORY                              │
│ │ 8 Jul 2026 · Jagjit  ★★★★☆       │ │
│ │ [Recommended]                →   │ │
│ ├──────────────────────────────────┤ │
│ │ 12 Jan 2025 · Ali    ★★★☆☆       │ │
│ │ [With repairs]               →   │ │
└──────────────────────────────────────┘
```

# Appendix B — Component API specs

```ts
// ui/Button
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'lg' | 'md';              // lg=52px (CTAs), md=44px (inline)
  label: string;
  icon?: LucideIcon;               // leading
  loading?: boolean;               // spinner replaces label, width preserved
  disabled?: boolean;
  onPress: () => void;
  fullWidth?: boolean;             // default true for lg
};

// checklist/ResultSegment
type ResultSegmentProps = {
  value: 'pass' | 'fail' | 'na' | 'repair' | null;
  onChange: (v: ItemResult) => void;   // fires haptic + autosave internally? NO —
                                       // pure; parent row wires haptics/autosave
  compact?: boolean;               // 40px segments on small screens
};

// checklist/ItemRow  (memoized; re-renders only on its own state)
type ItemRowProps = {
  item: { id: number; number: number; label: string };
  // reads result via useWizardStore(s => s.results[item.id]) internally
};

// ui/Stars
type StarsProps = { value: number; onChange?: (n: 1|2|3|4|5) => void;
                    size?: number; readonly?: boolean };

// ui/Chip
type ChipProps = { label: string; tone: 'primary'|'pass'|'fail'|'repair'|'na'|'info';
                   icon?: LucideIcon; onPress?: () => void; selected?: boolean };

// photos/PhotoGrid
type PhotoGridProps = {
  photos: { id: string; uri: string; uploading?: number /*0..1*/; failed?: boolean }[];
  max: number;                      // 12
  onAdd: () => void; onOpen: (id: string) => void; onRetry: (id: string) => void;
};

// signature/SignaturePad (full-screen modal)
type SignaturePadProps = { onDone: (pngBase64: string) => void; onCancel: () => void };

// ui/EmptyState
type EmptyStateProps = { icon: LucideIcon; title: string; message?: string;
                         actionLabel?: string; onAction?: () => void };

// ui/Sheet — wraps @gorhom/bottom-sheet-style behavior
type SheetProps = { visible: boolean; onClose: () => void;
                    detents?: ('content'|'half'|'full')[]; children: ReactNode };
```

State contracts:

```ts
// store/wizard.ts (zustand)
type WizardState = {
  inspectionId: string | null;
  client: Partial<ClientDraft>;
  vehicle: Partial<VehicleDraft>;
  results: Record<number /*item_id*/, { result: ItemResult; note?: string }>;
  summary: { rating?: number; recommendation?: Recommendation;
             notes?: string; signaturePngB64?: string };
  answeredCount: () => number;
  sectionTally: (sectionId: number) => { p: number; f: number; r: number; na: number; total: number };
  setResult: (itemId: number, r: ItemResult) => void;   // → also enqueues autosave
  hydrate: (full: InspectionFull) => void;
  reset: () => void;
};
```

# Appendix C — Microcopy catalogue

All user-facing strings in one place (`src/lib/strings.ts`) — consistent voice: short, direct, no jargon, no exclamation marks except the success screen.

| Key | Text |
|---|---|
| auth.login.title | Welcome back |
| auth.login.subtitle | Vehicle inspections, done properly. |
| auth.login.cta | Log in |
| auth.login.error | Wrong email or password |
| auth.register.title | Create your account |
| auth.register.cta | Create account |
| auth.forgot.title | Reset your password |
| auth.forgot.sent | Check your inbox — we've sent you a reset link. |
| home.greeting.m / .a / .e | Good morning, / Good afternoon, / Good evening, |
| home.new | New Inspection |
| home.find | Find Vehicle |
| home.drafts.header | CONTINUE INSPECTION |
| home.recent.header | RECENT INSPECTIONS |
| home.empty.title | No inspections yet |
| home.empty.message | Start your first inspection and it'll show up here. |
| search.placeholder | Plate, chassis or VIN |
| search.empty.title | No vehicle found for "{term}" |
| search.empty.cta | Register this vehicle |
| wizard.client.title | Client details |
| wizard.client.emailHelp | The PDF report will be sent here |
| wizard.vehicle.title | Vehicle details |
| wizard.vehicle.dupe | This car is already registered — use it? |
| wizard.checklist.title | Checklist |
| wizard.checklist.bulkPass | Mark remaining as Pass |
| wizard.checklist.bulkUndo | Section marked as Pass · Undo |
| wizard.checklist.noteHint | What's wrong? |
| wizard.checklist.cta | Continue to photos |
| wizard.checklist.unanswered | {n} unanswered |
| wizard.photos.title | Photos |
| wizard.photos.hint | Add up to 12 photos of the vehicle |
| wizard.photos.take / .pick | Take photo / Choose from gallery |
| wizard.summary.title | Summary |
| wizard.summary.unanswered | {n} items unanswered — they'll be marked N/A |
| wizard.summary.review | Review |
| wizard.summary.sign | Sign here |
| wizard.submit | Submit inspection |
| wizard.submit.saving / .pdf / .email | Saving… / Generating report… / Sending email… |
| done.title | Inspection complete! |
| done.subtitle | Report sent to {email} |
| done.viewPdf / .resend / .home | View PDF / Re-send email / Done |
| done.emailFailed.title | Saved — but the email didn't send |
| done.emailFailed.cta | Retry sending |
| detail.resend.confirm | Send the report to {email} again? |
| autosave.saving / .retry | Saving… / Couldn't save — retrying |
| draft.discard.confirm | Discard this draft? Everything entered will be deleted. |
| offline.toast | You're offline — check your connection |
| logout.confirm | Log out of {email}? |

# Appendix D — Complete `seed.sql`

Ready to run as-is once migrations exist. Numbering matches the paper form (item 202 skipped — unreadable in the source photo; slot reserved).

```sql
-- ============ SECTIONS ============
insert into checklist_sections (id, title, emoji_icon, sort_order) values
  (1, 'Exterior',                 'car',      1),
  (2, 'Wheels & Tyres',           'disc',     2),
  (3, 'Engine Bay',               'cog',      3),
  (4, 'Underbody',                'wrench',   4),
  (5, 'Brakes',                   'octagon',  5),
  (6, 'Interior & Electrical',    'armchair', 6),
  (7, 'Test Drive & Performance', 'gauge',    7)
on conflict (id) do update set title = excluded.title;

-- ============ ITEMS ============
insert into checklist_items (section_id, item_number, label, sort_order) values
-- 1. Exterior (1–25)
(1,  1, 'Overall body condition & appearance', 1),
(1,  2, 'Paint condition & consistency', 2),
(1,  3, 'Signs of repair or touch-ups', 3),
(1,  4, 'Panel alignment (doors, bonnet, boot)', 4),
(1,  5, 'Panel gaps uniformity', 5),
(1,  6, 'Rust, corrosion or bubbling', 6),
(1,  7, 'Dents, dings or scratches', 7),
(1,  8, 'Bonnet operation & alignment', 8),
(1,  9, 'Boot/Tailgate operation & alignment', 9),
(1, 10, 'Doors open/close & latch properly', 10),
(1, 11, 'Bumpers condition & secure', 11),
(1, 12, 'Grille condition & secure', 12),
(1, 13, 'Headlights operation (low beam)', 13),
(1, 14, 'Headlights operation (high beam)', 14),
(1, 15, 'Indicators/front park lights operation', 15),
(1, 16, 'Daytime Running Lights (DRL)', 16),
(1, 17, 'Fog lights operation', 17),
(1, 18, 'Tail lights operation', 18),
(1, 19, 'Brake lights operation', 19),
(1, 20, 'Reverse lights operation', 20),
(1, 21, 'Number plate lights operation', 21),
(1, 22, 'Wipers & washers operation', 22),
(1, 23, 'Windscreen condition (cracks/chips)', 23),
(1, 24, 'Mirrors (glass condition & adjustment)', 24),
(1, 25, 'Badges, trims & mouldings secure', 25),
-- 2. Wheels & Tyres (26–40)
(2, 26, 'Tyre brand & size appropriate', 26),
(2, 27, 'Tyre tread depth – Front Left', 27),
(2, 28, 'Tyre tread depth – Front Right', 28),
(2, 29, 'Tyre tread depth – Rear Left', 29),
(2, 30, 'Tyre tread depth – Rear Right', 30),
(2, 31, 'Tyre wear pattern (even wear)', 31),
(2, 32, 'Tyre sidewalls – cracks/damage', 32),
(2, 33, 'Tyre pressure – Front Left', 33),
(2, 34, 'Tyre pressure – Front Right', 34),
(2, 35, 'Tyre pressure – Rear Left', 35),
(2, 36, 'Tyre pressure – Rear Right', 36),
(2, 37, 'Spare tyre condition', 37),
(2, 38, 'Alloy wheels/rims condition', 38),
(2, 39, 'Wheel nuts secure', 39),
(2, 40, 'Hub caps / centre caps condition', 40),
-- 3. Engine Bay (41–70)
(3, 41, 'Engine starts – cold start', 41),
(3, 42, 'Engine starts – hot start', 42),
(3, 43, 'Engine idle smoothness', 43),
(3, 44, 'Unusual engine noises', 44),
(3, 45, 'Check engine light (off)', 45),
(3, 46, 'Oil leaks – visible', 46),
(3, 47, 'Coolant leaks – visible', 47),
(3, 48, 'Power steering fluid level', 48),
(3, 49, 'Brake fluid level', 49),
(3, 50, 'Coolant level', 50),
(3, 51, 'Engine oil level', 51),
(3, 52, 'Transmission fluid level', 52),
(3, 53, 'Windshield washer fluid level', 53),
(3, 54, 'Battery condition & age', 54),
(3, 55, 'Battery terminals clean & tight', 55),
(3, 56, 'Alternator charging voltage', 56),
(3, 57, 'Belts condition (cracks/wear)', 57),
(3, 58, 'Hoses condition (cracks/leaks)', 58),
(3, 59, 'Air intake system condition', 59),
(3, 60, 'Air filter condition', 60),
(3, 61, 'Fuel system – leaks/odours', 61),
(3, 62, 'Radiator condition', 62),
(3, 63, 'Cooling fans operation', 63),
(3, 64, 'Clutch fluid level (manual)', 64),
(3, 65, 'Clutch operation (if manual)', 65),
(3, 66, 'Power steering operation', 66),
(3, 67, 'Throttle response', 67),
(3, 68, 'Engine mounts condition', 68),
(3, 69, 'Exhaust manifold condition', 69),
(3, 70, 'Exhaust leaks / unusual smoke', 70),
-- 4. Underbody (71–95)
(4, 71, 'Oil leaks – engine area', 71),
(4, 72, 'Oil leaks – transmission area', 72),
(4, 73, 'Oil leaks – differential area', 73),
(4, 74, 'Oil leaks – transfer case (4WD)', 74),
(4, 75, 'Exhaust system condition', 75),
(4, 76, 'Catalytic converter condition', 76),
(4, 77, 'Drive shafts / CV joints', 77),
(4, 78, 'Universal joints condition', 78),
(4, 79, 'Front suspension components', 79),
(4, 80, 'Rear suspension components', 80),
(4, 81, 'Shock absorbers (front)', 81),
(4, 82, 'Shock absorbers (rear)', 82),
(4, 83, 'Coil springs condition', 83),
(4, 84, 'Leaf springs / bushes condition', 84),
(4, 85, 'Control arm bushes condition', 85),
(4, 86, 'Sway bar links condition', 86),
(4, 87, 'Ball joints condition', 87),
(4, 88, 'Tie rod ends condition', 88),
(4, 89, 'Steering rack boot condition', 89),
(4, 90, 'Subframe condition', 90),
(4, 91, 'Chassis / floorpan condition', 91),
(4, 92, 'Rust / corrosion on underbody', 92),
(4, 93, 'Brake lines condition', 93),
(4, 94, 'Fuel lines condition', 94),
(4, 95, 'Handbrake cables condition', 95),
-- 5. Brakes (96–115)
(5,  96, 'Brake pedal feel', 96),
(5,  97, 'Brake pedal firmness', 97),
(5,  98, 'Brake pedal travel', 98),
(5,  99, 'ABS warning light (off)', 99),
(5, 100, 'Brake fluid condition', 100),
(5, 101, 'Front brake pads thickness (L)', 101),
(5, 102, 'Front brake pads thickness (R)', 102),
(5, 103, 'Rear brake pads thickness (L)', 103),
(5, 104, 'Rear brake pads thickness (R)', 104),
(5, 105, 'Front brake discs condition (L)', 105),
(5, 106, 'Front brake discs condition (R)', 106),
(5, 107, 'Rear brake discs/drums condition (L)', 107),
(5, 108, 'Rear brake discs/drums condition (R)', 108),
(5, 109, 'Parking brake operation', 109),
(5, 110, 'Brake system leaks', 110),
(5, 111, 'Brake booster operation', 111),
(5, 112, 'Proportioning valve operation', 112),
(5, 113, 'Brake calibration / balance', 113),
(5, 114, 'Brake wear warning light (off)', 114),
(5, 115, 'Test drive – brake performance', 115),
-- 6. Interior & Electrical (116–145)
(6, 116, 'Interior cleanliness & odour', 116),
(6, 117, 'Seats condition – driver', 117),
(6, 118, 'Seats condition – passenger', 118),
(6, 119, 'Seat adjustments (all functions)', 119),
(6, 120, 'Seat belts – condition', 120),
(6, 121, 'Dashboard condition', 121),
(6, 122, 'Instrument cluster operation', 122),
(6, 123, 'Warning lights (off)', 123),
(6, 124, 'Air conditioning – cold', 124),
(6, 125, 'Heater – hot', 125),
(6, 126, 'Fan speed operation', 126),
(6, 127, 'Airflow direction control', 127),
(6, 128, 'Rear defogger operation', 128),
(6, 129, 'Audio system operation', 129),
(6, 130, 'Speakers operation', 130),
(6, 131, 'Bluetooth / connectivity', 131),
(6, 132, 'Power windows operation', 132),
(6, 133, 'Power locks operation', 133),
(6, 134, 'Central locking operation', 134),
(6, 135, 'Mirrors – electric adjustment', 135),
(6, 136, 'Sunroof / moonroof operation', 136),
(6, 137, 'Cruise control operation', 137),
(6, 138, 'Lights – interior', 138),
(6, 139, 'Horn operation', 139),
(6, 140, '12V power outlet / USB ports', 140),
(6, 141, 'Immobiliser / keyless operation', 141),
(6, 142, 'Key / remote condition', 142),
(6, 143, 'Dash switches operation', 143),
(6, 144, 'Interior trims & panels', 144),
(6, 145, 'Glove box operation', 145),
-- 7. Test Drive & Performance (146–220, 202 skipped)
(7, 146, 'General driving feel', 146),
(7, 147, 'Acceleration performance', 147),
(7, 148, 'Engine power delivery', 148),
(7, 149, 'Transmission shifts (smooth)', 149),
(7, 150, 'Transmission – no slipping', 150),
(7, 151, 'Clutch operation (if manual)', 151),
(7, 152, 'Gear selection – easy', 152),
(7, 153, 'Steering feel & response', 153),
(7, 154, 'Steering alignment (straight)', 154),
(7, 155, 'Steering noise (none)', 155),
(7, 156, 'Suspension ride comfort', 156),
(7, 157, 'Suspension – bumps handling', 157),
(7, 158, 'Noises over bumps (none)', 158),
(7, 159, 'Brakes – effectiveness', 159),
(7, 160, 'Brakes – no pulling', 160),
(7, 161, 'Handbrake – holds on incline', 161),
(7, 162, 'Idle stability when stopped', 162),
(7, 163, 'Temperature gauge normal', 163),
(7, 164, 'No unusual vibrations', 164),
(7, 165, 'Wind noise (normal)', 165),
(7, 166, 'Road noise (normal)', 166),
(7, 167, 'Exhaust note (normal)', 167),
(7, 168, 'Engine overheating (none)', 168),
(7, 169, 'Fuel consumption (normal)', 169),
(7, 170, 'Transmission noise (none)', 170),
(7, 171, 'Differential noise (none)', 171),
(7, 172, '4WD engagement (if applicable)', 172),
(7, 173, 'ABS operation (test)', 173),
(7, 174, 'Traction control (test)', 174),
(7, 175, 'Stability control (test)', 175),
(7, 176, 'Cruise control (test)', 176),
(7, 177, 'Headlights – night visibility', 177),
(7, 178, 'Indicators – self-cancelling', 178),
(7, 179, 'Wipers – all speeds', 179),
(7, 180, 'Washer spray pattern', 180),
(7, 181, 'Rear view visibility', 181),
(7, 182, 'Lane change stability', 182),
(7, 183, 'Emergency stop test', 183),
(7, 184, 'Parking sensors (if fitted)', 184),
(7, 185, 'Reversing camera (if fitted)', 185),
(7, 186, 'Odometer operation', 186),
(7, 187, 'Trip meter operation', 187),
(7, 188, 'Fuel gauge operation', 188),
(7, 189, 'Doors / boot seals – rattles', 189),
(7, 190, 'Interior rattles (none)', 190),
(7, 191, 'Body rattles (none)', 191),
(7, 192, 'Airbag warning light (off)', 192),
(7, 193, 'Seat belt warning light (off)', 193),
(7, 194, 'Service reminder (check)', 194),
(7, 195, 'Service history reviewed', 195),
(7, 196, 'Spare key available', 196),
(7, 197, 'Owner''s manual available', 197),
(7, 198, 'Logbook / service records', 198),
(7, 199, 'Number of previous owners', 199),
(7, 200, 'Registration validity', 200),
(7, 201, 'Roadworthy certificate (if any)', 201),
-- 202 skipped: unreadable in source photo (slot reserved)
(7, 203, 'Accident history (check)', 203),
(7, 204, 'Finance owing (check)', 204),
(7, 205, 'Theft history (check)', 205),
(7, 206, 'VIN verification (matches docs)', 206),
(7, 207, 'Import compliance (if applicable)', 207),
(7, 208, 'Odometer consistency', 208),
(7, 209, 'Overall mechanical condition', 209),
(7, 210, 'Overall exterior condition', 210),
(7, 211, 'Overall interior condition', 211),
(7, 212, 'Overall electrical condition', 212),
(7, 213, 'Overall drivability', 213),
(7, 214, 'Overall safety condition', 214),
(7, 215, 'Market value assessment', 215),
(7, 216, 'Value for money', 216),
(7, 217, 'Recommendation', 217),
(7, 218, 'Final overall rating', 218),
(7, 219, 'Inspector notes', 219),
(7, 220, 'Additional comments', 220)
on conflict (item_number) do update set
  label = excluded.label, section_id = excluded.section_id, sort_order = excluded.sort_order;
```

> Note for build time: items **217–220** duplicate fields captured structurally in the summary step (recommendation, rating, notes). Decide with the client: either keep them as checklist rows for 1:1 paper parity (default), or hide them in the app UI (`checklist_items.hidden bool`) and let the PDF print the structured values in their place.

# Appendix E — Autosave engine pseudocode

```ts
// lib/autosave.ts — one instance per open wizard
type Patch =
  | { kind: 'result'; itemId: number; result: ItemResult; note?: string }
  | { kind: 'inspection'; fields: Partial<InspectionScalars> }   // step, odometer, rating…
  | { kind: 'client' | 'vehicle'; fields: Record<string, unknown> };

const queue = new Map<string, Patch>();        // keyed for dedupe: 'result:44', 'inspection'
let flushTimer: Timeout | null = null;
let backoff = [1000, 3000, 9000]; let attempt = 0;

export function enqueue(patch: Patch) {
  queue.set(patchKey(patch), patch);           // newer overwrites older — dedupe
  status.set('dirty');
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 800);         // debounce quiet period
}

export async function flush(force = false) {
  if (queue.size === 0) return status.set('saved');
  const batch = [...queue.values()]; queue.clear();
  status.set('saving');
  try {
    const results = batch.filter(isResult);
    if (results.length)
      await supabase.from('inspection_results')
        .upsert(results.map(toRow), { onConflict: 'inspection_id,item_id' });
    const scalars = merge(batch.filter(isInspection));
    if (scalars) await supabase.from('inspections').update(scalars).eq('id', inspectionId);
    // client/vehicle patches → their own upserts
    attempt = 0; status.set('saved');
  } catch (e) {
    batch.forEach(p => queue.has(patchKey(p)) || queue.set(patchKey(p), p)); // requeue, keep newer
    status.set('retrying');
    setTimeout(flush, backoff[Math.min(attempt++, backoff.length - 1)]);
  }
}

// Wiring:
// - wizard store setResult() → enqueue({kind:'result', …})
// - AppState 'background' | screen blur | step change | 'Save & exit' → flush(true)
// - header pill renders `status`: '' | 'Saving…' | 'Couldn't save — retrying'
```

# Appendix F — PDF renderer structure (Edge Function)

```ts
// functions/send-report/pdf.ts
export async function renderReport(data: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const inter = await doc.embedFont(INTER_REGULAR);      // bundled TTFs
  const interBold = await doc.embedFont(INTER_SEMIBOLD);

  const painter = new Painter(doc, { inter, interBold, margin: 48 });
  // Painter owns: current page, cursor y, ensureSpace(h) → addPage + repeat table header,
  // text/rule/chip/starRow/labelValueGrid primitives, and footer stamping.

  drawCover(painter, data);            // header band, vehicle grid, client grid, result hero
  for (const section of data.sections) drawSectionTable(painter, section);
  //   row: [num 8%] [label+note 64%] [result chip 28%-right]; zebra fill #FAFBFA
  if (data.photos.length) await drawPhotoPages(painter, data.photos);  // 2×3 grid
  drawSignOff(painter, data);          // notes, signature PNG (max 220×80), name, date, disclaimer

  painter.stampFooters(`${data.companyName} · generated ${data.date}`);  // "page x of y"
  return doc.save();
}
```

Color constants mirror the app tokens (§4.2) so app and PDF feel like one product. Result chips: filled rounded rects, white letter, same green/red/amber/gray.

# Appendix G — Email template

```
Subject: Vehicle Inspection Report — {year} {make} {model} ({plate})

┌────────────────────────────────────────────┐
│  {COMPANY NAME}                (green rule) │
│                                            │
│  Hi {firstName},                           │
│                                            │
│  Thanks for bringing your {year} {make}    │
│  {model} in on {date}. The full inspection │
│  report is attached as a PDF.              │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │ Overall: ★★★★☆                       │  │
│  │ {Recommended / With repairs / Not}   │  │
│  │ 182 passed · 6 repair · 3 failed     │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Questions? Just reply to this email.      │
│                                            │
│  {Inspector name}                          │
│  {Company name} · {phone}                  │
└────────────────────────────────────────────┘
```

Single-column table layout, inline CSS, no images (deliverability), plain-text alternative auto-generated. From: `"{Company}" <smtp-from-address>`, Reply-To: inspector's email.

# Appendix H — Edge cases & failure modes

| # | Case | Behavior |
|---|---|---|
| 1 | Two identifiers typed that belong to *different* existing vehicles | Block with explanatory sheet; ask which one to use |
| 2 | Existing vehicle found on blur (plate match) | "Already registered — use it?" → link, prefill, lock identifiers |
| 3 | Client email typo'd → email bounces | v1: bounce goes to SMTP inbox (client monitors); detail screen allows editing… **no** — inspections immutable; instead **Re-send** flow allows overriding recipient address (one-off) |
| 4 | App killed mid-photo-upload | On resume, tile shows failed state with retry (row exists only after upload success, so no orphans in DB; orphaned storage objects cleaned by a weekly scheduled function) |
| 5 | Submit succeeds, PDF/email fails | Inspection saved & completed; amber "email didn't send" state with retry; retry hits idempotent function |
| 6 | Duplicate submit tap | Mutation guards on status; second call no-ops (already `completed`) |
| 7 | Draft older than 30 days | Home shows "stale" tag; kept forever in v1 (cheap), client may want auto-purge later |
| 8 | Same car, plate changed (re-registration) | Search by chassis/VIN still finds it; editing vehicle identifiers allowed (vehicles are mutable, only inspections are frozen) |
| 9 | 219 taps too slow for a quick job | Bulk "Mark remaining as Pass" per section + submit-time auto-N/A make a 2-minute minimal inspection possible |
| 10 | Token expiry mid-wizard | supabase-js auto-refreshes; hard failure → autosave queue holds until re-auth, nothing lost |
| 11 | Photo > storage limit / weird format | Client-side re-encode to JPEG guarantees format; 12×400KB ≈ 5MB per inspection worst case |
| 12 | Emoji / non-Latin text in notes | Inter covers Latin+; pdf-lib fallback: strip unsupported glyphs, keep raw text in DB |

# Appendix I — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| nodemailer-in-Deno friction (Edge runtime quirks) | Medium | Email pipeline blocked | Spike in M0; fallback: `denomailer` (native Deno SMTP) or Resend HTTP API behind the same `email.ts` interface |
| Gmail app-password deliverability (spam folder, sending limits ~500/day) | Medium | Client complaints | Set SPF-aligned from-address; recommend a proper business SMTP; monitor in UAT with real inboxes |
| PDF layout effort underestimated (220-row tables, page breaks) | Medium | M5 slips | Painter abstraction + fixture-driven Deno tests early in M5; photos/pages capped |
| Checklist scroll perf on cheap Androids | Low-Med | Core UX feels bad | FlashList + per-row memoization from day one; test on a real low-end device in M3, not at the end |
| Client scope creep (branding, extra fields) | High | Timeline | Checklist-as-data + token-based theme absorb most changes without code; anything else → change request |
| Store review friction (privacy policy, permissions) | Medium | Launch delay | Prepare privacy policy + permission strings in M7 week 1, not at submission |
| Shared-pool regret (client later wants per-company data) | Low | Schema rework | `created_by` already on every row; adding an `org_id` + RLS later is a migration, not a rewrite |

# Appendix J — Post-v1 roadmap (not in scope, recorded for the client)

1. **Re-check inspections** — follow-up inspection pre-scoped to previously failed/repair items (the useful version of the prototype's "Defect Inspection").
2. **Search by client** name/phone (open question from PLAN.md — trivially enabled by existing indexes).
3. **Offline-first** mode with sync queue (biggest v2 candidate if inspectors work in basements/lots).
4. **Per-item photos** attached to failed items, inline in the PDF.
5. **VIN decoder API** (auto-fill make/model/year from VIN).
6. **Custom checklist editor** in-app (add/edit items per company).
7. **Analytics dashboard** (web): inspections per week, common failure items, inspector throughput.
8. **Multi-language** reports (checklist labels table already centralizes strings).
9. **Org separation / teams** if the product is sold to multiple inspection companies (see risk table).

---

*End of implementation plan.*
