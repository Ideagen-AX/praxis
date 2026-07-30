/* ============================================================================
   Praxis compact toolbar — the tablet form of the page toolbar
   ============================================================================
   The toolbar collapses the moment its contents would no longer fit on one
   line — measured, not at a fixed breakpoint, because the three toolbars have
   different natural widths and any single px value would be early for one page
   and late for another. It collapses to:

     [back]  [Tools ▾]  [Options]

   in the toolbar itself, in line with the back button.

   - Tools   a dropdown holding the secondary actions (Save, Export,
             Notification, Add Filters / Group, Share, Delete …)
   - Options a drawer that slides in over the content, holding the sort
             control, the display-mode switch, and whatever panel belongs to
             the current display mode (table columns, chart settings). Only
             built when the page actually has those controls, so the record and
             report toolbars get Tools alone.

   Controls are MOVED, not cloned. Everything here is already wired by the host
   page — the view switch, the sort menu, the fields panel all carry live
   handlers and state — and cloning would leave the copy dead. Each control
   remembers where it came from and goes back when the viewport grows.

   Derived from the live toolbar, like praxis-navdrawer.js, so there's no
   per-page markup to maintain.
   ========================================================================= */
(function () {
  'use strict';

  var toolbar = document.querySelector('.toolbar');
  if (!toolbar || document.querySelector('.tb-compact')) return;


  /* ---- classify what's in the toolbar ----------------------------------- */
  // Only the back button stays. Everything else — including the primary
  // action — folds into Tools, so the row is [back] [Tools] [Options].
  var BACK = '.tbtn--icon';

  function directControls(root) {
    var out = [];
    [].forEach.call(root.children, function (el) {
      if (el.classList.contains('toolbar__spacer')) return;
      // a group wrapper contributes its children, not itself
      if (/toolbar__group/.test(el.className)) { out = out.concat(directControls(el)); return; }
      out.push(el);
    });
    return out;
  }

  var all = directControls(toolbar);
  var tools = all.filter(function (el) {
    if (el.matches(BACK)) return false;
    return el.matches('.tbtn, .tb-menu, button, a.tbtn, .btn');
  });

  // Options-drawer contents: sort + display mode + the current mode's panel.
  var optionParts = [];
  function part(sel, tab, label) {
    var el = (sel[0] === '#' ? document : toolbar).querySelector(sel);
    if (el) optionParts.push({ el: el, tab: tab, label: label || null });
  }
  part('.viewswitch',          'display');
  part('#fieldsPanel',         'fields');
  part('#chartPanel',          'options', 'Chart settings');
  part('#explorePanel',        'options', 'Explore options');
  part('.toolbar__sortlabel',  'sort');
  part('.sortmenu',            'sort');

  if (!tools.length && !optionParts.length) return;

  /* Remember each node's origin so it can be put back verbatim. */
  function remember(el) {
    if (el.__pxHome) return;
    el.__pxHome = { parent: el.parentNode, next: el.nextSibling };
  }
  function restore(el) {
    var h = el.__pxHome;
    if (!h || !h.parent) return;
    h.parent.insertBefore(el, h.next);
  }
  tools.forEach(remember);
  optionParts.forEach(function (p) { remember(p.el); });

  /* ---- build the compact bar -------------------------------------------- */
  /* A wrapper inside the toolbar, so Tools and Options sit on the same line as
     the back button rather than on a second row. */
  var bar = document.createElement('div');
  bar.className = 'tb-compact';

  var toolsWrap = document.createElement('div');
  toolsWrap.className = 'tb-compact__menu';
  toolsWrap.innerHTML =
    '<button class="tbtn tb-compact__btn" type="button" aria-haspopup="menu" aria-expanded="false">' +
      '<span class="material-symbols-rounded" aria-hidden="true">build</span>Tools' +
      '<span class="material-symbols-rounded tb-compact__caret" aria-hidden="true">expand_more</span>' +
    '</button><div class="tb-compact__pop" role="menu" hidden></div>';
  var toolsBtn = toolsWrap.querySelector('button');
  var toolsPop = toolsWrap.querySelector('.tb-compact__pop');

  var optionsBtn = document.createElement('button');
  optionsBtn.className = 'tbtn tb-compact__btn';
  optionsBtn.type = 'button';
  optionsBtn.setAttribute('aria-haspopup', 'dialog');
  optionsBtn.setAttribute('aria-expanded', 'false');
  optionsBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">tune</span>Options';

  var scrim = document.createElement('div');
  scrim.className = 'tb-options__scrim';
  scrim.hidden = true;

  var drawer = document.createElement('aside');
  drawer.className = 'tb-options';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Display options');
  drawer.hidden = true;
  /* Tabbed header. The tabs are fixed in order — Display mode, Fields,
     Options, Sort by — and each one is only rendered if the page actually
     supplies that content, so a page with no chart panel doesn't get an empty
     tab. */
  var TABS = [
    { id: 'display', label: 'Display mode' },
    { id: 'fields',  label: 'Fields' },
    { id: 'options', label: 'Options' },
    { id: 'sort',    label: 'Sort by' }
  ];
  drawer.innerHTML =
    '<header class="tb-options__head">' +
      '<div class="tb-options__tabs" role="tablist" aria-label="Display options"></div>' +
      '<button class="tb-options__close" type="button" aria-label="Close options">' +
        '<span class="material-symbols-rounded">close</span></button>' +
    '</header><div class="tb-options__body"></div>';
  var drawerBody = drawer.querySelector('.tb-options__body');
  var tabStrip   = drawer.querySelector('.tb-options__tabs');

  /* Placed directly after the back button when there is one, else first. */
  var back = toolbar.querySelector(BACK);
  var anchor = back ? (back.closest('.toolbar__group') || back) : null;
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
  else toolbar.insertBefore(bar, toolbar.firstChild);
  document.body.appendChild(scrim);
  document.body.appendChild(drawer);

  /* ---- move controls in / out ------------------------------------------- */
  var compact = false;

  function enter() {
    if (compact) return;
    compact = true;

    tools.forEach(function (el) { toolsPop.appendChild(el); });
    if (tools.length) bar.appendChild(toolsWrap);

    // one panel per tab that has content
    var used = {};
    TABS.forEach(function (t) {
      var mine = optionParts.filter(function (p) { return p.tab === t.id; });
      if (!mine.length) return;
      used[t.id] = true;
      var panel = document.createElement('div');
      panel.className = 'tb-options__panel';
      panel.id = 'tb-panel-' + t.id;
      panel.setAttribute('role', 'tabpanel');
      if (t.id === 'display') {
        var lab = document.createElement('div');
        lab.className = 'tb-options__label';
        lab.textContent = 'Display as';
        panel.appendChild(lab);
      }
      mine.forEach(function (p) {
        if (p.label) {
          var h = document.createElement('div');
          h.className = 'tb-options__label';
          h.textContent = p.label;
          panel.appendChild(h);
        }
        panel.appendChild(p.el);
        // the host page hides these until its own toolbar opens them; in the
        // drawer they are the content
        p.el.removeAttribute('hidden');
        p.el.classList.remove('is-collapsed');
      });
      drawerBody.appendChild(panel);
    });

    tabStrip.innerHTML = '';
    var order = TABS.filter(function (t) { return used[t.id]; });
    order.forEach(function (t, i) {
      var btn = document.createElement('button');
      btn.className = 'tb-options__tab' + (i === 0 ? ' is-active' : '');
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(i === 0));
      btn.setAttribute('aria-controls', 'tb-panel-' + t.id);
      btn.dataset.tab = t.id;
      btn.textContent = t.label;
      tabStrip.appendChild(btn);
    });
    showTab(order.length ? order[0].id : null);

    /* The display switch is a horizontal icon strip in the toolbar. In the
       drawer it becomes a vertical list, and each option needs a readable
       label — the icon alone carried the meaning on the strip because of its
       tooltip. Titles are already on the buttons, so use those. */
    var vs = drawerBody.querySelector('.viewswitch');
    if (vs) {
      [].forEach.call(vs.querySelectorAll('.viewswitch__btn'), function (btn) {
        if (btn.querySelector('.tb-viewlabel')) return;
        var name = (btn.getAttribute('title') || btn.getAttribute('aria-label') || '').replace(/\s*view$/i, '');
        if (!name) return;
        var span = document.createElement('span');
        span.className = 'tb-viewlabel';
        span.textContent = name;
        btn.appendChild(span);
      });
    }

    if (optionParts.length) bar.appendChild(optionsBtn);

    document.body.classList.add('tb-is-compact');
  }

  function leave() {
    if (!compact) return;
    compact = false;
    closeTools(); closeOptions();
    tools.forEach(restore);
    optionParts.forEach(function (p) { restore(p.el); });
    // strip everything the drawer added, so a re-entry rebuilds cleanly
    [].slice.call(drawerBody.querySelectorAll('.tb-viewlabel')).forEach(function (n) { n.remove(); });
    drawerBody.innerHTML = '';
    tabStrip.innerHTML = '';
    if (toolsWrap.parentNode === bar) bar.removeChild(toolsWrap);
    if (optionsBtn.parentNode === bar) bar.removeChild(optionsBtn);
    document.body.classList.remove('tb-is-compact');
  }

  /* ---- behaviour --------------------------------------------------------- */
  function showTab(id) {
    if (!id) return;
    [].forEach.call(tabStrip.children, function (b) {
      var on = b.dataset.tab === id;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    [].forEach.call(drawerBody.children, function (pnl) {
      pnl.hidden = pnl.id !== 'tb-panel-' + id;
    });
  }
  drawer.addEventListener('click', function (e) {
    var t = e.target.closest('.tb-options__tab');
    if (t) showTab(t.dataset.tab);
  });

  function closeTools() { toolsPop.hidden = true; toolsBtn.setAttribute('aria-expanded', 'false'); }
  function openTools() { toolsPop.hidden = false; toolsBtn.setAttribute('aria-expanded', 'true'); }
  toolsBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toolsPop.hidden ? openTools() : closeTools();
  });
  // A tool inside the menu still does its own job; just close the menu after.
  toolsPop.addEventListener('click', function (e) {
    if (e.target.closest('.tbtn, button, a')) setTimeout(closeTools, 0);
  });
  document.addEventListener('click', function () { if (!toolsPop.hidden) closeTools(); });

  function openOptions() {
    /* Sit just under the toolbar. Read at open time rather than hardcoded,
       because the toolbar's height differs per page and with the app bar. */
    var tb = toolbar.getBoundingClientRect();
    drawer.style.setProperty('--tb-top', Math.round(tb.bottom) + 'px');
    scrim.hidden = false; drawer.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('is-open'); drawer.classList.add('is-open'); });
    optionsBtn.setAttribute('aria-expanded', 'true');
    var f = drawer.querySelector('button, select, input, a[href]');
    if (f) setTimeout(function () { f.focus(); }, 60);
  }
  function closeOptions() {
    scrim.classList.remove('is-open'); drawer.classList.remove('is-open');
    optionsBtn.setAttribute('aria-expanded', 'false');
    setTimeout(function () { scrim.hidden = true; drawer.hidden = true; }, 220);
  }
  optionsBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    drawer.hidden ? openOptions() : closeOptions();
  });
  scrim.addEventListener('click', closeOptions);
  drawer.querySelector('.tb-options__close').addEventListener('click', closeOptions);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!drawer.hidden) closeOptions();
    else if (!toolsPop.hidden) closeTools();
  });

  /* ---- when to collapse -------------------------------------------------
     Ask the browser directly rather than adding up widths: with wrapping
     disabled, a toolbar whose contents don't fit reports scrollWidth greater
     than clientWidth. That's exactly "would any element wrap", it needs no
     per-page tuning, and it stays correct if a button or label changes.

     (Summing children was the first attempt and it was wrong on the record
     page, whose toolbar is a group plus a right-aligned status block — the
     arithmetic said 1196px against 1066px available and collapsed at 1580.)

     Combined with a tablet floor, because the toolbar can technically fit at
     these widths while still leaving no room for the content beside it. */
  var TABLET = 1024;

  function overflows() {
    // measured with the ORIGINAL contents in place, so only meaningful expanded
    return toolbar.scrollWidth > toolbar.clientWidth + 1;
  }

  function sync() {
    if (!compact) {
      if (overflows() || window.innerWidth <= TABLET) enter();
    } else if (window.innerWidth > TABLET) {
      /* Put everything back, measure, and re-collapse in the same frame if it
         still doesn't fit — so the user never sees a wrapped toolbar. */
      leave();
      if (overflows()) enter();
    }
  }

  /* Never let it wrap: it collapses first, and if anything did overflow we'd
     rather see it clipped for one frame than reflow into two rows. */
  toolbar.style.flexWrap = 'nowrap';

  function boot() { sync(); }
  if (document.readyState === 'complete') setTimeout(boot, 60);
  else window.addEventListener('load', function () { setTimeout(boot, 60); });

  if (window.ResizeObserver) new ResizeObserver(sync).observe(toolbar);
  window.addEventListener('resize', sync);
})();
