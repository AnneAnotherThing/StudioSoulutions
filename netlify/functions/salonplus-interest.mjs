/* =====================================================================
   Studio Soulutions, interest sheet (Netlify Function)
   Studio Soulutions platform build
   ---------------------------------------------------------------------
   Receives interest-form submissions from /salonplus and the generic
   /join form (any building) and does three things:
     1. Uploads any attached photos (up to 3) to Supabase Storage
     2. Inserts a row into the shared Supabase (ss_interest)
     3. Emails the lead to the building owner (Anne CC'd) via Resend

   Succeeds if EITHER sink works, so a mail hiccup never loses a lead
   and a DB hiccup never blocks the email. Fails only if both fail.
   Photo-upload failures never block the lead either.

   Required env vars (set in the Netlify dashboard):
     SUPABASE_URL           Anne's shared forms/leads Supabase project URL
     SUPABASE_SERVICE_KEY   service-role key (server-side only, never shipped)
     RESEND_API_KEY         Anne's Resend key
     LEAD_TO                who the lead email goes to
   Optional:
     LEAD_CC                add Anne's email to CC every lead
     RESEND_FROM            defaults to onboarding@resend.dev until a
                            sending domain is verified in Resend
   ===================================================================== */

const TABLE  = 'ss_interest';
const BUCKET = 'ss-interest-photos';
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;   // per photo, post-decode

/* Display names per building slug; buildings with their own pages add a
   line here. The generic /join form sends a building_label instead. */
const BUILDING_NAMES = {
  salonplus: 'Salon Plus Studios',
};

export const config = { path: ['/api/salonplus-interest', '/api/interest'] };

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
    building:   slug(clip(p.building, 60)) || 'salonplus',
    source:     clip(p.source, 40) || 'salonplus-web',
  };
  const buildingLabel = BUILDING_NAMES[row.building] || clip(p.building_label, 80) || row.building;

  if (!row.business || !row.name) {
    return json(400, { error: 'business and name are required' });
  }
  if (!row.phone && !row.email) {
    return json(400, { error: 'need a phone or an email' });
  }

  // Photos first, so both sinks can reference the URLs. A photo problem
  // never blocks the lead; we just carry on without the pictures.
  let photoUrls = [];
  try { photoUrls = await uploadPhotos(p.photos, row.building); }
  catch (e) { console.warn('interest: photo upload failed, lead continues without', String(e).slice(0, 300)); }
  if (photoUrls.length) row.photos = photoUrls;

  const results = await Promise.allSettled([
    saveToSupabase(row),
    emailLead(row, buildingLabel, photoUrls),
  ]);
  const saved  = results[0].status === 'fulfilled';
  const mailed = results[1].status === 'fulfilled';

  if (!saved && !mailed) {
    console.error('interest: both sinks failed',
      results.map(r => r.status === 'rejected' ? String(r.reason).slice(0, 300) : 'ok'));
    return json(502, { error: 'Could not record the submission. Please try again.' });
  }
  if (!saved)  console.warn('interest: supabase failed, email carried it', String(results[0].reason).slice(0, 300));
  if (!mailed) console.warn('interest: email failed, supabase carried it', String(results[1].reason).slice(0, 300));

  return json(200, { ok: true, saved, mailed, photos: photoUrls.length });
}

/* ----- photos ---------------------------------------------------------- */

async function uploadPhotos(photos, building) {
  if (!Array.isArray(photos) || !photos.length) return [];
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');

  const urls = [];
  for (const photo of photos.slice(0, MAX_PHOTOS)) {
    const data = typeof photo === 'string' ? photo : '';
    const m = data.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
    if (!m) continue;
    const bytes = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    if (bytes.length > MAX_PHOTO_BYTES) continue;
    const ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
    const objectKey = `${building}/${crypto.randomUUID()}.${ext}`;

    let res = await putObject(url, key, objectKey, bytes, m[1]);
    if (res.status === 400 || res.status === 404) {
      // Bucket probably doesn't exist yet; make it (public) and retry once.
      await fetch(`${url}/storage/v1/bucket`, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
      });
      res = await putObject(url, key, objectKey, bytes, m[1]);
    }
    if (!res.ok) throw new Error(`storage ${res.status}: ${(await res.text()).slice(0, 200)}`);
    urls.push(`${url}/storage/v1/object/public/${BUCKET}/${objectKey}`);
  }
  return urls;
}

function putObject(url, key, objectKey, bytes, contentType) {
  return fetch(`${url}/storage/v1/object/${BUCKET}/${objectKey}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': contentType, 'x-upsert': 'false' },
    body: bytes,
  });
}

/* ----- sinks ----------------------------------------------------------- */

async function saveToSupabase(row) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not set');

  const insert = body => fetch(`${url}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });

  let res = await insert(row);
  if (!res.ok && row.photos) {
    // If the photos column hasn't been added yet, don't lose the lead:
    // drop the photos from the row and save the rest.
    const { photos, ...rest } = row;
    console.warn('interest: insert with photos failed, retrying without', res.status);
    res = await insert(rest);
  }
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

async function emailLead(row, buildingLabel, photoUrls) {
  const key = process.env.RESEND_API_KEY;
  const to  = process.env.LEAD_TO;
  if (!key || !to) throw new Error('RESEND_API_KEY / LEAD_TO not set');

  const from = process.env.RESEND_FROM || 'Studio Soulutions <onboarding@resend.dev>';
  const cc   = process.env.LEAD_CC ? [process.env.LEAD_CC] : undefined;

  const line = (label, val) => val
    ? `<tr><td style="padding:6px 14px 6px 0;color:#6C685F;white-space:nowrap;">${label}</td><td style="padding:6px 0;color:#33312D;">${escHtml(val)}</td></tr>`
    : '';

  const photosHtml = photoUrls.length
    ? `<div style="margin-top:16px;">${photoUrls.map(u =>
        `<a href="${u}" style="display:inline-block;margin:0 8px 8px 0;"><img src="${u}" width="120" style="border-radius:10px;display:block;" /></a>`
      ).join('')}</div>`
    : '';

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#33312D;">
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#9A6B45;">${escHtml(buildingLabel)}</p>
    <h2 style="font-weight:400;margin:6px 0 18px;">New interest: ${escHtml(row.business)}</h2>
    <table style="font-size:15px;border-collapse:collapse;">
      ${line('Building', buildingLabel)}
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
    ${photosHtml}
    <p style="margin-top:22px;font-size:13px;color:#918C81;">Submitted through studiosoulutions.com</p>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], cc,
      subject: `${buildingLabel} interest: ${row.business}${row.suite ? ` (Suite ${row.suite})` : ''}`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/* ----- utils ----------------------------------------------------------- */

function clip(v, n) { return typeof v === 'string' ? v.trim().slice(0, n) : ''; }
function slug(v) { return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
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
