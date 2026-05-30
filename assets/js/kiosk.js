/* Extracted from kiosk.html on split. */
  // Kiosk shows tenants' personal contact (call/text) — booking is intentionally
  // phone-app-only, since the kiosk is read-only and people will scan the QR to
  // act. `call` / `text` are the same shape used by index.html.
  const SEED_TENANTS = [
    { id:'t1', name:'Dueces Nail Studio', suite:'Suite 200', service:'Manicure · Pedicure · Nail Art',
      services:['Gel','Pedicure','Nail Art','Structured Mani'], category:'nails', open:true, status:'active',
      photo:'assets/photos/1000040455.jpg', avatar:'D', is_concept:false },
    { id:'t4', available:false, name:'Indigo & Oak', suite:'Suite 204', service:'Color & Balayage Specialist',
      services:['Balayage','Color','Cuts'], category:'hair', open:true, status:'active',
      photo:'assets/photos/hair1.png', avatar:'IO', is_concept:true,
      call:'555-204-0190', text:'555-204-0190' },
    { id:'t5', name:'Verdant Skin Studio', suite:'Suite 212', service:'Facials & Skincare',
      services:['Facials','Peels','LED'], category:'skin', open:true, status:'active',
      photo:'assets/photos/facial.png', avatar:'V', is_concept:true,
      text:'555-212-0488' },
    { id:'t6', available:false, name:'The Lash Loft', suite:'Suite 210', service:'Lash Extensions & Lifts',
      services:['Extensions','Lifts','Tints'], category:'brows', open:true, status:'active',
      photo:'assets/photos/lash1.png', avatar:'LL', is_concept:true },
    { id:'t7', available:false, name:'Bloom Brow Bar', suite:'Suite 206', service:'Brows, Lamination & Microblading',
      services:['Shaping','Lamination','Tinting'], category:'brows', open:true, status:'active',
      photo:'assets/photos/lash2.png', avatar:'B', is_concept:true,
      call:'555-206-1141' },
    { id:'t8', name:'Quiet Hands', suite:'Suite 218', service:'Therapeutic Massage',
      services:['Deep Tissue','Swedish','Prenatal'], category:'wellness', open:false, status:'active',
      photo:'assets/photos/massage1.png', avatar:'Q', is_concept:true,
      call:'555-218-7720', text:'555-218-7720' },
    { id:'t9', name:'Tilde Cosmetics', suite:'Suite 208', service:'Bridal Makeup & Lessons',
      services:['Bridal','Events','Lessons'], category:'makeup', open:true, status:'active',
      photo:'assets/photos/makeup.png', avatar:'T', is_concept:true,
      text:'555-208-9914' },
    { id:'t10', available:false, name:'Finch Hair Studio', suite:'Suite 202', service:"Precision Cuts & Men's Grooming",
      services:['Cuts',"Men's Grooming",'Beards'], category:'hair', open:true, status:'active',
      photo:'assets/photos/hair2.png', avatar:'F', is_concept:true,
      call:'555-202-4408', text:'555-202-4408' },
    /* Added to match the phone seed (which is the source of truth). */
    { id:'t11', name:'Rooted Wellness', suite:'Suite 222', service:'Reiki & Acupuncture',
      services:['Acupuncture','Reiki','Cupping'], category:'wellness', open:false, status:'active',
      photo:'assets/photos/massage2.png', avatar:'R', is_concept:true,
      call:'555-222-5050' },
    { id:'t12', name:'Amaranth Aesthetics', suite:'Suite 216', service:'Botox, Fillers & Medspa',
      services:['Botox','Fillers','Skin Boosters'], category:'wellness', open:false, status:'active',
      photo:'assets/photos/massage3.png', avatar:'A', is_concept:true }
  ];

  function loadTenants() {
    try {
      const t = JSON.parse(localStorage.getItem('ss_tenants_v1') || 'null');
      if (Array.isArray(t) && t.length) return t.filter(x => x.status !== 'archived');
    } catch (e) {}
    return SEED_TENANTS;
  }

  function tenantCard(t) {
    const photo = t.photo
      ? '<div class="tenant-photo" style="background-image:url(\'' + t.photo + '\');"></div>'
      : '<div class="tenant-photo" style="display:grid;place-items:center;color:var(--ink);font-family:\'Fraunces\',serif;font-size:1.6rem;">' + (t.avatar || (t.name || '?')[0]) + '</div>';
    // Three-way pill: Available (sage) / Busy (clay) / Closed (faint).
    // Short labels keep the card from getting cramped.
    const isOpen = t.open !== false;
    const isAvail = t.available !== false;
    const statusState = !isOpen ? 'closed' : (isAvail ? 'available' : 'busy');
    const statusLabel = !isOpen ? 'Closed' : (isAvail ? 'Free' : 'Busy');
    const metaSuiteHtml = '<span class="meta-suite">' + (t.suite || '') + '</span>';
    const metaStatusHtml = '<span class="meta-status is-' + statusState + '"><span class="dot"></span>' + statusLabel + '</span>';
    return '' +
      '<div class="tenant-card" data-tenant-id="' + (t.id || '') + '" style="cursor:pointer;">' +
        photo +
        '<div class="tenant-body">' +
          '<div class="tenant-name"><span>' + (t.name || 'Studio') + '</span>' + (t.is_concept ? '<span class="test-pill">Test</span>' : '') + '</div>' +
          '<div class="tenant-service">' + (t.service || '') + '</div>' +
          '<div class="tenant-meta">' + metaSuiteHtml + metaStatusHtml + '</div>' +
        '</div>' +
      '</div>';
  }

  let activeCategory = 'all';

  // Spell small counts to give the hero a more human feel ("Eight studios. One roof.")
  function numberToWord(n) {
    const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
    return (n >= 0 && n < words.length) ? words[n].charAt(0).toUpperCase() + words[n].slice(1) : String(n);
  }

  function render() {
    const tenants = loadTenants();
    const grid = document.getElementById('tenantGrid');
    const nowGrid = document.getElementById('nowGrid');
    const inCat = function(t) { return activeCategory === 'all' || (t.category || '').toLowerCase() === activeCategory; };
    const filtered = tenants.filter(inCat);
    if (grid) grid.innerHTML = filtered.length
      ? filtered.map(tenantCard).join('')
      : '<div style="padding:1.4rem;color:var(--ink-faint);font-style:italic;">No studios in this category yet.</div>';
    // "Available right now" = real tenant + open + can take a walk-in.
    // Excludes concept placeholders so the demo cards don't pad the list.
    if (nowGrid) nowGrid.innerHTML = tenants.filter(function(t) {
      return !t.is_concept && (t.open !== false) && (t.available !== false) && inCat(t);
    }).map(tenantCard).join('');
    const dc = document.getElementById('dir-count'); if (dc) dc.textContent = tenants.length;
    const nc = document.getElementById('now-count');
    if (nc) nc.textContent = tenants.filter(function(t) {
      return !t.is_concept && (t.open !== false) && (t.available !== false);
    }).length + ' available';
    // Hero discovery counts — "X studios. One roof." and "X open right now"
    const heroCountEl = document.getElementById('heroCount'); if (heroCountEl) heroCountEl.textContent = numberToWord(tenants.length);
    const heroOpenEl = document.getElementById('heroOpen');
    if (heroOpenEl) heroOpenEl.textContent = tenants.filter(function(t) {
      return !t.is_concept && (t.open !== false) && (t.available !== false);
    }).length;

    try {
      const s = JSON.parse(localStorage.getItem('ss_studio_v1') || 'null');
      if (s && s.owner_note) {
        const on = document.getElementById('ownerNote');
        if (on) on.textContent = s.owner_note.split('\n')[0].slice(0, 120) + (s.owner_note.length > 120 ? '…' : '');
      }
    } catch (e) {}

    try {
      const v = JSON.parse(localStorage.getItem('ss_vacancies_v1') || 'null');
      const vb = document.getElementById('bywayVacancy');
      if (vb && Array.isArray(v) && v.length) {
        vb.textContent = v.length + ' suite' + (v.length === 1 ? '' : 's') + ' open — ask the owner for a tour.';
      }
    } catch (e) {}

    // Wire tenant card clicks → open the profile AND the map in one shot.
    // The map modal shows the building with the suite highlighted, and the
    // map-detail panel populates with tenant info inside the modal.
    document.querySelectorAll('.tenant-card[data-tenant-id]').forEach(function(card) {
      card.addEventListener('click', function() {
        const id = card.dataset.tenantId;
        const t = loadTenants().find(function(x) { return x.id === id; });
        if (!t) return;
        // Extract the suite key from the tenant's suite string (e.g. "204", "200").
        const raw = (t.suite || '').trim();
        let key = null;
        const m = raw.match(/\d+/); if (m) key = m[0];
        // No mappable suite (placeholders) — fall back to the slide-in panel.
        if (!key) { openTenantPanel(t); return; }
        // Click the matching suite to populate the detail panel + highlight it.
        const suiteEl = document.querySelector('#mapSuites .suite[data-suite="' + key.replace(/"/g, '\\"') + '"]');
        if (suiteEl) suiteEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        // Open the map modal — its open handler moves .map-wrap (with the now-
        // populated #mapDetail) into the modal so both are visible together.
        const fab = document.getElementById('mapExpandFab');
        if (fab) fab.click();
      });
    });
  }

  /* ----- Cross-pollination: tenant detail panel ----- */
  function openTenantPanel(t) {
    const all = loadTenants();
    // "While you're here" — surface 3 OTHER studios that are open right now and in a different category.
    // This is the moment of cross-pollination: someone came for one thing, here are seven more.
    const sameCat = function(x) { return (x.category || '').toLowerCase() === (t.category || '').toLowerCase(); };
    const openOthers = all.filter(function(x) { return x.id !== t.id && x.open && !sameCat(x); });
    // Fallback: if not enough, allow same-category neighbors
    const others = openOthers.length >= 3 ? openOthers.slice(0, 3)
      : openOthers.concat(all.filter(function(x) { return x.id !== t.id && x.open && sameCat(x); })).slice(0, 3);

    const heroPhoto = t.photo
      ? '<div class="tp-hero" style="background-image:url(\'' + t.photo + '\');"></div>'
      : '<div class="tp-hero tp-hero--avatar"><span>' + (t.avatar || (t.name || '?')[0]) + '</span></div>';
    // Three-way panel status — Available / With a client / Closed.
    const _isOpen = t.open !== false;
    const _isAvail = t.available !== false;
    const statusHtml = !_isOpen
      ? '<span style="color:var(--ink-faint);">Closed</span>'
      : (_isAvail
          ? '<span style="color:var(--sage-deep);"><span class="open-dot"></span> Available right now</span>'
          : '<span style="color:var(--clay-deep);"><span class="open-dot" style="background:var(--clay-deep);"></span> Open · With a client</span>');
    const pairsHtml = others.length
      ? '<div class="tp-pairs">' +
          '<div class="tp-pairs-eyebrow">While you\'re at ' + (t.name || 'this studio') + '&hellip;</div>' +
          '<div class="tp-pairs-grid">' +
            others.map(function(o) {
              const pp = o.photo
                ? '<div class="tp-pair-photo" style="background-image:url(\'' + o.photo + '\');"></div>'
                : '<div class="tp-pair-photo tp-pair-photo--avatar">' + (o.avatar || (o.name || '?')[0]) + '</div>';
              return '<button type="button" class="tp-pair" data-pair-id="' + o.id + '">' +
                pp +
                '<div class="tp-pair-body">' +
                  '<div class="tp-pair-name">' + (o.name || '') + '</div>' +
                  '<div class="tp-pair-service">' + ((o.service || '').split('·')[0].split(',')[0].trim()) + '</div>' +
                  '<div class="tp-pair-meta">' + (o.suite || '') + ' &middot; <span style="color:var(--sage-deep);">Open</span></div>' +
                '</div>' +
              '</button>';
            }).join('') +
          '</div>' +
          '<p class="tp-pairs-hint">Built into the building. Walk to any of them while you\'re here.</p>' +
        '</div>'
      : '';

    let panel = document.getElementById('tenantPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'tenantPanel';
      panel.className = 'tenant-panel';
      document.body.appendChild(panel);
    }
    panel.innerHTML =
      '<div class="tp-card">' +
        '<button class="tp-close" type="button" aria-label="Close">&times;</button>' +
        heroPhoto +
        '<div class="tp-body">' +
          '<div class="tp-suite">Suite ' + (t.suite || '—') + '</div>' +
          '<h3 class="tp-name">' + (t.name || '') + (t.is_concept ? ' <span class="test-pill">Test</span>' : '') + '</h3>' +
          '<p class="tp-service">' + (t.service || '') + '</p>' +
          '<div class="tp-status">' + statusHtml + '</div>' +
          pairsHtml +
        '</div>' +
      '</div>' +
      '<div class="tp-backdrop"></div>';
    panel.classList.add('is-on');
    // Close handlers
    panel.querySelector('.tp-close').addEventListener('click', closeTenantPanel);
    panel.querySelector('.tp-backdrop').addEventListener('click', closeTenantPanel);
    // Pair clicks → open that tenant (cross-pollination chain)
    panel.querySelectorAll('.tp-pair').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = btn.dataset.pairId;
        const next = loadTenants().find(function(x) { return x.id === id; });
        if (next) openTenantPanel(next);
      });
    });
  }
  function closeTenantPanel() {
    const panel = document.getElementById('tenantPanel');
    if (panel) panel.classList.remove('is-on');
  }

  /* Search */
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  if (searchInput && searchResults) {
    searchInput.addEventListener('input', function() {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) { searchResults.hidden = true; searchResults.innerHTML = ''; return; }
      const tenants = loadTenants();
      const matches = tenants.filter(function(t) {
        return (t.name || '').toLowerCase().indexOf(q) > -1
          || (t.service || '').toLowerCase().indexOf(q) > -1
          || (t.services || []).join(' ').toLowerCase().indexOf(q) > -1
          || (t.suite || '').toLowerCase().indexOf(q) > -1;
      }).slice(0, 6);
      searchResults.hidden = false;
      if (!matches.length) {
        searchResults.innerHTML = '<div class="search-result" style="opacity:.7;">No match — try a service like "lash" or "color".</div>';
        return;
      }
      searchResults.innerHTML = matches.map(function(t) {
        return '<div class="search-result">' +
          '<div class="sr-mark">' + (t.avatar || (t.name || '?')[0]) + '</div>' +
          '<div class="sr-body">' +
            '<div class="sr-name">' + (t.name || '') + '</div>' +
            '<div class="sr-meta">' + (t.service || '') + '</div>' +
          '</div>' +
          '<div class="sr-suite">' + (t.suite || '') + '</div>' +
        '</div>';
      }).join('');
    });
  }

  /* Suite map: paint occupancy, wire taps to a detail panel */
  function renderMap() {
    const tenants = loadTenants();
    // Build a lookup by suite — match on the trailing number OR the literal suite string
    const bySuite = {};
    tenants.forEach(function(t) {
      const raw = (t.suite || '').trim();
      bySuite[raw] = t;
      const m = raw.match(/(\d{2,4})/);
      if (m) bySuite[m[1]] = t;
    });
    let vacancies = [];
    try { vacancies = JSON.parse(localStorage.getItem('ss_vacancies_v1') || '[]') || []; } catch (e) {}
    const vacantNums = new Set(vacancies.map(function(v) { return String(v.suite_number); }));

    document.querySelectorAll('#mapSuites .suite').forEach(function(g) {
      const key = g.dataset.suite;
      g.classList.remove('is-occupied', 'is-vacant', 'is-open', 'is-active');
      const t = bySuite[key];
      if (t) {
        g.classList.add('is-occupied');
        if (t.open) g.classList.add('is-open');
      } else if (vacantNums.has(key)) {
        g.classList.add('is-vacant');
      }
      g.addEventListener('click', function() {
        document.querySelectorAll('#mapSuites .suite').forEach(function(x) { x.classList.remove('is-active'); });
        g.classList.add('is-active');
        showMapDetail(key, bySuite[key], vacancies.find(function(v) { return String(v.suite_number) === key; }));
      });
    });
  }

  /* Suite callout — SVG label that comes out of the active suite. Cleared
     whenever a new suite is picked or the detail panel closes. */
  function clearSuiteCallout() {
    const svg = document.querySelector('.map-svg');
    if (!svg) return;
    svg.querySelectorAll('.suite-callout').forEach(function(n) { n.remove(); });
  }
  function drawSuiteCallout(suiteKey, label) {
    clearSuiteCallout();
    const svg = document.querySelector('.map-svg');
    if (!svg || !label) return;
    const suite = svg.querySelector('.suite[data-suite="' + suiteKey.replace(/"/g, '\\"') + '"]');
    if (!suite) return;
    const rect = suite.querySelector('rect');
    if (!rect) return;
    const sx = parseFloat(rect.getAttribute('x'));
    const sy = parseFloat(rect.getAttribute('y'));
    const sw = parseFloat(rect.getAttribute('width'));
    const sh = parseFloat(rect.getAttribute('height'));
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    // Place the callout either above or below the suite — above for north
    // and middle rows, below for the lower row so it stays inside the viewBox.
    const isLower = sy >= 358;
    const labelY = isLower ? sy + sh + 36 : sy - 36;
    const lineY1 = isLower ? sy + sh + 6 : sy - 6;
    const lineY2 = isLower ? sy + sh + 26 : sy - 26;
    // Measure label width approximately (Fraunces ~10px per char at font-size:18).
    const textW = Math.max(80, label.length * 11 + 24);
    const boxX = cx - textW / 2;
    const boxY = isLower ? labelY - 16 : labelY - 22;
    const xmlns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(xmlns, 'g');
    g.setAttribute('class', 'suite-callout');
    // Connector line — dashed marching pointer from the suite to the label
    const line = document.createElementNS(xmlns, 'path');
    line.setAttribute('class', 'callout-line');
    line.setAttribute('d', 'M ' + cx + ' ' + lineY1 + ' L ' + cx + ' ' + lineY2);
    g.appendChild(line);
    // Background pill behind the label so it's readable over the building
    const bg = document.createElementNS(xmlns, 'rect');
    bg.setAttribute('class', 'callout-bg');
    bg.setAttribute('x', boxX);
    bg.setAttribute('y', boxY);
    bg.setAttribute('width', textW);
    bg.setAttribute('height', 32);
    bg.setAttribute('rx', 16);
    g.appendChild(bg);
    // Tenant name label
    const text = document.createElementNS(xmlns, 'text');
    text.setAttribute('x', cx);
    text.setAttribute('y', boxY + 21);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '14');
    text.textContent = label;
    g.appendChild(text);
    svg.appendChild(g);
  }

  function showMapDetail(suiteKey, tenant, vacancy) {
    const el = document.getElementById('mapDetail');
    if (!el) return;
    el.hidden = false;
    if (tenant) {
      // Three states: Open · Available (sage), Open · With a client (clay), Closed (faint).
      // `available` defaults to true when missing, so older records read as
      // available rather than mysteriously "with a client".
      const isOpen = tenant.open !== false;
      const isAvail = tenant.available !== false;
      const open = !isOpen
        ? '<span style="color:var(--ink-faint);">&#9711; Closed</span>'
        : (isAvail
            ? '<span style="color:var(--sage-deep);">&#11044; Open · Available</span>'
            : '<span style="color:var(--clay-deep);">&#11044; Open · With a client</span>');
      // Personal contact line — kiosk is read-only (no tappable buttons), just
      // tells you how to reach the tenant. Booking lives in the phone app.
      let contactHtml = '';
      const call = tenant.call || '';
      const text = tenant.text || '';
      if (call && text && call === text) {
        contactHtml = '<div class="md-contact">Call or text ' + call + '</div>';
      } else if (call && text) {
        contactHtml = '<div class="md-contact">Call ' + call + ' &middot; Text ' + text + '</div>';
      } else if (call) {
        contactHtml = '<div class="md-contact">Call ' + call + '</div>';
      } else if (text) {
        contactHtml = '<div class="md-contact">Text ' + text + '</div>';
      }
      // Draw a callout label on the SVG pointing at the active suite so
      // the visitor sees "this is where Indigo & Oak lives" right on the floor
      // plan, not just in the side panel.
      drawSuiteCallout(suiteKey, tenant.name || '');
      // Enrich the detail panel with the tenant photo so the modal shows
      // a recognizable mini-profile (image + name + suite + status + contact).
      const photoHtml = tenant.photo
        ? '<div class="md-photo" style="background-image:url(\'' + tenant.photo + '\');"></div>'
        : '';
      el.innerHTML =
        '<button class="md-close" type="button" aria-label="Close">&times;</button>' +
        photoHtml +
        '<div class="md-suite">Suite ' + suiteKey + '</div>' +
        '<div class="md-name">' + (tenant.name || '') + (tenant.is_concept ? ' <span class="test-pill">Test</span>' : '') + '</div>' +
        '<div class="md-service">' + (tenant.service || '') + '</div>' +
        contactHtml +
        '<div class="md-status">' + open + '</div>';
    } else if (vacancy) {
      el.innerHTML =
        '<button class="md-close" type="button" aria-label="Close">&times;</button>' +
        '<div class="md-suite">Suite ' + suiteKey + '</div>' +
        '<div class="md-name" style="color:var(--clay-deep);">Open for lease</div>' +
        '<div class="md-service">' + (vacancy.sqft ? vacancy.sqft + ' sq ft' : '') + (vacancy.monthly_rent ? ' &middot; $' + Number(vacancy.monthly_rent).toLocaleString() + '/mo' : '') + '</div>' +
        '<div class="md-status" style="color:var(--ink-soft);">Available ' + (vacancy.available_from || 'soon') + ' &middot; ask the owner for a tour.</div>';
    } else {
      el.innerHTML =
        '<button class="md-close" type="button" aria-label="Close">&times;</button>' +
        '<div class="md-suite">Suite ' + suiteKey + '</div>' +
        '<div class="md-name" style="color:var(--ink-faint);">Unassigned</div>' +
        '<div class="md-service">No tenant yet. Talk to the owner if you\'re curious.</div>';
    }
    const closeBtn = el.querySelector('.md-close');
    if (closeBtn) closeBtn.addEventListener('click', function() {
      el.hidden = true;
      document.querySelectorAll('#mapSuites .suite').forEach(function(x) { x.classList.remove('is-active'); });
      clearSuiteCallout();
    });
  }

  /* Tabs */
  document.querySelectorAll('.browse-tabs .tab').forEach(function(t) {
    t.addEventListener('click', function() {
      document.querySelectorAll('.browse-tabs .tab').forEach(function(x) { x.classList.remove('is-active'); });
      t.classList.add('is-active');
      const tab = t.dataset.tab;
      document.querySelectorAll('.browse-content [data-tab]').forEach(function(p) {
        p.hidden = (p.dataset.tab !== tab);
      });
      // Filter chips only make sense on the Directory tab — hide on Available right now / Suite map
      const chips = document.getElementById('filterChips');
      if (chips) chips.style.display = (tab === 'all') ? '' : 'none';
      // Auto-expand the Suite map tab into the fullscreen modal so the full
      // floor plan is visible (the inline view is too cramped on the kiosk).
      if (tab === 'map') {
        setTimeout(function() {
          const fab = document.getElementById('mapExpandFab');
          if (fab) fab.click();
        }, 50);
      }
    });
  });

  /* Filter chips */
  document.querySelectorAll('#filterChips .filter-chip').forEach(function(c) {
    c.addEventListener('click', function() {
      document.querySelectorAll('#filterChips .filter-chip').forEach(function(x) { x.classList.remove('is-active'); });
      c.classList.add('is-active');
      activeCategory = c.dataset.cat;
      render();
    });
  });

  /* Byway buttons — open a body-level dialog (not the in-map detail panel,
     which is nested inside the hidden .map-wrap when the visitor is on a
     different tab and so renders invisibly). */
  function ensureByawayDialog() {
    let dlg = document.getElementById('bywayDialog');
    if (dlg) return dlg;
    dlg = document.createElement('div');
    dlg.id = 'bywayDialog';
    dlg.className = 'byway-dialog';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-hidden', 'true');
    dlg.innerHTML = ''
      + '<div class="byway-dialog-inner">'
      +   '<button type="button" class="byway-dialog-close" aria-label="Close">&times;</button>'
      +   '<div class="byway-dialog-eyebrow" id="bywayDialogEyebrow">By the way</div>'
      +   '<h2 class="byway-dialog-title" id="bywayDialogTitle"></h2>'
      +   '<div class="byway-dialog-body" id="bywayDialogBody"></div>'
      + '</div>';
    document.body.appendChild(dlg);
    dlg.querySelector('.byway-dialog-close').addEventListener('click', closeByawayDialog);
    dlg.addEventListener('click', function(e) { if (e.target === dlg) closeByawayDialog(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && dlg.classList.contains('is-on')) closeByawayDialog();
    });
    return dlg;
  }
  function showByawayDetail(title, body) {
    const dlg = ensureByawayDialog();
    document.getElementById('bywayDialogTitle').textContent = title;
    document.getElementById('bywayDialogBody').innerHTML = body;
    dlg.classList.add('is-on');
    dlg.setAttribute('aria-hidden', 'false');
  }
  function closeByawayDialog() {
    const dlg = document.getElementById('bywayDialog');
    if (!dlg) return;
    dlg.classList.remove('is-on');
    dlg.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('.byway-card[data-action]').forEach(function(b) {
    b.addEventListener('click', function() {
      const action = b.dataset.action;
      if (action === 'map') {
        const mapTab = document.querySelector('.browse-tabs .tab[data-tab="map"]');
        if (mapTab) mapTab.click();
      } else if (action === 'vacancies') {
        const summary = (document.getElementById('bywayVacancy') || {}).textContent || '';
        showByawayDetail(
          'Available suites',
          '<p>' + summary + '</p>' +
          '<p style="margin-top:12px;">If a room looks like a fit, email <a href="mailto:salonplusss@gmail.com" style="color:var(--clay-deep);font-weight:600;">salonplusss@gmail.com</a> to tour.</p>'
        );
      } else if (action === 'owner') {
        const note = (document.getElementById('ownerNote') || {}).textContent || '— The owner';
        showByawayDetail('From the owner', '<p style="white-space:pre-line;">' + note + '</p>');
      }
    });
  });

  /* Clock */
  function tickClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    el.textContent = h + ':' + m + ' ' + ampm;
  }
  tickClock();
  setInterval(tickClock, 30000);

  render();
  renderMap();

  /* Ambient cross-pollination — rotate "while you're at X, walk to Y" pairs in the hero */
  (function pairRotator() {
    const rotator = document.getElementById('pairRotator');
    const textEl = document.getElementById('pairText');
    if (!rotator || !textEl) return;
    const tenants = loadTenants().filter(function(t) { return t.open; });
    if (tenants.length < 2) return;

    // Build complementary pairs — same-category pairs aren't cross-pollination
    const pairs = [];
    for (let i = 0; i < tenants.length; i++) {
      for (let j = 0; j < tenants.length; j++) {
        if (i === j) continue;
        const a = tenants[i], b = tenants[j];
        if ((a.category || 'x') === (b.category || 'y')) continue;
        const aShort = a.name.replace(/(studio|salon|bar|loft|hands).*/i, '').trim();
        const bShort = b.name.replace(/(studio|salon|bar|loft|hands).*/i, '').trim();
        const bService = (b.service || '').split('·')[0].split(',')[0].trim().toLowerCase();
        pairs.push("While you're at " + aShort + ", walk to " + bShort + " for " + bService + ".");
      }
    }
    if (!pairs.length) return;

    rotator.hidden = false;
    let idx = Math.floor(Math.random() * pairs.length);
    textEl.textContent = pairs[idx];
    setInterval(function() {
      rotator.classList.add('is-fading');
      setTimeout(function() {
        idx = (idx + 1) % pairs.length;
        textEl.textContent = pairs[idx];
        rotator.classList.remove('is-fading');
      }, 350);
    }, 6000);
  })();

  /* Fullscreen map modal — clones the inline #mapSuites SVG into the modal
     body so the visitor can see the full floor plan without container clipping.
     Tap handlers are wired up after the clone so suite taps still open the
     map-detail panel (we drive it via the inline map and showSuiteDetail). */
  (function wireMapModal() {
    const fab = document.getElementById('mapExpandFab');
    const modal = document.getElementById('mapModal');
    const body = document.getElementById('mapModalBody');
    const closeBtn = document.getElementById('mapModalClose');
    if (!fab || !modal || !body || !closeBtn) return;

    // We MOVE the live .map-wrap into the modal (not clone) so all the existing
    // suite click handlers + the #mapDetail panel come along and "just work".
    // Closing puts the .map-wrap back where it was, restoring the inline page.
    let mapWrapHome = null;          // original parent, so we can restore on close
    let mapWrapHomeNext = null;      // next sibling, in case it wasn't the last child

    function openModal() {
      const mapWrap = document.querySelector('.map-wrap');
      if (!mapWrap) return;
      mapWrapHome = mapWrap.parentNode;
      mapWrapHomeNext = mapWrap.nextSibling;
      body.appendChild(mapWrap);     // physically move into modal — same DOM node, same listeners
      modal.classList.add('is-on');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      // Put .map-wrap back in its original location so the inline page renders normally next time.
      const mapWrap = body.querySelector('.map-wrap');
      if (mapWrap && mapWrapHome) {
        if (mapWrapHomeNext && mapWrapHomeNext.parentNode === mapWrapHome) {
          mapWrapHome.insertBefore(mapWrap, mapWrapHomeNext);
        } else {
          mapWrapHome.appendChild(mapWrap);
        }
      }
      // Hide any open detail panel so it doesn't linger.
      const md = document.getElementById('mapDetail');
      if (md) { md.hidden = true; md.innerHTML = ''; }
      document.querySelectorAll('#mapSuites .suite.is-active').forEach(function(x) { x.classList.remove('is-active'); });
      // Clear any suite callout label so the next visitor lands clean.
      document.querySelectorAll('.map-svg .suite-callout').forEach(function(c) { c.remove(); });
      modal.classList.remove('is-on');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      // Return to the Directory tab so the visitor lands on the tenant list,
      // not on an empty Suite-map content panel.
      const dirTab = document.querySelector('.browse-tabs .tab[data-tab="all"]');
      if (dirTab) dirTab.click();
    }
    fab.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('is-on')) closeModal();
    });

  })();

  /* Pair rotator — cycles "Did you know" cross-pollination prompts in the hero.
     Placeholder tenants (no real suite, name contains "placeholder") are
     excluded so the banner never reads "walk to Suite 2 — placeholder for…". */
  (function startPairRotator() {
    const rotator = document.getElementById('pairRotator');
    const textEl = document.getElementById('pairText');
    if (!rotator || !textEl) return;
    const tenants = loadTenants().filter(function(t) {
      if (!t.open) return false;
      const name = (t.name || '').toLowerCase();
      const suite = (t.suite || '').toLowerCase();
      if (name.indexOf('placeholder') !== -1) return false;
      if (suite.indexOf('placeholder') !== -1) return false;
      return true;
    });
    if (tenants.length < 2) return;
    const pairs = [];
    for (let i = 0; i < tenants.length; i++) {
      for (let j = 0; j < tenants.length; j++) {
        if (i === j) continue;
        if (tenants[i].category === tenants[j].category) continue;
        const a = tenants[i].name.split(' ')[0];
        const b = tenants[j].name.split(' ')[0];
        pairs.push("While you're at " + a + ", walk to " + b + " for " + (tenants[j].services && tenants[j].services[0] ? tenants[j].services[0].toLowerCase() : 'a visit') + '.');
      }
    }
    if (!pairs.length) return;

    rotator.hidden = false;
    let idx = Math.floor(Math.random() * pairs.length);
    textEl.textContent = pairs[idx];
    setInterval(function() {
      rotator.classList.add('is-fading');
      setTimeout(function() {
        idx = (idx + 1) % pairs.length;
        textEl.textContent = pairs[idx];
        rotator.classList.remove('is-fading');
      }, 350);
    }, 6000);
  })();

  /* Mobile preview scaling — CSS calc with vw units can't feed scale() directly,
     so we measure the bezel and set the transform in JS. Same pattern the pitch deck uses. */
  (function syncKioskPreviewScale() {
    const KIOSK_NATIVE_W = 1280;
    const shell = document.querySelector('.kiosk-shell-v2');
    const bezel = document.querySelector('.kiosk-device-bezel');
    if (!shell) return;
    function apply() {
      if (window.matchMedia('(min-width: 601px)').matches) {
        shell.style.transform = '';
        return;
      }
      const frame = bezel ? bezel.querySelector('#app') : null;
      const target = frame || bezel;
      if (!target) return;
      const w = target.getBoundingClientRect().width;
      if (!w) return;
      shell.style.transform = 'scale(' + (w / KIOSK_NATIVE_W) + ')';
      shell.style.transformOrigin = 'top left';
    }
    apply();
    window.addEventListener('load', apply);
    window.addEventListener('resize', apply);
  })();
