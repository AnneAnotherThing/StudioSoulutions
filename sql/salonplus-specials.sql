-- =====================================================================
-- Studio Soulutions, Salon Plus offers
-- Run once in the Supabase SQL editor (same project as ss_interest).
--
-- Two tables:
--   ss_suite_codes   who is allowed to post, and what they may advertise
--   ss_specials      the offers themselves
--
-- Neither table gets a public policy. RLS is on and no policies are
-- defined, so the anon key can read nothing; every touch goes through
-- the salonplus-specials function using the service key, exactly like
-- ss_interest does today.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Who can post. One row per claimed studio. Anne adds a row when a
-- studio claims its card and hands over the code in person.
--
-- `services` is the menu their offer dropdown is built from, so a studio
-- can only advertise work it actually does. Seed it from the tags on
-- their card in data.js.
-- ---------------------------------------------------------------------
create table if not exists public.ss_suite_codes (
  suite       text primary key,
  building    text not null default 'salonplus',
  studio      text not null,
  code        text not null,
  services    text[] not null default '{}',
  can_post    boolean not null default true,   -- Anne's per-studio kill switch
  created_at  timestamptz not null default now()
);

alter table public.ss_suite_codes enable row level security;

-- ---------------------------------------------------------------------
-- The offers. Title and detail are composed SERVER-SIDE from the parts
-- the studio picked, never accepted as free text from the browser.
--
-- One live offer per suite is enforced by the partial unique index
-- below: posting a new one flips the old to 'replaced' first.
-- ---------------------------------------------------------------------
create table if not exists public.ss_specials (
  id          uuid primary key default gen_random_uuid(),
  suite       text not null references public.ss_suite_codes(suite) on delete cascade,
  building    text not null default 'salonplus',
  title       text not null,          -- "$10 off a Structured Mani"
  detail      text not null default '', -- "New clients · Tue-Thu only"
  expires_at  date not null,
  status      text not null default 'live',  -- live | hidden | replaced
  parts       jsonb not null default '{}',   -- the raw picks, for editing later
  created_at  timestamptz not null default now()
);

alter table public.ss_specials enable row level security;

-- One live offer per suite, the "no flea market" rule in the schema
-- rather than only in the function.
create unique index if not exists ss_specials_one_live_per_suite
  on public.ss_specials (suite)
  where status = 'live';

-- The app's read path: live offers that haven't run out yet.
create index if not exists ss_specials_live_lookup
  on public.ss_specials (building, expires_at)
  where status = 'live';

-- ---------------------------------------------------------------------
-- Seed: the studios that have claimed a card so far. Change the codes
-- before running this; they are what you hand the studio.
-- Services mirror the tags on each card in salonplus/data.js.
-- ---------------------------------------------------------------------
insert into public.ss_suite_codes (suite, studio, code, services) values
  ('301', 'Deuces Nail Studio',        'DEUCES-4417', array['Gel','Pedicure','Nail Art','Structured Mani']),
  ('103', 'Soul and Beauty Day Spa',   'SOUL-2810',   array['Therapeutic Massage','Medical Massage','Hydra-Facial','Deep Clean Facial']),
  ('212', 'True Story Tha Barber',     'TRUE-9265',   array['Cuts','Beard Trim','Line Up']),
  ('312', 'Arizona Hair Replacement',  'AZHR-1057',   array['Consultation','Hair Replacement','Maintenance'])
on conflict (suite) do nothing;
