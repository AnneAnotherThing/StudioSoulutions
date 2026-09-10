/* =====================================================================
   Studio Soulutions, function tests
   ---------------------------------------------------------------------
   Drives the real Netlify function handlers in-process with the network
   mocked, so nothing here touches the live Supabase, Resend, or a real
   inbox. Run from the repo root:

       node tests/run-tests.mjs

   Prior rounds of tests on this repo lived in throwaway scripts that
   never got committed, which is why "122 tests passing" on Aug 31 left
   nothing behind to re-run. These are committed on purpose.
   ===================================================================== */

process.env.SUPABASE_URL         = 'https://fake-project.supabase.test';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.RESEND_API_KEY       = 'test-resend-key';
process.env.LEAD_TO              = 'owner@test.local';
process.env.RESEND_FROM          = 'Salon Plus Studios <hello@test.local>';
process.env.LEADS_CODE           = 'test-passcode';

const interest = (await import('../netlify/functions/salonplus-interest.mjs')).default;
const admin    = (await import('../netlify/functions/salonplus-admin.mjs')).default;

/* ----- tiny harness ---------------------------------------------------- */
let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; }
  else { failed++; console.error('  FAIL:', label); }
}
function section(name) { console.log('\n' + name); }

/* ----- fetch mock ------------------------------------------------------
   Routes by substring. Every call is recorded so tests can assert on the
   exact bodies that would have gone to Supabase and Resend. */
let calls = [];
let supabaseInsertPlan = [];   // per-call status overrides for ss_interest inserts
function resetNet() { calls = []; supabaseInsertPlan = []; }
globalThis.fetch = async (url, opts = {}) => {
  const rec = { url: String(url), method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null };
  calls.push(rec);
  const u = rec.url;

  if (u.includes('/rest/v1/ss_interest')) {
    const status = supabaseInsertPlan.length ? supabaseInsertPlan.shift() : 201;
    return mockRes(status, status < 300 ? '' : '{"message":"column does not exist"}');
  }
  if (u.includes('api.resend.com')) return mockRes(200, '{"id":"mock-email"}');
  if (u.includes('/rest/v1/ss_studios')) {
    return mockRes(200, JSON.stringify([
      { suite: '103', name: 'Soul and Beauty Day Spa', contact_name: 'Christina Lee', service: 'Day Spa',
        category: 'spa', bio: 'A bio', tags: ['Massage'], hours: 'Tue–Sat 10–6', tier: 2,
        photo: 'p.jpg', photos: ['a.jpg'], photo_fit: 'cover', phone: '623', ok_to_text: true,
        email: 'x@y.z', show_email: true, booking_url: 'b', booking_label: 'Book', website: 'w',
        instagram: 'i', facebook: 'f', tiktok: 't', status: 'live' },
      { suite: '301', name: 'Deuces Nail Studio', contact_name: 'Deuce', service: 'Nails',
        category: 'nails', bio: 'Bio', tags: [], hours: 'Wed–Sun 9–5', tier: 0,
        photo: 'p2.jpg', photos: [], photo_fit: 'cover', phone: '602', ok_to_text: true,
        email: 'd@y.z', show_email: true, booking_url: 'b2', booking_label: '', website: '',
        instagram: '', facebook: '', tiktok: '', status: 'live' },
    ]));
  }
  if (u.includes('/rest/v1/ss_tier_settings')) {
    return mockRes(200, JSON.stringify([
      { tier: 0, label: 'On the map', photos_max: 0, allow_coupons: false, allow_contact: false,
        allow_booking: false, allow_socials: false, allow_bio: false, allow_hours: false },
      { tier: 2, label: 'Featured', photos_max: 4, allow_coupons: true, allow_contact: true,
        allow_booking: true, allow_socials: true, allow_bio: true, allow_hours: true },
    ]));
  }
  return mockRes(200, '{}');
};
function mockRes(status, text) {
  return {
    ok: status < 300, status,
    text: async () => text,
    json: async () => (text ? JSON.parse(text) : {}),
  };
}

