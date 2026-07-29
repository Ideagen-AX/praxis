/* =====================================================================
   Praxis Filters — shared filter engine (v1.5, ported from Responsive Search)

   The centered filter modal, the quick-filter strip and the active-filter chip
   bar, plus the matching logic that turns filter state into a filtered record
   set. Pair with praxis-filters.css.

   v1.5's key idea: Standard and Custom are two VIEWS ONTO ONE EXPRESSION TREE.
   Rich fields (list/date/text/number/person) live in `customFilter`; quick-
   designated and scope fields live in the flat `filterState`. No field is in
   both, so ANDing the two never double-filters.

   Usage:
     PraxisFilters.init({
       records: RECORDS,                  // the unfiltered set
       fieldMap: { 'Status': r => r.status, ... },   // filter name -> accessor
       today:   new Date(2026, 6, 8),     // "now" for relative date operators
       parseDate: str => ms,              // optional, for non-ISO date strings
       onChange: (filtered) => { ... }    // called whenever the filter set changes
     });

   The host owns rendering: onChange receives the filtered records and re-renders
   however it likes. The engine never touches the results DOM.

   Markup contract (see search-page.html):
     [data-filter-drawer]  the modal        [data-drawer-scrim] its scrim
     [data-quick-filters]  quick-card host  [data-chips]        chip bar
     [data-action="open-filter-drawer"]     opens the modal
   ===================================================================== */
