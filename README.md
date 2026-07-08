# CarInspect Pro

Mobile app for vehicle inspection companies: run a 220-point pre-purchase inspection on a phone,
attach photos, sign on screen — the client automatically gets a polished PDF report by email, and
every inspection stays searchable by plate, chassis, or VIN.

**Stack:** Expo (React Native, expo-router, TypeScript) · Supabase (Postgres, Auth, Storage, Edge Functions) · pdf-lib + nodemailer.

## Repo layout

```
docs/       Product & implementation plans, checklist transcription, prototype refs
mobile/     Expo app
supabase/   Migrations, 219-item checklist seed, send-report Edge Function
```

Full design + phase plan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Run the app

```sh
cd mobile
npm install
cp .env.example .env   # fill with the Supabase project URL + anon key
npx expo start         # scan the QR with Expo Go (Android/iOS)
```

Checks: `npm run typecheck` · `npm run lint` · `npm test`

## Backend

Already provisioned on the Supabase project (`car-inspection`): schema, RLS, storage buckets
(`inspection-photos`, `signatures`, `reports`), 219-item checklist seed, and the deployed
`send-report` Edge Function. To recreate from scratch see [`supabase/README.md`](supabase/README.md).

### Email (required before reports send)

`send-report` generates + stores the PDF even without SMTP, but emailing needs secrets
(e.g. a Gmail address + app password):

```sh
npx supabase secrets set --project-ref <ref> \
  SMTP_HOST=smtp.gmail.com SMTP_PORT=465 \
  SMTP_USER=you@gmail.com SMTP_PASS=<app-password> \
  SMTP_FROM_NAME="Your Company" SMTP_FROM_ADDRESS=you@gmail.com
```

## Status

- ✅ P0–P5 built: auth, home, vehicle search/profile, full inspection wizard
  (client → vehicle → 219-item checklist → photos → summary/signature → submit),
  autosaving drafts, PDF + email pipeline (verified end-to-end; email pending SMTP secrets)
- ⏳ P6/P7 remaining: on-device QA pass, EAS builds, store submission (needs Apple/Google accounts)
