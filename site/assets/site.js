/* =====================================================================
   Praxis reference site — docs chrome behaviour.

   Vanilla, no dependency, matching the system it documents. Five jobs:

     1. theme       toggle the docs chrome AND every example iframe
     2. probes      resolve token values in BOTH themes, in-browser
     3. examples    source toggle, live width readout
     4. nav         filter, current-page marking
     5. toc         active-heading tracking

   (2) is the one that earns its keep. A generated table can only show what a
   token is DECLARED as; that is not what the browser computes. --t-sm looks
   like it maps to --praxis-type-size-sm but its fallback resolved to
   type-size-base, and --r-lg is 1rem against a canonical 16px, equal only
   because nothing overrides the root font size. So the resolved column is read
   off two real documents rather than derived.
   ===================================================================== */
(function () {
  'use strict';

  var THEME_KEY = 'px-docs-theme';

  /* ---- 1. theme ------------------------------------------------------ */

  function frames() {
    return Array.prototype.slice.call(document.querySelectorAll('iframe[data-example]'));
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('themetoggle');
    if (btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    frames().forEach(function (f) {
      /* A pinned example states a theme on purpose — a light-only or dark-only
         demonstration — so the global toggle must not overwrite it. */
      if (f.dataset.pinned === '1') return;
      try {
        var b = f.contentDocument && f.contentDocument.body;
        if (b) b.setAttribute('data-theme', theme);
      } catch (e) {}
    });
  }

  function stored() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }

  var initial = stored()
    || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initial);

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('#themetoggle');
    if (!t) return;
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (err) {}
    applyTheme(next);
  });

  /* An iframe that finishes loading after the toggle ran still needs telling. */
  frames().forEach(function (f) {
    f.addEventListener('load', function () {
      if (f.dataset.pinned === '1') return;
      try {
        var b = f.contentDocument && f.contentDocument.body;
        if (b) b.setAttribute('data-theme', document.documentElement.getAttribute('data-theme'));
      } catch (e) {}
    });
  });

  /* ---- 2. token probes ----------------------------------------------- */

  function fillComputed() {
    var cells = document.querySelectorAll('[data-computed], [data-computed-swatch]');
    if (!cells.length) return;

    var root = document.body.dataset.root || '';
    var pending = 2;

    ['light', 'dark'].forEach(function (theme) {
      var probe = document.createElement('iframe');
      probe.setAttribute('aria-hidden', 'true');
      probe.setAttribute('tabindex', '-1');
      probe.title = 'Praxis token probe (' + theme + ')';
      probe.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;border:0';
      probe.src = root + 'examples/_probe-' + theme + '.html';
      probe.addEventListener('load', function () {
        var body;
        try { body = probe.contentDocument.body; } catch (e) { return done(); }
        var cs = probe.contentWindow.getComputedStyle(body);
        Array.prototype.forEach.call(cells, function (cell) {
          if (cell.dataset.theme !== theme) return;
          var name = cell.dataset.computed || cell.dataset.computedSwatch;
          var value = cs.getPropertyValue(name).trim();
          if (!value) {
            cell.textContent = 'unset';
            cell.classList.add('is-missing');
            /* Three legitimate reasons, and one bug, all look identical here.
               Say so rather than implying the last one. */
            cell.title = name + ' resolves to nothing on <body> in ' + theme
              + '. Either it is declared only inside a media query (these probes '
              + 'are at desktop width), or only on a descendant selector such as '
              + '.content, or its var() chain is broken or cyclic — which is '
              + 'invalid at computed-value time while the page still loads 200.';
            return done();
          }
          if (cell.dataset.computedSwatch) {
            cell.style.setProperty('--sw', value);
            cell.setAttribute('data-label', value);
          } else {
            cell.textContent = value;
            if (cell.tagName === 'TD'
                && /^(#|rgb|hsl|color|oklch|linear-gradient|radial-gradient)/i.test(value)) {
              cell.setAttribute('data-swatch', '');
              cell.style.setProperty('--sw', value);
            }
          }
        });
        done();
      });
      document.body.appendChild(probe);

      function done() {
        if (--pending === 0) { /* both probes reported */ }
      }
    });
  }

  /* ---- 3. examples --------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-src-toggle]');
    if (!btn) return;
    var fig = btn.closest('.ex');
    var pre = fig && fig.querySelector('.ex__src');
    if (!pre) return;
    var open = pre.hidden;
    pre.hidden = !open;
    btn.setAttribute('aria-pressed', open ? 'true' : 'false');
  });

  /* Frames grow to fit their content. data-height is the RESERVED height — it
     stops the page jumping while the frame loads — not a cap. Authoring a page
     should not require guessing a pixel height and then discovering three
     screens later that a field is clipped.

     A shell example is exempt: .app is height:100vh, so its content height IS
     the frame height and measuring it would collapse the frame to nothing. */
  function fitFrames() {
    frames().forEach(function (f) {
      if (f.dataset.shell === '1') return;
      function fit() {
        try {
          var d = f.contentDocument;
          if (!d) return;
          var h = Math.max(d.body.scrollHeight, d.documentElement.scrollHeight);
          /* Grow AND shrink. Growing alone means a generous data-height leaves
             dead space forever; shrinking alone means content clips before load.
             The floor stops a frame collapsing to nothing if the measurement
             lands before the stylesheet applies. */
          if (h >= 60) f.parentNode.style.setProperty('--ex-h', h + 'px');
        } catch (e) {}
      }
      f.addEventListener('load', function () { fit(); setTimeout(fit, 250); });
      if (f.contentDocument && f.contentDocument.readyState === 'complete') fit();
    });
  }

  function widthReadouts() {
    var wraps = document.querySelectorAll('.ex__frame');
    if (!wraps.length || typeof ResizeObserver === 'undefined') return;
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        var out = entry.target.parentNode.querySelector('.ex__w');
        if (out) out.textContent = Math.round(entry.contentRect.width) + 'px';
      });
    });
    Array.prototype.forEach.call(wraps, function (w) { ro.observe(w); });
  }

  /* ---- 4. nav -------------------------------------------------------- */

  function navFilter() {
    var input = document.getElementById('navsearch');
    if (!input) return;
    var items = Array.prototype.slice.call(document.querySelectorAll('.nav__list li'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('.nav__section'));
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      items.forEach(function (li) {
        var hay = (li.textContent + ' ' + (li.dataset.keywords || '')).toLowerCase();
        li.hidden = q !== '' && hay.indexOf(q) === -1;
      });
      groups.forEach(function (g) {
        var any = g.querySelector('.nav__list li:not([hidden])');
        g.hidden = !any;
      });
    });
  }

  /* ---- 5. toc -------------------------------------------------------- */

  function tocTracking() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
    if (!links.length || typeof IntersectionObserver === 'undefined') return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var heads = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); });
        var a = byId[en.target.id];
        if (a) a.classList.add('is-active');
      });
    }, { rootMargin: '-72px 0px -70% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  }

  fillComputed();
  fitFrames();
  widthReadouts();
  navFilter();
  tocTracking();
})();
