/* =====================================================================
   Salon Plus Studios, mobile companion (prototype app format)
   Same views, sheet, and interactions as the Studio Soulutions app
   prototype (app.html/app.js), fed by the real Salon Plus roster in
   ../data.js and a corridor-aware map for actual wayfinding.
   ===================================================================== */

const { ROSTER, LAYOUT } = window.SALONPLUS;

/* ----- per-suite meta, category + service line -------------------------
   Guessed from business names until interest forms confirm them.
   Fix a wrong guess here, one line, both the app and page read ROSTER. */
const SP_META = {
  '101A': { c: 'hair',   sv: 'Haircuts' },
  '101B': { c: 'barber', sv: 'Barber Studio' },
  '103':  { c: 'spa',    sv: 'Day Spa' },
  '106':  { c: 'spa',    sv: 'Laser Med Spa' },
  '201':  { c: 'hair',   sv: 'Hair Salon' },
  '202':  { c: 'barber', sv: 'Fine Cuts' },
  '203':  { c: 'spa',    sv: 'Beauty Bar' },
  '205':  { c: 'hair',   sv: 'Natural Hair Academy' },
  '209':  { c: 'hair',   sv: 'Beauty Salon' },
  '211':  { c: 'hair',   sv: 'Braids · Locs · Beyond' },
  '212':  { c: 'barber', sv: 'Barber' },
  '215':  { c: 'barber', sv: 'Barber Parlor' },
  '301':  { c: 'nails',  sv: 'Manicure · Pedicure · Nail Art' },
  '302':  { c: 'nails',  sv: 'Nail Sets' },
  '304':  { c: 'hair',   sv: 'Cuts & Styling' },
  '305':  { c: 'nails',  sv: 'Nail Studio' },
  '306':  { c: 'nails',  sv: 'Nail Studio' },
  '309':  { c: 'hair',   sv: 'Cuts & Styling' },
  '310':  { c: 'hair',   sv: 'Hair Salon' },
  '311':  { c: 'hair',   sv: 'Color & Styling' },
  '312':  { c: 'hair',   sv: 'Non-Surgical Hair Replacement' },
  '316':  { c: 'hair',   sv: 'Salon de Coiffure' },
  '317':  { c: 'spa',    sv: 'Beauty Co.' },
  '318':  { c: 'hair',   sv: 'Hair Studio' },
  '320':  { c: 'hair',   sv: 'Beauty Studio' },
  '321':  { c: 'hair',   sv: 'Beauty Studio' },
  '322':  { c: 'hair',   sv: 'Hair & Nails' },
  '326':  { c: 'hair',   sv: 'Hair Studio' },
  '327':  { c: 'barber', sv: 'Fades' },
  '328':  { c: 'hair',   sv: 'Salon' },
  '329':  { c: 'barber', sv: 'Cuts' },
};

const THEMES = ['av-sage','av-moss','av-clay','av-rose','av-stone','av-sand','av-rust','av-fern','av-amber'];
const CAT_LABEL = { hair: 'Hair', barber: 'Barber', nails: 'Nails', spa: 'Spa & Beauty' };
const CLAIM_URL = suite => `../?suite=${encodeURIComponent(suite)}#join`;

// ============ DATA ============
/* The directory now lives in Supabase and is edited from the admin panel,
   so what follows is the FALLBACK: the roster baked into data.js, used
   when the directory endpoint can't be reached. It keeps the app useful
   on a bad connection instead of showing an empty building. */