/* ----- helpers --------------------------------------------------------- */
function post(handler, body) {
  return handler(new Request('https://local.test/api', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
}
const settle = () => new Promise(r => setTimeout(r, 25)); // fire-and-forget receipt email
const resendCalls   = () => calls.filter(c => c.url.includes('api.resend.com'));
const supabaseCalls = () => calls.filter(c => c.url.includes('/rest/v1/ss_interest'));

const NEW_LEAD = {
  business: 'Test Studio', name: 'Pat Tester', email: 'pat@test.local', phone: '',
  hours: 'Tue–Sat 10am–6pm', services: ['Hair'], kind: 'new', building: 'salonplus',
  notes: '12 years behind the chair, Redken certified',
};

/* ===== interest: new signups =========================================== */
section('interest: new signups');

resetNet();
let res = await post(interest, { ...NEW_LEAD, business: '', name: '' });
ok(res.status === 400, 'new signup without business and name is refused');

resetNet();
res = await post(interest, { ...NEW_LEAD, email: '', phone: '' });
ok(res.status === 400, 'new signup without phone or email is refused');

resetNet();
res = await post(interest, NEW_LEAD);
await settle();
ok(res.status === 200, 'complete new signup succeeds');
let row = supabaseCalls()[0]?.body;
ok(row && row.bio_help === true, 'bio_help defaults to true on the stored row');
ok(row && row.hours === 'Tue–Sat 10am–6pm', 'composed hours string is stored as sent');
let leadMail = resendCalls().find(c => c.body.to[0] === 'owner@test.local');
ok(leadMail && leadMail.body.html.includes('Facts'), 'lead email labels the notes as Facts');
ok(leadMail && leadMail.body.html.includes('Write it for them'), 'lead email says to write the bio for them');
let receipt = resendCalls().find(c => c.body.to[0] === 'pat@test.local');
ok(!!receipt, 'new signup still gets its receipt email');

resetNet();
res = await post(interest, { ...NEW_LEAD, bio_help: false });
await settle();
ok(res.status === 200, 'signup with bio_help false succeeds');
row = supabaseCalls()[0]?.body;
ok(row && row.bio_help === false, 'bio_help false is stored');
leadMail = resendCalls().find(c => c.body.to[0] === 'owner@test.local');
ok(leadMail && leadMail.body.html.includes('Use their words exactly as written'),
   'lead email says to use their words as-is');

/* ===== interest: change requests without the two names ================= */
section('interest: change requests');

resetNet();
res = await post(interest, {
  kind: 'change', suite: '103', notes: 'New hours please', email: 'c@test.local',
  building: 'salonplus',
});
await settle();
ok(res.status === 200, 'change with NO business and NO contact name is accepted');
leadMail = resendCalls().find(c => c.body.to[0] === 'owner@test.local');
ok(leadMail && leadMail.body.subject === '[CHANGE] Salon Plus Studios: Suite 103',
   'nameless change subject falls back to the suite');
ok(leadMail && leadMail.body.html.includes('Suite 103 wants a change'),
   'nameless change heading falls back to the suite');
receipt = resendCalls().find(c => c.body.to[0] === 'c@test.local');
ok(receipt && receipt.body.subject === 'We got your update, Suite 103',
   'nameless change receipt addresses the suite');

resetNet();
res = await post(interest, {
  kind: 'change', suite: '103', notes: 'Swap my photo', business: 'Deuces Nail Studio',
  email: 'c@test.local', building: 'salonplus',
});
await settle();
leadMail = resendCalls().find(c => c.body.to[0] === 'owner@test.local');
ok(leadMail && leadMail.body.subject === '[CHANGE] Salon Plus Studios: Deuces Nail Studio (Suite 103)',
   'named change subject keeps the old shape');

resetNet();
res = await post(interest, { kind: 'change', notes: 'x', email: 'c@test.local' });
ok(res.status === 400, 'change without a suite is still refused');

resetNet();
res = await post(interest, { kind: 'change', suite: '103', email: 'c@test.local' });
ok(res.status === 400, 'change without a description is still refused');

/* ===== interest: questions, bugs, honeypot ============================= */
section('interest: questions, bugs, honeypot');

resetNet();
res = await post(interest, { kind: 'bug', notes: 'Map is sideways', email: 'b@test.local' });
await settle();
ok(res.status === 200, 'bug report needs no business name');
ok(!resendCalls().some(c => c.body.to[0] === 'b@test.local'), 'bug report gets no receipt email');

resetNet();
res = await post(interest, { kind: 'question', email: 'q@test.local' });
ok(res.status === 400, 'question without any text is refused');

resetNet();
res = await post(interest, { ...NEW_LEAD, hp: 'bot' });
ok(res.status === 200 && calls.length === 0, 'honeypot returns ok and stores nothing');

/* ===== interest: un-migrated table strip-retry ========================= */
section('interest: strip-retry on an un-migrated table');

resetNet();
supabaseInsertPlan = [400, 201];
res = await post(interest, NEW_LEAD);
await settle();
ok(res.status === 200, 'insert failure retries and the lead survives');
const second = supabaseCalls()[1]?.body;
ok(second && !('bio_help' in second), 'retry drops bio_help for a table without the column');

/* ===== admin: directory carries the technician ========================= */
section('admin: directory');

resetNet();
res = await post(admin, { action: 'directory', building: 'salonplus' });
const dir = await res.json();
ok(res.status === 200 && Array.isArray(dir.rows), 'directory answers');
const spa = dir.rows.find(r => r.suite === '103');
const deuces = dir.rows.find(r => r.suite === '301');
ok(spa && spa.tech === 'Christina Lee', 'tier 2 card carries the technician name');
ok(deuces && deuces.tech === 'Deuce', 'tier 0 card carries the technician name too');
ok(deuces && deuces.call === '' && deuces.bio === '', 'tier 0 still strips gated contact and bio');
ok(dir.building && dir.building.slug === 'salonplus' && dir.building.has_map === true,
   'directory answer names the building and its map');

resetNet();
res = await post(admin, { action: 'directory', building: 'demo' });
const dirDemo = await res.json();
ok(dirDemo.building && dirDemo.building.name === 'This Building' && dirDemo.building.has_map === false,
   'an unseeded building falls back to a neutral identity, never Salon Plus');

/* ===== multi-building: codes and portals stay in their building ======== */
section('multi-building scoping');

resetNet();
res = await post(admin, { action: 'studioPortal', building: 'demo', suite: '103', code: 'x' });
let codesCall = calls.find(c => c.url.includes('ss_suite_codes'));
ok(codesCall && codesCall.url.includes('building=eq.demo'),
   'portal code lookup is scoped to the requested building');

resetNet();
res = await post(admin, { action: 'studioPortal', suite: '103', code: 'x' });
codesCall = calls.find(c => c.url.includes('ss_suite_codes'));
ok(codesCall && codesCall.url.includes('building=eq.salonplus'),
   'portal code lookup defaults to salonplus when no building is sent');

/* ===== the hours composer (extracted from the live page) =============== */
section('form: hours composer');

const { readFileSync } = await import('node:fs');
const page = readFileSync(new URL('../salonplus/index.html', import.meta.url), 'utf8');
const fmtSrc = page.match(/function fmtTime\(mins\) \{[\s\S]*?\n\}/)?.[0];
const daydefSrc = page.match(/const DAY_ORDER = \[[^\]]*\];/)?.[0];
const compSrc = page.match(/function composeDays\(days\) \{[\s\S]*?\n\}/)?.[0];
ok(!!fmtSrc && !!compSrc && !!daydefSrc, 'composer functions found in the page');
const { fmtTime, composeDays } = new Function(
  `${daydefSrc}\n${fmtSrc}\n${compSrc}\nreturn { fmtTime, composeDays };`)();
ok(fmtTime(10 * 60) === '10am', '10:00 renders as 10am');
ok(fmtTime(18 * 60) === '6pm', '18:00 renders as 6pm');
ok(fmtTime(18 * 60 + 30) === '6:30pm', '18:30 renders as 6:30pm');
ok(fmtTime(12 * 60) === '12pm', 'noon renders as 12pm');
ok(composeDays(['Tue', 'Wed', 'Thu', 'Fri', 'Sat']) === 'Tue–Sat', 'contiguous run collapses to a range');
ok(composeDays(['Mon', 'Wed', 'Fri']) === 'Mon, Wed, Fri', 'gapped days list out');
ok(composeDays(['Sat', 'Mon']) === 'Mon, Sat', 'two days list out in week order');
ok(composeDays([]) === '', 'no days composes to nothing');

/* ===== the app's hours parser accepts everything the composer emits ==== */
section("form: composed hours parse in the app's Open-now engine");

const appSrc = readFileSync(new URL('../salonplus/app/app.js', import.meta.url), 'utf8');
const grabFn = name => {
  const m = appSrc.match(new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}'));
  return m ? m[0] : null;
};
const parserSrc = ['toMinutes', 'readDays', 'readTimes', 'parseHours'].map(grabFn);
ok(parserSrc.every(Boolean), 'hours parser functions found in app.js');
const { parseHours } = new Function(
  "const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];\n"
  + parserSrc.join('\n') + '\nreturn { parseHours };')();
for (const c of ['Tue–Sat 10am–6pm', 'Mon, Wed, Fri 9am–7pm', 'Wed–Sun 10:30am–5pm',
                 'Mon–Fri 9am–5pm', 'Sat 6:30pm–10pm', 'Tue–Sat 10–6']) {
  ok(parseHours(c) !== null, `Open-now engine reads "${c}"`);
}
const span = parseHours('Tue–Sat 10am–6pm')[0];
ok(span.open === 600 && span.close === 1080, 'composed 10am–6pm lands as 10:00 to 18:00');

/* ===== specials: portal auth scoped by building ======================== */
section('specials: building scoping');

const specials = (await import('../netlify/functions/salonplus-specials.mjs')).default;
resetNet();
res = await post(specials, { action: 'unlock', building: 'demo', suite: '301', code: 'x' });
let specCodes = calls.find(c => c.url.includes('ss_suite_codes'));
ok(specCodes && specCodes.url.includes('building=eq.demo'),
   'offer sign-in checks the code inside the right building');

/* ===== join page keeps the same composer =============================== */
const joinPage = readFileSync(new URL('../join/index.html', import.meta.url), 'utf8');
ok(joinPage.includes('function composeDays'), 'join page carries the composer too');
ok(/formMode === 'new' && \(!data\.business \|\| !data\.name\)/.test(page),
   'salonplus page only enforces the two names in new mode');
ok(!/if \(!data\.business \|\| !data\.name\)/.test(joinPage.replace(/formMode === 'new' &&[^)]*\)/g, '')),
   'join page has no unconditional name check');

/* The bio buttons share .mode-btn for styling only. The mode script must
   bind by [data-mode] or a bio click runs setFormMode(undefined), which
   lights both bio cards and clears the form mode. Found in the Sep 9
   browser run; kept here so it stays found. */
for (const [label, src] of [['salonplus', page], ['join', joinPage]]) {
  const scoped = (src.match(/\.mode-btn\[data-mode\]/g) || []).length;
  const bare = (src.match(/querySelectorAll\('\.mode-btn'\)/g) || []).length;
  ok(scoped >= 2 && bare === 0, `${label} page scopes the mode script to [data-mode] buttons`);
}

/* The day chips also wear .svc for styling, so the services collector
   must scope to #svcRow or the chosen days arrive as services. Found in
   the Sep 9 browser run; kept here so it stays found. */
for (const [label, src] of [['salonplus', page], ['join', joinPage]]) {
  ok(src.includes("querySelectorAll('#svcRow .svc input:checked')"),
     `${label} page scopes the services collector to #svcRow`);
}

/* ----- verdict --------------------------------------------------------- */
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
