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
   - Options a dropdown of the same kind, holding the sort control, the
             display-mode switch, and whatever panel belongs to the current
             display mode (table columns, chart settings). Only built when the
             page actually has those controls, so the record and report
             toolbars get Tools alone.

   Options was a full-width sheet that slid up from the bottom edge, spanning
   from under the toolbar to the floor. Measured on the search page it took 77%
   of the viewport at both 390px and 834px and filled 51% of that with content —
   a screen-covering modal, half of it empty, to choose one of six display
   modes. Its tab strip also outran its own header on a phone (360px of tabs in
   322px), clipping "Sort by".

   It is now the same anchored popover Tools uses, six pixels under its button:
   height hugs the content, no scrim, no focus trap, and the table you are
   configuring stays visible behind it. Two buttons sitting side by side in one
   bar now behave the same way, which is what they should have done from the
   start. The four tabs became section headings in one short scrolling list —
   sections cost less than tabs at this size and cannot be clipped.

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
      // a group wrapper contributes its children, not itself. __inner is the
      // centred column the record family wraps its controls in.
      if (/toolbar__(group|inner)/.test(el.className)) { out = out.concat(directControls(el)); return; }
      out.push(el);
    });
    return out;
  }

  /* Filters stays on the bar rather than folding into Tools: it is the control
     users reach for most on a search screen, and burying it behind a menu put
     it two taps away. It sits between Tools and Options. */
  var FILTERS = '[data-action="open-filter-drawer"], [data-action="add-filter"]';
  var filtersBtn = null;

  var all = directControls(toolbar);
  var tools = all.filter(function (el) {
    if (el.matches(BACK)) return false;
    if (el.matches(FILTERS)) { filtersBtn = el; return false; }
    return el.matches('.tbtn, .tb-menu, button, a.tbtn, .btn');
  });

  // Options-drawer contents: sort + display mode + the current mode's panel.
  /* `unhide` marks a part the host keeps hidden until one of its own controls
     opens it — a popover. Those have to be forced visible here, because in the
     Options menu they ARE the content.

     Everything else is view-gated by the host (the Explore panel belongs to
     hierarchy view, the sort menu to the tile views) and its hidden state is
     left alone. Unhiding those too is what used to put Explore options in front
     of someone looking at a table; the tab strip hid the mistake by showing one
     group at a time, and stacking the sections exposes it. */
  var optionParts = [];
  function part(sel, tab, label, unhide) {
    var el = (sel[0] === '#' ? document : toolbar).querySelector(sel);
    if (el) optionParts.push({ el: el, tab: tab, label: label || null, unhide: !!unhide });
  }
  part('.viewswitch',          'display');
  /* The search page's column picker. It is a toolbar popover above the tablet
     floor and the Columns section of this menu below it — same element, same
     handlers, moved rather than duplicated, so there is one column control on
     the page at any width. */
  part('#colPop',              'fields',  null, true);
  part('#chartPanel',          'options', 'Chart settings');
  part('#explorePanel',        'options', 'Explore options');
  part('.toolbar__sortlabel',  'sort');
  part('.sortmenu',            'sort');

  if (!tools.length && !optionParts.length && !filtersBtn) return;

  /* Remember each node's origin so it can be put back verbatim. */
  /* Position is fixed for the life of the page, so it's captured once. Visible
     state is not — the fields panel is open in table mode and closed in list
     mode — so that's re-captured on every collapse, in captureState(). */
  function remember(el) {
    if (el.__pxHome) return;
    /* Position AND state. These panels are hidden on the page until their own
       toolbar control opens them; the drawer un-hides them to use as content,
       and without recording the original state they came back visible — which
       is how the Explore and Options panels ended up on the desktop page in
       table mode. */
    el.__pxHome = {
      parent: el.parentNode, next: el.nextSibling,
      hidden: el.hasAttribute('hidden'),
      collapsed: el.classList.contains('is-collapsed')
    };
  }
  function captureState(el) {
    if (!el.__pxHome) return;
    el.__pxHome.hidden = el.hasAttribute('hidden');
    el.__pxHome.collapsed = el.classList.contains('is-collapsed');
  }
  function restore(el) {
    var h = el.__pxHome;
    if (!h || !h.parent) return;
    h.parent.insertBefore(el, h.next);
    if (h.hidden) el.setAttribute('hidden', ''); else el.removeAttribute('hidden');
    el.classList.toggle('is-collapsed', !!h.collapsed);
  }
  tools.forEach(remember);
  optionParts.forEach(function (p) { remember(p.el); });
  /* Filters is hoisted onto the compact bar rather than folded into Tools, but
     it still needs its home recorded — restore() and captureState() both bail
     out on a missing __pxHome, so without this it never travels back to the
     toolbar and stays stranded on the bar at expanded widths. */
  if (filtersBtn) remember(filtersBtn);

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

  /* Non-modal: no aria-modal, no scrim, no focus trap — the page underneath
     stays live, which is the point of a standard side sheet. It does get a
     close button, because at phone width it covers the page and there is
     nothing left to tap away at. */
  var drawer = document.createElement('aside');
  drawer.className = 'tb-options';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-label', 'Display options');
  drawer.hidden = true;
  /* Sections, fixed in order — Display mode, Columns, Options, Sort by — each
     rendered only if the page supplies that content, so a page with no chart
     panel doesn't get an empty heading. Same ids as the old tab panels
     (#tb-panel-<id>), because host pages address them to show and hide their
     own sections as the view changes. */
  var SECTIONS = [
    { id: 'display', label: 'Display mode' },
    { id: 'fields',  label: 'Columns' },
    { id: 'options', label: 'Options' },
    { id: 'sort',    label: 'Sort by' }
  ];
  drawer.innerHTML =
    '<header class="tb-options__head">' +
      '<h2 class="tb-options__title" id="tb-options-title">Display options</h2>' +
      '<button class="tb-options__close" type="button" aria-label="Close display options">' +
        '<span class="material-symbols-rounded" aria-hidden="true">close</span></button>' +
    '</header>' +
    '<div class="tb-options__search" hidden>' +
      '<label class="tb-options__sr" for="tb-options-filter">Search display options</label>' +
      '<input id="tb-options-filter" type="text" placeholder="Search options" autocomplete="off">' +
      '<span class="material-symbols-rounded" aria-hidden="true">search</span>' +
    '</div>' +
    '<div class="tb-options__body"></div>' +
    '<p class="tb-options__empty" hidden>No options match that search.</p>';
  drawer.setAttribute('aria-labelledby', 'tb-options-title');
  var drawerBody   = drawer.querySelector('.tb-options__body');
  var searchWrap   = drawer.querySelector('.tb-options__search');
  var searchInput  = drawer.querySelector('#tb-options-filter');
  var emptyMsg     = drawer.querySelector('.tb-options__empty');

  /* Placed directly after the back button when there is one, else first. */
  var back = toolbar.querySelector(BACK);
  var anchor = back ? (back.closest('.toolbar__group') || back) : null;
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
  else toolbar.insertBefore(bar, toolbar.firstChild);
  document.body.appendChild(drawer);

  /* ---- move controls in / out ------------------------------------------- */
  var compact = false;

  function enter() {
    if (compact) return;
    compact = true;
    // snapshot what's open right now, so the round trip returns to this state
    // rather than to whatever was true when the page first loaded
    tools.forEach(captureState);
    optionParts.forEach(function (p) { captureState(p.el); });
    if (filtersBtn) captureState(filtersBtn);

    tools.forEach(function (el) { toolsPop.appendChild(el); });
    if (tools.length) bar.appendChild(toolsWrap);

    // Between Tools and Options — appended before the Options button below.
    if (filtersBtn) bar.appendChild(filtersBtn);

    /* One section per group that has content. All of them are visible at once
       now — the whole point of dropping the tabs is that four short lists read
       better stacked than they do behind a strip too wide for the header. */
    SECTIONS.forEach(function (t) {
      var mine = optionParts.filter(function (p) { return p.tab === t.id; });
      if (!mine.length) return;
      var panel = document.createElement('section');
      panel.className = 'tb-options__panel';
      panel.id = 'tb-panel-' + t.id;
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-labelledby', 'tb-sechead-' + t.id);

      var head = document.createElement('h2');
      head.className = 'tb-options__sechead';
      head.id = 'tb-sechead-' + t.id;
      head.textContent = t.label;
      panel.appendChild(head);

      mine.forEach(function (p) {
        /* A part's own label (e.g. "Chart settings") sits under the section
           heading as a sub-label; without one the heading is the only title. */
        if (p.label) {
          var h = document.createElement('div');
          h.className = 'tb-options__label';
          h.textContent = p.label;
          panel.appendChild(h);
        }
        panel.appendChild(p.el);
        // only the host's own popovers get forced open; view-gated panels keep
        // whatever visibility the page has given them
        if (p.unhide) {
          p.el.removeAttribute('hidden');
          p.el.classList.remove('is-collapsed');
        }
      });
      drawerBody.appendChild(panel);
    });

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
    announceMode(true);
  }

  /* Collapsing happens after the host has finished its own setup, and it can
     force a part visible (the column popover) that the host had good reason to
     keep hidden for the current view. The host can't see that happen, so it's
     told: pages that gate a part by view re-assert it here. */
  function announceMode(on) {
    document.dispatchEvent(new CustomEvent('px:toolbar-compact', { detail: { compact: on } }));
  }

  function leave() {
    if (!compact) return;
    compact = false;
    closeTools(); closeOptions();
    /* Strip the injected labels first. Restoring moves the view switch back
       into the toolbar, and anything still attached to it goes along — which
       is how the mode labels ended up breaking the desktop toolbar. Query the
       document, not the drawer, so it can't matter where they are. */
    [].slice.call(document.querySelectorAll('.tb-viewlabel')).forEach(function (n) { n.remove(); });
    tools.forEach(restore);
    optionParts.forEach(function (p) { restore(p.el); });
    if (filtersBtn) restore(filtersBtn);
    // whatever the popover built is disposable; a re-entry rebuilds it
    drawerBody.innerHTML = '';
    if (toolsWrap.parentNode === bar) bar.removeChild(toolsWrap);
    if (optionsBtn.parentNode === bar) bar.removeChild(optionsBtn);
    document.body.classList.remove('tb-is-compact');
    announceMode(false);
  }

  /* ---- behaviour --------------------------------------------------------- */
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

  /* Anchored under the Options button and clamped to the viewport.

     Positioned from script rather than with `position:absolute; right:0` on a
     wrapper: Options is the last control on the compact bar on the search page
     but not necessarily anywhere else, and a right-aligned popover hanging off
     a button that sits near the left edge runs off the screen. Measuring the
     button and clamping to a gutter is correct on every page and at every
     width, which is what a shared component needs.

     Height is capped to the room actually below the button, so it can never
     grow past the bottom of the screen — the sheet's original sin. */
  /* A section whose every control is hidden is a heading over nothing. Which
     controls apply depends on the current view, and the view changes while the
     menu is shut, so this is settled at open time rather than at build — the
     state only has to be right at the moment it becomes visible. */
  function syncSections() {
    SECTIONS.forEach(function (t) {
      var panel = drawerBody.querySelector('#tb-panel-' + t.id);
      if (!panel) return;
      var mine = optionParts.filter(function (p) { return p.tab === t.id; });
      var anyVisible = mine.some(function (p) { return !p.el.hasAttribute('hidden'); });
      /* Recorded as well as applied: the search also hides sections, and
         without knowing which of the two hid a section the search would
         happily un-hide one the current view had ruled out. */
      panel.__viewHidden = !anyVisible;
      panel.hidden = !anyVisible;
    });
  }

  /* ---- search across every section --------------------------------------
     The answer to "there could be many many columns". Rows are matched on their
     visible text, and a section whose rows have all been filtered out drops its
     heading with them, so a search reads as a short list rather than a run of
     empty headings.

     Row types are listed rather than inferred: the moved content is arbitrary
     host markup, and "any element with text" would match wrappers as readily as
     rows. A host can opt anything else in with data-tb-row. */
  var ROW_SEL = '.viewswitch__btn, .colmenu__row, .sortmenu__opt, [data-tb-row]';
  /* Sub-groups within a section — "Displayed columns" and "Group rows by" each
     carry their own label. Filtering the rows out from under one leaves the
     label stranded over nothing, so an emptied group is hidden with them. */
  var GROUP_SEL = '.colmenu__group, [data-tb-group]';
  var SEARCH_MIN_ROWS = 10;   // below this a search field is clutter, not help

  function allRows() { return [].slice.call(drawerBody.querySelectorAll(ROW_SEL)); }

  function applySearch() {
    var q = (searchInput.value || '').trim().toLowerCase();
    var total = 0;
    [].forEach.call(drawerBody.children, function (panel) {
      if (panel.__viewHidden) return;          // hidden by the current view, not by search
      var rows = [].slice.call(panel.querySelectorAll(ROW_SEL));
      var shown = 0;
      rows.forEach(function (row) {
        var hit = !q || (row.textContent || '').toLowerCase().indexOf(q) !== -1;
        row.hidden = !hit;
        if (hit) shown++;
      });
      [].forEach.call(panel.querySelectorAll(GROUP_SEL), function (g) {
        var gr = [].slice.call(g.querySelectorAll(ROW_SEL));
        g.hidden = gr.length > 0 && gr.every(function (r) { return r.hidden; });
      });
      /* A section with no matchable rows at all — a moved-in panel of custom
         controls — is left alone rather than hidden. We can't judge it, and
         silently dropping content is worse than leaving it on screen. */
      panel.hidden = rows.length > 0 && shown === 0;
      total += shown;
    });
    emptyMsg.hidden = !q || total > 0 || allRows().length === 0;
  }
  function syncSearchAffordance() {
    var many = allRows().length >= SEARCH_MIN_ROWS;
    searchWrap.hidden = !many;
    if (!many && searchInput.value) searchInput.value = '';
  }
  searchInput.addEventListener('input', applySearch);

  /* The panel is non-modal, so the view can change underneath it — tap Card
     while it's open and the Columns section no longer applies. Settling that
     only at open time left an inapplicable section on screen until it was
     closed and reopened. Watching the parts' own `hidden` picks up whatever
     the host does without the component needing to know what a view is. */
  var partObserver = new MutationObserver(function () {
    if (drawer.hidden) return;               // open time will handle it
    syncSections();
    syncSearchAffordance();
    applySearch();
  });
  optionParts.forEach(function (p) {
    partObserver.observe(p.el, { attributes: true, attributeFilter: ['hidden'] });
  });

  function openOptions() {
    syncSections();
    syncSearchAffordance();
    applySearch();                 // re-apply whatever was typed last time
    drawer.hidden = false;
    /* Flush layout so the transition has a start state to move from, rather
       than deferring the class to a rAF that may not run before the panel is
       read — offscreen and headless contexts don't always paint a frame, and
       the panel would then sit translated off the right edge, open but
       invisible. A forced reflow is synchronous and always correct. */
    void drawer.offsetWidth;
    drawer.classList.add('is-open');
    optionsBtn.setAttribute('aria-expanded', 'true');
    /* No auto-focus: non-modal, and pulling focus onto the first display mode
       put a focus ring on a row nobody had chosen. Tab reaches it in one step. */
  }
  function closeOptions(returnFocus) {
    if (drawer.hidden) return;
    drawer.classList.remove('is-open');
    optionsBtn.setAttribute('aria-expanded', 'false');
    setTimeout(function () { drawer.hidden = true; }, 220);
    if (returnFocus) optionsBtn.focus();
  }
  optionsBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    drawer.hidden ? openOptions() : closeOptions();
  });
  drawer.querySelector('.tb-options__close').addEventListener('click', function () {
    closeOptions(true);
  });
  /* Tap-away dismissal. Meaningful beside the panel on a tablet; at phone width
     it covers the page, which is what the close button is for. */
  document.addEventListener('click', function (e) {
    if (drawer.hidden) return;
    if (drawer.contains(e.target) || e.target.closest('.tb-compact__btn')) return;
    closeOptions();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!drawer.hidden) closeOptions(true);
    else if (!toolsPop.hidden) closeTools();
  });
  /* No repositioning on resize: the panel is pinned to all four edges it needs
     (top, bottom, right) in CSS, so it re-lays out on its own. */

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
