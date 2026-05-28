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
  lobby_photo_url: 'assets/photos/1000040457.jpg',
  attract_loop_urls: [
    'assets/photos/1000040457.jpg',
    'assets/photos/1000040455.jpg',
    'assets/photos/1000040453.jpg',
    'assets/photos/1000040456.jpg',
  ],
  you_are_here_x: 50,
  you_are_here_y: 90,
};

const MOCK_TENANTS = [
  {
    id: 'mock-dueces',
    suite_number: '—',
    business_name: 'Dueces Nail Studio',
    owner_name: '',
    phone: '',
    services: ['nails', 'manicure', 'pedicure'],
    hero_photo_url: 'assets/photos/1000040455.jpg',
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
    hero_photo_url: 'assets/photos/1000040453.jpg',
    bio: 'Warm neutral suite — placeholder tenant card until Laura confirms the lineup.',
    map_x: 60, map_y: 40,
    status: 'active',
  },
];

const MOCK_POSTS = [
  {
    id: 'mock-welcome',
    type: 'welcome',
    title: 'Welcome Dueces Nail Studio',
    body: 'Newly opened in our sage-green suite — stop by and say hi.',
    published_at: new Date().toISOString(),
  },
];

/* ----- Mock-mode admin sync ----------------------------------------
   When the owner admin (admin.html) saves tenants/settings/posts in
   demo mode, they land in localStorage. The lobby surfaces read them
   here so admin edits show up in the kiosk + phone on next reload. */
function readAdminStore(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && (Array.isArray(parsed) ? parsed.length : true) ? parsed : null;
  } catch { return null; }
}

/* Shape adapter: admin uses {name, suite, ...} while Supabase rows use
   {business_name, suite_number, ...}. Map the admin shape into the row
   shape the kiosk renderer already expects. */
function adminTenantToRow(t) {
  return {
    id: t.id,
    business_name:  t.name,
    suite_number:   (t.suite || '').replace(/^Suite\s+/i, ''),
    owner_name:     t.owner_name || '',
    phone:          t.phone || '',
    services:       t.services || [],
    hero_photo_url: t.photo || '',
    bio:            t.bio || '',
    status:         t.status || 'active',
    open:           t.open !== false,
    // pass through extras the renderer may use
    name:           t.name,
    suite:          t.suite,
    photo:          t.photo,
    service:        t.service,
    category:       t.category,
    avatar:         t.avatar,
    theme:          t.theme,
    hours:          t.hours
  };
}

/* ----- Real fetchers (used once Supabase is provisioned) ----- */

export async function getStudio() {
  if (IS_MOCK) {
    const admin = readAdminStore('ss_studio_v1');
    if (admin) {
      return {
        ...MOCK_STUDIO,
        studio_name: admin.name || MOCK_STUDIO.studio_name,
        tagline:     admin.tagline || MOCK_STUDIO.tagline,
        about_text:  admin.about || MOCK_STUDIO.about_text,
        owner_note:  admin.owner_note || MOCK_STUDIO.owner_note
      };
    }
    return MOCK_STUDIO;
  }
  const { data, error } = await supabase
    .from('ss_studio_settings')
    .select('*')
    .eq('slug', STUDIO_SLUG)
    .single();
  if (error) { console.error(error); return MOCK_STUDIO; }
  return data;
}

export async function getTenants() {
  if (IS_MOCK) {
    const admin = readAdminStore('ss_tenants_v1');
    if (admin) return admin.filter(t => t.status !== 'archived').map(adminTenantToRow);
    return MOCK_TENANTS;
  }
  const { data, error } = await supabase
    .from('ss_tenants')
    .select('*')
    .eq('status', 'active')
    .order('sort_order', { ascending: true });
  if (error) { console.error(error); return MOCK_TENANTS; }
  return data;
}

export async function getCommunityPosts({ limit = 10 } = {}) {
  if (IS_MOCK) {
    const admin = readAdminStore('ss_posts_v1');
    if (admin) return admin.slice(0, limit);
    return MOCK_POSTS;
  }
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