window.PraxisFilters = (function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function bind(sel, ev, fn) {
    document.addEventListener(ev, (e) => { const t = e.target.closest(sel); if (t) fn(e, t); });
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ================= FIELD / OPTION CONFIG (ported CAPA model) =================
  // These are the CAPA vocabularies the port shipped with. A host whose records
  // use a different domain replaces them via init({ options, tree }) — otherwise
  // its menus offer values its data has never heard of, and every selection
  // returns nothing. `let` rather than `const` so init can swap them.
  let PEOPLE_NAMES = ['Ballari, Jhansi', 'Putta, Aravind', 'Slaughter, Nicholas', 'Garige, Pushkarini', 'Lance, Isaac', 'Kotapati, Mounica', 'Reddy, Sandeep', 'Patel, Anil', 'Chen, Lily', 'EHS Coordinator Team', 'Case Management Team', 'Unassigned'];
  let DEPARTMENT_TREE = [
    { name: 'Operations', children: ['Production', 'Logistics'] },
    { name: 'Maintenance', children: ['Mechanical Maintenance', 'Electrical Maintenance'] },
    { name: 'Safety', children: ['Process Safety', 'Industrial Hygiene'] },
    { name: 'Quality', children: ['Compliance', 'Document Control'] },
    { name: 'Environmental', children: [] },
    { name: 'Engineering', children: [] },
  ];
  let DEPARTMENTS = DEPARTMENT_TREE.flatMap(d => [d.name, ...d.children]);
  let DEPT_PARENT = {};
  DEPARTMENT_TREE.forEach(d => d.children.forEach(c => { DEPT_PARENT[c] = d.name; }));
  let SITES = ['HYD Plant 1', 'HYD Plant 2', 'WPDCG', 'DEN Plant 1', 'DEN Plant 2', 'DEN Plant 3', 'BOS Operations', 'ATL Corporate', 'ATL Lab'];
  let TASKS = ['Investigate Root Cause', 'Define Corrective Action', 'Implement Action', 'Verify Effectiveness', 'Awaiting Review', 'Closeout Approval'];
  let ACTION_TYPES = ['Corrective Action', 'Preventive Action', 'Containment', 'Root Cause Action', 'Verification', 'Effectiveness Check'];
  let PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
  const READ_OPTS = ['All', 'Unread'];
  let STATUS_OPTS = ['Open', 'Closed', 'Cancelled'];
  const GENERIC_OPTS = ['Option A', 'Option B', 'Option C', 'Option D'];
  let FILTER_OPTIONS = {
    'Department': DEPARTMENTS, 'Site': SITES, 'Current Task': TASKS, 'Current Assignee': PEOPLE_NAMES,
    'Action Type': ACTION_TYPES, 'Priority': PRIORITIES, 'Action Owner': PEOPLE_NAMES, 'Effectiveness Owner': PEOPLE_NAMES,
    'Cost Owner': PEOPLE_NAMES, 'Verifier': PEOPLE_NAMES, 'Originator': PEOPLE_NAMES, 'Signer': PEOPLE_NAMES,
    'Tracker Owner': PEOPLE_NAMES, 'Action Item Completed By': PEOPLE_NAMES, 'Completed By': PEOPLE_NAMES,
    'Comment – By': PEOPLE_NAMES, 'Status': STATUS_OPTS, 'Read Status': READ_OPTS,
  };
  function getOptionsForFilter(name) { return FILTER_OPTIONS[name] || GENERIC_OPTS; }

  // Rebuild what's derived from the vocabularies above, after init swaps them
  function rebuildVocab() {
    DEPARTMENTS = DEPARTMENT_TREE.flatMap(d => [d.name, ...d.children]);
    DEPT_PARENT = {};
    DEPARTMENT_TREE.forEach(d => d.children.forEach(c => { DEPT_PARENT[c] = d.name; }));
    FILTER_TREES = { 'Department': DEPARTMENT_TREE };
    // the people/site/task lists feed several field names apiece
    const P = PEOPLE_NAMES;
    Object.assign(FILTER_OPTIONS, {
      'Department': DEPARTMENTS, 'Site': SITES, 'Current Task': TASKS, 'Action Type': ACTION_TYPES,
      'Priority': PRIORITIES, 'Status': STATUS_OPTS,
      'Current Assignee': P, 'Action Owner': P, 'Effectiveness Owner': P, 'Cost Owner': P,
      'Verifier': P, 'Originator': P, 'Signer': P, 'Tracker Owner': P,
      'Action Item Completed By': P, 'Completed By': P, 'Comment – By': P,
    });
  }
  let FILTER_TREES = { 'Department': DEPARTMENT_TREE };
  const deptChildren = (name) => DEPARTMENT_TREE.find(d => d.name === name)?.children || [];
  function deptState(values, name) {
    if (values.includes(name) || values.includes(DEPT_PARENT[name])) return 'on';
    return deptChildren(name).some(c => values.includes(c)) ? 'mixed' : 'off';
  }
  function deptToggle(values, name) {
    const set = new Set(values);
    const parent = DEPT_PARENT[name];
    if (deptState(values, name) === 'on') {
      if (set.has(name)) { set.delete(name); }
      else if (parent && set.has(parent)) { set.delete(parent); deptChildren(parent).forEach(c => { if (c !== name) set.add(c); }); }
    } else { set.add(name); deptChildren(name).forEach(c => set.delete(c)); }
    return [...set];
  }
  const expandDeptValues = (vals) => vals.flatMap(v => [v, ...deptChildren(v)]);
  /* =================================================================
     HOST WIRING — everything app-specific enters through init()
     ================================================================= */
  let RECORDS = [];                 // the unfiltered record set
  let FIELD_MAP = {};               // filter name -> (record) => value
  let TODAY = new Date();           // anchor for relative date operators
  let parseDate = (s) => (s ? new Date(s) : null);
  let onChange = null;              // host re-render callback
  let scopeChip = null;             // optional fixed context chip, e.g. {label:'Module', value:'CAPA'}
  let exampleTree = null;           // optional ({mk,grp}) => tree, for "Load example"
  let drawer = null, scrim = null;
  let started = false;

  // Grouping helper for quick-filter distributions (value -> count), most first
  function countBy(rows, accessor) {
    const m = new Map();
    rows.forEach(r => {
      const v = typeof accessor === 'function' ? accessor(r) : r[accessor];
      if (v == null || v === '') return;
      m.set(v, (m.get(v) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  /* Filter-name -> record accessor. The ported CAPA catalog is ~90 fields but a
     host's data model only backs some of them; a field with no accessor stays
     fully operable in the UI and still produces a chip, it just doesn't reduce
     the set. That keeps the realistic field list without silently dropping
     records against data that doesn't exist. */
  const accessorFor = (name) => FIELD_MAP[name] || null;
  const isBackedField = (name) => !!FIELD_MAP[name];

  /* The engine's single seam to the host: recompute the filtered set and hand it
     over. Every filter mutation funnels through here (the ported code calls
     renderResults() throughout), so the host re-renders exactly once per change. */
  function renderResults() {
    if (!onChange) return;
    onChange(RECORDS.filter(matchesFilters), { filterState, customFilter });
  }

  /* Startup, once init() has resolved the modal. Load-time code in the ported
     engine is all document-delegated binding, which is safe; anything that
     touches the modal itself has to wait for this. */
  function boot() {
    if (scrim) scrim.addEventListener('click', closeDrawer);
    initModalResize();
    renderFilterList();
    renderQuickFilters();
    renderChips();     // also syncs row chips, quick highlights and Apply state
    renderResults();   // hand the host its initial (unfiltered) set
  }


/* ---------- source script.js:283-394 ---------- */
  // FILTER STATE
  // =================================================================
  const filterState = {};
  // Expression tree = single source of truth for rich (list/date/text/number/
  // person) fields, edited by both the Standard clusters and the Custom builder.
  // Declared here (before the filter list first renders) to avoid a TDZ error.
  let customFilter = null;  // applied/pruned expression tree (null = none)
  let builderDraft = null;  // the live working tree
  let customMode = false;   // true while the drawer shows the Custom builder

  function setFilter(name, value) {
    if (value == null || value === '' || value === 'Any Date' || value === 'All'
        || (Array.isArray(value) && value.length === 0)) {
      delete filterState[name];
    } else {
      filterState[name] = value;
    }
    renderResults();
    renderChips();
  }

  // Multi-select helpers — list filters hold an array of selected values
  const valuesOf = (name) => {
    const v = filterState[name];
    return v == null || v === '' ? [] : Array.isArray(v) ? v : [v];
  };
  function toggleFilterValue(name, value) {
    if (FILTER_TREES[name]) {
      // Hierarchical filters cascade: see deptToggle for the semantics
      const next = deptToggle(valuesOf(name), value);
      setFilter(name, next.length ? next : null);
      return;
    }
    const cur = valuesOf(name);
    const i = cur.indexOf(value);
    if (i >= 0) cur.splice(i, 1); else cur.push(value);
    setFilter(name, cur.length ? cur : null);
  }

  // =================================================================
  // FILTER MATCHING
  // =================================================================
  function matchesFilters(r) {
    // Rich fields (list/date/text/number/person) live in the expression tree
    // (`customFilter`); quick-designated + scope filters live in `filterState`.
    // No field is in both, so ANDing the two never double-filters.
    const treeOk = customFilter ? evalExpr(customFilter, r) : true;
    if (!treeOk) return false;
    return Object.entries(filterState).every(([name, value]) => matchesFilter(r, name, value));
  }

  function matchesFilter(r, name, value) {
    if (value == null || value === '') return true;
    // Multi-select arrays use "Is One Of" semantics — any selected value matches
    if (Array.isArray(value)) {
      return value.length === 0 || value.some(v => matchesFilter(r, name, v));
    }
    const get = accessorFor(name);
    if (!get) return true;                       // field has no backing data — inert
    const f = filterByName[name];
    if (f && f.type === 'date') return matchesDate(get(r), value);

    const raw = get(r);
    if (raw == null) return false;
    // Hierarchical fields match their own value and any descendant's
    if (FILTER_TREES[name]) {
      return raw === value || (typeof DEPT_PARENT !== 'undefined' && DEPT_PARENT[raw] === value);
    }
    if (f && (f.type === 'text' || f.type === 'number')) {
      return String(raw).toLowerCase().includes(String(value).toLowerCase());
    }
    return String(raw) === String(value);
  }

  function matchesDate(dateStr, filterValue) {
    if (!dateStr) return filterValue === 'No Date';
    const recordDate = parseDate(dateStr);
    if (!recordDate || isNaN(+recordDate)) return false;
    // "Is Between" ranges arrive as "YYYY-MM-DD – YYYY-MM-DD"
    const between = String(filterValue).match(/^(\d{4}-\d{2}-\d{2}) – (\d{4}-\d{2}-\d{2})$/);
    if (between) {
      return recordDate >= new Date(between[1]) && recordDate <= new Date(between[2]);
    }
    switch (filterValue) {
      case 'Today':        return isSameDay(recordDate, TODAY);
      case 'This Week':    return isThisWeek(recordDate, TODAY);
      case 'This Month':   return recordDate.getFullYear() === TODAY.getFullYear() && recordDate.getMonth() === TODAY.getMonth();
      case 'Before Today': return recordDate < TODAY;
      case 'After Today':  return recordDate > TODAY;
      case 'No Date':      return false;
      case 'Any Date':     return true;
      default:             return dateStr === filterValue; // exact ISO date match
    }
  }

  function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  function isThisWeek(date, today) {
    const start = new Date(today); start.setDate(today.getDate() - today.getDay()); start.setHours(0,0,0,0);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    return date >= start && date < end;
  }

  // =================================================================

/* ---------- source script.js:792-859 ---------- */
  // RENDER CHIPS
  // =================================================================
  function renderChips() {
    const bar = $('[data-chips]');
    if (!bar) return;
    const fixedChips = `
      <button class="chip chip--clear" data-action="clear-all">
        <span class="material-symbols-rounded">close</span>
        Clear all
      </button>
      ${scopeChip ? `<button class="chip" data-fixed>
        ${escapeHtml(scopeChip.label)}: <strong>${escapeHtml(scopeChip.value)}</strong>
        <span class="material-symbols-rounded chip__close">close</span>
      </button>` : ''}`;
    // One chip per complete condition in the expression tree (duplicates on the
    // same field included). Removing a chip prunes that exact node.
    const treeChips = cfLeafConds(customFilter).map(c => {
      const valStr = Array.isArray(c.value) ? c.value.join(', ') : (c.value == null ? '' : String(c.value));
      const display = SELF_OPS.has(c.op) ? c.op : (valStr !== '' ? `${c.op} ${valStr}` : c.op);
      return `
      <button class="chip" data-cf-chip="${c.id}">
        ${escapeHtml(c.name)}: <strong>${escapeHtml(display)}</strong>
        <span class="material-symbols-rounded chip__close" data-action="cf-remove-chip" data-node="${c.id}">close</span>
      </button>`;
    }).join('');
    // Quick + scope filters live in filterState (one value per field).
    const filterChips = Object.entries(filterState).map(([name, value]) => {
      const f = filterByName[name];
      const op = (opsFor(f) && f.control !== 'segmented') ? (opState[name] || currentOp(f)) : null; // segmented rows have no operator UI
      const valStr = Array.isArray(value) ? value.join(', ') : String(value);
      const display = SELF_OPS.has(valStr) ? valStr
                    : op ? `${op} ${valStr}` : valStr;
      return `
      <button class="chip" data-filter-name="${escapeHtml(name)}">
        ${escapeHtml(name)}: <strong>${escapeHtml(display)}</strong>
        <span class="material-symbols-rounded chip__close">close</span>
      </button>`;
    }).join('');
    bar.innerHTML = fixedChips + treeChips + filterChips;
    // Mirror active values into their drawer sections + quick-card highlights
    renderRowChips();
    syncQuickSelection();
    updateApplyState();
    updateRestoreDefaultsVisibility();
  }

  // Apply stays disabled until at least one filter (or custom expression) is set
  function hasActiveFilters() {
    if (customFilter) return true;
    return Object.values(filterState).some(v =>
      Array.isArray(v) ? v.length > 0 : (v != null && v !== ''));
  }
  function updateApplyState() {
    const active = hasActiveFilters();
    const btn = $('[data-apply-btn]');
    if (btn) {
      // While the builder is open, Apply commits the expression — keep it enabled.
      const builder = $('[data-custom-builder]');
      const builderOpen = builder && !builder.hidden;
      btn.disabled = builderOpen ? false : !active;
    }
    // Clear stays disabled until there are values to clear.
    const clearBtn = $('[data-cf-clear-btn]');
    if (clearBtn) clearBtn.disabled = !active;
  }

  // =================================================================
  // SELECT DROPDOWN

/* ---------- source script.js:859-1063 ---------- */
  // SELECT DROPDOWN
  // =================================================================
  let openMenu = null;

  function closeMenu() {
    if (!openMenu) return;
    // Fade out (see [data-closing] in styles.css), then drop from the DOM.
    // openMenu clears immediately so a replacement menu can open mid-fade.
    const menu = openMenu;
    openMenu = null;
    menu.setAttribute('data-closing', '');
    setTimeout(() => menu.remove(), 120);
  }

  function openSelectMenu(triggerBtn, options, currentValue, onSelect) {
    closeMenu();
    const menu = document.createElement('div');
    menu.className = 'select-menu';
    menu.setAttribute('role', 'listbox');
    menu.innerHTML = options.map(opt => `
      <button class="select-menu__opt${opt === currentValue ? ' select-menu__opt--active' : ''}" data-value="${escapeHtml(opt)}">
        ${escapeHtml(opt)}
      </button>`).join('');

    const rect = triggerBtn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top  = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.minWidth = `${rect.width}px`;

    menu.addEventListener('click', (e) => {
      const opt = e.target.closest('.select-menu__opt');
      if (!opt) return;
      onSelect(opt.dataset.value);
      closeMenu();
    });

    document.body.appendChild(menu);
    openMenu = menu;
  }

  // Searchable multi-select dropdown: filter box + checkbox options.
  // Stays open while toggling so several values can be picked in one visit.
  // opts.tree renders a two-level hierarchy (see DEPARTMENT_TREE) with
  // tri-state checkboxes; opts.getState supplies 'on' | 'mixed' | 'off'.
  function openMultiSelectMenu(triggerBtn, options, isSelected, onToggle, opts = {}) {
    closeMenu();
    const tree = opts.tree || null;
    const getState = opts.getState || ((o) => (isSelected(o) ? 'on' : 'off'));
    const menu = document.createElement('div');
    menu.className = 'select-menu select-menu--multi' + (tree ? ' select-menu--tree' : '');
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-multiselectable', 'true');
    // The type dropdown passes noSearch: its list is short enough that a
    // search box is redundant. Value menus (e.g. Department) keep it.
    const showSearch = !opts.noSearch;
    menu.innerHTML = `
      ${showSearch ? `<div class="select-menu__search">
        <span class="material-symbols-rounded" aria-hidden="true">search</span>
        <input type="search" placeholder="Search…" aria-label="Search values" />
      </div>` : ''}
      <div class="select-menu__list"></div>`;
    const list = menu.querySelector('.select-menu__list');
    const input = menu.querySelector('input');

    // Expansion persists while the menu is open; branches holding a
    // selection start expanded so the current state is visible
    const expanded = new Set(tree ? tree
      .filter(n => n.children.length && n.children.some(c => getState(c) !== 'off'))
      .map(n => n.name) : []);

    const optHtml = (name, depth) => {
      const state = getState(name);
      return `
        <button class="select-menu__opt${state === 'on' ? ' is-checked' : ''}${state === 'mixed' ? ' is-mixed' : ''}${depth ? ' select-menu__opt--child' : ''}"
                role="option" aria-selected="${state === 'on'}" data-value="${escapeHtml(name)}">
          <span class="select-menu__check"><span class="material-symbols-rounded" aria-hidden="true">${state === 'mixed' ? 'remove' : 'check'}</span></span>
          <span>${escapeHtml(name)}</span>
        </button>`;
    };

    const renderList = () => {
      const q = input ? input.value.trim().toLowerCase() : '';
      if (!tree) {
        const visible = options.filter(o => !q || o.toLowerCase().includes(q));
        list.innerHTML = visible.length ? visible.map(o => optHtml(o, 0)).join('')
          : '<div class="select-menu__empty">No matches</div>';
        return;
      }
      // Hierarchy-aware search: a matching parent shows all its children,
      // a matching child keeps its parent visible for context
      const hit = (n) => !q || n.toLowerCase().includes(q);
      const html = tree.map(node => {
        const kidVis = q ? node.children.filter(k => hit(k) || hit(node.name)) : node.children;
        if (q && !hit(node.name) && !kidVis.length) return '';
        if (!node.children.length) {
          return `
            <div class="select-menu__group-row">
              <span class="select-menu__twist select-menu__twist--blank" aria-hidden="true"></span>
              ${optHtml(node.name, 0)}
            </div>`;
        }
        const isOpen = q ? true : expanded.has(node.name);
        return `
          <div class="select-menu__group${isOpen ? ' is-expanded' : ''}" data-group="${escapeHtml(node.name)}">
            <div class="select-menu__group-row">
              <button class="select-menu__twist" type="button" data-twist
                      aria-label="Toggle sub-departments of ${escapeHtml(node.name)}" aria-expanded="${isOpen}">
                <span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
              </button>
              ${optHtml(node.name, 0)}
            </div>
            <div class="select-menu__kids"><div>
              ${kidVis.map(k => optHtml(k, 1)).join('')}
            </div></div>
          </div>`;
      }).join('');
      list.innerHTML = html || '<div class="select-menu__empty">No matches</div>';
    };
    renderList();
    if (input) {
      input.addEventListener('input', renderList);
      input.addEventListener('click', (e) => e.stopPropagation());
    }

    list.addEventListener('click', (e) => {
      // Caret toggles a branch in place so the expansion can animate
      const twist = e.target.closest('[data-twist]');
      if (twist) {
        e.stopPropagation();
        const group = twist.closest('.select-menu__group');
        const name = group.dataset.group;
        expanded.has(name) ? expanded.delete(name) : expanded.add(name);
        const isOpen = expanded.has(name);
        group.classList.toggle('is-expanded', isOpen);
        twist.setAttribute('aria-expanded', String(isOpen));
        return;
      }
      const opt = e.target.closest('.select-menu__opt');
      if (!opt) return;
      e.stopPropagation();
      onToggle(opt.dataset.value);
      renderList();
    });

    const rect = triggerBtn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.minWidth = `${rect.width}px`;
    document.body.appendChild(menu);
    if (input) input.focus();
    openMenu = menu;
  }

  // Searchable single-select (used by the custom builder's filter picker)
  function openSearchSelect(triggerBtn, options, currentValue, onSelect) {
    closeMenu();
    const menu = document.createElement('div');
    menu.className = 'select-menu select-menu--multi';
    menu.setAttribute('role', 'listbox');
    menu.innerHTML = `
      <div class="select-menu__search">
        <span class="material-symbols-rounded" aria-hidden="true">search</span>
        <input type="search" placeholder="Search…" aria-label="Search options" />
      </div>
      <div class="select-menu__list"></div>`;
    const list = menu.querySelector('.select-menu__list');
    const input = menu.querySelector('input');
    const renderList = () => {
      const q = input.value.trim().toLowerCase();
      const visible = options.filter(o => !q || o.toLowerCase().includes(q));
      list.innerHTML = visible.length ? visible.map(opt => `
        <button class="select-menu__opt${opt === currentValue ? ' select-menu__opt--active' : ''}" role="option" data-value="${escapeHtml(opt)}">
          ${escapeHtml(opt)}
        </button>`).join('')
        : '<div class="select-menu__empty">No matches</div>';
    };
    renderList();
    input.addEventListener('input', renderList);
    input.addEventListener('click', (e) => e.stopPropagation());
    list.addEventListener('click', (e) => {
      const opt = e.target.closest('.select-menu__opt');
      if (!opt) return;
      onSelect(opt.dataset.value);
      closeMenu();
    });
    const rect = triggerBtn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.minWidth = `${rect.width}px`;
    document.body.appendChild(menu);
    input.focus();
    openMenu = menu;
  }

  document.addEventListener('click', (e) => {
    if (openMenu && !e.target.closest('.select-menu') && !e.target.closest('.filter-select')) {
      closeMenu();
    }
  }, true);

  // =================================================================
  // WIRE FILTER CONTROLS (delegated)

/* ---------- source script.js:1063-1248 ---------- */
  // WIRE FILTER CONTROLS (delegated)
  // =================================================================

  // .filter-select → either the logical-operator dropdown or the value dropdown
  bind('.filter-select', 'click', (e, btn) => {
    e.stopPropagation();
    const row = btn.closest('[data-filter-name]');
    if (!row) return;
    const filterName = row.dataset.filterName;
    const labelEl = btn.querySelector('span:first-child');

    // Logical operator dropdown
    if (btn.dataset.role === 'op') {
      const filter = filterByName[filterName] || { name: filterName, type: row.dataset.filterType };
      openSelectMenu(btn, opsFor(filter) || [], currentOp(filter), (op) => {
        opState[filterName] = op;
        labelEl.textContent = op;
        // Swap the value control to match the operator (none / text / date / range…)
        const area = row.querySelector('[data-value-area]');
        if (area) area.innerHTML = valueControlHtml(filter, op);
        // Self-contained operators apply immediately; others reset the value
        setFilter(filterName, SELF_OPS.has(op) ? op : null);
      });
      return;
    }

    // Value dropdown (list types) — searchable multi-select with checkboxes;
    // hierarchical filters (Department) render as a tri-state tree
    openMultiSelectMenu(btn,
      getOptionsForFilter(filterName),
      (opt) => valuesOf(filterName).includes(opt),
      (opt) => { toggleFilterValue(filterName, opt); syncListTriggerLabels(filterName); },
      FILTER_TREES[filterName] ? {
        tree: FILTER_TREES[filterName],
        getState: (opt) => deptState(valuesOf(filterName), opt),
      } : {});
  });

  // Keep every "Select Value(s)" trigger label in sync with the selection count
  function syncListTriggerLabels(name) {
    const sel = valuesOf(name);
    const label = sel.length === 0 ? 'Select Value(s)' : sel.length === 1 ? sel[0] : `${sel.length} selected`;
    $$('.filter-row[data-filter-name], .qfilter[data-filter-name]').forEach(row => {
      if (row.dataset.filterName !== name) return;
      const lbl = row.querySelector('.filter-select:not(.filter-op) span:first-child');
      if (lbl) lbl.textContent = label;
    });
  }

  // .filter-date → open native date picker (supports the Is Between range pair)
  bind('.filter-date', 'click', (e, btn) => {
    e.stopPropagation();
    const row = btn.closest('[data-filter-name]');
    if (!row) return;
    const filterName = row.dataset.filterName;
    const labelEl = btn.querySelector('span:first-child');

    let input = btn.querySelector('input[type=date]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'date';
      input.className = 'filter-date__input';
      input.tabIndex = -1;
      btn.appendChild(input);
      input.addEventListener('change', () => {
        if (!input.value) return;
        labelEl.textContent = input.value;
        const range = btn.closest('.filter-date-range');
        if (range) {
          // Compose "start – end" from whichever ends are picked so far
          const part = (sel) => {
            const t = range.querySelector(`${sel} span:first-child`)?.textContent || '';
            return (t === 'Start Date' || t === 'End Date') ? '…' : t;
          };
          setFilter(filterName, `${part('[data-range="start"]')} – ${part('[data-range="end"]')}`);
        } else {
          setFilter(filterName, input.value);
        }
      });
    }
    if (input.showPicker) input.showPicker();
    else input.focus();
  });

  // Person/text/number filter inputs (within .filter-row > .filter-search)
  let searchTimers = new WeakMap();
  bind('[data-filter-name] .filter-search input', 'input', (e, input) => {
    const row = input.closest('[data-filter-name]');
    const filterName = row.dataset.filterName;
    clearTimeout(searchTimers.get(input));
    searchTimers.set(input, setTimeout(() => {
      setFilter(filterName, input.value || null);
    }, 200));
  });

  // Boolean filters: on/off switch
  bind('[data-filter-name] .onoff .switch', 'change', (e, sw) => {
    const row = sw.closest('[data-filter-name]');
    const filterName = row.dataset.filterName;
    setFilter(filterName, sw.checked ? 'On' : null);
  });

  // Scope-section segmented controls (Read Status, Status) — same .segmented selector
  bind('[data-filter-name] .segmented__opt', 'click', (e, opt) => {
    const group = opt.closest('.segmented');
    $$('.segmented__opt', group).forEach(o => {
      o.classList.remove('segmented__opt--active');
      o.setAttribute('aria-checked', 'false');
    });
    opt.classList.add('segmented__opt--active');
    opt.setAttribute('aria-checked', 'true');
    const row = opt.closest('[data-filter-name]');
    const filterName = row.dataset.filterName;
    setFilter(filterName, opt.textContent.trim());
  });

  // Chip remove (any chip with data-filter-name)
  bind('.chip[data-filter-name] .chip__close', 'click', (e, x) => {
    e.stopPropagation();
    const chip = x.closest('.chip');
    const filterName = chip.getAttribute('data-filter-name');
    resetControlForFilter(filterName);
    setFilter(filterName, null);
  });

  // Fixed chip (Module) remove — we'll just remove the chip visually
  bind('.chip[data-fixed] .chip__close', 'click', (e, x) => {
    e.stopPropagation();
    x.closest('.chip').remove();
  });

  // Restore Defaults (footer) / Clear all (chip bar): clears every filter value,
  // resets operators, and returns favorites/quick filters/accordions to the
  // seeded defaults. The chip-bar "Clear all" also closes the drawer; the
  // footer "Restore Defaults" keeps the modal open so the user can keep filtering.
  bind('[data-action="clear-all"]', 'click', (e, btn) => {
    Object.keys(filterState).forEach(k => resetControlForFilter(k));
    Object.keys(filterState).forEach(k => delete filterState[k]);
    Object.keys(opState).forEach(k => delete opState[k]);
    builderDraft = newGroup([]);  // empty the shared expression tree
    customFilter = null;
    cfSelected.clear();
    activeTypeSet.clear();
    if (typeof updateTypeSelectLabel === 'function') updateTypeSelectLabel();
    favOrder = [...DEFAULT_FAVS];
    favSet.clear(); DEFAULT_FAVS.forEach(n => favSet.add(n));
    quickOrder = [...DEFAULT_QUICK];
    quickSet.clear(); DEFAULT_QUICK.forEach(n => quickSet.add(n));
    expandedRows.clear();
    moreOpen = false;
    renderFilterList();
    renderQuickFilters();
    if (customMode) renderBuilder(); // reflect the emptied tree in the builder
    renderResults();
    renderChips();
    if (!btn?.hasAttribute('data-restore-defaults') && drawer.hasAttribute('data-open')) closeDrawer();
  });

  function resetControlForFilter(filterName) {
    // Reset every control instance bound to this filter (drawer row + quick card).
    // The chosen logical operator is kept — only the value clears.
    $$('.filter-row[data-filter-name], .qfilter[data-filter-name]').forEach(row => {
      if (row.dataset.filterName !== filterName) return;
      const selectLabel = row.querySelector('.filter-select:not(.filter-op) span:first-child');
      if (selectLabel) selectLabel.textContent = 'Select Value(s)';
      row.querySelectorAll('.filter-date').forEach(d => {
        const sp = d.querySelector('span:first-child');
        if (sp) sp.textContent = d.dataset.range === 'start' ? 'Start Date'
                               : d.dataset.range === 'end' ? 'End Date' : 'Choose a Date';
        const inp = d.querySelector('input[type=date]');
        if (inp) inp.value = '';
      });
      row.querySelectorAll('.filter-search input').forEach(i => i.value = '');
      row.querySelectorAll('.onoff .switch').forEach(s => s.checked = false);
      // Segmented: reset to first option (treated as default)
      row.querySelectorAll('.segmented').forEach(group => {
        const opts = group.querySelectorAll('.segmented__opt');
        opts.forEach((o, i) => {
          o.classList.toggle('segmented__opt--active', i === 0);
          o.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
        });
      });
    });
  }

  // =================================================================
  // FILTER PANEL COLLAPSE (Hide/Show Filters toggle on desktop)

/* ---------- source script.js:1248-1290 ---------- */
  // FILTER PANEL COLLAPSE (Hide/Show Filters toggle on desktop)
  // =================================================================
  bind('[data-action="toggle-filter-panel"]', 'click', (e, btn) => {
    const panel = document.getElementById('quick-filters');
    const controls = btn.closest('.filter-controls');
    const collapsed = panel.hasAttribute('data-collapsed');
    if (collapsed) {
      panel.removeAttribute('data-collapsed');
      controls.removeAttribute('data-collapsed');
      btn.setAttribute('aria-expanded', 'true');
      btn.querySelector('.filter-toggle__label').textContent = 'Hide Filters';
    } else {
      panel.setAttribute('data-collapsed', '');
      controls.setAttribute('data-collapsed', '');
      btn.setAttribute('aria-expanded', 'false');
      btn.querySelector('.filter-toggle__label').textContent = 'Show Filters';
    }
  });

  // =================================================================
  // POPOVER EXIT — fade-and-hide for lightweight menus/panels
  // Entrances run in CSS when [hidden] clears; exits need this hook
  // because display:none can't transition. Large surfaces (drawer, nav,
  // chart picker, options panel) keep their own data-open choreography.
  // =================================================================
  const closingTimers = new WeakMap();
  function fadeOutThenHide(el, ms = 120) {
    if (!el || el.hidden || el.hasAttribute('data-closing')) return;
    el.setAttribute('data-closing', '');
    closingTimers.set(el, setTimeout(() => {
      el.removeAttribute('data-closing'); el.hidden = true; closingTimers.delete(el);
    }, ms));
  }
  // Reopening during the exit animation must cancel the pending hide
  function cancelFadeOut(el) {
    if (!el) return;
    const t = closingTimers.get(el);
    if (t) { clearTimeout(t); closingTimers.delete(el); }
    el.removeAttribute('data-closing');
  }

  // =================================================================
  // FILTER DRAWER (slide-over)

/* ---------- source script.js:1290-1351 ---------- */
  // FILTER DRAWER (slide-over)
  // =================================================================
  // (drawer / scrim are resolved in init() — see PUBLIC API at the end)


  function openDrawer() {
    drawer.hidden = false;
    scrim.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      drawer.setAttribute('data-open', '');
      scrim.setAttribute('data-open', '');
    });
  }
  function closeDrawer() {
    drawer.removeAttribute('data-open'); scrim.removeAttribute('data-open');
    document.body.style.overflow = '';
    setTimeout(() => { drawer.hidden = true; scrim.hidden = true; }, 300);
  }
  bind('[data-action="open-filter-drawer"]', 'click', openDrawer);
  bind('[data-action="close-filter-drawer"]', 'click', closeDrawer);
  // (scrim click is bound in boot(), once init() has resolved it)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.hasAttribute('data-open')) closeDrawer();
  });

  // ----- Drag the modal's top/bottom edges to make it taller (modal mode) -----
  function initModalResize() {
    const handles = $$('.filter-drawer__resize', drawer);
    if (!handles.length) return;
    let startY = 0, startH = 0, dir = 'bottom';
    const onMove = (e) => {
      const dy = e.clientY - startY;
      const grow = dir === 'bottom' ? dy : -dy;    // dragging an edge outward grows it
      // The modal is centered, so it grows both ways — doubling keeps the
      // dragged edge tracking the cursor.
      let h = startH + grow * 2;
      const maxH = window.innerHeight - 48;         // matches the 24px top/bottom insets
      h = Math.max(360, Math.min(h, maxH));
      drawer.style.setProperty('--filter-modal-h', h + 'px');
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
    };
    handles.forEach(h => h.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dir = h.dataset.resize === 'top' ? 'top' : 'bottom';
      startY = e.clientY;
      startH = drawer.getBoundingClientRect().height;
      document.body.style.userSelect = 'none';
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    }));
  }

  // (Filter layout is fixed to Modal in v1.5 — the layout-mode switcher and the
  // left/right/docked/full modes were removed.)

  // =================================================================
  // NAV MENU (slide-in from left, replaces nav rail)

/* ---------- source script.js:1572-2320 ---------- */
  // FILTER DRAWER — BODY (filter list + search + type filter)
  // =================================================================
  const CAPA_FILTERS = [
    { name: 'Action Description', type: 'text' },
    { name: 'Action Item Completed By', type: 'list' },
    { name: 'Action Item Completed Date', type: 'date' },
    { name: 'Action Owner', type: 'list' },
    { name: 'Action Title', type: 'text' },
    { name: 'Action Type', type: 'list' },
    { name: 'Applicable Root Causes – Selected', type: 'list' },
    { name: 'Approvals – Approval', type: 'list' },
    { name: 'Approvals – Approval Type', type: 'list' },
    { name: 'Approvals – Assignee', type: 'list' },
    { name: 'Asset', type: 'list' },
    { name: 'Assigned Date', type: 'date' },
    { name: 'Assigned To', type: 'person' },
    { name: 'Audit', type: 'list' },
    { name: 'Audit Program ID', type: 'list' },
    { name: 'Before Extension', type: 'date' },
    { name: 'Capital Expenditure Involved', type: 'list' },
    { name: 'Checklist – Answer', type: 'list' },
    { name: 'Checklist Templates – Reference', type: 'list' },
    { name: 'Comment – By', type: 'list' },
    { name: 'Completed By', type: 'list' },
    { name: 'Cost Owner', type: 'list' },
    { name: 'Created By', type: 'person' },
    { name: 'Created On', type: 'date' },
    { name: 'Creation Process', type: 'list' },
    { name: 'Current Assignee', type: 'list' },
    { name: 'Current Task', type: 'list' },
    { name: 'Date Closed', type: 'date' },
    { name: 'Date Created', type: 'date' },
    { name: 'Date Due', type: 'date' },
    { name: 'Department', type: 'list' },
    { name: 'Document(s) for Review', type: 'list' },
    { name: 'Driving Questions – Integrated', type: 'list' },
    { name: 'Driving Questions – Target', type: 'list' },
    { name: 'Driving Questions – Yes / No', type: 'list' },
    { name: 'Due Date Extension – Extended', type: 'list' },
    { name: 'Due Date Extension – Reason', type: 'list' },
    { name: 'Due Date Extension – Status', type: 'list' },
    { name: 'Due Date Extension Approved', type: 'date' },
    { name: 'E-Signature Task', type: 'list' },
    { name: 'EEM or EPM', type: 'list' },
    { name: 'Effectiveness', type: 'list' },
    { name: 'Effectiveness Owner', type: 'list' },
    { name: 'Effectiveness Review Required', type: 'list' },
    { name: 'Effectiveness Start Date', type: 'date' },
    { name: 'Event Management – ID', type: 'number' },
    { name: 'Events Management', type: 'boolean' },
    { name: 'Findings – Finding', type: 'list' },
    { name: 'ForceState', type: 'list' },
    { name: 'Generated From', type: 'list' },
    { name: 'Generated From – Module', type: 'list' },
    { name: 'Hierarchy Of Controls', type: 'list' },
    { name: 'Identifier', type: 'text' },
    { name: 'Incident', type: 'list' },
    { name: 'Initiated By', type: 'person' },
    { name: 'Initiated On', type: 'date' },
    { name: 'Last Comment Added By', type: 'person' },
    { name: 'Last Comment Added On', type: 'date' },
    { name: 'Last Updated By', type: 'person' },
    { name: 'Last Updated On', type: 'date' },
    { name: 'Last Updating Process', type: 'list' },
    { name: 'Location', type: 'list' },
    { name: 'Mobile – CheckedOut By', type: 'list' },
    { name: 'Observation Date', type: 'date' },
    { name: 'Onsite When', type: 'list' },
    { name: 'Options – Selected Options', type: 'list' },
    { name: 'Originator', type: 'list' },
    { name: 'Payment Status', type: 'list' },
    { name: 'Predecessors – Reference', type: 'list' },
    { name: 'Priority', type: 'list' },
    { name: 'Reporting Authority', type: 'list' },
    { name: 'Requested Due Date Extension', type: 'date' },
    { name: 'Schedule', type: 'list' },
    { name: 'Signer', type: 'list' },
    { name: 'Site', type: 'list' },
    { name: 'Source', type: 'list' },
    { name: 'Sub-Actions – Action', type: 'list' },
    { name: 'Supplemental Form – Identifier', type: 'list' },
    { name: 'System Identifier', type: 'text' },
    { name: 'Tracker Owner', type: 'list' },
    { name: 'Training – Assignment', type: 'list' },
    { name: 'Training – Course', type: 'list' },
    { name: 'Training – Trainee', type: 'list' },
    { name: 'Verification Date', type: 'date' },
    { name: 'Verification Performed', type: 'list' },
    { name: 'Verified By', type: 'person' },
    { name: 'Verifier', type: 'list' },
    { name: 'Working Step', type: 'list' },
    { name: 'Working Task', type: 'list' },
  ];

  const FILTER_ICONS = {
    text:    'notes',
    date:    'calendar_today',
    list:    'list',
    person:  'person',
    number:  '123',
    boolean: 'check_box',
  };

  // ---- Logical operators per filter type (per the filter-redesign Figma) ----
  const OPS_LIST = ['Is One Of', 'Is Not One Of', 'Is Empty', 'Is Not Empty', 'Contains', 'Does Not Contain'];
  const OPS_DATE = [
    'Is On or After', 'Is After', 'Is On or Before', 'Is Before', 'Is Between',
    'Equals', 'Does Not Equal', 'Is Empty', 'Is Not Empty',
    'Today', 'Yesterday', 'Tomorrow', 'Before Today', 'Today or Before', 'After Today', 'Today or After',
    'This Week', 'This Month', 'This Quarter', 'This Fiscal Quarter', 'This Fiscal Year', 'This Year',
    'Last Week', 'Last Month', 'Last Quarter', 'Last Fiscal Quarter', 'Last Fiscal Year', 'Last Year',
    'Next Week', 'Next Month', 'Next Quarter', 'Next Fiscal Quarter', 'Next Fiscal Year', 'Next Year',
    'Last 7 Days', 'Last 30 Days', 'Last 60 Days', 'Last 90 Days', 'Last 120 Days', 'Last 365 Days',
    'Next 7 Days', 'Next 30 Days', 'Next 60 Days', 'Next 90 Days', 'Next 120 Days', 'Next 365 Days',
  ];
  const OPS_TEXT = ['Contains', 'Does Not Contain', 'Equals', 'Does Not Equal', 'Is Empty', 'Is Not Empty'];
  const OPS_NUMBER = ['Equals', 'Does Not Equal', 'Is Greater Than', 'Is Less Than', 'Is Empty', 'Is Not Empty'];
  const OPS_BY_TYPE = { list: OPS_LIST, person: OPS_LIST, date: OPS_DATE, text: OPS_TEXT, number: OPS_NUMBER };
  // Quick filters render as distribution cards, so they only support "Is One Of"
  const QUICK_OP = 'Is One Of';
  // Self-contained operators need no value — selecting one applies the filter directly
  const SELF_OPS = new Set(['Is Empty', 'Is Not Empty', ...OPS_DATE.slice(OPS_DATE.indexOf('Today'))]);
  const opState = {}; // chosen logical operator per filter name
  const opsFor = f => (f && OPS_BY_TYPE[f.type]) || null;
  const currentOp = f => opState[f.name] || (opsFor(f) || [])[0] || null;

  // The value half of a filter's controls — depends on type AND chosen operator
  function valueControlHtml(filter, op) {
    const label = escapeHtml(filter.name);
    if (op && SELF_OPS.has(op)) return '';
    if (op && /contains/i.test(op)) {
      return `
          <div class="filter-search">
            <input type="search" placeholder="Contains text…" aria-label="${label}" />
            <span class="material-symbols-rounded" aria-hidden="true">search</span>
          </div>`;
    }
    switch (filter.type) {
      case 'date':
        if (op === 'Is Between') {
          return `
          <div class="filter-date-range">
            <button class="filter-date" type="button" data-range="start">
              <span>Start Date</span>
              <span class="material-symbols-rounded" aria-hidden="true">calendar_today</span>
            </button>
            <button class="filter-date" type="button" data-range="end">
              <span>End Date</span>
              <span class="material-symbols-rounded" aria-hidden="true">calendar_today</span>
            </button>
          </div>`;
        }
        return `
          <button class="filter-date" type="button">
            <span>Choose a Date</span>
            <span class="material-symbols-rounded" aria-hidden="true">calendar_today</span>
          </button>`;
      case 'list':
        return `
          <button class="filter-select" type="button">
            <span>Select Value(s)</span>
            <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
          </button>`;
      case 'person':
        return `
          <div class="filter-search">
            <input type="search" placeholder="Find Person(s)" aria-label="${label}" />
            <span class="material-symbols-rounded" aria-hidden="true">search</span>
          </div>`;
      case 'number':
        return `
          <div class="filter-search">
            <input type="number" placeholder="Enter a Number" aria-label="${label}" />
            <span class="material-symbols-rounded" aria-hidden="true">123</span>
          </div>`;
      case 'text':
      default:
        return `
          <div class="filter-search">
            <input type="search" placeholder="Contains text…" aria-label="${label}" />
            <span class="material-symbols-rounded" aria-hidden="true">search</span>
          </div>`;
    }
  }

  function controlsHtml(filter) {
    const label = escapeHtml(filter.name);
    if (filter.control === 'segmented') {
      return `
          <div class="segmented segmented--lg" role="radiogroup" aria-label="${label}">
            ${filter.options.map((o, i) => `<button class="segmented__opt${i === 0 ? ' segmented__opt--active' : ''}" role="radio" aria-checked="${i === 0 ? 'true' : 'false'}">${escapeHtml(o)}</button>`).join('')}
          </div>`;
    }
    if (filter.type === 'boolean') {
      return `
          <label class="onoff">
            <span class="onoff__label onoff__label--off">Off</span>
            <input type="checkbox" class="switch" />
            <span class="switch__track"><span class="switch__thumb"></span></span>
            <span class="onoff__label onoff__label--on">On</span>
          </label>`;
    }
    // Two controls per the Figma: logical operator + value entry/selection
    const op = currentOp(filter);
    return `
          <button class="filter-select filter-op" type="button" data-role="op" aria-label="${label} operator">
            <span>${escapeHtml(op)}</span>
            <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
          </button>
          <div class="filter-row__value" data-value-area>${valueControlHtml(filter, op)}</div>`;
  }

  // Scope filters (segmented/boolean, no operator) stay on the flat filterState
  // model; every other "rich" field lives in the expression tree so it can hold
  // multiple conditions. Quick-designated fields are handled separately.
  const isScopeFilter = (f) => f.control === 'segmented' || f.type === 'boolean';

  // A rich field's body: one condition cluster per tree condition on that field
  // (reusing the custom-builder controls, keyed by node id), plus "Add condition".
  // When the field has no conditions yet, a single provisional cluster is shown
  // so the row is immediately usable; it materializes a node on first edit.
  function fieldConditionsHtml(filter) {
    const conds = cfCondsForField(builderDraft, filter.name);
    const clusters = conds.length
      ? conds.map(n => standardCondHtml(n, filter)).join('')
      : standardCondHtml(null, filter);
    return `
        <div class="filter-row__conditions" data-field-conditions="${escapeHtml(filter.name)}">
          ${clusters}
          <button class="filter-row__add-cond" type="button" data-action="std-add-cond">
            <span class="material-symbols-rounded" aria-hidden="true">add</span> Add condition
          </button>
        </div>`;
  }
  // One Standard condition cluster: operator + value + remove. `node` null = a
  // provisional cluster (no tree node yet) carrying the field's default operator.
  function standardCondHtml(node, filter) {
    const f = filter || (node && filterByName[node.name]);
    const provisional = !node;
    const op = provisional ? (opsFor(f) || ['Is One Of'])[0] : (node.op || (opsFor(f) || ['Is One Of'])[0]);
    const model = provisional ? { name: f.name, op, value: null } : node;
    const bind = provisional
      ? `data-provisional data-filter-name="${escapeHtml(f.name)}"`
      : `data-node="${node.id}"`;
    return `
          <div class="filter-cond" ${bind}>
            <button class="filter-select cf-pick filter-cond__op" type="button" data-role="cf-op">
              <span>${escapeHtml(op || 'Operator')}</span>
              <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
            </button>
            <div class="cf-value">${cfValueControlHtml(model)}</div>
            ${provisional ? '' : `<button class="cf-remove" type="button" data-action="cf-remove-node" aria-label="Remove condition">
              <span class="material-symbols-rounded" aria-hidden="true">close</span>
            </button>`}
          </div>`;
  }

  // ---- Scope filters (previously hardcoded in the drawer HTML) ----
  const SCOPE_FILTERS = [
    { name: 'Search Models', type: 'boolean', icon: 'dataset' },
    { name: 'Read Status', type: 'list', icon: 'mark_email_read', control: 'segmented', options: ['All', 'Unread'] },
    { name: 'Status', type: 'list', icon: 'flag', control: 'segmented', options: ['Open', 'Closed', 'Cancelled'] },
  ];
  const ALL_FILTERS = [...SCOPE_FILTERS, ...CAPA_FILTERS];
  const filterByName = {};
  ALL_FILTERS.forEach(f => { filterByName[f.name] = f; });

  // ---- Favorite + quick-filter designation state ----
  // Favorites float to the top of the drawer list. Quick filters appear as
  // cards in the strip above the results — none are designated by default.
  // Default visible set — every other filter rolls up into "More Filters"
  // Which fields show up front, and which start pinned as quick-filter cards.
  // Host-overridable via init({ defaultFavorites, defaultQuick }) — the CAPA
  // defaults below only make sense against a CAPA-shaped data model.
  let DEFAULT_FAVS = ['Current Assignee', 'Current Task', 'Date Due', 'Department', 'Site'];
  let DEFAULT_QUICK = [];
  let favOrder = [...DEFAULT_FAVS];
  const favSet = new Set(DEFAULT_FAVS);
  let quickOrder = [];
  const quickSet = new Set();
  const expandedRows = new Set(); // accordion open state, by filter name
  let moreOpen = false;           // "More Filters" roll-up open state

  function filterRowHtml(filter) {
    const icon = filter.icon || FILTER_ICONS[filter.type] || 'list';
    const name = filter.name;
    const open = expandedRows.has(name);
    const fav = favSet.has(name);
    const quick = quickSet.has(name);
    // Locked = designated as a quick filter. The row is no longer operable in
    // the modal (no expand, no inputs); a badge next to the bolt explains why.
    // It's edited from the quick-filter card on the main page until unpinned.
    const badge = quick ? `<span class="filter-row__qf-badge">Used as Quick Filter</span>` : '';
    return `
      <div class="filter-row${quick ? ' filter-row--locked' : ''}" data-filter-type="${filter.type}" data-filter-name="${escapeHtml(name)}">
        <header class="filter-row__head">
          <button class="filter-row__toggle" type="button" data-action="toggle-frow" aria-expanded="${quick ? 'false' : open}"${quick ? ' disabled' : ''}>
            <span class="material-symbols-rounded filter-row__caret" aria-hidden="true">chevron_right</span>
            <span class="filter-row__icon material-symbols-rounded" aria-hidden="true">${icon}</span>
            <h3 class="filter-row__title">${escapeHtml(name)}</h3>
          </button>
          ${badge}
          <button class="filter-row__quick${quick ? ' is-on' : ''}" type="button" data-action="toggle-quick"
                  aria-pressed="${quick}" title="${quick ? 'Remove from quick filters' : 'Show as a quick filter'}">
            <span class="material-symbols-rounded" aria-hidden="true">bolt</span>
          </button>
          <button class="filter-row__fav${fav ? ' is-on' : ''}" type="button" data-action="toggle-fav"
                  aria-pressed="${fav}" title="${fav ? 'Remove from favorites' : 'Favorite — move to top'}">
            <span class="material-symbols-rounded" aria-hidden="true">bookmark</span>
          </button>
        </header>
        ${quick ? '' : `
        <div class="filter-row__body${open ? ' is-open' : ''}">
          ${isScopeFilter(filter)
            ? `<div class="filter-row__controls">${controlsHtml(filter)}</div>`
            : fieldConditionsHtml(filter)}
        </div>
        <div class="filter-row__chips" data-row-chips hidden></div>`}
      </div>`;
  }

  const filterList = $('[data-filter-list]');

  // Restore Defaults only appears once the user has changed the filter set-up:
  // toggled a quick filter on, or changed which filters are favorited.
  function updateRestoreDefaultsVisibility() {
    const btn = $('[data-restore-defaults]');
    if (!btn) return;
    // Reset restores the displayed fields (favorites/quick) to the module
    // default; offer it whenever anything is non-default, including active
    // filter values or a custom expression (so it stays available in custom mode).
    const favsChanged = favSet.size !== DEFAULT_FAVS.length || DEFAULT_FAVS.some(n => !favSet.has(n));
    btn.hidden = !(favsChanged || quickSet.size > 0 || hasActiveFilters());
  }

  function renderFilterList() {
    if (!filterList) return;
    // Fields with active (complete) conditions in the tree — surfaced at the top
    // so a filter added in Custom mode is visible on return to Standard, rather
    // than buried in the collapsed "More Filters" roll-up.
    const conditioned = new Set(cfLeafConds(builderDraft).map(c => c.name));
    const favs = favOrder.filter(n => favSet.has(n)).map(n => filterByName[n]).filter(Boolean);
    const promoted = ALL_FILTERS.filter(f => !favSet.has(f.name) && conditioned.has(f.name));
    const topRows = [...favs, ...promoted];
    const rest = ALL_FILTERS.filter(f => !favSet.has(f.name) && !conditioned.has(f.name));
    const moreInner = rest.length
      ? rest.map(filterRowHtml).join('')
      : '<p class="filter-more__empty">All filters are favorited.</p>';
    filterList.innerHTML = topRows.map(filterRowHtml).join('') + `
      <div class="filter-more${moreOpen ? ' is-open' : ''}" data-more-filters>
        <button class="filter-more__head" type="button" data-action="toggle-more-filters" aria-expanded="${moreOpen}">
          <span class="material-symbols-rounded filter-row__caret" aria-hidden="true">chevron_right</span>
          <span class="material-symbols-rounded filter-row__icon" aria-hidden="true">filter_list</span>
          <h3 class="filter-row__title">More Filters</h3>
          <span class="filter-more__count">${rest.length}</span>
        </button>
        <div class="filter-more__body">
          <div class="filter-more__list">${moreInner}</div>
        </div>
      </div>`;
    restoreControlStates();
    applyListFilters();
    renderRowChips();
    updateRestoreDefaultsVisibility();
    updateBuilderPreview(); // keep the shared expression readout in sync (Standard)
  }

  // Re-apply control values from filterState after a list re-render
  // (operator labels render from opState directly in controlsHtml)
  function restoreControlStates() {
    if (!filterList) return;
    Object.entries(filterState).forEach(([name, value]) => {
      if (Array.isArray(value)) { syncListTriggerLabels(name); return; }
      const v = String(value);
      if (SELF_OPS.has(v)) return; // operator IS the filter — no value control to fill
      $$('.filter-row[data-filter-name], .qfilter[data-filter-name]').forEach(row => {
        if (row.dataset.filterName !== name) return;
        const selectLabel = row.querySelector('.filter-select:not(.filter-op) span:first-child');
        if (selectLabel) selectLabel.textContent = v;
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          const dateLabel = row.querySelector('.filter-date:not([data-range]) span:first-child');
          if (dateLabel) dateLabel.textContent = v;
        }
        row.querySelectorAll('.filter-search input').forEach(i => { i.value = v; });
        row.querySelectorAll('.onoff .switch').forEach(s => { s.checked = value === 'On'; });
        row.querySelectorAll('.segmented').forEach(group => {
          group.querySelectorAll('.segmented__opt').forEach(o => {
            const on = o.textContent.trim() === v;
            o.classList.toggle('segmented__opt--active', on);
            o.setAttribute('aria-checked', on ? 'true' : 'false');
          });
        });
      });
    });
  }

  // ---- Accordion expand/collapse (animated via .is-open grid transition) ----
  bind('[data-action="toggle-frow"]', 'click', (e, btn) => {
    const row = btn.closest('.filter-row');
    const name = row?.dataset.filterName;
    if (!name) return;
    const open = expandedRows.has(name);
    if (open) expandedRows.delete(name); else expandedRows.add(name);
    btn.setAttribute('aria-expanded', String(!open));
    row.querySelector('.filter-row__body')?.classList.toggle('is-open', !open);
  });

  // ---- "More Filters" roll-up ----
  bind('[data-action="toggle-more-filters"]', 'click', (e, btn) => {
    moreOpen = !moreOpen;
    btn.setAttribute('aria-expanded', String(moreOpen));
    btn.closest('.filter-more')?.classList.toggle('is-open', moreOpen);
  });

  // ---- Favorite toggle: promote to top of the list / send back down ----
  bind('[data-action="toggle-fav"]', 'click', (e, btn) => {
    e.stopPropagation();
    const name = btn.closest('.filter-row')?.dataset.filterName;
    if (!name) return;
    if (favSet.has(name)) {
      favSet.delete(name);
      favOrder = favOrder.filter(n => n !== name);
    } else {
      favSet.add(name);
      favOrder.unshift(name);
    }
    renderFilterList();
  });

  // ---- Quick-filter designation ----
  // Quick filters render as "Is One Of" distribution cards, so a rich field's
  // tree conditions are migrated into a single Is-One-Of filterState entry when
  // it's designated. If any condition uses another operator, warn first (those
  // conditions can't be represented as a quick filter and will be dropped).
  bind('[data-action="toggle-quick"]', 'click', async (e, btn) => {
    e.stopPropagation();
    const name = btn.closest('.filter-row')?.dataset.filterName;
    if (!name) return;
    const turningOn = !quickSet.has(name);
    if (turningOn) {
      const conds = cfCondsForField(builderDraft, name);
      if (conds.length) {
        if (conds.some(c => c.op && c.op !== QUICK_OP)) {
          const ok = await confirmDialog({
            title: 'Quick filters use “Is One Of”',
            icon: 'bolt',
            message: `<strong>${escapeHtml(name)}</strong> has conditions using operators other than <strong>${QUICK_OP}</strong>. Quick filters can only use <strong>${QUICK_OP}</strong>.<br><br>Add it as a quick filter using just its ${QUICK_OP} values? Other conditions on this field will be removed.`,
            confirmLabel: `Add as “${QUICK_OP}”`,
            cancelLabel: 'Cancel',
          });
          if (!ok) return;
        }
        // Union the Is-One-Of values, drop all the field's tree conditions,
        // and hand the field to the flat quick-filter store.
        const vals = [];
        conds.forEach(c => {
          if (c.op !== QUICK_OP) return;
          (Array.isArray(c.value) ? c.value : (c.value != null && c.value !== '' ? [c.value] : []))
            .forEach(v => { if (!vals.includes(v)) vals.push(v); });
        });
        conds.forEach(c => cfRemove(builderDraft, c.id));
        opState[name] = QUICK_OP;
        if (vals.length) filterState[name] = vals; else delete filterState[name];
        customFilter = cfPrune(builderDraft);
      }
    }
    setQuickFilter(name, turningOn);
  });

  // ---- Promise-based confirm dialog (centered card + scrim) ----
  function confirmDialog({ title, message, icon = 'warning', confirmLabel = 'Confirm', cancelLabel = 'Cancel' }) {
    return new Promise(resolve => {
      const scrim = document.createElement('div');
      scrim.className = 'confirm-scrim';
      scrim.innerHTML = `
        <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
          <div class="confirm-dialog__icon"><span class="material-symbols-rounded" aria-hidden="true">${icon}</span></div>
          <h2 class="confirm-dialog__title" id="confirm-dialog-title">${escapeHtml(title)}</h2>
          <p class="confirm-dialog__body">${message}</p>
          <div class="confirm-dialog__foot">
            <button class="btn btn--neutral" type="button" data-confirm-cancel>${escapeHtml(cancelLabel)}</button>
            <button class="btn btn--primary" type="button" data-confirm-ok>${escapeHtml(confirmLabel)}</button>
          </div>
        </div>`;
      document.body.appendChild(scrim);
      requestAnimationFrame(() => scrim.setAttribute('data-open', ''));
      const close = (val) => {
        scrim.removeAttribute('data-open');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => scrim.remove(), 200);
        resolve(val);
      };
      const onKey = (ev) => { if (ev.key === 'Escape') close(false); };
      document.addEventListener('keydown', onKey);
      scrim.addEventListener('click', (ev) => { if (ev.target === scrim) close(false); });
      scrim.querySelector('[data-confirm-cancel]').addEventListener('click', () => close(false));
      scrim.querySelector('[data-confirm-ok]').addEventListener('click', () => close(true));
      scrim.querySelector('[data-confirm-ok]').focus();
    });
  }

  function setQuickFilter(name, on) {
    if (on) { quickSet.add(name); if (!quickOrder.includes(name)) quickOrder.push(name); }
    else {
      quickSet.delete(name); quickOrder = quickOrder.filter(n => n !== name);
      // Unpinning a rich field returns its value to the expression tree as a
      // single Is-One-Of condition so nothing silently vanishes.
      const f = filterByName[name];
      if (f && !isScopeFilter(f)) {
        const vals = valuesOf(name);
        if (vals.length) {
          const c = newCond(); c.name = name; c.op = QUICK_OP; c.value = vals.slice();
          ensureTree().children.push(c);
        }
        delete filterState[name]; delete opState[name];
        customFilter = cfPrune(builderDraft);
      }
    }
    renderQuickFilters();
    // Re-render the drawer list so the row flips between operable and locked
    // (badge + inputs removed) — both when pinned here and when unpinned from
    // the main-page quick card.
    renderFilterList();
    renderResults();
    renderChips();
  }

  // ---- Per-section representation of active filters (chips under each head) ----
  // Rich fields draw one chip per tree condition (removable → prune that node);
  // scope fields draw one chip per selected filterState value.
  function renderRowChips() {
    $$('.filter-row [data-row-chips]').forEach(wrap => {
      const row = wrap.closest('.filter-row');
      const name = row?.dataset.filterName;
      const f = name && filterByName[name];
      if (!f) { wrap.innerHTML = ''; wrap.hidden = true; return; }
      if (!isScopeFilter(f)) {
        const conds = cfCondsForField(builderDraft, name).filter(cfCondComplete);
        if (!conds.length) { wrap.innerHTML = ''; wrap.hidden = true; return; }
        wrap.hidden = false;
        wrap.innerHTML = conds.map(c => {
          const valStr = Array.isArray(c.value) ? c.value.join(', ') : (c.value == null ? '' : String(c.value));
          const display = SELF_OPS.has(c.op) ? c.op : (valStr !== '' ? `${c.op}: ${valStr}` : c.op);
          return `
        <span class="frow-chip">
          ${escapeHtml(display)}
          <button type="button" class="frow-chip__x" data-action="remove-row-chip"
                  data-node="${c.id}" aria-label="Remove ${escapeHtml(name)} ${escapeHtml(display)}">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </span>`;
        }).join('');
        return;
      }
      // Scope fields (segmented/boolean) — one chip per selected value
      const value = filterState[name];
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) {
        wrap.innerHTML = ''; wrap.hidden = true; return;
      }
      wrap.hidden = false;
      const op = (opsFor(f) && f.control !== 'segmented') ? (opState[name] || currentOp(f)) : null;
      const values = Array.isArray(value) ? value : [value];
      wrap.innerHTML = values.map(v => {
        const display = SELF_OPS.has(String(v)) ? String(v)
                      : op ? `${op}: ${v}` : String(v);
        return `
        <span class="frow-chip">
          ${escapeHtml(display)}
          <button type="button" class="frow-chip__x" data-action="remove-row-chip"
                  data-value="${escapeHtml(String(v))}" aria-label="Remove ${escapeHtml(name)}: ${escapeHtml(String(v))}">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </span>`;
      }).join('');
    });
  }
  bind('[data-action="remove-row-chip"]', 'click', (e, btn) => {
    e.stopPropagation();
    // Rich field chip → prune that exact tree condition
    if (btn.dataset.node) {
      cfRemove(builderDraft, btn.dataset.node);
      commitTree();
      renderFilterList();
      return;
    }
    const name = btn.closest('.filter-row')?.dataset.filterName;
    if (!name) return;
    if (Array.isArray(filterState[name])) {
      // Remove just this value from the multi-selection
      toggleFilterValue(name, btn.dataset.value);
      syncListTriggerLabels(name);
    } else {
      resetControlForFilter(name);
      setFilter(name, null);
    }
  });

  // ---- Quick-filter cards (strip above the results) ----
  // Showcase distributions for the classic CAPA quick filters; other filters
  // fall back to live counts from RESULTS, or to their drawer control.
  const QF_PRESETS = {
    'Current Assignee': [['Ballari, Jhansi', 412, 22], ['Putta, Aravind', 288, 15], ['Slaughter, Nicholas', 318, 17], ['EHS Coordinator Team', 526, 28], ['Case Management Team', 516, 27], ['Unassigned', 1892, 100]],
    'Current Task': [['Investigate Root Cause', 684, 60], ['Define Corrective Action', 812, 71], ['Implement Action', 1142, 100], ['Verify Effectiveness', 488, 43], ['Awaiting Review', 377, 33], ['Closeout Approval', 294, 26]],
    'Date Due': [['Overdue', 412, 32], ['Due Today', 29, 2], ['Due This Week', 147, 12], ['Due This Month', 502, 39], ['Due Later', 1108, 87], ['No Due Date', 1273, 100]],
    'Department': [['Operations', 1287, 100], ['Maintenance', 842, 65], ['Safety', 528, 41], ['Quality', 412, 32], ['Environmental', 288, 22], ['Engineering', 194, 15]],
    'Site': [['HYD Plant 1', 892, 100], ['HYD Plant 2', 724, 81], ['WPDCG', 612, 69], ['DEN Plant 3', 488, 55], ['BOS Operations', 412, 46], ['ATL Corporate', 343, 38]],
  };
  // Distributions are computed live from the host's records for any field that
  // has an accessor; QF_PRESETS above only covers the CAPA showcase fields.

  // A card shows this many values before collapsing the rest behind "See More"
  const QF_LIMIT = 6;
  const quickExpanded = new Set();   // filter names currently showing every value

  // Returns the FULL distribution; the card decides how much of it to show, so
  // it can tell whether there's anything left to reveal.
  function quickRowsFor(name) {
    const get = accessorFor(name);
    if (get) {
      const counts = countBy(RECORDS, get);
      if (counts.length) return counts;         // live [value, count] pairs
    }
    // no backing data — fall back to the showcase distribution, else the control
    return QF_PRESETS[name] || null;
  }

  function quickCardHtml(name) {
    const f = filterByName[name] || { name, type: 'list' };
    const all = quickRowsFor(name);
    // "See More" only earns its place when values are actually hidden — a card
    // whose whole distribution fits shouldn't offer to expand nothing.
    const expanded = quickExpanded.has(name);
    const hidden = all ? Math.max(0, all.length - QF_LIMIT) : 0;
    const rows = all && !expanded ? all.slice(0, QF_LIMIT) : all;
    const body = rows
      ? `<ul class="qfilter__list">${rows.map(([v, n]) => `
            <li class="qfilter__row${valuesOf(name).includes(v) ? ' qfilter__row--selected' : ''}" data-value="${escapeHtml(v)}">
              <span class="qfilter__check" aria-hidden="true"><span class="material-symbols-rounded">check</span></span>
              <span class="qfilter__row-label">${escapeHtml(v)} (${n.toLocaleString()})</span>
            </li>`).join('')}
         </ul>
         ${hidden ? `<button class="qfilter__more" type="button" data-action="toggle-quick-more"
              aria-expanded="${expanded}">${expanded ? 'See Less' : `See More (${hidden})`}</button>` : ''}`
      : `<div class="qfilter__controls">${controlsHtml(f)}</div>`;
    return `
      <article class="qfilter" data-filter-name="${escapeHtml(name)}" data-filter-type="${f.type}">
        <header class="qfilter__head">
          <h3 class="qfilter__title">${escapeHtml(name)}</h3>
          <button class="qfilter__close icon-btn icon-btn--xs" data-action="unpin-quick" aria-label="Remove ${escapeHtml(name)} quick filter">
            <span class="material-symbols-rounded">close</span>
          </button>
        </header>
        ${body}
      </article>`;
  }

  function renderQuickFilters() {
    const host = $('[data-quick-filters]');
    const section = document.getElementById('quick-filters');
    const toggle = $('[data-action="toggle-filter-panel"]');
    if (!host || !section) return;
    const names = quickOrder.filter(n => quickSet.has(n));
    host.innerHTML = names.map(quickCardHtml).join('');
    restoreControlStates();
    const none = names.length === 0;
    section.hidden = none;
    if (toggle) toggle.hidden = none;
    updateRestoreDefaultsVisibility();
  }

  bind('[data-action="toggle-quick-more"]', 'click', (e, btn) => {
    e.stopPropagation();
    const name = btn.closest('.qfilter')?.dataset.filterName;
    if (!name) return;
    if (quickExpanded.has(name)) quickExpanded.delete(name); else quickExpanded.add(name);
    renderQuickFilters();
  });

  bind('[data-action="unpin-quick"]', 'click', (e, btn) => {
    e.stopPropagation();
    const name = btn.closest('.qfilter')?.dataset.filterName;
    if (name) { quickExpanded.delete(name); setQuickFilter(name, false); }
  });

  // Clicking a distribution row in a quick card toggles that value (multi-select)
  bind('.qfilter__row', 'click', (e, rowEl) => {
    const name = rowEl.closest('.qfilter')?.dataset.filterName;
    if (!name) return;
    toggleFilterValue(name, rowEl.dataset.value);
    syncListTriggerLabels(name);
  });

  // Keep quick-card selection highlights in sync with filterState
  function syncQuickSelection() {
    $$('.qfilter[data-filter-name]').forEach(card => {
      const name = card.dataset.filterName;
      $$('.qfilter__row', card).forEach(rowEl => {
        rowEl.classList.toggle('qfilter__row--selected', valuesOf(name).includes(rowEl.dataset.value));
      });
    });
  }

  // ---- Drawer toolbar: category dropdown + name search (combined) ----
  // Category dropdown replaces the old segmented buttons; still multi-select.
  const TYPE_CATEGORIES = [
    { label: 'Text', type: 'text' },
    { label: 'Date', type: 'date' },
    { label: 'List', type: 'list' },
    { label: 'Person', type: 'person' },
    { label: 'Number', type: 'number' },
    { label: 'Checkbox', type: 'boolean' },
  ];
  const activeTypeSet = new Set();
  function updateTypeSelectLabel() {
    const lbl = $('[data-type-label]');
    const n = activeTypeSet.size;
    if (lbl) {
      lbl.textContent = n === 0 ? 'All types'
        : n === 1 ? (TYPE_CATEGORIES.find(c => activeTypeSet.has(c.type))?.label || '1 type')
        : `${n} types`;
    }
    $('.filter-type-select')?.classList.toggle('is-active', n > 0);
  }
  function applyListFilters() {
    if (!filterList) return;
    const q = ($('.filter-search-input input')?.value || '').trim().toLowerCase();
    const activeTypes = [...activeTypeSet];
    $$('.filter-row', filterList).forEach((r) => {
      const title = r.querySelector('.filter-row__title')?.textContent?.toLowerCase() || '';
      const typeOk = activeTypes.length === 0 || activeTypes.includes(r.dataset.filterType);
      const qOk = q.length === 0 || title.includes(q);
      r.hidden = !(typeOk && qOk);
    });
    // While searching/type-filtering, auto-open "More Filters" so matches inside
    // it are visible; hide the group entirely if nothing in it matches.
    const more = filterList.querySelector('[data-more-filters]');
    if (more) {
      const filtering = q.length > 0 || activeTypes.length > 0;
      const anyInMore = !!more.querySelector('.filter-row:not([hidden])');
      const open = filtering ? anyInMore : moreOpen;
      more.classList.toggle('is-open', open);
      more.querySelector('[data-action="toggle-more-filters"]')?.setAttribute('aria-expanded', String(open));
      more.hidden = filtering && !anyInMore;
    }
  }
  const ALL_TYPES_LABEL = 'All types';
  bind('[data-action="open-type-menu"]', 'click', (e, btn) => {
    e.stopPropagation();
    openMultiSelectMenu(
      btn,
      [ALL_TYPES_LABEL, ...TYPE_CATEGORIES.map(c => c.label)],
      // "All types" is selected when no specific type is active
      (label) => label === ALL_TYPES_LABEL
        ? activeTypeSet.size === 0
        : activeTypeSet.has(TYPE_CATEGORIES.find(c => c.label === label)?.type),
      (label) => {
        if (label === ALL_TYPES_LABEL) {
          activeTypeSet.clear(); // reset to showing every type
        } else {
          const c = TYPE_CATEGORIES.find(c => c.label === label);
          if (!c) return;
          activeTypeSet.has(c.type) ? activeTypeSet.delete(c.type) : activeTypeSet.add(c.type);
        }
        updateTypeSelectLabel();
        applyListFilters();
      },
      { noSearch: true }
    );
  });
  bind('.filter-search-input input', 'input', applyListFilters);

  renderFilterList();
  renderQuickFilters();

  // =================================================================
  // CHART OUTPUT MODE  (Highcharts) — recreates the product's Chart display

