/* ============================================================================
   Praxis compact toolbar — the tablet form of the page toolbar
   ============================================================================
   Below --px-toolbar-compact (1024px) a full toolbar either wraps into two or
   three rows or pushes its right-hand controls off screen. It collapses into:

     [back]  [primary CTA]  [Tools ▾]  [Options]

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

  var mq = window.matchMedia('(max-width: 1024px)');

  /* ---- classify what's in the toolbar ----------------------------------- */
  // Primary CTA and the back button stay on the bar; everything else folds in.
  var PRIMARY = '.tbtn--run, .tbtn--primary, .btn--primary';
  var BACK    = '.tbtn--icon';

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
    if (el.matches(PRIMARY) || el.matches(BACK)) return false;
    return el.matches('.tbtn, .tb-menu, button, a.tbtn');
  });

  // Options-drawer contents: sort + display mode + the current mode's panel.
  var optionParts = [];
  ['.toolbar__sortlabel', '.sortmenu', '.viewswitch'].forEach(function (sel) {
    var el = toolbar.querySelector(sel);
    if (el) optionParts.push({ el: el, label: null });
  });
  // Panels that belong to a display mode live outside the toolbar.
  [['#fieldsPanel', 'Table columns'], ['#chartPanel', 'Chart settings'], ['#explorePanel', 'Explore options']]
    .forEach(function (pair) {
      var el = document.querySelector(pair[0]);
      if (el) optionParts.push({ el: el, label: pair[1] });
    });

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
  drawer.innerHTML =
    '<header class="tb-options__head">' +
      '<span class="tb-options__title">Options</span>' +
      '<button class="tb-options__close" type="button" aria-label="Close options">' +
        '<span class="material-symbols-rounded">close</span></button>' +
    '</header><div class="tb-options__body"></div>';
  var drawerBody = drawer.querySelector('.tb-options__body');

  toolbar.parentNode.insertBefore(bar, toolbar.nextSibling);
  document.body.appendChild(scrim);
  document.body.appendChild(drawer);

  /* ---- move controls in / out ------------------------------------------- */
  var compact = false;

  function enter() {
    if (compact) return;
    compact = true;

    tools.forEach(function (el) { toolsPop.appendChild(el); });
    if (tools.length) bar.appendChild(toolsWrap);

    optionParts.forEach(function (p) {
      if (p.label) {
        var h = document.createElement('div');
        h.className = 'tb-options__section';
        h.textContent = p.label;
        drawerBody.appendChild(h);
      }
      drawerBody.appendChild(p.el);
      // panels are hidden by their host page until opened from the toolbar;
      // inside the drawer they're the content, so show them
      p.el.removeAttribute('hidden');
      p.el.classList.remove('is-collapsed');
    });
    if (optionParts.length) bar.appendChild(optionsBtn);

    document.body.classList.add('tb-is-compact');
  }

  function leave() {
    if (!compact) return;
    compact = false;
    closeTools(); closeOptions();
    tools.forEach(restore);
    optionParts.forEach(function (p) { restore(p.el); });
    [].slice.call(drawerBody.querySelectorAll('.tb-options__section')).forEach(function (n) { n.remove(); });
    if (toolsWrap.parentNode === bar) bar.removeChild(toolsWrap);
    if (optionsBtn.parentNode === bar) bar.removeChild(optionsBtn);
    document.body.classList.remove('tb-is-compact');
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

  function openOptions() {
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

  function sync() { mq.matches ? enter() : leave(); }
  sync();
  mq.addEventListener('change', sync);
})();
