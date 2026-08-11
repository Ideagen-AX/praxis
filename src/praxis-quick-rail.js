/* ============================================================================
   Praxis quick-filter rail (see praxis-quick-rail.css)
   ============================================================================
   Narrow-width form of the quick-filter strip: a scrolling row of pills, one
   per designated quick filter, each opening a popover anchored under its pill.

   The popover MOVES the existing .qfilter card out of [data-quick-filters]
   rather than rebuilding it. praxis-filters.js binds every quick-card
   interaction by delegation from document (see its `bind` helper), so a moved
   card keeps working — value toggling, See More, unpin — with no filter logic
   duplicated here. That is the whole reason this file is small.

   Value rows come from praxis-filters.js already ordered by result count and
   capped at QF_LIMIT (6), with its own See More revealing the rest. All this
   file has to do is give that list a scrollable box and keep the popover
   positioned as its height changes.

   Kept out of praxis-filters.js on purpose: that file is a port of the
   Responsive Search project and a re-extract overwrites it.
   ========================================================================= */
(function () {
  'use strict';

  /* Compact mode is a body class set by praxis-toolbar-compact.js, not a media
     query: it collapses on `toolbar.scrollWidth > clientWidth || innerWidth <=
     1024`, so a wide toolbar can collapse well above 1024px. Watching the class
     keeps the rail and the toolbar switching at exactly the same moment. */
  function isCompact() { return document.body.classList.contains('tb-is-compact'); }
  var GAP = 6;    // pill-to-popover offset
  var EDGE = 8;   // keep-off-the-viewport-edge margin

  var host, rail, scroller, pop, popBody, popTitle;
  var openName = null;   // filter name whose card is currently in the popover
  /* Rail order is held here rather than read off the host each time. Opening a
     pill moves its card out of the host and into the popover, so a host-order
     rebuild dropped that filter to the end — the pill jumped out from under
     the open popover on the next value toggle. */
  var railOrder = [];

  function $(sel, root) { return (root || document).querySelector(sel); }

  function cards() {
    return host ? Array.prototype.slice.call(host.querySelectorAll('.qfilter')) : [];
  }

  /* A card's active-value count, read off the card itself so this stays in
     step with praxis-filters.js without reaching into its state. */
  function activeCount(card) {
    return card.querySelectorAll('.qfilter__row--selected').length;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* CSS.escape isn't in every browser this prototype gets opened in. */
  function cssEscape(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  function pillFor(name) {
    return scroller.querySelector('[data-qrail-pill][data-filter-name="' + cssEscape(name) + '"]');
  }

  /* The card for a name, wherever it currently lives — the host, or the
     popover if that filter is open. */
  function cardFor(name) {
    var sel = '.qfilter[data-filter-name="' + cssEscape(name) + '"]';
    return (host && host.querySelector(sel)) || (popBody && popBody.querySelector(sel));
  }

  function buildRail() {
    if (!rail) return;

    // Every designated filter: those in the host, plus the one in the popover.
    var names = cards().map(function (c) { return c.dataset.filterName; });
    if (openName && names.indexOf(openName) === -1 &&
        popBody && popBody.querySelector('.qfilter')) {
      names.push(openName);
    }
    // Hold the established order; genuinely new filters join at the end.
    var ordered = railOrder.filter(function (n) { return names.indexOf(n) !== -1; });
    names.forEach(function (n) { if (ordered.indexOf(n) === -1) ordered.push(n); });
    railOrder = ordered;

    var list = ordered.map(cardFor).filter(Boolean);
    if (!list.length) { rail.hidden = true; scroller.innerHTML = ''; return; }
    rail.hidden = false;

    // innerHTML replacement can reset the scroll offset; put it back.
    var keepScroll = scroller.scrollLeft;

    /* Rebuilds replace the whole scroller, so a pill that had focus would be
       destroyed under the user — and praxis-filters.js re-renders on every
       value toggle, so this fires mid-interaction. Carry focus across by name. */
    var focused = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest('[data-qrail-pill]') : null;
    var focusedName = focused ? focused.dataset.filterName : null;

    scroller.innerHTML = list.map(function (card) {
      var name = card.dataset.filterName || '';
      var n = activeCount(card);
      /* The count is numeric only on screen. Its meaning goes on the button's
         aria-label rather than a visually-hidden span — this codebase has no
         .sr-only utility, so such a span would simply render the words. */
      return '<button class="qrail__pill" type="button"' +
        ' data-qrail-pill data-filter-name="' + escapeHtml(name) + '"' +
        (n ? ' aria-label="' + escapeHtml(name) + ', ' + n + ' selected"' : '') +
        ' aria-haspopup="dialog" aria-expanded="' + (openName === name) + '">' +
        '<span class="qrail__bolt material-symbols-rounded" aria-hidden="true">bolt</span>' +
        '<span class="qrail__name">' + escapeHtml(name) + '</span>' +
        (n ? '<span class="qrail__count" aria-hidden="true">' + n + '</span>' : '') +
        '<span class="qrail__caret material-symbols-rounded" aria-hidden="true">expand_more</span>' +
        '</button>';
    }).join('');

    scroller.scrollLeft = keepScroll;

    if (focusedName) {
      var again = pillFor(focusedName);
      if (again) again.focus();
    }
  }

  /* Anchor under the pill, flipping above and clamping horizontally so the
     popover stays on screen. Re-run whenever its height changes — See More
     can double it. */
  function place() {
    if (openName === null) return;
    var pill = pillFor(openName);
    if (!pill) return;
    var r = pill.getBoundingClientRect();
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var left = Math.max(EDGE, Math.min(r.left, window.innerWidth - pw - EDGE));
    var top = r.bottom + GAP;
    if (top + ph > window.innerHeight - EDGE) {
      var above = r.top - GAP - ph;
      // Flip up only if there is genuinely more room there; otherwise sit
      // against the bottom edge and let the body scroll.
      top = above >= EDGE ? above : Math.max(EDGE, window.innerHeight - ph - EDGE);
    }
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
  }

  function openPop(name, pill) {
    var card = host && host.querySelector('.qfilter[data-filter-name="' + cssEscape(name) + '"]');
    if (!card) return;
    openName = name;
    popTitle.textContent = name;
    pop.setAttribute('aria-label', name);
    popBody.appendChild(card);            // move, don't clone
    popBody.scrollTop = 0;
    pop.hidden = false;
    place();
    requestAnimationFrame(function () { pop.classList.add('is-open'); });
    if (pill) pill.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    var closeBtn = $('.qrail-pop__close', pop);
    if (closeBtn) closeBtn.focus();
  }

  function closePop(discardCard) {
    if (openName === null) return;
    var wasOpen = openName;
    var card = popBody.querySelector('.qfilter');
    /* Normally the card goes home to the desktop grid. After an unpin it must
       not: praxis-filters.js has already re-rendered the host without this
       filter, so putting our copy back would resurrect a filter the user just
       removed. */
    if (card) {
      if (discardCard) card.remove();
      else if (host) host.appendChild(card);
    }
    pop.classList.remove('is-open');
    var done = function () { pop.hidden = true; };
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) done();
    else setTimeout(done, 140);
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('scroll', place, true);
    window.removeEventListener('resize', place);
    openName = null;
    buildRail();
    /* Focus by name, not by the old node: buildRail() replaced the scroller's
       contents, and the MutationObserver fires again right after this when the
       card lands back in the host. */
    var back = pillFor(wasOpen) || scroller.querySelector('[data-qrail-pill]');
    if (back) back.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closePop(); }
  }

  function mount() {
    host = $('[data-quick-filters]');
    if (!host || $('.qrail')) return;
    var section = document.getElementById('quick-filters');
    if (!section) return;

    rail = document.createElement('div');
    rail.className = 'qrail';
    rail.setAttribute('role', 'group');
    rail.setAttribute('aria-label', 'Quick filters');
    rail.hidden = true;
    rail.innerHTML = '<div class="qrail__scroller"></div>';
    section.parentNode.insertBefore(rail, section.nextSibling);
    scroller = $('.qrail__scroller', rail);

    pop = document.createElement('div');
    pop.className = 'qrail-pop';
    pop.hidden = true;
    pop.setAttribute('role', 'dialog');
    pop.tabIndex = -1;
    pop.innerHTML =
      '<header class="qrail-pop__head">' +
        '<h2 class="qrail-pop__title"></h2>' +
        '<button class="qrail-pop__close" type="button" data-qrail-close aria-label="Close">' +
          '<span class="material-symbols-rounded" aria-hidden="true">close</span>' +
        '</button>' +
      '</header>' +
      '<div class="qrail-pop__body"></div>';
    document.body.appendChild(pop);
    popBody = $('.qrail-pop__body', pop);
    popTitle = $('.qrail-pop__title', pop);

    document.addEventListener('click', function (e) {
      /* Unpinning from inside the popover. praxis-filters.js registered its
         handler first (it loads first), so by the time we run the filter is
         already undesignated and the host re-rendered — our card is orphaned.
         Close discarding it, rather than handing it back to the host. */
      if (e.target.closest('.qrail-pop [data-action="unpin-quick"]')) {
        closePop(true);
        return;
      }
      var pill = e.target.closest('[data-qrail-pill]');
      if (pill) {
        var name = pill.dataset.filterName;
        if (openName === name) closePop();
        else { if (openName) closePop(); openPop(name, pillFor(name) || pill); }
        return;
      }
      if (e.target.closest('[data-qrail-close]')) { closePop(); return; }
      // Click anywhere outside the popover dismisses it.
      if (openName !== null && !e.target.closest('.qrail-pop')) closePop();
    });

    /* praxis-filters.js re-renders the whole host with innerHTML on any change
       (designate, unpin, See More, value toggle), which would strand a card
       that is currently in the popover — so rebuild the rail on mutation, and
       re-acquire the open card if it got replaced underneath us. */
    new MutationObserver(function () {
      if (openName) {
        var fresh = host.querySelector('.qfilter[data-filter-name="' + cssEscape(openName) + '"]');
        if (fresh) {
          var keepScroll = popBody.scrollTop;
          popBody.innerHTML = '';
          popBody.appendChild(fresh);
          popBody.scrollTop = keepScroll;
        } else if (!popBody.querySelector('.qfilter')) { closePop(); return; }
      }
      buildRail();
      // See More/Less changes the popover's height — re-anchor it.
      if (openName) place();
    }).observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    /* The open card lives in the popover, outside the host observer's reach.
       praxis-filters.js marks selections by toggling .qfilter__row--selected
       in place (syncQuickSelection) rather than re-rendering, so without this
       the pill's count sat stale until the popover closed and buildRail ran. */
    new MutationObserver(function () {
      buildRail();
      if (openName) place();
    }).observe(popBody, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    /* Leaving compact mode: hand the card back so the expanded grid is whole.
       praxis-toolbar-compact.js toggles the class off body, so watch that
       rather than a viewport query.

       Deferred, because the class FLICKERS. Its sync() calls leave() — which
       removes the class — then measures and re-enter()s if the toolbar still
       overflows, so above the 1024px floor every resize tick briefly reports
       "not compact". Closing on that transient made the popover snap shut the
       instant it opened. Only act if we are still expanded a beat later. */
    var leaveTimer = null;
    new MutationObserver(function () {
      if (isCompact()) {
        if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
        return;
      }
      if (openName === null || leaveTimer) return;
      leaveTimer = setTimeout(function () {
        leaveTimer = null;
        if (!isCompact() && openName !== null) closePop();
      }, 250);
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

    buildRail();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
