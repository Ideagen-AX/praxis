/* ============================================================================
   Praxis Mazlan drawer — shared component
   ============================================================================
   Right-side overlay opened from the app-bar Mazlan trigger ('.appbar__mazlan').
   Persona-aware suggestion cards + a chat surface with simulated Mazlan replies.

   This is a prototype surface, not a real LLM integration — the responses are
   canned and demo-friendly, scoped to demonstrate the interaction model.

   PER-PAGE CONFIG (optional): set window.MAZLAN_CONFIG before the drawer opens:
     window.MAZLAN_CONFIG = {
       greeting: 'Hi Marcus, what can I help you with today?',
       suggestions: [ { icon, cat, text, reply, action? }, ... ],
       scope: 'Global'
     };
   Config is read lazily on each open, so a host page can refresh it (e.g. on
   the trigger click) to keep the greeting + suggestions current. Missing keys
   fall back to a generic greeting and a small default suggestion set.

   The component references NO host-page globals directly. It uses window.announce
   when present, and optionally window.openAgentic / window.closeDetailPanel when
   those exist on the host page.
*/
(function () {
  'use strict';

  let mazlanDrawerOpen = false;
  let mazlanDrawerHasMessages = false;
  let mazlanPrevFocus = null;

  /* Category → icon tint color (matches Mazlan Builder palette). Generic. */
  const MAZLAN_CAT_COLORS = {
    Resume: 'teal',
    Create: 'pink',
    Search: 'blue',
    Workspace: 'purple',
    Reports: 'orange',
    Admin: 'green'
  };

  /* Fallback suggestions when window.MAZLAN_CONFIG.suggestions is absent. */
  const MAZLAN_DEFAULT_SUGGESTIONS = [
    { cat: 'Resume',  icon: 'play_circle', text: 'Pick Up Where I Left Off', reply: 'Resuming your most recent draft. Want me to open it, or summarize what\'s left?' },
    { cat: 'Create',  icon: 'note_add',    text: 'Start Something New',       reply: 'I can draft that for you — tell me what you need and I\'ll pre-fill the details.' },
    { cat: 'Search',  icon: 'search',      text: 'Find a Record',             reply: 'Tell me what you\'re looking for and I\'ll search across your records.' },
    { cat: 'Reports', icon: 'description', text: 'Brief Me on This Week',      reply: 'Here\'s a quick brief on this week\'s activity. Want me to go deeper on any item?' }
  ];

  const DEFAULT_GREETING = 'Hi, what can I help you with today?';

  /* ---- Host-safe helpers ------------------------------------------------ */
  function mzAnnounce(message) {
    if (typeof window.announce === 'function') window.announce(message);
  }
  function mzEscapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function mzTrigger() {
    return document.querySelector('.appbar__mazlan');
  }
  function mzGetSuggestions() {
    const c = window.MAZLAN_CONFIG;
    if (c && Array.isArray(c.suggestions) && c.suggestions.length) return c.suggestions;
    return MAZLAN_DEFAULT_SUGGESTIONS;
  }
  function mzGetGreeting() {
    const c = window.MAZLAN_CONFIG;
    return (c && c.greeting) ? c.greeting : DEFAULT_GREETING;
  }

  /* ---- Menu sub-drawer -------------------------------------------------- */
  function setMazlanMenuOpen(open) {
    const drawer = document.getElementById('mazlan-drawer');
    const menuBtn = document.getElementById('mazlan-menu-btn');
    if (!drawer) return;
    drawer.classList.toggle('mazlan-drawer--menu-open', !!open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    const menu = document.getElementById('mazlan-menu');
    if (menu) menu.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  /* ---- Open / close ----------------------------------------------------- */
  function openMazlanDrawer() {
    const drawer = document.getElementById('mazlan-drawer');
    const scrim = document.getElementById('mazlan-scrim');
    if (!drawer) return;
    /* Mutual exclusion — close the detail panel if the host page has one. */
    if (typeof window.closeDetailPanel === 'function') {
      const dd = document.getElementById('detail-drawer');
      if (dd && !dd.hidden) window.closeDetailPanel();
    }
    mazlanPrevFocus = document.activeElement;
    drawer.hidden = false;
    if (scrim) scrim.hidden = false;
    renderMazlanSuggestions();
    /* Greeting comes from the per-page config (falls back to a generic line). */
    const greetEl = document.getElementById('mazlan-welcome-greeting');
    if (greetEl) greetEl.textContent = mzGetGreeting();
    /* Animate in on next frame so the initial transform applies */
    requestAnimationFrame(() => {
      drawer.classList.add('mazlan-drawer--open');
      if (scrim) scrim.classList.add('mazlan-scrim--open');
    });
    mazlanDrawerOpen = true;
    mzTrigger()?.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.getElementById('mazlan-drawer-textarea')?.focus(), 100);
    mzAnnounce('Mazlan opened');
  }

  function closeMazlanDrawer() {
    const drawer = document.getElementById('mazlan-drawer');
    const scrim = document.getElementById('mazlan-scrim');
    if (!drawer) return;
    drawer.classList.remove('mazlan-drawer--open');
    if (scrim) scrim.classList.remove('mazlan-scrim--open');
    /* Wait for the slide-out before hiding from layout */
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = isReducedMotion ? 0 : 250;
    setTimeout(() => {
      drawer.hidden = true;
      if (scrim) scrim.hidden = true;
    }, delay);
    mazlanDrawerOpen = false;
    mzTrigger()?.setAttribute('aria-expanded', 'false');
    if (mazlanPrevFocus && mazlanPrevFocus.focus) mazlanPrevFocus.focus();
  }

  /* ---- Suggestions ------------------------------------------------------ */
  function renderMazlanSuggestions() {
    /* Suggestions are hidden as soon as the user starts a conversation OR
       begins typing in the input. They live in the footer above the input. */
    const sec = document.getElementById('mazlan-suggestions');
    if (!sec) return;
    if (mazlanDrawerHasMessages) { sec.hidden = true; return; }
    sec.hidden = false;
    /* Header row (label + shuffle + "See all assistants"), built once above
       the card grid — mirrors the prototype's .welcome-view-all row. */
    if (!sec.querySelector('.mazlan-suggestions__head')) {
      const head = document.createElement('div');
      head.className = 'mazlan-suggestions__head';
      head.innerHTML =
        '<span class="mazlan-suggestions__label">A few ways I can help</span>' +
        '<button class="mazlan-suggestions__shuffle" type="button" aria-label="Show other options" title="Shuffle"><span class="material-symbols-rounded">shuffle</span></button>' +
        '<button class="mazlan-suggestions__seeall" type="button">See all assistants<span class="material-symbols-rounded">chevron_right</span></button>';
      sec.insertBefore(head, sec.firstChild);
      head.querySelector('.mazlan-suggestions__shuffle').addEventListener('click', function () {
        const btn = head.querySelector('.mazlan-suggestions__shuffle');
        btn.classList.remove('is-spinning'); void btn.offsetWidth; btn.classList.add('is-spinning');
        const g = document.getElementById('mazlan-suggestions-grid');
        if (g) Array.prototype.slice.call(g.children).sort(function () { return Math.random() - 0.5; }).forEach(function (c) { g.appendChild(c); });
      });
      head.querySelector('.mazlan-suggestions__seeall').addEventListener('click', function () {
        const mb = document.getElementById('mazlan-menu-btn'); if (mb) mb.click();
      });
    }
    const grid = document.getElementById('mazlan-suggestions-grid');
    if (!grid) return;
    const suggestions = mzGetSuggestions();
    grid.innerHTML = suggestions.map((s, i) => {
      const tint = MAZLAN_CAT_COLORS[s.cat] || 'teal';
      return `
        <button class="mazlan-sugg" type="button" data-sugg-idx="${i}">
          <span class="mazlan-sugg__icon mazlan-sugg__icon--${tint}" aria-hidden="true">
            <span class="material-symbols-rounded">${s.icon}</span>
          </span>
          <span class="mazlan-sugg__title">${mzEscapeHtml(s.text)}</span>
        </button>
      `;
    }).join('');
    grid.querySelectorAll('[data-sugg-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.suggIdx);
        handleMazlanSuggestion(suggestions[idx]);
      });
    });
  }

  /* Show/hide the suggestion grid based on textarea content. Once the user
     starts typing, the grid vanishes; if they clear the textarea (and haven't
     sent anything yet), it returns. */
  function updateMazlanSuggestionsForTyping() {
    if (mazlanDrawerHasMessages) return;  /* already hidden permanently */
    const textarea = document.getElementById('mazlan-drawer-textarea');
    const sec = document.getElementById('mazlan-suggestions');
    if (!textarea || !sec) return;
    sec.hidden = textarea.value.trim().length > 0;
  }

  /* Single primary button — icon transforms between mic (voice) and send
     (submit) based on textarea content. Same button identity throughout. */
  function updateMazlanSendButton() {
    const textarea = document.getElementById('mazlan-drawer-textarea');
    const btn = document.getElementById('mazlan-primary-btn');
    const icon = document.getElementById('mazlan-primary-icon');
    if (!textarea || !btn || !icon) return;
    const hasText = textarea.value.trim().length > 0;
    icon.textContent = hasText ? 'send' : 'mic';
    btn.setAttribute('aria-label', hasText ? 'Send message' : 'Voice to text');
    btn.dataset.mode = hasText ? 'send' : 'voice';
  }

  function handleMazlanSuggestion(sugg) {
    /* Treat a suggestion click as if the user sent that message, with the
       pre-canned Mazlan reply queued up. */
    appendMazlanMessage('user', sugg.text);
    showMazlanTyping();
    setTimeout(() => {
      hideMazlanTyping();
      /* Some suggestions offer an action that kicks off a full agentic task.
         The reply presents the action — the user decides when to start it. */
      let actions = null;
      if (sugg.action === 'agentic-boeing') {
        actions = [{ label: 'Start audit-prep', icon: 'arrow_forward', primary: true, act: 'agentic-boeing' }];
      } else if (sugg.cat === 'Workspace') {
        actions = [{ label: 'Apply', icon: 'check', primary: true }, { label: 'Cancel', icon: 'close' }];
      }
      appendMazlanMessage('mazlan', sugg.reply, actions);
    }, 700);
  }

  function appendMazlanMessage(role, text, actions) {
    const thread = document.getElementById('mazlan-thread');
    if (!thread) return;
    /* Once a real message exists, retire the suggestion grid so the convo
       surface owns the space. */
    if (!mazlanDrawerHasMessages) {
      mazlanDrawerHasMessages = true;
      const sugg = document.getElementById('mazlan-suggestions');
      if (sugg) sugg.hidden = true;
      /* Hide the centered welcome landing — the thread surface owns the body now */
      const welcome = document.getElementById('mazlan-welcome');
      if (welcome) welcome.setAttribute('aria-hidden', 'true');
    }
    const msg = document.createElement('div');
    msg.className = `mazlan-msg mazlan-msg--${role}`;
    const renderedText = renderMazlanMarkdown(text);
    msg.innerHTML = `
      <span class="mazlan-msg__who">${role === 'user' ? 'You' : 'Mazlan'}</span>
      <div class="mazlan-msg__bubble">${renderedText}</div>
      ${actions ? `<div class="mazlan-msg__actions">${actions.map(a => `
        <button class="mazlan-msg__action" type="button">
          <span class="material-symbols-rounded">${a.icon}</span>
          ${mzEscapeHtml(a.label)}
        </button>`).join('')}</div>` : ''}
    `;
    thread.appendChild(msg);
    /* Wire any inline action that carries an `act` id (e.g. launch an agentic
       task). Decorative actions (Apply/Cancel) have no `act` and stay inert. */
    if (actions) {
      msg.querySelectorAll('.mazlan-msg__action').forEach((btn, i) => {
        const a = actions[i];
        if (a && a.act === 'agentic-boeing' && typeof window.openAgentic === 'function') {
          btn.addEventListener('click', () => { closeMazlanDrawer(); window.openAgentic(); });
        }
      });
    }
    /* Scroll to the new message */
    const body = document.getElementById('mazlan-drawer-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  /* Minimal markdown — only **bold** is supported in the demo replies. Escaped first. */
  function renderMazlanMarkdown(text) {
    const escaped = mzEscapeHtml(text);
    return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  function showMazlanTyping() {
    const thread = document.getElementById('mazlan-thread');
    if (!thread) return;
    const typing = document.createElement('div');
    typing.id = 'mazlan-typing';
    typing.className = 'mazlan-msg mazlan-msg--mazlan';
    typing.innerHTML = `
      <span class="mazlan-msg__who">Mazlan</span>
      <div class="mazlan-typing" aria-label="Mazlan is thinking">
        <span class="mazlan-typing__dot"></span>
        <span class="mazlan-typing__dot"></span>
        <span class="mazlan-typing__dot"></span>
      </div>
    `;
    thread.appendChild(typing);
    const body = document.getElementById('mazlan-drawer-body');
    if (body) body.scrollTop = body.scrollHeight;
  }

  function hideMazlanTyping() {
    document.getElementById('mazlan-typing')?.remove();
  }

  function handleMazlanSubmit(e) {
    e.preventDefault();
    const textarea = document.getElementById('mazlan-drawer-textarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return;
    appendMazlanMessage('user', text);
    textarea.value = '';
    textarea.style.height = '';
    showMazlanTyping();
    /* Canned generic reply — a real integration would route to the agent. */
    setTimeout(() => {
      hideMazlanTyping();
      appendMazlanMessage('mazlan', `Working on **"${text}"** — I'd look across your records, draft what's needed, and bring it back for you to confirm. (Prototype response — the live integration would route this to the agent.)`);
    }, 800);
  }

  /* Auto-grow the textarea up to its max-height, then it scrolls. */
  function autoGrowMazlanTextarea() {
    const t = document.getElementById('mazlan-drawer-textarea');
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 140) + 'px';
  }

  function wireMazlanDrawerControls() {
    const drawer = document.getElementById('mazlan-drawer');
    if (!drawer) return;  /* no drawer on this page — nothing to wire */

    mzTrigger()?.addEventListener('click', () => {
      mazlanDrawerOpen ? closeMazlanDrawer() : openMazlanDrawer();
    });
    document.getElementById('mazlan-drawer-close')?.addEventListener('click', closeMazlanDrawer);
    document.getElementById('mazlan-scrim')?.addEventListener('click', closeMazlanDrawer);
    /* Menu open / close */
    document.getElementById('mazlan-menu-btn')?.addEventListener('click', () => {
      const isOpen = drawer.classList.contains('mazlan-drawer--menu-open');
      setMazlanMenuOpen(!isOpen);
    });
    document.getElementById('mazlan-menu-close')?.addEventListener('click', () => setMazlanMenuOpen(false));
    /* Menu item clicks — placeholder for prototype */
    document.querySelectorAll('[data-menu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset.menu;
        const labels = { newchat: 'New chat', chats: 'Chats', library: 'Library', explore: 'Explore', settings: 'Settings' };
        mzAnnounce(`${labels[item] || 'Menu'} (prototype placeholder)`);
        if (item === 'newchat') {
          /* Reset the conversation */
          const thread = document.getElementById('mazlan-thread');
          if (thread) thread.innerHTML = '';
          mazlanDrawerHasMessages = false;
          const welcome = document.getElementById('mazlan-welcome');
          if (welcome) welcome.setAttribute('aria-hidden', 'false');
          const sec = document.getElementById('mazlan-suggestions');
          if (sec) sec.hidden = false;
          renderMazlanSuggestions();
        }
        setMazlanMenuOpen(false);
      });
    });
    /* Pinned + Recents section toggles */
    document.querySelectorAll('.mazlan-menu__section-head').forEach(btn => {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        const list = btn.nextElementSibling;
        if (list) list.style.display = expanded ? 'none' : '';
      });
    });
    document.getElementById('mazlan-drawer-form')?.addEventListener('submit', handleMazlanSubmit);

    /* Enter to send, Shift+Enter for newline. Input event drives suggestion
       visibility, send-button enabled state, and textarea auto-grow. */
    const textarea = document.getElementById('mazlan-drawer-textarea');
    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          if (textarea.value.trim().length === 0) return;
          handleMazlanSubmit(e);
        }
      });
      textarea.addEventListener('input', () => {
        autoGrowMazlanTextarea();
        updateMazlanSendButton();
        updateMazlanSuggestionsForTyping();
      });
    }

    /* Toolbar buttons — placeholder handlers. */
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        const labels = {
          attach:   'Attach file or photo (prototype placeholder)',
          photo:    'Take photo (prototype placeholder)',
          record:   'Record a clip (prototype placeholder)',
          dictate:  'Voice-to-text dictation (prototype placeholder)',
          voice:    'Voice input mode (prototype placeholder)'
        };
        mzAnnounce(labels[tool] || 'Tool clicked');
        /* Close the plus dropdown after a menu item is chosen */
        if (['attach', 'photo', 'record'].includes(tool)) {
          const dd = document.getElementById('mazlan-plus-dropdown');
          const btnEl = document.getElementById('mazlan-plus-btn');
          if (dd) dd.hidden = true;
          if (btnEl) btnEl.setAttribute('aria-expanded', 'false');
        }
      });
    });
    /* + plus button — opens the attachment dropdown */
    const plusBtn = document.getElementById('mazlan-plus-btn');
    const plusDd  = document.getElementById('mazlan-plus-dropdown');
    if (plusBtn && plusDd) {
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !plusDd.hidden;
        plusDd.hidden = isOpen;
        plusBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
      document.addEventListener('click', (e) => {
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        if (path.includes(plusBtn) || path.includes(plusDd)) return;
        plusDd.hidden = true;
        plusBtn.setAttribute('aria-expanded', 'false');
      });
    }
    /* Scope picker — placeholder (would open a scope dropdown in production) */
    const scopeBtn = document.getElementById('mazlan-scope-btn');
    if (scopeBtn) {
      scopeBtn.addEventListener('click', () => {
        mzAnnounce('Scope picker (prototype placeholder)');
      });
    }
    /* Primary button — sends when textarea has text, otherwise starts voice input. */
    const primaryBtn = document.getElementById('mazlan-primary-btn');
    if (primaryBtn) {
      primaryBtn.addEventListener('click', (e) => {
        if (primaryBtn.dataset.mode === 'send') {
          handleMazlanSubmit(e);
        } else {
          mzAnnounce('Voice input (prototype placeholder)');
        }
      });
    }

    /* "Open full" — the full-page Mazlan experience lives in an adjacent project.
       This is a placeholder that just announces; swap to a real href when the
       adjacent project ships. */
    document.getElementById('mazlan-open-full')?.addEventListener('click', () => {
      mzAnnounce('Opening the full Mazlan experience — this links to the adjacent project when it ships.');
    });

    /* Esc closes the drawer */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mazlanDrawerOpen) {
        e.preventDefault();
        closeMazlanDrawer();
      }
    });
  }

  /* Self-initialize once the DOM is ready. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireMazlanDrawerControls);
  } else {
    wireMazlanDrawerControls();
  }

  /* Expose the open/close API for host pages that want to trigger it directly. */
  window.openMazlanDrawer = openMazlanDrawer;
  window.closeMazlanDrawer = closeMazlanDrawer;
})();
