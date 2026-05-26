/* =====================================================================
   Studio Soulutions — Supabase client
   Hive-Rise · shared between phone, kiosk, and admin views
   =====================================================================
   Env vars expected at build time (Netlify env, baked into a small
   /assets/js/env.js that defines window.SS_ENV = { SUPABASE_URL, SUPABASE_ANON_KEY }):
     SUPABASE_URL
     SUPABASE_ANON_KEY
   ===================================================================== */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ENV = (typeof window !== 'undefined' && window.SS_ENV) || {};

export const supabase = ENV.SUPABASE_URL
  ? createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY)
  : null;

/* Studio slug — single-tenant for now (Salon Plus). When Laura opens
   a second location, this becomes a route/subdomain param. */
export const STUDIO_SLUG = 'salon-plus';

/* Convenience flag for screens to render a "demo mode" banner
   when Supabase isn't wired up yet. */
export const IS_MOCK = !supabase;
