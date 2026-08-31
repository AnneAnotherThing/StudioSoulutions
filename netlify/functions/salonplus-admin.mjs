/* =====================================================================
   Studio Soulutions, directory admin (Netlify Function)
   ---------------------------------------------------------------------
   The write side of the directory. Everything the admin panel does comes
   through here, and one action, `directory`, is public because it's what
   the app itself reads.

   The rule that matters: TIER GATING HAPPENS HERE, not in the browser.
   A tier that isn't allowed photos doesn't get photos stripped by CSS,
   it never receives the URLs. Same reasoning as the offer composer,
   the client is not where a rule gets to live.

   Actions (POST /api/salonplus-admin):
     directory   public. Live studios for a building, tier-gated, shaped
                 for the app.
     unlock      passcode. Everything the panel renders: buildings, tier
                 settings, studios, unconverted leads, recent changes.
     saveStudio  passcode. Insert or update one studio.
     publishLead passcode. Turn an interest-form row into a studio, and
                 mint an offer code if the tier allows offers.
     setStatus   passcode. draft / live / hidden.
     saveTiers   passcode. Rewrite what each tier is allowed to show.
     saveBuilding passcode. Add or edit a shopping center.
     studioPortal  SUITE CODE, not the passcode. A studio's own listing
                   plus what its tier allows it to edit.
     studioSave    SUITE CODE. The studio edits itself; applies at once,
                   Anne is emailed the before-and-after.
     mailCheck   passcode. Asks Resend to send one message to LEAD_TO and
                 reports exactly what Resend said, so a mail problem is
                 diagnosed instead of guessed at.

   Required env vars:
     SUPABASE_URL, SUPABASE_SERVICE_KEY, LEADS_CODE
   ===================================================================== */

const STUDIOS   = 'ss_studios';
const BUILDINGS = 'ss_buildings';
const TIERS     = 'ss_tier_settings';
const LEADS     = 'ss_interest';
const CODES     = 'ss_suite_codes';
const LOG       = 'ss_admin_log';

const CATEGORIES = ['hair', 'barber', 'nails', 'spa'];
const STATUSES   = ['draft', 'live', 'hidden'];
const PHOTO_FITS = ['cover', 'card'];

