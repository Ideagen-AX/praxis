/* ============================================================================
   Search-scope module chip
   ============================================================================
   The module(s) a search is scoped to are a filter in every sense the user
   cares about, so they belong in the applied-filter bar alongside the rest.
   No modules selected means the search covers everything - that is the default,
   not a filter, so no chip appears.

   praxis-filters.js owns [data-chips] and rewrites it wholesale on every
   renderChips() call, which would wipe anything injected here. Rather than
   patch that (it is a port of the Responsive Search project and gets
   re-extracted), this watches the bar and re-inserts. The sync is idempotent:
   if the chip is already present and correct it mutates nothing, so the
   observer settles instead of looping.

   It reads no module state of its own. search-page.html's module selector owns
   `selected` inside a closure and announces changes via px:modules-changed;
   removal is routed back the same way via px:modules-clear.
   ========================================================================= */
(function () {
  'use strict';

  var labels = [];
  var bar = null;

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function sync() {
    if (!bar) return;
    var existing = bar.querySelector('[data-module-chip]');

    // No modules selected: searching everything is the default, not a filter.
    if (!labels.length) { if (existing) existing.remove(); return; }

    /* Noun and value are kept apart rather than split back out of one joined
       string: module labels contain spaces ("Change Management"), so any split
       would cut them in half. */
    var noun = labels.length === 1 ? 'Module' : 'Modules';
    var value = labels.join(', ');
    var key = noun + '|' + value;

    // Already correct - touch nothing, or the observer would fire again.
    if (existing && existing.dataset.moduleChip === key) return;
    if (existing) existing.remove();

    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.moduleChip = key;
    chip.setAttribute('aria-label', 'Search scope: ' + value + '. Remove to search all modules.');
    chip.innerHTML = escapeHtml(noun) + ': <strong>' + escapeHtml(value) + '</strong>' +
      '<span class="material-symbols-rounded chip__close" aria-hidden="true">close</span>';

    /* After "Clear all" but before the field chips: it is the broadest piece of
       context in the bar, so it reads first. */
    var clear = bar.querySelector('.chip--clear');
    if (clear && clear.nextSibling) bar.insertBefore(chip, clear.nextSibling);
    else if (clear) bar.appendChild(chip);
    else bar.insertBefore(chip, bar.firstChild);
  }

  function mount() {
    bar = document.querySelector('[data-chips]');
    if (!bar) return;

    document.addEventListener('px:modules-changed', function (e) {
      labels = (e.detail && e.detail.labels) || [];
      sync();
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-module-chip]')) return;
      // The whole chip is the target, matching the port's fixed scope chip.
      document.dispatchEvent(new CustomEvent('px:modules-clear'));
    });

    // praxis-filters.js re-renders the bar on any filter change.
    new MutationObserver(sync).observe(bar, { childList: true });

    sync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
