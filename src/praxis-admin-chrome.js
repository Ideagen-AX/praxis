/* =====================================================================
   PRAXIS ADMIN CHROME — shared app-header / nav-rail interactivity for every
   admin page. Because all ten admin pages emit an identical shell with the
   same `ad-` element IDs, this single file wires the global chrome on all of
   them: Create New flyout, search module selector, Dashboards popout, search
   suggestions, and the Mazlan drawer. Ported from the record page so behaviour
   matches app-wide. Depends on praxis-create-new.js (CREATE_CATALOG data).
   Loaded after praxis-create-new.js. (appswitch / profile / theme / side-nav
   filter stay in each page's small inline script.)
   ===================================================================== */
(function(){
  function isPraxis(){ return document.body.dataset.variant === 'praxis'; }

  /* ---- generic anchored popover (create-new, dashboards) ---- */
  function wirePopover(btnId, popId, opts){
    var btn = document.getElementById(btnId), pop = document.getElementById(popId);
    if(!btn || !pop) return;
    opts = opts || {};
    var scrim = opts.scrimId ? document.getElementById(opts.scrimId) : null;
    var lift  = opts.lift ? document.querySelector(opts.lift) : null;
    function open(){ pop.hidden = false; if(scrim) scrim.hidden = false; if(lift) lift.style.zIndex = '131'; btn.setAttribute('aria-expanded','true'); }
    function close(){ pop.hidden = true; if(scrim) scrim.hidden = true; if(lift) lift.style.zIndex = ''; btn.setAttribute('aria-expanded','false'); }
    btn.addEventListener('click', function(e){ if(!isPraxis()) return; e.stopPropagation(); if(pop.hidden) open(); else close(); });
    pop.addEventListener('click', function(e){ e.stopPropagation(); });
    document.addEventListener('click', function(){ if(!pop.hidden) close(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape' && !pop.hidden){ close(); btn.focus(); } });
    return { open:open, close:close, isOpen:function(){ return !pop.hidden; } };
  }

  /* 1 · Create New menu — shared flyout (opens right of the nav rail). */
  (function(){
    var pop = document.getElementById('ad-create-pop');
    if(!pop || typeof CREATE_CATALOG === 'undefined') return;
    var content = document.getElementById('ad-cn-content');
    var findInput = document.getElementById('ad-cn-filter');
    var tab = 'shortcuts', filter = '';
    function itemHtml(i){ return '<button class="cn-item" type="button" data-cn-create="'+i.id+'">'
      + '<span class="cn-item__icon"><span class="material-symbols-rounded">'+i.icon+'</span></span>'
      + '<span class="cn-item__label">'+i.label+'</span></button>'; }
    function groupHtml(g,items){ return items.length ? '<div class="cn-group cn-group--'+g.tone+'">'
      + '<div class="cn-group__head"><span class="cn-group__icon"><span class="material-symbols-rounded">'+g.icon+'</span></span>'
      + '<span class="cn-group__title">'+g.group+'</span></div>'
      + '<div class="cn-grid">'+items.map(itemHtml).join('')+'</div></div>' : ''; }
    function render(){
      var f = filter.trim().toLowerCase();
      if(tab === 'shortcuts'){
        content.innerHTML = CREATE_CATALOG.map(function(g){ return groupHtml(g, g.items.filter(function(i){
          return CN_SHORTCUTS.indexOf(i.id) >= 0 && (!f || i.label.toLowerCase().indexOf(f) >= 0); })); }).join('')
          || '<p class="cn-manage-note">No shortcuts match “'+filter+'”.</p>';
      } else if(tab === 'all'){
        content.innerHTML = CREATE_CATALOG.map(function(g){ return groupHtml(g, g.items.filter(function(i){
          return !f || i.label.toLowerCase().indexOf(f) >= 0 || g.group.toLowerCase().indexOf(f) >= 0; })); }).join('');
      } else {
        content.innerHTML = '<div class="cn-tpl-list">'+CN_TEMPLATES.map(function(t){ return '<button class="cn-tpl cn-group--'+(t.tone||'purple')+'" type="button" data-cn-create="tpl">'
          + '<span class="cn-tpl__icon"><span class="material-symbols-rounded">'+t.icon+'</span></span>'
          + '<span class="cn-tpl__body"><span class="cn-tpl__name">'+t.label+'</span>'
          + '<span class="cn-tpl__meta">Based on '+(t.type||'a record')+' · '+(t.sub||'pre-filled')+'</span></span></button>'; }).join('')
          + '</div><p class="cn-manage-note">Templates are record types your team has partially filled out — pick one to start ahead.</p>';
      }
    }
    var api = wirePopover('ad-create-btn','ad-create-pop',{scrimId:'ad-cn-scrim', lift:'.ehsq-navrail'});
    if(!api) return;
    document.getElementById('ad-create-btn').addEventListener('click', function(){
      if(!api.isOpen()) return;
      tab = 'shortcuts'; filter = ''; findInput.value = '';
      pop.classList.remove('cn-flyout--wide');
      pop.querySelectorAll('.cn-seg__btn').forEach(function(b){ b.classList.toggle('cn-seg__btn--active', b.dataset.cnTab === 'shortcuts'); });
      render(); setTimeout(function(){ findInput.focus(); }, 60);
    });
    pop.querySelectorAll('.cn-seg__btn').forEach(function(b){ b.addEventListener('click', function(){
      tab = b.dataset.cnTab;
      pop.querySelectorAll('.cn-seg__btn').forEach(function(x){ x.classList.toggle('cn-seg__btn--active', x === b); });
      pop.classList.toggle('cn-flyout--wide', tab === 'all');
      render();
    }); });
    findInput.addEventListener('input', function(e){ filter = e.target.value; render(); });
    document.getElementById('ad-cn-close').addEventListener('click', api.close);
    content.addEventListener('click', function(e){ if(e.target.closest('[data-cn-create]')) api.close(); });
    render();
  })();

  /* 2 · Dashboards / workspaces popout (opens right of the nav rail). */
  (function(){
    var api = wirePopover('ad-dash-btn','ad-dash-pop',{scrimId:'ad-dash-scrim', lift:'.ehsq-navrail'});
    if(!api) return;
    document.querySelectorAll('#ad-dash-pop .ws-item').forEach(function(i){
      i.addEventListener('click', function(){ if(i.tagName !== 'A'){ /* static demo entries */ } api.close(); });
    });
  })();

  /* 3 · Search module selector — typeable multi-select scope picker. */
  (function(){
    var trigger = document.getElementById('ad-msel');
    var input   = document.getElementById('ad-msel-input');
    var menu    = document.getElementById('ad-msel-menu');
    var list    = document.getElementById('ad-msel-list');
    var filterInput = document.getElementById('ad-msel-filter');
    var scrim   = document.getElementById('ad-msel-scrim');
    if(!trigger || typeof CREATE_CATALOG === 'undefined') return;
    var searchEl = trigger.closest('.appbar__search');
    var selected = new Set(), filter = '', open = false;

    function summary(){
      if(!selected.size) return 'All';
      var names = [];
      selected.forEach(function(id){ if(CN_INDEX[id]) names.push(CN_INDEX[id].label); });
      return names.length <= 1 ? names.join('') : names[0] + ' +' + (names.length - 1);
    }
    function itemHtml(i){
      var sel = selected.has(i.id);
      return '<button class="cn-item' + (sel ? ' is-sel' : '') + '" type="button" role="option" aria-selected="' + sel + '" data-msel="' + i.id + '">'
        + '<span class="cn-item__icon"><span class="material-symbols-rounded">' + i.icon + '</span></span>'
        + '<span class="cn-item__label">' + i.label + '</span>'
        + '<span class="cn-item__check material-symbols-rounded">check</span></button>';
    }
    function render(){
      var f = filter.trim().toLowerCase();
      var html = '';   // module rows only — an empty selection already means All
      var groups = CREATE_CATALOG.map(function(g){
        var items = g.items.filter(function(i){ return !f || i.label.toLowerCase().indexOf(f) >= 0 || g.group.toLowerCase().indexOf(f) >= 0; });
        if(!items.length) return '';
        return '<div class="cn-group cn-group--' + g.tone + '">'
          + '<div class="cn-group__head"><span class="cn-group__icon"><span class="material-symbols-rounded">' + g.icon + '</span></span>'
          + '<span class="cn-group__title">' + g.group + '</span></div>'
          + '<div class="cn-grid">' + items.map(itemHtml).join('') + '</div></div>';
      }).join('');
      list.innerHTML = html + (groups ? '<div class="msel__groups">' + groups + '</div>' : '<p class="msel__empty">No modules match “' + filter + '”.</p>');
    }
    function syncInput(){ input.value = summary(); }
    function positionMenu(){
      if(!searchEl) return;
      var r = searchEl.getBoundingClientRect();
      menu.style.left = r.left + 'px';
      menu.style.top = (r.bottom + 10) + 'px';
      menu.style.width = r.width + 'px';
    }
    function openMenu(){
      if(open) return;
      open = true; positionMenu(); menu.hidden = false; if(scrim) scrim.hidden = false; trigger.classList.add('is-open');
      input.setAttribute('aria-expanded','true');
      filter = ''; filterInput.value = ''; render(); filterInput.focus();
    }
    function closeMenu(){
      if(!open) return;
      open = false; menu.hidden = true; if(scrim) scrim.hidden = true; trigger.classList.remove('is-open');
      input.setAttribute('aria-expanded','false'); filter = '';
    }
    window.addEventListener('resize', function(){ if(open) positionMenu(); });
    trigger.addEventListener('click', function(e){ if(menu.contains(e.target)) return; if(open) closeMenu(); else openMenu(); });
    input.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '||e.key==='ArrowDown'){ e.preventDefault(); if(!open) openMenu(); } });
    filterInput.addEventListener('input', function(){ filter = filterInput.value; render(); });
    filterInput.addEventListener('click', function(e){ e.stopPropagation(); });
    menu.addEventListener('click', function(e){
      e.stopPropagation();
      var it = e.target.closest('[data-msel]'); if(!it) return; var id = it.dataset.msel; if(selected.has(id)) selected.delete(id); else selected.add(id);
      syncInput(); render(); filterInput.focus();
    });
    document.addEventListener('click', function(e){ if(open && !trigger.contains(e.target) && !menu.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape' && open){ closeMenu(); } });
    syncInput();
  })();

  /* 4 · Search suggestions + navigation to the Search page. */
  (function(){
    var input = document.getElementById('ad-search-input'), pop = document.getElementById('ad-search-pop');
    function go(){ window.location.href = 'search-page.html'; }
    var sbtn = document.querySelector('.appbar__search .appbar__search-btn');
    if(sbtn) sbtn.addEventListener('click', function(e){ e.preventDefault(); go(); });
    if(!input || !pop){ if(input) input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); go(); } }); return; }
    var rows = [].slice.call(pop.querySelectorAll('.ss-row'));
    var secs = [].slice.call(pop.querySelectorAll('[data-ss-sec]'));
    var empty = document.getElementById('ad-search-empty');
    var orig = {}; rows.forEach(function(r,i){ orig[i] = r.querySelector('.ss-row__t').textContent; });
    function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function open(){ if(!isPraxis()) return; pop.hidden = false; input.setAttribute('aria-expanded','true'); filt(); }
    function close(){ pop.hidden = true; input.setAttribute('aria-expanded','false'); }
    function filt(){
      var q = input.value.trim().toLowerCase(), any = false;
      rows.forEach(function(r,i){
        var text = orig[i], t = text.toLowerCase(), tEl = r.querySelector('.ss-row__t');
        if(!q){ tEl.innerHTML = esc(text); r.hidden = false; any = true; return; }
        var idx = t.indexOf(q);
        if(idx === -1){ r.hidden = true; return; }
        r.hidden = false; any = true;
        tEl.innerHTML = esc(text.slice(0,idx)) + '<mark>' + esc(text.slice(idx,idx+q.length)) + '</mark>' + esc(text.slice(idx+q.length));
      });
      secs.forEach(function(s){ var vis = s.querySelectorAll('.ss-row:not([hidden])').length; s.style.display = vis ? '' : 'none'; });
      if(empty) empty.hidden = any;
    }
    input.addEventListener('focus', open);
    input.addEventListener('input', function(){ if(pop.hidden) open(); else filt(); });
    rows.forEach(function(r){ r.addEventListener('mousedown', function(e){ e.preventDefault(); input.value = r.dataset.ssText; close(); input.focus(); }); });
    input.addEventListener('blur', function(){ setTimeout(close, 120); });
    document.addEventListener('click', function(e){ if(!pop.hidden && !e.target.closest('.appbar__search')) close(); });
    input.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); close(); go(); } if(e.key==='Escape' && !pop.hidden){ close(); } });
  })();

  /* Mazlan drawer is now the shared praxis-mazlan.js component (self-wires
     .appbar__mazlan + #mazlan-drawer). No admin-specific wiring needed. */
})();