export const config = { path: '/api/salonplus-admin' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });
  if (request.method !== 'POST')    return json(405, { error: 'Method not allowed' });

  let p;
  try { p = await request.json(); }
  catch { return json(400, { error: 'Invalid JSON body' }); }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return json(500, { error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY not set.' });
  const db = supabase(url, key);

  // The only action that doesn't need the passcode.
  if (p.action === 'directory') return directory(db, p);

  /* A studio signing in to its own listing uses its suite code, not the
     admin passcode, so these are routed ahead of that gate. */
  if (p.action === 'studioPortal') return studioPortal(db, p);
  if (p.action === 'studioSave')   return studioSave(db, p);

  const expected = process.env.LEADS_CODE;
  if (!expected) return json(500, { error: 'LEADS_CODE is not set on this deployment.' });
  if (str(p.code) !== expected) return json(401, { error: 'Wrong passcode.' });

  switch (p.action) {
    case 'unlock':       return unlock(db, p);
    case 'saveStudio':   return saveStudio(db, p);
    case 'publishLead':  return publishLead(db, p);
    case 'setStatus':    return setStatus(db, p);
    case 'markHandled':  return markHandled(db, p);
    case 'mailCheck':    return mailCheck(db, p);
    case 'saveTiers':    return saveTiers(db, p);
    case 'saveBuilding': return saveBuilding(db, p);
    default:             return json(400, { error: 'Unknown action.' });
  }
}

/* ============ public: what the app reads ============================== */
async function directory(db, p) {
  const building = str(p.building) || 'salonplus';

  const [studios, tiers] = await Promise.all([
    db.get(STUDIOS, { building: `eq.${building}`, status: 'eq.live', order: 'suite.asc', limit: '300' }),
    db.get(TIERS,   { order: 'tier.asc' }),
  ]);
  if (!studios || !tiers) return json(502, { error: 'Could not load the directory.' });

  const byTier = Object.fromEntries(tiers.map(t => [t.tier, t]));
  return json(200, { rows: studios.map(s => publicShape(s, byTier[s.tier])) });
}

/* Everything a tier isn't allowed to show is dropped before it leaves the
   server. If the settings page turns photos off for tier 1 tomorrow, tier 1
   cards go back to initials on the next load, with no deploy. */
function publicShape(s, tier) {
  const allow = tier || { photos_max: 0, allow_coupons: false, allow_contact: true,
                          allow_booking: true, allow_socials: true, allow_bio: true, allow_hours: true };
  const photosMax = Math.max(0, allow.photos_max | 0);
  const gallery = photosMax > 1 ? (s.photos || []).slice(0, photosMax - 1) : [];

  return {
    suite:     s.suite,
    name:      s.name,
    service:   s.service,
    category:  CATEGORIES.includes(s.category) ? s.category : 'hair',
    bio:       allow.allow_bio   ? s.bio   : '',
    tags:      s.tags || [],
    hours:     allow.allow_hours ? s.hours : '',
    tier:      s.tier,

    photo:     photosMax > 0 ? (s.photo || '') : '',
    photos:    gallery,
    photoFit:  PHOTO_FITS.includes(s.photo_fit) ? s.photo_fit : 'cover',

    call:      allow.allow_contact ? s.phone : '',
    text:      allow.allow_contact && s.ok_to_text ? s.phone : '',
    email:     allow.allow_contact && s.show_email ? s.email : '',
    book:      allow.allow_booking ? s.booking_url   : '',
    bookLabel: allow.allow_booking ? s.booking_label : '',
    site:      allow.allow_booking ? s.website : '',

    instagram: allow.allow_socials ? s.instagram : '',
    facebook:  allow.allow_socials ? s.facebook  : '',
    tiktok:    allow.allow_socials ? s.tiktok    : '',
  };
}

/* ============ unlock: one call, everything the panel renders =========== */
async function unlock(db) {
  const [buildings, tiers, studios, leads, log, codes] = await Promise.all([
    db.get(BUILDINGS, { order: 'name.asc' }),
    db.get(TIERS,     { order: 'tier.asc' }),
    db.get(STUDIOS,   { order: 'building.asc,suite.asc', limit: '500' }),
    db.get(LEADS,     { order: 'created_at.desc', limit: '200' }),
    db.get(LOG,       { order: 'at.desc', limit: '40' }),
    db.get(CODES,     { order: 'suite.asc', limit: '500' }),
  ]);
  if (!buildings || !tiers || !studios) return json(502, { error: 'Could not load the directory.' });

  /* A lead is "handled" once a studio points back at it. The panel shows
     the rest as the inbox. */
  const claimed = new Set(studios.map(s => s.source_lead).filter(Boolean));
  /* A change request is finished when someone says so, since nothing new
     gets created to point back at it. */
  const isOpen = l => !claimed.has(l.id) && !l.handled_at;
  return json(200, {
    ok: true,
    buildings, tiers, studios,
    /* Offer codes come back with everything else. They used to be shown
       once, in an alert at publish time, and were then unfindable — which
       made "what's Suite 4417's code again?" a question only the database
       could answer. A code is a posting password for one studio, not a
       secret from the person running the building. */
    codes: (codes || []).map(c => ({
      suite: c.suite, building: c.building, studio: c.studio,
      code: c.code, can_post: c.can_post !== false,
    })),
    /* Everything is returned, flagged. Hiding processed submissions is a
       view, not a deletion: "what did that studio originally send us?" is
       a question worth being able to answer months later. */
    leads: (leads || []).map(l => ({ ...l, processed: !isOpen(l) })),
    log: log || [],
  });
}

/* ============ studios ================================================= */
async function saveStudio(db, p) {
  const s = p.studio && typeof p.studio === 'object' ? p.studio : null;
  if (!s) return json(400, { error: 'No studio sent.' });

  const row = await cleanStudio(db, s);
  if (row.error) return json(400, { error: row.error });

  let saved;
  if (str(s.id)) {
    if (!isUuid(str(s.id))) return json(400, { error: 'Bad studio id.' });
    saved = await db.patchReturning(STUDIOS, { id: `eq.${str(s.id)}` },
      { ...row.value, updated_at: nowIso(), updated_by: str(p.who) });
  } else {
    saved = await db.insert(STUDIOS, { ...row.value, updated_by: str(p.who) });
  }
  if (!saved) return json(502, { error: 'Could not save. Is that suite already taken in this building?' });

  await log(db, p, str(s.id) ? 'edit studio' : 'add studio', `${saved.building} ${saved.suite}`, { name: saved.name });
  await syncCouponCode(db, saved);
  if (saved.status === 'live') emailWelcome(db, saved).catch(e => console.warn('admin: welcome mail failed', String(e).slice(0, 200)));
  return json(200, { ok: true, studio: saved });
}

async function setStatus(db, p) {
  const id = str(p.id), status = str(p.status);
  if (!isUuid(id))                return json(400, { error: 'Bad studio id.' });
  if (!STATUSES.includes(status)) return json(400, { error: 'Unknown status.' });

  const saved = await db.patchReturning(STUDIOS, { id: `eq.${id}` },
    { status, updated_at: nowIso(), updated_by: str(p.who) });
  if (!saved) return json(502, { error: 'Could not change the status.' });

  await log(db, p, 'status ' + status, `${saved.building} ${saved.suite}`, { name: saved.name });
  /* Going live is the moment worth telling them about, and it carries
     their portal code. Fires once; notified_at makes sure of that. */
  if (status === 'live') emailWelcome(db, saved).catch(e => console.warn('admin: welcome mail failed', String(e).slice(0, 200)));
  return json(200, { ok: true, studio: saved });
}

/* Turn a submission into a listing. The panel sends any corrections
   alongside, so a wrong suite or a misspelled name is fixed on the way in
   rather than after. */
async function publishLead(db, p) {
  const leadId = str(p.leadId);
  if (!isUuid(leadId)) return json(400, { error: 'Bad lead id.' });

  const leads = await db.get(LEADS, { id: `eq.${leadId}`, limit: '1' });
  if (!leads)       return json(502, { error: 'Could not read that submission.' });
  const lead = leads[0];
  if (!lead)        return json(404, { error: 'That submission is gone.' });

  const edits = p.studio && typeof p.studio === 'object' ? p.studio : {};
  const merged = {
    building:     edits.building     ?? lead.building ?? '',
    suite:        edits.suite        ?? lead.suite ?? '',
    name:         edits.name         ?? lead.business ?? '',
    contact_name: edits.contact_name ?? lead.name ?? '',
    phone:        edits.phone        ?? lead.phone ?? '',
    ok_to_text:   edits.ok_to_text   ?? lead.ok_to_text ?? true,
    email:        edits.email        ?? lead.email ?? '',
    hours:        edits.hours        ?? lead.hours ?? '',
    /* Their notes are raw material, not a bio. "Walk ins from 8am to noon"
       is a useful fact and a terrible thing to print under a studio name,
       so it stays in the submission and the bio is written from it in the
       panel instead. */
    bio:          edits.bio ?? '',
    instagram:    edits.instagram    ?? lead.instagram ?? '',
    facebook:     edits.facebook     ?? lead.facebook ?? '',
    tiktok:       edits.tiktok       ?? lead.tiktok ?? '',
    booking_url:  edits.booking_url  ?? extractUrl(lead.booking),
    ...edits,
    source_lead:  leadId,
  };

  const row = await cleanStudio(db, merged);
  if (row.error) return json(400, { error: row.error });

  /* Photos they sent with the form come across as-is; the panel can swap
     which one is the profile shot afterwards. */
  const photos = Array.isArray(lead.photos) ? lead.photos : [];
  if (!row.value.photo && photos.length) {
    row.value.photo  = photos[0];
    row.value.photos = photos.slice(1, 4);
  }

  const saved = await db.insert(STUDIOS, { ...row.value, updated_by: str(p.who) });
  if (!saved) return json(502, { error: 'Could not publish. Is that suite already taken in this building?' });

  await log(db, p, 'publish lead', `${saved.building} ${saved.suite}`, { name: saved.name, lead: leadId });
  const code = await syncCouponCode(db, saved);
  /* After the code exists, so the welcome mail can carry it. */
  if (saved.status === 'live') emailWelcome(db, saved).catch(e => console.warn('admin: welcome mail failed', String(e).slice(0, 200)));
  return json(200, { ok: true, studio: saved, couponCode: code });
}

/* Validation is shared by save and publish so a hand-typed row and a
   published lead can't end up held to different standards. */
async function cleanStudio(db, s) {
  const building = str(s.building);
  const suite    = str(s.suite).toUpperCase();
  const name     = str(s.name);
  if (!building) return { error: 'Pick a shopping center.' };
  if (!suite)    return { error: 'A suite number is required.' };
  if (!name)     return { error: 'A studio name is required.' };

  const known = await db.get(BUILDINGS, { slug: `eq.${building}`, limit: '1' });
  if (!known)        return { error: 'Could not check that shopping center.' };
  if (!known[0])     return { error: 'That shopping center does not exist yet. Add it first.' };

  // No tier sent means a brand-new row, which starts wherever the building says.
  const tier = s.tier === undefined || s.tier === null || s.tier === ''
    ? (known[0].default_tier | 0)
    : (Number(s.tier) | 0);

  const tiers = await db.get(TIERS, { tier: `eq.${tier}`, limit: '1' });
  if (!tiers || !tiers[0]) return { error: `Tier ${tier} isn't set up.` };

  const status = STATUSES.includes(str(s.status)) ? str(s.status) : 'draft';

  return { value: {
    building, suite, name,
    contact_name: str(s.contact_name),
    service:      str(s.service),
    category:     CATEGORIES.includes(str(s.category)) ? str(s.category) : 'hair',
    bio:          str(s.bio),
    tags:         arr(s.tags),
    hours:        str(s.hours),
    phone:        fmtPhone(s.phone),
    ok_to_text:   s.ok_to_text !== false,
    email:        str(s.email),
    show_email:   s.show_email === true,
    booking_url:  str(s.booking_url),
    booking_label:str(s.booking_label),
    website:      str(s.website),
    instagram:    str(s.instagram),
    facebook:     str(s.facebook),
    tiktok:       str(s.tiktok),
    photo:        str(s.photo),
    photos:       arr(s.photos).slice(0, 3),
    photo_fit:    PHOTO_FITS.includes(str(s.photo_fit)) ? str(s.photo_fit) : 'cover',
    tier, status,
    source_lead:  isUuid(str(s.source_lead)) ? str(s.source_lead) : null,
    updated_at:   nowIso(),
  }};
}

/* A studio on an offer tier needs a code to post with. Minting it here
   means nobody hand-writes SQL for it, and a studio dropped off the
   offer tier stops being able to post. */
async function syncCouponCode(db, studio) {
  const tiers = await db.get(TIERS, { tier: `eq.${studio.tier}`, limit: '1' });
  const allowed = tiers && tiers[0] && tiers[0].allow_coupons;

  const existing = await db.get(CODES, { suite: `eq.${studio.suite}`, limit: '1' });
  const has = existing && existing[0];

  if (!allowed) {
    if (has) await db.patch(CODES, { suite: `eq.${studio.suite}` }, { can_post: false });
    return null;
  }
  if (has) {
    await db.patch(CODES, { suite: `eq.${studio.suite}` },
      { can_post: true, studio: studio.name, services: studio.tags || [], studio_id: studio.id });
    return has.code;
  }
  const code = mintCode(studio.name);
  await db.insert(CODES, {
    suite: studio.suite, building: studio.building, studio: studio.name,
    code, services: studio.tags || [], can_post: true, studio_id: studio.id,
  });
  return code;
}

/* Readable enough to say over the phone, random enough not to guess.
   Deliberately not built from anything printed on their business card. */
function mintCode(name) {
  const stem = (name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || 'STUDIO');
  const digits = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
  return `${stem}-${digits}`;
}

/* Closes a change request. The edit itself happens on the studio; this
   only says somebody dealt with it, so the inbox empties honestly. */
async function markHandled(db, p) {
  const id = str(p.id);
  if (!isUuid(id)) return json(400, { error: 'Bad submission id.' });
  const ok = await db.patch(LEADS, { id: `eq.${id}` },
    { handled_at: nowIso(), handled_by: str(p.who) });
  if (!ok) return json(502, { error: 'Could not close that request.' });
  await log(db, p, 'handled change request', '', { lead: id });
  return json(200, { ok: true });
}

/* Mail check. Two wrong guesses about why mail was failing is two too
   many, so this asks Resend directly and reports what it actually said.

   Passcode-gated, and it will only ever send to LEAD_TO, the address
   already configured on the deployment. It is not a relay: no caller
   picks the recipient.

   It returns the From and To addresses, which are configuration rather
   than secrets and are exactly what a typo hides in. It never returns
   the API key, only whether one is present and whether it is shaped
   like a Resend key. */
async function mailCheck(db, p) {
  const key  = process.env.RESEND_API_KEY || '';
  const from = process.env.RESEND_FROM || '';
  const to   = process.env.LEAD_TO || '';

  const env = {
    RESEND_API_KEY: key ? (key.startsWith('re_') ? 'set, looks like a Resend key' : 'set, but does NOT start with re_') : 'MISSING',
    RESEND_FROM: from || 'MISSING',
    LEAD_TO: to || 'MISSING',
    LEAD_CC: process.env.LEAD_CC || '(not set)',
    OFFER_TO: process.env.OFFER_TO || '(not set, falls back to LEAD_TO)',
  };

  if (!key || !from || !to) {
    return json(200, { ok: false, env, verdict: 'Missing configuration, nothing was sent.' });
  }

  let res, body = '';
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from, to: [to],
        subject: 'Studio Soulutions mail check',
        html: '<p>If you are reading this, outgoing mail works. Nothing else to do.</p>',
      }),
    });
    body = (await res.text()).slice(0, 500);
  } catch (e) {
    return json(200, { ok: false, env, verdict: 'Could not reach Resend at all: ' + String(e).slice(0, 200) });
  }

  /* Resend's own words, verbatim. Whatever is wrong, it is in here. */
  const verdict = res.ok
    ? `Sent. Resend accepted it from ${from} to ${to}.`
    : `Resend refused it (HTTP ${res.status}). Its exact words are in resendSaid.`;

  await log(db, p, 'mail check', String(res.status), { ok: res.ok });
  return json(200, { ok: res.ok, status: res.status, env, verdict, resendSaid: body });
}

