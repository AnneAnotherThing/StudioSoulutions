/* =====================================================================
   Studio Soulutions, Salon Plus offers (Netlify Function)
   Studio Soulutions platform build
   ---------------------------------------------------------------------
   The whole point of this file: a studio can post a coupon without
   anyone approving it, and without being able to post anything ugly.

   It manages that by never accepting a written offer. The browser sends
   the PARTS a studio picked from dropdowns, and this function composes
   the sentence. A studio cannot choose its own wording, cannot advertise
   a service it doesn't offer, cannot run an offer forever, and cannot
   have two live at once.

   Actions (all POST /api/salonplus-specials):
     list    public. Live, unexpired offers for the app's Specials tab.
     unlock  suite + code. Returns the studio's name and its allowed
             service menu, which is what the builder's dropdowns are
             made of. Never returns the code.
     post    suite + code + parts. Composes, validates, replaces.
     hide    Anne's LEADS_CODE. The off switch, not an approval queue.

   Required env vars (set in the Netlify dashboard):
     SUPABASE_URL           same project as ss_interest
     SUPABASE_SERVICE_KEY   service-role key, server-side only
     LEADS_CODE             Anne's existing passcode, reused for hide
   Optional:
     RESEND_API_KEY         already set for the interest form
     OFFER_TO               who gets the heads-up when an offer goes up;
                            falls back to LEAD_TO, so setting nothing
                            still mails whoever gets the leads today
     RESEND_FROM            shared with the interest form
   ===================================================================== */

const SPECIALS = 'ss_specials';
const CODES    = 'ss_suite_codes';

/* ----- what a studio is allowed to say -------------------------------
   Three shapes, each a sentence with slots. "your" is doing quiet work
   here: it reads naturally in front of every service name, singular or
   plural, vowel or consonant, so there's no a/an problem to solve. */
const TEMPLATES = {
  amount_off:  { needs: ['amount', 'service'],       say: p => `$${p.amount} off your ${p.service}` },
  percent_off: { needs: ['percent', 'service'],      say: p => `${p.percent}% off your ${p.service}` },
  free_addon:  { needs: ['addon', 'service'],        say: p => `Free ${p.addon} with your ${p.service}` },
};

/* Bounded choices. Anything not on these lists is rejected outright,
   which is cheaper than sanitizing and impossible to argue with. */
const AMOUNTS  = [5, 10, 15, 20, 25];
const PERCENTS = [10, 15, 20, 25];
const DAYS     = [14, 30, 60, 90];        // no "runs forever" option, by design
const AUDIENCE = { all: '', new: 'New clients', returning: 'Returning clients' };

const FINE_MAX     = 60;
const POSTS_PER_DAY = 5;                  // typo fixes fine, thrash prevented

