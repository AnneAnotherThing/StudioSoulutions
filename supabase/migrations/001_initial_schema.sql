-- =====================================================================
-- Studio Soulutions — Initial Schema
-- Hive-Rise · Cedar Lane Suites build
-- =====================================================================
-- This schema lives in the shared Hive-Rise Supabase project.
-- All Studio Soulutions tables are prefixed with `ss_` so they
-- coexist cleanly with the review-page tables and any future client work.
--
-- Designed so the same schema can serve a *second* building later
-- (Cedar Lane is just the first studio_settings row).
-- =====================================================================


-- ---------------------------------------------------------------------
-- studio_settings
-- Building-level config. One row per building (Cedar Lane = first).
-- Designed singleton-ish but keyed so we can add Laura's next location later.
-- ---------------------------------------------------------------------
create table if not exists ss_studio_settings (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,                 -- e.g. 'cedar-lane'
  studio_name         text not null,                        -- 'Studio Soulutions — Cedar Lane Suites'
  tagline             text,
  about_text          text,                                 -- 'About the Studio' body
  owner_note          text,                                 -- Laura's note from the owner
  contact_email       text,
  contact_phone       text,
  street_address      text,
  hours_json          jsonb,                                -- {mon: "9-5", tue: "9-5", ...}
  lobby_photo_url     text,                                 -- home-screen background
  attract_loop_urls   text[] default '{}',                  -- kiosk idle slideshow
  floor_plan_svg      text,                                 -- inline SVG for the interactive map
  you_are_here_x      numeric,                              -- lobby pin coords on the floor plan
  you_are_here_y      numeric,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);


-- ---------------------------------------------------------------------
-- ss_voice_profiles
-- Per-tenant brand voice the AI bio writer conditions on.
-- Lives separately from tenants so a tenant can revise their voice
-- without rewriting their bio.
-- ---------------------------------------------------------------------
create table if not exists ss_voice_profiles (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null,                        -- FK added after tenants exists
  tone_descriptors    text[] default '{}',                  -- ['warm', 'minimalist', 'playful']
  example_phrases     text,                                 -- a few sentences in their voice
  things_to_avoid     text,                                 -- words/phrasings they hate
  reading_level       text default 'conversational',        -- 'conversational' | 'polished' | 'casual'
  signature_words     text[] default '{}',                  -- words they always reach for
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);


-- ---------------------------------------------------------------------
-- ss_tenants
-- A salon/business renting a suite. The directory's core record.
-- ---------------------------------------------------------------------
create table if not exists ss_tenants (
  id                  uuid primary key default gen_random_uuid(),
  studio_id           uuid not null references ss_studio_settings(id) on delete cascade,
  suite_number        text not null,                        -- '101', '2A', etc.
  business_name       text not null,
  owner_name          text,
  phone               text,
  email               text,
  instagram           text,                                 -- handle without @
  website             text,
  services            text[] default '{}',                  -- ['color', 'extensions', 'lash']
  hours_json          jsonb,                                -- per-tenant hours override
  hero_photo_url      text,
  gallery_photo_urls  text[] default '{}',
  bio                 text,                                 -- the approved bio (from AI writer)
  voice_profile_id    uuid references ss_voice_profiles(id) on delete set null,
  map_x               numeric,                              -- position on floor plan
  map_y               numeric,
  status              text default 'active',                -- 'active' | 'coming_soon' | 'archived'
  sort_order          int default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (studio_id, suite_number)
);

-- backfill the voice_profiles FK now that ss_tenants exists
alter table ss_voice_profiles
  add constraint ss_voice_profiles_tenant_fk
  foreign key (tenant_id) references ss_tenants(id) on delete cascade;


-- ---------------------------------------------------------------------
-- ss_bios
-- Version history for AI-generated bios so we can compare, revert,
-- and see what input produced what output.
-- ---------------------------------------------------------------------
create table if not exists ss_bios (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references ss_tenants(id) on delete cascade,
  source_input        text,                                 -- what the salon submitted
  source_format       text,                                 -- 'text' | 'voice' | 'document'
  source_audio_url    text,                                 -- if voice, the recording
  generated_text      text,                                 -- raw LLM output
  edited_text         text,                                 -- after owner edits
  model_used          text,                                 -- 'claude-sonnet-4-6' etc.
  prompt_version      text,                                 -- so we can iterate prompts safely
  is_approved         boolean default false,
  approved_at         timestamptz,
  created_at          timestamptz default now()
);