/* ============ the studio's own door ===================================
   A studio signs in with its suite and the code from its welcome email,
   and edits its own listing. Deliberately NOT the admin passcode: this
   is a different person with a much smaller set of powers.

   What a studio may never touch, whatever it sends:
     suite, building   its identity and its address
     tier              its price
     status            whether it is live at all
   Those belong to whoever runs the building. Everything else is theirs,
   bounded by what their tier allows.

   Changes apply immediately (Anne's call) and she is told afterwards,
   with the previous values in the mail so a bad edit can be put back. */
const STUDIO_EDITABLE = [
  'name', 'contact_name', 'service', 'bio', 'hours', 'phone', 'ok_to_text',
  'email', 'show_email', 'booking_url', 'booking_label', 'website',
  'instagram', 'facebook', 'tiktok', 'photo', 'photos', 'tags',
];

/* One error for a bad suite and a bad code alike, so this can't be used
   to work out which suites exist. */
async function studioAuth(db, p) {
  const suite = str(p.suite).toUpperCase();
  const code  = str(p.code);
  const building = str(p.building) || 'salonplus';
  if (!suite || !code) return { error: json(400, { error: 'Suite and code are both required.' }) };

  const rows = await db.get(CODES, { suite: `eq.${suite}`, limit: '1' });
  if (!rows)  return { error: json(502, { error: 'Could not check that code.' }) };
  const row = rows[0];
  if (!row || row.code !== code) {
    return { error: json(401, { error: "That suite and code don't match. Check the email we sent you." }) };
  }
  if (row.can_edit === false) {
    return { error: json(403, { error: 'Editing is paused for this studio. Get in touch.' }) };
  }

  const studios = await db.get(STUDIOS, { suite: `eq.${suite}`, building: `eq.${building}`, limit: '1' });
  if (!studios)     return { error: json(502, { error: 'Could not load your listing.' }) };
  if (!studios[0])  return { error: json(404, { error: 'No listing found for that suite yet.' }) };
  return { studio: studios[0] };
}

