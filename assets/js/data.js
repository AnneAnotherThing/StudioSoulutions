/* =====================================================================
   Studio Soulutions — Data layer
   All reads go through here so phone, kiosk, and admin stay in sync.
   Falls back to mock data when Supabase isn't configured yet,
   so the UI is buildable before the DB is provisioned.
   ===================================================================== */

import { supabase, STUDIO_SLUG, IS_MOCK } from './supabase-client.js';

/* ----- Mock data (used until Supabase env vars land) ----- */
const MOCK_STUDIO = {
  slug: 'salon-plus',
  studio_name: 'Studio Soulutions — Salon Plus Studio Suites',
  tagline: 'A home for the people who make people feel at home.',
  about_text: 'A community of independent stylists, nail artists, and wellness pros — each with their own suite and their own story.',
  owner_note: '— Laura',
  lobby_photo_url: '/assets/photos/1000040457.jpg',
  attract_loop_urls: [
    '/assets/photos/1000040457.jpg',
    '/assets/photos/1000040455.jpg',
    '/assets/photos/1000040453.jpg',
    '/assets/photos/1000040456.jpg',
  ],
  you_are_here_x: 50,
  you_are_here_y: 90,
};

const MOCK_TENANTS = [
  {
    id: 'mock-queenes',
    suite_number: '—',
    business_name: 'QueeneS Nail Studio',
    owner_name: '',
    phone: '',
    services: ['nails', 'manicure', 'pedicure'],
    hero_photo_url: '/assets/photos/1000040455.jpg',
    bio: 'Sage-walled and softly lit — a quiet, careful place for nails done with intention.',
    map_x: 30, map_y: 40,
    status: 'active',
  },
  {
    id: 'mock-pedi-1',
    suite_number: '—',
    business_name: 'Suite (placeholder)',
    owner_name: '',
    phone: '',
    services: ['pedicure', 'lash'],
    hero_photo_url: '/assets/photos/1000040453.jpg',
    bio: 'Warm neutral suite — placeholder tenant card until Laura confirms the lineup.',
    map_x: 60, map_y: 40,
    status: 'active',
  },
];

const MOCK_POSTS = [
  {
    id: 'mock-welcome',
    type: 'welcome',
    title: 'Welcome QueeneS Nail Studio',
    body: 'Newly opened in our sage-green suite — stop by and say hi.',
    published_at: new Date().toISOString(),
  },
];

/* ----- Real fetchers (used once Supabase is provisioned) ----- */

export async function getStudio() {
  if (IS_MOCK) return MOCK_STUDIO;
  const { data, error } = await supabase
    .from('ss_studio_settings')
    .select('*')
    .eq('slug', STUDIO_SLUG)
    .single();
  if (error) { console.error(error); return MOCK_STUDIO; }
  return data;
}

export async function getTenants() {
  if (IS_MOCK) return MOCK_TENANTS;
  const { data, error } = await supabase
    .from('ss_tenants')
    .select('*')
    .eq('status', 'active')
    .order('sort_order', { ascending: true });
  if (error) { console.error(error); return MOCK_TENANTS; }
  return data;
}

export async function getCommunityPosts({ limit = 10 } = {}) {
  if (IS_MOCK) return MOCK_POSTS;
  const { data, error } = await supabase
    .from('ss_community_posts')
    .select('*')
    .eq('is_published', true)
    .order('sort_priority', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) { console.error(error); return MOCK_POSTS; }
  return data;
}
