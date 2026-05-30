/* Extracted from index.html on split. */
// ============ DATA ============
// Photos with `photo` are real Salon Plus tenants/suites; others use dark earthy gradient placeholders.
const tenants = [
  // Only Dueces is confirmed real — everyone else is is_concept: true (shows a "Test" pill)
  { id: 't1', name: 'Dueces Nail Studio', service: 'Manicure · Pedicure · Nail Art', category: 'nails', suite: 'Suite 200', avatar: 'D', theme: 'av-sage', open: true,
    is_concept: false,
    photo: 'assets/photos/1000040455.jpg',
    bio: 'Sage-walled and softly lit — a quiet, careful place for nails done with intention. Gel, pedicures, nail art. Eight years of practice. Appointments preferred, walk-ins welcome when the chair is open.',
    tags: ['Gel', 'Pedicure', 'Nail Art', 'Structured Mani'], hours: 'Tue–Sat 10–6' },
  { id: 't4', name: 'Indigo & Oak', service: 'Color & Balayage Specialist', category: 'hair', suite: 'Suite 204', avatar: 'IO', theme: 'av-moss', open: true, available: false, is_concept: true,
    photo: 'assets/photos/hair1.png',
    bio: 'Lived-in color, hand-painted balayage, and dimensional brunettes. Specializing in low-maintenance grow-outs for busy clients.',
    tags: ['Balayage', 'Color', 'Cuts', 'Toners', 'Gloss'], hours: 'Tue–Sat 9–6',
    book: 'https://indigoandoak.glossgenius.com', call: '555-204-0190', text: '555-204-0190', bookLabel: 'GlossGenius' },
  { id: 't5', name: 'Verdant Skin Studio', service: 'Facials & Skincare', category: 'skin', suite: 'Suite 212', avatar: 'V', theme: 'av-sage', open: true, is_concept: true,
    photo: 'assets/photos/facial.png',
    bio: 'Holistic facials with medical-grade results. Custom protocols for acne, hyperpigmentation, and aging skin. Licensed esthetician.',
    tags: ['Facials', 'Dermaplane', 'Chemical Peels', 'LED Therapy'], hours: 'Wed–Sun 10–7',
    book: 'https://verdantskin.vagaro.com', text: '555-212-0488', bookLabel: 'Vagaro' },
  { id: 't6', name: 'The Lash Loft', service: 'Lash Extensions & Lifts', category: 'brows', suite: 'Suite 210', avatar: 'LL', theme: 'av-rose', open: true, available: false, is_concept: true,
    photo: 'assets/photos/lash1.png',
    bio: 'Custom lash sets designed to your eye shape. Classic, hybrid, and volume — plus lifts and tints for low-maintenance days.',
    tags: ['Extensions', 'Lifts', 'Tints', 'Removals'], hours: 'Mon–Sat 9–7',
    book: 'https://thelashloft.booksy.com', bookLabel: 'Booksy' },
  { id: 't7', name: 'Bloom Brow Bar', service: 'Brows, Lamination & Microblading', category: 'brows', suite: 'Suite 206', avatar: 'B', theme: 'av-clay', open: true, is_concept: true,
    photo: 'assets/photos/lash2.png',
    bio: 'Brow shaping done right. Lamination, tinting, henna, and certified microblading. Walk-ins welcome for shaping.',
    tags: ['Shaping', 'Lamination', 'Tinting', 'Microblading'], hours: 'Tue–Sat 10–6',
    book: 'https://bloombrowbar.square.site', call: '555-206-1141', bookLabel: 'Square' },
  { id: 't8', name: 'Quiet Hands', service: 'Therapeutic Massage', category: 'wellness', suite: 'Suite 218', avatar: 'Q', theme: 'av-stone', open: false, is_concept: true,
    photo: 'assets/photos/massage1.png',
    bio: 'Deep tissue, Swedish, and prenatal massage by a licensed RMT. Quiet space, warm towels, no upselling.',
    tags: ['Deep Tissue', 'Swedish', 'Prenatal', 'Sports Recovery'], hours: 'Tue–Sat 11–8',
    call: '555-218-7720', text: '555-218-7720' },
  { id: 't9', name: 'Tilde Cosmetics', service: 'Bridal Makeup & Lessons', category: 'makeup', suite: 'Suite 208', avatar: 'T', theme: 'av-rust', open: true, is_concept: true,
    photo: 'assets/photos/makeup.png',
    bio: 'Editorial-trained makeup artist specializing in bridal, special event, and 1:1 personal makeup lessons.',
    tags: ['Bridal', 'Events', 'Lessons', 'Airbrush'], hours: 'By appointment',
    book: 'https://tildecosmetics.honeybook.com', text: '555-208-9914', bookLabel: 'HoneyBook' },
  { id: 't10', name: 'Finch Hair Studio', service: 'Precision Cuts & Men\'s Grooming', category: 'hair', suite: 'Suite 202', avatar: 'F', theme: 'av-sand', open: true, is_concept: true,
    photo: 'assets/photos/hair2.png',
    bio: 'Sharp cuts for all genders. Men\'s grooming, beard work, and that one good textured cut that grows out beautifully.',
    tags: ['Cuts', 'Men\'s Grooming', 'Beards', 'Styling'], hours: 'Tue–Sat 10–7',
    book: 'https://finchhair.booksy.com', call: '555-202-4408', text: '555-202-4408', bookLabel: 'Booksy' },
  { id: 't11', name: 'Rooted Wellness', service: 'Reiki & Acupuncture', category: 'wellness', suite: 'Suite 222', avatar: 'R', theme: 'av-fern', open: false, is_concept: true,
    photo: 'assets/photos/massage2.png',
    bio: 'Licensed acupuncturist offering treatments for stress, sleep, fertility, and chronic pain. Reiki sessions by appointment.',
    tags: ['Acupuncture', 'Reiki', 'Cupping', 'Herbs'], hours: 'Mon, Wed, Fri 9–5',
    call: '555-222-5050' },
  { id: 't12', name: 'Amaranth Aesthetics', service: 'Botox, Fillers & Medspa', category: 'wellness', suite: 'Suite 216', avatar: 'A', theme: 'av-amber', open: false, is_concept: true,
    photo: 'assets/photos/massage3.png',
    bio: 'Board-certified nurse injector. Conservative, natural-looking results. Botox, dermal fillers, and skin boosters.',
    tags: ['Botox', 'Fillers', 'Skin Boosters', 'Consults'], hours: 'Thu–Sat 11–6',
    book: 'https://amaranthaesthetics.acuityscheduling.com', bookLabel: 'Acuity' }
];