/* What the portal renders: their record, and the rules for their tier so
   the page only offers fields they actually have. */
async function studioPortal(db, p) {
  const a = await studioAuth(db, p);
  if (a.error) return a.error;
  const s = a.studio;

  const tiers = await db.get(TIERS, { tier: `eq.${s.tier}`, limit: '1' });
  const tier = tiers && tiers[0];
  if (!tier) return json(502, { error: 'Could not read your listing level.' });

  return json(200, {
    ok: true,
    studio: {
      suite: s.suite, name: s.name, contact_name: s.contact_name,
      service: s.service, bio: s.bio, hours: s.hours, tags: s.tags || [],
      phone: s.phone, ok_to_text: s.ok_to_text !== false,
      email: s.email, show_email: s.show_email === true,
      booking_url: s.booking_url, booking_label: s.booking_label, website: s.website,
      instagram: s.instagram, facebook: s.facebook, tiktok: s.tiktok,
      photo: s.photo, photos: s.photos || [],
      status: s.status,
    },
    /* The page hides what the tier doesn't include rather than showing a
       field that would be silently dropped on the way out. */
    tier: {
      number: tier.tier, label: tier.label, blurb: tier.blurb,
      photos_max: tier.photos_max, offers: tier.allow_coupons === true,
      contact: tier.allow_contact === true, booking: tier.allow_booking === true,
      socials: tier.allow_socials === true, bio: tier.allow_bio === true,
      hours: tier.allow_hours === true,
    },
  });
}

