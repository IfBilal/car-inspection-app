# Car Inspection App — Project Plan

> Status: **planning / discussion only — no code written yet.**
> Reference prototype screenshots: `login.jpeg`, `home.jpeg`, `page.jpeg`, `page2.jpeg`, `checklist.jpeg` (this folder).

---

## 1. What the app is

A mobile application for **car mechanics / vehicle inspection companies** (not car owners). A customer brings their car to the shop; the mechanic:

1. Opens the app and logs in (or enrols a new account).
2. Either **looks up the car** (by registration plate / chassis number / VIN) to see any previous inspections, or **registers the car fresh**.
3. Enters the **client's details** (name, email, phone, address) and the **vehicle's details**.
4. Performs the inspection using an in-app **220-item checklist**, adds **photos**, gives an **overall rating and recommendation**, and **signs** on screen.
5. On submit, the inspection is **saved to the database**, a **PDF report** is generated, and the PDF is **emailed to the client** automatically.
6. Any mechanic can later find the car by plate/chassis/VIN and see its full inspection history.

## 2. Tech stack (agreed)

| Layer | Choice | Notes |
|---|---|---|
| Mobile app | **React Native via Expo** (managed workflow, expo-router, TypeScript) | Faster to build/ship than bare RN; easy camera access; EAS for store builds |
| Backend | **Supabase** | Postgres + Auth + Storage (photos, PDFs) + Edge Functions |
| PDF generation | **Server-side** in a Supabase Edge Function using `pdf-lib` | On-device PDF generation in RN is flaky; server-side keeps the report identical to the DB record |
| Email | **nodemailer** over SMTP, from the same Edge Function | Client to provide SMTP credentials / from-address |
| Signature | Drawn on screen (signature pad → PNG → embedded in PDF) | e.g. `react-native-signature-canvas` |

## 3. Key decisions (agreed in discussion)

