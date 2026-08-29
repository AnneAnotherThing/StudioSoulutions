/* =====================================================================
   Studio Soulutions, interest sheet (Netlify Function)
   Studio Soulutions platform build
   ---------------------------------------------------------------------
   Receives interest-form submissions from /salonplus and the generic
   /join form (any building) and does three things:
     1. Uploads any attached photos (1 profile + 3) to Supabase Storage
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
     RESEND_FROM            An address on a domain verified in Resend,
                            e.g. "Salon Plus Studios <hello@hive-rise.com>".
                            There is no fallback on purpose: the shared
                            Resend test sender only reaches the Resend
                            account owner, which looks like working mail
                            right up until it matters.
   Optional:
     LEAD_CC                add Anne's email to CC every lead
   ===================================================================== */

const TABLE  = 'ss_interest';
const BUCKET = 'ss-interest-photos';
const MAX_PHOTOS = 4;   // one profile shot + three for the gallery
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
    facebook:   clip(p.facebook, 200),
    tiktok:     clip(p.tiktok, 120),
    booking:    clip(p.booking, 300),
    website:    clip(p.website, 300),
    notes:      clip(p.notes, 2000),
    /* 'new' or 'change'. One form, two jobs: a studio that isn't listed
       yet, and one that is and wants something fixed. */
    kind:       p.kind === 'change' ? 'change' : 'new',
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
  /* Without a suite we can't tell which listing to change, and without a
     description we'd be guessing at what they want. */
  if (row.kind === 'change') {
    if (!row.suite) return json(400, { error: 'tell us your suite so we know which listing to change' });
    if (!row.notes) return json(400, { error: 'tell us what needs changing' });
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

  /* Deliberately not awaited into the result: the studio's receipt is a
     courtesy, and a bounce at their end must never read as a failure at
     ours. */
  emailConfirmation(row, buildingLabel)
    .catch(e => console.warn('interest: confirmation to submitter failed', String(e).slice(0, 200)));

  return json(200, { ok: true, saved, mailed, kind: row.kind, photos: photoUrls.length });
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
  if (!res.ok) {
    // If newer columns haven't been added to the table yet, don't lose the
    // lead: strip them and save the rest. kind and website belong in this
    // list too -- without them a change request against an un-migrated
    // table failed twice and was never saved at all, and only the email
    // carried it.
    const { photos, facebook, tiktok, kind, website, ...base } = row;
    if (photos || facebook || tiktok || kind || website) {
      console.warn('interest: full insert failed, retrying with base columns', res.status);
      res = await insert(base);
    }
  }
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/* ----- the two kinds of mail -------------------------------------------
   A new studio and an existing one asking for a change are different jobs
   for whoever reads the inbox, so they never look alike:

     new     bronze header, subject "Salon Plus Studios interest: ..."
     change  clay header,   subject "[CHANGE] Salon Plus Studios: ..."

   The bracketed prefix is deliberate and boring. It sorts, it searches,
   and it survives every mail client, which a pretty header does not. */
const KIND_STYLE = {
  new: {
    accent: '#9A6B45',
    eyebrow: b => b,
    heading: r => `New interest: ${escHtml(r.business)}`,
    subject: (r, b) => `${b} interest: ${r.business}${r.suite ? ` (Suite ${r.suite})` : ''}`,
    lead: '',
  },
  change: {
    accent: '#A8593E',
    eyebrow: b => `${b} · change requested`,
    heading: r => `${escHtml(r.business)} wants a change`,
    subject: (r, b) => `[CHANGE] ${b}: ${r.business}${r.suite ? ` (Suite ${r.suite})` : ''}`,
    lead: 'This studio is already listed. What they asked for is in the box below.',
  },
};

async function emailLead(row, buildingLabel, photoUrls) {
  const key = process.env.RESEND_API_KEY;
  const to  = process.env.LEAD_TO;
  if (!key || !to) throw new Error('RESEND_API_KEY / LEAD_TO not set');

  const from = senderAddress();
  const cc   = process.env.LEAD_CC ? [process.env.LEAD_CC] : undefined;
  const kind = KIND_STYLE[row.kind] || KIND_STYLE.new;
  const isChange = row.kind === 'change';

  const line = (label, val) => val
    ? `<tr><td style="padding:6px 14px 6px 0;color:#6C685F;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 0;color:#33312D;">${escHtml(val)}</td></tr>`
    : '';

  const photosHtml = photoUrls.length
    ? `<div style="margin-top:16px;">${photoUrls.map((u, i) =>
        `<a href="${u}" style="display:inline-block;margin:0 8px 8px 0;text-decoration:none;">
           <img src="${u}" width="120" style="border-radius:10px;display:block;border:${i === 0 ? '2px solid ' + kind.accent : '1px solid #E5D9C3'};" />
         </a>`).join('')}</div>`
    : '';

  /* On a change request the description IS the message, so it gets its own
     block above the details rather than being buried in the table. */
  const askHtml = isChange && row.notes
    ? `<div style="margin:18px 0;padding:16px 18px;background:#FBF3EE;border-left:3px solid ${kind.accent};border-radius:0 10px 10px 0;">
         <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${kind.accent};margin-bottom:6px;">What they want changed</div>
         <div style="font-size:15px;color:#33312D;font-weight:600;">${escHtml(row.notes)}</div>
       </div>`
    : '';

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#33312D;">
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:${kind.accent};">${escHtml(kind.eyebrow(buildingLabel))}</p>
    <h2 style="font-weight:400;margin:6px 0 12px;">${kind.heading(row)}</h2>
    ${kind.lead ? `<p style="margin:0 0 4px;color:#6C685F;font-size:14px;">${kind.lead}</p>` : ''}
    ${askHtml}
    <table style="font-size:15px;border-collapse:collapse;">
      ${line('Building', buildingLabel)}
      ${line('Suite', row.suite)}
      ${line('Contact', row.name)}
      ${line('Phone', row.phone ? row.phone + (row.ok_to_text ? ' (okay to text)' : ' (call, no text)') : '')}
      ${line('Email', row.email)}
      ${line('Hours', row.hours)}
      ${line('Services', row.services.join(', '))}
      ${line('Instagram', row.instagram)}
      ${line('Facebook', row.facebook)}
      ${line('TikTok', row.tiktok)}
      ${line('Website', row.website)}
      ${line('Booking', row.booking)}
      ${isChange ? '' : line('Notes', row.notes)}
    </table>
    ${photosHtml}
    <p style="margin-top:24px;font-size:14px;color:#6C685F;">
      ${isChange
        ? `Open <a href="https://studiosoulutions.com/leads/" style="color:#6B7A5F;">the admin panel</a>, find Suite ${escHtml(row.suite || '')} and make the change.`
        : `Publish them from <a href="https://studiosoulutions.com/leads/" style="color:#6B7A5F;">the admin panel</a>.`}
    </p>
    <p style="margin-top:14px;font-size:13px;color:#918C81;">Submitted through studiosoulutions.com</p>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], cc, subject: kind.subject(row, buildingLabel), html }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/* A receipt, so nobody is left wondering whether the form worked. Sent to
   the studio, and never allowed to affect the response: a bounced
   confirmation must not make a good submission look like a failure. */