async function studioSave(db, p) {
  const a = await studioAuth(db, p);
  if (a.error) return a.error;
  const before = a.studio;

  const sent = p.studio && typeof p.studio === 'object' ? p.studio : {};
  const tiers = await db.get(TIERS, { tier: `eq.${before.tier}`, limit: '1' });
  const tier = tiers && tiers[0];
  if (!tier) return json(502, { error: 'Could not read your listing level.' });

  /* Anything the tier doesn't include is ignored rather than quietly
     saved and then stripped by the directory endpoint, which would look
     like the save silently failed. */
  const blocked = {
    phone: !tier.allow_contact, ok_to_text: !tier.allow_contact,
    email: !tier.allow_contact, show_email: !tier.allow_contact,
    booking_url: !tier.allow_booking, booking_label: !tier.allow_booking,
    website: !tier.allow_booking,
    instagram: !tier.allow_socials, facebook: !tier.allow_socials, tiktok: !tier.allow_socials,
    bio: !tier.allow_bio, hours: !tier.allow_hours,
    photo: (tier.photos_max | 0) < 1, photos: (tier.photos_max | 0) < 2,
  };

  const patch = {};
  const changed = [];
  for (const field of STUDIO_EDITABLE) {
    if (!(field in sent)) continue;
    if (blocked[field]) continue;
    let v;
    if (field === 'photos') v = arr(sent.photos).slice(0, Math.max(0, (tier.photos_max | 0) - 1));
    else if (field === 'tags') v = arr(sent.tags);
    else if (field === 'ok_to_text' || field === 'show_email') v = sent[field] === true;
    else if (field === 'phone') v = fmtPhone(sent.phone);
    else v = str(sent[field]);

    const same = Array.isArray(v)
      ? JSON.stringify(v) === JSON.stringify(before[field] || [])
      : v === (before[field] ?? '');
    if (same) continue;
    patch[field] = v;
    changed.push({ field, from: before[field], to: v });
  }

  if (!changed.length) return json(200, { ok: true, changed: [], message: 'Nothing changed.' });
  if (!str(patch.name ?? before.name)) return json(400, { error: 'Your studio needs a name.' });

  const saved = await db.patchReturning(STUDIOS, { id: `eq.${before.id}` },
    { ...patch, updated_at: nowIso(), updated_by: `studio:${before.suite}` });
  if (!saved) return json(502, { error: 'Could not save that. Try again in a moment.' });

  await log(db, { who: `Suite ${before.suite}` }, 'studio edited own listing',
    `${before.building} ${before.suite}`, { fields: changed.map(c => c.field) });

  /* Told after the fact, with the old values, because the change is
     already live and the only thing Anne needs is a way to undo it. */
  emailStudioEdit(before, changed)
    .catch(e => console.warn('admin: edit notice failed', String(e).slice(0, 200)));

  return json(200, { ok: true, changed: changed.map(c => c.field), studio: saved });
}

