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
   Plus one for this product: demo_open, any link marked data-event.

   Loaded on the public marketing pages only, never the admin panel or
   the studio portal, and BEFORE the gtag config, so an internal visitor
   (localhost, or anyone who opened a page once with ?internal=1) is
   switched off before the first hit is sent.
   ===================================================================== */
(function () {
  var ID = 'G-FB9QDLZT4B';

  try {
    var host = location.hostname;
    if (new URLSearchParams(location.search).has('internal')) localStorage.setItem('ss_internal', 'true');
    if (host === 'localhost' || host === '127.0.0.1' || localStorage.getItem('ss_internal') === 'true') {
      window['ga-disable-' + ID] = true;
    }
  } catch (e) { /* storage blocked: count the visit */ }

  window.ssTrack = function (name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  /* One listener for every link, including any added later. It only
     reads the click, so analytics failing can never stop a link. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) return window.ssTrack('tap_to_call', { method: 'tel' });
    if (href.indexOf('sms:') === 0) return window.ssTrack('tap_to_call', { method: 'sms' });
    if (href.indexOf('mailto:') === 0) return window.ssTrack('email_click', { method: 'mailto_link' });
    var ev = a.getAttribute('data-event');
    if (ev) window.ssTrack(ev, { link_text: (a.textContent || '').trim().slice(0, 60) });
  }, true);
})();