const FALLBACK_TENANTS = Object.entries(ROSTER).map(([suite, name], i) => {
  const meta = SP_META[suite] || { c: 'hair', sv: 'Independent Studio' };
  const base = {
    id: suite,
    name,
    service: meta.sv,
    category: meta.c,
    suite: `Suite ${suite}`,
    avatar: name.replace(/[^A-Za-z ]/g, '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || suite[0],
    theme: THEMES[i % THEMES.length],
    claimed: false,
    bio: `One of the independent studios that call Salon Plus home. The full card, photos, bio, booking link, fills in as ${name.split(' ')[0]} claims it (free, two minutes).`,
    tags: [
      CAT_LABEL[meta.c] || 'Studio',
      suite[0] === '3' ? '300s wing' : suite[0] === '2' ? '200s wing' : '100s wing',
    ],
    hours: '',
  };
  if (suite === '301') {
    // Deuces Nail Studio, the first real card
    Object.assign(base, {
      claimed: true, open: true,
      photo: '../../assets/photos/1000040455.jpg',
      bio: 'Sage-walled and softly lit, a quiet, careful place for nails done with intention. Gel, pedicures, nail art. Appointments preferred, walk-ins welcome when the chair is open.',
      tags: ['Gel', 'Pedicure', 'Nail Art', 'Structured Mani'],
      hours: 'Tue–Sat 10–6',
    });
  }
  if (suite === '103') {
    // Soul and Beauty Day Spa, claimed via the interest form 8/11/26
    Object.assign(base, {
      claimed: true, open: true,
      photo: '../../assets/photos/salonplus-103-soulandbeauty.png',
      photos: [
        '../../assets/photos/salonplus-103-soulandbeauty-facial.jpg',
        '../../assets/photos/salonplus-103-soulandbeauty-glow.jpg',
      ],
      bio: 'Christina specializes in therapeutic and medical massage, with anti-aging and hydra-facials and deep-clean facials alongside. Care that works below the surface.',
      instagram: 'soulandbeauty.dayspa',
      tags: ['Therapeutic Massage', 'Medical Massage', 'Hydra-Facial', 'Deep Clean Facial'],
      hours: 'Tue–Sat 10–6',
      book: 'https://www.vagaro.com/soulandbeautydayspa',
      bookLabel: 'Vagaro',
      call: '(623) 915-1755',
      text: '(623) 915-1755',
    });
  }
  if (suite === '212') {
    // True Story Tha Barber, claimed via the interest form 8/11/26
    Object.assign(base, {
      claimed: true, open: true,
      bio: 'Award-winning barber work, consistent and detailed, at a price that respects your wallet. Come find out for yourself.',
      instagram: 'true_story_tha_barber_',
      tags: ['Barber', 'Cuts', 'Award-Winning'],
      hours: 'Tue–Sun 10–7',
      book: 'https://truestorythabarber.square.site',
      bookLabel: 'Square',
      call: '(330) 962-6676',
      text: '(330) 962-6676',
    });
  }
  if (suite === '312') {
    /* Arizona Hair Replacement. Todd sent his business card and filled out
       the interest form the same day, and the two agree line for line. The
       hours and the "men and women" bit come from the form; the website
       only ever appeared on the card. */
    Object.assign(base, {
      claimed: true, open: true,
      bio: 'Todd Donahue, hair technician. Non-surgical hair replacement for men and women, by appointment. The reason for it, in the words printed on his own card: look your best, feel your best.',
      tags: ['Non-Surgical', 'Hair Replacement', 'Men & Women'],
      hours: 'Mon–Thu 11–7 · Fri 11–4',
      call: '(602) 900-1057',
      text: '(602) 900-1057',
      email: 'arizonahair@outlook.com',
      site: 'https://www.arizonahairreplacement.com',
      siteLabel: 'arizonahairreplacement.com',
      /* His card IS his brand, so it doubles as the hero. photoFit 'card'
         shows it whole instead of cover-cropping it; the gallery copy is
         what makes it readable, tap it and the lightbox opens it full size.
         Waiting on the cropped scan, uncomment both once it's saved:
      photo: '../../assets/photos/salonplus-312-arizonahair-card.jpg',
      photoFit: 'card',
      photos: ['../../assets/photos/salonplus-312-arizonahair-card.jpg'],
      */
    });
  }
  if (suite === '309') {
    /* Cuts From The Heart, claimed via the interest form 8/12/26. Leticia
       left the notes field empty, so the bio says only what the form
       actually told us. It gets warmer the day she sends a line about
       herself. */
    Object.assign(base, {
      claimed: true, open: true,
      bio: 'Cuts and styling with Leticia Gordon, by appointment. One chair, one client, in the 300s wing.',
      tags: ['Hair', 'Cuts', 'By Appointment'],
      hours: 'By appointment',
      call: '(623) 335-6668',
      text: '(623) 335-6668',
    });
  }
  if (suite === '311') {
    /* Colour Me Beautiful LLC, claimed via the interest form 8/11/26.
       Juanita's booking link came through inside a sentence on the form;
       the URL is the part that matters. Her Instagram handle spells colour
       the American way, which is hers to spell, not ours to correct. */
    Object.assign(base, {
      claimed: true, open: true,
      bio: 'Colour and styling with Juanita Salas, Thursdays through Sundays. Book straight from her own page.',
      instagram: 'colormebeautifulllc',
      tags: ['Hair', 'Colour', 'Styling'],
      hours: 'Thu–Sun',
      book: 'https://juanitasalas.glossgenius.com/',
      bookLabel: 'GlossGenius',
      call: '(602) 621-5196',
      text: '(602) 621-5196',
    });
  }
  if (suite === '316') {
    /* NeKendra’s Salon de Coiffure, claimed via the interest form 8/19/26.
       Notes and socials came in empty, so the bio says only what the form
       told us. Her hours arrived as "8a-5p" with no days named, which is
       why no days are printed here. */
    Object.assign(base, {
      claimed: true, open: true,
      bio: 'Hair with Kendra, in her own salon de coiffure. She opens at eight, earlier than most of this hallway.',
      tags: ['Hair', 'Cuts', 'Styling'],
      hours: '8a–5p',
      call: '(602) 575-7562',
      text: '(602) 575-7562',
    });
  }
  return base;
});

/* The live directory, swapped in over the fallback the moment it arrives. */
let tenants = FALLBACK_TENANTS;

const initialsOf = name =>
  name.replace(/[^A-Za-z ]/g, '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
const wingOf = suite =>
  suite[0] === '3' ? '300s wing' : suite[0] === '2' ? '200s wing' : '100s wing';

/* One admin row becomes one card. Anything a tier isn't allowed to show
   has already been stripped server-side, so an empty field here means
   "not permitted or not provided" and the card simply omits it. */
function tenantFromRow(r, i) {
  return {
    id: r.suite,
    name: r.name,
    service: r.service || 'Independent Studio',
    category: r.category || 'hair',
    suite: `Suite ${r.suite}`,
    avatar: initialsOf(r.name) || r.suite[0],
    theme: THEMES[i % THEMES.length],
    claimed: true,
    open: !!r.hours,          // posted hours is what makes a card read as open
    tier: r.tier,
    photo: r.photo || undefined,
    photos: (r.photos || []).length ? r.photos : undefined,
    photoFit: r.photoFit,
    bio: r.bio || `One of the independent studios that call Salon Plus home.`,
    tags: (r.tags || []).length ? r.tags : [CAT_LABEL[r.category] || 'Studio', wingOf(r.suite)],
    hours: r.hours || '',
    book: r.book || undefined,
    bookLabel: r.bookLabel || undefined,
    call: r.call || undefined,
    text: r.text || undefined,
    email: r.email || undefined,
    site: r.site || undefined,
    siteLabel: r.site ? r.site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : undefined,
    instagram: r.instagram || undefined,
    facebook: r.facebook || undefined,
    tiktok: r.tiktok || undefined,
  };
}

async function loadDirectory() {
  try {
    const res = await fetch('/api/salonplus-admin', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'directory', building: 'salonplus' }),
    });
    if (!res.ok) return;
    const rows = (await res.json()).rows || [];
    /* An empty answer is more likely a misconfigured deploy than an empty
       building, and showing nothing is worse than showing yesterday's
       roster, so the fallback stands. */
    if (!rows.length) return;

    tenants = rows.map(tenantFromRow);
    renderDiscoverCards();
    renderDirectory();
    const view = activeViewName();
    if (view === 'specials') renderSpecials();
    if (view === 'saved') renderSaved();
    if (currentTenant) {
      const still = tenants.find(t => t.id === currentTenant.id);
      if (still) openTenant(still.id); else closeSheetRaw();
    }
  } catch {
    /* Offline, or a local static preview with no function runtime. The
       fallback roster is already on screen. */
  }
}

// Vacancies: the board's availability data was years stale, so we list
// nothing until the leasing office confirms what's actually open.
const vacancies = [];

const didYouKnow = [
  { theme: 'sage', eyebrow: 'Worth the walk', text: 'Deuces Nail Studio is sage-walled, softly lit, and does nails with intention. Suite 301, watch it light up on the map.', link: 'See Deuces', linkId: '301' },
  { theme: 'clay', eyebrow: 'While you\'re here', text: 'Getting nails done? A fresh cut is thirty steps away. A facial, maybe forty. That\'s the whole point of this roof.', link: 'Meet the neighbors', view: 'directory' },
  { theme: 'sand', eyebrow: 'The sweet stuff', text: 'Studios post coupons, welcome offers, and specials right here in the app as they move in.', link: 'Check the specials', view: 'specials' },
  { theme: 'sage', eyebrow: 'Your studio here', text: 'Work in this building? Your listing is free while the neighborhood builds. Two minutes, and you\'re on the map.', link: 'Claim your card', href: '../#join' },
];

/* ----- coupons & specials -------------------------------------------------
   Studios post these themselves at /salonplus/offer/, assembled from
   dropdowns and composed server-side. Shape:
   { id, suite, title, detail, expires } — rendered newest-first.

   Nobody prunes this list. The endpoint only returns offers that are
   still live and haven't run out, so an expired coupon leaves the app
   without anyone touching it. */
let SPECIALS = [];

async function loadSpecials() {
  try {
    const res = await fetch('/api/salonplus-specials', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'list', building: 'salonplus' }),
    });
    if (!res.ok) return;
    SPECIALS = (await res.json()).rows || [];
    /* Re-render only if they're already looking at the tab; otherwise
       switchView will render it fresh when they get there. */
    if (document.querySelector('#view-specials.active')) renderSpecials();
  } catch {
    /* Offline, or a local static preview with no function runtime. The
       empty state already says the right thing, so say nothing. */
  }
}

