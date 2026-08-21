/* ============================================================================
   praxis-toast.js — the transient confirmation, in one place.

   "Link copied", "Workspace saved", "3 records exported". A line of text at the
   bottom of the window that says an action landed, then leaves.

   Promoted from the groom-lake prototype on 2026-08-21, where four pages each
   carried a private toast() closure — same shape, same 1.9 seconds, four
   copies of a 20-line cssText string, and no two agreeing on whether the thing
   announced itself to a screen reader. Consolidating it is the point: a
   confirmation is a system-level behaviour, and an application should not be
   able to have four of them.

   Load with a single tag before </body>:
     <script src="praxis-toast.js"></script>
   then call it from anywhere:
     praxisToast('Workspace saved');
     praxisToast('Could not save', { tone: 'danger', duration: 4000 });

   WHY THE CSS IS IN HERE AND NOT IN A SHEET

   Same argument as praxis-lucide.js. A toast has no markup until it fires, so a
   consumer who loads the script and forgets the stylesheet gets an unstyled
   line of text at a moment they cannot rehearse — the failure appears in
   production, on the success path, once. One tag cannot be half-installed.

   ACCESSIBILITY

   role="status" on a live region that exists BEFORE the message goes into it.
   Screen readers watch a region for changes; creating the element and its text
   in the same frame is the reliable way to have the announcement dropped, which
   is what three of the four copies did. The region is created once at load, and
   each toast is a child appended to it.

   The message is never the only report of what happened. A toast is unreadable
   to anyone who was not looking at that corner, gone before a screen magnifier
   reaches it, and absent entirely to a keyboard user two tab stops away — so
   the state it describes has to be visible somewhere permanent as well.
   ========================================================================= */
(function () {
  'use strict';

  var REGION_ID = 'praxis-toast-region';
  var STYLE_ID = 'praxis-toast-style';
  var DEFAULT_MS = 1900;

  var CSS = [
    /* The region is a bottom-centred column, not a single node: two actions in
       quick succession stack rather than replace each other mid-read. It never
       takes pointer events — a toast covering the control you just used is the
       one thing this pattern must not do. */
    '#' + REGION_ID + '{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);',
    '  z-index:400;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;}',
    '.praxis-toast{max-width:min(92vw,520px);padding:10px 16px;border-radius:var(--praxis-radius-sm,8px);',
    '  background:var(--praxis-color-neutral-90,#2a3846);color:var(--praxis-color-white,#fff);',
    '  font-family:inherit;font-size:.875rem;font-weight:600;line-height:1.4;text-align:center;',
    '  box-shadow:var(--px-overlay,0 10px 15px rgba(32,42,53,.18));',
    '  opacity:0;transform:translateY(6px);}',
    /* Danger keeps the same shape and swaps the fill: a failure that looked
       identical to a success was the reason this variant exists. */
    '.praxis-toast--danger{background:var(--praxis-color-red-70,#a32020);}',
    '.praxis-toast--success{background:var(--praxis-color-green-70,#1d6b3f);}',
    '@media (prefers-reduced-motion: no-preference){',
    '  .praxis-toast{transition:opacity 180ms ease,transform 180ms ease;}',
    '}',
    '.praxis-toast.is-in{opacity:1;transform:none;}'
  ].join('\n');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function region() {
    var el = document.getElementById(REGION_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = REGION_ID;
    /* status, not alert: this is a confirmation, and alert interrupts whatever
       the user is reading. polite queues it behind the current utterance. */
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }

  function toast(message, opts) {
    if (!message) return null;
    opts = opts || {};
    injectStyle();

    var node = document.createElement('div');
    node.className = 'praxis-toast' + (opts.tone ? ' praxis-toast--' + opts.tone : '');
    node.textContent = message;
    region().appendChild(node);

    /* Two frames, not one: a node appended and transitioned in the same frame
       has no start state to transition from, so it simply appears. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { node.classList.add('is-in'); });
    });

    var ms = typeof opts.duration === 'number' ? opts.duration : DEFAULT_MS;
    var timer = setTimeout(dismiss, ms);

    function dismiss() {
      clearTimeout(timer);
      node.classList.remove('is-in');
      /* Removed on the transition rather than on a second timer, so the two
         cannot disagree — and with reduced motion there is no transition to
         wait for, hence the fallback. */
      var done = false;
      function remove() { if (done) return; done = true; if (node.parentNode) node.remove(); }
      node.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, 400);
    }

    return { dismiss: dismiss, element: node };
  }

  window.praxisToast = toast;

  /* The style is injected on load as well as on first use: a consumer whose
     first toast fires inside a synchronous handler gets it already there, and
     the flash of an unstyled line is not worth the byte saved. */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectStyle);
  else injectStyle();
})();