// If the owner admin has saved tenants to localStorage, use those instead of the seed.
// Admin writes to STORAGE_KEY = 'ss_tenants_v1' — see admin.html.
(function syncFromAdmin() {
  try {
    const stored = JSON.parse(localStorage.getItem('ss_tenants_v1') || 'null');
    if (Array.isArray(stored) && stored.length) {
      // Replace the seed array in place so all downstream references see it
      tenants.splice(0, tenants.length, ...stored);
    }
  } catch (e) { /* fall back to seed */ }
})();

// Vacancies — concept seed for the Available Suites view. Same admin sync.
let vacancies = [
  { id: 'v1', suite_number: '108', sqft: 110, monthly_rent: 875,  photo: '', description: 'Front-facing single-station suite. Two large windows. Plumbing for a shampoo station.', available_from: 'July 2026',   contact_note: 'Email the building owner to tour', is_concept: true },
  { id: 'v2', suite_number: '116', sqft: 140, monthly_rent: 1050, photo: '', description: 'Corner double suite with private storage. Recently renovated walls + flooring.',   available_from: 'August 2026', contact_note: 'Email the building owner to tour', is_concept: true }
];
(function syncVacanciesFromAdmin() {
  try {
    const stored = JSON.parse(localStorage.getItem('ss_vacancies_v1') || 'null');
    if (Array.isArray(stored)) {
      vacancies.splice(0, vacancies.length, ...stored);
    }
  } catch (e) { /* fall back to seed */ }
})();

const didYouKnow = [
  { theme: 'sage', eyebrow: 'Welcome', text: 'Dueces Nail Studio is our newest sage-walled suite — quiet, careful, by appointment.', link: 'See Dueces', linkId: 't1' },
  { theme: 'clay', eyebrow: 'Pair it', text: 'A facial at Verdant + a brow shape at Bloom — both on the 2nd floor, easy walk between.', link: 'See the pairing', linkId: 't5' },
  { theme: 'sand', eyebrow: 'Local secret', text: 'Tilde does 1:1 makeup lessons — perfect for the morning of a wedding day in the building.', link: 'See Tilde', linkId: 't9' },
  { theme: 'sage', eyebrow: 'Did you know?', text: 'There\'s a licensed massage therapist two doors down from your color appointment.', link: 'See Quiet Hands', linkId: 't8' },
  { theme: 'clay', eyebrow: 'Walk-ins', text: 'Bloom Brow Bar takes walk-ins for brow shaping — usually 15 minutes, no appointment needed.', link: 'See Bloom', linkId: 't7' }
];