function renderSpecials() {
  const list = document.getElementById('specialsList');
  if (!list) return;
  if (!SPECIALS.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="em-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 12 22l-8.59-8.59A2 2 0 0 1 3 12V4a1 1 0 0 1 1-1h8a2 2 0 0 1 1.41.59L22 12a2 2 0 0 1-1.41 1.41z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
        </div>
        <div class="em-title serif">Nothing posted yet</div>
        <p>The studios are just moving in, specials land here as they claim their cards. In the meantime, go meet someone new.</p>
        <button class="btn btn-primary" type="button" onclick="switchView('directory')" style="margin-top:16px;">Browse the studios</button>
      </div>`;
    return;
  }
  list.innerHTML = SPECIALS.map(s => {
    const t = tenants.find(x => x.id === s.suite);
    return `
      <div class="directory-row" onclick="openTenant('${s.suite}')">
        ${t ? avatarHTML(t, 'row') : `<div class="row-avatar av-bone">${s.suite}</div>`}
        <div class="row-meta">
          <div class="tenant-name">${escapeHtml(s.title)}</div>
          <div class="tenant-service">${escapeHtml(t ? t.name : 'Suite ' + s.suite)}${s.detail ? ' · ' + escapeHtml(s.detail) : ''}</div>
          ${s.expires ? `<div class="row-tags"><span class="row-tag">Through ${escapeHtml(s.expires)}</span></div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ============ STATE ============
let savedIds = new Set();
let activeFilter = 'all';
let searchTerm = '';
let currentTenant = null;

// ============ HELPERS ============
function claimedPillHTML(t, variant) {
  if (t.claimed) return '';
  return variant === 'on-photo'
    ? `<span class="test-pill on-photo">Unclaimed</span>`
    : `<span class="test-pill">Unclaimed</span>`;
}

function avatarHTML(t, size) {
  if (size === 'row') {
    return t.photo
      ? `<div class="row-avatar has-photo" style="background-image: url('${t.photo}');"></div>`
      : `<div class="row-avatar ${t.theme}">${t.avatar}</div>`;
  }
  if (size === 'pair') {
    return t.photo
      ? `<div class="pair-avatar has-photo" style="background-image: url('${t.photo}');"></div>`
      : `<div class="pair-avatar ${t.theme}">${t.avatar}</div>`;
  }
  const s = statusInfo(t);
  if (t.photo) {
    return `<div class="tenant-photo" style="background-image: url('${t.photo}');">
              <span class="status-pill is-${s.state}"><span class="dot"></span>${s.label}</span>
            </div>`;
  }
  return `<div class="tenant-avatar ${t.theme}" style="position:relative;">${t.avatar}${claimedPillHTML(t, 'on-photo')}</div>`;
}

/* Status: no live hours data yet, so claimed cards show their posted hours
   and unclaimed cards stay neutral instead of pretending to be open.
   A card built off a business card has no hours at all, so it points at
   the phone number rather than guessing open or closed. */
function statusInfo(t) {
  if (!t.claimed)          return { state: 'closed', label: 'Not claimed yet' };
  if (t.open)              return { state: 'available', label: 'Open today' };
  if (!t.hours && t.call)  return { state: 'closed', label: 'Call for hours' };
  return { state: 'closed', label: 'Closed' };
}
function statusPillHTML(t) {
  const s = statusInfo(t);
  return `<div class="row-status is-${s.state}"><span class="dot"></span>${s.label}</div>`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// ============ RENDER ============
function renderDYK() {
  const wrap = document.getElementById('dykScroll');
  wrap.innerHTML = didYouKnow.map((d, i) => {
    const action = d.linkId ? `openTenant('${d.linkId}')`
                 : d.view   ? `switchView('${d.view}')`
                 :            `location.href='${d.href}'`;
    return `
    <div class="dyk-card" data-theme="${d.theme}" onclick="${action}">
      <div class="dyk-eyebrow">${d.eyebrow}</div>
      <p>${d.text}</p>
      <span class="dyk-link">${d.link} →</span>
    </div>`;
  }).join('');
}

function pickFeaturedTenant() {
  const candidates = tenants.filter(t => t.photo);
  if (candidates.length > 0) {
    const dayIdx = Math.floor(Date.now() / 86_400_000) % candidates.length;
    return candidates[dayIdx];
  }
  return tenants[0];
}

function renderDiscoverCards() {
  const elDir = document.getElementById('mc-dir-count');
  if (elDir) elDir.textContent = tenants.length;

  const welcomeCount = document.getElementById('welcomeCount');
  if (welcomeCount) welcomeCount.textContent = tenants.length;

  const featured = pickFeaturedTenant();
  const iconEl = document.getElementById('mcFeaturedIcon');
  const labelEl = document.getElementById('mcFeaturedLabel');
  const metaEl = document.getElementById('mcFeaturedMeta');
  if (iconEl && labelEl && metaEl) {
    if (featured.photo) {
      iconEl.style.backgroundImage = `url('${featured.photo}')`;
      iconEl.innerHTML = '';
    } else {
      iconEl.classList.add(featured.theme);
      iconEl.innerHTML = `<span class="serif" style="font-size:18px;">${featured.avatar}</span>`;
    }
    labelEl.textContent = featured.name;
    metaEl.textContent = `Featured today · ${featured.service.split('·')[0].split('&')[0].split(',')[0].trim()}`;
  }

  const elSaved = document.getElementById('mc-saved-count');
  if (elSaved) elSaved.textContent = savedIds.size;
  const elVacancy = document.getElementById('mc-vacancy-count');
  if (elVacancy) elVacancy.textContent = vacancies.length;
}

function renderVacancies() {
  const list = document.getElementById('vacancyList');
  if (!list) return;
  if (!vacancies.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="em-title serif">The list is being re-verified</div>
        <p>Rather than show you stale availability, we're confirming it suite by suite. The leasing office in Suite 106 has the real answer today.</p>
      </div>`;
    return;
  }
  list.innerHTML = vacancies.map(v => {
    const visual = v.photo
      ? `<div class="row-avatar has-photo" style="background-image: url('${v.photo}');"></div>`
      : `<div class="row-avatar av-bone" style="font-size:16px;">${v.suite_number}</div>`;
    return `
      <div class="directory-row" onclick="openVacancyContact('${v.id}')">
        ${visual}
        <div class="row-meta">
          <div class="tenant-name">Suite ${v.suite_number}</div>
          <div class="tenant-service">${v.description}</div>
          <div class="row-tags">
            <span class="row-tag">Available ${v.available_from}</span>
          </div>
        </div>
        <div class="row-status" style="color: var(--sage-deep);">
          <span class="dot"></span>For lease
        </div>
      </div>
    `;
  }).join('');
}

function openVacancyContact(id) {
  const v = vacancies.find(x => x.id === id);
  if (!v) return;
  showToast(`${v.contact_note} · Suite ${v.suite_number}`);
}

function openFeatured() {
  openTenant(pickFeaturedTenant().id);
}

function renderDirectory() {
  const list = document.getElementById('directoryList');
  const filtered = tenants.filter(t => {
    if (activeFilter !== 'all' && t.category !== activeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return t.name.toLowerCase().includes(q) ||
             t.service.toLowerCase().includes(q) ||
             t.suite.toLowerCase().includes(q) ||
             t.tags.some(tag => tag.toLowerCase().includes(q));
    }
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="em-title serif">No matches</div><p>Try a different search or filter.</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(t => `
    <div class="directory-row" onclick="openTenant('${t.id}')">
      ${avatarHTML(t, 'row')}
      <div class="row-meta">
        <div class="tenant-name" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>${escapeHtml(t.name)}</span>${claimedPillHTML(t)}
        </div>
        <div class="tenant-service">${t.service}</div>
        <div class="row-tags">
          <span class="row-tag">${t.suite}</span>
          <span class="row-tag">${CAT_LABEL[t.category] || 'Studio'}</span>
        </div>
      </div>
      ${statusPillHTML(t)}
    </div>
  `).join('');
}

function renderSaved() {
  const list = document.getElementById('savedList');
  const empty = document.getElementById('savedEmpty');
  const saved = tenants.filter(t => savedIds.has(t.id));

  if (saved.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  list.style.display = 'flex';
  empty.style.display = 'none';
  list.innerHTML = saved.map(t => `
    <div class="directory-row" onclick="openTenant('${t.id}')">
      ${avatarHTML(t, 'row')}
      <div class="row-meta">
        <div class="tenant-name" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>${escapeHtml(t.name)}</span>${claimedPillHTML(t)}
        </div>
        <div class="tenant-service">${t.service}</div>
      </div>
      ${statusPillHTML(t)}
    </div>
  `).join('');
}

function updateSavedBadge() {
  const badge = document.getElementById('savedCount');
  if (savedIds.size > 0) {
    badge.style.display = 'grid';
    badge.textContent = savedIds.size;
  } else {
    badge.style.display = 'none';
  }
  const splashCount = document.getElementById('mc-saved-count');
  if (splashCount) splashCount.textContent = savedIds.size;
}

// ============ BACK BUTTON =================================================
// The phone's back button peels UI layers (lightbox → map modal → sheet →
// view) instead of leaving the site; only the discover screen backs out.
// Every opened layer pushes a history entry paired with a close function;
// popstate runs the topmost. Layers closed in the UI leave their entry
// behind as a no-op, which the handler quietly consumes on the next back.
const layerStack = [];

function pushLayer(name, closeFn) {
  layerStack.push({ name, closeFn });
  history.pushState({ spLayer: name }, '');
}

/* UI close controls route through here: if this layer is on top, pop the
   history entry (popstate does the closing); otherwise close directly. */
function closeLayerFromUi(name, rawClose) {
  const top = layerStack[layerStack.length - 1];
  if (top && top.name === name) history.back();
  else rawClose();
}

window.addEventListener('popstate', () => {
  const layer = layerStack.pop();
  if (!layer) return;                    // nothing of ours: browser leaves normally
  const did = layer.closeFn();
  // Stale entry (already closed in the UI): chain another back so the
  // user's press always visibly does something — including leaving the
  // site when no real layers remain.
  if (did === false) history.back();
});

function activeViewName() {
  const v = document.querySelector('.view.active');
  return v ? v.id.replace('view-', '') : 'discover';
}

// ============ INTERACTIONS ============
function switchView(view) {
  /* The nav sits above an open profile sheet now, so a tap can land while a
     studio's card is up. Put the card away first, otherwise the new view
     arrives underneath it. Closing it raw leaves a stale 'sheet' layer on
     the stack, which popstate already knows to skip. */
  const sheet = document.getElementById('sheet');
  if (sheet && sheet.classList.contains('open')) closeSheetRaw();

  if (view === 'discover') {
    const top = layerStack[layerStack.length - 1];
    if (top && top.name === 'view') { history.back(); return; }
    switchViewRaw('discover');
    return;
  }
  const hasViewLayer = layerStack.some(l => l.name === 'view');
  switchViewRaw(view);
  if (!hasViewLayer) pushLayer('view', () => {
    if (activeViewName() !== 'discover') { switchViewRaw('discover'); return true; }
    return false;
  });
}

function switchViewRaw(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  const primaryViews = ['discover', 'directory', 'saved'];
  const parent = primaryViews.includes(view) ? view : 'discover';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === parent));
  if (view === 'saved') renderSaved();
  if (view === 'discover') renderDiscoverCards();
  if (view === 'vacancies') renderVacancies();
  if (view === 'specials') renderSpecials();
  if (view === 'map') {
    renderMap();
    // Only auto-expand to fullscreen when a route is active; browsing stays
    // inline so the map-view search box is discoverable.
    if (routeTarget && typeof window.openMapModal === 'function') {
      setTimeout(function() { window.openMapModal(); }, 0);
    }
  }
  window.scrollTo(0, 0);
}

function openTenant(id) {
  const t = tenants.find(x => x.id === id);
  if (!t) return;
  currentTenant = t;
  const isSaved = savedIds.has(t.id);
  // "While you're here", other studios in a different category, cross-pollination.
  const others = tenants.filter(p => p.id !== t.id && p.category !== t.category);
  const sameCat = tenants.filter(p => p.id !== t.id && p.category === t.category);
  const pairs = others.length >= 3 ? others.slice(0, 4) : others.concat(sameCat).slice(0, 4);

  const s = statusInfo(t);
  const pillClass = s.state === 'available' ? 'open' : 'closed';
  const heroVisual = t.photo
    ? `<div class="profile-hero has-photo${t.photoFit === 'card' ? ' is-card' : ''}" style="background-image: url('${t.photo}');">
         <span class="photo-tag ${pillClass}"><span class="dot"></span>${s.label}</span>
       </div>`
    : `<div class="profile-hero ${t.theme}" style="position:relative;">${t.avatar}${claimedPillHTML(t, 'on-photo')}</div>`;

  document.getElementById('sheetContent').innerHTML = `
    ${heroVisual}
    ${renderSocials(t)}
    <div class="profile-body">
      <div class="profile-name">${escapeHtml(t.name)}</div>
      <div class="profile-service">${t.service}</div>
      <div class="profile-meta">
        <span><strong>${t.suite}</strong></span>
        <span style="color: var(--cream-40)">•</span>
        <span>${t.hours || (t.call ? 'Call for hours' : 'Hours coming soon')}</span>
      </div>
      <div class="profile-bio">${t.bio}</div>
      <div class="profile-tags">
        ${t.tags.map(tag => `<span class="profile-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
      ${t.photos && t.photos.length ? `
      <div class="profile-gallery">
        ${t.photos.map(p => `<button class="pg-shot" type="button" style="background-image:url('${p}')" onclick="openLightbox('${p}')" aria-label="View photo full size"></button>`).join('')}
      </div>` : ''}
      <div class="profile-actions">
        ${renderContactActions(t, isSaved)}
      </div>
      <div class="pair-with">
        <h3>While you're at <em>${escapeHtml(t.name.split(' ')[0])}</em>…</h3>
        <div class="sub">Other studios under this roof. Walk over after, or save them for next time.</div>
        <div class="pair-scroll">
          ${pairs.map(p => `
            <div class="pair-card" onclick="openTenant('${p.id}')">
              ${avatarHTML(p, 'pair')}
              <div class="pair-name">${escapeHtml(p.name)}</div>
              <div class="pair-service">${p.service.split('·')[0].split('&')[0].split(',')[0].trim()}</div>
              <div class="pair-meta" style="font-size:10px;color:var(--sage-deep);letter-spacing:0.1em;text-transform:uppercase;font-weight:600;margin-top:3px;display:flex;align-items:center;gap:4px;">
                <span style="width:5px;height:5px;border-radius:50%;background:var(--sage-deep);display:inline-block;"></span>
                ${p.suite}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  const wasOpen = document.getElementById('sheet').classList.contains('open');
  document.getElementById('sheet').classList.add('open');
  document.getElementById('sheetBackdrop').classList.add('open');
  if (!wasOpen) pushLayer('sheet', () => {
    if (document.getElementById('sheet').classList.contains('open')) { closeSheetRaw(); return true; }
    return false;
  });
}

/* ============ SOCIAL LINKS ==============================================
   Tenants enter handles or full links on the interest form; normalize
   either into a real profile URL and show them as tappable pills. */
function socialUrl(kind, v) {
  if (!v) return null;
  v = v.trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '').replace(/^.*\.com\//i, '').replace(/\/+$/, '');
  if (!handle) return null;
  if (kind === 'instagram') return `https://instagram.com/${handle}`;
  if (kind === 'facebook')  return `https://facebook.com/${handle}`;
  if (kind === 'tiktok')    return `https://tiktok.com/@${handle}`;
  return null;
}

function renderSocials(t) {
  // Real brand glyphs (single-color, inherit the pill's ink)
  const ICONS = {
    instagram: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/></svg>',
    facebook:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    tiktok:    '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  };
  const LABELS = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' };
  const links = ['instagram', 'facebook', 'tiktok']
    .map(k => ({ k, url: socialUrl(k, t[k]) }))
    .filter(s => s.url);
  if (!links.length) return '';
  return `<div class="profile-socials">
    ${links.map(s => `<a class="social-icon" href="${s.url}" target="_blank" rel="noopener noreferrer" aria-label="${LABELS[s.k]}" title="${LABELS[s.k]}">${ICONS[s.k]}</a>`).join('')}
  </div>`;
}

/* Tap a gallery shot, see it big; tap anywhere to put it away. */
function openLightbox(src) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML = '<img alt="">';
    lb.addEventListener('click', () => closeLayerFromUi('lightbox', () => lb.classList.remove('open')));
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = src;
  const wasOpen = lb.classList.contains('open');
  lb.classList.add('open');
  if (!wasOpen) pushLayer('lightbox', () => {
    if (lb.classList.contains('open')) { lb.classList.remove('open'); return true; }
    return false;
  });
}

function closeSheet() {
  closeLayerFromUi('sheet', closeSheetRaw);
}

function closeSheetRaw() {
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('sheetBackdrop').classList.remove('open');
  currentTenant = null;
}

function toggleSave(id) {
  if (savedIds.has(id)) {
    savedIds.delete(id);
    showToast('Removed from saved');
  } else {
    savedIds.add(id);
    showToast('Saved');
  }
  updateSavedBadge();
  if (currentTenant && currentTenant.id === id) openTenant(id);
}

/* ============ CONTACT BUTTONS ============================================
   Booking/call/text buttons render when a tenant has claimed their card and
   listed them. Until then the primary CTA is claiming the card, that's the
   whole recruiting motion, in the product itself. */
function renderContactActions(t, isSaved) {
  const ICONS = {
    book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    call: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    text: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    map:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    site: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    email:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>',
    claim:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>'
  };
  const methods = [];
  if (t.book) methods.push({ key:'book', href:t.book, target:'_blank', rel:'noopener noreferrer',
    label: t.bookLabel ? `Book on ${t.bookLabel}` : `Book online` });
  if (t.call) methods.push({ key:'call', href:`tel:${t.call.replace(/[^0-9+]/g, '')}`, label:`Call ${t.call}` });
  if (t.text) methods.push({ key:'text', href:`sms:${t.text.replace(/[^0-9+]/g, '')}`, label:`Text ${t.text}` });
  /* A studio with no booking system still has the two things printed on
     every business card, a website and an email. Both come last so the
     phone stays the primary button when there's nothing to book. */
  if (t.site)  methods.push({ key:'site', href:t.site, target:'_blank', rel:'noopener noreferrer',
    label: t.siteLabel ? escapeHtml(t.siteLabel) : 'Visit the website' });
  if (t.email) methods.push({ key:'email', href:`mailto:${t.email}`, label:`Email ${escapeHtml(t.email)}` });

  const saveBtn = `
    <button class="btn btn-secondary ${isSaved ? 'saved' : ''}" onclick="toggleSave('${t.id}')" aria-label="${isSaved ? 'Unsave' : 'Save'}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>`;

  const suiteKey = getSuiteKey(t);
  const directionsHtml = suiteKey
    ? `<button class="btn btn-outline" type="button" onclick="showRouteTo('${t.id}')">
         ${ICONS.map} Show me on the map · ${escapeHtml(t.suite)}
       </button>`
    : '';

  /* Only an UNCLAIMED card carries this, and then it's the recruiting ask.
     A claimed card is customer-facing: someone looking up a manicure has no
     use for a button aimed at the studio. Studios change their own details
     from /salonplus/offer/, which they already hold a code for, so there's
     one tenant door instead of one on every card. */
  const claimHtml = t.claimed ? '' : `
    <a class="btn btn-outline" href="${CLAIM_URL(t.id)}" style="border-style:dashed;">
      ${ICONS.claim} This is my studio, claim my free card
    </a>`;

  if (methods.length === 0) {
    return `
      <div class="profile-actions-row">
        <button class="btn btn-primary" type="button" onclick="showRouteTo('${t.id}')" ${suiteKey ? '' : 'disabled style="opacity:.55;cursor:default;"'}>
          ${ICONS.map} Show me on the map
        </button>
        ${saveBtn}
      </div>
      ${claimHtml}`;
  }
  const [primary, ...rest] = methods;
  const primaryHtml = `
    <a class="btn btn-primary" href="${primary.href}"${primary.target ? ` target="${primary.target}" rel="${primary.rel}"` : ''}>
      ${ICONS[primary.key]} ${primary.label}
    </a>`;
  const restHtml = rest.map(m => `
    <a class="btn btn-outline" href="${m.href}"${m.target ? ` target="${m.target}" rel="${m.rel}"` : ''}>
      ${ICONS[m.key]} ${m.label}
    </a>`).join('');
  return `
    <div class="profile-actions-row">
      ${primaryHtml}
      ${saveBtn}
    </div>
    ${restHtml}
    ${directionsHtml}
    ${claimHtml}
  `;
}

/* ============ FLOOR-PLAN MAP ============================================
   Corridor-aware wayfinding. One entrance, so "you are here" is real:
   routes walk the hallway centerlines via shortest path, and the target
   suite glows, "Show me the way" reads like actual directions. */
const YAH = LAYOUT.entrance;
let routeTarget = null;
let mapBuilt = false;

function getSuiteKey(t) {
  const s = (t && t.suite ? String(t.suite) : '').trim();
  const m = s.match(/\d+[A-E]?/);
  if (!m) return null;
  return LAYOUT.rooms.some(r => r.s === m[0]) ? m[0] : null;
}
function cssEscape(s) {
  return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(s) : String(s).replace(/(["\\])/g, '\\$1');
}
function roomBy(suiteKey) { return LAYOUT.rooms.find(r => r.s === suiteKey && !r.common); }
function corridorBy(id) { return LAYOUT.corridors.find(c => c.id === id); }

/* Door point: room center projected onto its fronting corridor's centerline. */
function doorPoint(room) {
  const c = corridorBy(room.cor);
  if (!c) return { x: room.x + room.w / 2, y: room.y + room.h / 2 };
  const s = c.seg;
  const cx = room.x + room.w / 2, cy = room.y + room.h / 2;
  if (s.x1 === s.x2) return { x: s.x1, y: Math.max(Math.min(cy, Math.max(s.y1, s.y2)), Math.min(s.y1, s.y2)) };
  return { x: Math.max(Math.min(cx, Math.max(s.x1, s.x2)), Math.min(s.x1, s.x2)), y: s.y1 };
}

/* ----- corridor graph + shortest path ----- */
function segPoints(seg) { return [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }]; }
function onSeg(p, s) {
  const eps = 0.5;
  if (s.x1 === s.x2) return Math.abs(p.x - s.x1) < eps && p.y >= Math.min(s.y1, s.y2) - eps && p.y <= Math.max(s.y1, s.y2) + eps;
  return Math.abs(p.y - s.y1) < eps && p.x >= Math.min(s.x1, s.x2) - eps && p.x <= Math.max(s.x1, s.x2) + eps;
}
function segIntersection(a, b) {
  // axis-aligned segments: one vertical, one horizontal
  const av = a.x1 === a.x2, bv = b.x1 === b.x2;
  if (av === bv) return null;
  const v = av ? a : b, h = av ? b : a;
  const p = { x: v.x1, y: h.y1 };
  return (onSeg(p, v) && onSeg(p, h)) ? p : null;
}
function buildRoute(from, fromSegId, to, toSegId) {
  // Nodes: endpoints, intersections, plus the from/to points on their segments.
  const segs = LAYOUT.corridors.map(c => ({ id: c.id, seg: c.seg }));
  const nodes = [];      // {x, y}
  const nodeKey = p => Math.round(p.x) + ',' + Math.round(p.y);
  const byKey = new Map();
  function addNode(p) {
    const k = nodeKey(p);
    if (!byKey.has(k)) { byKey.set(k, nodes.length); nodes.push({ x: p.x, y: p.y }); }
    return byKey.get(k);
  }
  const onSegNodes = new Map(); // segId -> [nodeIdx]
  segs.forEach(s => onSegNodes.set(s.id, []));
  segs.forEach(s => {
    segPoints(s.seg).forEach(p => onSegNodes.get(s.id).push(addNode(p)));
    segs.forEach(o => {
      if (o.id === s.id) return;
      const p = segIntersection(s.seg, o.seg);
      if (p) onSegNodes.get(s.id).push(addNode(p));
    });
  });
  const fromIdx = addNode(from); onSegNodes.get(fromSegId).push(fromIdx);
  const toIdx = addNode(to);     onSegNodes.get(toSegId).push(toIdx);

  // Edges: consecutive nodes along each segment.
  const adj = new Map();
  const link = (a, b) => {
    if (a === b) return;
    const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push({ to: b, d }); adj.get(b).push({ to: a, d });
  };
  segs.forEach(s => {
    const idxs = [...new Set(onSegNodes.get(s.id))];
    const vertical = s.seg.x1 === s.seg.x2;
    idxs.sort((a, b) => vertical ? nodes[a].y - nodes[b].y : nodes[a].x - nodes[b].x);
    for (let i = 0; i < idxs.length - 1; i++) link(idxs[i], idxs[i + 1]);
  });

  // Dijkstra
  const dist = new Array(nodes.length).fill(Infinity);
  const prev = new Array(nodes.length).fill(-1);
  const done = new Array(nodes.length).fill(false);
  dist[fromIdx] = 0;
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u === -1 || u === toIdx) break;
    done[u] = true;
    (adj.get(u) || []).forEach(e => {
      if (dist[u] + e.d < dist[e.to]) { dist[e.to] = dist[u] + e.d; prev[e.to] = u; }
    });
  }
  if (dist[toIdx] === Infinity) return null;
  const path = [];
  for (let v = toIdx; v !== -1; v = prev[v]) path.unshift(nodes[v]);
  return path;
}
function pointsToPath(points) {
  return points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
}
function computeRouteViewBox(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const PAD = 80;
  let x = Math.min(...xs) - PAD, y = Math.min(...ys) - PAD;
  let w = (Math.max(...xs) - Math.min(...xs)) + PAD * 2;
  let h = (Math.max(...ys) - Math.min(...ys)) + PAD * 2;
  // Zoom floor: short routes (a suite right by the entrance) shouldn't blow
  // up to billboard scale; always keep a good chunk of the building visible.
  const MIN_W = 520, MIN_H = 460;
  if (w < MIN_W) { x -= (MIN_W - w) / 2; w = MIN_W; }
  if (h < MIN_H) { y -= (MIN_H - h) / 2; h = MIN_H; }
  if (w / h < 0.7)      { const nw = h * 0.7;  x -= (nw - w) / 2; w = nw; }
  else if (w / h > 2.2) { const nh = w / 2.2; y -= (nh - h) / 2; h = nh; }
  x = Math.max(0, Math.min(x, LAYOUT.W - w));
  y = Math.max(0, Math.min(y, LAYOUT.H - h));
  w = Math.min(LAYOUT.W - x, w); h = Math.min(LAYOUT.H - y, h);
  return `${x} ${y} ${w} ${h}`;
}

/* ----- build the SVG once: hallways, rooms, labels ----- */
function buildMapSvg() {
  if (mapBuilt) return;
  const svg = document.getElementById('phoneMapSvg');
  const suitesG = document.getElementById('phoneMapSuites');
  const routeLayer = document.getElementById('routeLayer');
  if (!svg || !suitesG) return;

  // Repaint: a mall-directory look, not a blueprint. Hallways are wide
  // sage "streets", every suite is an identical rounded chip sitting on
  // its street, so shapes never lie about size and halls read as halls.
  const NS = 'http://www.w3.org/2000/svg';
  const hallG = document.createElementNS(NS, 'g');
  hallG.setAttribute('id', 'corridorLayer');
  // Solid-fill bands under one group opacity: where halls cross, the
  // overlap composites to the same flat shade instead of stacking darker,
  // and with no per-rect strokes there are no lines through junctions.
  let hallHtml = '<g opacity="0.16">' + LAYOUT.corridors.map(c =>
    `<rect x="${c.band.x}" y="${c.band.y}" width="${c.band.w}" height="${c.band.h}" rx="16" fill="rgb(107,122,95)"/>`
  ).join('') + '</g>';
  // street name down the breezeway, the map's spine
  const bw = LAYOUT.corridors.find(c => c.id === 'BW');
  if (bw) {
    const bx = bw.band.x + bw.band.w / 2 + 4, by = bw.band.y + bw.band.h / 2 + 60;
    hallHtml += `<text transform="translate(${bx}, ${by}) rotate(-90)" text-anchor="middle" style="font-size:13px; letter-spacing:.34em; fill: rgba(107,122,95,0.55); font-weight:600;">BREEZEWAY</text>`;
  }
  LAYOUT.labels.forEach(l => {
    hallHtml += `<text x="${l.x}" y="${l.y}" style="font-size:15px; letter-spacing:0.2em; fill: rgba(61,53,48,0.45); font-weight:600;">${l.text}</text>`;
  });
  hallG.innerHTML = hallHtml;
  svg.insertBefore(hallG, routeLayer);

  // Uniform chips
  const CHIP_W = 66, CHIP_H = 46, COM_W = 56, COM_H = 30;
  const COMMON_SHORT = { "Women's": 'WC', "Men's": 'WC', 'Restroom': 'WC', 'Break': 'Break', 'Waiting': 'Waiting', 'Laundry': 'Laundry', 'Electric': 'Utility' };
  suitesG.innerHTML = LAYOUT.rooms.map(r => {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    if (r.common) {
      return `<g class="common-room"><rect x="${cx - COM_W/2}" y="${cy - COM_H/2}" width="${COM_W}" height="${COM_H}" rx="10" fill="rgba(61,53,48,0.06)" stroke="rgba(61,53,48,0.10)"/>` +
             `<text x="${cx}" y="${cy + 3.5}" text-anchor="middle" style="font-size:10.5px; fill: rgba(61,53,48,0.45); letter-spacing:.03em;">${COMMON_SHORT[r.s] || r.s}</text></g>`;
    }
    const small = r.s.length > 3;
    return `<g class="suite" data-suite="${r.s}"><rect x="${cx - CHIP_W/2}" y="${cy - CHIP_H/2}" width="${CHIP_W}" height="${CHIP_H}" rx="12"/>` +
           `<text x="${cx}" y="${cy + 5}" text-anchor="middle"${small ? ' font-size="13"' : ''}>${r.s}</text></g>`;
  }).join('');

  // You-are-here pin at the single entrance
  const yah = document.getElementById('yahPin');
  if (yah) yah.setAttribute('transform', `translate(${YAH.x}, ${YAH.y})`);

  // Taps
  document.querySelectorAll('#phoneMapSuites .suite').forEach(g => {
    g.addEventListener('click', () => {
      const key = g.getAttribute('data-suite');
      const t = tenants.find(x => x.id === key);
      if (t) openTenant(t.id);
      else showToast(`Suite ${key} hasn't claimed its card yet · work here? Get listed free`);
    });
  });
  mapBuilt = true;
}

function paintSuiteStates() {
  document.querySelectorAll('#phoneMapSuites .suite').forEach(g => {
    const key = g.getAttribute('data-suite');
    g.classList.remove('is-occupied', 'is-open', 'is-vacant', 'is-target');
    const t = tenants.find(x => x.id === key);
    if (t) {
      g.classList.add('is-occupied');
      if (t.claimed && t.open) g.classList.add('is-open');
    }
    // Unclaimed suites stay neutral: we don't know if they're occupied or
    // open, so the map doesn't pretend either way.
  });
}

function renderMap() {
  buildMapSvg();
  paintSuiteStates();
  const svg = document.getElementById('phoneMapSvg');
  const routeLayer = document.getElementById('routeLayer');
  const card = document.getElementById('mapRouteCard');
  const eyebrow = document.getElementById('mapEyebrow');
  const headline = document.getElementById('mapHeadline');
  const subline = document.getElementById('mapSubline');
  if (!svg || !routeLayer) return;
  document.querySelectorAll('#phoneMapSuites .suite.is-target').forEach(s => s.classList.remove('is-target'));
  routeLayer.innerHTML = '';
  if (!routeTarget) {
    svg.setAttribute('viewBox', `0 0 ${LAYOUT.W} ${LAYOUT.H}`);
    if (card) card.hidden = true;
    if (eyebrow)  eyebrow.textContent = 'Suite map';
    if (headline) headline.innerHTML = 'You are <em>here</em>';
    if (subline)  subline.textContent = "Tap a suite to see who's inside, or search a name below.";
    return;
  }
  const t = tenants.find(x => x.id === routeTarget);
  const suiteKey = t ? getSuiteKey(t) : null;
  const room = suiteKey ? roomBy(suiteKey) : null;
  if (!t || !room) { routeTarget = null; return renderMap(); }

  const targetSuite = document.querySelector(`#phoneMapSuites .suite[data-suite="${cssEscape(suiteKey)}"]`);
  if (targetSuite) targetSuite.classList.add('is-target');

  // Full building stays in frame: with the whole map visible you can
  // follow the path from the entrance pin to the pulsing suite without
  // losing your bearings to a zoom.
  svg.setAttribute('viewBox', `0 0 ${LAYOUT.W} ${LAYOUT.H}`);
  if (card) {
    card.hidden = false;
    const av = document.getElementById('mrcAvatar');
    if (av) {
      if (t.photo) { av.style.backgroundImage = `url('${t.photo}')`; av.textContent = ''; }
      else { av.style.backgroundImage = ''; av.style.background = themeBg(t.theme); av.textContent = t.avatar || (t.name || '?')[0]; }
    }
    const nm = document.getElementById('mrcName'); if (nm) nm.textContent = t.name;
    const sb = document.getElementById('mrcSub');  if (sb) sb.textContent = `${t.suite} · lit up on the map`;
  }
  if (eyebrow)  eyebrow.textContent = 'Look for the glow';
  if (headline) headline.innerHTML = `<em>${escapeHtml(t.name)}</em>`;
  if (subline)  subline.textContent = `${t.suite} · start at the entrance pin, the glowing suite is theirs.`;
}

function themeBg(theme) {
  const map = {'av-sage':'#8B9A7E','av-moss':'#6B7A5F','av-clay':'#C97B5A','av-rose':'#C9928C',
    'av-stone':'#8B7E70','av-sand':'#C9B89A','av-rust':'#A8593E','av-fern':'#7A8B6F',
    'av-bone':'#E8DECA','av-amber':'#D4A574'};
  return map[theme] || '#8B7E70';
}
function showRouteTo(tenantId) {
  routeTarget = tenantId;
  closeSheetRaw();   // raw: we're moving forward to the map, not back
  switchView('map');
  if (typeof window.openMapModal === 'function') window.openMapModal();
}
function clearRoute() { routeTarget = null; renderMap(); }


function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// FILTER LISTENERS
document.querySelectorAll('#filterRow .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#filterRow .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    renderDirectory();
  });
});

// SEARCH LISTENER
document.getElementById('searchInput').addEventListener('input', e => {
  searchTerm = e.target.value;
  renderDirectory();
});

// INIT
renderDYK();
renderDiscoverCards();
renderDirectory();
renderVacancies();
updateSavedBadge();
loadSpecials();
/* Paints from the data.js fallback first so the building is never blank,
   then swaps in the live directory when it lands. */
loadDirectory();

/* Kiosk-style hero search on the Discover view, mirrors kiosk.html */
(function wireKioskSearch() {
  const input = document.getElementById('kioskSearchInput');
  const results = document.getElementById('kioskSearchResults');
  if (!input || !results) return;
  input.addEventListener('input', function() {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.hidden = true; results.innerHTML = ''; return; }
    const matches = tenants.filter(function(t) {
      const services = (t.tags || []).join(' ').toLowerCase();
      return (t.name || '').toLowerCase().indexOf(q) > -1
        || (t.service || '').toLowerCase().indexOf(q) > -1
        || services.indexOf(q) > -1
        || (t.suite || '').toLowerCase().indexOf(q) > -1;
    }).slice(0, 6);
    results.hidden = false;
    if (!matches.length) {
      results.innerHTML = '<div class="ks-result" style="opacity:.7;cursor:default;">No match, try a service like "nails" or "braids".</div>';
      return;
    }
    results.innerHTML = matches.map(function(t) {
      const mark = t.photo
        ? '<div class="ks-result-mark has-photo" style="background-image:url(\'' + t.photo + '\');"></div>'
        : '<div class="ks-result-mark">' + (t.avatar || (t.name || '?')[0]) + '</div>';
      return '<div class="ks-result" onclick="openTenant(\'' + t.id + '\')">' +
        mark +
        '<div class="ks-result-body">' +
          '<div class="ks-result-name">' + (t.name || '') + '</div>' +
          '<div class="ks-result-meta">' + (t.service || '').slice(0, 40) + '</div>' +
        '</div>' +
        '<div class="ks-result-suite">' + (t.suite || '') + '</div>' +
      '</div>';
    }).join('');
  });
  document.addEventListener('click', function(e) {
    if (!results.hidden && !results.contains(e.target) && e.target !== input) {
      results.hidden = true;
    }
  });
})();

