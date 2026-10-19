/* =====================================================================
   Studio Soulutions, GA4 conversion events
   ---------------------------------------------------------------------
   The same event names every Hive-Rise client site reports (the
   sonoransun.net spec, 2026-08-28), so the numbers read the same
   everywhere:
     form_submit_ok   a form went through, with form_name
                      (owner_inquiry on /owners/, studio_signup on /join/)
     tap_to_call      a tel: or sms: link, with method
     email_click      a mailto: link
     booking_click    a studio's booking link (marked data-booking)
   Plus one for this product: demo_open, any link marked data-event.
   In a building's app every event also carries the building (from
   window.ssContext) and the studio whose button was tapped.

   Loaded on the public marketing pages and the building apps, never the
   admin panel or the studio portal, and BEFORE the gtag config, so an
   internal visitor (localhost, or anyone who opened a page once with
   ?internal=1) and the demo building are switched off before the first
   hit is sent.
   ===================================================================== */
(function () {
  var ID = 'G-FB9QDLZT4B';

  try {
    var host = location.hostname;
    var q = new URLSearchParams(location.search);
    if (q.has('internal')) localStorage.setItem('ss_internal', 'true');
    /* The demo is a pretend building with pretend studios: its taps are
       sales walkthroughs, not customers. */
    var isDemo = /^\/a\/demo(\/|$)/i.test(location.pathname) || (q.get('b') || '').toLowerCase() === 'demo';
    if (host === 'localhost' || host === '127.0.0.1' || isDemo || localStorage.getItem('ss_internal') === 'true') {
      window['ga-disable-' + ID] = true;
    }
  } catch (e) { /* storage blocked: count the visit */ }

  window.ssTrack = function (name, params) {
    if (typeof window.gtag !== 'function') return;
    var all = {}, k, ctx = window.ssContext || {};
    for (k in ctx) all[k] = ctx[k];
    for (k in (params || {})) all[k] = params[k];
    window.gtag('event', name, all);
  };

  /* One listener for every link, including any added later. It only
     reads the click, so analytics failing can never stop a link. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var holder = a.closest('[data-studio]');
    var studio = holder ? { studio: holder.getAttribute('data-studio') } : {};
    var with_ = function (extra) { for (var k in studio) extra[k] = studio[k]; return extra; };
    if (href.indexOf('tel:') === 0) return window.ssTrack('tap_to_call', with_({ method: 'tel' }));
    if (href.indexOf('sms:') === 0) return window.ssTrack('tap_to_call', with_({ method: 'sms' }));
    if (href.indexOf('mailto:') === 0) return window.ssTrack('email_click', with_({ method: 'mailto_link' }));
    if (a.hasAttribute('data-booking')) {
      var target = '';
      try { target = new URL(href, location.href).hostname; } catch (err) { /* keep it blank */ }
      return window.ssTrack('booking_click', with_({ booking_target: target }));
    }
    var ev = a.getAttribute('data-event');
    if (ev) window.ssTrack(ev, { link_text: (a.textContent || '').trim().slice(0, 60) });
  }, true);
})();