-- ---------------------------------------------------------------------
-- ss_community_posts
-- The "Highlights" feed: welcomes, congratulations, owner updates,
-- building news. Laura edits this from the admin page.
-- ---------------------------------------------------------------------
create table if not exists ss_community_posts (
  id                  uuid primary key default gen_random_uuid(),
  studio_id           uuid not null references ss_studio_settings(id) on delete cascade,
  type                text not null,                        -- 'welcome'|'congratulations'|'building_news'|'owner_update'|'community_news'
  title               text not null,
  body                text,
  image_url           text,
  tenant_id           uuid references ss_tenants(id) on delete set null,  -- optional: link to a tenant
  is_published        boolean default true,
  sort_priority       int default 0,                        -- pin to top
  published_at        timestamptz default now(),
  expires_at          timestamptz,                          -- auto-archive old posts
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);


-- ---------------------------------------------------------------------
-- Indexes for the hot read paths
-- ---------------------------------------------------------------------
create index if not exists ss_tenants_studio_status_idx
  on ss_tenants (studio_id, status, sort_order);

create index if not exists ss_community_posts_studio_published_idx
  on ss_community_posts (studio_id, is_published, published_at desc);

create index if not exists ss_bios_tenant_approved_idx
  on ss_bios (tenant_id, is_approved, created_at desc);


-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function ss_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger ss_studio_settings_touch
    before update on ss_studio_settings
    for each row execute function ss_touch_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger ss_tenants_touch
    before update on ss_tenants
    for each row execute function ss_touch_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger ss_voice_profiles_touch
    before update on ss_voice_profiles
    for each row execute function ss_touch_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger ss_community_posts_touch
    before update on ss_community_posts
    for each row execute function ss_touch_updated_at();
exception when duplicate_object then null; end $$;


-- ---------------------------------------------------------------------
-- Row Level Security
-- Public can READ active/published content.
-- Authenticated admins can do everything (Laura's account).
-- ---------------------------------------------------------------------
alter table ss_studio_settings    enable row level security;
alter table ss_tenants            enable row level security;
alter table ss_voice_profiles     enable row level security;
alter table ss_bios               enable row level security;
alter table ss_community_posts    enable row level security;

-- Public read policies (the lobby kiosk + phone QR users are anonymous)
create policy ss_studio_settings_public_read on ss_studio_settings
  for select using (true);

create policy ss_tenants_public_read on ss_tenants
  for select using (status = 'active');

create policy ss_community_posts_public_read on ss_community_posts
  for select using (
    is_published = true
    and (expires_at is null or expires_at > now())
  );

-- voice_profiles + bios are admin-only (no public read)
-- The bio that's shown publicly lives on ss_tenants.bio (already covered above).

-- Authenticated admin policies (Laura logs in via Supabase Auth)
create policy ss_studio_settings_admin_all on ss_studio_settings
  for all to authenticated using (true) with check (true);

create policy ss_tenants_admin_all on ss_tenants
  for all to authenticated using (true) with check (true);

create policy ss_voice_profiles_admin_all on ss_voice_profiles
  for all to authenticated using (true) with check (true);

create policy ss_bios_admin_all on ss_bios
  for all to authenticated using (true) with check (true);

create policy ss_community_posts_admin_all on ss_community_posts
  for all to authenticated using (true) with check (true);


-- ---------------------------------------------------------------------
-- Storage bucket for photos (run once via Supabase dashboard or CLI):
--   - Bucket name: ss-photos
--   - Public: true (so the kiosk can render without auth)
--   - Policies: authenticated can insert/update/delete; anon can select
-- (Bucket creation is not idempotent in pure SQL — handle via dashboard.)
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- Seed: the Cedar Lane studio row so we have something to attach to.
-- ---------------------------------------------------------------------
insert into ss_studio_settings (slug, studio_name, tagline)
values (
  'salon-plus',
  'Studio Soulutions — Salon Plus Studio Suites',
  'A home for the people who make people feel at home.'
)
on conflict (slug) do nothing;
