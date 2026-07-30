/* ============================================================================
   Praxis nav drawer — the nav rail's phone form
   ============================================================================
   At phone widths the 56px icon rail costs a sixth of the viewport and its
   items are unlabelled. Below --px-phone (640px) the rail is hidden by CSS and
   this script puts a hamburger in the app bar's left corner that opens a
   drawer listing the same destinations WITH text labels.

   It DERIVES the drawer from the live rail rather than duplicating the markup,
   so a rail change propagates automatically and there is nothing to keep in
   sync across 20+ pages. Labels come from each item's aria-label / title.

   The rail's Create button is deliberately excluded: Create New is already
   reachable from the app bar on phones, and duplicating it in the drawer would
   give the same action two entry points one tap apart.

   Self-wiring: include the script, nothing else. It no-ops on pages with no
   nav rail.
   ========================================================================= */
(function () {
  'use strict';

  var rail = document.querySelector('.ehsq-navrail');
  var bar = document.querySelector('.appbar');
  if (!rail || !bar || document.querySelector('.px-navdrawer')) return;

  /* ---- read the destinations off the rail ------------------------------- */
  function labelFor(el) {
    var l = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    if (!l) {
      var img = el.querySelector('img[alt]');
      if (img) l = img.getAttribute('alt');
    }
    return l.trim();
  }

  var items = [];
  rail.querySelectorAll('.ehsq-navrail__link, .ehsq-navrail__btn').forEach(function (el) {
    if (el.classList.contains('ehsq-navrail__btn--create')) return;   // see header note
    var label = labelFor(el);
    if (!label) return;
    items.push({
      label: label,
      href: el.tagName === 'A' ? el.getAttribute('href') : null,
      active: el.classList.contains('ehsq-navrail__btn--active') ||
              el.classList.contains('ehsq-navrail__link--active') ||
              el.getAttribute('aria-current') === 'page',
      /* Clone the glyph rather than re-deriving it. praxis-lucide.js may have
         already swapped a Material ligature for an SVG, and cloning captures
         whichever form is live at this moment. */
      glyph: (el.querySelector('svg, i, .material-symbols-rounded, img') || {}).outerHTML || '',
      source: el
    });
  });
  if (!items.length) return;

  /* ---- build ----------------------------------------------------------- */
  var scrim = document.createElement('div');
  scrim.className = 'px-navdrawer__scrim';
  scrim.hidden = true;

  var drawer = document.createElement('nav');
  drawer.className = 'px-navdrawer';
  drawer.setAttribute('aria-label', 'Primary navigation');
  drawer.hidden = true;
  drawer.innerHTML =
    '<div class="px-navdrawer__head">' +
      '<span class="px-navdrawer__title">Navigation</span>' +
      '<button class="px-navdrawer__close" type="button" aria-label="Close navigation">' +
        '<span class="material-symbols-rounded">close</span></button>' +
    '</div><ul class="px-navdrawer__list"></ul>';

  var list = drawer.querySelector('.px-navdrawer__list');
  items.forEach(function (it) {
    var li = document.createElement('li');
    var node = document.createElement(it.href ? 'a' : 'button');
    node.className = 'px-navdrawer__item' + (it.active ? ' px-navdrawer__item--active' : '');
    if (it.href) { node.href = it.href; } else { node.type = 'button'; }
    if (it.active) node.setAttribute('aria-current', 'page');
    node.innerHTML = '<span class="px-navdrawer__icon" aria-hidden="true">' + it.glyph + '</span>' +
                     '<span class="px-navdrawer__label"></span>';
    node.querySelector('.px-navdrawer__label').textContent = it.label;
    /* A rail button does something on this page rather than navigating, so
       forward the click to the original control instead of reimplementing it. */
    if (!it.href) {
      node.addEventListener('click', function () { close(); it.source.click(); });
    } else {
      node.addEventListener('click', close);
    }
    li.appendChild(node);
    list.appendChild(li);
  });

  var toggle = document.createElement('button');
  toggle.className = 'px-navtoggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Open navigation');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'px-navdrawer');
  toggle.innerHTML = '<span class="material-symbols-rounded">menu</span>';
  drawer.id = 'px-navdrawer';

  bar.insertBefore(toggle, bar.firstChild);
  document.body.appendChild(scrim);
  document.body.appendChild(drawer);

  /* ---- behaviour ------------------------------------------------------- */
  var prevFocus = null;

  function open() {
    prevFocus = document.activeElement;
    scrim.hidden = false; drawer.hidden = false;
    // next frame, so the transition has a from-state to animate out of
    requestAnimationFrame(function () {
      scrim.classList.add('is-open'); drawer.classList.add('is-open');
    });
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var first = drawer.querySelector('.px-navdrawer__item');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function close() {
    scrim.classList.remove('is-open'); drawer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(function () { scrim.hidden = true; drawer.hidden = true; }, 220);
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  }

  function isOpen() { return !drawer.hidden; }

  toggle.addEventListener('click', function () { isOpen() ? close() : open(); });
  scrim.addEventListener('click', close);
  drawer.querySelector('.px-navdrawer__close').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close();
  });

  /* Focus trap while open — the drawer is modal over the page. */
  drawer.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = drawer.querySelectorAll('a[href], button:not([disabled])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Growing past the phone breakpoint brings the rail back, so the drawer must
     not be left open behind it. */
  var mq = window.matchMedia('(min-width: 641px)');
  mq.addEventListener('change', function (e) { if (e.matches && isOpen()) close(); });
})();