/* ---------- source script.js:2914-3666 ---------- */
  // CUSTOM FILTERS — logically chained filter expressions
  // Model: nested groups. A group is a bracket; it has one connective
  // (AND/OR) and contains conditions and/or sub-groups. This guarantees
  // every expression is well-formed — brackets come from grouping, never
  // from manual paren placement.
  // =================================================================
  const cfSelected = new Set(); // condition ids checked for "Group selected"
  let cfDragId = null;          // node id currently being drag-reordered
  let cfSeq = 0;

  // `conn` is the connective joining this node to its PREVIOUS sibling
  // (AND | OR). It is ignored on the first child of a group. Each junction is
  // independent; AND binds tighter than OR when a group mixes the two.
  const newCond = () => ({ id: 'c' + (++cfSeq), kind: 'cond', conn: 'AND', name: null, op: null, value: null });
  const newGroup = (children = []) => ({ id: 'g' + (++cfSeq), kind: 'group', conn: 'AND', children });
  const cfClone = (node) => JSON.parse(JSON.stringify(node));

  function cfFind(node, id) {
    if (!node) return null;
    if (node.id === id) return node;
    if (node.kind !== 'group') return null;
    for (const ch of node.children) { const hit = cfFind(ch, id); if (hit) return hit; }
    return null;
  }
  function cfRemove(node, id) {
    if (!node || node.kind !== 'group') return;
    node.children = node.children.filter(ch => ch.id !== id);
    node.children.forEach(ch => cfRemove(ch, id));
  }
  // Parent group of the node with the given id (null if root or not found)
  function cfParent(node, id) {
    if (!node || node.kind !== 'group') return null;
    if (node.children.some(ch => ch.id === id)) return node;
    for (const ch of node.children) { const r = cfParent(ch, id); if (r) return r; }
    return null;
  }
  // Move a node to sit before/after a target node (used by drag-reorder)
  function cfMoveNode(root, dragId, targetId, position) {
    if (dragId === targetId) return;
    const drag = cfFind(root, dragId); const target = cfFind(root, targetId);
    if (!drag || !target) return;
    if (drag.kind === 'group' && cfFind(drag, targetId)) return; // can't drop into self
    const dragParent = cfParent(root, dragId); const targetParent = cfParent(root, targetId);
    if (!dragParent || !targetParent) return;
    dragParent.children = dragParent.children.filter(c => c.id !== dragId);
    let idx = targetParent.children.findIndex(c => c.id === targetId);
    if (idx < 0) return;
    if (position === 'after') idx += 1;
    targetParent.children.splice(idx, 0, drag);
  }
  function cfCountConds(node) {
    if (!node) return 0;
    if (node.kind === 'cond') return 1;
    return node.children.reduce((n, ch) => n + cfCountConds(ch), 0);
  }
  // Function declaration (hoisted) so early renders (renderRowChips at init) can
  // reference it before this line executes.
  function cfCondComplete(c) {
    return !!c.name && !!c.op &&
      (SELF_OPS.has(c.op) || (Array.isArray(c.value) ? c.value.length > 0 : c.value != null && c.value !== ''));
  }
  // Drop incomplete conditions / empty groups for apply + evaluation
  function cfPrune(node) {
    if (!node) return null;
    if (node.kind === 'cond') return cfCondComplete(node) ? cfClone(node) : null;
    const children = node.children.map(cfPrune).filter(Boolean);
    if (!children.length) return null;
    return { id: node.id, kind: 'group', conn: node.conn, children };
  }

  // ---- Evaluation against a record ----
  // Conditions read through the host's injected accessors, exactly as the flat
  // filterState path does, so Standard and Custom agree on what a field means.
  function evalCondition(r, c) {
    const f = filterByName[c.name];
    const get = accessorFor(c.name);
    if (!get || !c.op) return true; // unmapped/incomplete — pass through
    const raw = get(r);
    const v = c.value;
    if (c.op === 'Is Empty') return raw == null || raw === '' || raw === 'Unassigned';
    if (c.op === 'Is Not Empty') return !(raw == null || raw === '' || raw === 'Unassigned');
    if (f && f.type === 'date') {
      if (!raw) return false;
      const d = parseDate(raw);
      if (!d || isNaN(+d)) return false;
      if (c.op === 'Is Between') {
        const m = String(v || '').match(/(\d{4}-\d{2}-\d{2}) – (\d{4}-\d{2}-\d{2})/);
        return m ? (d >= new Date(m[1]) && d <= new Date(m[2])) : true;
      }
      if (SELF_OPS.has(c.op)) return matchesDate(raw, c.op); // relative presets (supported subset)
      if (!v) return true;
      const t = parseDate(v) || new Date(v);
      switch (c.op) {
        case 'Is On or After':  return d >= t;
        case 'Is After':        return d > t;
        case 'Is On or Before': return d <= t;
        case 'Is Before':       return d < t;
        case 'Equals':          return raw === v;
        case 'Does Not Equal':  return raw !== v;
        default:                return true;
      }
    }
    const vals = Array.isArray(v) ? v : (v != null && v !== '' ? [v] : []);
    // Tree filters (Department): selected parents imply their sub-departments
    const treeVals = FILTER_TREES[c.name] ? expandDeptValues(vals) : vals;
    const s = String(raw ?? '').toLowerCase();
    switch (c.op) {
      case 'Is One Of':        return vals.length === 0 || treeVals.includes(raw);
      case 'Is Not One Of':    return !treeVals.includes(raw);
      case 'Contains':         return !v || s.includes(String(v).toLowerCase());
      case 'Does Not Contain': return !v || !s.includes(String(v).toLowerCase());
      case 'Equals':           return !v || String(raw) === String(v);
      case 'Does Not Equal':   return !v || String(raw) !== String(v);
      case 'Is Greater Than':  return Number(raw) > Number(v);
      case 'Is Less Than':     return Number(raw) < Number(v);
      default:                 return true;
    }
  }
  function evalExpr(node, r) {
    if (!node) return true;
    if (node.kind === 'cond') return evalCondition(r, node);
    if (!node.children.length) return true;
    // AND binds tighter than OR: the group is an OR of consecutive AND-runs.
    // A child whose connective is OR starts a new run; the group is true when
    // any run is fully satisfied.
    let result = false;   // OR accumulator across runs
    let run = true;       // AND accumulator within the current run
    node.children.forEach((ch, i) => {
      const v = evalExpr(ch, r);
      if (i === 0) { run = v; }
      else if (ch.conn === 'OR') { result = result || run; run = v; }
      else { run = run && v; }
    });
    return result || run;
  }

  // ---- Readable expression formatting (live preview + applied summary) ----
  function cfValueStr(c) {
    if (c.op && SELF_OPS.has(c.op)) return '';
    if (c.value == null || c.value === '' || (Array.isArray(c.value) && !c.value.length)) return '…';
    return Array.isArray(c.value) ? `[${c.value.join(', ')}]` : String(c.value);
  }
  function formatExpr(node, isRoot = true) {
    if (!node) return '';
    if (node.kind === 'cond') {
      if (!node.name) return '<span class="cfx-incomplete">new condition…</span>';
      const val = cfValueStr(node);
      return `<b>${escapeHtml(node.name)}</b> <span class="cfx-opword">${escapeHtml(node.op || '…')}</span>${val ? ` <span class="cfx-val">${escapeHtml(val)}</span>` : ''}`;
    }
    if (!node.children.length) {
      const empty = '<span class="cfx-incomplete">empty group</span>';
      return isRoot ? empty : `<span class="cfx-paren">(</span>${empty}<span class="cfx-paren">)</span>`;
    }
    // Group children into OR-separated runs of ANDs (AND binds tighter).
    const segs = [[node.children[0]]];
    for (let i = 1; i < node.children.length; i++) {
      if ((node.children[i].conn || 'AND') === 'OR') segs.push([node.children[i]]);
      else segs[segs.length - 1].push(node.children[i]);
    }
    const andJoin = ` <span class="cfx-bool cfx-bool--and">AND</span> `;
    const orJoin  = ` <span class="cfx-bool cfx-bool--or">OR</span> `;
    const hasOr = segs.length > 1;
    const inner = segs.map(seg => {
      const s = seg.map(ch => formatExpr(ch, false)).join(andJoin);
      // Parenthesize multi-term AND-runs only when an OR is present, so the
      // (A AND B) OR C precedence reads correctly.
      return hasOr && seg.length > 1 ? `<span class="cfx-paren">(</span>${s}<span class="cfx-paren">)</span>` : s;
    }).join(orJoin);
    return isRoot ? inner : `<span class="cfx-paren">(</span>${inner}<span class="cfx-paren">)</span>`;
  }

  // ---- Builder rendering ----
  const builderEl = $('[data-custom-builder]');
  const builderRoot = $('[data-builder-root]');
  // The Standard | Custom segmented switch drives `customMode`. Keep both the
  // pressed state and the footer's builder-only Clear button in sync with it.
  function syncFilterViewSwitch() {
    $$('[data-action="set-filter-view"]').forEach(btn => {
      const on = (btn.dataset.view === 'custom') === customMode;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    // Clear (destructive) is available in both Standard and Custom modes.
    const clearBtn = $('[data-cf-clear-btn]');
    if (clearBtn) clearBtn.hidden = false;
    updateApplyState();
  }

  function cfValueControlHtml(c) {
    const f = filterByName[c.name];
    if (!c.name || !c.op) return '';
    if (SELF_OPS.has(c.op)) return '';
    if (/contains/i.test(c.op) || (f && (f.type === 'text'))) {
      return `<input class="cf-input" data-role="cf-value-text" type="search" placeholder="Contains text…" value="${escapeHtml(typeof c.value === 'string' ? c.value : '')}" />`;
    }
    if (f && f.type === 'number') {
      return `<input class="cf-input" data-role="cf-value-text" type="number" placeholder="Enter a number" value="${escapeHtml(typeof c.value === 'string' ? c.value : '')}" />`;
    }
    if (f && f.type === 'date') {
      if (c.op === 'Is Between') {
        const m = String(c.value || '').match(/^(\S+) – (\S+)$/);
        const from = m && m[1] !== '…' ? m[1] : null;
        const to = m && m[2] !== '…' ? m[2] : null;
        return `
          <div class="cf-date-range">
            <button class="filter-date cf-date" type="button" data-role="cf-value-date" data-range="start"><span>${escapeHtml(from || 'Start Date')}</span><span class="material-symbols-rounded" aria-hidden="true">calendar_today</span></button>
            <button class="filter-date cf-date" type="button" data-role="cf-value-date" data-range="end"><span>${escapeHtml(to || 'End Date')}</span><span class="material-symbols-rounded" aria-hidden="true">calendar_today</span></button>
          </div>`;
      }
      return `<button class="filter-date cf-date" type="button" data-role="cf-value-date"><span>${escapeHtml(typeof c.value === 'string' && c.value ? c.value : 'Choose a Date')}</span><span class="material-symbols-rounded" aria-hidden="true">calendar_today</span></button>`;
    }
    // list / person → multi-select values
    const sel = Array.isArray(c.value) ? c.value : [];
    const label = sel.length === 0 ? 'Select Value(s)' : sel.length === 1 ? sel[0] : `${sel.length} selected`;
    return `
      <button class="filter-select cf-pick" type="button" data-role="cf-value-multi">
        <span>${escapeHtml(label)}</span>
        <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
      </button>`;
  }

  // Interactive connective between two adjacent rows — toggles node.conn.
  function cfJoinHtml(node) {
    const conn = node.conn || 'AND';
    return `
      <div class="cf-join" role="group" aria-label="Connective">
        <button type="button" class="cf-join__and ${conn === 'AND' ? 'is-active' : ''}" data-action="cf-set-conn" data-node="${node.id}" data-conn="AND" aria-pressed="${conn === 'AND'}">AND</button>
        <button type="button" class="cf-join__or ${conn === 'OR' ? 'is-active' : ''}" data-action="cf-set-conn" data-node="${node.id}" data-conn="OR" aria-pressed="${conn === 'OR'}">OR</button>
      </div>`;
  }

  function cfNodeHtml(node, depth) {
    if (node.kind === 'cond') {
      // Lead cluster: drag handle (reorder) + checkbox (select-to-group).
      const lead = `
          <div class="cf-cond__lead">
            <span class="cf-drag" draggable="true" data-drag-handle role="button" aria-label="Drag to reorder" title="Drag to reorder">
              <span class="material-symbols-rounded" aria-hidden="true">drag_indicator</span>
            </span>
            <label class="cf-select" title="Select to group">
              <input type="checkbox" data-action="cf-select" ${cfSelected.has(node.id) ? 'checked' : ''} aria-label="Select ${escapeHtml(node.name || 'filter')} for grouping" />
            </label>
          </div>`;
      return `
        <div class="cf-cond${cfSelected.has(node.id) ? ' is-selected' : ''}" data-node="${node.id}">
          ${lead}
          <button class="filter-select cf-pick" type="button" data-role="cf-filter">
            <span>${escapeHtml(node.name || 'Choose a filter')}</span>
            <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
          </button>
          <button class="filter-select cf-pick" type="button" data-role="cf-op" ${node.name ? '' : 'disabled'}>
            <span>${escapeHtml(node.op || 'Operator')}</span>
            <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
          </button>
          <div class="cf-value">${cfValueControlHtml(node)}</div>
          <button class="cf-remove" type="button" data-action="cf-remove-node" aria-label="Remove condition">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>
        </div>`;
    }
    // Each junction between adjacent children carries its own AND/OR toggle,
    // attached to the child that follows it (child.conn).
    const children = node.children
      .map((ch, i) => (i === 0 ? '' : cfJoinHtml(ch)) + cfNodeHtml(ch, depth + 1))
      .join('');
    // Nested groups get their own drag handle so they can be reordered too.
    const groupDrag = depth > 0 ? `
          <span class="cf-drag" draggable="true" data-drag-handle role="button" aria-label="Drag group to reorder" title="Drag to reorder">
            <span class="material-symbols-rounded" aria-hidden="true">drag_indicator</span>
          </span>` : '';
    // "Group selected" appears in the root add-row once 2+ conditions are checked
    const groupSelectedBtn = (depth === 0 && cfSelected.size >= 2) ? `
          <button type="button" class="cf-group-selected" data-action="cf-group-selected"><span class="material-symbols-rounded" aria-hidden="true">workspaces</span> Group selected (${cfSelected.size})</button>` : '';
    return `
      <div class="cf-group cf-group--d${Math.min(depth, 3)}" data-node="${node.id}">
        <div class="cf-group__bar">
          ${groupDrag}
          <span class="cf-group__hint">${depth === 0 ? 'Expression' : 'Bracketed group'}</span>
          ${depth === 0 ? '' : `
          <button class="cf-remove" type="button" data-action="cf-remove-node" aria-label="Remove group">
            <span class="material-symbols-rounded" aria-hidden="true">close</span>
          </button>`}
        </div>
        <div class="cf-group__children">${children || '<div class="cf-empty">Empty group — add a condition</div>'}</div>
        <div class="cf-group__add">
          <button type="button" data-action="cf-add-cond"><span class="material-symbols-rounded" aria-hidden="true">add</span> Condition</button>
          <button type="button" data-action="cf-add-group"><span class="material-symbols-rounded" aria-hidden="true">data_object</span> Group ( )</button>
          ${groupSelectedBtn}
        </div>
      </div>`;
  }

  function updateBuilderPreview() {
    // Resolve elements locally (this runs during the first renderFilterList at
    // init, before any cached module-scope consts would be initialized).
    const body = $('[data-builder-preview]');
    const wrap = $('[data-expr-preview]');
    // Only show once there's at least one complete condition — otherwise an
    // empty tree would read "empty group".
    const has = !!(builderDraft && cfLeafConds(builderDraft).length);
    const expr = has ? (formatExpr(builderDraft) || '') : '';
    if (body) body.innerHTML = expr;
    if (wrap) wrap.hidden = !has;
  }
  // enterId marks the node that changed so only it animates after the
  // wholesale re-render (animating every node would flicker on each edit).
  // enterMode 'controls' scopes the animation to a condition's op/value
  // controls (after picking a filter or operator) instead of the whole row.
  function renderBuilder(enterId, enterMode) {
    if (!builderRoot || !builderDraft) return;
    builderRoot.innerHTML = cfNodeHtml(builderDraft, 0);
    updateBuilderPreview();
    commitTree();
    if (enterId) {
      const el = builderRoot.querySelector(`[data-node="${enterId}"]`);
      if (el) el.classList.add(enterMode === 'controls' ? 'cf-enter--controls' : 'cf-enter');
    }
  }
  // The expression tree is the single source of truth for all rich (list/date/
  // text/number/person) fields, edited from BOTH the Standard clusters and the
  // Custom builder. Commit prunes it into `customFilter` and re-evaluates —
  // called on every edit from either surface (no separate "Apply" step).
  function commitTree() {
    const next = cfPrune(builderDraft);
    // Only re-render the results when the applied expression actually changed —
    // switching Standard↔Custom (or a no-op edit) must not disturb the list.
    const changed = JSON.stringify(next) !== JSON.stringify(customFilter);
    customFilter = next;
    updateBuilderPreview(); // keep the shared expression readout current
    if (changed) { renderResults(); renderChips(); }
  }
  // Re-render whichever editing surface is live, then commit. Value-only edits
  // skip this (they update in place to preserve focus) and call commitTree().
  function cfReflect(enterId, enterMode) {
    if (customMode) renderBuilder(enterId, enterMode); // renderBuilder commits
    else { renderFilterList(); commitTree(); }
  }
  // Lazily create the working tree (kept null until first use so the catalog
  // renders empty clusters before any condition exists).
  function ensureTree() { if (!builderDraft) builderDraft = newGroup([]); return builderDraft; }
  // All complete condition (leaf) nodes anywhere in the tree, in document order.
  function cfLeafConds(root, out = []) {
    if (!root) return out;
    if (root.kind === 'cond') { if (cfCondComplete(root)) out.push(root); return out; }
    root.children.forEach(ch => cfLeafConds(ch, out));
    return out;
  }
  // All condition nodes targeting a given field, in document order.
  function cfCondsForField(root, name) {
    const out = [];
    (function walk(n) {
      if (!n) return;
      if (n.kind === 'cond') { if (n.name === name) out.push(n); return; }
      n.children.forEach(walk);
    })(root);
    return out;
  }
  // Resolve the tree node behind a control element. Custom rows and materialized
  // Standard clusters carry [data-node]; a provisional Standard cluster carries
  // [data-provisional] + [data-filter-name] and (when create) materializes a
  // real node on first edit so we don't bloat the tree with untouched fields.
  function cfResolveNode(el, create) {
    const host = el && el.closest('[data-node],[data-provisional]');
    if (!host) return null;
    if (host.dataset.node) return cfFind(builderDraft, host.dataset.node);
    if (!create) return null;
    const f = filterByName[host.dataset.filterName];
    if (!f) return null;
    const c = newCond();
    c.name = f.name;
    c.op = (opsFor(f) || ['Is One Of'])[0];
    ensureTree().children.push(c);
    host.dataset.node = c.id;
    host.removeAttribute('data-provisional');
    return c;
  }
  // FLIP: animate rows/groups sliding to their new positions across a re-render
  // (used for drag-reorder and grouping). Skips descendants of a moving group
  // (the ancestor's transform already carries them) and reduced-motion users.
  function flipReorder(mutate) {
    const root = builderRoot;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!root || reduce) { mutate(); renderBuilder(); return; }
    const sel = '.cf-cond, .cf-group';
    const first = new Map();
    root.querySelectorAll(sel).forEach(el => first.set(el.dataset.node, el.getBoundingClientRect()));
    mutate();
    renderBuilder();
    const moves = [];
    root.querySelectorAll(sel).forEach(el => {
      const f = first.get(el.dataset.node);
      if (!f) return;
      const l = el.getBoundingClientRect();
      const dx = f.left - l.left, dy = f.top - l.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      moves.push({ el, dx, dy });
    });
    const movingIds = new Set(moves.map(m => m.el.dataset.node));
    moves.forEach(({ el, dx, dy }) => {
      // if an ancestor group is also moving, let it carry this element
      let p = el.parentElement && el.parentElement.closest(sel);
      while (p && root.contains(p)) { if (movingIds.has(p.dataset.node)) return; p = p.parentElement && p.parentElement.closest(sel); }
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'transform var(--d-normal) var(--ease-out)';
        el.style.transform = '';
      }));
      el.addEventListener('transitionend', () => { el.style.transition = ''; el.style.transform = ''; }, { once: true });
    });
  }
  function openBuilder(draft) {
    customMode = true;
    // Lock the modal to its current (standard) height BEFORE swapping in the
    // builder, so switching to custom holds the panel's size instead of
    // shrinking to the shorter expression. (Skip tiny measurements from deep
    // links where there's no standard view to match.)
    if (drawer) {
      const h = Math.round(drawer.getBoundingClientRect().height);
      drawer.style.minHeight = h > 240 ? h + 'px' : '';
    }
    // Standard and Custom edit the SAME tree, so switching to Custom just shows
    // the builder on the current draft — no seeding/carryover logic needed.
    // `draft` is passed only for explicit "edit applied / load example" flows.
    if (draft) builderDraft = draft;
    else ensureTree();
    cfSelected.clear();
    if (builderEl) builderEl.hidden = false;
    renderBuilder();
    syncFilterViewSwitch();
  }
  // Leaving custom mode just hides the builder — the tree (and thus the Standard
  // clusters) is unchanged; nothing is discarded.
  function closeBuilder() {
    customMode = false;
    if (builderEl) builderEl.hidden = true;
    if (drawer) drawer.style.minHeight = '';
    renderFilterList(); // reflect any tree edits back into the Standard rows
    syncFilterViewSwitch();
  }

  // ---- Example expression (mirrors the requested scenario, on real data) ----
  function cfExampleTree() {
    const mk = (name, op, value) => Object.assign(newCond(), { name, op, value });
    // grp joins its children with one connective (the first child's is ignored)
    const grp = (conn, kids) => { kids.forEach((k, i) => { if (i > 0) k.conn = conn; }); return newGroup(kids); };
    // A host with a different data model supplies its own scenario, otherwise
    // "Load example" builds a CAPA expression that matches nothing.
    if (exampleTree) return exampleTree({ mk, grp });
    return grp('AND', [
      grp('OR', [
        mk('Site', 'Is One Of', ['DEN Plant 1', 'DEN Plant 2']),
        mk('Site', 'Is One Of', ['WPDCG']),
      ]),
      mk('Site', 'Is Not One Of', ['HYD Plant 2']),
      grp('OR', [
        mk('Date Due', 'Is Between', '2026-05-01 – 2026-07-01'),
        mk('Date Due', 'Is Between', '2026-08-01 – 2026-08-20'),
      ]),
      grp('OR', [
        mk('Current Assignee', 'Is One Of', ['EHS Coordinator Team']),
        mk('Current Assignee', 'Is One Of', ['Case Management Team']),
      ]),
    ]);
  }

  // ---- Apply / integrate with the existing UI ----
  function applyCustomFilter(tree) {
    customFilter = cfPrune(tree);
    renderCustomSummary();
    renderResults();
    renderChips();
  }
  function renderCustomSummary() {
    const host = $('[data-custom-summary]');
    if (!host) return;
    if (!customFilter) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    host.innerHTML = `
      <div class="custom-summary__head">
        <span class="material-symbols-rounded" aria-hidden="true">account_tree</span>
        <h3>Custom Filter</h3>
        <span class="custom-summary__count">${cfCountConds(customFilter)} conditions</span>
      </div>
      <div class="custom-summary__expr">${formatExpr(customFilter)}</div>
      <div class="custom-summary__actions">
        <button class="btn btn--secondary" data-action="edit-custom-filter">Edit</button>
        <button class="btn btn--clear" data-action="remove-custom-filter">Remove</button>
      </div>`;
  }

  // ---- Builder interactions (delegated) ----
  // Standard | Custom segmented switch. "custom" folds the current filters into
  // the expression builder; "standard" returns to the accordion list.
  bind('[data-action="set-filter-view"]', 'click', (e, btn) => {
    e.stopPropagation();
    const wantCustom = btn.dataset.view === 'custom';
    if (wantCustom === customMode) return;
    if (wantCustom) openBuilder(); else closeBuilder();
  });
  // Clear = remove field VALUES (expression tree + quick/scope values), keeping
  // which fields are displayed (favorites/quick designations) intact.
  bind('[data-action="cf-clear"]', 'click', () => {
    cfSelected.clear();
    builderDraft = newGroup([]);
    customFilter = null;
    Object.keys(filterState).forEach(k => { resetControlForFilter(k); delete filterState[k]; });
    if (customMode) renderBuilder();  // refresh the builder surface (custom)
    renderFilterList();               // standard rows reflect cleared values
    renderQuickFilters();             // quick cards reflect cleared values
    renderResults();
    renderChips();                    // → updateApplyState re-disables Clear
  });
  bind('[data-action="cf-load-example"]', 'click', () => { cfSelected.clear(); builderDraft = cfExampleTree(); renderBuilder(builderDraft.id); });
  // Footer Apply: custom mode already applies live, so Apply just closes the
  // drawer (standard filters also apply live).
  bind('[data-apply-btn]', 'click', () => { closeDrawer(); });
  bind('[data-action="cf-add-cond"]', 'click', (e, btn) => {
    const g = cfFind(builderDraft, btn.closest('.cf-group')?.dataset.node);
    if (!g) return;
    const c = newCond();
    g.children.push(c);
    renderBuilder(c.id);
  });
  bind('[data-action="cf-add-group"]', 'click', (e, btn) => {
    const g = cfFind(builderDraft, btn.closest('.cf-group')?.dataset.node);
    if (!g) return;
    const child = newGroup([newCond()]);
    g.children.push(child);
    renderBuilder(child.id);
  });
  // Standard mode: add another condition for this field (root-level, AND-joined)
  bind('[data-action="std-add-cond"]', 'click', (e, btn) => {
    e.stopPropagation();
    const name = btn.closest('[data-field-conditions]')?.dataset.fieldConditions;
    const f = name && filterByName[name];
    if (!f) return;
    const c = newCond();
    c.name = f.name;
    c.op = (opsFor(f) || ['Is One Of'])[0];
    ensureTree().children.push(c);
    cfReflect(c.id);
  });
  bind('[data-action="cf-remove-node"]', 'click', (e, btn) => {
    e.stopPropagation();
    const nodeEl = btn.closest('[data-node]');
    const id = nodeEl?.dataset.node;
    if (!id || id === builderDraft?.id) return;
    if (nodeEl.classList.contains('cf-exit')) return; // removal already underway
    nodeEl.classList.add('cf-exit');
    setTimeout(() => { cfSelected.delete(id); cfRemove(builderDraft, id); cfReflect(); }, 140);
  });
  // Remove a single condition from the results-bar chip (prune that tree node)
  bind('[data-action="cf-remove-chip"]', 'click', (e, btn) => {
    e.stopPropagation();
    const id = btn.dataset.node;
    if (!id) return;
    cfRemove(builderDraft, id);
    commitTree();
    renderFilterList();
  });
  bind('[data-action="cf-set-conn"]', 'click', (e, btn) => {
    e.stopPropagation();
    const node = cfFind(builderDraft, btn.dataset.node);
    if (node && node.conn !== btn.dataset.conn) { node.conn = btn.dataset.conn; renderBuilder(); }
  });

  // ---- Select-to-group: check 2+ conditions, then "Group selected" wraps them ----
  bind('[data-action="cf-select"]', 'change', (e, input) => {
    const id = input.closest('[data-node]')?.dataset.node;
    if (!id) return;
    if (input.checked) cfSelected.add(id); else cfSelected.delete(id);
    renderBuilder();
  });
  function cfGroupSelected() {
    if (cfSelected.size < 2 || !builderDraft) return;
    flipReorder(() => {
      const ordered = [];
      (function walk(n) {
        if (n.kind === 'cond') { if (cfSelected.has(n.id)) ordered.push(n); return; }
        n.children.forEach(walk);
      })(builderDraft);
      if (ordered.length < 2) return;
      // Keep the new group near where the first selected root-level item sat
      const rootIdx = ordered.filter(n => cfParent(builderDraft, n.id) === builderDraft)
                             .map(n => builderDraft.children.indexOf(n));
      let insertAt = rootIdx.length ? Math.min(...rootIdx) : builderDraft.children.length;
      ordered.forEach(n => { const par = cfParent(builderDraft, n.id); if (par) par.children = par.children.filter(c => c.id !== n.id); });
      ordered.forEach((n, i) => { if (i === 0) n.conn = 'AND'; }); // first child's connective is ignored
      const grp = newGroup(ordered);
      insertAt = Math.min(Math.max(insertAt, 0), builderDraft.children.length);
      builderDraft.children.splice(insertAt, 0, grp);
      cfSelected.clear();
    });
  }
  bind('[data-action="cf-group-selected"]', 'click', (e) => { e.stopPropagation(); cfGroupSelected(); });

  // ---- Drag-and-drop reordering (desktop; via the row/group drag handle) ----
  if (builderRoot) {
    const clearDropFx = () => builderRoot.querySelectorAll('.cf-drop-before,.cf-drop-after,.cf-dragging')
      .forEach(el => el.classList.remove('cf-drop-before', 'cf-drop-after', 'cf-dragging'));
    builderRoot.addEventListener('dragstart', (e) => {
      const handle = e.target.closest('[data-drag-handle]');
      const row = handle && handle.closest('[data-node]');
      if (!row || row.dataset.node === builderDraft?.id) { e.preventDefault(); return; }
      cfDragId = row.dataset.node;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cfDragId);
      try { e.dataTransfer.setDragImage(row, 16, 16); } catch (_) {}
      row.classList.add('cf-dragging');
    });
    const dropTarget = (e) => {
      const row = e.target.closest('[data-node]');
      if (!row || !cfDragId || row.dataset.node === cfDragId) return null;
      const dragged = cfFind(builderDraft, cfDragId);
      if (dragged && dragged.kind === 'group' && cfFind(dragged, row.dataset.node)) return null; // into self
      const rect = row.getBoundingClientRect();
      return { row, after: (e.clientY - rect.top) > rect.height / 2 };
    };
    builderRoot.addEventListener('dragover', (e) => {
      const t = dropTarget(e);
      if (!t) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      builderRoot.querySelectorAll('.cf-drop-before,.cf-drop-after').forEach(el => el.classList.remove('cf-drop-before', 'cf-drop-after'));
      t.row.classList.add(t.after ? 'cf-drop-after' : 'cf-drop-before');
    });
    builderRoot.addEventListener('drop', (e) => {
      const t = dropTarget(e);
      if (!t) { clearDropFx(); cfDragId = null; return; }
      e.preventDefault();
      const dragId = cfDragId, targetId = t.row.dataset.node, after = t.after;
      clearDropFx(); cfDragId = null;
      flipReorder(() => cfMoveNode(builderDraft, dragId, targetId, after ? 'after' : 'before'));
    });
    builderRoot.addEventListener('dragend', () => { clearDropFx(); cfDragId = null; });
  }

  // Condition pickers
  bind('[data-role="cf-filter"]', 'click', (e, btn) => {
    e.stopPropagation();
    const c = cfFind(builderDraft, btn.closest('[data-node]')?.dataset.node);
    if (!c) return;
    openSearchSelect(btn, ALL_FILTERS.map(f => f.name), c.name, (name) => {
      c.name = name;
      const f = filterByName[name];
      c.op = (opsFor(f) || ['Is One Of'])[0];
      c.value = null;
      renderBuilder(c.id, 'controls');
    });
  });
  bind('[data-role="cf-op"]', 'click', (e, btn) => {
    e.stopPropagation();
    // Read the current node (if any) without materializing, so merely opening
    // the menu on a provisional cluster doesn't create a stray node.
    const host = btn.closest('[data-node],[data-provisional]');
    if (!host) return;
    const existing = host.dataset.node ? cfFind(builderDraft, host.dataset.node) : null;
    const name = existing ? existing.name : host.dataset.filterName;
    if (!name) return; // custom row without a field chosen yet
    const f = filterByName[name];
    const curOp = existing ? existing.op : (opsFor(f) || ['Is One Of'])[0];
    openSelectMenu(btn, opsFor(f) || ['Is One Of'], curOp, (op) => {
      const c = cfResolveNode(btn, true); // materialize provisional on actual pick
      if (!c) return;
      c.op = op;
      c.value = null;
      cfReflect(c.id, 'controls');
    });
  });
  bind('[data-role="cf-value-multi"]', 'click', (e, btn) => {
    e.stopPropagation();
    const c = cfResolveNode(btn, true);
    if (!c) return;
    if (!Array.isArray(c.value)) c.value = c.value ? [c.value] : [];
    const isTreeFilter = !!FILTER_TREES[c.name];
    openMultiSelectMenu(btn, getOptionsForFilter(c.name),
      (opt) => c.value.includes(opt),
      (opt) => {
        if (isTreeFilter) {
          c.value = deptToggle(c.value, opt);
        } else {
          const i = c.value.indexOf(opt);
          if (i >= 0) c.value.splice(i, 1); else c.value.push(opt);
        }
        const lbl = btn.querySelector('span:first-child');
        if (lbl) lbl.textContent = c.value.length === 0 ? 'Select Value(s)' : c.value.length === 1 ? c.value[0] : `${c.value.length} selected`;
        updateBuilderPreview();
        commitTree();
      },
      isTreeFilter ? {
        tree: FILTER_TREES[c.name],
        getState: (opt) => deptState(c.value, opt),
      } : {});
  });
  bind('[data-role="cf-value-text"]', 'input', (e, input) => {
    const c = cfResolveNode(input, true);
    if (!c) return;
    c.value = input.value || null;
    updateBuilderPreview(); // no re-render — keep typing focus
    commitTree();
  });
  bind('[data-role="cf-value-date"]', 'click', (e, btn) => {
    e.stopPropagation();
    const c = cfResolveNode(btn, true);
    if (!c) return;
    let input = btn.querySelector('input[type=date]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'date';
      input.className = 'filter-date__input';
      input.tabIndex = -1;
      btn.appendChild(input);
      input.addEventListener('change', () => {
        if (!input.value) return;
        const lbl = btn.querySelector('span:first-child');
        if (lbl) lbl.textContent = input.value;
        const range = btn.closest('.cf-date-range');
        if (range) {
          const part = (sel) => {
            const t = range.querySelector(`${sel} span:first-child`)?.textContent || '';
            return (t === 'Start Date' || t === 'End Date') ? '…' : t;
          };
          c.value = `${part('[data-range="start"]')} – ${part('[data-range="end"]')}`;
        } else {
          c.value = input.value;
        }
        updateBuilderPreview();
        commitTree();
      });
    }
    if (input.showPicker) input.showPicker();
    else input.focus();
  });

  // Applied-state interactions
  bind('[data-action="edit-custom-filter"]', 'click', (e) => {
    e.stopPropagation();
    if (!drawer.hasAttribute('data-open')) openDrawer();
    openBuilder(customFilter ? cfClone(customFilter) : null);
  });
  bind('[data-action="remove-custom-filter"]', 'click', (e) => {
    e.stopPropagation();
    customFilter = null;
    builderDraft = null;   // fully discard so the next Custom toggle re-seeds
    cfSelected.clear();
    renderCustomSummary();
    renderResults();
    renderChips();
  });

  // =================================================================
  // OPTIONS PANEL — unified display controls (slides over the content)
  /* =================================================================
     PUBLIC API
     ================================================================= */
  function init(opts) {
    opts = opts || {};
    drawer = $('[data-filter-drawer]');
    scrim  = $('[data-drawer-scrim]');
    if (!drawer) return null;                 // page has no filter modal
    if (started) return api;

    RECORDS   = opts.records  || [];
    FIELD_MAP = opts.fieldMap || {};
    TODAY     = opts.today    || new Date();
    onChange  = opts.onChange || null;
    scopeChip = opts.scopeChip || null;   // omitted entirely when the host has no fixed scope
    exampleTree = opts.exampleTree || null;
    if (opts.parseDate) parseDate = opts.parseDate;
    // Swap the value vocabularies for ones that match the host's records, so the
    // menus only ever offer values that can actually match something.
    if (opts.people)      PEOPLE_NAMES    = opts.people.slice();
    if (opts.sites)       SITES           = opts.sites.slice();
    if (opts.tasks)       TASKS           = opts.tasks.slice();
    if (opts.actionTypes) ACTION_TYPES    = opts.actionTypes.slice();
    if (opts.priorities)  PRIORITIES      = opts.priorities.slice();
    if (opts.statuses)    STATUS_OPTS     = opts.statuses.slice();
    if (opts.tree)        DEPARTMENT_TREE = opts.tree.map(d => ({ name: d.name, children: (d.children || []).slice() }));
    rebuildVocab();
    // anything else the host wants to override outright, by field name
    if (opts.options) Object.assign(FILTER_OPTIONS, opts.options);
    // v1.5 is modal-only; the centered-modal rules are gated on this attribute.
    // Owned here so a host page can't forget it (it can still pre-set its own).
    if (!document.documentElement.hasAttribute('data-filter-mode')) {
      document.documentElement.setAttribute('data-filter-mode', 'modal');
    }
    if (opts.defaultFavorites) {
      DEFAULT_FAVS = opts.defaultFavorites.slice();
      favOrder = [...DEFAULT_FAVS];
      favSet.clear(); DEFAULT_FAVS.forEach(n => favSet.add(n));
    }
    if (opts.defaultQuick) {
      DEFAULT_QUICK = opts.defaultQuick.slice();
      quickOrder = [...DEFAULT_QUICK];
      quickSet.clear(); DEFAULT_QUICK.forEach(n => quickSet.add(n));
    }

    boot();
    started = true;
    return api;
  }

  const api = {
    init,
    // recompute against a (possibly new) record set — e.g. after the host
    // re-sorts or the underlying data changes
    setRecords(rows) { RECORDS = rows || []; renderResults(); return api; },
    apply(rows) { return (rows || RECORDS).filter(matchesFilters); },
    get state() { return { filterState: { ...filterState }, customFilter }; },
    clearAll() { const b = $('[data-action="clear-all"]'); if (b) b.click(); return api; },
    open()  { openDrawer();  return api; },
    close() { closeDrawer(); return api; },
    // registries, so a host can build its own field map against the real catalog
    FILTERS: ALL_FILTERS,
  };
  return api;
})();
