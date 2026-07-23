/* =====================================================================
   Studio Soulutions, Salon Plus interest sheet (Cloudflare Pages Function)
   Studio Soulutions platform build
   ---------------------------------------------------------------------
   Receives interest-form submissions from /salonplus and does two things:
     1. Inserts a row into the shared Hive-Rise Supabase (ss_interest)
     2. Emails the lead to Laura (Anne CC'd) via Resend

   Succeeds if EITHER sink works, so a mail hiccup never loses a lead
   and a DB hiccup never blocks the email. Fails only if both fail.

   Required env vars (set in the Cloudflare Pages dashboard):
     SUPABASE_URL           shared Hive-Rise project URL
     SUPABASE_SERVICE_KEY   service-role key (server-side only, never shipped)
     RESEND_API_KEY         Anne's Resend key
     LEAD_TO                Laura's email
   Optional:
     LEAD_CC                add Anne's email to CC every lead
     RESEND_FROM            defaults to onboarding@resend.dev until the
                            studiosoulutions.com domain is verified in Resend
   ===================================================================== */

const TABLE = 'ss_interest';

/* Display names per building slug; future buildings add one line here. */
const BUILDING_NAMES = {
  salonplus: 'Salon Plus Studios',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  let p;
  try { p = await request.json(); }
  catch { return json(400, { error: 'Invalid JSON body' }); }

  // Honeypot: bots fill the hidden field, humans never see it.
  // Return success so the bot moves on, store nothing.
  if (p.hp) return json(200, { ok: true });

  const row = {
    business:   clip(p.business, 120),
    suite:      clip(p.suite, 20),
    name:       clip(p.name, 120),
    phone:      clip(p.phone, 40),
    ok_to_text: !!p.ok_to_text,
    email:      clip(p.email, 160),
    hours:      clip(p.hours, 120),
    services:   Array.isArray(p.services) ? p.services.slice(0, 10).map(s => clip(s, 40)) : [],
    instagram:  clip(p.instagram, 120),
    booking:    clip(p.booking, 300),
    notes:      clip(p.notes, 2000),
    building:   clip(p.building, 40) || 'salonplus',
    source:     clip(p.source, 40) || 'salonplus-web',
  };

  if (!row.business || !row.name) {
    return json(400, { error: 'business and name are required' });
  }
  if (!row.phone && !row.email) {
    return json(400, { error: 'need a phone or an email' });
  }

  const results = await Promise.allSettled([saveToSupabase(env, row), emailLead(env, row)]);
  const saved  = results[0].status === 'fulfilled';
  const mailed = results[1].status === 'fulfilled';

  if (!saved && !mailed) {
    console.error('interest: both sinks failed',
      results.map(r => r.status === 'rejected' ? String(r.reason).slice(0, 300) : 'ok'));
    return json(502, { error: 'Could not record the submission. Please try again.' });
  }
  if (!saved)  console.warn('interest: supabase failed, email carried it', String(results[0].reason).slice(0, 300));
  if (!mailed) console.warn('interest: email failed, supabase carried it', String(results[1].reason).slice(0, 300));

  return json(200, { ok: true, saved, mailed });
}

async function saveToSupabase(env, row) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');

  const res = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function emailLead(env, row) {
  const key = env.RESEND_API_KEY;
  const to  = env.LEAD_TO;
  if (!key || !to) throw new Error('RESEND_API_KEY / LEAD_TO not set');

  const from = env.RESEND_FROM || 'Studio Soulutions <onboarding@resend.dev>';
  const cc   = env.LEAD_CC ? [env.LEAD_CC] : undefined;

  const line = (label, val) => val
    ? `<tr><td style="padding:6px 14px 6px 0;color:#6C685F;white-space:nowrap;">${label}</td><td style="padding:6px 0;color:#33312D;">${escHtml(val)}</td></tr>`
    : '';

  const buildingName = BUILDING_NAMES[row.building] || row.building;
  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#33312D;">
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#9A6B45;">${escHtml(buildingName)}</p>
    <h2 style="font-weight:400;margin:6px 0 18px;">New interest: ${escHtml(row.business)}</h2>
    <table style="font-size:15px;border-collapse:collapse;">
      ${line('Suite', row.suite)}
      ${line('Contact', row.name)}
      ${line('Phone', row.phone ? row.phone + (row.ok_to_text ? ' (okay to text)' : ' (call, no text)') : '')}
      ${line('Email', row.email)}
      ${line('Hours', row.hours)}
      ${line('Services', row.services.join(', '))}
      ${line('Instagram', row.instagram)}
      ${line('Booking', row.booking)}
      ${line('Notes', row.notes)}
    </table>
    <p style="margin-top:22px;font-size:13px;color:#918C81;">Submitted through studiosoulutions.com/salonplus</p>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], cc,
      subject: `${buildingName} interest: ${row.business}${row.suite ? ` (Suite ${row.suite})` : ''}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

function clip(v, n) { return typeof v === 'string' ? v.trim().slice(0, n) : ''; }
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
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