- **Shared data pool** — mechanics have separate login accounts, but there is **no per-account data separation**: an inspection added by one logged-in user is findable by every other user via search.
- **Full 220-item checklist** — replicated exactly from `checklist.jpeg`, but stored **as data** (sections + items tables), so items can be edited without an app release.
- **Online-only for v1** — no offline mode / sync. Drafts auto-save to the server.
- **Drafts supported** — inspections have `draft` / `completed` status; the wizard auto-saves each step and a half-finished inspection is resumable from the home screen (matches the prototype's SAVE vs SUBMIT buttons).
- **Signature drawn on screen**, embedded in the PDF.
- **Photos: one pool of up to 12 per inspection** (matches the prototype's Photos screen), rendered as a gallery page in the PDF.
- **"Defect Inspection" dropped** — the prototype is an Australian AIS (Authorised Inspection Scheme) app where a defect inspection is a government defect-notice clearance re-check. Not relevant to private pre-purchase inspections. Possible future feature: a lightweight "re-check previously failed items" flow.

## 4. The inspection checklist (from `checklist.jpeg`)

**7 sections, 220 items** — full item-by-item transcription in [`CHECKLIST.md`](CHECKLIST.md). Every item is rated:

- **P** = Pass
- **F** = Fail
- **NA** = Not Applicable
- **R** = Repair / Attention Required

| # | Section | Items |
|---|---|---|
| 1 | Exterior | 1–25 |
| 2 | Wheels & Tyres | 26–40 |
| 3 | Engine Bay | 41–70 |
| 4 | Underbody | 71–95 |
| 5 | Brakes | 96–115 |
| 6 | Interior & Electrical | 116–145 |
| 7 | Test Drive & Performance | 146–220 |

Per inspection, in addition to the checklist:

- **Customer details**: name, phone, email, address, date
- **Vehicle details**: make, model, year, colour, VIN (chassis no.), registration no., odometer (km), transmission, fuel type, engine size, drive type, seller, purchase price (if known)
- **Photos**: up to 12
- **Overall result**: recommendation (Recommended / Recommended with repairs / Not recommended), overall star rating (1–5)
- **Inspector name, drawn signature, date**
- **Disclaimer text** (standard liability wording, as on the paper form)

## 5. Database schema (Supabase / Postgres)

| Table | Purpose / key columns |
|---|---|
| `profiles` | Mechanic accounts, linked 1:1 to `auth.users`. Name, company name. |
| `clients` | Car owners: name, email, phone, address. |
| `vehicles` | Make, model, year, colour, VIN, chassis number, registration plate, engine size, transmission, fuel type, drive type. Searchable by plate / chassis / VIN. |
| `checklist_sections` | The 7 sections (name, sort order). |
| `checklist_items` | The 220 items (section, number, label). Seed data — the app renders whatever is here. |
| `inspections` | vehicle_id, client_id, inspector (profile_id), odometer at inspection, seller, purchase price, overall rating, recommendation, notes, signature image path, **status: draft / completed**, completed_at, pdf_url. |
| `inspection_results` | One row per (inspection, checklist_item): result P/F/NA/R + optional note. |
| `inspection_photos` | Supabase Storage paths, max 12 per inspection, sort order. |

**Security (RLS):** all tables readable/writable by any *authenticated* user (shared pool), fully blocked for anonymous users. Storage buckets (`photos`, `reports`) same policy.

## 6. App screens

1. **Login / Enrol / Forgot password** — email + password (see `login.jpeg`).
2. **Home** — welcome header + two big actions: **New Vehicle Inspection** and **Find Vehicle**; below, a list of the user's **draft inspections** to resume (see `home.jpeg`).
3. **Vehicle search** — enter VIN **or** registration plate + chassis number (see `page.jpeg`). Result: vehicle summary + full inspection history; tap any inspection to view it.
4. **New inspection wizard** (auto-saves as a draft at every step):
   1. Client details (or pick an existing client)
   2. Vehicle details (or pre-filled if the car already exists)
   3. Checklist — 7 section screens, each item tappable P / F / NA / R, optional note per item
   4. Photos — camera or gallery, up to 12 (see `page2.jpeg`)
   5. Summary — overall rating (stars), recommendation, inspector notes, **signature pad**
   6. Submit → saves as completed, triggers PDF + email
5. **Inspection detail** — read-only view of a completed inspection; buttons to **re-send email** and **view/download PDF**.

## 7. Server side (Supabase Edge Function)

**`send-report`** — invoked on inspection submit (and by "re-send"):

1. Loads the inspection + client + vehicle + all 220 results + photos + signature from the DB.
2. Renders the PDF with `pdf-lib`: header/branding, customer & vehicle details, the 7 checklist sections as tables with P/F/NA/R marks, photo gallery page, overall result + star rating, inspector name + signature + date, disclaimer.
3. Uploads the PDF to the `reports` Storage bucket and stamps `pdf_url` on the inspection.
4. Emails the PDF to the client's email via **nodemailer** (SMTP).

Secrets needed at deploy time: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

## 8. Proposed repo structure

```
car-inspection/
├── docs/                  # this plan + prototype screenshots
├── mobile/                # Expo app (expo-router, TypeScript)
│   ├── app/               # screens (auth, home, search, inspection wizard, detail)
│   ├── lib/               # supabase client, hooks, types
│   └── components/        # checklist row, photo grid, signature pad, etc.
└── supabase/
    ├── migrations/        # schema SQL
    ├── seed.sql           # 220 checklist items
    └── functions/
        └── send-report/   # PDF + email Edge Function
```

## 9. Build order (when we start)

1. Supabase project: schema migration + checklist seed + storage buckets + RLS.
2. Expo scaffold, Supabase client, auth screens (login / enrol / forgot).
3. Home + vehicle search + inspection history.
4. Inspection wizard with draft auto-save (client → vehicle → checklist ×7 → photos → summary/signature → submit).
5. `send-report` Edge Function (PDF + nodemailer), wire to submit + re-send.
6. End-to-end test: full inspection on a device, verify DB rows, PDF contents, email delivery.
7. EAS builds for distribution.

## 10. Open items

- [x] **Distribution**: both stores — **App Store (iOS) and Play Store (Android)**, via EAS builds.
- [x] **SMTP credentials**: provided via **env / Edge Function secrets** (email + app password for nodemailer). Not committed to the repo.
- [x] **Checklist wording**: transcribed from the photo into [`CHECKLIST.md`](CHECKLIST.md) — 219 of 220 items readable; item 202 unreadable and skipped for now.
- [ ] PDF branding: logo, company name, colours, exact disclaimer text — client to provide later; easy to swap in, not blocking.
- [ ] Should "Find Vehicle" also allow searching by client name/phone?
