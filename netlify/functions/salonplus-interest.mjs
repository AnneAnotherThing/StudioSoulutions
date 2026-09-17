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
                            e.g. "Studio Soulutions <studiosoulutions@hive-rise.com>".
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
  demo:      'The Beauty Collective',
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
    /* True when the studio asked us to turn their facts into a polished
       bio; false when their words go on the card untouched. Old clients
       don't send it, and "help them" is the safe default for those. */
    bio_help:   p.bio_help !== false,
    /* 'new' or 'change'. One form, two jobs: a studio that isn't listed
       yet, and one that is and wants something fixed. */
    kind:       ['change', 'question', 'bug'].includes(p.kind) ? p.kind : 'new',
    building:   slug(clip(p.building, 60)) || 'salonplus',
    source:     clip(p.source, 40) || 'salonplus-web',
  };
  /* The form's building is free text; the buildings table is the truth.
     "The Beauty Collective" must land as its real slug (demo), not as
     slugified text no table knows, or the panel's dropdown can't
     preselect it and every generic-form lead asks to be re-picked.
     Anne's catch, waggle 2026-09-15. */
  row.building = await resolveBuilding(row.building);
  const buildingLabel = BUILDING_NAMES[row.building] || clip(p.building_label, 80) || row.building;

  const isMessage = row.kind === 'question' || row.kind === 'bug';
  /* Only a NEW listing needs the two names. A change request is matched
     by suite, so demanding a business and contact name there was friction
     for nothing. Laura's ask, Sep 2026. */
  if (row.kind === 'new' && (!row.business || !row.name)) {
    return json(400, { error: 'business and name are required' });
  }
  if (!row.phone && !row.email) {
    return json(400, { error: 'need a phone or an email' });
  }
  /* Without a suite we can't tell which listing to change, and without a
     description we'd be guessing at what they want. */
  if (row.kind === 'question' || row.kind === 'bug') {
    if (!row.notes) return json(400, { error: 'Tell us what you wanted to say.' });
  }
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
  const savedRow = saved ? results[0].value : null;
  const mailed = results[1].status === 'fulfilled';

  if (!saved && !mailed) {
    console.error('interest: both sinks failed',
      results.map(r => r.status === 'rejected' ? String(r.reason).slice(0, 300) : 'ok'));
    return json(502, { error: 'Could not record the submission. Please try again.' });
  }
  if (!saved)  console.warn('interest: supabase failed, email carried it', String(results[0].reason).slice(0, 300));
  if (!mailed) console.warn('interest: email failed, supabase carried it', String(results[1].reason).slice(0, 300));

  /* THE GATE IS GONE (Anne, after the 2026-09-15 meeting, superseding her
     earlier lock): a new signup with a suite goes live the moment it
     arrives, through the same publish pipeline the panel uses, so the
     code minting, the welcome letter and the Changes log all still
     happen. Any failure falls back to the old flow: the lead waits in
     the Inbox and nothing is lost. */
  let published = false, card = null;
  if (row.kind === 'new' && savedRow && savedRow.id && row.suite) {
    try {
      const pub = await autoPublish(savedRow.id, row, clip(p.bio, 400));
      if (pub && pub.ok) { published = true; card = { building: pub.studio.building, suite: pub.studio.suite }; }
    } catch (e) { console.warn('interest: auto-publish failed, lead waits in the inbox', String(e).slice(0, 300)); }
  }

  /* The receipt is a courtesy and must never fail the submission, but it
     failed invisibly once too often (Anne, waggle 2026-09-15: "customer
     emails aren't going out"), so it is awaited and its outcome rides
     along in the response where a test can read it. */
  let receipt = 'skipped';
  if (!isMessage) {
    try { await emailConfirmation(row, buildingLabel, published); receipt = row.email ? 'sent' : 'no email given'; }
    catch (e) {
      receipt = 'failed: ' + String(e).slice(0, 300);
      console.warn('interest: confirmation to submitter failed', String(e).slice(0, 300));
    }
  }

  return json(200, { ok: true, saved, mailed, receipt, published, card, kind: row.kind, photos: photoUrls.length });
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

  /* return=representation, because auto-publish needs the new row's id. */
  const insert = body => fetch(`${url}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
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
    const { photos, facebook, tiktok, kind, website, bio_help, ...base } = row;
    if (photos || facebook || tiktok || kind || website || bio_help !== undefined) {
      console.warn('interest: full insert failed, retrying with base columns', res.status);
      res = await insert(base);
    }
  }
  if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  try {
    const out = await res.json();
    return Array.isArray(out) ? out[0] : out;
  } catch { return null; }
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
  question: {
    accent: '#6B7A5F',
    eyebrow: b => `${b} · question`,
    heading: r => `A question from ${escHtml(r.business || r.name || 'a studio')}`,
    subject: (r, b) => `[QUESTION] ${b}: ${r.business || r.name || 'a studio'}`,
    lead: 'Someone asked something. Their question is below.',
  },
  bug: {
    accent: '#A8593E',
    eyebrow: b => `${b} · something is broken`,
    heading: r => `Problem reported by ${escHtml(r.business || r.name || 'a studio')}`,
    subject: (r, b) => `[BUG] ${b}: ${r.business || r.name || 'a studio'}`,
    lead: 'Someone reported something not working. What they said is below.',
  },
  change: {
    accent: '#A8593E',
    eyebrow: b => `${b} · change requested`,
    /* The business name is optional on a change now, so the suite carries
       the identity when the name wasn't given. */
    heading: r => `${escHtml(r.business || `Suite ${r.suite}`)} wants a change`,
    subject: (r, b) => r.business
      ? `[CHANGE] ${b}: ${r.business}${r.suite ? ` (Suite ${r.suite})` : ''}`
      : `[CHANGE] ${b}: Suite ${r.suite}`,
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
  const isMsg = row.kind === 'question' || row.kind === 'bug';
  const askHtml = (isChange || isMsg) && row.notes
    ? `<div style="margin:18px 0;padding:16px 18px;background:#FBF3EE;border-left:3px solid ${kind.accent};border-radius:0 10px 10px 0;">
         <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${kind.accent};margin-bottom:6px;">${isMsg ? (row.kind === 'bug' ? 'What is broken' : 'Their question') : 'What they want changed'}</div>
         <div style="font-size:15px;color:#33312D;font-weight:600;">${escHtml(row.notes)}</div>
       </div>`
    : '';

  const html = brandShell(buildingLabel, `
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:${kind.accent};margin:0;">${escHtml(kind.eyebrow(buildingLabel))}</p>
    <h2 style="font-weight:400;margin:6px 0 12px;font-size:24px;">${kind.heading(row)}</h2>
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
      ${(isChange || isMsg) ? '' : line('Facts', row.notes)}
      ${(isChange || isMsg) ? '' : line('Write-up', row.bio_help
        ? 'Write it for them: turn the facts into a bio (the admin panel button does it)'
        : 'Use their words exactly as written')}
    </table>
    ${photosHtml}
    <p style="margin-top:24px;font-size:14px;color:#6C685F;">
      ${isMsg
        ? `It's waiting in <a href="https://studiosoulutions.com/leads/" style="color:#6B7A5F;">the admin panel</a> under Questions.`
        : isChange
        ? `Open <a href="https://studiosoulutions.com/leads/" style="color:#6B7A5F;">the admin panel</a>, find Suite ${escHtml(row.suite || '')} and make the change.`
        : `Publish them from <a href="https://studiosoulutions.com/leads/" style="color:#6B7A5F;">the admin panel</a>.`}
    </p>`);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: [to], cc,
      /* Replying to a lead should reach the person who filled the form,
         not bounce off the noreply sender. */
      reply_to: row.email || undefined,
      subject: kind.subject(row, buildingLabel), html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/* A receipt, so nobody is left wondering whether the form worked. Sent to
   the studio, and never allowed to affect the response: a bounced
   confirmation must not make a good submission look like a failure. */
async function emailConfirmation(row, buildingLabel, published) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !row.email) return;
  const from = senderAddress();
  const isChange = row.kind === 'change';
  const first = row.name ? escHtml(row.name.split(' ')[0]) : '';
  /* Business name is optional on a change, so the suite stands in. */
  const who = row.business || (row.suite ? `Suite ${row.suite}` : 'your studio');

  /* The receipt is warm and concrete on purpose: it promises the welcome
     email by name, so nobody sits wondering whether anything is actually
     happening. Anne's note from the waggle run: "formlike, no you'll
     hear from us when you're added". */
  const nextStep = (n, text) => `
    <table style="border-collapse:collapse;margin-top:12px;"><tr>
      <td style="vertical-align:top;padding-right:12px;">
        <div style="width:26px;height:26px;border-radius:50%;background:#9A6B45;color:#FBF6EE;font-family:Inter,sans-serif;font-size:14px;font-weight:600;text-align:center;line-height:26px;">${n}</div>
      </td>
      <td style="vertical-align:top;font-size:14.5px;line-height:1.6;color:#33312D;">${text}</td>
    </tr></table>`;

  const html = brandShell(buildingLabel, isChange ? `
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#9A6B45;margin:0;">${escHtml(buildingLabel)}</p>
    <h2 style="font-weight:400;margin:6px 0 16px;font-size:24px;">We got your update</h2>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">
      Thanks${first ? ', ' + first : ''}. Your change for <strong>${escHtml(who)}</strong> is in, and someone will make it shortly.
    </p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Nothing more for you to do. If we need anything, we'll reach out directly.</p>
    <p style="font-size:14px;line-height:1.6;color:#6C685F;margin:0;">
      Questions in the meantime? Email the developer any time:
      <a href="mailto:anne@hive-rise.com" style="color:#6B7A5F;">anne@hive-rise.com</a>.
    </p>` : `
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#9A6B45;margin:0;">${escHtml(buildingLabel)}</p>
    <h2 style="font-weight:400;margin:6px 0 14px;font-size:24px;">${published ? `Welcome${first ? ', ' + first : ''}. You're on the map, right now.` : `Welcome${first ? ', ' + first : ''}. You're on the way to the map.`}</h2>
    <p style="font-size:15px;line-height:1.6;margin:0;">
      <strong>${escHtml(row.business)}</strong> is in, photos and all. Here's exactly what happens now:
    </p>
    ${published
      ? nextStep(1, `Your card is <strong>already live</strong> in the app, built from exactly what you sent. Go look.`)
        + nextStep(2, `Right behind this note comes your <strong>welcome letter</strong>: a link to your card, and your personal sign-in code.`)
        + nextStep(3, `That code makes the card yours: change your photos, hours and links yourself, any time, live the moment you save.`)
      : nextStep(1, `We build your card from what you just sent: your photos, your services, your hours. A real person does this, usually the same day.`)
        + nextStep(2, `The moment your card goes live, <strong>you'll hear from us</strong>: one more email, your welcome letter, with a link to see your card in the app and your personal sign-in code.`)
        + nextStep(3, `That code makes the card yours: from then on you can change your photos, hours and links yourself, any time, and it's live the moment you save.`)}
    <p style="font-size:15px;line-height:1.6;margin:14px 0 12px;">
      Until then there's nothing more for you to do. If we need anything to get your card just right, we'll reach out directly.
    </p>
    <p style="font-size:14px;line-height:1.6;color:#6C685F;margin:0;">
      Questions in the meantime? Email the developer any time:
      <a href="mailto:anne@hive-rise.com" style="color:#6B7A5F;">anne@hive-rise.com</a>.
    </p>`,
    `If this wasn't you, ignore this note and nothing happens.`);

  const body = JSON.stringify({
    from, to: [row.email],
    /* The sender is a noreply address, so a natural reply still lands
       somewhere a person reads. */
    reply_to: 'anne@hive-rise.com',
    subject: isChange ? `We got your update, ${who}` : `We got your details, ${row.business}`,
    html,
  });
  const send = () => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body,
  });
  let res = await send();
  /* The receipt follows the lead email within the same second, which can
     trip Resend's per-second rate limit. One polite retry covers it. */
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 700));
    res = await send();
  }
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/* One shell for every message this function sends: cream ground, soft
   card, the building's name up top and the Studio Soulutions mark below,
   so the mail reads as the same brand as the page they just used.
   Email-safe: tables and inline styles only, Georgia for the serif. */