async function emailConfirmation(row, buildingLabel) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !row.email) return;
  const from = senderAddress();
  const isChange = row.kind === 'change';
  const first = row.name ? escHtml(row.name.split(' ')[0]) : '';

  const html = `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#33312D;">
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#9A6B45;">${escHtml(buildingLabel)}</p>
    <h2 style="font-weight:400;margin:6px 0 16px;">${isChange ? 'We got your update' : 'We got your details'}</h2>
    <p style="font-size:15px;line-height:1.6;">
      Thanks${first ? ', ' + first : ''}. ${isChange
        ? `Your change for <strong>${escHtml(row.business)}</strong> is in, and someone will make it shortly.`
        : `<strong>${escHtml(row.business)}</strong> is on the list. Someone will set your listing up shortly, and you'll be on the map and in the app.`}
    </p>
    <p style="font-size:15px;line-height:1.6;">Nothing more for you to do. If we need anything, we'll reach out directly.</p>
    <p style="margin-top:22px;font-size:13px;color:#918C81;">
      Salon Plus Studios is listed by Studio Soulutions. If this wasn't you, ignore this note and nothing happens.
    </p>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: [row.email],
      subject: isChange ? `We got your update, ${row.business}` : `We got your details, ${row.business}`,
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
/* No silent fallback to Resend's shared test sender. It only ever delivers
   to the Resend account owner, so using it looks like working mail right up
   until someone else is meant to receive something. Better to fail in the
   log with a sentence that says what to do. */
function senderAddress() {
  const from = process.env.RESEND_FROM;
  if (!from) throw new Error(
    'RESEND_FROM is not set, so mail would go out from the shared Resend test sender, ' +
    'which only delivers to the Resend account owner. Set RESEND_FROM to an address on ' +
    'a domain verified in Resend, e.g. "Salon Plus Studios <hello@hive-rise.com>".');
  return from;
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
