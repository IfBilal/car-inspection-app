# Supabase backend

## One-time setup

1. Create a project at supabase.com (one for dev, one for prod).
2. Link and push:

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push          # runs migrations/
npx supabase db execute --file seed.sql   # or paste seed.sql into the SQL editor
```

3. Auth settings (Dashboard → Authentication):
   - Enable Email provider; **disable** "Confirm email" for v1.
4. Copy Settings → API values into `mobile/.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Edge Function (P5)

`functions/send-report` — PDF + email. Secrets:

```sh
npx supabase secrets set SMTP_HOST=... SMTP_PORT=465 SMTP_USER=... SMTP_PASS=... \
  SMTP_FROM_NAME="Company Name" SMTP_FROM_ADDRESS=reports@company.com
npx supabase functions deploy send-report
```