function brandShell(buildingLabel, inner, footNote) {
  return `
  <div style="background:#F5EDE0;padding:28px 14px;">
    <div style="max-width:560px;margin:0 auto;font-family:Georgia,serif;color:#33312D;">
      <div style="background:#FBF6EE;border:1px solid #E5D9C3;border-radius:16px;padding:26px 28px;">
        ${inner}
      </div>
      <p style="text-align:center;margin:18px 0 0;font-size:12.5px;color:#918C81;">
        ${escHtml(buildingLabel)} &middot; powered by
        <a href="https://studiosoulutions.com" style="color:#9A6B45;text-decoration:none;">Studio Soulutions</a>
        ${footNote ? `<br>${footNote}` : ''}
      </p>
    </div>
  </div>`;
}

/* Publishes a fresh signup through the admin pipeline, server to server,
   so validation, code minting, the welcome email and the Changes log
   stay in exactly one place. The passcode never leaves this server. */
async function autoPublish(leadId, row, chosenBio) {
  const code = process.env.LEADS_CODE;
  if (!code) throw new Error('LEADS_CODE not set, cannot auto-publish');
  const base = process.env.URL || 'https://studiosoulutions.com';
  const studio = { building: row.building, suite: row.suite, status: 'live' };
  if (chosenBio) studio.bio = chosenBio.slice(0, 400);
  const res = await fetch(`${base}/api/salonplus-admin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'publishLead', code, who: 'auto-publish', leadId, studio }),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok) throw new Error((out && out.error) || `publish ${res.status}`);
  return out;
}

/* ----- utils ----------------------------------------------------------- */

/* Maps a slugified free-text building to a real building's slug, matching
   by slug or by slugified name. Any failure keeps the typed value: a lead
   is never blocked or lost over a nicety. */
async function resolveBuilding(candidate) {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key || !candidate) return candidate;
    const res = await fetch(`${url}/rest/v1/ss_buildings?select=slug,name&limit=100`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    if (!res.ok) return candidate;
    const rows = await res.json();
    if (!Array.isArray(rows)) return candidate;
    const hit = rows.find(b => b.slug === candidate || slug(b.name || '') === candidate);
    return hit ? hit.slug : candidate;
  } catch { return candidate; }
}

function clip(v, n) { return typeof v === 'string' ? v.trim().slice(0, n) : ''; }
function slug(v) { return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}
/* No silent fallback to Resend's shared test sender. It only ever delivers
   to the Resend account owner, so using it looks like working mail right up
   until someone else is meant to receive something. Better to fail in the
   log with a sentence that says what to do.
   The product sender is "Studio Soulutions <studiosoulutions@hive-rise.com>"
   (Anne's call, waggle 2026-09-14): no mailbox behind it, so it acts as
   noreply, and every email sets reply_to somewhere a person reads. */
function senderAddress() {
  const from = (process.env.RESEND_FROM || '').trim().replace(/^"+|"+$/g, '');
  if (!from) throw new Error(
    'RESEND_FROM is not set, so mail would go out from the shared Resend test sender, ' +
    'which only delivers to the Resend account owner. Set RESEND_FROM to an address on ' +
    'a domain verified in Resend, e.g. Studio Soulutions <studiosoulutions@hive-rise.com>.');
  /* A from with no address 422s every send. It happened for real: Netlify
     ended up holding just "Studio Soulutions" and all mail died quietly.
     A name-only value now gets the product address attached instead. */
  if (!from.includes('@')) return `${from.replace(/[<>"]/g, '').trim()} <studiosoulutions@hive-rise.com>`;
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
