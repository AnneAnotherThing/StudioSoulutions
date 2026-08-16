-- =====================================================================
-- Studio Soulutions, the directory itself
-- Run once in the Supabase SQL editor, after salonplus-specials.sql.
--
-- This is the table that ends data.js as the source of truth. Until now
-- every studio name, suite, and bio lived in a file in the repo, which
-- is why adding a tenant meant a code change. From here, ss_studios is
-- the directory and the app reads it live.
--
-- What does NOT move: the floor plan. Corridors and room coordinates are
-- geometry, not tenant data, and they stay in data.js where they're
-- readable and diffable.
--
-- RLS is on with no policies, same as every other table here. Nothing is
-- readable with the anon key; every read and write goes through a
-- function using the service key.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shopping centers. A building can hold listings before anyone traces
-- its floor plan, so has_map says whether "show me on the map" is real
-- yet, and default_tier is what a new studio there starts on.
-- ---------------------------------------------------------------------
create table if not exists public.ss_buildings (
  slug          text primary key,
  name          text not null,
  city          text not null default '',
  default_tier  int  not null default 1,
  has_map       boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.ss_buildings enable row level security;

insert into public.ss_buildings (slug, name, city, default_tier, has_map) values
  -- Salon Plus starts everyone on tier 2 while the neighborhood is being
  -- built; every other center starts on tier 1.
  ('salonplus', 'Salon Plus Studios', 'Glendale, AZ', 2, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- What a tier is allowed to show. Deliberately data and not code: the
-- settings page writes these rows, and both the admin panel and the app
-- read them, so changing what "free" means never needs a deploy.
--
-- Adding a tier 3 later is an INSERT, not a release.
-- ---------------------------------------------------------------------
create table if not exists public.ss_tier_settings (
  tier            int primary key,
  label           text not null,
  blurb           text not null default '',
  photos_max      int  not null default 0,   -- 0 = initials only; 4 = profile + 3
  allow_coupons   boolean not null default false,
  allow_contact   boolean not null default true,   -- call / text buttons
  allow_booking   boolean not null default true,   -- external booking link
  allow_socials   boolean not null default true,
  allow_bio       boolean not null default true,
  allow_hours     boolean not null default true,
  updated_at      timestamptz not null default now()
);

alter table public.ss_tier_settings enable row level security;

-- Starting point only. Change these on the settings page, not here.
insert into public.ss_tier_settings
  (tier, label, blurb, photos_max, allow_coupons, allow_contact, allow_booking, allow_socials, allow_bio, allow_hours) values
  (1, 'Listed', 'On the map and in the directory, with a way to get in touch.',
      0, false, true,  true,  true,  true,  true),
  (2, 'Featured', 'Photos and coupons on top of everything in Listed.',
      4, true,  true,  true,  true,  true,  true)
on conflict (tier) do nothing;

-- ---------------------------------------------------------------------
-- The studios. One row per listing, per building.
--
-- `tier` is stored on the studio rather than read from the building so a
-- single studio can be moved up or down without touching its neighbors;
-- the building's default_tier only decides where a NEW one starts.
-- ---------------------------------------------------------------------
create table if not exists public.ss_studios (
  id            uuid primary key default gen_random_uuid(),
  building      text not null references public.ss_buildings(slug) on delete restrict,
  suite         text not null,
  name          text not null,
  contact_name  text not null default '',

  service       text not null default '',      -- the one-line service under the name
  category      text not null default 'hair',  -- hair | barber | nails | spa
  bio           text not null default '',
  tags          text[] not null default '{}',
  hours         text not null default '',

  phone         text not null default '',
  ok_to_text    boolean not null default true,
  email         text not null default '',
  show_email    boolean not null default false, -- submitted for us, not published by default
  booking_url   text not null default '',
  booking_label text not null default '',
  website       text not null default '',
  instagram     text not null default '',
  facebook      text not null default '',
  tiktok        text not null default '',

  photo         text not null default '',       -- profile photo
  photos        text[] not null default '{}',   -- up to 3 gallery shots
  photo_fit     text not null default 'cover',  -- cover | card (whole image, uncropped)

  tier          int  not null default 1 references public.ss_tier_settings(tier),
  status        text not null default 'draft',  -- draft | live | hidden
  source_lead   uuid,                           -- the ss_interest row it came from

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    text not null default ''
);

alter table public.ss_studios enable row level security;

-- Two studios can't hold the same suite in the same building at once.
-- Hidden rows are excluded so an old tenant can stay on file after a new
-- one moves into their suite.
create unique index if not exists ss_studios_one_per_suite
  on public.ss_studios (building, suite)
  where status <> 'hidden';

create index if not exists ss_studios_live_lookup
  on public.ss_studios (building, status);

-- ---------------------------------------------------------------------
-- Who changed what. "Us" means more than one person, and a directory
-- nobody can audit is one nobody can trust.
-- ---------------------------------------------------------------------
create table if not exists public.ss_admin_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  who         text not null default '',
  action      text not null,
  target      text not null default '',
  detail      jsonb not null default '{}'
);

alter table public.ss_admin_log enable row level security;

create index if not exists ss_admin_log_recent on public.ss_admin_log (at desc);

-- ---------------------------------------------------------------------
-- Coupon codes gain an owner. ss_suite_codes was written before studios
-- existed, so it keyed on suite alone; now a code belongs to a studio and
-- is generated when a coupon-tier studio is published.
-- ---------------------------------------------------------------------
alter table public.ss_suite_codes
  add column if not exists studio_id uuid references public.ss_studios(id) on delete cascade;

-- ---------------------------------------------------------------------
-- Seed: the studios currently hardcoded in data.js, so the panel opens
-- with the real directory in it rather than an empty grid.
-- Everything here matches what's live today.
-- ---------------------------------------------------------------------
insert into public.ss_studios
  (building, suite, name, contact_name, service, category, bio, tags, hours,
   phone, email, booking_url, booking_label, website, instagram, photo, photos, tier, status)
values
  ('salonplus', '103', 'Soul and Beauty Day Spa', 'Christina',
   'Day Spa', 'spa',
   'Christina specializes in therapeutic and medical massage, with anti-aging and hydra-facials and deep-clean facials alongside. Care that works below the surface.',
   array['Therapeutic Massage','Medical Massage','Hydra-Facial','Deep Clean Facial'], 'Tue–Sat 10–6',
   '(623) 915-1755', 'soulandbeautyspa@gmail.com', 'https://www.vagaro.com/soulandbeautydayspa', 'Vagaro', '',
   'soulandbeauty.dayspa',
   '/assets/photos/salonplus-103-soulandbeauty.png',
   array['/assets/photos/salonplus-103-soulandbeauty-facial.jpg','/assets/photos/salonplus-103-soulandbeauty-glow.jpg'],
   2, 'live'),

  ('salonplus', '212', 'True Story Tha Barber', 'True',
   'Barber', 'barber',
   'Award-winning barber work, consistent and detailed, at a price that respects your wallet. Come find out for yourself.',
   array['Barber','Cuts','Award-Winning'], 'Tue–Sun 10–7',
   '(330) 962-6676', 'skin2324@gmail.com', 'https://truestorythabarber.square.site', 'Square', '',
   'true_story_tha_barber_', '', '{}', 2, 'live'),

  ('salonplus', '301', 'Deuces Nail Studio', '',
   'Manicure · Pedicure · Nail Art', 'nails',
   'Sage-walled and softly lit, a quiet, careful place for nails done with intention. Gel, pedicures, nail art. Appointments preferred, walk-ins welcome when the chair is open.',
   array['Gel','Pedicure','Nail Art','Structured Mani'], 'Tue–Sat 10–6',
   '', '', '', '', '', '', '/assets/photos/1000040455.jpg', '{}', 2, 'live'),

  ('salonplus', '309', 'Cuts From The Heart', 'Leticia Gordon',
   'Cuts & Styling', 'hair',
   'Cuts and styling with Leticia Gordon, by appointment. One chair, one client, in the 300s wing.',
   array['Hair','Cuts','By Appointment'], 'By appointment',
   '(623) 335-6668', 'perezjalisco@outlook.com', '', '', '', '', '', '{}', 2, 'live'),

  ('salonplus', '311', 'Colour Me Beautiful LLC', 'Juanita A Salas',
   'Color & Styling', 'hair',
   'Colour and styling with Juanita Salas, Thursdays through Sundays. Book straight from her own page.',
   array['Hair','Colour','Styling'], 'Thu–Sun',
   '(602) 621-5196', 'colourmebeautifulllc@aol.com', 'https://juanitasalas.glossgenius.com/', 'GlossGenius', '',
   'colormebeautifulllc', '', '{}', 2, 'live'),

  ('salonplus', '312', 'Arizona Hair Replacement', 'Todd Donahue',
   'Non-Surgical Hair Replacement', 'hair',
   'Todd Donahue, hair technician. Non-surgical hair replacement for men and women, by appointment. The reason for it, in the words printed on his own card: look your best, feel your best.',
   array['Non-Surgical','Hair Replacement','Men & Women'], 'Mon–Thu 11–7 · Fri 11–4',
   '(602) 900-1057', 'arizonahair@outlook.com', '', '', 'https://www.arizonahairreplacement.com',
   '', '', '{}', 2, 'live')
on conflict do nothing;
