# Studio Soulutions — Salon Plus Studio Suites

Hive-Rise build for Laura. Two surfaces, one brain:

- `/` — phone view, reached via the lobby QR sign
- `/kiosk` — lobby touchscreen, with idle attract loop + 60s return-to-home
- `/admin` — Laura's content editor (Supabase Auth gated) — stubbed, lands with task #6

## Layout

```
StudioSoulutions/
  index.html              phone view (the existing app, evolving)
  kiosk.html              lobby TV view
  admin.html              Laura's admin (task #6)
  assets/
    css/tokens.css        shared palette/type tokens — both views use it
    js/supabase-client.js Supabase init (reads window.SS_ENV)
    js/data.js            data layer with mock fallback so UI runs pre-DB
    photos/               Laura's photos (5 in for v1)
  supabase/migrations/    001_initial_schema.sql — run once via Supabase SQL editor
  netlify.toml            routing + cache headers
  .env.example            env vars expected at deploy
```

## Deploy notes (Netlify)

1. Connect this folder as the Netlify site root (publish dir `.`).
2. Set env vars in Netlify dashboard: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
3. Add a tiny build step that writes `assets/js/env.js`:
   ```
   echo "window.SS_ENV = { SUPABASE_URL: '$SUPABASE_URL', SUPABASE_ANON_KEY: '$SUPABASE_ANON_KEY' };" > assets/js/env.js
   ```
   And reference `<script src="/assets/js/env.js"></script>` before the module scripts.
4. Until env is set, the data layer falls back to mock data — the UI renders correctly for demos.

## Supabase

Run `supabase/migrations/001_initial_schema.sql` once in the SQL editor of the Hive-Rise shared project.
Then create the `ss-photos` storage bucket (public) via the dashboard.

## Build order (live task list)

1. ~~Photos in~~ ✓
2. ~~Supabase schema~~ ✓
3. ~~Repo split into /, /kiosk~~ ← this slice
4. Interactive floor plan + route
5. AI bio writer (LLM + voice + per-salon voice profile)
6. Admin page
7. Printable QR lobby sign
8. Lobby photo background + attract loop *(half-done in this slice)*
9. Deploy + verify
