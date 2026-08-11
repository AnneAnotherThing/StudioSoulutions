/* =====================================================================
   Studio Soulutions, Salon Plus submissions reader (Netlify Function)
   Studio Soulutions platform build
   ---------------------------------------------------------------------
   Serves interest-form submissions to the viewer page at
   /salonplus/leads.html. Reads ss_interest with the server-side service
   key, gated by a shared passcode, so the table never needs a public
   read policy and the anon key can't see leads.

   Required env vars (set in the Netlify dashboard):
     SUPABASE_URL           https://jxeynaiaibbmdkugstxc.supabase.co
     SUPABASE_SERVICE_KEY   service-role key (same as salonplus-interest)
     LEADS_CODE             the passcode the viewer page asks for
   ===================================================================== */

const TABLE = 'ss_interest';

export const config = { path: '/api/salonplus-leads' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let p;
  try { p = await request.json(); }
  catch { return json(400, { error: 'Invalid JSON body' }); }

  const expected = process.env.LEADS_CODE;
  if (!expected) return json(500, { error: 'LEADS_CODE is not set on this deployment.' });
  if (!p.code || p.code !== expected) return json(401, { error: 'Wrong passcode.' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return json(500, { error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY not set.' });

  const building = typeof p.building === 'string' && p.building ? p.building : 'salonplus';
  const query = `${url}/rest/v1/${TABLE}`
    + `?building=eq.${encodeURIComponent(building)}`
    + `&order=created_at.desc&limit=500`;

  const res = await fetch(query, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.error('leads: supabase read failed', res.status, (await res.text()).slice(0, 300));
    return json(502, { error: 'Could not load submissions.' });
  }

  return json(200, { rows: await res.json() });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders() },
  });
}