/* ============ the two studio-facing emails ============================ */

/* Sent once, the first time a studio goes live. It is the notification
   AND the code handover: without it, every code has to be read out over
   the phone by hand. */
async function emailWelcome(db, studio) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !studio || !studio.email || studio.notified_at) return;

  const codes = await db.get(CODES, { suite: `eq.${studio.suite}`, limit: '1' });
  const code = codes && codes[0] ? codes[0].code : '';
  const first = studio.contact_name ? escHtml(String(studio.contact_name).split(' ')[0]) : '';

  const html = `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#33312D;">
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#9A6B45;">Salon Plus Studios</p>
    <h2 style="font-weight:400;margin:6px 0 16px;">You're on the map</h2>
    <p style="font-size:15px;line-height:1.6;">
      ${first ? escHtml(first) + ', y' : 'Y'}our studio is live in the Salon Plus directory. Anyone who walks
      into the building, or opens the app, can now find <strong>${escHtml(studio.name)}</strong> in Suite ${escHtml(studio.suite)}.
    </p>
    <p style="margin:22px 0;">
      <a href="https://studiosoulutions.com/salonplus/app/" style="display:inline-block;padding:13px 26px;background:#33312D;color:#FAF8F4;text-decoration:none;border-radius:999px;font-family:Inter,sans-serif;font-size:15px;">See your card</a>
    </p>
    ${code ? `
    <div style="border:1px solid #DCD6CA;border-radius:14px;padding:18px 20px;background:#FAF8F4;">
      <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#9A6B45;margin-bottom:8px;">Keep this</div>
      <p style="margin:0 0 10px;font-size:15px;line-height:1.6;">
        You can update your own listing any time &mdash; hours, photos, booking link &mdash; at
        <a href="https://studiosoulutions.com/salonplus/offer/" style="color:#6B7A5F;">studiosoulutions.com/salonplus/offer</a>.
      </p>
      <p style="margin:0;font-size:15px;">
        Suite <strong>${escHtml(studio.suite)}</strong> &nbsp;&middot;&nbsp; Code <strong style="font-family:ui-monospace,monospace;">${escHtml(code)}</strong>
      </p>
    </div>` : ''}
    <p style="margin-top:22px;font-size:13px;color:#918C81;">
      Listed by Studio Soulutions. Reply to this email if anything looks wrong.
    </p>
  </div>`;

  await sendMail({ to: [studio.email], subject: `${studio.name} is on the map`, html });
  await db.patch(STUDIOS, { id: `eq.${studio.id}` }, { notified_at: nowIso() });
}