export const config = { path: '/api/salonplus-specials' };

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

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return json(500, { error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY not set.' });
  const db = supabase(url, key);

  switch (p.action) {
    case 'list':   return listOffers(db, p);
    case 'unlock': return unlock(db, p);
    case 'post':   return postOffer(db, p);
    case 'hide':   return hideOffer(db, p);
    default:       return json(400, { error: 'Unknown action.' });
  }
}

/* ============ list, the only public action ============================ */
async function listOffers(db, p) {
  const building = str(p.building) || 'salonplus';
  const rows = await db.get(SPECIALS, {
    building:   `eq.${building}`,
    status:     'eq.live',
    expires_at: `gte.${today()}`,
    select:     'id,suite,title,detail,expires_at',
    order:      'created_at.desc',
    limit:      '50',
  });
  if (!rows) return json(502, { error: 'Could not load offers.' });

  /* Shaped to match the SPECIALS array the app already renders, so the
     Specials tab needs no date handling of its own. */
  return json(200, {
    rows: rows.map(r => ({
      id: r.id, suite: r.suite, title: r.title, detail: r.detail,
      expires: prettyDate(r.expires_at),
    })),
  });
}

/* ============ unlock, hand back the studio's own menu ================== */
async function unlock(db, p) {
  const studio = await authStudio(db, p);
  if (studio.error) return studio.error;
  const s = studio.row;
  return json(200, {
    ok: true,
    suite: s.suite,
    studio: s.studio,
    services: s.services || [],
    /* the builder renders these rather than hardcoding them, so the
       rules and the UI can never drift apart */
    options: { amounts: AMOUNTS, percents: PERCENTS, days: DAYS, fineMax: FINE_MAX,
               templates: Object.keys(TEMPLATES),
               audiences: Object.keys(AUDIENCE) },
    live: await liveFor(db, s.suite),
  });
}

/* ============ post, where the sentence gets composed =================== */
async function postOffer(db, p) {
  const studio = await authStudio(db, p);
  if (studio.error) return studio.error;
  const s = studio.row;

  const parts = p.parts && typeof p.parts === 'object' ? p.parts : {};
  const tpl = TEMPLATES[str(parts.template)];
  if (!tpl) return json(400, { error: 'Pick an offer type.' });

  const menu = s.services || [];
  const clean = { template: str(parts.template) };

  for (const need of tpl.needs) {
    if (need === 'amount') {
      const v = Number(parts.amount);
      if (!AMOUNTS.includes(v)) return json(400, { error: 'Pick an amount from the list.' });
      clean.amount = v;
    }
    if (need === 'percent') {
      const v = Number(parts.percent);
      if (!PERCENTS.includes(v)) return json(400, { error: 'Pick a percentage from the list.' });
      clean.percent = v;
    }
    if (need === 'service' || need === 'addon') {
      const v = str(parts[need]);
      /* the tight loop: the menu came from this studio's own row, so a
         studio can only ever advertise work it actually does */
      if (!menu.includes(v)) return json(400, { error: 'Pick a service from your list.' });
      clean[need] = v;
    }
  }
  if (clean.addon && clean.addon === clean.service) {
    return json(400, { error: 'The free add-on and the service should be different.' });
  }

  const days = Number(parts.days);
  if (!DAYS.includes(days)) return json(400, { error: 'Pick how long it runs.' });
  clean.days = days;

  const audience = str(parts.audience) || 'all';
  if (!(audience in AUDIENCE)) return json(400, { error: 'Pick who it is for.' });
  clean.audience = audience;

  clean.fine = finePrint(parts.fine);

  const title  = tpl.say(clean);
  const detail = [AUDIENCE[audience], clean.fine].filter(Boolean).join(' · ');

  /* Light throttle. One live offer per suite already keeps the feed
     tidy; this only stops someone rewriting it forty times an hour. */
  const todaysPosts = await db.get(SPECIALS, {
    suite:  `eq.${s.suite}`,
    select: 'id',
    created_at: `gte.${today()}T00:00:00Z`,
    limit:  String(POSTS_PER_DAY + 1),
  });
  if (todaysPosts && todaysPosts.length >= POSTS_PER_DAY) {
    return json(429, { error: 'That is enough changes for one day. Try again tomorrow.' });
  }

  /* Retire the current offer, then write the new one. Not a transaction:
     if the insert fails after this, the suite is left with no live offer
     and simply reposts. The partial unique index is what actually
     guarantees there is never more than one. */
  const retired = await db.patch(SPECIALS, { suite: `eq.${s.suite}`, status: 'eq.live' }, { status: 'replaced' });
  if (!retired) return json(502, { error: 'Could not replace the current offer.' });

  const row = await db.insert(SPECIALS, {
    suite: s.suite, building: s.building || 'salonplus',
    title, detail,
    expires_at: addDays(days),
    status: 'live',
    parts: clean,
  });
  if (!row) return json(502, { error: 'Could not post the offer.' });

  /* Heads-up mail, deliberately after the offer is already live and
     deliberately not awaited into the response path: this is a courtesy,
     not an approval step. A Resend hiccup must never cost a studio its
     coupon, so a failure only ever reaches the logs. */
  emailOffer({ studio: s.studio, suite: s.suite, title, detail, expires: prettyDate(row.expires_at), id: row.id })
    .catch(e => console.error('specials: notify failed', e.message));

  return json(200, {
    ok: true,
    offer: { id: row.id, suite: row.suite, title, detail, expires: prettyDate(row.expires_at) },
  });
}

/* Same Resend setup the interest form already uses, so this needs no new
   keys, only OFFER_TO (falling back to LEAD_TO, so it works either way). */
async function emailOffer(o) {
  const key = process.env.RESEND_API_KEY;
  const to  = process.env.OFFER_TO || process.env.LEAD_TO;
  if (!key || !to) return;                      // not configured, not an error

  const from = process.env.RESEND_FROM || 'Studio Soulutions <onboarding@resend.dev>';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#33312D;">
    <p style="letter-spacing:.28em;text-transform:uppercase;font-size:12px;color:#9A6B45;">Salon Plus Studios</p>
    <h2 style="font-weight:400;margin:6px 0 4px;">${esc(o.studio)} posted an offer</h2>
    <p style="margin:0 0 20px;color:#918C81;font-size:14px;">Suite ${esc(o.suite)} &middot; it is already live in the app</p>
    <div style="border:1px solid #E5D9C3;border-radius:14px;padding:18px 20px;background:#FBF6EE;">
      <div style="font-size:19px;">${esc(o.title)}</div>
      ${o.detail ? `<div style="font-size:14px;color:#6C685F;margin-top:4px;">${esc(o.detail)}</div>` : ''}
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6B7A5F;margin-top:10px;">Through ${esc(o.expires)}</div>
    </div>
    <p style="margin-top:22px;font-size:14px;color:#6C685F;">
      Nothing to approve, and nothing to take down later, it expires on its own.
      If this one shouldn't be up, hide it at
      <a href="https://studiosoulutions.com/leads/" style="color:#6B7A5F;">studiosoulutions.com/leads</a>.
    </p>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from, to: [to],
      subject: `Salon Plus offer: ${o.studio} (Suite ${o.suite})`,
      html,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/* ============ hide, Anne's off switch ================================= */
async function hideOffer(db, p) {
  const expected = process.env.LEADS_CODE;
  if (!expected) return json(500, { error: 'LEADS_CODE is not set on this deployment.' });
  if (str(p.code) !== expected) return json(401, { error: 'Wrong passcode.' });

  const id = str(p.id);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { error: 'Bad id.' });

  const ok = await db.patch(SPECIALS, { id: `eq.${id}` }, { status: 'hidden' });
  if (!ok) return json(502, { error: 'Could not hide the offer.' });
  return json(200, { ok: true });
}

/* ============ helpers ================================================= */

/* One error for "no such suite" and "wrong code" alike, so this can't be
   used to enumerate which suites have claimed. */
async function authStudio(db, p) {
  const suite = str(p.suite).toUpperCase();
  const code  = str(p.code);
  if (!suite || !code) return { error: json(400, { error: 'Suite and code are both required.' }) };

  const rows = await db.get(CODES, {
    suite:  `eq.${suite}`,
    select: 'suite,building,studio,code,services,can_post',
    limit:  '1',
  });
  if (!rows) return { error: json(502, { error: 'Could not check that code.' }) };

  const row = rows[0];
  if (!row || row.code !== code) {
    return { error: json(401, { error: "That suite and code don't match. Check the card Anne gave you." }) };
  }
  if (row.can_post === false) {
    return { error: json(403, { error: 'Posting is paused for this studio. Give Anne a shout.' }) };
  }
  return { row };
}

async function liveFor(db, suite) {
  const rows = await db.get(SPECIALS, {
    suite: `eq.${suite}`, status: 'eq.live',
    select: 'id,title,detail,expires_at', limit: '1',
  });
  const r = rows && rows[0];
  return r ? { id: r.id, title: r.title, detail: r.detail, expires: prettyDate(r.expires_at) } : null;
}

/* The one free-text field in the whole feature, kept on a short leash:
   no links, no phone numbers, no email, no emoji, no shouting. */
function finePrint(v) {
  let s = str(v);
  if (!s) return '';
  s = s.replace(/https?:\/\/\S+/gi, '')
       .replace(/\b(?:www\.)?[a-z0-9-]+\.(?:com|net|org|co|io|biz|shop|site)\b/gi, '')
       .replace(/\S+@\S+\.\S+/g, '')
       .replace(/\+?\d[\d\s().-]{7,}\d/g, '')          // phone numbers
       .replace(/[^A-Za-z0-9 ,.'&/–—-]/g, '')          // drops emoji and markup
       .replace(/\s{2,}/g, ' ')
       .trim();
  if (s === s.toUpperCase() && /[A-Z]{4,}/.test(s)) {   // NO SHOUTING
    s = s.charAt(0) + s.slice(1).toLowerCase();
  }
  return s.slice(0, FINE_MAX).trim();
}

function today() { return new Date().toISOString().slice(0, 10); }
function addDays(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function prettyDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${MON[(m || 1) - 1]} ${d}`;
}
function str(v) { return typeof v === 'string' ? v.trim() : ''; }

/* Thin Supabase REST wrapper. Returns null on failure and logs, so every
   caller can answer with a friendly message instead of a stack trace. */
function supabase(url, key) {
  const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  const qs = params => new URLSearchParams(params).toString();
  return {
    async get(table, params) {
      const res = await fetch(`${url}/rest/v1/${table}?${qs(params)}`, { headers });
      if (!res.ok) { await logFail('get ' + table, res); return null; }
      return res.json();
    },
    async patch(table, match, patchBody) {
      const res = await fetch(`${url}/rest/v1/${table}?${qs(match)}`, {
        method: 'PATCH', headers, body: JSON.stringify(patchBody),
      });
      if (!res.ok) { await logFail('patch ' + table, res); return false; }
      return true;
    },
    async insert(table, row) {
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...headers, prefer: 'return=representation' },
        body: JSON.stringify(row),
      });
      if (!res.ok) { await logFail('insert ' + table, res); return null; }
      const out = await res.json();
      return Array.isArray(out) ? out[0] : out;
    },
  };
}
async function logFail(what, res) {
  console.error(`specials: ${what} failed`, res.status, (await res.text()).slice(0, 300));
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