// ============ STATE ============
let savedIds = new Set();
let activeFilter = 'all';
let searchTerm = '';
let currentTenant = null;

// ============ HELPERS ============
function testPillHTML(t, variant) {
  if (!t.is_concept) return '';
  // variant === 'on-photo' floats the pill over a photo or gradient
  return variant === 'on-photo'
    ? `<span class="test-pill on-photo">Test</span>`
    : `<span class="test-pill">Test</span>`;
}

function avatarHTML(t, size) {
  // size === 'row' uses .row-avatar, size === 'pair' uses .pair-avatar
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
  // card visual — featured tile. Three-state: Available / With a client / Closed.
  const s = statusInfo(t);
  const shortLabel = s.state === 'available' ? 'Available'
                   : s.state === 'busy'      ? 'With a client'
                   :                           'Closed';
  if (t.photo) {
    return `<div class="tenant-photo" style="background-image: url('${t.photo}');">
              <span class="status-pill is-${s.state}">
                <span class="dot"></span>${shortLabel}
              </span>
              ${testPillHTML(t, 'on-photo')}
            </div>`;
  }
  return `<div class="tenant-avatar ${t.theme}" style="position:relative;">
            ${t.avatar}
            ${testPillHTML(t, 'on-photo')}
          </div>`;
}

// ============ RENDER ============
function renderDYK() {
  const wrap = document.getElementById('dykScroll');
  wrap.innerHTML = didYouKnow.map(d => `
    <div class="dyk-card" data-theme="${d.theme}" onclick="openTenant('${d.linkId}')">
      <div class="dyk-eyebrow">${d.eyebrow}</div>
      <p>${d.text}</p>
      <span class="dyk-link">${d.link} →</span>
    </div>
  `).join('');
}

// Pick a featured tenant — prefer one with a real photo
function pickFeaturedTenant() {
  const candidates = tenants.filter(t => t.photo && isAvailableNow(t));
  if (candidates.length > 0) {
    // rotate daily so it doesn't feel static
    const dayIdx = Math.floor(Date.now() / 86_400_000) % candidates.length;
    return candidates[dayIdx];
  }
  return tenants[0];
}

function renderDiscoverCards() {
  // Two counts. "Open" = doors are open. "Available" = open AND can take you now.
  const openCount  = tenants.filter(t => isRealAndOpen(t)).length;
  const availCount = tenants.filter(t => isAvailableNow(t)).length;
  const elDir   = document.getElementById('mc-dir-count');
  const elNow   = document.getElementById('mc-now-count');
  const elAvail = document.getElementById('mc-avail-count');
  if (elDir)   elDir.textContent = tenants.length;
  if (elNow)   elNow.textContent = openCount;
  if (elAvail) elAvail.textContent = availCount;

  // Welcome hero — spell the studio count for warmth ("Eight studios. One roof.")
  const NUMBER_WORDS = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'];
  const welcomeCount = document.getElementById('welcomeCount');
  const welcomeOpen  = document.getElementById('welcomeOpen');
  const welcomeAvail = document.getElementById('welcomeAvail');
  if (welcomeCount) welcomeCount.textContent = tenants.length < NUMBER_WORDS.length ? NUMBER_WORDS[tenants.length] : String(tenants.length);
  if (welcomeOpen)  welcomeOpen.textContent  = openCount;
  if (welcomeAvail) welcomeAvail.textContent = availCount;

  // Featured today card
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

  // Saved count card
  const elSaved = document.getElementById('mc-saved-count');
  if (elSaved) elSaved.textContent = savedIds.size;

  // Available suites count card
  const elVacancy = document.getElementById('mc-vacancy-count');
  if (elVacancy) elVacancy.textContent = vacancies.length;
}