/* Sent to Anne after a studio edits itself. Old value beside new, because
   the point of this mail is to make an undo possible. */
async function emailStudioEdit(before, changed) {
  const to = process.env.LEAD_TO;
  if (!process.env.RESEND_API_KEY || !to) return;

  const show = v => Array.isArray(v) ? (v.length ? v.join(', ') : '(none)') : (String(v ?? '').trim() || '(empty)');
  const rows = changed.map(c => `
    <tr>
      <td style="padding:8px 14px 8px 0;color:#6C685F;white-space:nowrap;vertical-align:top;">${escHtml(c.field.replace(/_/g, ' '))}</td>
      <td style="padding:8px 0;color:#918C81;text-decoration:line-through;">${escHtml(show(c.from))}</td>
      <td style="padding:8px 0 8px 14px;color:#33312D;font-weight:600;">${escHtml(show(c.to))}</td>
    </tr>`).join('');

  const html = `
  <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#33312D;">
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#6B7A5F;">Salon Plus Studios &middot; already live</p>
    <h2 style="font-weight:400;margin:6px 0 6px;">${escHtml(before.name)} updated their own listing</h2>
    <p style="margin:0 0 18px;color:#6C685F;font-size:14px;">Suite ${escHtml(before.suite)}. This is already on the app. Old values on the left, in case you want to put any of it back.</p>
    <table style="font-size:15px;border-collapse:collapse;width:100%;">${rows}</table>
    <p style="margin-top:24px;font-size:14px;color:#6C685F;">
      Change it back in <a href="https://studiosoulutions.com/leads/" style="color:#6B7A5F;">the admin panel</a>.
    </p>
  </div>`;

  await sendMail({ to: [to], subject: `Updated: ${before.name} (Suite ${before.suite})`, html });
}

async function sendMail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key)  throw new Error('RESEND_API_KEY is not set.');
  if (!from) throw new Error('RESEND_FROM is not set; there is no test-sender fallback on purpose.');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ============ settings ================================================ */
async function saveTiers(db, p) {
  const rows = Array.isArray(p.tiers) ? p.tiers : null;
  if (!rows || !rows.length) return json(400, { error: 'No tiers sent.' });

  for (const t of rows) {
    const tier = Number(t.tier) | 0;
    if (!tier) return json(400, { error: 'A tier needs a number.' });
    const patch = {
      label:         str(t.label) || `Tier ${tier}`,
      blurb:         str(t.blurb),
      photos_max:    clampInt(t.photos_max, 0, 4),
      allow_coupons: t.allow_coupons === true,
      allow_contact: t.allow_contact === true,
      allow_booking: t.allow_booking === true,
      allow_socials: t.allow_socials === true,
      allow_bio:     t.allow_bio === true,
      allow_hours:   t.allow_hours === true,
      updated_at:    nowIso(),
    };
    const ok = await db.patch(TIERS, { tier: `eq.${tier}` }, patch);
    if (!ok) return json(502, { error: `Could not save tier ${tier}.` });
  }
  await log(db, p, 'edit tiers', '', { tiers: rows.map(t => t.tier) });

  /* Turning offers off for a tier has to reach the studios on it, or a
     studio keeps a working code for a perk it no longer has. */
  const studios = await db.get(STUDIOS, { limit: '500' });
  for (const s of studios || []) await syncCouponCode(db, s);

  return json(200, { ok: true, tiers: await db.get(TIERS, { order: 'tier.asc' }) });
}

