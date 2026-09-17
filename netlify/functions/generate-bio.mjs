/* =====================================================================
   Studio Soulutions, AI bio generator (Netlify Function)
   Studio Soulutions platform build
   ---------------------------------------------------------------------
   Takes a tenant's rough notes + a few structured fields, asks Claude to
   write three polished bio variants in distinct tones (warm, editorial,
   friendly), and returns them as JSON the admin can drop straight into
   the editor.

   Gated by LEADS_CODE, the same passcode as the admin panel. Every call
   costs money, so this must never be open to the internet.

   Required env var:  ANTHROPIC_API_KEY   (set in the Netlify dashboard,
                                          Site settings > Environment variables)

   Optional env var:  ANTHROPIC_MODEL     (defaults to claude-sonnet-4-6)
   ===================================================================== */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

export const config = { path: '/api/generate-bio' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let payload;
  try { payload = await request.json(); }
  catch { return json(400, { error: 'Invalid JSON body' }); }

  /* This endpoint spends real money on every call. Two doors: the admin
     passcode (the panel and the portal-side callers), or the public
     join-form lane, added 2026-09-17 so a studio picks its own bio while
     signing up. The public lane is capped hard per day and fails closed,
     because an open generation endpoint is a bill waiting to happen. */
  const expected = process.env.LEADS_CODE;
  if (!expected) return json(500, { error: 'LEADS_CODE is not set on this deployment.' });
  const isAdmin = typeof payload.code === 'string' && payload.code === expected;
  if (!isAdmin) {
    if (payload.public !== true) return json(401, { error: 'Wrong passcode.' });
    const gate = await publicGate();
    if (!gate.ok) return json(429, { error: gate.error });
  }

  const {
    name        = '',
    input       = '',
    services    = [],
    suite       = '',
    hours       = '',
  } = payload;

  if (!input.trim() && !name.trim()) {
    return json(400, { error: 'Need at least a name or a few rough notes to write a bio.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(500, {
      error: 'ANTHROPIC_API_KEY is not set on this deployment. Set it in the Netlify dashboard and redeploy.'
    });
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const system = [
    "You are a copywriter for Studio Soulutions, a directory app that lives on touchscreen kiosks and phones inside salon-suite buildings.",
    "Each tenant inside a salon-suite building gets a short bio in the directory, 1 to 3 sentences max.",
    "House voice: warm, calming, neutral, never pushy, beauty-industry-appropriate. Lean into natural language like 'softly lit', 'considered', 'careful'. Avoid corporate cliches and exclamation points.",
    "The bio runs under the tenant's name on a kiosk a stranger is reading in a lobby, so it should explain who they are, what they do, and the feeling of being in their suite. No marketing fluff, no 'we are passionate about', no superlatives.",
    "When given rough notes from the tenant, preserve their actual specialties and tone preferences. When the input is sparse, write something honest and inviting rather than invented details.",
    "Return THREE distinct bio variants in three different tones. Output strict JSON with this exact shape:",
    `{ "bios": [`,
    `  { "tone": "Warm & welcoming",     "text": "..." },`,
    `  { "tone": "Editorial / minimal",  "text": "..." },`,
    `  { "tone": "Friendly & approachable", "text": "..." }`,
    `] }`,
    "No markdown, no preamble, no explanation outside the JSON."
  ].join('\n');

  const userBlocks = [
    name           ? `Business name: ${name}`                              : null,
    suite          ? `Suite / room: ${suite}`                              : null,
    services?.length ? `Services: ${services.join(', ')}`                   : null,
    hours          ? `Hours: ${hours}`                                      : null,
    input?.trim()  ? `Notes from the tenant (their own words):\n"${input.trim()}"` : null,
  ].filter(Boolean).join('\n\n');

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system,
        messages: [{ role: 'user', content: userBlocks }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return json(res.status, { error: 'Anthropic API error', detail: errBody.slice(0, 500) });
    }

    const data  = await res.json();
    const text  = data.content?.[0]?.text || '';

    let parsed;
    try {
      // Defensive: strip any accidental code fences if the model wraps the JSON.
      const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
      parsed = JSON.parse(stripped);
    } catch (parseErr) {
      return json(502, { error: 'Model did not return valid JSON', raw: text.slice(0, 800) });
    }

    if (!parsed || !Array.isArray(parsed.bios) || parsed.bios.length === 0) {
      return json(502, { error: 'Model response missing expected bios array', raw: text.slice(0, 800) });
    }

    return json(200, {
      bios:       parsed.bios,
      model_used: model,
      usage:      data.usage || null,
    });

  } catch (err) {
    return json(500, { error: 'Network / function error', detail: String(err).slice(0, 500) });
  }
}

/* The public lane's daily cap, counted in the admin Changes log so no
   new table is needed. Fails closed: no ledger, no free generations. */
const PUBLIC_BIOS_PER_DAY = 50;
async function publicGate() {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) return { ok: false, error: 'The write-it-now helper is resting. Type your facts and we polish them after you submit.' };
    const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${url}/rest/v1/ss_admin_log?action=eq.public%20bio&at=gte.${today}T00:00:00Z&select=id&limit=${PUBLIC_BIOS_PER_DAY + 1}`, { headers });
    if (!res.ok) return { ok: false, error: 'The write-it-now helper is resting. Type your facts and we polish them after you submit.' };
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length >= PUBLIC_BIOS_PER_DAY) {
      return { ok: false, error: 'The write-it-now helper has done its work for today. Type your facts and we polish them after you submit.' };
    }
    await fetch(`${url}/rest/v1/ss_admin_log`, {
      method: 'POST', headers,
      body: JSON.stringify({ who: 'join form', action: 'public bio', target: '', detail: {} }),
    });
    return { ok: true };
  } catch {
    return { ok: false, error: 'The write-it-now helper is resting. Type your facts and we polish them after you submit.' };
  }
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