function renderVacancies() {
  const list = document.getElementById('vacancyList');
  if (!list) return;
  if (!vacancies.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="em-title serif">No suites listed</div>
        <p>Check back soon — the owner adds open rooms here.</p>
      </div>`;
    return;
  }
  list.innerHTML = vacancies.map(v => {
    const visual = v.photo
      ? `<div class="row-avatar has-photo" style="background-image: url('${v.photo}');"></div>`
      : `<div class="row-avatar av-bone" style="font-size:18px;">${v.suite_number || '·'}</div>`;
    return `
      <div class="directory-row" onclick="openVacancyContact('${v.id}')">
        ${visual}
        <div class="row-meta">
          <div class="tenant-name" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span>Suite ${v.suite_number || '—'}</span>
            ${v.is_concept ? '<span class="test-pill">Test</span>' : ''}
          </div>
          <div class="tenant-service">${v.sqft ? v.sqft + ' sq ft · ' : ''}${v.monthly_rent ? '$' + Number(v.monthly_rent).toLocaleString() + '/mo' : 'Rent on request'}</div>
          <div class="row-tags">
            <span class="row-tag">Available ${v.available_from || 'soon'}</span>
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
  showToast(`${v.contact_note || 'Contact the owner to tour'} · Suite ${v.suite_number}`);
}

function openFeatured() {
  const t = pickFeaturedTenant();
  openTenant(t.id);
}

function goRightNow() {
  switchView('directory');
  // "Open right now" lands on the Open-now filter (anyone whose doors are open).
  // Use the Available chip to narrow to tenants who can take you this minute.
  document.querySelectorAll('#filterRow .chip').forEach(c => c.classList.toggle('active', c.dataset.filter === 'open'));
  activeFilter = 'open';
  renderDirectory();
  const openCount = tenants.filter(t => isRealAndOpen(t)).length;
  const availCount = tenants.filter(t => isAvailableNow(t)).length;
  showToast(`${openCount} open · ${availCount} can take you now`);
}

// Whether a tenant is considered "open" (used for the status pill on cards/profile).
// Defensive about missing fields: if open isn't set, derive from status === 'active'.
function isOpenNow(t) {
  if (t.open === true)  return true;
  if (t.open === false) return false;
  return (t.status || 'active') === 'active';
}
// Real-and-open (any availability state) — used wherever we mean "real,
// currently-open tenants" regardless of whether they're with a client.
function isRealAndOpen(t) {
  return !t.is_concept && isOpenNow(t);
}
// Available = open AND tenant hasn't marked themselves "with a client".
// Default-true when unset so we don't surprise tenants who haven't opted in.
function isAvailableNow(t) {
  if (t.is_concept) return false;
  if (!isOpenNow(t)) return false;
  return t.available !== false;
}

function renderDirectory() {
  const list = document.getElementById('directoryList');
  const filtered = tenants.filter(t => {
    // "Open now" = doors open (may be with a client). "Available now" = open + free.
    if (activeFilter === 'open' && !isRealAndOpen(t)) return false;
    if (activeFilter === 'available' && !isAvailableNow(t)) return false;
    const isCategoryFilter = activeFilter !== 'all' && activeFilter !== 'open' && activeFilter !== 'available';
    if (isCategoryFilter && t.category !== activeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return t.name.toLowerCase().includes(q) ||
             t.service.toLowerCase().includes(q) ||
             t.tags.some(tag => tag.toLowerCase().includes(q));
    }
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="em-title serif">No matches</div><p>Try a different search or filter.</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(t => {
    const open = isOpenNow(t);
    return `
    <div class="directory-row" onclick="openTenant('${t.id}')">
      ${avatarHTML(t, 'row')}
      <div class="row-meta">
        <div class="tenant-name" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>${t.name}</span>${testPillHTML(t)}
        </div>
        <div class="tenant-service">${t.service}</div>
        <div class="row-tags">
          <span class="row-tag">${t.tags[0]}</span>
          <span class="row-tag">${t.tags[1]}</span>
        </div>
      </div>
${statusPillHTML(t)}
    </div>
  `;
  }).join('');
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
  list.innerHTML = saved.map(t => {
    const open = isOpenNow(t);
    return `
    <div class="directory-row" onclick="openTenant('${t.id}')">
      ${avatarHTML(t, 'row')}
      <div class="row-meta">
        <div class="tenant-name" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span>${t.name}</span>${testPillHTML(t)}
        </div>
        <div class="tenant-service">${t.service}</div>
      </div>
${statusPillHTML(t)}
    </div>
  `;
  }).join('');
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

// ============ INTERACTIONS ============
function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  // Bottom-nav only highlights the three primary tabs; map/owner show "Discover" as the active parent
  const primaryViews = ['discover', 'directory', 'saved'];
  const parent = primaryViews.includes(view) ? view : 'discover';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === parent));
  if (view === 'saved') renderSaved();
  if (view === 'discover') renderDiscoverCards();
  if (view === 'vacancies') renderVacancies();
  if (view === 'map') {
    renderMap();
    // Auto-expand so the visitor sees the full floor plan immediately, not
    // the inline preview that gets clipped on smaller screens.
    if (typeof window.openMapModal === 'function') {
      // Defer so renderMap finishes painting the suites + route before we clone.
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
  // "While you're here" — prefer other studios that are OPEN RIGHT NOW and in a different category.
  // This is the cross-pollination moment: someone came for one thing, here are alternatives a few doors down.
  const openOthers = tenants.filter(p => p.id !== t.id && isOpenNow(p) && p.category !== t.category);
  const sameCatOthers = tenants.filter(p => p.id !== t.id && isOpenNow(p) && p.category === t.category);
  const pairs = openOthers.length >= 3
    ? openOthers.slice(0, 4)
    : openOthers.concat(sameCatOthers).slice(0, 4);

  // Three-state hero pill: Open · Available / Open · With a client / Closed.
  const s = statusInfo(t);
  const pillClass = s.state === 'available' ? 'open' : (s.state === 'busy' ? 'busy' : 'closed');
  const pillLabel = s.state === 'available' ? 'Open · Available'
                  : s.state === 'busy'      ? 'Open · With a client'
                  :                           'Closed';
  const heroVisual = t.photo
    ? `<div class="profile-hero has-photo" style="background-image: url('${t.photo}');">
         <span class="photo-tag ${pillClass}">
           <span class="dot"></span>${pillLabel}
         </span>
         ${testPillHTML(t, 'on-photo')}
       </div>`
    : `<div class="profile-hero ${t.theme}" style="position:relative;">${t.avatar}${testPillHTML(t, 'on-photo')}</div>`;

  document.getElementById('sheetContent').innerHTML = `
    ${heroVisual}
    <div class="profile-body">
      <div class="profile-name">${t.name}</div>
      <div class="profile-service">${t.service}</div>
      <div class="profile-meta">
        <span><strong>${t.suite}</strong></span>
        <span style="color: var(--cream-40)">•</span>
        <span>${t.hours}</span>
      </div>
      <div class="profile-bio">${t.bio}</div>
      <div class="profile-tags">
        ${t.tags.map(tag => `<span class="profile-tag">${tag}</span>`).join('')}
      </div>
      <div class="profile-actions">
        ${renderContactActions(t, isSaved)}
      </div>
      <div class="pair-with">
        <h3>While you're at <em>${t.name.split(' ')[0]}</em>…</h3>
        <div class="sub">Other studios in the building, open right now. Walk over after — or save them for next time.</div>
        <div class="pair-scroll">
          ${pairs.map(p => `
            <div class="pair-card" onclick="openTenant('${p.id}')">
              ${avatarHTML(p, 'pair')}
              <div class="pair-name">${p.name}</div>
              <div class="pair-service">${p.service.split('·')[0].split('&')[0].split(',')[0].trim()}</div>
              <div class="pair-meta" style="font-size:10px;color:var(--sage-deep);letter-spacing:0.1em;text-transform:uppercase;font-weight:600;margin-top:3px;display:flex;align-items:center;gap:4px;">
                <span style="width:5px;height:5px;border-radius:50%;background:var(--sage-deep);display:inline-block;"></span>
                Open · ${p.suite}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  document.getElementById('sheet').classList.add('open');
  document.getElementById('sheetBackdrop').classList.add('open');
}

function closeSheet() {
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
   Each tenant chooses which contact methods to surface (book / call / text).
   Buttons render only for what they\'ve set, in priority order book → call → text.
   First method is the primary CTA next to the Save heart; the rest stack as
   outline buttons. "Show me the way" follows when the tenant has a real suite. */
function renderContactActions(t, isSaved) {
  const ICONS = {
    book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    call: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    text: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    map:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>'
  };
  const first = t.name.split(' ')[0];
  const methods = [];
  if (t.book) methods.push({ key:'book', href:t.book, target:'_blank', rel:'noopener noreferrer',
    label: t.bookLabel ? `Book on ${t.bookLabel}` : `Book online with ${first}` });
  if (t.call) methods.push({ key:'call', href:`tel:${t.call.replace(/[^0-9+]/g, '')}`, label:`Call ${t.call}` });
  if (t.text) methods.push({ key:'text', href:`sms:${t.text.replace(/[^0-9+]/g, '')}`, label:`Text ${t.text}` });

  const saveBtn = `
    <button class="btn btn-secondary ${isSaved ? 'saved' : ''}" onclick="toggleSave('${t.id}')" aria-label="${isSaved ? 'Unsave' : 'Save'}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>`;

  const suiteKey = getSuiteKey(t);
  const directionsHtml = suiteKey
    ? `<button class="btn btn-outline" type="button" onclick="showRouteTo('${t.id}')">
         ${ICONS.map} Show me the way · ${escapeHtml(t.suite)}
       </button>`
    : '';

  if (methods.length === 0) {
    return `
      <div class="profile-actions-row">
        <button class="btn btn-primary" disabled style="opacity:.55; cursor:default;">No contact method listed yet</button>
        ${saveBtn}
      </div>
      ${directionsHtml}`;
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
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

/* Three-way status helper. */
function statusInfo(t) {
  if (!isOpenNow(t))         return { state:'closed',    label:'Closed' };
  if (t.is_concept)          return { state:'available', label:'Available' };
  if (t.available !== false) return { state:'available', label:'Available' };
  return                            { state:'busy',      label:'With a client' };
}
function statusPillHTML(t) {
  const s = statusInfo(t);
  return `<div class="row-status is-${s.state}"><span class="dot"></span>${s.label}</div>`;
}

/* ============ FLOOR-PLAN MAP ============================================
   Browse mode = full building. Route mode = entered via "Show me the way",
   zooms the SVG viewBox onto the route and draws a sage dashed walking line. */
const YAH = { x: 80, y: 260 };
const NORTH_CORRIDOR_Y = 199;
const SOUTH_CORRIDOR_Y = 323;
let routeTarget = null;
let mapInitialized = false;

function getSuiteKey(t) {
  const s = (t && t.suite ? String(t.suite) : '').trim();
  if (!s) return null;
  const m = s.match(/\d+/);
  return m ? m[0] : null;
}
function cssEscape(s) {
  return (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(s) : String(s).replace(/(["\\])/g, '\\$1');
}
function getSuiteCenter(suiteKey) {
  const g = document.querySelector(`#phoneMapSuites .suite[data-suite="${cssEscape(suiteKey)}"]`);
  if (!g) return null;
  const r = g.querySelector('rect');
  const x = parseFloat(r.getAttribute('x'));
  const y = parseFloat(r.getAttribute('y'));
  const w = parseFloat(r.getAttribute('width'));
  const h = parseFloat(r.getAttribute('height'));
  return { x: x + w/2, y: y + h/2, top: y, bottom: y + h, left: x, right: x + w };
}
function buildRoutePoints(suiteKey) {
  const c = getSuiteCenter(suiteKey);
  if (!c) return null;
  const sx = c.x;
  const points = [{ x: YAH.x, y: YAH.y }];
  if (c.bottom <= 170) {
    points.push({ x: YAH.x, y: NORTH_CORRIDOR_Y });
    points.push({ x: sx,    y: NORTH_CORRIDOR_Y });
    points.push({ x: sx,    y: c.bottom });
  } else if (c.top >= 358) {
    points.push({ x: YAH.x, y: SOUTH_CORRIDOR_Y });
    points.push({ x: sx,    y: SOUTH_CORRIDOR_Y });
    points.push({ x: sx,    y: c.top });
  } else {
    points.push({ x: YAH.x, y: SOUTH_CORRIDOR_Y });
    points.push({ x: sx,    y: SOUTH_CORRIDOR_Y });
    points.push({ x: sx,    y: c.bottom });
  }
  return points;
}
function pointsToPath(points) {
  return points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ',' + p.y).join(' ');
}
function computeRouteViewBox(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const PAD = 70;
  let x = Math.min(...xs) - PAD, y = Math.min(...ys) - PAD;
  let w = (Math.max(...xs) - Math.min(...xs)) + PAD * 2;
  let h = (Math.max(...ys) - Math.min(...ys)) + PAD * 2;
  const desiredAspect = 1.05;
  if (w / h < desiredAspect) { const nw = h * desiredAspect; x -= (nw - w) / 2; w = nw; }
  else if (w / h > 2.4)      { const nh = w / 2.4;          y -= (nh - h) / 2; h = nh; }
  x = Math.max(0, x); y = Math.max(0, y);
  w = Math.min(1200 - x, w); h = Math.min(520 - y, h);
  return `${x} ${y} ${w} ${h}`;
}
function paintSuiteStates() {
  const byKey = {};
  tenants.forEach(t => { const k = getSuiteKey(t); if (k) byKey[k] = t; });
  document.querySelectorAll('#phoneMapSuites .suite').forEach(g => {
    const key = g.getAttribute('data-suite');
    g.classList.remove('is-occupied', 'is-open', 'is-vacant', 'is-target');
    const t = byKey[key];
    if (t) {
      g.classList.add('is-occupied');
      if (isOpenNow(t)) g.classList.add('is-open');
    } else if (/^1\d\d$/.test(key)) {
      g.classList.add('is-vacant');
    }
  });
}
function initMap() {
  if (mapInitialized) return;
  const byKey = {};
  tenants.forEach(t => { const k = getSuiteKey(t); if (k) byKey[k] = t; });
  document.querySelectorAll('#phoneMapSuites .suite').forEach(g => {
    g.addEventListener('click', () => {
      const key = g.getAttribute('data-suite');
      const t = byKey[key];
      if (t) openTenant(t.id);
      else showToast('No tenant here yet');
    });
  });
  mapInitialized = true;
}
function renderMap() {
  initMap();
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
  // Reset the YAH lean state — browse mode = no target = no lean.
  const yahEl = svg.querySelector('.you-are-here');
  if (yahEl) {
    yahEl.classList.remove('has-target');
    yahEl.style.removeProperty('--lean-x');
    yahEl.style.removeProperty('--lean-y');
  }
  if (!routeTarget) {
    svg.setAttribute('viewBox', '0 0 1200 520');
    if (card) card.hidden = true;
    if (eyebrow)  eyebrow.textContent = 'Suite map';
    if (headline) headline.innerHTML = 'You are <em>here</em>';
    if (subline)  subline.textContent = "Tap a suite to see who's inside.";
    return;
  }
  const t = tenants.find(x => x.id === routeTarget);
  const suiteKey = t ? getSuiteKey(t) : null;
  const points = suiteKey ? buildRoutePoints(suiteKey) : null;
  if (!t || !points) { routeTarget = null; return renderMap(); }
  const pathD = pointsToPath(points);
  routeLayer.innerHTML =
    `<path class="route-glow" d="${pathD}"/>` +
    `<path class="route-line" d="${pathD}"/>`;
  const targetSuite = document.querySelector(`#phoneMapSuites .suite[data-suite="${cssEscape(suiteKey)}"]`);
  if (targetSuite) targetSuite.classList.add('is-target');

  // Make the YAH dot "lean" toward the destination — a directional nudge that
  // reads as "step this way" without the marching-dash gimmick. Magnitude is
  // a few user-units; direction is the unit vector from YAH to suite center.
  if (yahEl) {
    const suiteC = getSuiteCenter(suiteKey);
    if (suiteC) {
      const dx = suiteC.x - YAH.x;
      const dy = suiteC.y - YAH.y;
      const dist = Math.hypot(dx, dy) || 1;
      const LEAN = 12; // user units in the SVG viewBox
      yahEl.style.setProperty('--lean-x', (dx / dist * LEAN).toFixed(2) + 'px');
      yahEl.style.setProperty('--lean-y', (dy / dist * LEAN).toFixed(2) + 'px');
      yahEl.classList.add('has-target');
    }
  }

  svg.setAttribute('viewBox', computeRouteViewBox(points));
  if (card) {
    card.hidden = false;
    const av = document.getElementById('mrcAvatar');
    if (av) {
      if (t.photo) { av.style.backgroundImage = `url('${t.photo}')`; av.textContent = ''; }
      else { av.style.backgroundImage = ''; av.style.background = themeBg(t.theme); av.textContent = t.avatar || (t.name || '?')[0]; }
    }
    const nm = document.getElementById('mrcName'); if (nm) nm.textContent = t.name;
    const sb = document.getElementById('mrcSub');  if (sb) sb.textContent = `${t.suite} · follow the line`;
  }
  if (eyebrow)  eyebrow.textContent = 'On your way to';
  if (headline) headline.innerHTML = `<em>${escapeHtml(t.name)}</em>`;
  if (subline)  subline.textContent = `${t.suite} · the sage line shows the walking route from the lobby.`;
}
function themeBg(theme) {
  const map = {'av-sage':'#8B9A7E','av-moss':'#6B7A5F','av-clay':'#C97B5A','av-rose':'#C9928C',
    'av-stone':'#8B7E70','av-sand':'#C9B89A','av-rust':'#A8593E','av-fern':'#7A8B6F',
    'av-bone':'#E8DECA','av-amber':'#D4A574'};
  return map[theme] || '#8B7E70';
}
function showRouteTo(tenantId) {
  // Route directly to the fullscreen modal — no more cramped inline view.
  // The modal header shows tenant info + "View profile" so the customer sees
  // the profile AND the map together, exactly as Anne wanted.
  routeTarget = tenantId;
  closeSheet();
  // renderMap() preps the inline SVG (paints target, draws route, sets viewBox),
  // then we clone it into the modal so the modal shows the routed state.
  switchView('map');
  if (typeof window.openMapModal === 'function') window.openMapModal();
}
function clearRoute() { routeTarget = null; renderMap(); }


function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
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

/* Kiosk-style hero search on the Discover view — mirrors kiosk.html */
(function wireKioskSearch() {
  const input = document.getElementById('kioskSearchInput');
  const results = document.getElementById('kioskSearchResults');
  if (!input || !results) return;
  input.addEventListener('input', function() {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.hidden = true; results.innerHTML = ''; return; }
    const matches = tenants.filter(function(t) {
      const services = (t.services || t.tags || []).join(' ').toLowerCase();
      return (t.name || '').toLowerCase().indexOf(q) > -1
        || (t.service || '').toLowerCase().indexOf(q) > -1
        || services.indexOf(q) > -1
        || (t.suite || '').toLowerCase().indexOf(q) > -1;
    }).slice(0, 6);
    results.hidden = false;
    if (!matches.length) {
      results.innerHTML = '<div class="ks-result" style="opacity:.7;cursor:default;">No match — try a service like "lash" or "color".</div>';
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
  // Dismiss results when tapping outside
  document.addEventListener('click', function(e) {
    if (!results.hidden && !results.contains(e.target) && e.target !== input) {
      results.hidden = true;
    }
  });
})();

/* Fullscreen map modal — clones the inline #phoneMapSuites SVG into the modal
   body so the visitor sees the full floor plan and the live route. Re-uses
   the same openTenant flow when a suite is tapped. */
(function wirePhoneMapModal() {
  const fab = document.getElementById('mapExpandFab');
  const modal = document.getElementById('mapModal');
  const body = document.getElementById('mapModalBody');
  const closeBtn = document.getElementById('mapModalClose');
  const headEl = modal ? modal.querySelector('.map-modal-head') : null;
  if (!fab || !modal || !body || !closeBtn || !headEl) return;

  // Re-render the header so the modal shows tenant info when routing
  // (so the visitor sees the profile AND the map at the same time).
  function renderHead() {
    const t = (typeof routeTarget !== 'undefined' && routeTarget)
      ? tenants.find(function(x) { return x.id === routeTarget; })
      : null;
    if (t) {
      headEl.innerHTML = ''
        + '<div style="display:flex; align-items:center; gap:12px; min-width:0;">'
        +   '<div class="mm-avatar" style="width:48px;height:48px;border-radius:12px;flex-shrink:0;' + (t.photo ? "background:url('" + t.photo + "') center/cover;" : "background:" + themeBg(t.theme) + ";display:grid;place-items:center;color:var(--surface-2);font-family:\'Fraunces\',serif;font-size:20px;") + '">' + (t.photo ? '' : (t.avatar || (t.name||'?')[0])) + '</div>'
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
      if (cb) cb.addEventListener('click', closeModal);
    } else {
      headEl.innerHTML = ''
        + '<h2 style="margin:0; font-family:\'Fraunces\',serif; font-weight:500; font-size:20px; color:var(--ink-on-cream);">Suite map</h2>'
        + '<button type="button" class="map-modal-close" id="mapModalClose" aria-label="Close map">&times;</button>';
      const cb = document.getElementById('mapModalClose');
      if (cb) cb.addEventListener('click', closeModal);
    }
  }

  function openModal() {
    // renderMap must have run so the inline SVG reflects current routeTarget /
    // suite states; we clone that into the modal.
    const inline = document.getElementById('phoneMapSvg');
    if (!inline) return;
    body.innerHTML = '';
    const clone = inline.cloneNode(true);
    clone.removeAttribute('width');
    clone.removeAttribute('height');
    clone.removeAttribute('id');
    body.appendChild(clone);
    // Suite taps in the modal: open that tenant's profile sheet — so the user
    // gets profile + map together (modal map stays open behind the sheet).
    clone.querySelectorAll('.suite').forEach(function(g) {
      g.addEventListener('click', function() {
        const key = g.getAttribute('data-suite');
        const t = tenants.find(function(x) { return getSuiteKey(x) === key; });
        if (t) openTenant(t.id);
      });
    });
    renderHead();
    modal.classList.add('is-on');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('is-on');
    modal.setAttribute('aria-hidden', 'true');
    body.innerHTML = '';
    document.body.style.overflow = '';
  }

  // Expose for switchView('map') and showRouteTo() to call.
  window.openMapModal = openModal;
  window.closeMapModal = closeModal;

  fab.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('is-on')) closeModal();
  });
})();