/* Map-view search: type a salon's name, pick it, the line draws itself. */
(function wireMapSearch() {
  const input = document.getElementById('mapSearchInput');
  const results = document.getElementById('mapSearchResults');
  if (!input || !results) return;
  input.addEventListener('input', function() {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.hidden = true; results.innerHTML = ''; return; }
    const matches = tenants.filter(function(t) {
      return (t.name || '').toLowerCase().indexOf(q) > -1
        || (t.service || '').toLowerCase().indexOf(q) > -1
        || (t.suite || '').toLowerCase().indexOf(q) > -1;
    }).slice(0, 6);
    results.hidden = false;
    if (!matches.length) {
      results.innerHTML = '<div class="ks-result" style="opacity:.7;cursor:default;">No match, try a name like "Deuces" or a suite number.</div>';
      return;
    }
    results.innerHTML = matches.map(function(t) {
      const mark = t.photo
        ? '<div class="ks-result-mark has-photo" style="background-image:url(\'' + t.photo + '\');"></div>'
        : '<div class="ks-result-mark">' + (t.avatar || (t.name || '?')[0]) + '</div>';
      return '<div class="ks-result" data-tid="' + t.id + '">' +
        mark +
        '<div class="ks-result-body">' +
          '<div class="ks-result-name">' + (t.name || '') + '</div>' +
          '<div class="ks-result-meta">' + (t.service || '').slice(0, 40) + '</div>' +
        '</div>' +
        '<div class="ks-result-suite">' + (t.suite || '') + '</div>' +
      '</div>';
    }).join('');
    results.querySelectorAll('.ks-result[data-tid]').forEach(function(el) {
      el.addEventListener('click', function() {
        results.hidden = true;
        input.value = '';
        showRouteTo(el.getAttribute('data-tid'));
      });
    });
  });
  document.addEventListener('click', function(e) {
    if (!results.hidden && !results.contains(e.target) && e.target !== input) {
      results.hidden = true;
    }
  });
})();