async function saveBuilding(db, p) {
  const b = p.building && typeof p.building === 'object' ? p.building : null;
  if (!b) return json(400, { error: 'No shopping center sent.' });

  const slug = slugify(str(b.slug) || str(b.name));
  const name = str(b.name);
  if (!slug || !name) return json(400, { error: 'A shopping center needs a name.' });

  const row = {
    slug, name, city: str(b.city),
    default_tier: clampInt(b.default_tier, 1, 9) || 1,
    has_map: b.has_map === true,
  };
  const existing = await db.get(BUILDINGS, { slug: `eq.${slug}`, limit: '1' });
  if (!existing) return json(502, { error: 'Could not check that shopping center.' });

  const ok = existing[0]
    ? await db.patch(BUILDINGS, { slug: `eq.${slug}` }, row)
    : await db.insert(BUILDINGS, row);
  if (!ok) return json(502, { error: 'Could not save the shopping center.' });

  await log(db, p, existing[0] ? 'edit center' : 'add center', slug, { name });
  return json(200, { ok: true, buildings: await db.get(BUILDINGS, { order: 'name.asc' }) });
}

/* ============ helpers ================================================= */
async function log(db, p, action, target, detail) {
  await db.insert(LOG, { who: str(p.who) || 'someone', action, target, detail: detail || {} });
}

function extractUrl(v) {
  const m = str(v).match(/https?:\/\/\S+/);
  return m ? m[0].replace(/[.,)]+$/, '') : '';
}
function slugify(v) {
  return str(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
function clampInt(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
/* Forms hand back whatever someone typed: 6025551234, +16025551234,
   602.555.1234. Store one shape so a card never reads like a serial
   number. Anything that isn't a recognisable US number is left alone
   rather than mangled. */
function fmtPhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return String(v || '').trim();
}
function isUuid(v) { return /^[0-9a-f-]{36}$/i.test(v); }
function nowIso() { return new Date().toISOString(); }
function str(v) { return typeof v === 'string' ? v.trim() : (v === 0 ? '0' : ''); }
function arr(v) { return Array.isArray(v) ? v.map(x => str(x)).filter(Boolean) : []; }

function supabase(url, key) {
  const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  const qs = params => new URLSearchParams({ select: '*', ...params }).toString();
  const fail = async (what, res) => {
    console.error(`admin: ${what} failed`, res.status, (await res.text()).slice(0, 300));
  };
  return {
    async get(table, params) {
      const res = await fetch(`${url}/rest/v1/${table}?${qs(params)}`, { headers });
      if (!res.ok) { await fail('get ' + table, res); return null; }
      return res.json();
    },
    async patch(table, match, body) {
      const res = await fetch(`${url}/rest/v1/${table}?${qs(match)}`, {
        method: 'PATCH', headers, body: JSON.stringify(body),
      });
      if (!res.ok) { await fail('patch ' + table, res); return false; }
      return true;
    },
    async patchReturning(table, match, body) {
      const res = await fetch(`${url}/rest/v1/${table}?${qs(match)}`, {
        method: 'PATCH', headers: { ...headers, prefer: 'return=representation' }, body: JSON.stringify(body),
      });
      if (!res.ok) { await fail('patch ' + table, res); return null; }
      const out = await res.json();
      return Array.isArray(out) ? out[0] : out;
    },
    async insert(table, row) {
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST', headers: { ...headers, prefer: 'return=representation' }, body: JSON.stringify(row),
      });
      if (!res.ok) { await fail('insert ' + table, res); return null; }
      const out = await res.json();
      return Array.isArray(out) ? out[0] : out;
    },
  };
}

function cors() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', ...cors() },
  });
}