/* Fullscreen map modal, clones the inline #phoneMapSuites SVG into the modal
   body so the visitor sees the full floor plan and the live route. Re-uses
   the same openTenant flow when a suite is tapped.
   NOTE: #mapModal sits BELOW the script tag in the HTML, so wiring must wait
   for DOMContentLoaded (the prototype's inline-IIFE version silently no-ops). */
function wirePhoneMapModal() {
  const fab = document.getElementById('mapExpandFab');
  const modal = document.getElementById('mapModal');
  const body = document.getElementById('mapModalBody');
  const closeBtn = document.getElementById('mapModalClose');
  const headEl = modal ? modal.querySelector('.map-modal-head') : null;
  if (!fab || !modal || !body || !closeBtn || !headEl) return;

  function renderHead() {
    const t = (typeof routeTarget !== 'undefined' && routeTarget)
      ? tenants.find(function(x) { return x.id === routeTarget; })
      : null;
    if (t) {
      headEl.innerHTML = ''
        + '<div style="display:flex; align-items:center; gap:12px; min-width:0;">'
        +   '<div class="mm-avatar" style="width:48px;height:48px;border-radius:12px;flex-shrink:0;' + (t.photo ? "background:url('" + t.photo + "') center/cover;" : "background:" + themeBg(t.theme) + ";display:grid;place-items:center;color:var(--surface-2);font-family:'Fraunces',serif;font-size:20px;") + '">' + (t.photo ? '' : (t.avatar || (t.name||'?')[0])) + '</div>'
        +   '<div style="min-width:0;">'
        +     '<h2 style="margin:0; font-family:\'Fraunces\',serif; font-weight:500; font-size:18px; color:var(--ink-on-cream); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escapeHtml(t.name) + '</h2>'
        +     '<div style="font-size:11px; letter-spacing:0.1em; text-transform:uppercase; font-weight:600; color:var(--ink-soft); margin-top:3px;">' + escapeHtml(t.suite) + ' &middot; ' + escapeHtml((t.service||'').split(/[·&,]/)[0].trim()) + '</div>'
        +   '</div>'
        + '</div>'
        + '<div style="display:flex; gap:8px;">'
        +   '<button type="button" id="mmViewProfile" style="background:var(--ink-on-cream); color:var(--cream); border:0; border-radius:999px; padding:9px 14px; font-weight:600; font-size:12px; letter-spacing:0.04em; cursor:pointer;">View profile</button>'
        +   '<button type="button" class="map-modal-close" id="mapModalClose" aria-label="Close map">&times;</button>'
        + '</div>';
      const vp = document.getElementById('mmViewProfile');
      if (vp) vp.addEventListener('click', function() {
        const tid = routeTarget;
        closeModal();
        if (tid) openTenant(tid);
      });
      const cb = document.getElementById('mapModalClose');
      if (cb) cb.addEventListener('click', closeModalFromUi);
    } else {
      headEl.innerHTML = ''
        + '<h2 style="margin:0; font-family:\'Fraunces\',serif; font-weight:500; font-size:20px; color:var(--ink-on-cream);">Suite map</h2>'
        + '<button type="button" class="map-modal-close" id="mapModalClose" aria-label="Close map">&times;</button>';
      const cb = document.getElementById('mapModalClose');
      if (cb) cb.addEventListener('click', closeModalFromUi);
    }
  }

  function openModal() {
    const inline = document.getElementById('phoneMapSvg');
    if (!inline) return;
    body.innerHTML = '';
    const clone = inline.cloneNode(true);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    clone.removeAttribute('id');
    body.appendChild(clone);
    clone.querySelectorAll('.suite').forEach(function(g) {
      g.addEventListener('click', function() {
        const key = g.getAttribute('data-suite');
        const t = tenants.find(function(x) { return x.id === key; });
        if (t) openTenant(t.id);
        else showToast('Suite ' + key + " hasn't claimed its card yet · work here? Get listed free");
      });
    });
    renderHead();
    const wasOn = modal.classList.contains('is-on');
    modal.classList.add('is-on');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (!wasOn) pushLayer('modal', function() {
      if (modal.classList.contains('is-on')) { closeModal(); return true; }
      return false;
    });
  }
  function closeModal() {
    modal.classList.remove('is-on');
    modal.setAttribute('aria-hidden', 'true');
    body.innerHTML = '';
    document.body.style.overflow = '';
  }
  function closeModalFromUi() { closeLayerFromUi('modal', closeModal); }

  window.openMapModal = openModal;
  window.closeMapModal = closeModalFromUi;

  fab.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModalFromUi);
  modal.addEventListener('click', function(e) { if (e.target === modal) closeModalFromUi(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('is-on')) closeModalFromUi();
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', wirePhoneMapModal);
} else {
  wirePhoneMapModal();
}
