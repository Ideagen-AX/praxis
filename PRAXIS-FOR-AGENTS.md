<!-- GENERATED FILE — DO NOT EDIT.

     Rendered from site/content/ by build-site.py --agents-doc. The reference
     site at https://ideagen-ax.github.io/praxis/ and this file are two
     renderings of one source, so they cannot drift.

     To change anything here, edit the matching file under site/content/ and
     re-run:  python3 build-site.py --agents-doc

     Measured from src/ at Praxis 0.1.9. Where a statement is inferred from
     CSS structure rather than observed, it says so.
-->

# Praxis for agents

The design system for Ideagen EHSQ Enterprise. Plain CSS and vanilla JS — no framework, no build step, no runtime dependency.

## Getting started

The six non-negotiables, a complete working page, and how to diagnose a page that looks wrong.

Praxis has no build step for consumers. A stylesheet, two attributes on `<body>`, and one inline script is the entire integration. What follows is the whole of it.

### The six non-negotiables

Miss any one of these and the page renders wrong in a way that looks like a Praxis bug.

1. **`data-variant="praxis"` on `<body>`.** The entire Praxis look — every `--px-*` material, the dot grid, the 8/12/16 radius scale, the primary button — is scoped to `body[data-variant="praxis"]`. Without it you get the unstyled base layer, not a fallback theme.
2. **`data-theme="light"` or `"dark"` on `<body>`.** Dark mode never engages without it.
3. **Set the theme before first paint,** from an inline script that is the first thing inside `<body>`. It cannot run from `<head>` — the attribute lives on `<body>`, which does not exist yet at that point.
4. **`praxis-tokens.css` loads before `praxis-core.css`.** The `praxis.css` bundle handles this for you. Do not reorder them if you import piecemeal.
5. **Never redefine a `--praxis-*` or `--px-*` token to point at itself.** `--praxis-space-24: var(--praxis-space-24)` is a cycle, invalid at computed-value time, and every use of that token in scope silently resolves to `unset`. This has happened for real. If you want a page-local name, keep it page-local.
6. **No uppercase text.** No `text-transform: uppercase`, no manually capitalised labels — not on section labels, table headers, chips, tabs, buttons or headings. Sentence case; get emphasis from weight, size or color. Acronyms that are already uppercase (EHSQ, CAPA, PDF, NCR) are fine.

### From a CDN

Save as `index.html` and open it. No install, no build, no server.

```html
<div class="rfield">
  <label class="rfield__label" for="ref">Reference</label>
  <input class="rfield__control" id="ref" type="text" value="INC-2024-0417">
  <p class="rfield__hint">Generated when the record is created.</p>
</div>
```

The frame above is a real document. Its head and body are exactly this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My prototype</title>
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.9/dist/praxis.css">
</head>

<body data-variant="praxis" data-theme="light">
<script>
  /* First thing inside <body>. Before first paint, or the page flashes light
     before turning dark. gl-theme is the key the shipped profile menu writes. */
  try {
    var t = localStorage.getItem('gl-theme');
    if (t) document.body.setAttribute('data-theme', t);
  } catch (e) {}
</script>

  <div class="rfield">
    <label class="rfield__label" for="ref">Reference</label>
    <input class="rfield__control" id="ref" type="text" value="INC-2024-0417">
    <p class="rfield__hint">Generated when the record is created.</p>
  </div>

  <!-- Only if you use icons. Loads its own pinned Lucide from beside itself. -->
  <script src="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.9/dist/praxis-lucide.js"></script>
</body>
</html>
```

### From npm

In a bundled app the requirements are identical — stylesheet, the two `<body>` attributes, the icon script if you want icons.

>
`npm install @ideagen-ax/praxis@0.1.9`

`import '@ideagen-ax/praxis'` — tokens, core and every component
`import '@ideagen-ax/praxis/dist/praxis-lucide.js'` — optional, icons only

Set the attributes in the host HTML template. In React that means `index.html`, not a component — they must be present before first paint. Then use the classes directly; Praxis ships no framework bindings, so there is nothing to wrap.

`praxis-reset.css` is shipped but **deliberately not in the bundle** — it restyles bare elements and would clobber a host application's own styles. Import it only if you want that. For a standalone prototype you usually do, and it is safe.

### Diagnosing a broken-looking page

In this order. It is almost always the first item.

1. **Is `data-variant="praxis"` on `<body>`?** Everything that makes Praxis look like Praxis hangs off it.
2. **Is `data-theme` set?** No attribute means no dark mode, ever, regardless of the system setting.
3. **Did you import piecemeal and skip `praxis-admin.css`?** That sheet carries the application shell, `.tbtn`, `.switch`, `.icon`, `.px-pop`, `.mazlan-mark` and `*{box-sizing:border-box}`. Its name hides all of that. Use the bundle.
4. **Is the theme script inside `<body>`, first?** In `<head>` it runs before `<body>` exists and does nothing.
5. **Have you written the shell?** An `.appbar` with correct children and no shell CSS is a pile of unpositioned elements. That is not a bug — see [the mental model](#the-one-mental-model).

**An HTTP 200 proves nothing about rendering.** Two real regressions in this system — an unbalanced comment that ate a stylesheet's closing `*/`, and a token defined as a cycle so every use resolved to `unset` — both passed a green smoke test. Check comment balance, brace balance, and that no token points at itself.

### Before you call it done

Each item catches a failure that a green page load does not.

- `data-variant="praxis"` and `data-theme` both on `<body>`.
- Theme bootstrap is the first thing inside `<body>`, not in `<head>`.
- **Toggled to dark and looked at it.** Most regressions are dark-only: a token with no dark treatment, a light-mode ink on a dark panel, white text on a cyan fill. Use the theme control at the top of this page — it retints every frame on the page at once.
- No uppercase text anywhere.
- Nothing in your page redefines a `--praxis-*` or `--px-*` token.
- Resized a frame down past 768px and looked again.

---

## The one mental model

Praxis styles component contents. Your page owns container positioning. Nearly every "Praxis looks broken" report traces to this.

**Praxis styles component contents. Your page owns container positioning.**

This is stated outright in three sheets. `praxis-appbar.css`: "this file owns the header's visual treatment … but deliberately does not set the bar's positioning." `praxis-navrail.css`: "the `.praxis-navrail` container positioning stays per-page." `praxis-admin.css`: "container positioning only — fill, brand, search and right cluster come from `praxis-appbar.css`."

The consequence: an `.appbar` with correct children and no shell CSS is a pile of unpositioned elements. It is not broken. You have not written the shell yet.

### The shell is in the bundle

The good news is that you do not have to write it. `praxis-admin.css` carries the shell — `.app`, `.main`, `.content`, the `.appbar` positioning, the `.praxis-navrail` container, `--appbar-h`, `--navrail-w` — and `praxis.css` includes that sheet.

>
Load the `praxis.css` bundle and use the shell from [the app shell](#the-app-shell). Do not hand-roll the layout.

### What piecemeal importing costs you

If you import individual sheets and skip `praxis-admin.css`, you lose the shell, `.tbtn`, `.switch`, `.icon`, `.px-pop`, `.mazlan-mark` and `*{box-sizing:border-box}`. That trap is real and the sheet's name hides it.

Two other bases sit in surprising places for the same reason — they were extracted from the page that happened to need them first:

| Class | Actually defined in |
|---|---|
| `.material-symbols-rounded` | `praxis-create-new.css` |
| `.card`, `.page` | `praxis-workspace.css` |
| the shell, `.tbtn`, `.switch`, `.icon`, `.px-pop` | `praxis-admin.css` |

The bundle makes all of this moot, which is the argument for using it.

### What actually ships


| File | Why excluded |
|---|---|
| `praxis-admin-data.js` | invented demo data |
| `praxis-admin-users.js` | invented demo data |
| `praxis-chrome-legacy.css` | legacy chrome with one remaining consumer (contextual-awareness.html); retires with that page |
| `praxis-create-new-nav.js` | routes to this prototype's page filenames |
| `praxis-filters-local.css` | prototype-local overrides on top of praxis-filters.css, not part of the system |
| `praxis-records.js` | prototype storage client, bound to this app's /api/records endpoint |


### Every sheet, measured

Rule counts and class families, read from `src/` at build time. "Families" counts distinct class-name roots after stripping comments, `url()` values and quoted strings — unstripped, prose like "see `praxis-core.css`" reads as a class called `.css`.


| Sheet | Rules | Main class families |
|---|---|---|
| `praxis-admin.css` | 261 | `.switch`, `.adminnav`, `.ws-item`, `.admin-field`, `.tbtn` |
| `praxis-appbar.css` | 53 | `.appbar`, `.appswitch`, `.msel`, `.iconbtn-ghost` |
| `praxis-controls.css` | 32 | `.tb-dropdown`, `.iconbtn`, `.filterfield`, `.icon`, `.material-symbols-rounded` |
| `praxis-core.css` | 46 | `.tbtn`, `.switch`, `.btn`, `.pill-btn`, `.praxis-navrail` |
| `praxis-create-new.css` | 83 | `.cn-group`, `.cn-flyout`, `.cn-row`, `.material-symbols-rounded`, `.cn-tpl` |
| `praxis-filters.css` | 403 | `.filter-row`, `.filter-drawer`, `.select-menu`, `.qfilter`, `.filter-chips` |
| `praxis-mazlan.css` | 270 | `.mazlan-drawer`, `.mazlan-menu`, `.mazlan-reasoning`, `.material-symbols-rounded`, `.mazlan-msg` |
| `praxis-module-selector.css` | 55 | `.msel`, `.cn-group`, `.cn-item`, `.cn-grid`, `.is-sel` |
| `praxis-navrail.css` | 95 | `.praxis-navrail`, `.px-navdrawer`, `.ws-item`, `.ws-pop`, `.px-navtoggle` |
| `praxis-pageheader.css` | 21 | `.pageheader`, `.breadcrumb`, `.toolbar`, `.material-symbols-rounded`, `.icon` |
| `praxis-profile-menu.css` | 27 | `.profile-menu`, `.verswitch`, `.icon`, `.material-symbols-rounded` |
| `praxis-quick-rail.css` | 37 | `.tb-is-compact`, `.qrail-pop`, `.qrail`, `.qfilter`, `.is-open` |
| `praxis-reset.css` | 6 | — |
| `praxis-rfield.css` | 124 | `.rfield`, `.rtable`, `.admin-field`, `.rref`, `.pill` |
| `praxis-tokens.css` | 1 | — |
| `praxis-toolbar-compact.css` | 82 | `.tb-options`, `.tb-compact`, `.viewswitch`, `.tb-display`, `.tb-is-compact` |
| `praxis-workspace.css` | 81 | `.appbar`, `.praxis-navrail`, `.persona-trigger`, `.persona-picker`, `.appswitch` |


---

## Naming and state conventions

Five different ways Praxis expresses "this thing is on", why that happened, and how to tell which one applies before you guess.

Praxis names things in one style and expresses state in five. The naming is consistent enough to predict; the state is not, and guessing wrong is silent — your class does nothing and there is no error. This page exists so you can look it up instead.

### Naming, which is consistent

BEM, with a component root, `__` for a part and `--` for a variant: `.rfield__label`, `.tbtn--primary`, `.ws-item__badge`, `.px-navdrawer__item--active`. Custom properties are `--praxis-*` for the foundation and `--px-*` for the Praxis material layer.

**Part names are not always BEM, and one case is worth knowing.** The toggle switch accepts both `.switch__track` / `.switch__thumb` and the original `.track` / `.thumb`. The BEM pair is canonical; the bare pair is kept because consumers use it, and it is a good illustration of why the convention exists — `.track` and `.thumb` are about as collision-prone as class names get in a sheet you drop into someone else's application. See [form controls](#part-names).

Two things that look like exceptions and are not. `.praxis-navrail` carries the full prefix because it collided with a host class during extraction. And `.px-*` classes — `.px-pop`, `.px-navdrawer`, `.px-skip` — use the short prefix rather than `praxis-`; they are the same family, just older.

### State, which is not

All five of these are in the shipped sheets. None is wrong; each was right in the file it came from, and extraction brought the disagreement along.

| Form | Used by | Example |
|---|---|---|
| `.is-*` class | Filters, quick rail, compact toolbar, module selector, nav drawer, custom filter tree | `.px-navdrawer.is-open`, `.cf-cond.is-selected`, `.msel.is-open` |
| `--modifier` (BEM) | Create New, segmented, admin, workspace, Mazlan, nav drawer items | `.cn-seg__btn--active`, `.segmented__opt--active`, `.mazlan-scrim--open`, `.admin-tab--active` |
| `[aria-expanded]` | Quick-rail pills, display switch, persona trigger | `.qrail__pill[aria-expanded="true"]` |
| `[aria-pressed]` | Filter type buttons | `.filter-type-btn[aria-pressed="true"]` |
| `[data-*]` | Filter drawer scrim, collapsed controls | `.drawer-scrim[data-open]`, `.filter-controls[data-collapsed]` |
| `[hidden]` | Nearly every popover and panel in the system | `.cn-flyout[hidden]`, `.px-pop[hidden]`, `.ws-pop[hidden]` |

**Two of these disagree inside a single sheet.** `praxis-filters.css` uses `.is-active` on the view switch, `[aria-pressed="true"]` on the type buttons, `[data-open]` on the scrim, and both `.cf-cond.is-selected` and `.cf-group-selected` for the same idea at two levels of the same tree. It is the clearest single symptom of that sheet being a port.

### How to tell, without guessing

1. **Read the selector.** Every one of these is discoverable in ten seconds: grep the component's sheet for the family name and look at what follows it.
2. **Prefer the ARIA form when both exist.** Where a control has `[aria-expanded]` styling, use it and skip the class — the accessible state and the visual state then cannot drift, which is the whole argument for attribute-driven state.
3. **`[hidden]` is the safest default for show and hide.** It is honoured across the system, it is a real HTML attribute with real semantics, and it does not need a matching CSS rule to do the right thing.

### The state modifiers, in full

Measured from `src/`: these are the `.is-*` families the sheets actually define. They are conventions rather than components, which is why the [coverage check](#praxis) counts them separately.

| Class | Meaning |
|---|---|
| `.is-open` | Panel, drawer or popover is showing. The most widely used. |
| `.is-active` | Currently selected option in a switch or view picker |
| `.is-selected`, `.is-sel` | Selected row, condition or module tile. **Two spellings**: `.is-sel` in the module selector, `.is-selected` in the filter tree. |
| `.is-checked`, `.is-mixed` | Checkbox-like states, including indeterminate |
| `.is-on` | Toggle in its on position |
| `.is-expanded`, `.is-collapsed` | Disclosure state. **Both exist**, on different components, meaning opposite things — check which one the sheet keys on before you add either. |
| `.is-spinning` | In-progress, on Mazlan's tool affordances |

`body.tb-is-compact` is not one of these despite the name. It is a **document-level** flag set by [the compact toolbar](#compact-toolbar) and read by two different sheets, which is why it lives on `body` rather than on a component.

### What this means for a new component

Pick one form and use it consistently within the component. If the component has an accessible state that maps to it — expanded, pressed, selected — use the attribute and let CSS key on that. Otherwise use `.is-*`, because it is the most common form in the system and a reader's first guess. Do not introduce a sixth.

---

## Color

The whole palette in one look, each ramp at a size you can judge, and the semantic layer drawn as what it is for. Every value resolved live in both themes.

Every color on this page is painted from a live document, once per theme, rather than copied out of the stylesheet. That matters more here than anywhere else in Praxis: several color tokens are declared one way in `praxis-tokens.css` and [overridden](#the-praxis-variant-overrides-nine-tokens) under the Praxis variant, so the token file is not the answer to "what color is this".

### The whole palette


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-neutral-05` | `#f4f5f6` | `#10151e` |
| `--praxis-color-neutral-10` | `#edf0f2` | `#222b39` |
| `--praxis-color-neutral-100` | `#202a35` | — |
| `--praxis-color-neutral-15` | `#dadfe4` | `#2a3342` |
| `--praxis-color-neutral-20` | `#c8cfd7` | `#3a4556` |
| `--praxis-color-neutral-30` | `#adb8c4` | — |
| `--praxis-color-neutral-40` | `#8898a9` | — |
| `--praxis-color-neutral-50` | `#718499` | — |
| `--praxis-color-neutral-60` | `#4d657f` | — |
| `--praxis-color-neutral-70` | `#465c74` | — |
| `--praxis-color-neutral-80` | `#37485a` | — |
| `--praxis-color-neutral-90` | `#2a3846` | — |
| `--praxis-color-white` | `#ffffff` | — |
| `--praxis-color-blue-10` | `#edf0fd` | — |
| `--praxis-color-blue-50` | `#6882ef` | — |
| `--praxis-color-blue-60` | `#4766eb` | `#7a93e0` |
| `--praxis-color-green-10` | `#e6f3ee` | — |
| `--praxis-color-green-60` | `#098b53` | — |
| `--praxis-color-orange-10` | `#fdf2e6` | — |
| `--praxis-color-orange-60` | `#ef8100` | `#ffa94d` |
| `--praxis-color-pink-50` | `#e82e8b` | — |
| `--praxis-color-pink-60` | `#e30072` | — |
| `--praxis-color-pink-90` | `#810041` | — |
| `--praxis-color-red-10` | `#fceaeb` | — |
| `--praxis-color-red-50` | `#e7535c` | — |
| `--praxis-color-red-60` | `#e22d38` | — |
| `--praxis-color-teal-10` | `#e8f3f3` | `#12313c` |
| `--praxis-color-teal-20` | `#c8e1e3` | `#16404c` |
| `--praxis-color-teal-50` | `#4499a0` | — |
| `--praxis-color-teal-60` | `#1b838b` | — |
| `--praxis-color-teal-70` | `#176f76` | — |
| `--praxis-color-teal-80` | `#135d63` | `#5CE0E5` |
| `--praxis-color-yellow-10` | `#fdf9e6` | — |
| `--praxis-color-yellow-50` | `#f2d02e` | — |
| `--praxis-color-yellow-90` | `#887100` | — |
| `--praxis-color-border-default` | `var(--praxis-color-neutral-20)` | `rgba(255,255,255,.10)` |
| `--praxis-color-border-focus` | `var(--praxis-color-teal-50)` | — |
| `--praxis-color-border-strong` | `var(--praxis-color-neutral-50)` | — |
| `--praxis-color-interactive-active` | `var(--praxis-color-teal-80)` | `#5CE0E5` |
| `--praxis-color-interactive-default` | `var(--praxis-color-teal-60)` | `#29D2D7` |
| `--praxis-color-interactive-hover` | `var(--praxis-color-teal-70)` | `#42D9DE` |
| `--praxis-color-surface-default` | `var(--praxis-color-white)` | `#192336` |
| `--praxis-color-surface-subtle` | `var(--praxis-color-neutral-10)` | `#161c27` |
| `--praxis-color-text-disabled` | `var(--praxis-color-neutral-40)` | `#62707e` |
| `--praxis-color-text-inverse` | `var(--praxis-color-white)` | — |
| `--praxis-color-text-link` | `var(--praxis-color-teal-60)` | `#5CE0E5` |
| `--praxis-color-text-primary` | `var(--praxis-color-neutral-90)` | `#e7ebf1` |
| `--praxis-color-text-secondary` | `var(--praxis-color-neutral-60)` | `#9aa7b4` |
| `--praxis-color-text-tertiary` | `#616f7e` | `#8b98a6` |
| `--praxis-color-status-danger` | `var(--praxis-color-red-60)` | `#ed7b82` |
| `--praxis-color-status-info` | `var(--praxis-color-blue-60)` | `#7a93e0` |
| `--praxis-color-status-success` | `var(--praxis-color-green-60)` | `#3ecf8e` |
| `--praxis-color-status-warning` | `var(--praxis-color-orange-70)` | `#ffa32e` |
| `--praxis-type-font-sans` | `'Gilroy','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif` | — |
| `--praxis-type-size-base` | `0.875rem` | — |
| `--praxis-type-size-lg` | `1.125rem` | — |
| `--praxis-type-size-md` | `1rem` | — |
| `--praxis-type-size-sm` | `0.8125rem` | — |
| `--praxis-type-size-xl` | `1.25rem` | — |
| `--praxis-type-size-xs` | `0.75rem` | — |
| `--praxis-space-12` | `.75rem` | — |
| `--praxis-space-16` | `1rem` | — |
| `--praxis-space-24` | `1.5rem` | — |
| `--praxis-space-32` | `2rem` | — |
| `--praxis-space-4` | `.25rem` | — |
| `--praxis-space-8` | `.5rem` | — |
| `--praxis-radius-full` | `9999px` | — |
| `--praxis-radius-lg` | `16px` | — |
| `--praxis-radius-md` | `12px` | — |
| `--praxis-radius-sm` | `8px` | — |
| `--praxis-elevation-1` | `0 1px 2px 0 rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-2` | `0 1px 3px 0 rgb(32 42 53 / .1), 0 1px 2px -1px rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-3` | `0 4px 6px -1px rgb(32 42 53 / .1), 0 2px 4px -2px rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-4` | `0 10px 15px -3px rgb(32 42 53 / .1), 0 4px 6px -4px rgb(32 42 53 / .05)` | — |
| `--praxis-motion-normal` | `180ms` | — |
| `--praxis-motion-slow` | `260ms` | — |
| `--praxis-ease-default` | `cubic-bezier(.32,.72,0,1)` | — |
| `--praxis-motion-fast` | `120ms` | — |
| `--praxis-motion-slowest` | `420ms` | — |
| `--praxis-record-rail-w` | `300px` | — |
| `--praxis-control-h` | `32px` | — |
| `--praxis-navrail-width` | `56px` | — |
| `--praxis-navrail-width-expanded` | `240px` | — |
| `--praxis-elevation-card` | `0 2px 16px -4px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.1)` | — |
| `--praxis-elevation-card-raised` | `0 8px 24px -6px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0, 0, 0, 0.1)` | — |
| `--praxis-elevation-popover` | `0 4px 6px rgba(32, 42, 53, 0.07), 0 10px 15px rgba(32, 42, 53, 0.08)` | — |
| `--praxis-color-blue-100` | `#202e6a` | — |
| `--praxis-color-blue-20` | `#d3dafa` | — |
| `--praxis-color-blue-30` | `#b0bdf6` | — |
| `--praxis-color-blue-40` | `#8b9ff2` | — |
| `--praxis-color-blue-70` | `#3c57c8` | — |
| `--praxis-color-blue-80` | `#3248a7` | — |
| `--praxis-color-blue-90` | `#283a86` | — |
| `--praxis-color-green-100` | `#043f25` | — |
| `--praxis-color-green-20` | `#c4e3d6` | — |
| `--praxis-color-green-30` | `#95cdb5` | — |
| `--praxis-color-green-40` | `#64b693` | — |
| `--praxis-color-green-50` | `#35a072` | — |
| `--praxis-color-green-70` | `#087647` | — |
| `--praxis-color-green-80` | `#06633b` | — |
| `--praxis-color-green-90` | `#054f2f` | — |
| `--praxis-color-orange-100` | `#6c3a00` | — |
| `--praxis-color-orange-20` | `#fbe1c2` | — |
| `--praxis-color-orange-30` | `#f8c991` | — |
| `--praxis-color-orange-40` | `#f5b05e` | — |
| `--praxis-color-orange-50` | `#f2982e` | — |
| `--praxis-color-orange-70` | `#cb6e00` | — |
| `--praxis-color-orange-80` | `#aa5c00` | — |
| `--praxis-color-orange-90` | `#884a00` | — |
| `--praxis-color-pink-10` | `#fce6f1` | — |
| `--praxis-color-pink-100` | `#660033` | — |
| `--praxis-color-pink-20` | `#f8c2dd` | — |
| `--praxis-color-pink-30` | `#f391c2` | — |
| `--praxis-color-pink-40` | `#ed5ea6` | — |
| `--praxis-color-pink-70` | `#c10061` | — |
| `--praxis-color-pink-80` | `#a10051` | — |
| `--praxis-color-red-100` | `#661419` | — |
| `--praxis-color-red-20` | `#f8cdcf` | — |
| `--praxis-color-red-30` | `#f3a5a9` | — |
| `--praxis-color-red-40` | `#ed7b82` | — |
| `--praxis-color-red-70` | `#c02630` | — |
| `--praxis-color-red-80` | `#a02028` | — |
| `--praxis-color-red-90` | `#811a20` | — |
| `--praxis-color-teal-100` | `#0c3b3f` | — |
| `--praxis-color-teal-30` | `#9dcacd` | — |
| `--praxis-color-teal-40` | `#6fb1b6` | — |
| `--praxis-color-teal-90` | `#0f4b4f` | — |
| `--praxis-color-yellow-100` | `#6c5900` | — |
| `--praxis-color-yellow-20` | `#fbf1c2` | — |
| `--praxis-color-yellow-30` | `#f8e691` | — |
| `--praxis-color-yellow-40` | `#f5db5e` | — |
| `--praxis-color-yellow-60` | `#efc600` | — |
| `--praxis-color-yellow-70` | `#cba800` | — |
| `--praxis-color-yellow-80` | `#aa8d00` | — |
| `--praxis-radius-card` | `20px` | — |
| `--praxis-radius-xl` | `16px` | — |
| `--praxis-color-border-subtle` | `var(--praxis-color-neutral-10)` | `#222b39` |
| `--praxis-color-surface-muted` | `var(--praxis-color-neutral-10)` | `#222b39` |
| `--praxis-space-20` | `1.25rem` | — |
| `--praxis-space-40` | `2.5rem` | — |
| `--praxis-space-48` | `3rem` | — |
| `--praxis-type-size-2xl` | `1.5rem` | — |
| `--praxis-type-size-2xs` | `0.6875rem` | — |
| `--praxis-type-size-3xl` | `1.875rem` | — |
| `--praxis-appbar-h` | `64px` | — |
| `--praxis-motion-drawer` | `280ms` | — |
| `--praxis-ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | — |
| `--praxis-ease-spring-soft` | `cubic-bezier(.22,1,.36,1)` | — |
| `--praxis-ease-spring-out` | `cubic-bezier(.5,0,.75,0)` | — |
| `--praxis-ease-spring-bouncy` | `cubic-bezier(.175,.885,.32,1.275)` | — |
| `--praxis-rail-duration` | `480ms` | — |
| `--praxis-rail-ease` | `cubic-bezier(.34,.01,.1,1)` | — |
| `--praxis-rail-travel` | `-56px` | — |
| `--praxis-menu-duration` | `520ms` | — |
| `--praxis-menu-ease` | `cubic-bezier(.4,0,.2,1)` | — |
| `--praxis-glass-bg` | `rgba(255,255,255,.5)` | `rgba(30,38,52,.52)` |
| `--praxis-glass-drawer` | `rgba(255,255,255,.82)` | `rgba(28,35,48,.86)` |
| `--praxis-glass-border` | `rgba(255,255,255,.6)` | `rgba(255,255,255,.14)` |
| `--praxis-glass-blur` | `blur(22px) saturate(1.8)` | `blur(24px) saturate(1.6)` |
| `--praxis-glass-inset` | `inset 0 1px 0 rgba(255,255,255,.6)` | `inset 0 1px 0 rgba(255,255,255,.06)` |
| `--praxis-glass-sheen` | `linear-gradient(135deg,rgba(255,255,255,.45),rgba(255,255,255,0))` | `linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0))` |
| `--praxis-glass-shadow` | `0 10px 32px -14px rgba(16,26,40,.45)` | `0 14px 36px -14px rgba(0,0,0,.6)` |
| `--praxis-glass-hover` | `rgba(255,255,255,.28)` | `rgba(255,255,255,.06)` |
| `--praxis-glass-on` | `rgba(27,131,139,.16)` | `rgba(41,210,215,.16)` |
| `--praxis-tone-neutral-bg` | `var(--praxis-color-neutral-15)` | `rgba(255,255,255,.08)` |
| `--praxis-tone-neutral-fg` | `var(--praxis-color-neutral-70)` | `#9aa7b4` |
| `--praxis-tone-info-bg` | `var(--praxis-color-blue-10)` | `rgba(71,102,235,.18)` |
| `--praxis-tone-info-fg` | `var(--praxis-color-blue-70)` | `#8aa0f5` |
| `--praxis-tone-success-bg` | `var(--praxis-color-green-10)` | `rgba(9,139,83,.16)` |
| `--praxis-tone-success-fg` | `var(--praxis-color-green-70)` | `#4cd08a` |
| `--praxis-tone-warning-bg` | `var(--praxis-color-orange-10)` | `rgba(239,129,0,.16)` |
| `--praxis-tone-warning-fg` | `var(--praxis-color-orange-90)` | `#f5b45c` |
| `--praxis-tone-danger-bg` | `var(--praxis-color-red-10)` | `rgba(226,45,56,.18)` |
| `--praxis-tone-danger-fg` | `var(--praxis-color-red-70)` | `#f28b91` |
| `--px-card-rail` | `0 0 0 .5px rgba(16,36,58,.055),0 1px 1px rgba(16,36,58,.035),inset 0 .5px 0 rgba(255,255,255,.6)` | `0 0 0 .5px rgba(255,255,255,.07),0 1px 2px rgba(0,0,0,.30),inset 0 .5px 0 rgba(255,255,255,.05)` |
| `--px-card-raised` | `0 0 0 .5px rgba(16,36,58,.07),0 1px 2px rgba(16,36,58,.05),0 2px 6px -2px rgba(16,36,58,.06),0 24px 48px -22px rgba(16,36,58,.20),inset 0 .5px 0 rgba(255,255,255,.85)` | `0 0 0 .5px rgba(255,255,255,.11),0 1px 2px rgba(0,0,0,.45),0 4px 10px -3px rgba(0,0,0,.40),0 32px 60px -24px rgba(0,0,0,.75),inset 0 .5px 0 rgba(255,255,255,.10)` |
| `--px-chip` | `#EEF1F4` | `rgba(255,255,255,.07)` |
| `--px-dot` | `rgba(16,36,58,.11)` | `rgba(255,255,255,.09)` |
| `--px-dot-clear` | `192px` | — |
| `--px-drawer` | `#ffffff` | `#0e1324` |
| `--px-edge` | `rgba(255,255,255,.6)` | `rgba(255,255,255,.08)` |
| `--px-field` | `#EEF1F4` | `#262F3F` |
| `--px-field-hover` | `#E6EAEF` | `#2C3646` |
| `--px-glass` | `rgba(255,255,255,.82)` | `rgba(26,32,45,.72)` |
| `--px-gutter` | `16px` | — |
| `--px-hover` | `rgba(16,36,58,.025)` | `rgba(255,255,255,.05)` |
| `--px-hover-btn` | `rgba(16,36,58,.075)` | `rgba(255,255,255,.10)` |
| `--px-overlay` | `0 0 0 .5px rgba(16,36,58,.06),0 2px 6px rgba(16,36,58,.06),0 18px 38px -16px rgba(16,36,58,.18)` | `0 0 0 .5px rgba(255,255,255,.08),0 2px 6px rgba(0,0,0,.4),0 24px 50px -20px rgba(0,0,0,.7)` |
| `--px-page` | `#F0F2F4` | `rgb(14,19,36)` |
| `--px-primary-fg` | `#fff` | `#08313a` |
| `--px-primary-grad` | `linear-gradient(180deg,#197b83,#156f77)` | `linear-gradient(180deg,#29d2d7,#1fb4b9)` |
| `--px-primary-shadow` | `0 0 0 .5px rgba(16,36,58,.2),0 1px 2px rgba(16,36,58,.15),0 8px 18px -8px rgba(25,123,131,.5),inset 0 .5px 0 rgba(255,255,255,.28)` | `0 0 0 .5px rgba(41,210,215,.30),0 1px 2px rgba(0,0,0,.45),0 8px 18px -8px rgba(41,210,215,.45),inset 0 1px 0 rgba(255,255,255,.22)` |
| `--px-scroll` | `rgba(16,36,58,.28)` | `rgba(255,255,255,.26)` |
| `--px-scroll-hover` | `rgba(16,36,58,.45)` | `rgba(255,255,255,.42)` |
| `--px-surface` | `#ffffff` | `#192336` |
| `--px-surface-2` | `#F4F6F8` | `#232c3b` |
| `--px-tool` | `#ffffff` | `rgba(255,255,255,.06)` |
| `--px-tool-shadow` | `0 0 0 .5px rgba(16,36,58,.07),0 1px 2px rgba(16,36,58,.05)` | `0 0 0 .5px rgba(255,255,255,.08),0 1px 2px rgba(0,0,0,.35)` |
| `--px-tool-shadow-hover` | `0 0 0 .5px rgba(16,36,58,.09),0 2px 8px -2px rgba(16,36,58,.16)` | `0 0 0 .5px rgba(255,255,255,.12),0 4px 12px -2px rgba(0,0,0,.5)` |
| `--px-toolbar-gutter` | `16px` | — |
| `--home-gutter` | `var(--px-gutter)` | — |
| `--ph-pad-x` | `var(--px-gutter)` | — |
| `--praxis-card` | `0 0 0 .5px rgba(16,36,58,.06),0 1px 1.5px rgba(16,36,58,.045),0 10px 28px -14px rgba(16,36,58,.10),inset 0 .5px 0 rgba(255,255,255,.7)` | `0 0 0 .5px rgba(255,255,255,.08),0 1px 2px rgba(0,0,0,.4),0 16px 40px -18px rgba(0,0,0,.6),inset 0 .5px 0 rgba(255,255,255,.07)` |
| `--praxis-color-purple-60` | `#805ad5` | `#b088e8` |
| `--sp-gutter` | `var(--px-gutter)` | — |


### Reach for these first

Semantic color, not palette rungs. These are the tokens remapped per theme, so using them is what makes your page theme correctly for free. Each is drawn as what it is for — an ink as text, a border as a hairline, a fill as a control — because a text color shown as a filled square tells you almost nothing about whether you can read it.

#### Text


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-text-disabled` | `var(--praxis-color-neutral-40)` | `#62707e` |
| `--praxis-color-text-inverse` | `var(--praxis-color-white)` | — |
| `--praxis-color-text-link` | `var(--praxis-color-teal-60)` | `#5CE0E5` |
| `--praxis-color-text-primary` | `var(--praxis-color-neutral-90)` | `#e7ebf1` |
| `--praxis-color-text-secondary` | `var(--praxis-color-neutral-60)` | `#9aa7b4` |
| `--praxis-color-text-tertiary` | `#616f7e` | `#8b98a6` |


#### Surface


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-surface-default` | `var(--praxis-color-white)` | `#192336` |
| `--praxis-color-surface-subtle` | `var(--praxis-color-neutral-10)` | `#161c27` |
| `--praxis-color-surface-muted` | `var(--praxis-color-neutral-10)` | `#222b39` |


#### Border


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-border-default` | `var(--praxis-color-neutral-20)` | `rgba(255,255,255,.10)` |
| `--praxis-color-border-focus` | `var(--praxis-color-teal-50)` | — |
| `--praxis-color-border-strong` | `var(--praxis-color-neutral-50)` | — |
| `--praxis-color-border-subtle` | `var(--praxis-color-neutral-10)` | `#222b39` |


#### Interactive


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-interactive-active` | `var(--praxis-color-teal-80)` | `#5CE0E5` |
| `--praxis-color-interactive-default` | `var(--praxis-color-teal-60)` | `#29D2D7` |
| `--praxis-color-interactive-hover` | `var(--praxis-color-teal-70)` | `#42D9DE` |


**Interactive teal is a light color in dark mode.** `--praxis-color-interactive-default` becomes `#29D2D7`, luminance .55. White text on it as a *fill* measures 1.86:1 against a 4.5 minimum. Use `--px-primary-fg` (dark ink, 12.4:1) whenever that color is a fill — which is the ink the swatches above are drawn with. Praxis already does this for the calls to action it defines; if you invent a filled cyan control, it is on you.

#### Status


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-status-danger` | `var(--praxis-color-red-60)` | `#ed7b82` |
| `--praxis-color-status-info` | `var(--praxis-color-blue-60)` | `#7a93e0` |
| `--praxis-color-status-success` | `var(--praxis-color-green-60)` | `#3ecf8e` |
| `--praxis-color-status-warning` | `var(--praxis-color-orange-70)` | `#ffa32e` |


#### Tone pairs

The paired background and foreground used by status chips and badges, shown as the chips they are. **Always use the pair, never one half** — the foregrounds are literals rather than palette references on dark, because the palette's 70 steps are tuned for light surfaces and go muddy.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-tone-neutral-bg` | `var(--praxis-color-neutral-15)` | `rgba(255,255,255,.08)` |
| `--praxis-tone-neutral-fg` | `var(--praxis-color-neutral-70)` | `#9aa7b4` |
| `--praxis-tone-info-bg` | `var(--praxis-color-blue-10)` | `rgba(71,102,235,.18)` |
| `--praxis-tone-info-fg` | `var(--praxis-color-blue-70)` | `#8aa0f5` |
| `--praxis-tone-success-bg` | `var(--praxis-color-green-10)` | `rgba(9,139,83,.16)` |
| `--praxis-tone-success-fg` | `var(--praxis-color-green-70)` | `#4cd08a` |
| `--praxis-tone-warning-bg` | `var(--praxis-color-orange-10)` | `rgba(239,129,0,.16)` |
| `--praxis-tone-warning-fg` | `var(--praxis-color-orange-90)` | `#f5b45c` |
| `--praxis-tone-danger-bg` | `var(--praxis-color-red-10)` | `rgba(226,45,56,.18)` |
| `--praxis-tone-danger-fg` | `var(--praxis-color-red-70)` | `#f28b91` |


### Brand

Teal `#1b838b` (`teal-60`) and pink `#e30072` (`pink-60`). The Mazlan signature is the teal to magenta gradient, `#29D2D7 → #E30072`, reserved for agentic moments — see [Mazlan](#mazlan-ai-surfaces).

### The ramps

Reach for a rung only when no semantic token fits. Each ramp is drawn light then dark, at a size where you can judge the step between rungs rather than infer it from a hex. The label ink flips from dark to white where the rung itself crosses over, so where a ramp stops taking dark text is visible rather than something you work out.

#### Neutral


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-neutral-05` | `#f4f5f6` | `#10151e` |
| `--praxis-color-neutral-10` | `#edf0f2` | `#222b39` |
| `--praxis-color-neutral-100` | `#202a35` | — |
| `--praxis-color-neutral-15` | `#dadfe4` | `#2a3342` |
| `--praxis-color-neutral-20` | `#c8cfd7` | `#3a4556` |
| `--praxis-color-neutral-30` | `#adb8c4` | — |
| `--praxis-color-neutral-40` | `#8898a9` | — |
| `--praxis-color-neutral-50` | `#718499` | — |
| `--praxis-color-neutral-60` | `#4d657f` | — |
| `--praxis-color-neutral-70` | `#465c74` | — |
| `--praxis-color-neutral-80` | `#37485a` | — |
| `--praxis-color-neutral-90` | `#2a3846` | — |


#### Teal


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-teal-10` | `#e8f3f3` | `#12313c` |
| `--praxis-color-teal-20` | `#c8e1e3` | `#16404c` |
| `--praxis-color-teal-50` | `#4499a0` | — |
| `--praxis-color-teal-60` | `#1b838b` | — |
| `--praxis-color-teal-70` | `#176f76` | — |
| `--praxis-color-teal-80` | `#135d63` | `#5CE0E5` |
| `--praxis-color-teal-100` | `#0c3b3f` | — |
| `--praxis-color-teal-30` | `#9dcacd` | — |
| `--praxis-color-teal-40` | `#6fb1b6` | — |
| `--praxis-color-teal-90` | `#0f4b4f` | — |


#### Pink


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-pink-50` | `#e82e8b` | — |
| `--praxis-color-pink-60` | `#e30072` | — |
| `--praxis-color-pink-90` | `#810041` | — |
| `--praxis-color-pink-10` | `#fce6f1` | — |
| `--praxis-color-pink-100` | `#660033` | — |
| `--praxis-color-pink-20` | `#f8c2dd` | — |
| `--praxis-color-pink-30` | `#f391c2` | — |
| `--praxis-color-pink-40` | `#ed5ea6` | — |
| `--praxis-color-pink-70` | `#c10061` | — |
| `--praxis-color-pink-80` | `#a10051` | — |


#### Blue


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-blue-10` | `#edf0fd` | — |
| `--praxis-color-blue-50` | `#6882ef` | — |
| `--praxis-color-blue-60` | `#4766eb` | `#7a93e0` |
| `--praxis-color-blue-100` | `#202e6a` | — |
| `--praxis-color-blue-20` | `#d3dafa` | — |
| `--praxis-color-blue-30` | `#b0bdf6` | — |
| `--praxis-color-blue-40` | `#8b9ff2` | — |
| `--praxis-color-blue-70` | `#3c57c8` | — |
| `--praxis-color-blue-80` | `#3248a7` | — |
| `--praxis-color-blue-90` | `#283a86` | — |


#### Green


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-green-10` | `#e6f3ee` | — |
| `--praxis-color-green-60` | `#098b53` | — |
| `--praxis-color-green-100` | `#043f25` | — |
| `--praxis-color-green-20` | `#c4e3d6` | — |
| `--praxis-color-green-30` | `#95cdb5` | — |
| `--praxis-color-green-40` | `#64b693` | — |
| `--praxis-color-green-50` | `#35a072` | — |
| `--praxis-color-green-70` | `#087647` | — |
| `--praxis-color-green-80` | `#06633b` | — |
| `--praxis-color-green-90` | `#054f2f` | — |


#### Orange


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-orange-10` | `#fdf2e6` | — |
| `--praxis-color-orange-60` | `#ef8100` | `#ffa94d` |
| `--praxis-color-orange-100` | `#6c3a00` | — |
| `--praxis-color-orange-20` | `#fbe1c2` | — |
| `--praxis-color-orange-30` | `#f8c991` | — |
| `--praxis-color-orange-40` | `#f5b05e` | — |
| `--praxis-color-orange-50` | `#f2982e` | — |
| `--praxis-color-orange-70` | `#cb6e00` | — |
| `--praxis-color-orange-80` | `#aa5c00` | — |
| `--praxis-color-orange-90` | `#884a00` | — |


#### Red


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-red-10` | `#fceaeb` | — |
| `--praxis-color-red-50` | `#e7535c` | — |
| `--praxis-color-red-60` | `#e22d38` | — |
| `--praxis-color-red-100` | `#661419` | — |
| `--praxis-color-red-20` | `#f8cdcf` | — |
| `--praxis-color-red-30` | `#f3a5a9` | — |
| `--praxis-color-red-40` | `#ed7b82` | — |
| `--praxis-color-red-70` | `#c02630` | — |
| `--praxis-color-red-80` | `#a02028` | — |
| `--praxis-color-red-90` | `#811a20` | — |


#### Yellow


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-yellow-10` | `#fdf9e6` | — |
| `--praxis-color-yellow-50` | `#f2d02e` | — |
| `--praxis-color-yellow-90` | `#887100` | — |
| `--praxis-color-yellow-100` | `#6c5900` | — |
| `--praxis-color-yellow-20` | `#fbf1c2` | — |
| `--praxis-color-yellow-30` | `#f8e691` | — |
| `--praxis-color-yellow-40` | `#f5db5e` | — |
| `--praxis-color-yellow-60` | `#efc600` | — |
| `--praxis-color-yellow-70` | `#cba800` | — |
| `--praxis-color-yellow-80` | `#aa8d00` | — |


#### Purple

One rung, and it is defined only under the Praxis variant in `praxis-core.css`. There is no purple ramp in the token file.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-purple-60` | `#805ad5` | `#b088e8` |


#### White


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-white` | `#ffffff` | — |


### The Praxis variant overrides nine tokens

Measured, not asserted. Each row below is a token `praxis-tokens.css` declares and `praxis-core.css` then re-declares for the Praxis variant.


| Token | Token file | Under Praxis |
|---|---|---|
| `--praxis-color-blue-60` | `#4766eb` | **`#4361c4`** |
| `--praxis-color-border-default` | `var(--praxis-color-neutral-20)` | **`#E2E5E9`** |
| `--praxis-color-text-primary` | `var(--praxis-color-neutral-90)` | **`#2F4051`** |
| `--praxis-color-text-secondary` | `var(--praxis-color-neutral-60)` | **`#5D6977`** |
| `--praxis-elevation-1` | `0 1px 2px 0 rgb(32 42 53 / .06)` | **`0 0 0 .5px rgba(16,36,58,.05),0 1px 2px rgba(16,36,58,.04)`** |
| `--praxis-elevation-card` | `0 2px 16px -4px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.1)` | **`var(--praxis-card)`** |
| `--praxis-elevation-card-raised` | `0 8px 24px -6px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0, 0, 0, 0.1)` | **`var(--praxis-card)`** |
| `--praxis-elevation-popover` | `0 4px 6px rgba(32, 42, 53, 0.07), 0 10px 15px rgba(32, 42, 53, 0.08)` | **`var(--px-overlay)`** |
| `--praxis-radius-card` | `20px` | **`12px`** |


### Four semantic tokens do not change in dark

Read the two resolved values under each swatch above and four of them match. That is worth understanding rather than skimming, because it used to be nine — and five of those nine were fixed in `src/` on 2026-08-18 after this page made them visible.

#### What was fixed

Four tokens were declared on `:root` as `var(--rung)` while the dark remap of that rung was declared on `body`. Custom-property substitution happens at the element where the *declaration* lives, so each was computed on `:root` against the light rung and `body` inherited that value. **The dark value could never apply.**

| Token | Was, in dark | Now |
|---|---|---|
| `--praxis-color-interactive-active` | `#135d63` — a light-mode ink | `#5CE0E5` |
| `--praxis-color-border-subtle` | `#edf0f2` | `#222b39` |
| `--praxis-color-surface-muted` | `#edf0f2` | `#222b39` |
| `--praxis-color-status-info` | `#4766eb` | `#7a93e0` |

`interactive-active` was the one that mattered: in dark, a control's resting state was bright cyan `#29D2D7` and its pressed state resolved to a dark `#135d63`, so pressing it made it go *darker*. Inverted feedback.

Fixing it required widening the change by one token. `--praxis-color-interactive-hover` was not frozen — it aliases `teal-70`, which has no dark treatment at all — but leaving it would have produced a triad that goes bright, then dark, then bright. It now sits between the two, and the progression mirrors light in *direction*: every interaction step increases contrast against the ink on the fill.

|  | default | hover | active |
|---|---|---|---|
| light, ink `#fff` | `#1b838b` 4.50:1 | `#176f76` 5.88:1 | `#135d63` 7.57:1 |
| dark, ink `#08313a` | `#29D2D7` 7.48:1 | `#42D9DE` 8.08:1 | `#5CE0E5` 8.77:1 |

And `--praxis-color-status-danger` was the fifth. It was not frozen either — it simply had no dark value while its three siblings did — but at `#e22d38` it measured **3.50:1** on the dark card against the 4.5:1 WCAG 1.4.3 asks of text, while success, warning and info sat at 7.88, 7.89 and 5.30. It is now `red-40` (`#ed7b82`), an existing rung, at 5.81:1.


None.


That table is generated from the structure of the stylesheets on every build, and an empty result is now a **gate**: a fifth frozen alias fails the build rather than waiting for someone to notice a control behaving backwards. It is deliberately not derived from the resolved values — a resolver asked for the dark value substitutes the dark rung and reports a difference the browser never produces, which is the whole reason this went unseen.

#### The four that remain, and why they are fine

| Token | Both themes | Why |
|---|---|---|
| `--praxis-color-text-inverse` | `#ffffff` | **Deliberate.** It is the ink for a coloured fill, and a fill dark enough to need inverse ink is dark in either theme. |
| `--praxis-color-border-strong` | `#8898a9` | Aliases `neutral-40`, which the dark theme does not remap. 5.33:1 on the dark card, well past the 3:1 a border needs. |
| `--praxis-color-border-focus` | `#4499a0` | Aliases `teal-50`, likewise unremapped. 4.73:1 — a focus ring that reads in both themes. |
| `--praxis-color-status-danger` | — | No longer in this list; see above. |

The distinction that matters: a token identical in both themes is **not** automatically a bug. Three of these are either intended or measurably adequate. What was a bug was a dark value that existed and could not be reached, which is a rule violation rather than an omission — and that is the thing the build now checks.

### Two live traps

**Never substitute one token for another by name.** Check the resolved value in both themes first. `--t-sm` looks like it maps to `--praxis-type-size-sm`, but its fallback actually resolved to `type-size-base`. `--r-lg` is `1rem` against a canonical `16px` — equal only because nothing overrides the root font size. The resolved values on this page exist so you do not have to take a name on trust.

Two more, worth knowing before you go hunting:

- **`--praxis-radius-card` is 20px in the token file and 12px under Praxis.** The override is the one that renders. 12px is the card geometry.
- **Most `--praxis-*` and `--px-*` tokens are redefined per theme.** Only `--praxis-color-white` and the palette primitives resolve identically everywhere — and as the palette grid above shows, not even all of those: the dark theme moves `neutral-05` through `neutral-20` and three teal rungs.

### All values

The exact declarations and what they resolve to, for copying. The visual blocks above are for judging; this is for reading.

#### Semantic


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-border-default` | `var(--praxis-color-neutral-20)` | `rgba(255,255,255,.10)` |
| `--praxis-color-border-focus` | `var(--praxis-color-teal-50)` | — |
| `--praxis-color-border-strong` | `var(--praxis-color-neutral-50)` | — |
| `--praxis-color-interactive-active` | `var(--praxis-color-teal-80)` | `#5CE0E5` |
| `--praxis-color-interactive-default` | `var(--praxis-color-teal-60)` | `#29D2D7` |
| `--praxis-color-interactive-hover` | `var(--praxis-color-teal-70)` | `#42D9DE` |
| `--praxis-color-surface-default` | `var(--praxis-color-white)` | `#192336` |
| `--praxis-color-surface-subtle` | `var(--praxis-color-neutral-10)` | `#161c27` |
| `--praxis-color-text-disabled` | `var(--praxis-color-neutral-40)` | `#62707e` |
| `--praxis-color-text-inverse` | `var(--praxis-color-white)` | — |
| `--praxis-color-text-link` | `var(--praxis-color-teal-60)` | `#5CE0E5` |
| `--praxis-color-text-primary` | `var(--praxis-color-neutral-90)` | `#e7ebf1` |
| `--praxis-color-text-secondary` | `var(--praxis-color-neutral-60)` | `#9aa7b4` |
| `--praxis-color-text-tertiary` | `#616f7e` | `#8b98a6` |
| `--praxis-color-status-danger` | `var(--praxis-color-red-60)` | `#ed7b82` |
| `--praxis-color-status-info` | `var(--praxis-color-blue-60)` | `#7a93e0` |
| `--praxis-color-status-success` | `var(--praxis-color-green-60)` | `#3ecf8e` |
| `--praxis-color-status-warning` | `var(--praxis-color-orange-70)` | `#ffa32e` |
| `--praxis-color-border-subtle` | `var(--praxis-color-neutral-10)` | `#222b39` |
| `--praxis-color-surface-muted` | `var(--praxis-color-neutral-10)` | `#222b39` |


#### Tone pairs


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-tone-neutral-bg` | `var(--praxis-color-neutral-15)` | `rgba(255,255,255,.08)` |
| `--praxis-tone-neutral-fg` | `var(--praxis-color-neutral-70)` | `#9aa7b4` |
| `--praxis-tone-info-bg` | `var(--praxis-color-blue-10)` | `rgba(71,102,235,.18)` |
| `--praxis-tone-info-fg` | `var(--praxis-color-blue-70)` | `#8aa0f5` |
| `--praxis-tone-success-bg` | `var(--praxis-color-green-10)` | `rgba(9,139,83,.16)` |
| `--praxis-tone-success-fg` | `var(--praxis-color-green-70)` | `#4cd08a` |
| `--praxis-tone-warning-bg` | `var(--praxis-color-orange-10)` | `rgba(239,129,0,.16)` |
| `--praxis-tone-warning-fg` | `var(--praxis-color-orange-90)` | `#f5b45c` |
| `--praxis-tone-danger-bg` | `var(--praxis-color-red-10)` | `rgba(226,45,56,.18)` |
| `--praxis-tone-danger-fg` | `var(--praxis-color-red-70)` | `#f28b91` |


#### Palette


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-neutral-05` | `#f4f5f6` | `#10151e` |
| `--praxis-color-neutral-10` | `#edf0f2` | `#222b39` |
| `--praxis-color-neutral-100` | `#202a35` | — |
| `--praxis-color-neutral-15` | `#dadfe4` | `#2a3342` |
| `--praxis-color-neutral-20` | `#c8cfd7` | `#3a4556` |
| `--praxis-color-neutral-30` | `#adb8c4` | — |
| `--praxis-color-neutral-40` | `#8898a9` | — |
| `--praxis-color-neutral-50` | `#718499` | — |
| `--praxis-color-neutral-60` | `#4d657f` | — |
| `--praxis-color-neutral-70` | `#465c74` | — |
| `--praxis-color-neutral-80` | `#37485a` | — |
| `--praxis-color-neutral-90` | `#2a3846` | — |
| `--praxis-color-white` | `#ffffff` | — |
| `--praxis-color-blue-10` | `#edf0fd` | — |
| `--praxis-color-blue-50` | `#6882ef` | — |
| `--praxis-color-blue-60` | `#4766eb` | `#7a93e0` |
| `--praxis-color-green-10` | `#e6f3ee` | — |
| `--praxis-color-green-60` | `#098b53` | — |
| `--praxis-color-orange-10` | `#fdf2e6` | — |
| `--praxis-color-orange-60` | `#ef8100` | `#ffa94d` |
| `--praxis-color-pink-50` | `#e82e8b` | — |
| `--praxis-color-pink-60` | `#e30072` | — |
| `--praxis-color-pink-90` | `#810041` | — |
| `--praxis-color-red-10` | `#fceaeb` | — |
| `--praxis-color-red-50` | `#e7535c` | — |
| `--praxis-color-red-60` | `#e22d38` | — |
| `--praxis-color-teal-10` | `#e8f3f3` | `#12313c` |
| `--praxis-color-teal-20` | `#c8e1e3` | `#16404c` |
| `--praxis-color-teal-50` | `#4499a0` | — |
| `--praxis-color-teal-60` | `#1b838b` | — |
| `--praxis-color-teal-70` | `#176f76` | — |
| `--praxis-color-teal-80` | `#135d63` | `#5CE0E5` |
| `--praxis-color-yellow-10` | `#fdf9e6` | — |
| `--praxis-color-yellow-50` | `#f2d02e` | — |
| `--praxis-color-yellow-90` | `#887100` | — |
| `--praxis-color-blue-100` | `#202e6a` | — |
| `--praxis-color-blue-20` | `#d3dafa` | — |
| `--praxis-color-blue-30` | `#b0bdf6` | — |
| `--praxis-color-blue-40` | `#8b9ff2` | — |
| `--praxis-color-blue-70` | `#3c57c8` | — |
| `--praxis-color-blue-80` | `#3248a7` | — |
| `--praxis-color-blue-90` | `#283a86` | — |
| `--praxis-color-green-100` | `#043f25` | — |
| `--praxis-color-green-20` | `#c4e3d6` | — |
| `--praxis-color-green-30` | `#95cdb5` | — |
| `--praxis-color-green-40` | `#64b693` | — |
| `--praxis-color-green-50` | `#35a072` | — |
| `--praxis-color-green-70` | `#087647` | — |
| `--praxis-color-green-80` | `#06633b` | — |
| `--praxis-color-green-90` | `#054f2f` | — |
| `--praxis-color-orange-100` | `#6c3a00` | — |
| `--praxis-color-orange-20` | `#fbe1c2` | — |
| `--praxis-color-orange-30` | `#f8c991` | — |
| `--praxis-color-orange-40` | `#f5b05e` | — |
| `--praxis-color-orange-50` | `#f2982e` | — |
| `--praxis-color-orange-70` | `#cb6e00` | — |
| `--praxis-color-orange-80` | `#aa5c00` | — |
| `--praxis-color-orange-90` | `#884a00` | — |
| `--praxis-color-pink-10` | `#fce6f1` | — |
| `--praxis-color-pink-100` | `#660033` | — |
| `--praxis-color-pink-20` | `#f8c2dd` | — |
| `--praxis-color-pink-30` | `#f391c2` | — |
| `--praxis-color-pink-40` | `#ed5ea6` | — |
| `--praxis-color-pink-70` | `#c10061` | — |
| `--praxis-color-pink-80` | `#a10051` | — |
| `--praxis-color-red-100` | `#661419` | — |
| `--praxis-color-red-20` | `#f8cdcf` | — |
| `--praxis-color-red-30` | `#f3a5a9` | — |
| `--praxis-color-red-40` | `#ed7b82` | — |
| `--praxis-color-red-70` | `#c02630` | — |
| `--praxis-color-red-80` | `#a02028` | — |
| `--praxis-color-red-90` | `#811a20` | — |
| `--praxis-color-teal-100` | `#0c3b3f` | — |
| `--praxis-color-teal-30` | `#9dcacd` | — |
| `--praxis-color-teal-40` | `#6fb1b6` | — |
| `--praxis-color-teal-90` | `#0f4b4f` | — |
| `--praxis-color-yellow-100` | `#6c5900` | — |
| `--praxis-color-yellow-20` | `#fbf1c2` | — |
| `--praxis-color-yellow-30` | `#f8e691` | — |
| `--praxis-color-yellow-40` | `#f5db5e` | — |
| `--praxis-color-yellow-60` | `#efc600` | — |
| `--praxis-color-yellow-70` | `#cba800` | — |
| `--praxis-color-yellow-80` | `#aa8d00` | — |
| `--praxis-color-purple-60` | `#805ad5` | `#b088e8` |


---

## Materials and glass

The --px-* surfaces, shadows and washes that carry the Praxis look, plus the glass recipe for drawers and floating panels.

The `--px-*` layer is where the Praxis look actually lives. It is not in `praxis-tokens.css` — every one of these is declared in `praxis-core.css` under `body[data-variant="praxis"]`, twice, once per theme. That is the single most common reason someone greps the token file for `--px-surface` and concludes it does not exist.

### The material layer


| Token | Light | Dark |
|---|---|---|
| `--px-card-rail` | `0 0 0 .5px rgba(16,36,58,.055),0 1px 1px rgba(16,36,58,.035),inset 0 .5px 0 rgba(255,255,255,.6)` | `0 0 0 .5px rgba(255,255,255,.07),0 1px 2px rgba(0,0,0,.30),inset 0 .5px 0 rgba(255,255,255,.05)` |
| `--px-card-raised` | `0 0 0 .5px rgba(16,36,58,.07),0 1px 2px rgba(16,36,58,.05),0 2px 6px -2px rgba(16,36,58,.06),0 24px 48px -22px rgba(16,36,58,.20),inset 0 .5px 0 rgba(255,255,255,.85)` | `0 0 0 .5px rgba(255,255,255,.11),0 1px 2px rgba(0,0,0,.45),0 4px 10px -3px rgba(0,0,0,.40),0 32px 60px -24px rgba(0,0,0,.75),inset 0 .5px 0 rgba(255,255,255,.10)` |
| `--px-chip` | `#EEF1F4` | `rgba(255,255,255,.07)` |
| `--px-dot` | `rgba(16,36,58,.11)` | `rgba(255,255,255,.09)` |
| `--px-dot-clear` | `192px` | — |
| `--px-drawer` | `#ffffff` | `#0e1324` |
| `--px-edge` | `rgba(255,255,255,.6)` | `rgba(255,255,255,.08)` |
| `--px-field` | `#EEF1F4` | `#262F3F` |
| `--px-field-hover` | `#E6EAEF` | `#2C3646` |
| `--px-glass` | `rgba(255,255,255,.82)` | `rgba(26,32,45,.72)` |
| `--px-gutter` | `16px` | — |
| `--px-hover` | `rgba(16,36,58,.025)` | `rgba(255,255,255,.05)` |
| `--px-hover-btn` | `rgba(16,36,58,.075)` | `rgba(255,255,255,.10)` |
| `--px-overlay` | `0 0 0 .5px rgba(16,36,58,.06),0 2px 6px rgba(16,36,58,.06),0 18px 38px -16px rgba(16,36,58,.18)` | `0 0 0 .5px rgba(255,255,255,.08),0 2px 6px rgba(0,0,0,.4),0 24px 50px -20px rgba(0,0,0,.7)` |
| `--px-page` | `#F0F2F4` | `rgb(14,19,36)` |
| `--px-primary-fg` | `#fff` | `#08313a` |
| `--px-primary-grad` | `linear-gradient(180deg,#197b83,#156f77)` | `linear-gradient(180deg,#29d2d7,#1fb4b9)` |
| `--px-primary-shadow` | `0 0 0 .5px rgba(16,36,58,.2),0 1px 2px rgba(16,36,58,.15),0 8px 18px -8px rgba(25,123,131,.5),inset 0 .5px 0 rgba(255,255,255,.28)` | `0 0 0 .5px rgba(41,210,215,.30),0 1px 2px rgba(0,0,0,.45),0 8px 18px -8px rgba(41,210,215,.45),inset 0 1px 0 rgba(255,255,255,.22)` |
| `--px-scroll` | `rgba(16,36,58,.28)` | `rgba(255,255,255,.26)` |
| `--px-scroll-hover` | `rgba(16,36,58,.45)` | `rgba(255,255,255,.42)` |
| `--px-surface` | `#ffffff` | `#192336` |
| `--px-surface-2` | `#F4F6F8` | `#232c3b` |
| `--px-tool` | `#ffffff` | `rgba(255,255,255,.06)` |
| `--px-tool-shadow` | `0 0 0 .5px rgba(16,36,58,.07),0 1px 2px rgba(16,36,58,.05)` | `0 0 0 .5px rgba(255,255,255,.08),0 1px 2px rgba(0,0,0,.35)` |
| `--px-tool-shadow-hover` | `0 0 0 .5px rgba(16,36,58,.09),0 2px 8px -2px rgba(16,36,58,.16)` | `0 0 0 .5px rgba(255,255,255,.12),0 4px 12px -2px rgba(0,0,0,.5)` |
| `--px-toolbar-gutter` | `16px` | — |


#### How to choose

| Reaching for | Use |
|---|---|
| The page itself | `--px-page` |
| A card or panel on the page | `--px-surface`, then `--px-surface-2` for one nested inside it |
| A form field fill | `--px-field`, `--px-field-hover`. The field has no border, so this is the entire affordance. |
| A hover wash on a large row target | `--px-hover` — a 2.5% wash |
| A hover wash on a small raised control | `--px-hover-btn` — stronger, because the target is smaller |
| Three elevation tiers: recede, default, subject | `--px-card-rail`, `--praxis-card`, `--px-card-raised` |
| A toolbar or floating control | `--px-tool`, `--px-tool-shadow`, `--px-tool-shadow-hover` |
| A filled primary action | `--px-primary-grad` with `--px-primary-fg` as the ink. Never white ink on this fill. |

### Glass

A frosted translucent surface for drawers and floating panels. Three pages each had their own slightly different recipe before this was centralised; use the tokens rather than inventing a fourth.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-glass-bg` | `rgba(255,255,255,.5)` | `rgba(30,38,52,.52)` |
| `--praxis-glass-drawer` | `rgba(255,255,255,.82)` | `rgba(28,35,48,.86)` |
| `--praxis-glass-border` | `rgba(255,255,255,.6)` | `rgba(255,255,255,.14)` |
| `--praxis-glass-blur` | `blur(22px) saturate(1.8)` | `blur(24px) saturate(1.6)` |
| `--praxis-glass-inset` | `inset 0 1px 0 rgba(255,255,255,.6)` | `inset 0 1px 0 rgba(255,255,255,.06)` |
| `--praxis-glass-sheen` | `linear-gradient(135deg,rgba(255,255,255,.45),rgba(255,255,255,0))` | `linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,0))` |
| `--praxis-glass-shadow` | `0 10px 32px -14px rgba(16,26,40,.45)` | `0 14px 36px -14px rgba(0,0,0,.6)` |
| `--praxis-glass-hover` | `rgba(255,255,255,.28)` | `rgba(255,255,255,.06)` |
| `--praxis-glass-on` | `rgba(27,131,139,.16)` | `rgba(41,210,215,.16)` |


```html
<div style="position:relative;height:150px;border-radius:var(--praxis-radius-md);overflow:hidden">
  <div style="position:absolute;inset:0;background:var(--px-dot,transparent);
              background-image:radial-gradient(var(--praxis-color-teal-60) 1px,transparent 1px);
              background-size:18px 18px;opacity:.35"></div>
  <div style="position:absolute;left:1.5rem;top:1.5rem;right:1.5rem;padding:1rem;
              background:var(--praxis-glass-drawer);
              backdrop-filter:var(--praxis-glass-blur);
              border:1px solid var(--praxis-glass-border);
              border-radius:var(--praxis-radius-md);
              box-shadow:var(--praxis-glass-shadow),var(--praxis-glass-inset)">
    <strong style="font-size:var(--praxis-type-size-md)">Glass drawer</strong>
    <p style="margin:.25rem 0 0;color:var(--praxis-color-text-secondary)">
      Toggle the theme to see the dark recipe. The blur and the sheen both change, not
      just the tint.</p>
  </div>
</div>
```

### Praxis-only layout hooks

Declared under the variant and nowhere else. These are the ones a page reads or sets rather than consumes.


| Token | Light |
|---|---|
| `--home-gutter` | `var(--px-gutter)` |
| `--ph-pad-x` | `var(--px-gutter)` |
| `--praxis-card` | `0 0 0 .5px rgba(16,36,58,.06),0 1px 1.5px rgba(16,36,58,.045),0 10px 28px -14px rgba(16,36,58,.10),inset 0 .5px 0 rgba(255,255,255,.7)` |
| `--praxis-color-purple-60` | `#805ad5` |
| `--sp-gutter` | `var(--px-gutter)` |


---

## Type

A nine-step size scale on a deliberately dense 14px semibold base, and the font stack Praxis asks for but does not ship.

Body type is **14px at weight 600** — a deliberately dense, semibold base. Do not "fix" it to 16/400. The density is a decision about screens that show a hundred records at once, and the weight is what keeps a small size legible against the page texture.

### The scale


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-type-size-base` | `0.875rem` | — |
| `--praxis-type-size-lg` | `1.125rem` | — |
| `--praxis-type-size-md` | `1rem` | — |
| `--praxis-type-size-sm` | `0.8125rem` | — |
| `--praxis-type-size-xl` | `1.25rem` | — |
| `--praxis-type-size-xs` | `0.75rem` | — |
| `--praxis-type-size-2xl` | `1.5rem` | — |
| `--praxis-type-size-2xs` | `0.6875rem` | — |
| `--praxis-type-size-3xl` | `1.875rem` | — |


### The font stack


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-type-font-sans` | `'Gilroy','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif` | — |


Praxis sets `font-family: 'Gilroy'` and ships **no font files**. Gilroy is licensed and cannot be redistributed, so the build strips the `@font-face` blocks and emits `praxis-fonts.example.css` instead, showing how to point the same family at your own licensed copy. The build fails if a font binary ever enters the package.

Without Gilroy you get the fallback stack — `'Segoe UI'`, Roboto, Helvetica Neue, Arial — which is what this site is rendering unless you happen to have Gilroy installed locally. Metrics are close enough that the layout is unaffected; only the letterforms change.

### In use

```html
<div class="card" style="padding:1.25rem;max-width:34rem">
  <p style="font-size:var(--praxis-type-size-3xl);margin:0 0 .25rem;line-height:1.2">Forklift near-miss, bay 4</p>
  <p style="font-size:var(--praxis-type-size-xl);margin:0 0 .75rem;color:var(--praxis-color-text-secondary)">Incident management</p>
  <p style="font-size:var(--praxis-type-size-base);margin:0 0 .5rem">
    Body copy sits at <code>base</code>, 14px, weight 600. This is the size almost
    everything on a record page is set in.</p>
  <p style="font-size:var(--praxis-type-size-sm);margin:0 0 .5rem;color:var(--praxis-color-text-secondary)">
    <code>sm</code> is the field label size, 13px.</p>
  <p style="font-size:var(--praxis-type-size-xs);margin:0;color:var(--praxis-color-text-tertiary)">
    <code>xs</code> and <code>2xs</code> are for hints and metadata only. Below
    <code>xs</code>, check it against the page texture in dark before you commit.</p>
</div>
```

---

## Space, radius and chrome

A 4-to-48 spacing scale, the 8/12/16 radius scale, and the fixed chrome metrics the four-band shell is built from.

### Space


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-space-12` | `.75rem` | — |
| `--praxis-space-16` | `1rem` | — |
| `--praxis-space-24` | `1.5rem` | — |
| `--praxis-space-32` | `2rem` | — |
| `--praxis-space-4` | `.25rem` | — |
| `--praxis-space-8` | `.5rem` | — |
| `--praxis-space-20` | `1.25rem` | — |
| `--praxis-space-40` | `2.5rem` | — |
| `--praxis-space-48` | `3rem` | — |


### Radius

The Praxis radius scale is 8/12/16. Note that `lg` and `xl` are both 16px — `xl` exists for callers that expect a five-step scale, not because there is a fifth value.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-radius-full` | `9999px` | — |
| `--praxis-radius-lg` | `16px` | — |
| `--praxis-radius-md` | `12px` | — |
| `--praxis-radius-sm` | `8px` | — |
| `--praxis-radius-card` | `20px` | — |
| `--praxis-radius-xl` | `16px` | — |


**`--praxis-radius-card` is 20px in the token file and 12px under Praxis.** The Praxis override is the one that renders, so 12px is the card geometry. The resolved columns above show the real value; see [the nine overrides](#the-praxis-variant-overrides-nine-tokens) for the rest.

### Chrome metrics

The four bands of [the app shell](#the-app-shell) are fixed heights, and the dot grid's clearance is derived from their sum. Change a band by changing the token, once — not one page — or the texture will cut across your header.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-record-rail-w` | `300px` | — |
| `--praxis-control-h` | `32px` | — |
| `--praxis-navrail-width` | `56px` | — |
| `--praxis-navrail-width-expanded` | `240px` | — |
| `--praxis-appbar-h` | `64px` | — |


| Band | Size | Token |
|---|---|---|
| App bar | 64px tall | `--praxis-appbar-h`, and `--appbar-h` locally |
| Nav rail | 56px wide, 240px expanded | `--praxis-navrail-width`, `--praxis-navrail-width-expanded` |
| Page header | 68px min | `--ph-h` |
| Toolbar band | 60px min | `--px-toolbar-h` |

Page content therefore starts at **192px**, and `--px-dot-clear` is set to exactly that so the dot grid stops short of the chrome.

### Gutters

`--px-toolbar-gutter` is the canonical 16px gap between the toolbar band and the first card of content. It exists because that gap was set per section and drifted — 8px on one page, 6px on another. `--ph-pad-x` is declared on `.content` and inherited by the header, the toolbar band and your body, so changing it once resets the page rhythm.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--px-gutter` | `16px` | — |
| `--px-toolbar-gutter` | `16px` | — |
| `--home-gutter` | `var(--px-gutter)` | — |
| `--ph-pad-x` | `var(--px-gutter)` | — |
| `--sp-gutter` | `var(--px-gutter)` | — |


Four of those read *unset* in the resolved columns, and both reasons are correct rather than broken:

- `--px-gutter`, `--home-gutter` and `--sp-gutter` are declared **only inside a media query**. They exist at 640px and below and nowhere else. The table below is measured every build.
- `--ph-pad-x` is declared on **`.content`**, in `praxis-admin.css`, not on `<body>`. The header, the toolbar band and your page body inherit it from there — which is what makes changing it once reset the whole page rhythm. A probe reading `<body>` cannot see a token declared on a descendant.


| Token | Declared only inside |
|---|---|
| `--home-gutter` | `@media (max-width:640px)` |
| `--px-gutter` | `@media (max-width:640px)` |
| `--sp-gutter` | `@media (max-width:640px)` |


---

## Elevation and motion

Four generic shadow steps remapped to materials under Praxis, five durations, and the spring easings including the one the drawers depend on.

### Elevation

Steps 1 to 4 are generic. `card`, `card-raised` and `popover` are remapped to `--px-*` materials under Praxis, so reach for those three by name and let the variant decide the recipe.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-elevation-1` | `0 1px 2px 0 rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-2` | `0 1px 3px 0 rgb(32 42 53 / .1), 0 1px 2px -1px rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-3` | `0 4px 6px -1px rgb(32 42 53 / .1), 0 2px 4px -2px rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-4` | `0 10px 15px -3px rgb(32 42 53 / .1), 0 4px 6px -4px rgb(32 42 53 / .05)` | — |
| `--praxis-elevation-card` | `0 2px 16px -4px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.1)` | — |
| `--praxis-elevation-card-raised` | `0 8px 24px -6px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0, 0, 0, 0.1)` | — |
| `--praxis-elevation-popover` | `0 4px 6px rgba(32, 42, 53, 0.07), 0 10px 15px rgba(32, 42, 53, 0.08)` | — |


```html
<div style="display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
  <div style="padding:1rem;border-radius:var(--praxis-radius-md);background:var(--px-surface);box-shadow:var(--px-card-rail)">Rail — recedes</div>
  <div style="padding:1rem;border-radius:var(--praxis-radius-md);background:var(--px-surface);box-shadow:var(--praxis-card)">Card — default</div>
  <div style="padding:1rem;border-radius:var(--praxis-radius-md);background:var(--px-surface);box-shadow:var(--px-card-raised)">Raised — the subject</div>
</div>
```

### Duration


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-motion-normal` | `180ms` | — |
| `--praxis-motion-slow` | `260ms` | — |
| `--praxis-motion-fast` | `120ms` | — |
| `--praxis-motion-slowest` | `420ms` | — |
| `--praxis-motion-drawer` | `280ms` | — |


### Easing

`--praxis-ease-default` is the Praxis spring, `cubic-bezier(.32,.72,0,1)`. Use it unless you have a reason not to.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-ease-default` | `cubic-bezier(.32,.72,0,1)` | — |
| `--praxis-ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | — |
| `--praxis-ease-spring-soft` | `cubic-bezier(.22,1,.36,1)` | — |
| `--praxis-ease-spring-out` | `cubic-bezier(.5,0,.75,0)` | — |
| `--praxis-ease-spring-bouncy` | `cubic-bezier(.175,.885,.32,1.275)` | — |


The Mazlan drawer's transitions once referenced `--dur-base`, `--ease-spring` and `--ease-spring-soft` with no fallback, and those three were defined on exactly one page. On every other page the declarations were invalid at computed-value time and the drawer had no transition at all. That is why `--praxis-motion-drawer` and the two spring easings are in the foundation rather than in the sheet that happens to use them.

### Component motion

The quick-filter rail and the profile menu each have their own duration and easing because their travel is much longer than a state change. Seven pages had defined the rail values identically, which is about as clear a signal as a token gets. The rail's *width* is deliberately not a token: it was genuinely different on every page, so it stays a per-page decision.


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-rail-duration` | `480ms` | — |
| `--praxis-rail-ease` | `cubic-bezier(.34,.01,.1,1)` | — |
| `--praxis-rail-travel` | `-56px` | — |
| `--praxis-menu-duration` | `520ms` | — |
| `--praxis-menu-ease` | `cubic-bezier(.4,0,.2,1)` | — |


### Reduced motion

Praxis does not blanket-disable animation under `prefers-reduced-motion` — the sheets that animate handle it themselves. If you add motion of your own, guard it. The duration tokens are not a substitute for the media query: setting one to `0ms` does not stop a transform.

---

## Theming

How the two body attributes drive everything, where dark mode is remapped, and why nearly every regression in this system is dark-only.

Praxis has one variant and two themes, and both are attributes on `<body>`. There is no class, no provider, no context. The cost of that simplicity is that both attributes are load-bearing: forget either and the page renders as something that is not Praxis.

### The two attributes

| Attribute | Values | What depends on it |
|---|---|---|
| `data-variant` | `praxis` | Every `--px-*` material, the dot grid, the 8/12/16 radius scale, the primary button, and the nine token overrides. Without it you get the unstyled base layer, not a fallback theme. |
| `data-theme` | `light`, `dark` | Every dark remap. Absent, dark mode never engages regardless of the system setting. |

### The cascade, in order

1. `praxis-tokens.css` declares the foundation on `:root`.
2. `praxis-core.css` layers the Praxis light values, the `--px-*` materials and the dark remaps on `body[data-variant="praxis"]`.
3. Because that selector outranks `:root` on specificity, step 2 wins regardless of load order. Loading tokens first anyway means the cascade reads the way it behaves.

There are two dark blocks, not one. `body[data-theme="dark"]` recolors the token-driven basics and applies to any variant; `body[data-variant="praxis"][data-theme="dark"]` adds the Praxis surfaces, glass, tone pairs and the teal remap.

### Setting the theme before first paint

The script must be the first thing inside `<body>`. It cannot run from `<head>`, because the attribute lives on `<body>`, which does not exist yet at that point. Put it later and the page paints light before turning dark — a visible flash on every navigation.

```html
<body data-variant="praxis" data-theme="light">
<script>
  try {
    var t = localStorage.getItem('gl-theme');
    if (t) document.body.setAttribute('data-theme', t);
  } catch (e) {}
</script>
```

### Toggling

`praxis-profile-menu.js` renders a theme switch into the profile pop and writes `localStorage['gl-theme']` when the user uses it. If you build your own control, write the same key or your boot script will not see it. See [the app shell](#the-app-shell) for the menu markup.

### Dark is where the bugs are

**Toggle to dark and look at it.** Most regressions in this system are dark-only, and they fall into three shapes: a token with no dark treatment, a light-mode ink placed on a dark panel, and white text on a cyan fill.

Three real instances, all fixed in the theme rather than in the page that hit them:

- **The teal scale had no dark treatment at all,** so four pages each patched it locally. `teal-80` is a light-mode ink and measured 1.55:1 on a dark panel — illegible — while `teal-10` and `teal-20` are near-white and glared as light blocks.
- **`--praxis-color-border-subtle` resolved to nothing on 23 of 27 pages,** because its only definition lived in a legacy sheet that four pages loaded. A foundation layer has to carry the whole ramp, not the subset the current screens happen to use.
- **The tone foregrounds are literals on dark, not palette references,** because the palette's 70 steps are tuned for light surfaces and go muddy.

### What resolves identically in both themes

Very little. `--praxis-color-white` and most palette primitives — but not all of them: the dark theme remaps `neutral-05` through `neutral-20` and three teal rungs. The [color page](#color) shows every rung in both themes side by side, so you can see which move rather than assuming.

---

## Icons

Two icon vocabularies that both work, one script that makes them agree, and the specificity gotcha that will cost you an hour.


Script: `praxis-lucide.js`
Praxis accepts two icon vocabularies and `praxis-lucide.js` is what makes them agree. Both of the following render the same glyph.

```html
<div style="display:flex;gap:1.5rem;align-items:center">
  <span class="material-symbols-rounded">crisis_alert</span>
  <i data-lucide="triangle-alert"></i>
  <span class="material-symbols-rounded">assignment</span>
  <span class="material-symbols-rounded">notifications</span>
  <span class="material-symbols-rounded">expand_more</span>
  <i data-lucide="search"></i>
</div>
```

### How it works

The script maps around 500 Material Symbols ligatures to Lucide names, rewrites the spans to `<svg>`, and re-runs on a debounced `MutationObserver` so icons you inject later convert too. It loads a pinned Lucide from beside itself, so over a CDN it needs no extra tag. Point it elsewhere with `window.PRAXIS_LUCIDE_SRC` before loading it.

Pinning matters: the fallback originally asked for `lucide@latest`, an unpinned dependency that could change under consumers without warning. The package build rewrites it to this package's own bundled copy and fails if the unpinned reference ever comes back.

### The gotcha

**A converted span cannot be reliably restyled from your stylesheet.** The converter injects `svg.material-symbols-rounded{…}` at specificity (0,1,1), which outranks a plain class selector. Size it through the existing `.material-symbols-rounded{font-size:Npx}` convention, or give the element its own wrapper and style that.

### Without the script

If you do not load `praxis-lucide.js`, a `.material-symbols-rounded` span renders its ligature text as literal words — "crisis_alert" in the flow of your toolbar. That is the symptom to recognise; it is not a missing font, it is a missing script.

```html
<div style="display:flex;gap:1.5rem;align-items:center">
  <span class="material-symbols-rounded">crisis_alert</span>
  <i data-lucide="triangle-alert"></i>
</div>
```

---

## What Praxis does not define

Class names that appear in Praxis selectors and so look supported, but have no base definition. If you use one, you write it.

These class names appear in Praxis selectors, which makes them look supported. They have no base definition. The distinction matters because the failure is silent: your `.btn` picks up the Praxis primary fill and none of the box it needs, so it renders as colored text.

Verified by hand against `src/` at 0.1.9. The generated tables further down are measured every build.

### Classes with no base

| Class | Status |
|---|---|
| `.btn` | No base. `.btn--primary` styles the fill only. `praxis-filters.css` says outright that its variants sit "on top of the host's `.btn` set". |
| `.section`, `.section__header`, `.section__title` | No base. Praxis only adds the teal tick, the flex `order` across the header, and the collapse rotation. Layout is yours. |
| `.chevron-btn` | No base. Positioned by the section-header rules only. |
| `.callout`, `.toggle`, `.viewswitch`, `.chip` | No base outside `praxis-filters.css`'s own scoped `.chip`. |
| `.px-menu`, `.px-menu__head` | **Not defined**, but referenced by `praxis-navrail.css` for the dashboards flyout. Use `.px-pop` (defined in `praxis-admin.css`) instead. |
| `.field` | Only the Praxis rule correcting `::before` alignment and raising rows to 64px. The base row is not here. |
](#the-app-shell)| `.page-body` | Yours entirely. The name appears in the shell markup but Praxis styles nothing on it — see [the app shell for the two rules you must write. |
| `.card` | No base. `praxis-workspace.css` gives it the slate shadow and 12px radius and nothing else — no fill, no padding. Reach for `.admin-card`, which is complete. |
| `.gl-theme-btn`, `.gl-sun`, `.gl-moon` | No base. The `[data-theme]` swap between the two glyphs works, and the button around them has no size, shape or hit area. Put the class on an `.appbar__iconbtn` for the geometry — that is what this site does. |

### Four gaps this site had to fill

The reference site is itself a Praxis page — the app bar, the labelled side nav, the page header, the toolbar band, the cards, the tables and the status pills are all the real components. Writing it that way is the most direct test of the system there is, and it found exactly four things it could not ask Praxis for.

| What was needed | Closest Praxis has |
|---|---|
| **Long-form prose.** Headings, paragraph rhythm, prose lists, inline code, blockquotes. | Nothing. Praxis is an application design system and styles no document text at all. This is the largest thing the site writes for itself, and it is the right answer — an app has labels, not articles. |
| **A callout box.** A framed aside carrying a status tone. | `.admin-note` is italic prose with no frame, and `.admin-banner` is a page-level bar. The status *tones* exist as `--praxis-tone-*`, so only the box is missing. |
| **A secondary label above a value.** "Previous" over a page title. | `.admin-setting-row__label` is the right treatment bound to the wrong parent — it only works inside a settings row. |
| **A brand lockup.** Mark, wordmark, version. | `.appbar__brand` positions it and expects a logo image. The teal→pink mark is the one piece of brand the palette does not express as a token. |

### Tokens read but never defined

Measured every build. Each falls back safely; set one to control that spacing.


| Token |
|---|
| `--muted` |
| `--ph-pad-top` |
| `--praxis-filters-gutter` |


`--px-phone` is named in a comment as 640px but is not defined as a token either. That breakpoint is hard-coded in the media queries.

### Families Praxis never keys a rule on

Also measured every build: class families that appear in `src/` only as a modifier or a descendant, never as a bare selector. This is a weaker signal than the hand verified table above — `.btn:hover` counts as keyed while styling nothing at rest — but anything listed here has no rule of its own at all, which makes it a strong candidate for the same treatment.


| Family | Mentioned in |
|---|---|
| `.admin-preview` | `praxis-admin.css` |
| `.capa-prio` | `praxis-core.css` |
| `.colmenu` | `praxis-toolbar-compact.css` |
| `.fields` | `praxis-toolbar-compact.css` |
| `.mazlan-source` | `praxis-mazlan.css` |
| `.mz-input` | `praxis-core.css` |
| `.nav-menu-drawer` | `praxis-core.css` |
| `.pager` | `praxis-core.css` |
| `.panel` | `praxis-toolbar-compact.css` |
| `.persona-picker` | `praxis-workspace.css` |
| `.px-menu` | `praxis-admin.css`, `praxis-navrail.css` |
| `.rep` | `praxis-core.css` |
| `.ss-sec` | `praxis-admin.css` |
| `.subtab` | `praxis-core.css` |
| `.summary` | `praxis-rfield.css` |
| `.tb-display` | `praxis-toolbar-compact.css` |
| `.upnext` | `praxis-core.css` |


### Excluded on purpose

Not missing — removed, with reasons recorded in `dist/manifest.json`. Each was bound to the prototype Praxis was extracted from rather than to the system. See [what actually ships](#what-actually-ships).

---

## Corrections to DESIGN-SYSTEM.md

Where the older reference has gone stale. Trust this site over that document on these points — and each claim here is re-verified against src/ on every build.

`DESIGN-SYSTEM.md` is the design-rationale document: read it for *why* a component looks the way it does. Its measured tables are regenerated by `npm run docs` and are current. Its **prose** predates the extraction of Praxis into a package, and on the points below it is wrong about what exists.

Everything on this page is checked against `src/` at build time, so if one of these is ever fixed the build fails rather than this page quietly telling you not to use something that now works.

### Tokens it lists that do not exist

Section 6 lists three whole token families that nothing in `src/` defines. Use `font-weight`, `line-height` and `letter-spacing` directly; the body default is **600**.


| Claimed absent | Verified |
|---|---|
| `--praxis-type-weight-*` | still absent |
| `--praxis-type-leading-*` | still absent |
| `--praxis-type-tracking-*` | still absent |
| `--praxis-space-0` | still absent |
| `--praxis-space-64` | still absent |
| `--praxis-space-96` | still absent |


### Scales it describes wrongly

| It says | Actually |
|---|---|
](#space-radius-and-chrome)| Space runs `--praxis-space-0…96` | **Nine steps, 4 to 48.** There is no `space-0`, `space-64` or `space-96` — see the table above. The real scale is on [Space, radius and chrome. |
](#type)| The type scale is `2xs…3xl` at 11/12/13/14/16/18/20/24/30 **px** | The tokens are **rem** values, and there is no numeric name like `--praxis-type-size-18`. The step names are right; the units and the numeric aliases are not. See [Type. |
](#what-praxis-does-not-define)| §8 calls `.px-menu` the "shared frosted flyout material" | **Not defined in the package.** Use `.px-pop`, from `praxis-admin.css`. Measured on [what Praxis does not define. |

### Its scope is a different repository

`DESIGN-SYSTEM.md` line 3 declares itself `scope: groom-lake prototype only`, and it means it. Its component inventory, file map and pattern sections describe that prototype's pages — `index.html`, `search-page.html`, `record-page*.html`, `api/records.js`, Upstash Redis, `build-admin.py`.

**None of that is in the package and none of it will be in your prototype.** Read the document for design rationale, not for structure. The structure you want is [the app shell](#the-app-shell).

### Sections 10 to 13 are not instructions

They are an audit history: dead-token counts, known bugs, a consolidation roadmap and a "highest-value outstanding work" list. Notes to the maintainers of this repository at a particular moment. Do not read them as guidance for building a page, and do not treat the roadmap as a description of what exists.

### Why this page exists rather than a fix

The honest answer is that `DESIGN-SYSTEM.md` is doing a different job. It carries the reasoning behind decisions — why the field affordance is a fill and not a border, why body type is 14px at 600 — and that reasoning is worth keeping even where the surrounding inventory has aged. Rewriting it as a second reference would produce a third thing to keep in step.

So: **this site is the reference, that document is the rationale**, and this page is the list of places where reading the rationale would mislead you about the reference. Everything measurable on it is verified on every build; the scope and audit-history points are judgements, and they are stated as such.

---

## Print

Zero @media print rules in src/. Regulated records are printed and PDF'd as evidence, which makes this a functional gap rather than a cosmetic one. Planned.

**Nothing is defined.** A grep for `@media print` across every sheet in `src/` returns zero. Foundation gap F1 on `ROADMAP.md`.

In nuclear, pharma and aviation a record is routinely printed or exported to PDF and handed to an inspector. That artefact is the deliverable, not a convenience — and today Praxis contributes nothing to it, so what comes out of the printer is whatever the browser makes of an application shell designed for a 1440px viewport.

### What actually happens today

Predictable, and all of it wrong:

- **The shell prints.** `.app` is `height:100vh` with `overflow:hidden`, so the printed output is one screenful and the rest of the record is simply absent. This is the serious one: a printed record that silently stops is worse than no print support.
- **Chrome consumes the page.** The app bar, the nav rail or side nav, the page header and the toolbar band are 192px of fixed chrome that nobody needs on paper.
- **The dot grid prints.** `body[data-variant="praxis"]` sets a `radial-gradient` texture with `background-attachment:fixed`. Most browsers drop backgrounds by default, which is luck rather than design.
- **Dark theme prints dark** if that is what the user was reading in.
- **Collapsed sections stay collapsed**, so a printed form omits whatever was closed.
- **Links lose their targets.** A reference that reads "see the finding" on paper points nowhere.

### What it should do

| Rule | Why |
|---|---|
| Force the light theme | Ink. Simply override the dark tokens inside the print block rather than asking the user to toggle first |
| Release the shell | `.app{height:auto;overflow:visible}`, `.admin-body{overflow:visible}`. Without this nothing else matters |
| Hide the chrome | App bar, nav rail, side nav, toolbar band, skip link, theme toggle |
| Keep the page header | The breadcrumb and title are the record's identity and belong at the top of the printout |
| Drop shadows and textures | Praxis carries almost all of its structure in `box-shadow`, which prints as nothing or as grey mud. Cards need a hairline in print |
| Expand collapsed regions | A printed record must be complete |
| Avoid breaking rows and cards | `break-inside: avoid` on `.admin-card`, table rows and `.rfield` |
| Repeat table headers | `thead{display:table-header-group}`. A five-page register with headers on page one is unreadable |
| Expose link targets | `a[href^="http"]::after{content:" (" attr(href) ")"}`, scoped to prose so it does not fire on every nav item |
](#audit-trail)| Print the audit trail as a table | The rail and markers are screen affordances. See [audit trail |

### Open decisions

- **Where the rules live.** One `praxis-print.css` that consumers opt into, or a `@media print` block at the end of each component sheet. A separate sheet is easier to reason about and easy to forget to link; blocks in each sheet cannot be forgotten and scatter the logic. Leaning towards a separate sheet included in the barrel.
- **Whether Praxis owns page margins and headers.** `@page` can set margins and running headers. That is arguably the application's decision, but if Praxis does not take it nobody will.
- **Whether a print view is a print stylesheet at all.** For a formal export, generating a document server-side gives control a stylesheet cannot. The honest scope for Praxis is "printing a screen produces something usable", not "printing produces the regulatory artefact".

### Why this is not just CSS

Two of the items above are coupled to other gaps. Collapsed [sections](#accordion) must expand, and that needs the disclosure component to expose its state in a way print can override. The [audit trail](#audit-trail) needs a print form designed alongside its screen form. Neither can be retrofitted afterwards, which is the argument for doing this while those components are still on paper.

---

## Forced colors and high contrast

Zero forced-colors support, in a system that carries nearly all of its structure in box-shadow. Shadows are dropped in that mode, so the shell loses its shape. Planned.

**Nothing is defined.** No `forced-colors` and no `prefers-contrast` anywhere in `src/`. Foundation gap F2 on `ROADMAP.md`.

Windows High Contrast — `forced-colors: active` — replaces the author's colours with a user-chosen system palette and **discards `box-shadow` entirely**. That is the problem, because Praxis's whole visual language is shadow.

This mode is common in industrial, government and defence environments, which is most of the EHSQ customer base, and it turns up in procurement accessibility questionnaires. It is also the single cheapest large accessibility win available to this system, because the fix is additive: one media block per component that draws a border where a shadow used to be.

### Why Praxis is unusually exposed

The material layer is built from shadows on purpose, and the comments in `praxis-core.css` say so: `--praxis-card`, `--px-tool-shadow`, `--px-overlay`, `--px-card-rail` and `--px-card-raised` are how a surface reads as raised, and `0 0 0 .5px` ring shadows are how most components draw their edge instead of using a border.

In forced-colors, every one of those disappears at once. The result is not a degraded look, it is a loss of structure:

| Component | What it loses |
|---|---|
| `.tbtn`, `.iconbtn`, `.filterfield` | All of it. These have `border:0` and a tool shadow, so they become unbounded text and glyphs |
| `.admin-card`, `.card` | Its edge. A page of cards becomes one undifferentiated block |
| `.px-pop`, `.tb-dropdown`, `.appswitch__pop` | Separation from the page beneath. Under the Praxis variant these explicitly set `border:0` and rely on `--px-overlay` |
| Praxis fields | Everything. Fields carry no border by design — `--px-field` is documented as "the whole affordance" — and a fill difference is exactly what forced-colors removes |
| The app shell | The nav rail is transparent with one border; the app bar has none. Both blend into the page by design |
](#loading)| [Skeletons | A fill with no border and no text vanishes completely |
| Status pills, stepper markers, tone chips | All fill-differentiated, so several states collapse into one |

### The shape of the fix

- **Draw borders where shadows were.** Inside `@media (forced-colors: active)`, give every shadow-bounded component `border:1px solid`. The colour is irrelevant — the UA replaces it — so `currentColor` or a system keyword is fine.
- **Use the system colour keywords** where a role must be conveyed: `ButtonBorder`, `ButtonText`, `Canvas`, `CanvasText`, `Highlight`, `HighlightText`, `LinkText`, `GrayText`.
- **Keep focus visible.** `forced-color-adjust` and the UA's own focus ring interact; the 29 `:focus-visible` rules in `src/` need checking, not assuming.
- **Add a non-colour differentiator to every state that is currently a fill.** Selected, complete, blocked and skipped cannot all be `Highlight`. This is the part that is design work rather than a media block.
- **Never use `forced-color-adjust: none`** except for something whose colour is the content — the palette swatches on [Color](#color) are the one legitimate case on this site.

### Open decisions

- **Where the rules live.** Same question as [print](#print), and the answer should be the same for both.
- **Whether to also honour `prefers-contrast: more`**, which is a separate signal with a different meaning — the user wants more contrast, not a replaced palette. Cheaper to support and less urgent.
- **How to test it.** Windows High Contrast is the reference implementation and neither macOS nor Linux reproduces it exactly, so this cannot be verified on the machine Praxis is developed on. That is worth saying plainly: without a test path, any claim here would be unverified.

### What already works

Not everything needs doing. `prefers-reduced-motion` is honoured in seven places and `:focus-visible` is used in 29, so the two adjacent accessibility signals are already handled. This is a gap, not a pattern of neglect.

---

## Right-to-left — an audit

82 physical left/right declarations against 12 logical ones. This page measures the cost of RTL support and commits to nothing.

**This page is an audit, not a plan.** Foundation gap F3 on `ROADMAP.md`, and deliberately scoped to measuring the cost rather than committing to the conversion. Nothing here should be read as a decision to support RTL.

Praxis has no RTL support and no `[dir="rtl"]` rule anywhere. Whether that matters is a product question about which markets EHSQ Enterprise sells into, not a design-system question. What a design system can usefully say is *what it would cost*, and that number grows every sprint, which is the reason to write it down now rather than when someone asks.

### The measurement

| Measure | Count | Note |
|---|---|---|
| Physical `left:` / `right:` declarations | **82** | Positioning, mostly on popovers, scrims, drawers and pseudo-element rules |
| Logical `*-inline` properties | 12 | `padding-inline` and `margin-inline`, added incidentally rather than as a policy |
| `[dir="rtl"]` rules | **0** |  |
| `text-align:left` / `right` | present throughout | `.admin-table__num` right-aligns numerals, which in RTL is a genuine design question, not a mechanical flip |

Counted from `src/` on 2026-08-25 with a grep for anchored declarations. The 82 is a floor, not a total: it excludes `transform:translateX`, directional `border-radius` shorthands, and background-position values, all of which also need attention.

### Where the cost actually is

Not evenly spread. Four areas hold most of it:

- **Popover and drawer positioning.** `.tb-dropdown{left:0}` with a `--right` modifier, `.px-navdrawer{left:0}` with `translateX(-100%)`, `.appswitch__pop`, `.qrail-pop`, `.persona-popover{right:calc(100% + 12px)}`. Each needs both a logical property and a flipped transform.
- **The shell.** The nav rail and side nav are on the left by construction, and the dot grid's left fade is keyed to `--navrail-w` in a `linear-gradient(to right, …)`. That gradient does not flip with a logical property.
- **Pseudo-element hairlines.** `.pageheader::after` and `.toolbar::after` use `left` and `right` together, which is `inset-inline` — an easy mechanical fix, and there are many of them.
- **Chevrons and directional glyphs.** `chevron_right` in a breadcrumb must become `chevron_left`. That is a markup and icon-map problem, not a CSS one, and `praxis-lucide.js` would need to know about it.

### What would need to be true

1. A policy that new CSS uses logical properties, enforced by the build the way the `--ehsq-*` token ban already is. Without this the 82 keeps growing and any conversion is immediately stale.
2. A mechanical pass over the four areas above.
3. Design decisions that are not mechanical: numeral alignment in tables, whether the shell mirrors or stays left-anchored, and what happens to the dot-grid gradient.
4. A test path. There is no RTL example on this site and no consumer using one, so a conversion would be unverifiable today.

### The recommendation

Adopt item 1 now and nothing else. A lint rule that fails on a new physical `left:`/`right:` costs almost nothing, stops the number growing, and leaves the decision about items 2 to 4 with the product. Doing the conversion speculatively would be a large change to every sheet in service of a market need nobody has stated — and the four non-mechanical decisions cannot be made without that need being real.

---

## Fields

The record form system — the most exercised component in Praxis and the one place every page that shows data agrees.


Tier: **ready** · Sheet: `praxis-rfield.css`
A field is either **interactive** — this workflow step owns it — or **static**, because it belongs to a passed step or is read-only. They are deliberately different shapes, because the same record body is editable in one step and frozen in the next, and the user has to tell at a glance which is which.

### Anatomy

1. **Row** — `.rfield`, a label and a control side by side.
2. **Label** — `.rfield__label`, with `.req` for required.
3. **Control** — `.rfield__control`. Fields carry no border, so the `--px-field` fill is the whole affordance.
4. **Hint** — `.rfield__hint`, under the control.
5. **Alert** — `.form-alert`, the inline validation message.
6. **Group** — `.rfield__group`, several controls on one row.

#### Interactive versus static

|  | Interactive | Static |
|---|---|---|
| Layout | Label above, control below | Label beside value, 200px gutter |
| Class | `.rfield` | `.rfield--locked` |
| Height | 40px control | 64px row (`--px-static-field-h`) |
| Affordance | `--px-field` grey fill, no border | No fill, no border; hairline rules between rows |
| Type | Label 13px, value 14px | Both 14px / 21px line-height |
| Label | Sentence case, no colon | Terminates in a colon, added via `::after` |

```html
<div style="display:grid;gap:1.5rem;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr))">
  <div>
    <div class="rfield">
      <label class="rfield__label" for="title">Title <span class="req">*</span></label>
      <input class="rfield__control" id="title" type="text" value="Forklift near-miss, bay 4">
      <p class="rfield__hint">Shown in the record list.</p>
    </div>
    <div class="rfield">
      <label class="rfield__label" for="sev">Severity</label>
      <select class="rfield__control" id="sev">
        <option>Near miss</option>
        <option>Minor injury</option>
        <option>Lost time</option>
      </select>
    </div>
    <div class="rfield">
      <label class="rfield__label" for="desc">What happened</label>
      <textarea class="rfield__control" id="desc" rows="3">Pallet stack shifted as the truck turned into bay 4. No contact.</textarea>
    </div>
  </div>
  <div>
    <div class="rfield rfield--locked">
      <label class="rfield__label">Reported by</label>
      <input class="rfield__control" value="Marcus Silva" readonly>
    </div>
    <div class="rfield rfield--locked">
      <label class="rfield__label">Reported on</label>
      <input class="rfield__control" value="8 July 2026, 14:12" readonly>
    </div>
    <div class="rfield rfield--locked">
      <label class="rfield__label" data-label-nocolon>Was high energy present?</label>
      <input class="rfield__control" value="No" readonly>
    </div>
  </div>
</div>
```

`[data-label-nocolon]` opts a static label out of the automatic colon. Use it for labels that are already questions — "Was high energy present?**:**" is not an improvement.

### Variants

#### Groups

A `.rfield__group` puts fields side by side and stacks them automatically once locked, because a static row is already a two-column layout and nesting one inside another reads as noise.

```html
<div class="rfield__group">
  <div class="rfield">
    <label class="rfield__label" for="site">Site</label>
    <input class="rfield__control" id="site" type="text" value="Teesside works">
  </div>
  <div class="rfield">
    <label class="rfield__label" for="area">Area</label>
    <input class="rfield__control" id="area" type="text" value="Warehouse, bay 4">
  </div>
</div>
<div class="rfield__group">
  <div class="rfield rfield--locked">
    <label class="rfield__label">Shift</label>
    <input class="rfield__control" value="Late" readonly>
  </div>
  <div class="rfield rfield--locked">
    <label class="rfield__label">Supervisor</label>
    <input class="rfield__control" value="Aoife Byrne" readonly>
  </div>
</div>
```

#### Picklists

`.pill` wraps a real `<input type="radio">` **followed by a `<span>`** — the styling hangs off `input:checked + span`. Not `<button aria-checked>`: that carried no state and no keyboard model while looking selectable.

```html
<div class="rfield rfield--choice">
  <span class="rfield__label">Severity</span>
  <div class="pillset">
    <label class="pill"><input type="radio" name="sev2" checked><span>Near miss</span></label>
    <label class="pill"><input type="radio" name="sev2"><span>First aid</span></label>
    <label class="pill"><input type="radio" name="sev2"><span>Medical treatment</span></label>
    <label class="pill"><input type="radio" name="sev2"><span>Lost time</span></label>
  </div>
</div>
```

#### Reference field

`.rref__input` plus `.rref__btn` plus a `.rref__menu[hidden]` of `.rref__opt` buttons. Options live in markup so each page configures its own list. Typing filters; only click or Enter commits; blur reverts uncommitted free text.

Store the committed value in `data-committed` on the element, not in a closure, so a value restored from storage survives the next blur.

```html
<div class="rfield">
  <label class="rfield__label" for="own">Owner</label>
  <div class="rref" data-committed="Marcus Silva">
    <input class="rref__input" id="own" type="text" value="Marcus Silva" autocomplete="off">
    <button class="rref__btn" type="button" aria-label="Browse people">
      <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
    </button>
    <div class="rref__menu">
      <button class="rref__opt" type="button">Marcus Silva</button>
      <button class="rref__opt" type="button">Aoife Byrne</button>
      <button class="rref__opt" type="button">Priya Raman</button>
      <button class="rref__opt" type="button">Tom Okafor</button>
    </div>
  </div>
</div>
```

#### In-record table

`.rtable__actions` plus a `<table>`. White fill, not the field grey — a table of rows is content, and the grey read as one large input. `.rtable--locked` keeps the rows and drops the controls.

```html
<div class="rtable">
  <div class="rtable__actions">
    <button class="rtable__action" type="button">
      <span class="material-symbols-rounded" aria-hidden="true">add</span> Add witness
    </button>
  </div>
  <table>
    <thead>
      <tr><th>Name</th><th>Role</th><th>Statement</th><th></th></tr>
    </thead>
    <tbody>
      <tr><td>Aoife Byrne</td><td>Supervisor</td><td>Taken 8 July</td>
          <td class="rtable__cell-actions"><button class="rtable__rm" type="button" aria-label="Remove">
            <span class="material-symbols-rounded" aria-hidden="true">close</span></button></td></tr>
      <tr><td>Tom Okafor</td><td>Driver</td><td>Pending</td>
          <td class="rtable__cell-actions"><button class="rtable__rm" type="button" aria-label="Remove">
            <span class="material-symbols-rounded" aria-hidden="true">close</span></button></td></tr>
    </tbody>
    <!-- Own tbody, deliberately. See the striping gotcha below. -->
    <tbody hidden>
      <tr class="rtable__empty"><td colspan="4">No witnesses recorded.</td></tr>
    </tbody>
  </table>
</div>
```

#### Sub-sections and the Mazlan hand-off

```html
<div class="subsec">
  <p class="subsec__title">Immediate actions
    <button class="mazbtn" type="button">
      <span class="mazlan-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
      Ask Mazlan
    </button>
  </p>
  <div class="rfield">
    <label class="rfield__label" for="cont">Containment</label>
    <input class="rfield__control" id="cont" type="text" value="Bay 4 cordoned, stack re-banded">
  </div>
  <div class="rfield rfield--locked">
    <label class="rfield__label">Verified by</label>
    <input class="rfield__control" value="Priya Raman" readonly>
  </div>
</div>
```

`.mazbtn` uses `.mazlan-mark`, so link `praxis-mazlan.css` too if you use it — the four child spans *are* the four dots.

### States

#### Validation

`.rfield--invalid` is set by your save or submit check **only** — never on load. A field the user has not reached yet is not wrong.

```html
<div class="form-alert" role="alert">
  <span class="form-alert__icon"><i data-lucide="triangle-alert"></i></span>
  <div class="form-alert__body">
    <p class="form-alert__title">Two fields need attention</p>
    <p class="form-alert__detail">Complete them before submitting.</p>
    <ul class="form-alert__list">
      <li><button type="button">Immediate action taken</button></li>
      <li><button type="button">Severity</button></li>
    </ul>
  </div>
</div>
<div class="rfield rfield--invalid">
  <label class="rfield__label" for="act">Immediate action taken <span class="req">*</span></label>
  <input class="rfield__control" id="act" type="text" value="">
  <p class="rfield__hint">Required before this step can be submitted.</p>
</div>
<script>
  /* Nothing here is Praxis behaviour — the sheet has no JS. This only shows the
     summary links doing what you would wire them to do. */
  document.querySelectorAll('.form-alert__list button').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.querySelector('.rfield--invalid .rfield__control');
      if (f) f.focus();
    });
  });
</script>
```

#### The rest of the state set

- **Locked** — `.rfield--locked`, a read-only value with no control affordance.
- **Required** — `.req` on the label.
- **Collapsed** — `.is-collapsed` on a containing `.section`. A field inside a collapsed section is invisible *and* out of the tab order, which is why [the error summary](#error-summary) has to expand ancestors before focusing a target.

### Responsive behavior

`--praxis-record-rail-w` is 300px and narrows at breakpoints — that is the `.record__guide` / `.record__tree` rail beside the form, not the field. The field row itself reflows its label above its control at narrow widths.

Below 640px the record family takes `--px-gutter` as inline padding, along with the app bar and the page header, so all three edges line up on one number.

### Interactive demo

Each variant carries its own frame in the sections above. Seven examples on one page is a lot, and they are distributed rather than grouped so each sits beside the rule it demonstrates.

### Code

`praxis-rfield.css`. No script.

It depends on `--px-field` and `--px-field-hover` from `praxis-core.css`, which is the shared form-field fill — the same one `.admin-field` uses. That is why the two look like one system despite living in different sheets.

### Markup contract

#### Four gotchas, each learned the hard way

- **Zebra striping counts hidden rows.** `nth-of-type` counts every `<tr>`, including a hidden empty-state row, which made the first *real* row strike as even. Put the empty state in its own `<tbody>` so data rows count from one.
- **`background-color`, never the `background` shorthand,** on a select. Selects layer a chevron image on top and the shorthand wipes it.
- **Placeholders are content** and answer to WCAG 1.4.3 like any other text. `--praxis-color-text-disabled` measured 2.73:1 light and 2.77:1 dark on the field fill — a clear failure. Placeholders take `--praxis-color-text-secondary` (4.94:1 / 5.48:1); the weight drop to 500 is what separates a placeholder from a real value.
- **`.admin-field` read-outs get the static treatment automatically,** selected with `:has(> .admin-field__value)` so generated pages needed no markup change. Emit `.admin-field > .admin-field__value` and you get it for free.

#### The contract itself

| Item | Requirement |
|---|---|
| Label | A real `<label for>`, or the row is a styled div with no association |
| Hint | Wired with `aria-describedby`. Visual proximity is not association |
| Alert | Also `aria-describedby`, and the input gets `aria-invalid="true"` |
| Required | `.req` is decoration. The input needs `required` or `aria-required` |
| Picklist | `.pillset`/`.pill` wrap real radios — the selection, keyboard navigation and screen-reader semantics come from the input, not the pill |
| Locked | `readonly` or `disabled`, chosen deliberately: `disabled` leaves the tab order, `readonly` does not |
| JS | None |

### Token reference

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.rfield` | 69 |
| `.rtable` | 29 |
| `.admin-field` | 25 |
| `.rref` | 17 |
| `.pill` | 12 |
| `.form-alert` | 11 |
| `.section` | 11 |
| `.summary` | 6 |
| `.pillset` | 4 |
| `.mazbtn` | 4 |
| `.req` | 3 |
| `.chevron-btn` | 3 |
| `.field` | 2 |
| `.subsec` | 2 |
| `.toggle-group` | 1 |
| `.chip-area` | 1 |
| `.is-collapsed` | 1 |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Read the four gotchas in Markup contract before building a form. Each one was learned by getting it wrong.
- Use `.pillset` for three or four options — it shows them all without a click.
- Wire hints and alerts with `aria-describedby`.
- Say what a validation message wants, not that something is wrong: "Enter the immediate cause".

**Don't**

- Rely on `.req` alone to make a field required.
- Use `.pillset` for a long list. There is no select in this sheet — see [Select and combobox](#select).
- Put a date field here and expect a picker. There is none; see [Date picker](#date-picker).
- Assume a border. Fields have none, and the fill is doing all the work.

### Accessibility

- **Label association is the whole thing.** A `.rfield__label` that is not a `<label for>` looks identical and is useless to a screen reader.
- Hints and alerts need `aria-describedby`; `aria-invalid` on the input is what conveys the error state.
- **Fields carry no border**, so `--px-field` against `--px-surface` is the control boundary and has to clear 3:1 under WCAG 1.4.11. This is the reason `--praxis-color-border-strong` was repointed after measuring 2.95:1.
- A form with more than a handful of fields needs an [error summary](#error-summary), which Praxis does not have — and a field inside a collapsed section is unreachable without one.
- `.pillset` wraps real radios, so arrow-key navigation and group semantics come free. Do not replace them with buttons.
- `readonly` versus `disabled` is an accessibility decision: a disabled field cannot be read by a keyboard user tabbing through the form.

### Dimensions

| Element | Property | Value |
|---|---|---|
| `.rfield` | Row min height | 64px where the field rules raise it |
| `.rtable` | Margin / border | 4px 16px 0 / 1px `--praxis-color-neutral-20` |
| `.rtable` cells | Padding | 8px 12px head, 10px 12px body |
| `.rtable__action` | Height | 32px |
| Record rail | Width | `--praxis-record-rail-w`, 300px |
| `.pill` | Inset | 10px inside the radio label |

---

## The app shell

Four bands, one composition. The app bar, nav rail, page header and toolbar that every Praxis page is built from — and the two rules your page still has to own.


Tier: **ready** · Sheet: `praxis-appbar.css, praxis-navrail.css, praxis-pageheader.css, praxis-workspace.css, praxis-admin.css` · Script: `praxis-lucide.js, praxis-navdrawer.js, praxis-profile-menu.js`
Every Praxis page is the same four bands. This is the one page on this site where the frame is worth making tall and then resizing: the shell is where all the responsive behaviour lives, and none of it is a fixed breakpoint you can read off a stylesheet.

```html
<a class="px-skip" href="#content">Skip to content</a>

<div class="app">

  <!-- ============ App bar (64px) ============ -->
  <header class="appbar">
    <!-- Praxis ships no logo files. The real markup is two <img> tags, one per
         theme: .appbar__logo-img--onlight and --ondark. -->
    <a class="appbar__brand" href="#" style="font-weight:600">Ideagen</a>

    <!-- Absolutely centred on the viewport above 768px; in-flow below it. -->
    <div class="appbar__search">
      <button class="appbar__module" type="button">
        All modules
        <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
      </button>
      <input type="search" aria-label="Search records" placeholder="Search records">
      <button class="appbar__search-btn" type="button" aria-label="Search">
        <span class="material-symbols-rounded" aria-hidden="true">search</span>
      </button>
    </div>

    <div class="appbar__right">
      <div class="appbar__ai">
        <button class="appbar__mazlan" type="button">
          <!-- Four child spans, in this order. They ARE the four dots. -->
          <span class="mazlan-mark" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </span>
          Mazlan
        </button>
      </div>
      <button class="appbar__iconbtn" type="button" aria-label="Notifications">
        <span class="material-symbols-rounded" aria-hidden="true">notifications</span>
      </button>
      <div class="profile-menu">
        <button class="appbar__avatar" type="button" aria-expanded="false">ms</button>
        <div class="profile-menu__pop" hidden>
          <!-- Your persona. praxis-profile-menu.js renders everything below it. -->
          <div class="profile-menu__head">
            <div class="profile-menu__name">Marcus Silva</div>
            <div class="profile-menu__role">EHS coordinator</div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <div class="main">

    <!-- ============ Nav rail (56px) ============ -->
    <nav class="praxis-navrail" aria-label="Primary">
      <div class="praxis-navrail__core">
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn" type="button" aria-label="Home hub">
            <span class="material-symbols-rounded" aria-hidden="true">home</span>
          </button>
        </div>
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn praxis-navrail__btn--create"
                  type="button" aria-label="Create new">
            <span class="material-symbols-rounded" aria-hidden="true">add</span>
          </button>
        </div>
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn praxis-navrail__btn--active"
                  type="button" aria-label="Incidents">
            <span class="material-symbols-rounded" aria-hidden="true">crisis_alert</span>
          </button>
        </div>
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn" type="button" aria-label="Audits">
            <span class="material-symbols-rounded" aria-hidden="true">fact_check</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- ============ Content column ============ -->
    <!-- .content declares --ph-pad-x:24px, which the header, the toolbar band and
         your body all inherit. Change it here, once, to reset the page rhythm. -->
    <div class="content">

      <div class="pageheader">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a class="breadcrumb__home" href="#" aria-label="Home">
            <span class="material-symbols-rounded" aria-hidden="true">home</span>
          </a>
          <span class="breadcrumb__sep" aria-hidden="true">
            <span class="material-symbols-rounded">chevron_right</span>
          </span>
          <a href="#">Incident management</a>
          <span class="breadcrumb__sep" aria-hidden="true">
            <span class="material-symbols-rounded">chevron_right</span>
          </span>
          <span class="breadcrumb__current">INC-2024-0417</span>
        </nav>
        <div class="pageheader__titlerow">
          <span class="pageheader__icon" aria-hidden="true">
            <span class="material-symbols-rounded">assignment</span>
          </span>
          <h1 class="pageheader__title">Forklift near-miss, bay 4</h1>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar__inner">
          <button class="tbtn tbtn--icon" type="button" aria-label="Back">
            <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
          </button>
          <button class="tbtn" type="button">
            <span class="material-symbols-rounded" aria-hidden="true">save</span> Save
          </button>
          <span class="toolbar__spacer"></span>
          <button class="tbtn tbtn--primary" type="button">Submit</button>
        </div>
      </div>

      <main class="page-body" id="content">
        <div class="rfield">
          <label class="rfield__label" for="ref">Reference</label>
          <input class="rfield__control" id="ref" type="text" value="INC-2024-0417">
        </div>
        <div class="rfield rfield--locked">
          <label class="rfield__label">Reported by</label>
          <input class="rfield__control" value="Marcus Silva" readonly>
        </div>
      </main>

    </div>
  </div>
</div>

<style>
  /* Praxis does not style .page-body — that name is yours. These are the two
     rules your page must own; see below. */
  .page-body{
    flex:1; min-height:0; overflow:auto;
    padding: var(--px-toolbar-gutter) var(--ph-pad-x) var(--praxis-space-32);
  }
  .toolbar__inner{max-width:60rem}
</style>
<script>
  /* You wire the profile trigger yourself. The script deliberately does not
     touch the trigger or the pop, so each page keeps its own binding. */
  var trigger = document.querySelector('.appbar__avatar');
  var pop = document.querySelector('.profile-menu__pop');
  trigger.addEventListener('click', function () {
    var open = pop.hidden;
    pop.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.profile-menu')) { pop.hidden = true;
      trigger.setAttribute('aria-expanded', 'false'); }
  });
</script>
```

### Anatomy

#### The four bands

| Band | Height | Token |
|---|---|---|
| App bar | 64px | `--praxis-appbar-h`, and `--appbar-h` locally |
| Nav rail | 56px wide | `--praxis-navrail-width`, and `--navrail-w` locally |
| Page header | 68px min | `--ph-h` |
| Toolbar band | 60px min | `--px-toolbar-h` |

Page content therefore starts at **192px**, and `--px-dot-clear` is set to exactly that so the dot grid stops short of the chrome. If you change a band height, change the token — not one page — or the dot grid will cut across your header.

### Variants

One shell, three page families that wear it — the record page, the workspace and the admin section. What differs between them is the toolbar band's contents and `--ph-pad-x`: workspace 32px, record 24px, search 20px. The combined height does not differ, which is the promise the masthead exists to keep.

See [Page families](#page-families-and-part-only-names) for the container names, and [The admin shell](#the-admin-shell) for the variant that adds a labelled side nav between the rail and the content.

#### Profile menu

You supply the trigger, the `.profile-menu__pop` element and — optionally — a `.profile-menu__head` carrying your persona's name and role. `praxis-profile-menu.js` renders everything else inside the pop: navigation, the theme switch, sign out, the current-page marker, the version footer. It preserves your `.profile-menu__head`, because the persona is yours, not chrome.

It writes `localStorage['gl-theme']` when the user toggles the theme. That is the key your boot script reads — use a different one and you must persist it yourself.

You still wire open and close on the trigger yourself, as the example above does. The script deliberately does not touch the trigger or the pop element, so each page keeps its own binding.

`.verswitch` is the version switcher the script renders into the pop's footer. You do not build it; it is listed here because it is the one `.profile-menu` family member that is not part of your markup contract.

The pop is height-capped with its own scroll as of 0.1.4. Before that it extended past the bottom of the window on short viewports and Sign out was unreachable.

### States

- **Rail item active** — `--active`, a filled pink square.
- **Drawer open** — `.is-open`, below 640px only.
- **Theme** — `body[data-theme]`, which the whole shell reads.
- **Compact toolbar** — `.tb-is-compact`, set by script when the band runs out of width.

### Responsive behavior

#### Responsive behaviour you get for free

| Width | What happens |
|---|---|
| ≤1024px | Centred search pill narrows to `min(600px, 100vw - 420px)` |
| ≤1024px, or toolbar overflow | `praxis-toolbar-compact.js` sets `body.tb-is-compact` and collapses the toolbar into a Tools menu — measured, not a fixed breakpoint |
| ≤768px | Search pill goes in-flow; the Mazlan pill is hidden, still reachable from the rail and profile menu |
| ≤640px | Nav rail hidden, `--navrail-w` zeroed, nav drawer takes over; `--px-gutter` becomes the single 16px inset for app bar, header and content |
| ≤480px | Logo 22px, avatar 30px, tighter app-bar gap |

#### Nav drawer — free, from the rail

`praxis-navdrawer.js` reads the rail you already wrote and builds the narrow-width drawer from it. There is no second markup contract: label a rail button with `aria-label` and the drawer picks the label up. Mark the current item with `.praxis-navrail__btn--active` and the drawer marks it too.

### Interactive demo

The example is at the top of this page, and it is the one frame on this site worth making tall and then resizing: the shell is where all the responsive behaviour lives, and none of it is a breakpoint you can read off a stylesheet.

### Code

#### What each sheet contributes


| Family | Mentions |
|---|---|
| `.appbar` | 46 |
| `.appswitch` | 2 |
| `.msel` | 1 |
| `.iconbtn-ghost` | 1 |



| Family | Mentions |
|---|---|
| `.praxis-navrail` | 39 |
| `.px-navdrawer` | 37 |
| `.ws-item` | 36 |
| `.ws-pop` | 28 |
| `.px-navtoggle` | 7 |
| `.material-symbols-rounded` | 3 |
| `.is-open` | 2 |
| `.px-menu` | 1 |
| `.icon` | 1 |



| Family | Mentions |
|---|---|
| `.pageheader` | 9 |
| `.breadcrumb` | 7 |
| `.toolbar` | 4 |
| `.material-symbols-rounded` | 2 |
| `.icon` | 1 |


### Markup contract

#### The two rules your page must own

`.app` is `height:100vh; overflow:hidden`, so the page does **not** scroll — the content column does. Praxis does not style `.page-body`; that name is yours. Add:

>
`.page-body{ flex:1; min-height:0; overflow:auto; padding: var(--px-toolbar-gutter) var(--ph-pad-x) var(--praxis-space-32); }`

`--px-toolbar-gutter` (16px) is the canonical gap between the toolbar band and the first card of content. It exists because that gap was set per section and drifted — 8px on one page, 6px on another. Use the token.

The body dot grid is `background-attachment:fixed`, so an inner scroll container is correct: the texture reads as page material and stays put while content moves.

#### `.toolbar__inner` — when to use it

Only when your content is a centred max-width column. The band stays full-bleed so its closing hairline lines up with the page header's; `.toolbar__inner` centres the controls so they align with the cards below. Set its `max-width` to the same number as your content column. For a full-width page, put the controls straight in `.toolbar` and drop the wrapper.

#### The rest of the contract

| Item | Requirement |
|---|---|
| `body` | `data-variant="praxis"` and `data-theme`. Without the first, none of the `--px-*` materials, the dot grid or the 8/12/16 geometry apply |
| Theme script | Inline, first thing inside `<body>`. In `<head>` it runs before `body` exists and does nothing |
](#nav-drawer-and-rail-flyouts)| Rail items | Labelled. [The drawer derives its text from those labels |
| Skip link | `.px-skip` as the first focusable element, pointing at your content container. Every page opens with an app bar and a rail, so a keyboard user traverses about ten controls before reaching content |
| `.page-body` | Yours entirely — Praxis styles nothing on it. The two rules are above |

### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-navrail-width` | `56px` | — |
| `--praxis-navrail-width-expanded` | `240px` | — |
| `--praxis-appbar-h` | `64px` | — |
| `--px-toolbar-gutter` | `16px` | — |
| `--ph-pad-x` | `var(--px-gutter)` | — |


Those four families are the whole geometry of the shell. Change a band's height by changing its token, never by overriding one page — that drift is exactly what `praxis-pageheader.css` was written to prevent.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Set both `body` attributes, and set the theme before first paint.
- Write the two `.page-body` rules. Nothing scrolls until you do.
- Label every rail item.
- Include `.px-skip`.
- Change band heights through their tokens.

**Don't**

- Put the theme script in `<head>`.
- Override `--ph-h` or `--px-toolbar-h` on one page — page content will start at a different y there than everywhere else.
- Give `.page-body` a background. You will cover the dot grid.
- Assume `.app`'s `height:100vh` is what you want for a document-shaped page. It is an application shell and it does not scroll.

### Accessibility

- **Bypass blocks (WCAG 2.4.1)** is the reason `.px-skip` exists, and it is a rule in `praxis-core.css` with no markup — you have to add the link.
- Rail item labels are load-bearing twice: for assistive technology and for the drawer.
- The app bar and the rail are the first ten-odd tab stops on every page. Anything that makes them longer makes every page worse.
- The masthead's landmarks matter: the page header is a `<header>`, the rail and drawer are labelled `<nav>` elements, and the content container is where `id="main"` belongs.
- `.app` is `overflow:hidden`, so the scroll container is `.page-body`. Anchor links and scroll-into-view have to target that element, not the window — a trap this reference site hit with its own table of contents.
- **Forced colors:** the app bar has no border and the rail is transparent with one, both by design. In that mode the shell loses its structure — see [Forced colors](#forced-colors-and-high-contrast).

### Dimensions

| Band | Property | Value |
|---|---|---|
| App bar | Height | `--praxis-appbar-h`, 64px |
| Nav rail | Width | `--praxis-navrail-width`, 56px (240px expanded) |
| Page header | Min height | `--ph-h`, 68px — a floor, so the breadcrumb may wrap and take it with it |
| Toolbar band | Min height | `--px-toolbar-h`, 60px |
| Masthead | Combined | 128px |
| Content start | y | **192px**, and `--px-dot-clear` is set to exactly that so the dot grid stops short of the chrome |
| Phone gutter | `--px-gutter` | 16px below 640px, shared by the bar, the header and the content |

---

## Buttons

One button is fully defined — .tbtn. Everything else named here is a variant or an interaction layer that assumes a base you write yourself.


Tier: **ready** · Sheet: `praxis-admin.css, praxis-core.css, praxis-controls.css`
This is the page most likely to save you an hour. Praxis names ten button classes and **defines exactly two of them completely**. The rest get a fill, a hover wash or a press transform on top of a base box that is yours. Use one without writing that base and you get colored text where you expected a button.

### Anatomy

1. **Box** — height, inline padding, radius, shadow.
2. **Label** — 14px/600 in every complete Praxis button.
3. **Glyph** — optional, leading, 20px with a 7px gap in `.tbtn`.

Only two of the ten classes named on this page own all three.

#### What is actually defined

| Class | Praxis gives you | Where |
|---|---|---|
| `.tbtn` | **Everything.** 40px tall, 14px inline padding, 10px radius, `--px-tool` fill, icon color, hover shadow, active state. Plus `--icon` (40px square), `--primary` (gradient fill), `--ghost` (transparent), `--run`. | `praxis-admin.css` |
| `.admin-ghostbtn` | **Everything.** 34px tall, transparent, secondary ink, hover wash. | `praxis-admin.css` |
| `.btn--primary`, `.pill-btn`, `.tbtn--primary`, `.tbtn--run` | The primary fill only — 40px height, 18px padding, 10px radius, `--px-primary-grad`, `--px-primary-fg` ink, shadow. No base box. | `praxis-core.css` |
| `.btn`, `.qa`, `.lg-btn`, `.iconbtn-ghost`, `.sortbtn` | A press transform, and a hover wash for some. **No base at all.** | `praxis-core.css` |
| `.icon-btn` | 36px square, but **only inside `.filter-drawer`**. Outside it, nothing. | `praxis-filters.css` |

**Reach for `.tbtn` unless you have a reason not to.** It is the only button in Praxis you can use without writing CSS, and its variants cover the primary action, the icon-only button and the quiet one. `.btn` exists in Praxis selectors because the originating application had a `.btn` scale; `praxis-filters.css` says outright that its variants sit "on top of the host's `.btn` set".

### Variants

#### The toolbar button

```html
<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
  <button class="tbtn" type="button">
    <span class="material-symbols-rounded" aria-hidden="true">save</span> Save
  </button>
  <button class="tbtn tbtn--icon" type="button" aria-label="Back">
    <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
  </button>
  <button class="tbtn tbtn--ghost" type="button">Cancel</button>
  <button class="tbtn tbtn--primary" type="button">Submit</button>
  <button class="tbtn" type="button" disabled>Unavailable</button>
  <button class="admin-ghostbtn" type="button">
    <span class="material-symbols-rounded" aria-hidden="true">add</span> Add row
  </button>
</div>
```

`.tbtn` sets its icon ink to `--praxis-color-text-secondary` so a labelled button reads label-first, and `.tbtn--primary` overrides that to white. Give an icon-only button an `aria-label`; there is no text node for a screen reader to fall back on.

**Disabled is styled as of 2026-08-18** — see "Unavailable" above. `.tbtn` and `.admin-ghostbtn` take `opacity:.45`, `cursor:not-allowed` and no shadow on both `:disabled` and `[aria-disabled="true"]`, the second because a link styled as a button cannot take `:disabled`.

Before that, Praxis suppressed hover and the press transform on disabled controls but gave them no *appearance*, so a disabled button stopped responding while looking identical at rest. Opacity rather than a flat grey, because it has to work on `.tbtn--primary`'s gradient too, which no single colour could stand in for.

**The other eight button classes still have nothing.** If you built your own base, style its disabled state yourself.

#### The primary action

One definition for the whole application: `--px-primary-grad` fill, `--px-primary-fg` ink, `--px-primary-shadow`. It is applied to `.btn--primary`, `.tbtn--primary`, `.tbtn--run` and `.pill-btn` together, so all four look identical by construction rather than by four people agreeing.

**Never put white text on the interactive teal as a fill.** In dark mode `--praxis-color-interactive-default` becomes `#29D2D7` and white measures 1.86:1 against a 4.5 minimum. `--px-primary-fg` is the dark ink that belongs there, at 12.4:1, and the shipped primary already uses it. If you invent a filled cyan control, it is on you. See [Color](#color).

In dark mode, a primary button *inside a toolbar band* gets a different, softer treatment — `--px-primary-soft` rather than the gradient — scoped to `.toolbar`, `.rp-toolbar`, `.ws-toolbar` and `.admin-toolbar`. The full-strength gradient was too loud against a dark band.

```html
<div class="toolbar">
  <div class="toolbar__inner">
    <button class="tbtn" type="button">Save</button>
    <span class="toolbar__spacer"></span>
    <button class="tbtn tbtn--primary" type="button">Submit</button>
  </div>
</div>
```

#### The two icon buttons are different sizes on purpose

`.iconbtn` is in `praxis-controls.css`, not the sheet the rest of this page documents — a page that wants it does not have to take the admin shell with it.

`.tbtn--icon` is the 40px square in the page toolbar band — same height as the labelled `.tbtn` beside it, because they share a row. `.iconbtn` is the 34px square that goes in a *card header or a panel toolbar*: expand all, pin, a filter toggle, collapse a panel. Reach for the 40px one when it sits next to a labelled toolbar button, and the 34px one when it sits next to a `.filterfield`, which is also 34px and carries the same radius and shadow so a header row lines up.

`.iconbtn--on` is the pressed state for a toggle — the app's pink selection accent, the same one the nav rail's current page and a selected report row use. Set `aria-pressed` as well: the fill is the only visual difference, and it is not available to a screen reader.

```html
<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
  <button class="iconbtn" type="button" aria-label="Expand all">
    <span class="material-symbols-rounded" aria-hidden="true">unfold_more</span>
  </button>
  <button class="iconbtn iconbtn--on" type="button" aria-label="Pinned only" aria-pressed="true">
    <span class="material-symbols-rounded" aria-hidden="true">bookmark</span>
  </button>
  <button class="iconbtn" type="button" aria-label="Delete" disabled>
    <span class="material-symbols-rounded" aria-hidden="true">delete</span>
  </button>
  <label class="filterfield">
    <input type="text" placeholder="Filter" aria-label="Filter" /></input>
    <span class="material-symbols-rounded" aria-hidden="true">search</span>
  </label>
  <button class="tbtn tbtn--icon" type="button" aria-label="Back">
    <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
  </button>
</div>
```

### States

#### Press feedback is global

Praxis applies a press transform to a broad `:where()` list — every `button` and `[role="button"]`, plus `.btn`, `.tbtn`, `.qa`, `.pill-btn`, `.icon-btn`, `.praxis-navrail__btn`, `.card__link`, `.rep__pin` and `.segswitch > button`. Small controls scale to `.95`, larger pill buttons to `.97`, and it is suppressed on `:disabled` and `[aria-disabled="true"]`.

Two consequences worth knowing. Your own custom button gets the press feel for free if it is a real `<button>`. And because the selector is `:where()`, it carries zero specificity, so overriding it takes only a plain class selector.

#### The rest of the state set

- **Hover** — `--px-tool-shadow-hover` on `.tbtn`, a wash on `.tbtn--ghost` and `.admin-ghostbtn`.
- **Focus-visible** — 2px `--praxis-color-border-focus` on `.iconbtn`. `.tbtn` has no focus rule of its own and falls back to the UA outline.
- **Disabled** — `.tbtn:disabled` and `[aria-disabled="true"]` are both handled; `.iconbtn` uses `opacity:.45` and drops its shadow.
- **On** — `.iconbtn--on` takes the pink selection accent, so a toggled filter reads the same as a selected row.
- **Loading** — does not exist anywhere. See [Loading states](#loading).

### Responsive behavior

Buttons have no breakpoints of their own. Two things reach them from outside:

- Below 640px the shared `--px-gutter` sets the inline inset of the band they sit in, so a row of toolbar buttons lines up with the app bar and the content.
- [The compact toolbar](#compact-toolbar) moves overflow buttons into a popover and gives each the full row width.

`--praxis-control-h` (32px) exists in the token file as the "compact action control height" and almost nothing uses it — which is the strongest hint that the missing [`.btn`](#btn) was always meant to be the smaller sibling.

### Interactive demo

The examples are distributed through Variants above, one per class family, so each sits beside the prose describing it. The one worth looking at first is in [Button base](#btn): it shows `.btn` rendering as coloured text next to a working `.tbtn`.

### Code

Buttons come from three sheets and which one you load decides what you get:

| Sheet | Gives you |
|---|---|
| `praxis-admin.css` | `.tbtn` and all its variants, `.admin-ghostbtn`. Also the whole application shell |
| `praxis-controls.css` | `.iconbtn`. Four kilobytes, depends on nothing but tokens |
| `praxis-core.css` | The primary fill, the press pass, the hover pass. Every page loads this |

#### Writing the base Praxis does not give you

If you need a `.btn` scale — because you are porting markup that has one, or because you want a link-shaped button — this is the minimum that makes the Praxis variants land correctly on top of it.

```html
<style>
  /* Yours, not Praxis's. Match the .tbtn geometry so the two can sit in one
     row without a half-pixel step: 40px tall, 10px radius. */
  .btn{
    display:inline-flex; align-items:center; justify-content:center; gap:7px;
    height:40px; padding:0 14px; border:0; border-radius:10px;
    background:var(--px-tool); color:var(--praxis-color-text-primary);
    font:inherit; font-size:var(--praxis-type-size-base); font-weight:600;
    cursor:pointer; box-shadow:var(--px-tool-shadow);
  }
  .btn:disabled{opacity:.5; cursor:not-allowed}
</style>
<div style="display:flex;gap:.5rem;align-items:center">
  <button class="btn" type="button">Your base</button>
  <button class="btn btn--primary" type="button">Praxis primary on top</button>
  <button class="tbtn" type="button">.tbtn, for comparison</button>
</div>
```

### Markup contract

| Item | Requirement |
|---|---|
| Element | A real `<button>`. The press-feedback pass keys on `button, [role="button"]`, so a styled `<div>` gets the paint and none of the keyboard behaviour |
| `type` | Always explicit. An unset `type` inside a form is `submit`, which is the most common cause of a Cancel button submitting |
](#tooltip)| Icon-only | `aria-label`, always. And a [tooltip, once that exists |
| Glyph | `.material-symbols-rounded` span, converted by `praxis-lucide.js`, sized by the button rule rather than the span |
| Disabled | The attribute, or `aria-disabled="true"` where the control must stay focusable to explain why it is unavailable |
| JS | None. All CSS |

### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--px-primary-fg` | `#fff` | `#08313a` |
| `--px-primary-grad` | `linear-gradient(180deg,#197b83,#156f77)` | `linear-gradient(180deg,#29d2d7,#1fb4b9)` |
| `--px-primary-shadow` | `0 0 0 .5px rgba(16,36,58,.2),0 1px 2px rgba(16,36,58,.15),0 8px 18px -8px rgba(25,123,131,.5),inset 0 .5px 0 rgba(255,255,255,.28)` | `0 0 0 .5px rgba(41,210,215,.30),0 1px 2px rgba(0,0,0,.45),0 8px 18px -8px rgba(41,210,215,.45),inset 0 1px 0 rgba(255,255,255,.22)` |
| `--px-tool` | `#ffffff` | `rgba(255,255,255,.06)` |
| `--px-tool-shadow` | `0 0 0 .5px rgba(16,36,58,.07),0 1px 2px rgba(16,36,58,.05)` | `0 0 0 .5px rgba(255,255,255,.08),0 1px 2px rgba(0,0,0,.35)` |
| `--px-tool-shadow-hover` | `0 0 0 .5px rgba(16,36,58,.09),0 2px 8px -2px rgba(16,36,58,.16)` | `0 0 0 .5px rgba(255,255,255,.12),0 4px 12px -2px rgba(0,0,0,.5)` |
| `--px-toolbar-gutter` | `16px` | — |


Plus `--praxis-control-h` for the compact height and `--praxis-color-border-focus` for the focus ring.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Reach for `.tbtn` unless you have a reason not to — it is the only button you can use without writing CSS.
- Use `.iconbtn` (34px) in a card or panel header and `.tbtn--icon` (40px) in a toolbar band. The two sizes are deliberate.
- Keep one primary action per view.
- Label with a verb naming the outcome.

**Don't**

- Reach for `.btn`, `.qa`, `.lg-btn`, `.iconbtn-ghost` or `.sortbtn` expecting a button. All five are fill-or-hover-only over a base you must write.
- Use `.icon-btn` outside `.filter-drawer` — it is 36px square there and nothing anywhere else.
- Remove the focus indicator.

### Accessibility

- Real `<button>` elements, so Enter and Space work and the control is in the tab order without help.
- Every icon-only button needs an accessible name.
- **The primary fill was a real contrast failure.** White on `--px-primary-grad` measured 3.86:1 at the top of the gradient and exactly 4.50:1 at the bottom, so the label failed across the upper half of every primary button in the app. Both stops moved; it is now 5.00:1 to 5.88:1. Any new fill variant has to be measured across the whole gradient, not at one stop.
- In dark, `--praxis-color-interactive-default` brightens to a light cyan, so white text on it as a fill measures 1.86:1. `--px-primary-fg` is the dark ink that exists for exactly this, at 12.4:1.
- `aria-disabled` rather than `disabled` where the user needs to be able to focus the control and find out why it is unavailable.
- **Forced colors:** `.tbtn` and `.iconbtn` both set `border:0` and draw their edge with a shadow, which that mode discards — they become unbounded text. See [Forced colors](#forced-colors-and-high-contrast).

### Dimensions

| Class | Height | Inline padding | Radius |
|---|---|---|---|
| `.tbtn` | 40px | 14px | 10px |
| `.tbtn--primary` | 40px | 18px | 10px |
| `.tbtn--icon` | 40px | 40px square | 10px |
| `.admin-ghostbtn` | 34px | — | — |
| `.iconbtn` | 34px | 34px square | 8px |
| `.icon-btn` | 36px | 36px square | — |

The 10px radius on `.tbtn` is off the Praxis 8/12/16 scale. Noted rather than defended — `.iconbtn` deliberately moved to 8px when it was promoted, on the grounds that a design system should not ship a value off its own scale to preserve one pixel.

Label is 14px/600 and glyphs are 20px in `.tbtn`, 18px in `.iconbtn`, throughout.

---

## Form controls

The checkbox, the toggle switch, the skip link and the scrollbar treatment — including the two markup forms of .switch, which now render identically after one of them turned out to be styled by nothing at all.


Tier: **ready** · Sheet: `praxis-admin.css, praxis-core.css, praxis-controls.css`
Praxis restyles bare `<input type="checkbox">` and defines one toggle switch. Everything else on a form is [a field](#fields). The interesting part of this page is the last section, where two sheets disagree.

### Anatomy

This page covers six small controls rather than one component, so its anatomy is a list of what each is made of:

- **Checkbox** — the bare element, restyled. No wrapper, no parts.
- **Switch** — a wrapper, a hidden input, and two decorative spans (`__track`, `__thumb`). The order of those spans matters.
- **Segmented** — a container and its options.
- **Skip link** — `.px-skip`, one element.
- **Filter field** — an input and a trailing glyph.
- **Hidden text** — `.visually-hidden`, and the icon conventions.

### Variants

#### Checkbox

Styled on the bare element, so you get it without a class. 16px, 4px radius, 1.5px border, and it fills with `--praxis-color-text-primary` rather than the brand teal — a checked checkbox in a list of forty is a data point, not a call to action.

```html
<div style="display:flex;gap:1.5rem;align-items:center;flex-wrap:wrap">
  <label style="display:inline-flex;gap:.5rem;align-items:center">
    <input type="checkbox"> Unchecked
  </label>
  <label style="display:inline-flex;gap:.5rem;align-items:center">
    <input type="checkbox" checked> Checked
  </label>
  <label style="display:inline-flex;gap:.5rem;align-items:center">
    <input type="checkbox" id="ind"> Indeterminate
  </label>
  <label style="display:inline-flex;gap:.5rem;align-items:center;opacity:.5">
    <input type="checkbox" disabled> Disabled
  </label>
</div>
<script>
  /* Indeterminate has no HTML attribute — it is a property, so it can only be
     set from script. Praxis styles it; you have to switch it on. */
  document.getElementById('ind').indeterminate = true;
</script>
```

The indeterminate state draws a bar rather than a tick, and it has **no HTML attribute** — it is a DOM property, so a three-state header checkbox has to set `el.indeterminate = true` from script. Praxis styles it either way.

Focus is a 2px outline in the interactive teal at 60% mix, offset 2px. Do not remove it; the fill alone does not indicate focus, only state.

#### Toggle switch

A wrapper, a hidden input, and two decorative spans. The input carries the state and the label association; `.track` and `.thumb` are painted from it with sibling selectors, so **the order matters**: the rules are `input:checked + .track` and `input:checked ~ .thumb`.

```html
<div style="display:flex;gap:2rem;align-items:center">
  <label style="display:inline-flex;gap:.625rem;align-items:center">
    <span class="switch">
      <input type="checkbox">
      <span class="track"></span><span class="thumb"></span>
    </span>
    Email digest
  </label>
  <label style="display:inline-flex;gap:.625rem;align-items:center">
    <span class="switch">
      <input type="checkbox" checked>
      <span class="track"></span><span class="thumb"></span>
    </span>
    Push alerts
  </label>
</div>
```

34×20, thumb travels 14px, checked track is `teal-60`. It is the one control that *does* use the brand colour, because a switch is a commitment rather than a selection. Its base rules live in `praxis-admin.css` — another reason to load the bundle rather than picking sheets.

**The switch is deliberately excluded from the checkbox styling.** `praxis-core.css` keys its checkbox rules on `input[type="checkbox"]:not(.switch):not(.switch *)`. That second clause is what spares the switch's hidden input. It also means **putting `class="switch"` on the input itself opts that input out of all checkbox styling** — see below.

#### Two markup forms, both supported

Praxis shipped two contradictory ideas of what `.switch` means, and until 2026-08-18 only one of them was styled. Both work now, from one set of values, and they render identically — verified as 34×20 with `neutral-30` unchecked and `teal-60` checked in all four permutations.

| Form | Shape | Use it when |
|---|---|---|
| **Wrapper** — canonical | `.switch` is the wrapper; the input is inside it | Always, in new markup |
| **Sibling** | `.switch` is on the input; the track is its next sibling | Never by choice. It is what `praxis-filters.js` emits, so it is supported rather than removed. |

```html
<div style="display:flex;gap:2.5rem;align-items:center;flex-wrap:wrap">
  <label class="onoff">
    <span class="onoff__label onoff__label--off">Off</span>
    <input type="checkbox" class="switch">
    <span class="switch__track"><span class="switch__thumb"></span></span>
    <span class="onoff__label onoff__label--on">On</span>
  </label>
  <label class="onoff">
    <span class="onoff__label onoff__label--off">Off</span>
    <input type="checkbox" class="switch" checked>
    <span class="switch__track"><span class="switch__thumb"></span></span>
    <span class="onoff__label onoff__label--on">On</span>
  </label>
  <span class="switch">
    <input type="checkbox" checked>
    <span class="switch__track"></span><span class="switch__thumb"></span>
  </span>
</div>
```

#### Why the wrapper is canonical

`praxis-core.css` is already committed to it. Its checkbox rules are keyed `input[type="checkbox"]:not(.switch):not(.switch *)`, and that second clause only means anything if `.switch` can have descendants — which it can only do in the wrapper form.

The sibling form was kept working rather than removed because `praxis-filters.css` reads `.onoff:has(.switch:checked)`, which needs the class on the input, so that sheet and its script agree with each other. Rewriting either would mean touching the JavaScript and that `:has()` selector to fix something CSS alone could close.

#### Part names

**`.switch__track` and `.switch__thumb` are canonical.** The original `.track` and `.thumb` still work and are kept because consumers use them, but they are two of the most collision-prone class names it is possible to put in a shared stylesheet. Do not use them in new markup.

**What this looked like before the fix,** because it is a useful shape to recognise: the sibling form rendered as a *bare browser checkbox* between two labels. No sheet defined `.switch__track` or `.switch__thumb`, and `class="switch"` on the input also opted it out of the Praxis checkbox rules — so nothing styled it at all, and there was no error. A control that renders as an unstyled native widget is usually this: a class that excludes it from one treatment without providing another.

#### Segmented control

`.segmented` is defined in `praxis-filters.css` and is not scoped to the drawer, so it is usable anywhere. A 1px neutral border, 12px radius, and `.segmented__opt` children at 36px; `.segmented--lg` raises them to 40px. The selected option is `.segmented__opt--active` — a BEM modifier, not the `.is-selected` convention the filter rows use elsewhere.

```html
<div style="display:flex;flex-direction:column;gap:.75rem;align-items:flex-start">
  <div class="segmented">
    <button class="segmented__opt segmented__opt--active" type="button">All</button>
    <button class="segmented__opt" type="button">Open</button>
    <button class="segmented__opt" type="button">Closed</button>
  </div>
  <div class="segmented segmented--lg">
    <button class="segmented__opt segmented__opt--active" type="button">Standard</button>
    <button class="segmented__opt" type="button">Custom</button>
  </div>
</div>
```

#### Filter field

`.filterfield` is type-to-filter beside a list: the report tree's Filter, the workspace editor's Search reports. It is a `<label>` wrapping an `<input>` and a glyph, and the glyph goes **after** the input in source order because it sits at the trailing edge.

The trailing glyph is the whole distinction from the app bar's search box. A leading magnifier says "start here, type a query"; this field refines the list already under it, so the glyph is a label for what the field does rather than an invitation. `.cn-find` inside a menu is the leading-glyph form, and the app bar is the third — three fields, three jobs, and picking by which one looks nicest is how a screen ends up with two of them.

Sized to `.iconbtn`: 34px, `--praxis-radius-sm`, the same tool shadow. Give the wrapper the width you want — `flex:1` in a panel header, `width:220px` in a card head — since the input fills it.

```html
<div style="display:flex;align-items:center;gap:.5rem">
  <label class="filterfield" style="flex:1">
    <input type="text" placeholder="Filter reports" aria-label="Filter reports" /></input>
    <span class="material-symbols-rounded" aria-hidden="true">search</span>
  </label>
  <button class="iconbtn" type="button" aria-label="Expand all">
    <span class="material-symbols-rounded" aria-hidden="true">unfold_more</span>
  </button>
</div>
```

#### Skip link

`.px-skip` is fully defined: fixed at top left, 36px tall, 10px radius, and it overrides the global press transform to `none` because a skip link that shrinks under the pointer reads as broken. Put it first in `<body>` and point it at your scroll container.

```html
<a class="px-skip" href="#c" id="skip">Skip to content</a>
<p class="rfield__hint" style="margin-top:3rem">Focused on load so there is something to
   see. In a real page it sits off the visible flow until the first Tab press.</p>
<div id="c"></div>
<script>document.getElementById('skip').focus();</script>
```

### States

Each control's states are described in its section above. Two things are worth pulling out because they are system-wide rather than per-control:

- **Focus is never removed.** The checkbox rule uses a 2px outline in the interactive teal at 60% mix, offset 2px. As that section says: the fill alone does not indicate focus, only state.
- **Indeterminate has no HTML attribute.** It is a DOM property, so a three-state header checkbox has to set `el.indeterminate = true` from script. Praxis styles it either way.

### Responsive behavior

None of these six has a breakpoint. The one size note that matters: a 16px checkbox and a 34×20 switch are both below the 44px WCAG 2.5.8 target minimum, which is acceptable at desktop under the spacing exception and worth checking wherever they appear in a dense touch row.

`.filterfield` is sized to match `.iconbtn` — same 34px, same radius, same tool shadow — so a header row of both lines up.

### Interactive demo

Each control has its own frame in the sections above, beside the prose that describes it. That is deliberate for this page: six controls in one gallery would make it harder to tell which rule belongs to which.

### Code

Three sheets, and which one you need depends on the control:

| Control | Sheet |
|---|---|
| Checkbox, scrollbars, `.px-skip` | `praxis-core.css` — every page has it |
| Switch (both forms), `.visually-hidden` | `praxis-admin.css` |
| `.filterfield` | `praxis-controls.css` |
| `.segmented`, `.onoff` | `praxis-filters.css` |

The switch being in the admin sheet is the awkward one: a record page wanting a toggle either loads the application shell or writes its own. That is the same problem `praxis-controls.css` was created to solve and the switch has not moved yet.

#### Scrollbars

Praxis sets `scrollbar-color` only, using `--px-scroll` and `--px-scroll-hover`. That is deliberate and worth not "improving": it is the one scrollbar property that does not change the gutter, so Chrome and Firefox keep their overlay scrollbars and nothing reflows when the thumb appears. Declaring `::-webkit-scrollbar` or `scrollbar-width` switches those elements to classic scrollbars and shifts your layout by the scrollbar's width.

### Markup contract

| Control | Requirement |
|---|---|
| Checkbox | Nothing — style comes from the bare element. Do not add `class="switch"` to a checkbox input unless you mean the switch: that class opts the input out of every checkbox rule, which is exactly what the selector `input[type="checkbox"]:not(.switch):not(.switch *)` is for |
| Switch, wrapper form | `.switch` on the wrapper, input inside, then `__track` and `__thumb`. **Canonical.** |
| Switch, sibling form | `.switch` on the input, track as its next sibling. Supported because `praxis-filters.js` emits it and `.onoff:has(.switch:checked)` depends on it |
| Switch part names | `__track` / `__thumb` are canonical. Bare `.track` / `.thumb` still work and are two of the most collision-prone names it is possible to put in a shared sheet — do not use them in new markup |
| Segmented | Real roles. A choice control built from bare buttons says nothing about which option is active |
| `.px-skip` | First focusable element in the document, `href` pointing at your content container |
| `.filterfield` | A labelled input. The glyph is `aria-hidden` and `pointer-events:none` |
| JS | None for any of them, except setting `indeterminate` |

#### Icons and hidden text

Two small utilities from `praxis-admin.css` you will want: `.icon` sizes an inline SVG to 22px square with `fill:currentColor`, and takes `--20`, `--18` and `--16`. `.visually-hidden` is the standard clip-rect pattern, for a label a screen reader needs and the layout does not.

### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--px-field` | `#EEF1F4` | `#262F3F` |
| `--px-field-hover` | `#E6EAEF` | `#2C3646` |


`--praxis-color-border-strong` is the one worth knowing about here. It is the control-boundary token — checkbox boxes, input underlines, `--px-check-stroke` — so it has to clear 3:1 against the surface it sits on under WCAG 1.4.11. It was repointed from neutral-40 to neutral-50 after measuring 2.95:1 on white, a rounding error short. The rung itself was not edited, because `--praxis-color-text-disabled` resolves to neutral-40 and must not move with it.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Use the bare `<input type="checkbox">`. You get the Praxis treatment with no class at all.
- Use the wrapper form for new switches, with `__track` and `__thumb`.
- Use a switch for a commitment and a checkbox for a selection — the switch is the one control that uses the brand teal, and that is why.
- Put `.px-skip` on every page.

**Don't**

- Put `class="switch"` on a checkbox you want styled as a checkbox.
- Use bare `.track` or `.thumb`.
- Remove the focus outline.
- Reach for a radio and expect it to be styled — it is not. See [Radio](#radio).

### Accessibility

- **Focus indicators are load-bearing and easy to lose.** The checkbox's fill indicates *state*, not focus, so removing the outline leaves a keyboard user with no way to know where they are.
- Every control needs a real label. `.visually-hidden` is there for the cases where the label should not be seen.
- Indeterminate is a DOM property. A tri-state header checkbox also needs `aria-checked="mixed"` if it is a custom control rather than a native input.
- The segmented control must carry roles matching what it is — tabs or a radio group.
- `.px-skip` exists for WCAG 2.4.1, and it is a rule with no markup: you have to add the link.
- The scrollbar treatment fades scrollbars until hover or focus-within. `:focus-within` is in that selector deliberately, so keyboard users — who never trigger `:hover` — still get a position indicator.
- 16px checkboxes and 34×20 switches are below the 44px target minimum; check them in dense touch contexts.

### Dimensions

| Control | Property | Value |
|---|---|---|
| Checkbox | Size / radius / border | 16px / 4px / 1.5px |
| Checkbox | Focus outline | 2px, offset 2px, teal at 60% mix |
| Switch | Track / thumb / travel | 34×20 / 16px / 14px |
| `.filterfield` | Height / radius / glyph | 34px / 8px / 18px at right:12px |
| `.px-skip` | Height / padding | 36px / 0 16px, at top:8px left:8px, z-index 1000 |
| `.admin-check` | Size | 16px, `accent-color` teal-60 |

---

## Nav drawer and rail flyouts

The rail's phone form, derived from the rail you already wrote, plus the workspace flyout it opens. No second markup contract to keep in step.


Tier: **ready** · Sheet: `praxis-navrail.css` · Script: `praxis-navdrawer.js`
Below 640px the 56px icon rail costs a sixth of the viewport and its items are unlabelled, so CSS hides it and `praxis-navdrawer.js` puts a hamburger in the app bar's left corner that opens a drawer listing the same destinations **with text labels**.

The important part: it **derives the drawer from the live rail** rather than duplicating the markup. There is no second contract. Change a rail button and the drawer follows; there is nothing to keep in step.

### Anatomy

1. **Toggle** — `.px-navtoggle`, a hamburger in the app bar's left corner. `display:none` above 640px.
2. **Scrim** — `.px-navdrawer__scrim`.
3. **Drawer** — `.px-navdrawer`, with a head, a brand and a close.
4. **Items** — `.px-navdrawer__item`, the rail's destinations with labels.

None of it is markup you write. See Markup contract.
#### What you supply

Nothing beyond [the rail you already wrote](#the-app-shell). The script reads each `.praxis-navrail__btn` and `.praxis-navrail__link`, takes its label from `aria-label`, and carries two modifiers across:

| On the rail | Becomes |
|---|---|
| `.praxis-navrail__btn--active` | `.px-navdrawer__item--active` |
| `.praxis-navrail__btn--create` | `.px-navdrawer__item--create` |
| `aria-label` | `.px-navdrawer__label` text |

So the one thing you must do is **label every rail button**. An unlabelled rail button is merely terse at desktop width; in the drawer it is a blank row.

### Variants

One drawer. Two flyouts share this page because they are the rail's other popovers:

#### The rail's own flyout

`.ws-pop` is the popover the rail opens for workspace and dashboard switching. It is defined here, not in the workspace sheet, and its rows are `.ws-item`:

| Part | What it is |
|---|---|
| `.ws-item__icon` | Leading glyph. Takes `.icon` inside. |
| `.ws-item__text` | Wrapper for the two lines |
| `.ws-item__name` / `__sub` | Primary and secondary line |
| `.ws-item__badge` | Trailing count or state |
| `.ws-item--current` | The one you are on |
| `.ws-item--new` | The create affordance; gets the brand tint |
| `.ws-item--home` | Given its own dark treatment so it does not read as current |

**`.ws-pop` styles a `.px-menu__head` that does not exist.** The sheet has a rule for it, so a head element is clearly intended, but no Praxis sheet defines `.px-menu` or `.px-menu__head`. Use `.px-pop` from `praxis-admin.css` if you need the popover shell, and write the head yourself. See [what Praxis does not define](#what-praxis-does-not-define).

```html
<div class="ws-pop" style="position:relative">
  <div class="ws-item ws-item--current">
    <span class="ws-item__icon"><span class="material-symbols-rounded" aria-hidden="true">crisis_alert</span></span>
    <span class="ws-item__text">
      <span class="ws-item__name">Incident management</span>
      <span class="ws-item__sub">Teesside works</span>
    </span>
    <span class="ws-item__badge">12</span>
  </div>
  <div class="ws-item ws-item--home">
    <span class="ws-item__icon"><span class="material-symbols-rounded" aria-hidden="true">home</span></span>
    <span class="ws-item__text">
      <span class="ws-item__name">Home hub</span>
      <span class="ws-item__sub">All modules</span>
    </span>
  </div>
  <div class="ws-item">
    <span class="ws-item__icon"><span class="material-symbols-rounded" aria-hidden="true">fact_check</span></span>
    <span class="ws-item__text">
      <span class="ws-item__name">Audit programme</span>
      <span class="ws-item__sub">Rotherham plant</span>
    </span>
    <span class="ws-item__badge">3</span>
  </div>
  <div class="ws-item ws-item--new">
    <span class="ws-item__icon"><span class="material-symbols-rounded" aria-hidden="true">add</span></span>
    <span class="ws-item__text"><span class="ws-item__name">New workspace</span></span>
  </div>
</div>
```

### States

- **Closed** — `[hidden]` plus a `translateX(-100%)`.
- **Open** — `.is-open` on both drawer and scrim, so the panel slides and the scrim fades together.
- **Current destination** — carried over from the rail, either from `--active`/`aria-current` or, where the rail does not mark it, by matching the link target against the current filename.
- **Create** — leads the list as a filled action, so the drawer is self-sufficient on pages with no in-page Create button.

### Responsive behavior

| Viewport | Behaviour |
|---|---|
| > 640px | The 56px icon rail. `.px-navtoggle` is `display:none` |
| ≤ 640px | The rail is `display:none !important`, `--navrail-w` is zeroed so every page's content offset collapses regardless of how it was expressed, and the toggle appears |

Zeroing the token is the part worth noticing: pages offset content by the rail width in at least three different ways — `margin-left`, `padding-left`, a grid column — and one token covers all of them.

The drawer's surface is a fixed slate in both themes rather than `--px-surface`, because it is chrome over the page rather than a page surface, and a constant panel colour reads the same wherever it is opened from.

### Interactive demo

#### Live, at phone width

The frame below is narrower than 640px, so the rail is hidden and the drawer has taken over. Press the hamburger. Widen the frame past 640px and the rail returns.

```html
<div class="app">
  <header class="appbar">
    <a class="appbar__brand" href="#" style="font-weight:600">Ideagen</a>
    <div class="appbar__right">
      <button class="appbar__iconbtn" type="button" aria-label="Notifications">
        <span class="material-symbols-rounded" aria-hidden="true">notifications</span>
      </button>
    </div>
  </header>
  <div class="main">
    <nav class="praxis-navrail" aria-label="Primary">
      <div class="praxis-navrail__core">
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn" type="button" aria-label="Home hub">
            <span class="material-symbols-rounded" aria-hidden="true">home</span>
          </button>
        </div>
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn praxis-navrail__btn--create" type="button" aria-label="Create new">
            <span class="material-symbols-rounded" aria-hidden="true">add</span>
          </button>
        </div>
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn praxis-navrail__btn--active" type="button" aria-label="Incidents">
            <span class="material-symbols-rounded" aria-hidden="true">crisis_alert</span>
          </button>
        </div>
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn" type="button" aria-label="Audits">
            <span class="material-symbols-rounded" aria-hidden="true">fact_check</span>
          </button>
        </div>
        <div class="praxis-navrail__item">
          <button class="praxis-navrail__btn" type="button" aria-label="Corrective actions">
            <span class="material-symbols-rounded" aria-hidden="true">build</span>
          </button>
        </div>
      </div>
    </nav>
    <div class="content">
      <div class="pageheader">
        <div class="pageheader__titlerow">
          <h1 class="pageheader__title">Incidents</h1>
        </div>
      </div>
      <main class="page-body" style="flex:1;min-height:0;overflow:auto;
            padding:var(--px-toolbar-gutter) var(--ph-pad-x,16px)">
        <p>The hamburger only exists below 640px. Above it, CSS shows the rail and the
           script's toggle hides itself.</p>
      </main>
    </div>
  </div>
</div>
```

### Code

`praxis-navrail.css` for both, plus `praxis-navdrawer.js`. One script tag and nothing else:

```html
<script src="praxis-navdrawer.js"></script>
```

It *derives* the drawer from the live rail rather than duplicating the markup, so a rail change propagates automatically and there is nothing to keep in sync across twenty pages. It no-ops on a page with no rail — which is why this reference site, which has no rail, builds its own drawer instead.

### Markup contract

| Item | Requirement |
|---|---|
| Labels | **The contract.** Each rail item needs an `aria-label`, a `title`, or an `img alt` — that is where the drawer's text comes from. An unlabelled rail button is silently dropped from the drawer |
| Rail | A `.praxis-navrail` and an `.appbar` must both exist or the script returns immediately |
| Current | `--active`, `aria-current="page"`, or a matching `href` |
| Glyphs | Cloned from the rail as they are at that moment, so a Material ligature already converted by `praxis-lucide.js` comes across as the SVG |
| JS API | Self-wiring. No init call, and it refuses to build twice |

#### What the drawer defines

Fully specified in `praxis-navrail.css`, so you do not style any of it: `.px-navdrawer` with `.is-open` and `[hidden]` states, a `__scrim`, a `__head` carrying `__brand` and `__close`, and a `__list` of `__item`s each with an `__icon` and `__label`. `__group` separates runs of items. The icon slot accepts an `<svg>`, an `<img>` or a `.material-symbols-rounded` ligature.

### Token reference

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.praxis-navrail` | 39 |
| `.px-navdrawer` | 37 |
| `.ws-item` | 36 |
| `.ws-pop` | 28 |
| `.px-navtoggle` | 7 |
| `.material-symbols-rounded` | 3 |
| `.is-open` | 2 |
| `.px-menu` | 1 |
| `.icon` | 1 |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Label every rail item. It is the whole contract.
- Let the script derive the drawer — do not hand-write one.
- Mark the current destination on the rail so the drawer inherits it.

**Don't**

- Duplicate the rail's markup into a drawer.
- Rely on the drawer where there is no rail — it will not exist.
- Hide a destination from the rail and expect it in the drawer.

### Accessibility

- The labels are an accessibility requirement and a functional one at the same time, which is the useful thing about this design: an unlabelled rail button is invisible to a screen reader *and* missing from the drawer.
- The toggle carries `aria-expanded`.
- The drawer traps focus while open, Escape closes, and focus returns to the toggle.
- The scrim is not focusable.
- Motion honours `prefers-reduced-motion` — both the drawer transform and the scrim fade are disabled in that mode.
- At ≤640px the rail is genuinely hidden, so its destinations exist only in the drawer. That is why "the drawer is self-sufficient" matters rather than being a nicety.

### Dimensions

| Element | Property | Value |
|---|---|---|
| Rail | Width | `--praxis-navrail-width`, 56px |
| Drawer | Width | 280px, `max-width:85vw` |
| Drawer | Surface | `rgb(36,48,60)` in both themes |
| Drawer head | Height | `--praxis-appbar-h`, 64px |
| Item | Min height | 48px |
| Toggle / close | Size | 40px |
| Transition | Drawer / scrim | 220ms / 200ms |

---

## Card, page and texture

The two layout surfaces every screen is made of, the dot texture behind them, and why the card radius is 12px and not the 20px the token says.


Tier: **ready** · Sheet: `praxis-workspace.css, praxis-core.css`
`.card` and `.page` are the two surfaces almost every screen is assembled from, and they are defined in **`praxis-workspace.css`** — not in core, not in a card sheet. That is one of the three "base in a surprising place" traps; the bundle makes it moot.

### Anatomy

1. **Page** — `.page`, the material everything sits on: a fill plus the dot texture.
2. **Card** — `.card`, a raised surface on it.

Two names, and only one of them is complete. See Variants.
#### Card

```html
<div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))">
  <div class="card" style="padding:1rem;box-shadow:var(--px-card-rail)">
    <strong>Rail</strong>
    <p style="margin:.25rem 0 0;color:var(--praxis-color-text-secondary)">Recedes. For a
       side panel that supports the subject.</p>
  </div>
  <div class="card" style="padding:1rem">
    <strong>Default</strong>
    <p style="margin:.25rem 0 0;color:var(--praxis-color-text-secondary)">The card's own
       shadow, <code>--praxis-card</code>.</p>
  </div>
  <div class="card" style="padding:1rem;box-shadow:var(--px-card-raised)">
    <strong>Raised</strong>
    <p style="margin:.25rem 0 0;color:var(--praxis-color-text-secondary)">The subject of
       the screen.</p>
  </div>
</div>
```

**The card radius is 12px, not the 20px `--praxis-radius-card` declares.** `praxis-core.css` overrides that token to 12px under `body[data-variant="praxis"]`, at a higher specificity than `:root`, so 12px is what renders. Reading the token file gives the wrong answer. See [the nine overrides](#the-praxis-variant-overrides-nine-tokens).

`.card` gives you the surface, the radius and the shadow. It does **not** give you padding — that varies by what is inside, and a card of table rows wants none. Every example above sets its own.

#### Page

`.page` is the content wrapper inside the scroll container. Its job is the horizontal rhythm: it inherits `--ph-pad-x` from `.content` so the page body lines up with the header and the toolbar above it. Below 640px it switches to `--px-gutter`, the single 16px phone inset, along with the app bar and header — so all three step in together rather than by different amounts.

### Variants

| Name | State |
|---|---|
](#card)| `.card` | **No base.** `praxis-workspace.css` gives it a slate shadow and a 12px radius and nothing else — no fill, no padding. See [Card base |
| `.admin-card` | Complete: fill, shadow, radius, 20px/22px padding, `__title`, `__meta`, and a `--flush` density |
| `.admin-panel` | The recessed form, on `--px-surface-2`. What a card contains rather than a card |
| Elevation tiers | Three exist as tokens — `--px-card-rail`, `--praxis-card`, `--px-card-raised` — and only the middle one is reachable through a class |

### States

A static card has none. An interactive one needs hover, focus-visible and press, and Praxis defines none of them for a card — this reference site had to write its own for its page grids.

The interesting part is that the right hover depends on what the card sits *on*: on the page material a lift is correct, and on another card a lift is wrong and the fill should step to `--px-surface-2` instead. That is why `.admin-panel` exists.

### Responsive behavior

Cards are sized by their grid — `.admin-grid--2/3/4/6` or `.admin-cols` — and those collapse at 1024px, 768px and 480px. Below 640px the inline padding follows `--px-gutter` through the container.

The page texture adapts too: `--px-dot-clear` holds the dots clear of the top chrome, and the horizontal fade is measured from the nav rail's right edge rather than from x=0, so the visible ramp is symmetric about the content area.

### Interactive demo

#### The dot texture

The dot grid is not a class. It is painted on `body` by `praxis-core.css` as a repeating `radial-gradient` at `18px`, using `--px-dot`, with `background-attachment:fixed`.

Two consequences that matter:

- **An inner scroll container is correct, not a workaround.** Because the texture is fixed, it reads as page material and stays put while content moves over it. That is why `.app` is `height:100vh; overflow:hidden` and the content column scrolls.
- **`--px-dot-clear` stops the grid under the chrome.** It is set to exactly 192px — the sum of the app bar, page header and toolbar band. Change a band height without changing the token and the texture cuts across your header. See [chrome metrics](#chrome-metrics).

```html
<div class="app">
  <header class="appbar">
    <a class="appbar__brand" href="#" style="font-weight:600">Ideagen</a>
  </header>
  <div class="main">
    <div class="content">
      <div class="pageheader">
        <div class="pageheader__titlerow">
          <h1 class="pageheader__title">The grid stops here</h1>
        </div>
      </div>
      <main class="page" style="flex:1;min-height:0;overflow:auto;padding-top:var(--px-toolbar-gutter)">
        <div class="card" style="padding:1rem;max-width:26rem">
          <strong>On the texture</strong>
          <p style="margin:.25rem 0 0;color:var(--praxis-color-text-secondary)">Scroll
             inside this frame — the dots stay put because the texture is fixed.</p>
        </div>
        <div style="height:14rem"></div>
      </main>
    </div>
  </div>
</div>
```

#### The animated dot field

A different thing with a similar name. `praxis-dotfield.js` is a single-canvas animated dot grid for hero and login moments — one `<canvas>`, one draw loop, every dot drawn with `arc()` each frame so it stays smooth past 4,000 dots. It is not the page texture and does not replace it.

**Two things will make it render nothing, both silently.**

`create()` builds the field but **does not start the loop** — you must call `.start()`. And **the dots are drawn white**, shading to the teal signature under the pointer, so on a light surface they are invisible. It was built for the login page; give it a dark backdrop.

Until 2026-08-18 the usage block at the top of `praxis-dotfield.js` showed `create` → `setMode` → `setParam` and never mentioned `start()`, so following the file's own instructions gave you a blank canvas. Both facts are in that comment now.

```html
<div style="background:#0f1720;border-radius:var(--praxis-radius-md);overflow:hidden">
  <canvas id="field" style="width:100%;height:210px;display:block"></canvas>
</div>
<script>
  var field = PraxisDotField.create(document.getElementById('field'), {
    global: { spacing: 22, dotRadius: 1.6, teal: '#29D2D7', magenta: '#E30072' }
  });
  field.setMode('wave');
  field.start();          /* required — create() does not begin the loop */
</script>
```

The rest of the surface: `setParam(key, value)` for a live mode parameter, `setGlobal(key, value)` for a global one (rebuilds the grid), `restart()`, and `destroy()` — call that one when you tear the canvas down, or the loop keeps running.

Modes are the keys of `PraxisDotField.MODES`: `wave`, `sweep`, `rippleLoop`, `sonar`, `radar`, `diagonal`, `breathe`, `flow`, `rain`, `constellation`, `organic`, `vortex`, `logo` and `magnet`. Each entry is `{label, controls:[…]}`, and `field.setMode(key)` resets the parameters to that mode's defaults.

Global options include `spacing`, `dotRadius`, `restAlpha`, `teal`, `magenta`, `originX`, `originY`, `glow`, `ring`, `edgeFade` and `loop`. It is a real animation running a real loop, so mind it on a page that is already busy.

### Code

`.card`'s shadow is in `praxis-workspace.css`; `.admin-card` is in `praxis-admin.css`; the page texture is on `body[data-variant="praxis"]` in `praxis-core.css`.

That distribution is the practical problem: the complete card is in the largest sheet in the system, so a record page wanting a card either loads the admin shell or writes its own. [Card base](#card) proposes moving the canonical definition to core and keeping `.admin-card` as an alias.

### Markup contract

| Item | Requirement |
|---|---|
| Card element | Any block. `<a>` for an interactive card, which is what forces the missing states above |
| `__title` | A real heading where the card is a section of the page. It is a `<p>` in every current example, which is right for a label and wrong for a section |
| Nesting | Step the surface, do not stack a second shadow |
| `.page` | The texture is on `body`, not on `.page`, under the Praxis variant. A page that sets its own background will cover it |
| JS | None for either. `praxis-dotfield.js` is a separate opt-in |

### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--px-card-rail` | `0 0 0 .5px rgba(16,36,58,.055),0 1px 1px rgba(16,36,58,.035),inset 0 .5px 0 rgba(255,255,255,.6)` | `0 0 0 .5px rgba(255,255,255,.07),0 1px 2px rgba(0,0,0,.30),inset 0 .5px 0 rgba(255,255,255,.05)` |
| `--px-card-raised` | `0 0 0 .5px rgba(16,36,58,.07),0 1px 2px rgba(16,36,58,.05),0 2px 6px -2px rgba(16,36,58,.06),0 24px 48px -22px rgba(16,36,58,.20),inset 0 .5px 0 rgba(255,255,255,.85)` | `0 0 0 .5px rgba(255,255,255,.11),0 1px 2px rgba(0,0,0,.45),0 4px 10px -3px rgba(0,0,0,.40),0 32px 60px -24px rgba(0,0,0,.75),inset 0 .5px 0 rgba(255,255,255,.10)` |
| `--px-dot` | `rgba(16,36,58,.11)` | `rgba(255,255,255,.09)` |
| `--px-dot-clear` | `192px` | — |
| `--praxis-card` | `0 0 0 .5px rgba(16,36,58,.06),0 1px 1.5px rgba(16,36,58,.045),0 10px 28px -14px rgba(16,36,58,.10),inset 0 .5px 0 rgba(255,255,255,.7)` | `0 0 0 .5px rgba(255,255,255,.08),0 1px 2px rgba(0,0,0,.4),0 16px 40px -18px rgba(0,0,0,.6),inset 0 .5px 0 rgba(255,255,255,.07)` |


`--praxis-radius-card` is 20px in the token file and 12px under the Praxis variant. The variant wins, so 12px is the card geometry — one of the nine documented overrides.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Use `.admin-card`. It is the one that works.
- Use `.admin-panel` for anything inside a card.
- Let the grid size the card.

**Don't**

- Use bare `.card` expecting a surface.
- Give every card on a page the same elevation. The three tiers exist because a page of identically-shadowed cards reads as one flat plane, and `praxis-core.css` says so.
- Put the card's padding on its contents.
- Set a background on `.page` — you will cover the texture.

### Accessibility

- A card is not a landmark. If it needs to be findable, its title is a heading.
- An interactive card needs one target. A card wrapped in an anchor that also contains buttons produces nested interactive elements, which is invalid and behaves unpredictably.
- The dot texture is decorative and must never carry meaning.
- `praxis-dotfield.js` animates. It has to honour `prefers-reduced-motion`, and any page using it should check that it does.
- **Forced colors:** a card is a fill plus a shadow and loses both, so a page of cards becomes one undifferentiated block. See [Forced colors](#forced-colors-and-high-contrast).

### Dimensions

| Element | Property | Value |
|---|---|---|
| `.admin-card` | Padding | 20px 22px |
| `--flush` | Padding | 16px 18px |
| Card | Radius | 12px |
| `__title` | Size / weight | 16px / 700 |
| Dot grid | Pitch | 18px |
| Dot clearance | `--px-dot-clear` | 192px — the app bar, page header and toolbar band combined |
| `.admin-grid` | Gap | 18px 34px |

---

## Filters

The largest component in Praxis — 403 rules and a filter engine where Standard and Custom are two views onto one expression tree.


Tier: **settling** · Sheet: `praxis-filters.css` · Script: `praxis-filters.js`
A centred filter modal, a quick-filter strip and an active-filter chip bar, where **Standard and Custom are two views onto one expression tree**. Rich fields live in the custom tree, quick and scope fields in a flat state; no field is in both, so ANDing the two never double-filters.

**The host owns rendering.** `onChange` receives the filtered records; the engine never touches your results DOM. The example below renders its own results list in exactly that way.

```html
<div style="display:flex;gap:.5rem;align-items:center;margin-bottom:.75rem">
  <button class="tbtn" data-action="open-filter-drawer" type="button">
    <span class="material-symbols-rounded" aria-hidden="true">filter_list</span> Filters
  </button>
  <div data-chips></div>
</div>

<div data-quick-filters></div>

<div id="results"></div>

<div data-drawer-scrim hidden></div>
<div data-filter-drawer class="filter-drawer" hidden>
  <div data-filter-list></div>
</div>

<script>
  var RECORDS = [
    { id: 'CA-1041', title: 'Re-band pallet stacks', status: 'Open',      owner: 'Marcus Silva', site: 'Teesside works',  priority: 'High' },
    { id: 'CA-1042', title: 'Refresh bay markings', status: 'Open',       owner: 'Aoife Byrne',  site: 'Teesside works',  priority: 'Medium' },
    { id: 'CA-1043', title: 'Retrain late shift',   status: 'In review',  owner: 'Priya Raman',  site: 'Rotherham plant', priority: 'High' },
    { id: 'CA-1044', title: 'Replace bay 4 mirror', status: 'Closed',     owner: 'Tom Okafor',   site: 'Rotherham plant', priority: 'Low' },
    { id: 'CA-1045', title: 'Audit truck logs',     status: 'In review',  owner: 'Marcus Silva', site: 'Teesside works',  priority: 'Medium' },
    { id: 'CA-1046', title: 'Update permit form',   status: 'Open',       owner: 'Aoife Byrne',  site: 'Grangemouth',     priority: 'Low' }
  ];

  function renderResults(rows) {
    document.getElementById('results').innerHTML = rows.length
      ? '<div class="rtable"><table><thead><tr><th>Reference</th><th>Action</th>'
        + '<th>Status</th><th>Owner</th><th>Site</th></tr></thead><tbody>'
        + rows.map(function (r) {
            return '<tr><td>' + r.id + '</td><td>' + r.title + '</td><td>' + r.status
                 + '</td><td>' + r.owner + '</td><td>' + r.site + '</td></tr>';
          }).join('') + '</tbody></table></div>'
      : '<p class="rfield__hint">No records match.</p>';
  }

  PraxisFilters.init({
    records: RECORDS,
    fieldMap: {
      'Status': function (r) { return r.status; },
      'Action Owner': function (r) { return r.owner; },
      'Site': function (r) { return r.site; },
      'Priority': function (r) { return r.priority; },
      'Action Title': function (r) { return r.title; }
    },
    // Replace the ported CAPA vocabularies with your own, or the menus offer
    // values your data has never heard of and every selection returns nothing.
    statuses:   ['Open', 'In review', 'Closed'],
    people:     ['Marcus Silva', 'Aoife Byrne', 'Priya Raman', 'Tom Okafor'],
    sites:      ['Teesside works', 'Rotherham plant', 'Grangemouth'],
    priorities: ['High', 'Medium', 'Low'],
    scopeChip:  null,
    onChange:   renderResults
  });

  renderResults(RECORDS);
</script>
```

### Anatomy

1. **Toolbar row** — `.filter-toolbar-row` with `.filter-toggle` and `.filter-chips`.
2. **Chips** — `.chip`, one per active filter, with a clear-all.
3. **Drawer** — `.filter-drawer` over `.drawer-scrim`.
4. **Rows** — `.filter-row`, one per field, with a type-specific control.
5. **Custom builder** — `.custom-builder`, the expression tree.
6. **Summary** — `.custom-summary`, the expression in words.

#### The two views onto one tree

Standard and Custom are not two filter systems. They are two editors for one expression tree, and `.filter-view-switch` moves between them — `__opt` with `.is-active`, which is this sheet's convention rather than the `--active` BEM modifier the create-new and segmented controls use.

#### Standard view

| Class | What it is |
|---|---|
| `.filter-toolbar-row` | The row above the list: search, type filter, view switch |
| `.filter-search-input`, `.filter-search` | Two search fields — the drawer's own, and the one inside a value menu. Both wrap an `input` plus a `.material-symbols-rounded` glyph. |
| `.filter-type-select`, `.filter-type-buttons`, `.filter-type-btn` | Filter-type narrowing. `.filter-type-btn` uses **`[aria-pressed="true"]`** for its on state, and `.filter-type-select` uses `.is-active` — two conventions, one row. |
| `.filter-row` | One filter. The engine renders these into `[data-filter-list]`. |
| `.filter-select`, `.filter-date`, `.filter-date-range` | Value controls. `.filter-date__input` is the bare input inside. |
| `.filter-cond` | An additional condition on a row; adjacent ones get a separator via `+` |
| `.filter-more` | The collapsed overflow group. `__head`, `__count`, `__body`, `__list`, `__empty`, opened with `.is-open`. |
| `.frow-chip` | A selected value inside a row, with `__x` to remove it |
| `.filter-controls` | The host-side strip. Note it resets `:where(button)` and `:where(*)` inside itself — a deliberate zero-specificity reset so a host's own button styles do not leak in. |
| `.drawer-scrim` | Uses `[data-open]`, not `.is-open`. A third convention in the same sheet. |

#### Custom view — the expression tree

This is the largest single structure in Praxis and the reason the sheet is 403 rules. `.custom-builder` holds a `__head` and a `__tree`; the tree is nested `.cf-group`s containing `.cf-cond` rows.

| Class | What it is |
|---|---|
| `.cf-group` | A bracket. `--d0` is the root depth, and `.cf-group .cf-group` styles nesting, so depth is expressed structurally rather than with a depth class per level. |
| `.cf-group__bar`, `__hint`, `__children` | The group's own controls, its explanatory line, and the slot its members sit in |
| `.cf-join` | The AND/OR toggle between members. `.cf-join__and.is-active` and `.cf-join__or.is-active` are styled separately, because the two get different colours. |
| `.cf-cond` | One condition. `__lead` is its leading cell. |
| `.cf-select`, `.cf-value`, `.cf-input`, `.cf-pick` | Field, operator and value controls within a condition |
| `.cf-remove`, `.cf-empty` | Delete affordance, and the empty-group state |
| `.cf-example-btn` | "Show me an example" in the builder head |
| `.cf-date-range` | The two-field date control, in condition form |

#### Drag and drop

Conditions and groups are reorderable, and the states are all classes on the moving or target element rather than inline styles — so a host can restyle them:

- `.cf-drag` is the handle, with `:hover` and `:active` treatments. Inside a group bar it is `.cf-group__bar .cf-drag`.
- `.cf-dragging` is on the element in flight.
- `.cf-drop-before` and `.cf-drop-after` draw the insertion line with `::before` and `::after` — so the indicator costs no extra element.
- `.cf-cond.is-selected` and `.cf-group-selected` mark a multi-select. Note the two spellings: a modifier state on one, a separate class on the other.
- `.cf-enter` and `.cf-exit` are the add and remove transitions.

#### The expression summary

`.custom-summary` renders the tree back as a readable sentence, and the `.cfx-*` family is its syntax highlighting: `.cfx-bool` for AND/OR, `.cfx-opword` for operators, `.cfx-val` for values, `.cfx-paren` for brackets, and `.cfx-incomplete` for a condition that is not yet valid. That last one is the useful part — the summary shows you what is missing rather than refusing to render.

**Four state conventions in one sheet.** `.is-active` on the view switch and type select, `[aria-pressed="true"]` on the type buttons, `[data-open]` on the scrim, and `.is-selected` versus `.cf-group-selected` for the same idea at two levels. This is the clearest symptom of the sheet being a port: each convention was right in its original file. Read the selector before assuming which one applies.

### Variants

| Variant | Use |
|---|---|
| Standard | A row per field. The common case |
| Custom | `.custom-builder` — nested groups, AND/OR joins, drag to reorder. The same tree the summary renders |
](#quick-filter-rail)| Quick filters | `.quick-filters` / `.qfilter`, shared with [the quick-filter rail |
](#btn)| Footer buttons | `.btn--neutral` and `.btn--clear`, defined *only* inside `.filter-drawer`. They sit on top of a host `.btn` set that Praxis does not provide — see [Button base |

### States

- **Drawer open** — `.is-open`, with the scrim.
- **Filter active** — a chip appears; `.filter-toggle` shows a count.
- **Expression states** — `.is-expanded`, `.cf-group-selected`, `.cf-dragging`, `.cf-drop-before` / `--after`, `.cf-enter` / `.cf-exit`.
- **Incomplete** — `.cfx-incomplete`, an expression that is not yet valid. Worth knowing this exists: an incomplete filter should not be applied silently.
- **Empty** — `.cf-empty`, one of the three ad-hoc empty states the roadmap consolidates.
- **On/off** — `.onoff` wrapping a `.switch`. Note this is the sibling markup form; see [Form controls](#form-controls).

### Responsive behavior

The drawer is full-height at every width and the toolbar row wraps. The part that adapts is the band around it — a `.filter-toggle` is a toolbar control and moves into the overflow popover when the band goes compact.

This is a *port* of the Responsive Search project rather than a Praxis-native sheet, so several of its internals use their own scale rather than the shared tokens.

### Interactive demo

#### Initialising

Everything application-specific enters through `init`. It returns `null` if `[data-filter-drawer]` is absent, so a page with no modal is fine.

| Option | What it is |
|---|---|
| `records` | The unfiltered set |
| `fieldMap` | Filter name to accessor: `{ 'Status': r => r.status }` |
| `today` | "Now" for the relative date operators. Pass a fixed date to make a demo reproducible. |
| `parseDate` | Optional, for non-ISO date strings |
| `onChange` | Receives the filtered records. You render them. |
| `people`, `sites`, `tasks`, `statuses`, `priorities`, `actionTypes`, `tree` | Value vocabularies. **Replace these.** Left at the defaults, the menus offer ported CAPA values your data has never heard of and every selection returns nothing. |
| `options` | Override outright, by field name |
| `defaultFavorites`, `defaultQuick` | Which filters start pinned |
| `scopeChip` | Omit entirely if you have no fixed scope |

The returned object also exposes `setRecords`, `apply`, `state`, `clearAll`, `open`, `close` and `FILTERS` — the real field catalog, so you can build a field map against it rather than guessing names.

### Code

`praxis-filters.css` and `praxis-filters.js` — at 83KB and 122KB the largest pair in the system, and the only component here with a real JavaScript API rather than self-wiring alone.

#### Three things to know before you commit to filters

1. **The drawer's full chrome is not shipped as markup.** The engine renders filter rows into `[data-filter-list]`, but the surrounding head, footer and resize handles came from the originating prototype's own page. The skeleton above is the minimum the engine needs; you will be assembling the rest yourself from `praxis-filters.css`.
2. **This sheet is a port** from the Responsive Search project, now owned here. Do not re-extract over it — that would reintroduce the parallel `--s`/`--r`/`--t` token vocabulary and silently revert the field treatment.
3. **Its dark mode does not follow a host theme override.** It themes itself by flipping palette primitives inside its own scope, 21 declarations, instead of using the semantic tokens. Everything else in Praxis follows a host override; this does not. Known rough edge — toggle this page to dark and open the modal to see it.

It also adds `.btn--neutral` and `.btn--clear`, scoped to `.filter-drawer` so they cannot leak into your own button scale — and it expects **your** `.btn` base underneath them. Praxis does not define one; see [what Praxis does not define](#what-praxis-does-not-define).

### Markup contract

#### Markup contract

Four hooks, all data attributes. The engine renders filter rows into `[data-filter-list]`.

>
`[data-action="open-filter-drawer"]` · `[data-chips]` · `[data-quick-filters]` · `[data-drawer-scrim]` · `[data-filter-drawer] > [data-filter-list]`

It sets `data-filter-mode="modal"` on `<html>` itself if you have not — the centred-modal rules are gated on that attribute.

### Token reference

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.filter-row` | 74 |
| `.filter-drawer` | 63 |
| `.select-menu` | 47 |
| `.qfilter` | 39 |
| `.filter-chips` | 28 |
| `.btn` | 26 |
| `.material-symbols-rounded` | 24 |
| `.chip` | 21 |
| `.filter-view-switch` | 18 |
| `.quick-filters` | 17 |
| `.filter-more` | 16 |
| `.custom-builder` | 16 |
| `.filter-controls` | 15 |
| `.segmented` | 14 |
| `.is-active` | 14 |
| `.filter-type-btn` | 14 |
| `.cf-group` | 14 |
| `.custom-summary` | 12 |
| `.cf-join` | 11 |
| `.filter-toggle` | 9 |
| `.filter-search-input` | 9 |
| `.filter-date` | 9 |
| `.drawer-scrim` | 7 |
| `.filter-select` | 7 |
| `.filter-search` | 7 |
| `.cf-cond` | 7 |
| `.filter-cond` | 6 |
| `.cf-value` | 6 |
| `.onoff` | 6 |
| `.cf-input` | 5 |
| `.is-on` | 5 |
| `.cf-drag` | 5 |
| `.frow-chip` | 4 |
| `.is-open` | 4 |
| `.cf-example-btn` | 4 |
| `.cf-remove` | 4 |
| `.filter-expr` | 4 |
| `.cfx-bool` | 4 |
| `.filter-toolbar-row` | 3 |
| `.filter-type-select` | 3 |
| `.cf-pick` | 3 |
| `.cf-enter` | 3 |
| `.icon-btn` | 2 |
| `.switch` | 2 |
| `.is-checked` | 2 |
| `.is-expanded` | 2 |
| `.is-mixed` | 2 |
| `.cf-select` | 2 |
| `.cf-drop-before` | 2 |
| `.cf-drop-after` | 2 |
| `.cf-group-selected` | 2 |
| `.filter-menu` | 2 |
| `.filter-type-buttons` | 1 |
| `.filter-date-range` | 1 |
| `.cf-empty` | 1 |
| `.is-selected` | 1 |
| `.cf-dragging` | 1 |
| `.cf-date-range` | 1 |
| `.cfx-paren` | 1 |
| `.cfx-val` | 1 |
| `.cfx-opword` | 1 |
| `.cfx-incomplete` | 1 |
| `.cf-exit` | 1 |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Read the three caveats in Code before committing to this component. It is the largest thing in Praxis and the least Praxis-native.
- Show active filters as chips, and give the toggle a count.
- Announce the result count when a filter is applied.

**Don't**

- Use `.btn--neutral` or `.btn--clear` outside `.filter-drawer`. They are scoped there and depend on a base that does not exist.
- Use `.icon-btn` outside the drawer either — it is 36px there and nothing elsewhere.
- Apply an incomplete expression. `.cfx-incomplete` exists so you can tell.
- Reach for the custom builder when a row per field would do.

### Accessibility

- The drawer needs a focus trap, Escape and focus restoration. Verify what the script supplies rather than assuming — this sheet is a port and its accessibility was not audited as part of Praxis.
- Applying a filter changes the result set: that is a content change and the new count belongs in a live region.
- The custom builder's drag-to-reorder needs a keyboard equivalent, or the expression tree is mouse-only.
- `.onoff` uses the sibling `.switch` form, which until 2026-08-18 rendered as a bare browser checkbox because no sheet defined its track or thumb. Both forms are now defined from one set of values.
- Chips are removable filters, so each needs a labelled remove control naming which filter it clears.

### Dimensions

| Element | Property | Value |
|---|---|---|
| `.chip` | Min height / padding | 40px / 4px 16px |
| `.chip__close` | Size | 24px |
| `.icon-btn` | Size | 36px, drawer-only |
| `.switch` | Track / thumb / travel | 34×20 / 16px / 14px |

---

## Create New menu

A full flyout stylesheet and a shared catalog of record types — with no render logic between them. The CSS and the data ship; the markup is yours.


Tier: **settling** · Sheet: `praxis-create-new.css` · Script: `praxis-create-new.js`
**`praxis-create-new.js` is pure data.** Its own header says so: "Render logic and wiring live per-page; this file is pure data." It ships two arrays, `CREATE_CATALOG` and `CN_TEMPLATES`, and nothing that draws them. The stylesheet is complete and there is no component to call — you write the render.

The point of shipping the catalog without the renderer is that the workspace and the record page both build a Create New menu, and the two must not drift on *what* can be created. They are free to differ on how it looks.

### Anatomy

1. **Overlay and scrim** — `.cn-overlay`, `.cn-scrim`.
2. **Flyout or modal** — `.cn-flyout` from the rail, `.cn-modal` as a centred dialog.
3. **Head** — `.cn-head` with `.cn-close` and `.cn-controls`.
4. **Find** — `.cn-find`, a leading-glyph search inside the menu.
5. **Segmented** — `.cn-seg`, the Shortcuts / All / Templates switch.
6. **Body** — `.cn-body` and `.cn-content`, holding `.cn-group`, `.cn-grid` and `.cn-item`.
7. **Footer** — `.cn-footer`, with `.cn-manage-note`.

#### The catalog shape

Six groups, each with a brand `tone` that drives the group header colour, and a Material Symbols ligature for its icon.

```html
CREATE_CATALOG = [
  { group: 'Incidents & Events', icon: 'emergency_home', tone: 'pink', items: [
    { id: 'incident',    icon: 'crisis_alert', label: 'Incident' },
    { id: 'near-miss',   icon: 'warning',      label: 'Near-Miss' },
    …
  ]},
  { group: 'Audit & Findings', icon: 'frame_inspect', tone: 'teal', items: [ … ]},
  …
]

CN_TEMPLATES = [
  { icon: 'fact_check', label: 'Boeing audit-prep checklist', type: 'Audit',
    tone: 'teal', sub: 'Scope, standard & 12 checkpoints pre-filled' },
  …
]
```

The tone values are `pink`, `teal`, `blue`, `orange`, `purple` and `green`, matching the `.cn-group--*` modifiers exactly, so a group renders correctly by passing its tone straight through.

### Variants

| Variant | Use |
|---|---|
| `.cn-flyout` | Opened from the nav rail's Create button |
| `.cn-modal` | Centred, for a full catalogue |
| Shortcuts / All / Templates | The three views, switched by `.cn-seg`. Templates uses `.cn-tpl` and `.cn-tpl-list` rather than the item grid |

#### Templates

```html
<div class="cn-flyout" style="position:relative;inset:auto">
  <div class="cn-head"><p class="cn-head__title">Start from a template</p></div>
  <div class="cn-body"><div class="cn-tpl-list" id="tpls"></div></div>
  <div class="cn-footer">
    <p class="cn-manage-note">Templates are managed per solution.</p>
  </div>
</div>
<script>
  document.getElementById('tpls').innerHTML = CN_TEMPLATES.map(function (t) {
    return '<button class="cn-tpl" type="button">'
      + '<span class="cn-tpl__icon"><span class="material-symbols-rounded">' + t.icon + '</span></span>'
      + '<span class="cn-tpl__body">'
      + '<div class="cn-tpl__name">' + t.label + '</div>'
      + '<div class="cn-tpl__meta">' + t.type + ' · ' + t.sub + '</div>'
      + '</span></button>';
  }).join('');
</script>
```

**`.cn-tpl__name` and `.cn-tpl__meta` must be block-level, and nothing in the sheet enforces it.** The name sets `white-space:nowrap` with `text-overflow:ellipsis` and the meta sets `margin-top` — both meaningless on an inline element. Their parent `.cn-tpl__body` is `flex:1; min-width:0`, not a flex column, so `<span>`s run together on one line with no truncation.

The equivalent `.ws-item__text` in `praxis-navrail.css` *is* `display:flex; flex-direction:column`, so spans stack there. Two near-identical two-line rows, two different contracts. Use `<div>`s in `.cn-tpl__body` and you are safe in both.

### States

- **Closed / open** — `[hidden]` on the overlay.
- **Collapsed group** — `.is-collapsed`.
- **Filtered** — driven by `.cn-find`.
- **Empty** — no matches. This sheet has no empty-state class of its own, which is part of why [Empty state](#empty-state) is on the roadmap.

### Responsive behavior

The flyout is anchored to the rail, and below 640px the rail itself is hidden — so on a phone the Create action arrives through [the nav drawer](#nav-drawer-and-rail-flyouts), which leads its list with Create as a filled action specifically so the catalogue stays reachable.

That is the responsive story: the component does not adapt so much as hand over.

### Interactive demo

#### Rendering it

The example below reads the real shipped catalog and builds the flyout from it with the real classes. This is roughly the minimum render, and it is the part you own.

```html
<div class="cn-flyout cn-flyout--wide" style="position:relative;inset:auto">
  <div class="cn-head">
    <p class="cn-head__title">Create new</p>
    <button class="cn-close" type="button" aria-label="Close">
      <span class="material-symbols-rounded" aria-hidden="true">close</span>
    </button>
  </div>
  <div class="cn-controls">
    <input class="cn-find" type="search" placeholder="Find a record type" aria-label="Find a record type">
    <div class="cn-seg">
      <button class="cn-seg__btn cn-seg__btn--active" type="button">Records</button>
      <button class="cn-seg__btn" type="button">Templates</button>
    </div>
  </div>
  <div class="cn-body" id="cnbody"></div>
</div>
<script>
  /* CREATE_CATALOG is a bare global from the classic script — not window.CREATE_CATALOG. */
  var body = document.getElementById('cnbody');
  body.innerHTML = CREATE_CATALOG.slice(0, 3).map(function (g) {
    return '<div class="cn-group cn-group--' + g.tone + '">'
      + '<div class="cn-group__head">'
      + '<span class="cn-group__icon"><span class="material-symbols-rounded">' + g.icon + '</span></span>'
      + '<span class="cn-group__title">' + g.group + '</span></div>'
      + '<div class="cn-grid">'
      + g.items.map(function (i) {
          return '<button class="cn-item" type="button" data-cn-create="' + i.id + '">'
            + '<span class="cn-item__icon"><span class="material-symbols-rounded">' + i.icon + '</span></span>'
            + '<span class="cn-item__label">' + i.label + '</span></button>';
        }).join('')
      + '</div></div>';
  }).join('');
</script>
```

### Code

`praxis-create-new.css` and `praxis-create-new.js`. The script auto-initialises.

#### Getting at the data, and the trap

Both arrays are on `window`, and both bare identifiers still work. Measured in a browser:

| Access | Result |
|---|---|
| `window.CREATE_CATALOG` | 6 groups |
| `window.CN_TEMPLATES` | 5 templates |
| `CREATE_CATALOG` from another classic `<script>` | Still works |

**This was broken until 2026-08-18, and the failure mode is worth recognising.** Both were declared with top-level `const` and never assigned anywhere. In a classic script that creates a global *lexical* binding — readable as a bare identifier from another classic script, but **not a property of `window`**, so a guard like `if (window.CREATE_CATALOG)` always failed.

Worse, `package.json` declares `"type": "module"` and no shipped script has an `export`. Imported through a bundler, both `const`s became module-scoped and invisible to everything else, with no error — so `import '@ideagen-ax/praxis/dist/praxis-create-new.js'`, the documented npm path, was a silent no-op.

Only three shipped scripts assign to `window` at all: `PraxisFilters`, `PraxisDotField` and the Mazlan globals. The rest survive a module import because they self-wire as a side effect; a pure-data file had nothing to fall back on.

### Markup contract

| Item | Requirement |
|---|---|
| Overlay | `[hidden]` closed. `role="dialog"` with `aria-modal` for the modal form |
| Find | A real labelled input. Its result count should be announced |
| Segmented | `.cn-seg` is a choice control and needs the roles to match — either tabs or a radio group, not unlabelled buttons |
](#module-selector)| Items | `.cn-item` is shared with [the module selector, so keep the icon and label structure identical |
| Close | Labelled. Escape should also close |
| JS | Self-wiring |

#### The rest of the vocabulary

| Class | What it is |
|---|---|
| `.cn-overlay`, `.cn-scrim` | The backdrop pair, both `[hidden]`-driven |
| `.cn-flyout`, `--wide` | The panel. `--wide` is the full record-type grid; the base width suits a single column. |
| `.cn-modal` | The centred variant, for when the flyout is not anchored |
| `.cn-seg`, `.cn-seg__btn--active` | Records / Templates switch. Note `--active`, not `.is-active`. |
| `.cn-list`, `.cn-row`, `.cn-row__check`, `.cn-section-label` | The manage view — a checkable list rather than a grid. `.cn-row--selected` tints the icon. |
| `.cn-flyout--manage .cn-find` | The find field is restyled in the manage view |

`.material-symbols-rounded` — the icon base every Praxis page uses — is defined in **this** sheet, not in core. One of the three surprising-location bases. Another reason to load the bundle.

### Token reference

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.cn-group` | 17 |
| `.cn-flyout` | 15 |
| `.cn-row` | 10 |
| `.material-symbols-rounded` | 9 |
| `.cn-tpl` | 7 |
| `.cn-find` | 5 |
| `.cn-seg` | 5 |
| `.cn-item` | 5 |
| `.cn-overlay` | 3 |
| `.cn-scrim` | 3 |
| `.cn-grid` | 3 |
| `.cn-head` | 3 |
| `.cn-close` | 3 |
| `.cn-content` | 2 |
| `.cn-modal` | 2 |
| `.cn-footer` | 2 |
| `.cn-controls` | 1 |
| `.cn-body` | 1 |
| `.cn-tpl-list` | 1 |
| `.cn-manage-note` | 1 |
| `.cn-list` | 1 |
| `.cn-section-label` | 1 |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Keep `.cn-item` markup identical to the module selector's — they are one vocabulary on purpose.
- Announce how many results a filter left.
- Provide the Create action somewhere else at phone width.

**Don't**

- Use this as a generic modal. `.cn-modal` is the Create New catalogue; a confirmation needs [a dialog](#dialog), which does not exist yet.
- Style `.cn-item` locally. Two catalogues depend on it.

### Accessibility

- The modal form needs `aria-modal`, a focus trap, Escape, and focus restoration. None of it is supplied by the script.
- `.cn-seg` must carry real roles. A three-way switch built from bare buttons tells a screen-reader user nothing about which view is active.
- The find field's result count belongs in a live region.
- Collapsed groups should leave the tab order.
- Item glyphs are decorative; the label is the accessible name.

### Dimensions

| Element | Property | Value |
|---|---|---|
| `.cn-item` marker | Size | 32px |
| Item glyph | Size | 20px |
| `.cn-group` head | Height | 32px |

Matched deliberately with `praxis-module-selector.css`, so the two catalogues line up.

---

## Quick-filter rail

At narrow widths the quick-filter cards become a scrolling row of pills. It moves the existing cards rather than rebuilding them, so no filter logic is duplicated.


Tier: **settling** · Sheet: `praxis-quick-rail.css, praxis-filters.css` · Script: `praxis-quick-rail.js`
At full width, quick filters are cards stacked in `[data-quick-filters]`. When the toolbar goes compact they become a horizontal scrolling row of pills, each opening a popover anchored under it.

The design decision worth copying: it **moves** the existing `.qfilter` card into the popover rather than rebuilding it. Because `praxis-filters.js` binds every quick-card interaction by delegation from `document`, a moved card keeps working with no filter logic duplicated anywhere.

**Every rule in this sheet is scoped to `body.tb-is-compact`.** Nothing in it applies at full width, and the class is set by `praxis-toolbar-compact.js`, not by this script. So the rail is inert unless the [compact toolbar](#compact-toolbar) is also loaded — the two are a pair, and it watches the body class rather than a media query precisely so both switch at exactly the same moment.

### Anatomy

1. **Rail** — `.qrail`, the container.
2. **Pill** — `.qrail__pill`, one quick filter.
3. **Caret** — `.qrail__caret`, opening the pill's options.
4. **Popover** — `.qrail-pop`.
5. **Filter rows** — `.qfilter`, shared with [Filters](#filters).

#### The quick-filter card

`.qfilter` comes from `praxis-filters.css`, not this sheet, and it is what both forms display. Each card needs `data-filter-name` — the script and the filter engine both look the card up by it.

```html
<div data-quick-filters style="display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))">
  <div class="qfilter" data-filter-name="Status">
    <div class="qfilter__head"><span class="qfilter__title">Status</span></div>
    <div class="qfilter__controls">
      <div class="qfilter__list">
        <div class="qfilter__row qfilter__row--selected">
          <span class="qfilter__check"><span class="material-symbols-rounded">check</span></span>
          <span class="qfilter__row-label">Open</span>
        </div>
        <div class="qfilter__row">
          <span class="qfilter__check"></span>
          <span class="qfilter__row-label">In review</span>
        </div>
        <div class="qfilter__row">
          <span class="qfilter__check"></span>
          <span class="qfilter__row-label">Closed</span>
        </div>
      </div>
    </div>
  </div>
  <div class="qfilter" data-filter-name="Site">
    <div class="qfilter__head"><span class="qfilter__title">Site</span></div>
    <div class="qfilter__controls">
      <div class="qfilter__list">
        <div class="qfilter__row qfilter__row--selected">
          <span class="qfilter__check"><span class="material-symbols-rounded">check</span></span>
          <span class="qfilter__row-label">Teesside works</span>
        </div>
        <div class="qfilter__row">
          <span class="qfilter__check"></span>
          <span class="qfilter__row-label">Rotherham plant</span>
        </div>
      </div>
    </div>
  </div>
</div>
```

`.qfilter__row--selected` is what the script counts to render the pill's badge — `.qrail__count` is `querySelectorAll('.qfilter__row--selected').length`. So the count is derived from the same DOM the user is clicking, never from a parallel state object that could disagree.

### Variants

#### The compact form

```html
<div class="qrail">
  <div class="qrail__scroller">
    <button class="qrail__pill" type="button" aria-expanded="false">
      <span class="qrail__bolt"><span class="material-symbols-rounded">bolt</span></span>
      Status
      <span class="qrail__count">1</span>
      <span class="qrail__caret"><span class="material-symbols-rounded">expand_more</span></span>
    </button>
    <button class="qrail__pill" type="button" aria-expanded="false">
      Site <span class="qrail__count">1</span>
      <span class="qrail__caret"><span class="material-symbols-rounded">expand_more</span></span>
    </button>
    <button class="qrail__pill" type="button" aria-expanded="false">
      Owner
      <span class="qrail__caret"><span class="material-symbols-rounded">expand_more</span></span>
    </button>
    <button class="qrail__pill" type="button" aria-expanded="false">
      Priority
      <span class="qrail__caret"><span class="material-symbols-rounded">expand_more</span></span>
    </button>
  </div>
</div>
<div class="qrail-pop is-open" style="position:relative;margin-top:.5rem">
  <div class="qrail-pop__head">
    <span class="qrail-pop__title">Status</span>
    <button class="qrail-pop__close" type="button" aria-label="Close">
      <span class="material-symbols-rounded">close</span>
    </button>
  </div>
  <div class="qrail-pop__body">
    <div class="qfilter" data-filter-name="Status">
      <div class="qfilter__controls">
        <div class="qfilter__list">
          <div class="qfilter__row qfilter__row--selected">
            <span class="qfilter__check"><span class="material-symbols-rounded">check</span></span>
            <span class="qfilter__row-label">Open</span>
          </div>
          <div class="qfilter__row">
            <span class="qfilter__check"></span>
            <span class="qfilter__row-label">In review</span>
          </div>
        </div>
      </div>
      <button class="qfilter__more" type="button">Show all 6</button>
    </div>
  </div>
</div>
<script>
  /* The sheet is entirely scoped to this class, and normally
     praxis-toolbar-compact.js sets it by measuring the toolbar. Set here so the
     compact form is visible without a toolbar to measure. */
  document.body.classList.add('tb-is-compact');
</script>
```

### States

- **Open** — `.is-open` on the rail or a popover.
- **Compact** — `.tb-is-compact`, set by `praxis-toolbar-compact.js`. The rail and the compact toolbar share this class, which is how they stay in step.
- **Active filter** — a pill carrying a value.

### Responsive behavior

Driven by `.tb-is-compact` rather than a media query, for the same reason as [the compact toolbar](#compact-toolbar): the rail reacts to the width it actually has, not the width of the window.

Motion comes from three shared tokens — `--praxis-rail-duration` (480ms), `--praxis-rail-ease` and `--praxis-rail-travel` (−56px) — which seven prototype pages had defined identically before they were promoted.

### Interactive demo

#### The vocabulary

| Class | What it is |
|---|---|
| `.qrail` | The band. Hidden with `[hidden]`. |
| `.qrail__scroller` | The horizontal scroll container. Its `::-webkit-scrollbar` is hidden — one of the few places Praxis does that, because a visible bar under four pills reads as chrome. |
| `.qrail__pill` | One filter. `[aria-expanded="true"]` is the open state — an attribute, not a class, so the accessible state and the visual state cannot drift. |
| `.qrail__bolt` | Leading glyph, for a pill that is a saved or favourite filter |
| `.qrail__count` | Selected-value badge. Omit it entirely at zero rather than rendering a 0. |
| `.qrail__caret` | Trailing chevron |
| `.qrail-pop` | The popover, with `.is-open` and `[hidden]`. `__head`, `__title`, `__close`, `__body`. |

### Code

`praxis-quick-rail.css` and `praxis-quick-rail.js`. The script auto-initialises on `DOMContentLoaded`.

The rail's *width* is deliberately not a token: it was genuinely different on every prototype page (100%, 260px, 300px), so it stays a per-page decision. The motion is shared; the geometry is not.

### Markup contract

| Item | Requirement |
|---|---|
| Pill | A real button, labelled with the filter name and its current value |
| Caret | `aria-expanded`, and it must not be a second tab stop if the whole pill opens the popover |
| Popover | `[hidden]` closed, labelled by its pill |
| Rail width | Yours. Set it per page |
| JS | Self-wiring |

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.tb-is-compact` | 35 |
| `.qrail-pop` | 20 |
| `.qrail` | 17 |
| `.qfilter` | 7 |
| `.is-open` | 1 |
| `.material-symbols-rounded` | 1 |


### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-rail-duration` | `480ms` | — |
| `--praxis-rail-ease` | `cubic-bezier(.34,.01,.1,1)` | — |
| `--praxis-rail-travel` | `-56px` | — |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Put the value in the pill's label, so the rail reads as the current filter state.
- Set the rail width for your page.
- Keep the quick filters to the few that are used constantly — everything else belongs in [the filter drawer](#filters).

**Don't**

- Set `.tb-is-compact` by hand.
- Duplicate the drawer here. The rail is a shortcut, not a second filter UI.

### Accessibility

- A pill's accessible name should carry the filter and its value: "Status: Open", not "Status".
- Applying a filter changes the result set, which is a content change and needs announcing — usually by the result count rather than by the rail.
- Popovers close on Escape and return focus to their pill.
- The caret should not be a separate tab stop when the pill already opens the popover.

### Dimensions

| Element | Property | Value |
|---|---|---|
| Rail | Width | Per page — deliberately not tokenised |
| Rail | Travel | `--praxis-rail-travel`, −56px |
| Rail | Duration | `--praxis-rail-duration`, 480ms |

---

## Compact toolbar

The toolbar collapses when its contents would no longer fit on one line — measured, not at a breakpoint. Three toolbars have three natural widths, so any single pixel value is wrong for two of them.


Tier: **settling** · Sheet: `praxis-toolbar-compact.css` · Script: `praxis-toolbar-compact.js`
Nothing here needs wiring. `praxis-toolbar-compact.js` is self-wiring: it measures your toolbar's contents and collapses them the moment they would no longer fit on one line, setting `body.tb-is-compact`.

**Measured, not at a fixed breakpoint** — and this is the interesting decision on the page. Three toolbars in the application have three different natural widths, so any single pixel value is early for one page and late for another. Measuring means each page collapses exactly when it has to.

The consequence for you: **you cannot predict the collapse point from CSS**. Resize the frame below and watch it happen rather than looking for a media query.

It collapses to `[back] [Tools ▾] [Filters] [Options] [▤]`, and it builds the Options popover **only if the page actually has sort or display controls** — an empty Options button would be worse than none.

### Anatomy

1. **Band** — the `.toolbar` row the compact behaviour applies to.
2. **Kept controls** — what stays visible when space runs out.
3. **Tools trigger** — the button that opens the overflow.
4. **Options popover** — `.tb-options`, holding everything that moved, each control at full row width.
5. **Scrim** — `.tb-options-scrim`.

#### The vocabulary

| Class | What it is |
|---|---|
](#quick-filter-rail)| `body.tb-is-compact` | The switch. Set by this script, read by this sheet **and by [the quick-filter rail**, which watches the body class rather than a media query so both change at the same instant. |
| `.tb-compact` | The collapsed cluster. `__menu`, `__btn`, `__caret`, `__pop`. |
| `.tb-options` | The Options sheet, with `.is-open` and `[hidden]`. Paired with `.tb-options-scrim`. |
| `.tb-options__head`, `__title`, `__close`, `__search`, `__body`, `__panel`, `__sechead`, `__label`, `__empty` | Its internals. `__sr` is a screen-reader-only live region. |
| `.tb-display__btn`, `.tb-display__pop` | The density and column switch. `[aria-expanded="true"]` is the open state. |
| `.tb-viewlabel` | The current view's name, shown when the switcher itself does not fit |
| `.colmenu`, `.sortmenu`, `.sortbtn` | Column and sort menus. Praxis styles these **only inside** `.tb-options__body` and `.tb-display__pop` — see the trap. |
| `.exp-head` | Expandable section head inside the options panel |

**`.colmenu`, `.sortmenu`, `.sortbtn`, `.tb-display` and `.panel` have no base rule in Praxis.** The only rules that mention them are *inside* the compact popovers, and several are `display:none !important` — this sheet's job for those classes is to *suppress* your full-width controls once they have been folded into the Options sheet, not to define them. If you use one outside a popover you get nothing. The [unkeyed families](#families-praxis-never-keys-a-rule-on) table measures this every build.

### Variants

Two, and the switch between them is automatic rather than authored: the full band, and the compact band marked by `.tb-is-compact`.

`.tb-display` is the third thing in this family and it has no base — it is one of the part-only names catalogued on [Page families](#page-families-and-part-only-names).

### States

- **Full** — every control in the band.
- **Compact** — `.tb-is-compact` on the band. The script sets it; do not set it by hand.
- **Options open** — `.is-open`, with the scrim shown.
- **A menu inside the overflow** — a `.tb-menu` moved into the popover takes the full row width, so [the toolbar menu](#toolbar-menu) stays usable there.

### Responsive behavior

This component *is* the responsive behaviour of the toolbar band, which is why it has no breakpoint table of its own: the switch is driven by measured available width rather than a viewport size, so a band inside a narrow column goes compact on a wide screen.

That is the important property. A media query cannot see that a toolbar is in a 600px panel on a 1920px monitor; this can.

### Interactive demo

#### Live

```html
<div class="app">
  <header class="appbar">
    <a class="appbar__brand" href="#" style="font-weight:600">Ideagen</a>
  </header>
  <div class="main">
    <div class="content">
      <div class="pageheader">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="#">Corrective actions</a>
          <span class="breadcrumb__sep" aria-hidden="true"><span class="material-symbols-rounded">chevron_right</span></span>
          <span class="breadcrumb__current">CA-1041</span>
        </nav>
        <div class="pageheader__titlerow">
          <h1 class="pageheader__title">Re-band pallet stacks</h1>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar__inner">
          <button class="tbtn tbtn--icon" type="button" aria-label="Back">
            <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
          </button>
          <button class="tbtn" type="button">
            <span class="material-symbols-rounded" aria-hidden="true">save</span> Save
          </button>
          <button class="tbtn" type="button">
            <span class="material-symbols-rounded" aria-hidden="true">content_copy</span> Duplicate
          </button>
          <button class="tbtn" type="button">
            <span class="material-symbols-rounded" aria-hidden="true">print</span> Print
          </button>
          <button class="tbtn" type="button">
            <span class="material-symbols-rounded" aria-hidden="true">share</span> Share
          </button>
          <button class="tbtn" type="button">
            <span class="material-symbols-rounded" aria-hidden="true">delete</span> Delete
          </button>
          <span class="toolbar__spacer"></span>
          <button class="tbtn tbtn--primary" type="button">Submit</button>
        </div>
      </div>

      <main class="page-body" style="flex:1;min-height:0;overflow:auto;
            padding:var(--px-toolbar-gutter) var(--ph-pad-x,24px)">
        <p>Six actions plus a primary. Narrow the frame and they fold into a Tools menu;
           widen it and they come back. There is no width in any stylesheet that predicts
           where.</p>
      </main>
    </div>
  </div>
</div>
```

### Code

`praxis-toolbar-compact.css` and `praxis-toolbar-compact.js`. The script auto-initialises on `DOMContentLoaded` and mutates the document, which is why every example on this site runs in its own iframe.

```html
<link rel="stylesheet" href="praxis-toolbar-compact.css">
<script src="praxis-toolbar-compact.js"></script>
```

### Markup contract

| Item | Requirement |
|---|---|
| Band | A `.toolbar` with its controls as direct children of `.toolbar__inner` |
| Labels | Every control needs a real label — the script uses it for the popover row, so an unlabelled icon button becomes an unlabelled row |
| `.tb-is-compact` | Set by the script. Read it, do not write it |
| Trigger | `aria-expanded` maintained by the script |
| JS API | Self-wiring, no init call. It no-ops on a page with no toolbar |

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.tb-options` | 54 |
| `.tb-compact` | 21 |
| `.viewswitch` | 14 |
| `.tb-display` | 13 |
| `.tb-is-compact` | 7 |
| `.toolbar` | 6 |
| `.tbtn` | 5 |
| `.tb-options-scrim` | 5 |
| `.sortmenu` | 5 |
| `.material-symbols-rounded` | 4 |
| `.colmenu` | 4 |
| `.icon` | 2 |
| `.tb-viewlabel` | 2 |
| `.is-open` | 2 |
| `.tb-menu` | 1 |
| `.sortbtn` | 1 |
| `.fields` | 1 |
| `.panel` | 1 |
| `.exp-head` | 1 |


### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--px-toolbar-gutter` | `16px` | — |


The band's height and padding come from `praxis-pageheader.css`, so the compact form does not change the masthead's combined 128px — which is the promise that keeps page content starting at the same y on every page.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Label every control in the band.
- Put the primary action first, so it is the last thing to move into the overflow.
- Let the script decide when to go compact.

**Don't**

- Set `.tb-is-compact` yourself.
- Rely on a media query to hide toolbar controls — this measures the container, which is the thing that actually matters.
- Put a control in the band that must always be visible without also providing it elsewhere.

### Accessibility

- Control labels are load-bearing twice over: for assistive technology, and because the script reuses them as popover row labels.
- The trigger carries `aria-expanded`.
- Moving a focused control into the popover would lose focus — worth verifying in any page that changes its toolbar contents dynamically.
- The scrim is not focusable and clicking it closes the popover; Escape should too.

### Dimensions

| Element | Property | Value |
|---|---|---|
| Band | Min height | `--px-toolbar-h`, 60px |
| Band | Padding | `--px-toolbar-pad-y` 10px, `--ph-pad-x` per page |
| Popover row | Width | Full width of the popover |
| Masthead | Combined height | 128px, unchanged by the compact form |

---

## Toolbar menu

A toolbar button that opens a panel under itself — Group, Sort, row actions, a layout picker. Promoted from four incompatible copies in the prototype, one of which the compact toolbar was already reading.


Tier: **settling** · Sheet: `praxis-controls.css`
A `.tbtn` that opens a panel under itself. Report Management's Group menu, Search's sort and column menus, the record pages' row actions, the workspace editor's layout picker — same object each time.

Two classes. `.tb-menu` is the positioning context and holds the trigger; `.tb-dropdown` is the panel, and it is `hidden` until you open it.

### Anatomy

| Class | What it is |
|---|---|
| `.tb-menu` | `position:relative; display:inline-flex`. Wraps the trigger so the panel anchors to it. |
| `.tb-dropdown` | The panel. Anchored 6px below the trigger, `min-width:220px`, `z-index:200`. `[hidden]` is its closed state. |
| `.tb-dropdown--right` | Right-aligned, for a trigger at the end of the band where a left-anchored panel would hang off the page. |
| `.tb-dropdown__item` | A row. `min-height:36px` rather than a fixed height, so an item carrying a second line grows instead of clipping it. |
| `.tb-dropdown__sub` | That second line — a count, a description, an owner. |
| `.tb-dropdown__sec` | A section label above a run of items. |
| `.tb-dropdown__divider` / `__sep` | A hairline. Two names for one rule; see below. |
| `.tb-dropdown__empty` | The "nothing here" line, for a menu whose contents are filtered or fetched. |
| `.tb-dropdown__item--danger` | Destructive action, in the danger ink. |

### Variants

| Variant | Use |
|---|---|
| Default | Left-anchored under the trigger |
| `--right` | Right-aligned, for a trigger at the end of the band where a left-anchored panel would hang off the page |
| `__item--danger` | A destructive row, in the danger ink |
| `menuitemradio` rows | A choice group. The checked item takes the app's pink selection accent, matching how selection is marked in the nav rail and the report tree |

### States

- **Closed** — `[hidden]` on the panel.
- **Open** — attribute removed. There is no `.is-open` here; the attribute is the state.
- **Item hover** — `--px-hover`.
- **Item focus-visible** — a 2px inset focus ring.
- **Checked** — `aria-checked="true"` tints the item's glyph pink.
- **Empty** — `__empty`, for a menu whose contents are filtered or fetched.

### Responsive behavior

The panel does not reposition itself — there is no script, so nothing measures the viewport. `--right` is the manual answer.

What does adapt is the band around it: `praxis-toolbar-compact.css` treats a `.tb-menu` as one overflow item and gives its trigger the full row width inside the Tools popover. See [Compact toolbar](#compact-toolbar).

### Interactive demo

```html
<div class="toolbar">
  <div class="toolbar__inner">
    <button class="tbtn" type="button">Save</button>
    <div class="tb-menu">
      <button class="tbtn" type="button" id="grp" aria-haspopup="menu" aria-expanded="true">
        <span class="material-symbols-rounded" aria-hidden="true">layers</span> Group
        <span class="material-symbols-rounded" aria-hidden="true">expand_more</span>
      </button>
      <div class="tb-dropdown" role="menu" aria-labelledby="grp">
        <button class="tb-dropdown__item" type="button" role="menuitem">
          <span class="material-symbols-rounded" aria-hidden="true">create_new_folder</span> New group…
        </button>
        <div class="tb-dropdown__sec">Add to group</div>
        <button class="tb-dropdown__item" type="button" role="menuitemradio" aria-checked="true">
          <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
          <span>Quality<span class="tb-dropdown__sub">6 reports</span></span>
        </button>
        <button class="tb-dropdown__item" type="button" role="menuitemradio" aria-checked="false">
          <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
          <span>Safety<span class="tb-dropdown__sub">11 reports</span></span>
        </button>
        <div class="tb-dropdown__divider"></div>
        <button class="tb-dropdown__item tb-dropdown__item--danger" type="button" role="menuitem">
          <span class="material-symbols-rounded" aria-hidden="true">delete</span> Remove from group
        </button>
      </div>
    </div>
  </div>
</div>
```

### Code

`praxis-controls.css`. No script.

```html
<div class="tb-menu">
  <button class="tbtn" type="button" id="grp" aria-haspopup="menu" aria-expanded="false">
    Group <span class="material-symbols-rounded">expand_more</span>
  </button>
  <div class="tb-dropdown" role="menu" aria-labelledby="grp" hidden>
    <button class="tb-dropdown__item" type="button" role="menuitem">New group…</button>
  </div>
</div>
```

#### Why it is not in praxis-admin.css

That is where `.tbtn` lives, so it looks like the obvious home. But `praxis-admin.css` is the largest sheet in the system and it carries the application shell, a bare-element box-sizing reset and its own `.tbtn` — a page adding it to pick up a dropdown would be restyling its whole toolbar to get one panel. In the prototype only six of twenty pages load it, and eight of the twelve carrying a local `.tb-dropdown` are not among them. `praxis-controls.css` is four kilobytes and depends on nothing but the tokens.

`praxis-toolbar-compact.css` and `praxis-toolbar-compact.js` both already keyed off `.tb-menu`: the compact toolbar treats a menu as one overflow item and gives its trigger the full row width in the Tools popover. Until this landed, Praxis was reading a class it never defined — the panel worked only because every consuming page happened to declare its own. Four of them declared it differently.

### Markup contract

**The panel is styling only.** Praxis does not open or close it: no script here toggles `hidden`, moves focus into the panel, or closes it on outside click or Escape. That is yours, and all four of those are load-bearing — a menu that cannot be dismissed from the keyboard is a trap. Set `aria-haspopup="menu"` and keep `aria-expanded` on the trigger in step with the attribute.

| Item | Requirement |
|---|---|
| Trigger | `aria-haspopup="menu"` and `aria-expanded`, kept in step with the panel's `hidden` attribute |
| Panel | `role="menu"` and `aria-labelledby` pointing at the trigger |
| Items | `role="menuitem"`, or `menuitemradio`/`menuitemcheckbox` with `aria-checked` |
| Section labels | `__sec` is not a menu item and should not be focusable |
| Closed state | The `hidden` attribute, not a class |
| JS | **None supplied.** Open, close, focus movement, outside click and Escape are all yours |

#### Two names for the separator

`.tb-dropdown__divider` and `.tb-dropdown__sep` are the same rule. The copies this was promoted from disagreed — four pages said `divider`, seven said `sep` — and an alias costs one selector where renaming costs an edit in seven files and a chance to miss one. Prefer `__divider` in new markup.

**The panel is styling only.** Praxis does not open or close it: no script here toggles `hidden`, moves focus into the panel, or closes it on outside click or Escape. That is yours, and all four of those are load-bearing — a menu that cannot be dismissed from the keyboard is a trap. Set `aria-haspopup="menu"` and keep `aria-expanded` on the trigger in step with the attribute.

### Token reference


| Family | Mentions |
|---|---|
| `.tb-dropdown` | 20 |
| `.iconbtn` | 11 |
| `.filterfield` | 8 |
| `.icon` | 5 |
| `.material-symbols-rounded` | 3 |
| `.tb-menu` | 1 |


#### Surface

The panel follows `.px-pop` exactly — a hairline and `--praxis-elevation-4` by default, borderless over `--px-overlay` under `body[data-variant="praxis"]`. A menu opened from the toolbar and one opened from the nav rail are then the same object, which they were not in three of the four copies.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Use `--right` for a trigger near the end of the band.
- Put a count or an owner in `__sub` rather than crowding the item label.
- Prefer `__divider` over `__sep` in new markup.
- Wire Escape and outside-click. Praxis does not.

**Don't**

- Ship it without keyboard dismissal — a menu that cannot be closed from the keyboard is a trap.
- Use it as a [select](#select). A menu invokes actions; a select edits a value, and the ARIA roles differ.
- Nest a second panel inside an item.

### Accessibility

The panel is styling only, so every accessibility obligation here is the consumer's — which is worth stating plainly rather than implying Praxis has handled it.

- `aria-expanded` on the trigger, in step with `hidden`.
- Focus moves into the panel on open and returns to the trigger on close.
- Escape closes. Outside click closes.
- Arrow keys move between items for a true `role="menu"`; if you are not going to implement that, do not claim the role.
- `__item--danger` uses the danger ink on the item's own text, so the destructive meaning is not carried by colour alone only if the label says so — write "Remove from group", not "Remove".

### Dimensions

| Element | Property | Value |
|---|---|---|
| `.tb-dropdown` | Min width / padding / offset | 220px / 6px / 6px below the trigger |
| `.tb-dropdown` | Radius / z-index | `--praxis-radius-md` (12px) / 200 |
| `__item` | Min height / padding | 36px / 6px 10px |
| `__item` | Size / weight / gap | 14px / 500 / 10px |
| Item glyph | Size | 18px |
| `__divider` | Height / margin | 1px / 6px 8px |

---

## Module selector

The search-scope picker in the app bar, and the chip that represents its result in the filter bar — because the modules a search is scoped to are a filter in every sense the user cares about.


Tier: **settling** · Sheet: `praxis-module-selector.css` · Script: `praxis-module-chip.js`
The app bar's search is scoped to one or more modules. `.msel` is the picker; `praxis-module-chip.js` puts the result in the applied-filter bar rather than leaving it as separate state the user has to remember.

The reasoning, from the script's own header: the modules a search is scoped to are a filter in every sense the user cares about, so they belong alongside the rest. **No modules selected means the search covers everything** — that is the default, not a filter, so no chip appears.

### Anatomy

1. **Trigger** — `.msel`, the app-bar chip showing the current module.
2. **Panel** — the picker.
3. **Group** — `.cn-group`, a labelled run of modules.
4. **Item** — `.cn-item`, one module.

The grid and item vocabulary is shared with [the Create New menu](#create-new-menu) — deliberately, since both are catalogues of the same modules.

#### The picker

It reuses the Create New grid vocabulary — `.cn-grid`, `.cn-group`, `.cn-item` — rather than inventing a parallel one, so a module tile and a record-type tile are the same object. Selection is `.is-sel`, and the menu's own parts are `.msel__*`.

```html
<div class="msel is-open" style="position:relative;max-width:26rem">
  <div class="msel__input">
    All modules
    <span class="msel__caret"><span class="material-symbols-rounded">expand_more</span></span>
  </div>
  <div class="msel__menu" style="position:relative;inset:auto;margin-top:.5rem">
    <div class="msel__titlebar">
      <span class="msel__title">Scope the search</span>
      <button class="msel__clear" type="button">Clear</button>
    </div>
    <input class="msel__filter" type="search" placeholder="Filter modules" aria-label="Filter modules">
    <div class="msel__groups">
      <div class="cn-group cn-group--pink">
        <div class="cn-group__head">
          <span class="cn-group__icon"><span class="material-symbols-rounded">emergency_home</span></span>
          <span class="cn-group__title">Incidents & Events</span>
        </div>
        <div class="cn-grid">
          <button class="cn-item is-sel" type="button">
            <span class="cn-item__icon"><span class="material-symbols-rounded">crisis_alert</span></span>
            <span class="cn-item__label">Incidents</span>
          </button>
          <button class="cn-item" type="button">
            <span class="cn-item__icon"><span class="material-symbols-rounded">warning</span></span>
            <span class="cn-item__label">Near-misses</span>
          </button>
        </div>
      </div>
      <div class="cn-group cn-group--teal">
        <div class="cn-group__head">
          <span class="cn-group__icon"><span class="material-symbols-rounded">frame_inspect</span></span>
          <span class="cn-group__title">Audit & Findings</span>
        </div>
        <div class="cn-grid">
          <button class="cn-item is-sel" type="button">
            <span class="cn-item__icon"><span class="material-symbols-rounded">fact_check</span></span>
            <span class="cn-item__label">Audits</span>
          </button>
          <button class="cn-item" type="button">
            <span class="cn-item__icon"><span class="material-symbols-rounded">flag</span></span>
            <span class="cn-item__label">Findings</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Variants

#### The vocabulary

| Class | What it is |
|---|---|
| `.msel` | The wrapper. `.is-open` rotates the caret. |
| `.msel__input` | The trigger, styled as a field. Has its own dark treatment. |
| `.msel__caret` | Chevron; rotated by `.msel.is-open` |
| `.msel__scrim`, `.msel__menu` | Backdrop and panel, both `[hidden]`-driven |
| `.msel__titlebar`, `__title`, `__clear` | Head. `__clear` takes `[hidden]` for the nothing-selected case. |
| `.msel__filter` | Type-to-narrow field |
| `.msel__groups`, `.msel__empty` | The group list and its no-results state |

### States

- **Closed / open** — `.is-open`.
- **Selected** — `.is-sel` on the current module.
- **Collapsed group** — `.is-collapsed`.

Three state classes, all following the `is-` convention documented on [Naming and state conventions](#naming-and-state-conventions).

### Responsive behavior

The trigger is hidden below 768px on every page except Search: `body:not([data-page="search"]) .msel{display:none}` in `praxis-appbar.css`. The reasoning is in that sheet — the chip's true home is the Search page, and on other pages it was taking width the search input needed.

So on a phone, outside Search, this component is not present at all and its destinations have to be reachable another way.

### Interactive demo

#### The picker

It reuses the Create New grid vocabulary — `.cn-grid`, `.cn-group`, `.cn-item` — rather than inventing a parallel one, so a module tile and a record-type tile are the same object. Selection is `.is-sel`, and the menu's own parts are `.msel__*`.

```html
<div class="msel is-open" style="position:relative;max-width:26rem">
  <div class="msel__input">
    All modules
    <span class="msel__caret"><span class="material-symbols-rounded">expand_more</span></span>
  </div>
  <div class="msel__menu" style="position:relative;inset:auto;margin-top:.5rem">
    <div class="msel__titlebar">
      <span class="msel__title">Scope the search</span>
      <button class="msel__clear" type="button">Clear</button>
    </div>
    <input class="msel__filter" type="search" placeholder="Filter modules" aria-label="Filter modules">
    <div class="msel__groups">
      <div class="cn-group cn-group--pink">
        <div class="cn-group__head">
          <span class="cn-group__icon"><span class="material-symbols-rounded">emergency_home</span></span>
          <span class="cn-group__title">Incidents & Events</span>
        </div>
        <div class="cn-grid">
          <button class="cn-item is-sel" type="button">
            <span class="cn-item__icon"><span class="material-symbols-rounded">crisis_alert</span></span>
            <span class="cn-item__label">Incidents</span>
          </button>
          <button class="cn-item" type="button">
            <span class="cn-item__icon"><span class="material-symbols-rounded">warning</span></span>
            <span class="cn-item__label">Near-misses</span>
          </button>
        </div>
      </div>
      <div class="cn-group cn-group--teal">
        <div class="cn-group__head">
          <span class="cn-group__icon"><span class="material-symbols-rounded">frame_inspect</span></span>
          <span class="cn-group__title">Audit & Findings</span>
        </div>
        <div class="cn-grid">
          <button class="cn-item is-sel" type="button">
            <span class="cn-item__icon"><span class="material-symbols-rounded">fact_check</span></span>
            <span class="cn-item__label">Audits</span>
          </button>
          <button class="cn-item" type="button">
            <span class="cn-item__icon"><span class="material-symbols-rounded">flag</span></span>
            <span class="cn-item__label">Findings</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Code

`praxis-module-selector.css` for the panel, `praxis-appbar.css` for the trigger's place in the bar, and `praxis-module-chip.js` for the behaviour. The script auto-initialises and mutates the document.

### Markup contract

| Item | Requirement |
|---|---|
| Trigger | `aria-haspopup` and `aria-expanded` |
| Panel | Labelled by the trigger |
| Selected | `.is-sel` plus `aria-current` — the class is paint |
| Groups | A real heading or an `aria-label` on the group, not a styled div alone |
| JS | `praxis-module-chip.js`, self-wiring |

#### The chip, and why it is awkward

**`praxis-filters.js` owns `[data-chips]` and rewrites it wholesale on every `renderChips()` call**, which would wipe anything the module chip injected. So `praxis-module-chip.js` cannot simply append — it has to re-inject after each rebuild. If you render your own chips into that container, expect the same fight, and read the script before adding a third writer.

### Token reference

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.msel` | 51 |
| `.cn-group` | 13 |
| `.cn-item` | 7 |
| `.cn-grid` | 3 |
| `.is-sel` | 2 |
| `.is-collapsed` | 2 |
| `.is-open` | 1 |
| `.material-symbols-rounded` | 1 |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Mark the current module with both `.is-sel` and `aria-current`.
- Provide another route to the modules on phone, where the chip is hidden.

**Don't**

- Use it as a general-purpose dropdown. It is a module catalogue and shares its item vocabulary with Create New for that reason.
- Assume it is present. Outside the Search page it disappears below 768px.

### Accessibility

- The trigger needs an accessible name that includes the current module, so a screen-reader user knows where they are without opening it.
- `aria-current` on the selected item.
- Group labels must reach the accessibility tree.
- Escape closes and focus returns to the trigger.
- A collapsed group's contents should leave the tab order.

### Dimensions

| Element | Property | Value |
|---|---|---|
| `.cn-item` marker | Size | 32px |
| Item glyph | Size | 20px |
| Group head | Height | 32px |

Those three are matched deliberately across this sheet and `praxis-create-new.css`, so the two catalogues line up.

---

## Workspace chrome

A second app-bar vocabulary, the app switcher, the persona picker and the theme button. Loaded last, so where it overlaps praxis-appbar.css it wins.


Tier: **settling** · Sheet: `praxis-workspace.css`
**This sheet defines a second, competing app-bar vocabulary.** `praxis-appbar.css` gives you `.appbar__module`, `.appbar__search-btn` and `.appbar__iconbtn`. This sheet gives you `.appbar__module-selector`, `.appbar__search-go`, `.appbar__icon-btn` and `.appbar__action-btn`, plus `.appbar__logo-area`, `.appbar__input-area` and `.appbar__search-input`.

Both work. They are not interchangeable, and **this sheet loads later in the bundle**, so wherever the two key on the same selector, this one wins. [The app shell](#the-app-shell) uses the `praxis-appbar.css` vocabulary, which is what the agent guide documents; pick one per page and do not mix them.

### Anatomy

1. **App switcher** — `.appswitch`, beside the wordmark.
2. **Persona picker** — `.persona-picker`, relocated into the profile menu as "Viewing as".
3. **Theme button** — `.gl-theme-btn` with its sun/moon pair.
4. **Logo** — two images, swapped by theme.

Four small pieces of workspace-specific chrome. The app bar itself is on [The app shell](#the-app-shell).
#### App switcher

`.appswitch` is the product switcher in the app bar's left corner — a trigger and a popover of products, with `--active` marking the current one.

```html
<div class="appswitch" style="position:relative">
  <button class="appswitch__trigger" type="button" aria-expanded="true">
    <span class="material-symbols-rounded" aria-hidden="true">apps</span>
    EHSQ Enterprise
  </button>
  <div class="appswitch__pop" style="position:relative;inset:auto;margin-top:.5rem">
    <button class="appswitch__item appswitch__item--active" type="button">EHSQ Enterprise</button>
    <button class="appswitch__item" type="button">Quality Management</button>
    <button class="appswitch__item" type="button">Risk Management</button>
    <button class="appswitch__item" type="button">Audit Manager</button>
  </div>
</div>
```

### Variants

#### Persona picker

A prototype-only affordance for switching who you are looking at the screen as. It has two forms: standalone in the app bar (`.persona-trigger`), and folded into the profile menu (`.persona-picker--in-menu`), which restyles the trigger to sit as a menu row rather than a bar control.

```html
<div style="display:flex;flex-direction:column;gap:1.25rem;align-items:flex-start">
  <button class="persona-trigger" type="button" aria-expanded="false">
    Marcus Silva
    <span class="persona-trigger__sub">EHS coordinator</span>
  </button>

  <div class="px-pop persona-picker persona-picker--in-menu"
       style="position:relative;inset:auto;width:17rem">
    <div class="profile-menu__row--persona">
      <button class="persona-trigger" type="button" aria-expanded="false">
        <span class="persona-trigger__icon">
          <span class="material-symbols-rounded" aria-hidden="true">switch_account</span>
        </span>
        <span class="persona-trigger__text">
          <span class="persona-trigger__label">Viewing as</span>
          <span class="persona-trigger__sub">Marcus Silva</span>
        </span>
        <span class="persona-trigger__chev">
          <span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
        </span>
      </button>
    </div>
  </div>
</div>
```

The in-menu form expects the full set — `__icon`, `__text` wrapping `__label` and `__sub`, and `__chev`. The standalone form uses only the label text and `__sub`. `.persona-popover` is the list it opens; Praxis styles the container and leaves the rows to you.

`.persona-trigger` rules are keyed on `body .persona-trigger` — a descendant of `body` purely for specificity, because this sheet loads before a page's own `<style>` and needed to outrank it. Overriding it takes the same or better specificity, not a plain class.

#### Theme button

`.gl-theme-btn` holds two glyphs, `.gl-sun` and `.gl-moon`, and the theme swaps which is visible. Both are always in the DOM — the sheet hides one per theme rather than the script replacing the icon, so there is no flash and no state to keep.

```html
<button class="gl-theme-btn" type="button" aria-label="Switch theme">
  <span class="gl-sun"><span class="material-symbols-rounded" aria-hidden="true">light_mode</span></span>
  <span class="gl-moon"><span class="material-symbols-rounded" aria-hidden="true">dark_mode</span></span>
</button>
```

It does not persist anything by itself. The key to write is `localStorage['gl-theme']` — the one [the boot script reads](#theming) and the one `praxis-profile-menu.js` writes.

### States

- **App switcher** — `__pop` is `[hidden]` closed; `__item--active` marks the current app.
- **Persona** — `aria-expanded` on the trigger, with a third state at `[aria-expanded="true"]` that deepens the fill.
- **Theme** — driven entirely by `body[data-theme]`: `.gl-moon` shows in light, `.gl-sun` in dark. No class toggling.

### Responsive behavior

Two things move:

- `.appswitch` is `display:none !important` below 640px under the Praxis variant. It duplicates what the nav drawer and profile menu both offer, and at 390px it pushed the app bar's right cluster past the viewport on the record variants.
- Below 480px `.appswitch__trigger` is capped at 104px with an ellipsis, so brand and switcher do not crowd out the search field.
- The persona flyout, which normally opens to the left of the profile popover, becomes a fixed panel inset by `--praxis-space-12` below 639px.

### Interactive demo

#### Logo, and the two-image pattern

`.appbar__logo-img` with `--onlight` and `--ondark`: both images ship in the markup and the sheet hides one per theme. Praxis ships no logo files, so these are yours. The same reasoning as the theme button — swapping a `src` in script gives you a visible reload on every theme change.

### Code

`praxis-workspace.css`, which is a *skin* rather than a base sheet — it layers workspace treatments over the shared chrome. Two consequences worth knowing:

- It contains an unscoped `body[data-theme="dark"]` block that remaps surface tokens. `praxis-core.css`'s Praxis-variant dark block has higher specificity and wins, so the two do not fight — but the ordering is not accidental.
- `.gl-theme-btn` gets colour here and has no base geometry anywhere. Put the class on an `.appbar__iconbtn`; that is what this reference site does.

### Markup contract

| Item | Requirement |
|---|---|
| App switcher | `aria-haspopup`, `aria-expanded`, and `aria-current` alongside `__item--active` |
| Persona trigger | `aria-expanded`. Its accessible name must include who you are viewing as |
| Theme button | An `aria-label`, and `aria-pressed` if you treat it as a toggle. Both SVGs are `aria-hidden` |
| Logo | Two `<img>` elements, one `alt` between them — the hidden one takes `alt=""` or the wordmark is announced twice |
| JS | `praxis-profile-menu.js` for the menu. The switcher and persona flyout are yours |

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.appbar` | 25 |
| `.praxis-navrail` | 20 |
| `.persona-trigger` | 17 |
| `.persona-picker` | 14 |
| `.appswitch` | 10 |
| `.gl-theme-btn` | 5 |
| `.persona-popover` | 3 |
| `.card` | 2 |
| `.page` | 2 |
| `.gl-sun` | 2 |
| `.material-symbols-rounded` | 1 |
| `.gl-moon` | 1 |
| `.profile-menu` | 1 |
| `.btn` | 1 |


### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-menu-duration` | `520ms` | — |
| `--praxis-menu-ease` | `cubic-bezier(.4,0,.2,1)` | — |


Beyond those, this sheet works almost entirely in `--px-*` materials and the glass family. The persona and switcher hovers are hard-coded `rgba(16,36,58,…)` and `rgba(255,255,255,…)` pairs rather than tokens — a small, real inconsistency in a sheet that predates the material layer.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Put `.gl-theme-btn` on an `.appbar__iconbtn` for its geometry.
- Give the persona trigger a name that says who you are viewing as.
- Keep one `alt` across the two logo images.

**Don't**

- Load `praxis-workspace.css` on a non-workspace page for one rule — it is a skin and it carries an unscoped dark block.
- Rely on `.appswitch` below 640px. It is hidden.
- Toggle theme classes by hand. The swap is attribute-driven.

### Accessibility

- The theme button needs a label; the two SVGs are decorative.
- "Viewing as" is a consequential state — a user acting as someone else should be able to tell from the trigger's accessible name, not only from a visual chip.
- The double-logo pattern announces twice unless the hidden image has an empty `alt`.
- Both popovers need Escape and focus restoration; neither is supplied.
- Persona and switcher hover states are fill-only, so they vanish in forced-colors — see [Forced colors](#forced-colors-and-high-contrast).

### Dimensions

| Element | Property | Value |
|---|---|---|
| `.appswitch__trigger` | Height / radius | 32px / 8px |
| `.appswitch__trigger` | Max width ≤480px | 104px, ellipsised |
| `.appswitch__pop` | Min width | 200px |
| Persona flyout | Width | 320–340px, fixed and inset below 639px |
| Logo | Height | 26px, 22px below 480px |
| Avatar | Size | 34px, 30px below 480px |

---

## Breadcrumb back button

The toolbar's back button, driven by the breadcrumb trail rather than history. Twenty lines of behaviour that exists because six pages point their breadcrumb ancestors at "#".


Tier: **settling** · Sheet: `praxis-pageheader.css` · Script: `praxis-breadcrumb-back.js`
Every page's toolbar carries a back button, and it used to do nothing. It should step one level up the breadcrumb trail, ending at the workspace. `praxis-breadcrumb-back.js` is self-wiring: include it, and the button in your toolbar starts working.

Two things are documented here, because they are inseparable — the breadcrumb component itself, which `praxis-pageheader.css` fully defines, and the script that reads it.

### Anatomy

1. **Trail** — `.breadcrumb`, a `<nav>` with a label.
2. **Home** — `.breadcrumb__home`, a glyph link at the head.
3. **Ancestors** — plain `<a>` elements.
4. **Separator** — `.breadcrumb__sep`, decorative.
5. **Current** — `.breadcrumb__current`, the page you are on, not a link.
6. **Back button** — a `.tbtn--icon` in the toolbar band below. Not part of the breadcrumb, and driven by it.

### Variants

One trail. The back button has no variants either — it is a single icon button whose behaviour comes from the script.

What Praxis does *not* have is an overflow form for a deep trail; the breadcrumb wraps instead, which is deliberate but has consequences. See [Breadcrumb overflow](#breadcrumb-overflow).

### States

- **Ancestor link** — secondary ink, primary on hover.
- **Current** — primary ink, not interactive.
- **Wrapped** — at narrow widths the trail wraps and takes the header's height with it. `--ph-h` is a floor, not a fixed height.
- **Back unavailable** — at the top of a trail there is nowhere to go. The script resolves to the workspace rather than disabling the button.

### Responsive behavior

| Viewport | Behaviour |
|---|---|
| Desktop | One line, full trail |
| Narrow | Wraps. `praxis-pageheader.css` says so explicitly — "the breadcrumb is allowed to wrap at narrow widths and take the header with it" |
| ≤640px | Inline padding follows `--px-gutter`, so the trail lines up with the app bar and the content |

### Interactive demo

```html
<div class="pageheader">
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <a class="breadcrumb__home" href="index.html" aria-label="Home">
      <span class="material-symbols-rounded" aria-hidden="true">home</span>
    </a>
    <span class="breadcrumb__sep" aria-hidden="true">
      <span class="material-symbols-rounded">chevron_right</span>
    </span>
    <a href="incidents.html">Incident management</a>
    <span class="breadcrumb__sep" aria-hidden="true">
      <span class="material-symbols-rounded">chevron_right</span>
    </span>
    <span class="breadcrumb__current">INC-2024-0417</span>
  </nav>
  <div class="pageheader__titlerow">
    <h1 class="pageheader__title">Forklift near-miss, bay 4</h1>
  </div>
</div>
<div class="toolbar">
  <div class="toolbar__inner">
    <button class="tbtn tbtn--icon" type="button" aria-label="Back">
      <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
    </button>
    <button class="tbtn" type="button">Save</button>
  </div>
</div>
```

The script finds the back button by looking for the toolbar's `aria-label="Back"` control, so **label it**. An icon-only button with no label is both inaccessible and invisible to this script — the same requirement, for two reasons.

### Code

The breadcrumb is CSS in `praxis-pageheader.css`. The back button is one script tag and nothing else:

```html
<script src="praxis-breadcrumb-back.js"></script>
```

#### Why it is not one line

The obvious implementation is `location.href = lastCrumb.href`. It does not work here, and the reason is worth knowing because it is a property of real markup rather than a design choice:

The breadcrumb *structure* is consistent — a `<nav class="breadcrumb">` with `<a>` ancestors, `.breadcrumb__sep` separators and a final `.breadcrumb__current`. The **hrefs are not**. Six of the twenty pages point their ancestor links at `"#"`. Following those takes you nowhere and adds a history entry, so the script has to resolve a real destination rather than trusting the attribute.

The practical instruction: **give your breadcrumb ancestors real hrefs.** The script copes with `"#"`, but it copes by guessing, and a correct href is always better than a good guess.

### Markup contract

| Item | Requirement |
|---|---|
| `<nav class="breadcrumb">` | With an `aria-label`, so it is announced as navigation rather than a run of links |
| Ancestor hrefs | **Real URLs.** The script copes with `"#"` by guessing, and a correct href is always better than a good guess |
| `.breadcrumb__sep` | `aria-hidden="true"`. Decorative |
| `.breadcrumb__current` | Not a link. Add `aria-current="page"` |
| Back button | `aria-label="Back"` — this is how the script finds it |
| JS API | Self-wiring on `DOMContentLoaded`. No init call, and it no-ops on a page with no breadcrumb |

### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--ph-pad-x` | `var(--px-gutter)` | — |


Beyond those, the breadcrumb uses `--praxis-color-text-secondary` for ancestors, `--praxis-color-text-primary` for the current page and `--praxis-color-text-disabled` for the home glyph and separators.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

The practical instruction: **give your breadcrumb ancestors real hrefs.** The script copes with `"#"`, but it copes by guessing.

**Do**

- Label the nav and label the back button.
- Keep the trail structural — it reflects where the record sits, not where the user has been.
- Let it wrap rather than truncating it silently.

**Don't**

- Point an ancestor at `"#"`.
- Make the current page a link.
- Use the back button as browser history. It steps the trail, which is not the same thing — and that difference is the reason the script exists.

### Accessibility

- The trail is a labelled `<nav>` landmark.
- Separators are `aria-hidden`, so a screen reader hears the path rather than "chevron right" four times.
- The current page carries `aria-current="page"` and is not focusable.
- The back button must have an accessible name. This is also a functional requirement, since the script keys on it.
- A deep wrapped trail is verbose to hear. That is the cost of not having an overflow form, and it is tracked on [Breadcrumb overflow](#breadcrumb-overflow).

### Dimensions

| Element | Property | Value |
|---|---|---|
| `.breadcrumb` | Size / weight | 13px / 600 |
| `.breadcrumb` | Gap / bottom margin | 6px / 6px |
| Separator glyph | Size | 18px |
| `.pageheader` | Min height | `--ph-h`, 68px — a floor |
| Back button | Size | 40px, `.tbtn--icon` |

---

## Toast

The transient confirmation — one line at the bottom of the window that says an action landed, then leaves. One script, no markup, and it styles itself.


Tier: **settling** · Script: `praxis-toast.js`
"Link copied". "Workspace saved". "3 records exported". A toast is the shortest-lived thing in the system: one line, one moment, then gone. Praxis ships it as a script with no markup at all, which is unusual for this system and deliberate — see Code.

### Anatomy

1. **Live region** — one bottom-centred container, created at load and reused. Never takes pointer events.
2. **Toast** — a single line of text on a slate surface. There is no title, no icon and no close button, and that is the design: anything more belongs somewhere permanent.

Neither part is markup you write. The script owns both.

### Variants

Three tones, set through `opts.tone`:

| Tone | Use |
|---|---|
| Neutral (default) | "Link copied". The overwhelming majority |
| `'success'` | "Workspace saved" |
| `'danger'` | "Could not save — try again". Give it a longer duration; it carries more to read and matters more |

### States

- **Entering / visible / leaving** — all handled by the script.
- **Stacked** — toasts append rather than replace, so two actions in quick succession both get read.
- **Dismissed early** — the return value carries a `dismiss` function, so a long-running toast can be taken down by whatever finishes.

### Responsive behavior

Bottom-centred at every width. The one thing that matters here is that the region never covers the control that triggered it, which is why it takes no pointer events at any size.

### Interactive demo

```html
<div style="display:flex;gap:.5rem;flex-wrap:wrap">
  <button class="tbtn" type="button" onclick="praxisToast('Link copied')">Neutral</button>
  <button class="tbtn" type="button" onclick="praxisToast('Workspace saved', { tone: 'success' })">Success</button>
  <button class="tbtn" type="button" onclick="praxisToast('Could not save — try again', { tone: 'danger', duration: 4000 })">Danger</button>
  <button class="tbtn" type="button" onclick="praxisToast('First'); praxisToast('Second'); praxisToast('Third')">Three at once</button>
</div>
<script src="../praxis-toast.js"></script>
```

### Code

One tag, no stylesheet:

```html
<script src="praxis-toast.js"></script>

<script>
  praxisToast('Workspace saved');
  praxisToast('Could not save — try again', { tone: 'danger', duration: 4000 });

  var t = praxisToast('Exporting…', { duration: 30000 });
  // …when the export finishes:
  t.dismiss();
</script>
```

#### Why the CSS is inside the script

Same argument as `praxis-lucide.js`. A toast has no markup until it fires, so a consumer who loads the script and forgets a stylesheet gets an unstyled line of text at a moment they cannot rehearse — in production, on the success path, once. One tag cannot be half-installed. The style element is injected on load as well as on first call.

#### Where it came from

Promoted from the groom-lake prototype on 2026-08-21, where four pages each carried a private `toast()` closure: the same shape, the same 1.9 seconds, four copies of a 20-line `cssText` string, and no two agreeing on whether the message reached a screen reader. A confirmation is a system-level behaviour, and an application should not be able to have four of them.

### Markup contract

There is none — and that is the contract. You write no markup and no classes. The interface is the function.

| Item | Behaviour |
|---|---|
| `praxisToast(message)` | The text. Set as `textContent`, so it is not an HTML injection site |
| `opts.tone` | `'success'` or `'danger'`. Omit for the neutral slate |
| `opts.duration` | Milliseconds, default 1900 |
| Returns | `{ dismiss, element }` |
| Region | `role="status"`, `aria-live="polite"`, created at load. See Accessibility for why the timing matters |
| Self-wiring | Yes. No init call, and the style is injected on load |

### Token reference

None reachable. The script carries its own values in an internal `cssText` string rather than reading `--praxis-*` tokens, which is the trade-off that makes it work without a stylesheet.

**That means the toast does not follow the theme.** It cannot, because it does not consume the token layer. If a toast ever needs to match a themed surface, the fix is to read the tokens with a fallback to the current literals — not to ask consumers to load a stylesheet, which is the problem this design exists to avoid.

### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Use it to confirm something the user just did.
- Give failures a longer duration than successes.
- Keep it to one short line.

**Don't**

- Use it as the only report of what happened — see the trap below.
- Put a button or a link in it. It is not interactive and it will be gone before anyone reaches it. An undoable action needs a permanent affordance.
- Use it for something the user must read. That is a [dialog](#dialog) or an inline message.
- Fire one on page load. Nothing has happened yet.

### Accessibility

The live region is created at load, *before* any message goes into it, with `role="status"` and `aria-live="polite"`. Creating a region and its text in the same frame is the reliable way to have the announcement dropped, which is what three of the four copies this replaces did. `status` rather than `alert`, because a confirmation should queue behind whatever is being read rather than interrupt it.

**A toast is never the only report of what happened.** It is unreadable to anyone not looking at that corner, gone before a screen magnifier reaches it, and absent entirely to a keyboard user two tab stops away. Whatever it announces has to be visible somewhere permanent as well — a state chip, a count, a row that has changed. Use it to confirm, never to inform.

### Dimensions

All set inside the script and not overridable from a stylesheet:

| Element | Property | Value |
|---|---|---|
| Region | Position | Bottom-centred, fixed, `pointer-events:none` |
| Toast | Duration | 1900ms default |
| Toast | Stacking | Appended, oldest at the top of the stack |

---

## Mazlan — AI surfaces

The four-dot signature glyph, the agentic gradient, and the one real blocker in Praxis — the conversational drawer whose markup the package does not ship.


Tier: **unstable** · Sheet: `praxis-mazlan.css` · Script: `praxis-mazlan.js`
**You cannot use the drawer from the package alone.** `praxis-mazlan.js` requires a large fixed-id DOM — `#mazlan-drawer`, `#mazlan-scrim`, `#mazlan-thread`, `#mazlan-welcome`, `#mazlan-suggestions`, `#mazlan-drawer-textarea`, `#mazlan-primary-btn`, `#mazlan-menu`, `#mazlan-more` and about a dozen more — and that markup is **not shipped in this package**. The script queries the ids and returns silently when they are absent, so the trigger will simply do nothing. There is no error to see.

**If your prototype needs the Mazlan drawer, raise it.** The markup should be extracted into the package rather than reinvented per prototype.

`praxis-mazlan.css` is the largest sheet in Praxis and covers the conversational drawer, the menu, reasoning timeline, message bubbles, follow-ups and content panel. All of that CSS is here and ready. What is missing is the markup it styles.

### Anatomy

1. **Mark** — `.mazlan-mark`, the four-dot brand glyph. The one part that is safe to use on its own.
2. **Drawer** — `.mazlan-drawer`, the conversation surface.
3. **Thread** — `.mazlan-thread` holding `.mazlan-msg`.
4. **Input** — `.mz-input`, with tool and scope buttons.
5. **Suggestions and follow-ups** — `.mazlan-suggestions`, `.mazlan-followups`.
6. **Sources and reasoning** — `.mazlan-sources`, `.mazlan-reasoning`.

#### What you can use today

#### The four-dot signature

`.mazlan-mark` is the AI signature glyph. It works standalone and needs no JavaScript, but it needs **four empty child spans** — they *are* the dots, positioned by `nth-child`. An empty `.mazlan-mark` renders nothing at all, which is the single most common mistake with it.

```html
<div style="display:flex;gap:2rem;align-items:center">
  <span class="mazlan-mark mazlan-mark--sm" aria-hidden="true">
    <span></span><span></span><span></span><span></span>
  </span>
  <span class="mazlan-mark" aria-hidden="true">
    <span></span><span></span><span></span><span></span>
  </span>
  <!-- There is no --xl. Size it yourself; the dots are percentage-positioned,
       so the glyph scales from width and height alone. -->
  <span class="mazlan-mark" aria-hidden="true" style="width:40px;height:40px">
    <span></span><span></span><span></span><span></span>
  </span>
  <span style="display:inline-flex;align-items:center;gap:.5rem;
               color:var(--praxis-color-text-tertiary);
               font-size:var(--praxis-type-size-sm)">
    <span class="mazlan-mark" aria-hidden="true"></span>
    no child spans, renders nothing
  </span>
</div>
```

Dot colors are slate, magenta, cyan, teal, clockwise from top-left; the slate dot lightens in dark mode.

**Only two sizes are defined: base 20px and `.mazlan-mark--sm` at 16px.** `.mazlan-mark--xl` at 40px is *not* a Praxis class — it appears only inside a comment in `praxis-mazlan.css` describing what one consumer's own page did. `PRAXIS-FOR-AGENTS.md` transcribed that comment as though it were a definition until 0.1.5 — the live example on this page is what caught it, and that guide is now generated from this content, so the two cannot disagree again. Using `--xl` silently gets you the 20px base. Set `width` and `height` yourself instead: the dots are positioned in percentages, so the glyph scales from those two properties alone, as the third mark above does.

Its base rules live in **`praxis-admin.css`**, not `praxis-mazlan.css` — another reason to load the bundle rather than picking sheets. Inside the drawer, `.mazlan-welcome__logo > span` adds a calm 3.2s breathing animation, amplitude deliberately held to 8% for a regulated-industry context, and switched off under `prefers-reduced-motion`.

#### The agentic gradient

The teal to magenta gradient, `#29D2D7 → #E30072`, is reserved for agentic moments: gradient borders, insight bands, the mark itself. Do not use it for ordinary emphasis — its whole job is to mean "a machine did this".

```html
<div style="display:grid;gap:1rem;max-width:30rem">
  <div style="padding:1px;border-radius:var(--praxis-radius-md);
              background:linear-gradient(135deg,#29D2D7,#E30072)">
    <div style="padding:.875rem 1rem;border-radius:calc(var(--praxis-radius-md) - 1px);
                background:var(--px-surface)">
      <strong>Suggested cause</strong>
      <p style="margin:.25rem 0 0;color:var(--praxis-color-text-secondary)">
        Three near-misses in bay 4 this quarter share a pallet-stacking pattern.</p>
    </div>
  </div>
  <div style="padding:.875rem 1rem;border-radius:var(--praxis-radius-md);color:#fff;
              background:linear-gradient(135deg,#29D2D7,#E30072)">
    <strong>Insight band</strong>
    <p style="margin:.25rem 0 0;opacity:.9">Full-bleed gradient. Check the ink contrast
      before you commit to white on the teal end.</p>
  </div>
</div>
```

#### The section hand-off pill

`.mazbtn` is the quiet section-level hand-off, and it lives in `praxis-rfield.css` rather than here. See [fields](#sub-sections-and-the-mazlan-hand-off).

### Variants

One drawer, and a chat-only mode via `.mazlan-chat-only`.

#### The drawer inventory

Everything below is **fully styled and has no shipped markup**. There is nothing to demonstrate — an example would be me inventing the markup, which is exactly what this page is telling you not to do. It is inventoried so that when the markup is extracted, whoever does it knows what the sheet already expects, and so a reader who greps for one of these names finds out why it does nothing.

#### The shell

| Class | What it styles |
|---|---|
| `.mazlan-drawer` | The panel. Its transitions use `--praxis-motion-drawer` and the two spring easings — the three tokens that were once defined on one page only, which is why the drawer had no transition anywhere else. |
| `.mazlan-scrim`, `--open` | Backdrop. Note `--open` as a BEM modifier here, against `.is-open` elsewhere in Praxis. |
| `.mazlan-thread` | The scrolling conversation column |
| `.mazlan-welcome` | The pre-conversation state. `.mazlan-welcome__logo > span` is where the 3.2s breathing animation lives — amplitude held to 8% deliberately, and switched off under `prefers-reduced-motion`. |
| `.mazlan-chat-only` | A layout mode for when the content panel is closed |

#### Messages and reasoning

| Class | What it styles |
|---|---|
| `.mazlan-msg` | A bubble |
| `.mazlan-typing` | The pending indicator |
| `.mazlan-reasoning` | The step timeline shown while an answer is assembled |
| `.is-spinning` | Shared in-progress state, used on the tool and refresh affordances |
| `.mazlan-content` | The side panel a message can open |

#### Citations

The most developed part of the sheet, and the part most worth having when the markup lands: `.mazlan-sources` with `__label`, `__avatars`, `__toggle`, `__chev` and `__list`, opened with `--open`; and each `.mazlan-source__item` carrying an `__avatar`, `__title`, `__text`, `__origin` and `__arrow`. A collapsed row of avatars that expands into attributed sources is a specific, considered answer to "where did this come from", and it is all here.

#### Input and menus

| Class | What it styles |
|---|---|
](#page-families-and-part-only-names)| `.mz-input` | The composer. **Only `.mz-input__send` is styled** — it gets the dark primary ink in dark mode from `praxis-core.css`. The shell itself is unkeyed; see [part-only names. |
| `.mazlan-sugg`, `__icon`, `__icon--blue` | A starter prompt. The tinted icon variants map to the suggestion categories in `MAZLAN_CONFIG`. |
| `.mazlan-followups`, `.mazlan-followup` | Suggested next questions under an answer |
| `.mazlan-scope-btn` | What the conversation is scoped to |
| `.mazlan-tool-btn`, `.mazlan-plus-wrap` | Tool and attach affordances beside the composer |
| `.mazlan-dropdown`, `__title`, `__item`, `__icon` | The model or mode picker |
| `.mazlan-more`, `-wrap`, `__item`, `__item--danger`, `__divider` | The overflow menu, including a destructive item treatment |
| `.mazlan-menu` | The launcher menu from the app bar |

**What to do if you need this.** Do not reconstruct the DOM from the class list above — the script requires specific *ids*, not classes, and getting 30 of them right by inference is not a good use of an afternoon. Raise it, and the markup gets extracted into the package once, correctly. Meanwhile [the mark](#the-four-dot-signature), the gradient and [`.mazbtn`](#sub-sections-and-the-mazlan-hand-off) are all usable today and cover most of what a prototype needs to signal an agentic moment.

### States

- **Open** — `.is-open` on the drawer, with `.mazlan-scrim`.
- **Typing** — `.mazlan-typing`, the three dots. Currently the only loading affordance anywhere in Praxis; see [Loading states](#loading).
- **Spinning** — `.is-spinning`, on a tool button while it works.
- **Reasoning shown** — `.mazlan-reasoning` expanded.

### Responsive behavior

The drawer's motion depends on three tokens that used to be defined on one page only — `--praxis-motion-drawer`, `--praxis-ease-spring` and `--praxis-ease-spring-soft`. Before they were promoted, those declarations were invalid at computed-value time everywhere else, so the drawer had no transition at all on nineteen of twenty pages.

Beyond that, the drawer's own breakpoints are not documented here because the markup is not shipped — which is the subject of the trap in Markup contract.

### Interactive demo

#### Configuration, for when you have the markup

`window.MAZLAN_CONFIG` takes `{ greeting, suggestions: [{icon, cat, text, reply, action}], scope }` and is read lazily on each open, so you can refresh it on the trigger click. This only matters once you have the drawer markup.

The drawer is a prototype surface with canned replies, not an integration with a model. It references no host globals directly; it uses `window.announce` when present and optionally `window.openAgentic` and `window.closeDetailPanel`.

### Code

`praxis-mazlan.css` and `praxis-mazlan.js`. The script auto-initialises and mutates the document globally.

```html
<link rel="stylesheet" href="praxis-mazlan.css">
<script src="praxis-mazlan.js"></script>
```

### Markup contract

**Praxis ships this sheet's CSS without its markup.** Fifteen of its class families are an inventory with no working example, because the drawer's DOM lives in the prototype rather than in Praxis. So the classes below are documented as an inventory, not as a contract you can build against — if you need the drawer, you need the markup too, and this package does not have it.

The one exception is `.mazlan-mark`, which is self-contained and safe to use. That is why it appears in the app bar examples on [The app shell](#the-app-shell) and nothing else here does.

### Token reference

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.mazlan-drawer` | 64 |
| `.mazlan-menu` | 43 |
| `.mazlan-reasoning` | 28 |
| `.material-symbols-rounded` | 19 |
| `.mazlan-msg` | 19 |
| `.mazlan-suggestions` | 17 |
| `.mazlan-content` | 17 |
| `.mazlan-sugg` | 16 |
| `.mazlan-more` | 15 |
| `.mazlan-sources` | 14 |
| `.mazlan-source` | 12 |
| `.mazlan-welcome` | 10 |
| `.mazlan-dropdown` | 6 |
| `.mazlan-scrim` | 5 |
| `.mazlan-followup` | 5 |
| `.mazlan-typing` | 5 |
| `.mazlan-thread` | 4 |
| `.mazlan-tool-btn` | 4 |
| `.mazlan-chat-only` | 2 |
| `.mazlan-scope-btn` | 2 |
| `.is-spinning` | 1 |
| `.mazlan-mark` | 1 |
| `.mazlan-followups` | 1 |
| `.mazlan-more-wrap` | 1 |
| `.mazlan-plus-wrap` | 1 |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Use `.mazlan-mark` on its own. It is complete.
- Treat the rest as an inventory of what exists, for reading rather than building.

**Don't**

- Try to reconstruct the drawer from these class names. Fifteen families with no example is not a specification.
- Use this for human comments on a record — that is a different component, and it is planned. See [Comment thread](#comments).
- Use `.mazlan-typing` as a general loading indicator. It is tied to this surface.

### Accessibility

Not assessable from here, and that is the honest answer: the markup that would carry the roles, the live regions and the focus management is not in this package.

What can be said is what a conversation surface needs, so it is not forgotten when the markup does arrive: a live region for streamed responses that does not re-announce the whole thread, focus management on open and close, an escape route, and a non-visual equivalent for the typing indicator. `.mazlan-typing` is currently three animated dots and nothing else, which communicates nothing to a screen reader.

### Dimensions

Not documented, for the same reason as Markup contract — the drawer's geometry is expressed against markup that is not shipped. `.mazlan-mark` is the exception and it is sized by its container.

---

## The admin shell

Read this even if you are not building admin. Despite the name, this sheet carries the application shell, the toolbar button, the switch, the icon base and the popover — and praxis.css includes it.


Tier: **unstable** · Sheet: `praxis-admin.css` · Script: `praxis-admin-chrome.js`
**The name hides what this sheet actually is.** It carries the application shell every Praxis page needs — `.app`, `.main`, `.content`, the `.appbar` positioning and the `.praxis-navrail` container — plus `.tbtn`, `.switch`, `.icon`, `.px-pop`, `.px-skip`, `.mazlan-mark` and `*{box-sizing:border-box}`. Import piecemeal without it and you lose all of that. Loading the `praxis.css` bundle makes it moot, which is the argument for the bundle.

Everything from `.adminnav` onward *is* admin-specific, and it is the largest single component surface in Praxis. It sits in the **unstable** tier because it is page-scoped: the ten admin pages emit an identical shell and this sheet was extracted from them, so it is shaped by those screens rather than by a general case.

### Anatomy

#### The shell primitives

| Class | What it is |
|---|---|
| `.app` | `display:flex; flex-direction:column; height:100vh; overflow:hidden`. The reason the page does not scroll — the content column does. |
| `.main` | `flex:1; display:flex; min-height:0`. The rail and content sit side by side inside it. The `min-height:0` is what lets the inner column actually scroll. |
| `.content` | The column. Declares `--ph-pad-x:24px`, which the page header, toolbar band and your body all inherit — change it here, once, to reset the page rhythm. |

#### The admin nav

A third navigation level, beside the rail: `.adminnav` at `--adminnav-w`, with a head, a type-to-filter field, a scrolling group list and items. It is the largest family in the sheet at 24 rules.

**`praxis-core.css` hides it outright:** `body[data-variant="praxis"] .adminnav { display:none !important }`. So under the Praxis variant — which is every Praxis page — the admin nav does not render at all. The styling is here for the pages that predate the variant. If you want a third nav level under Praxis you are overriding an `!important`, which is a signal to build it as your own component rather than reviving this one.

### Variants

#### Layout and cards

```html
<div class="admin-cols">
  <div>
    <div class="admin-card">
      <p class="admin-subhead">Notification defaults</p>
      <div class="admin-grid">
        <div class="admin-field">
          <span class="admin-field__label">Digest frequency</span>
          <span class="admin-field__value">Daily</span>
        </div>
        <div class="admin-field">
          <span class="admin-field__label">Escalation window</span>
          <span class="admin-field__value">48 hours</span>
        </div>
        <div class="admin-field">
          <span class="admin-field__label">Reply-to</span>
          <span class="admin-field__value">ehsq@example.com</span>
        </div>
      </div>
    </div>

    <div class="admin-card" style="margin-top:1rem">
      <p class="admin-subhead">Status</p>
      <div class="admin-drill__stats">
        <div class="admin-stat">
          <button class="admin-stat__btn" type="button">Active users</button>
          <span class="admin-stat__metric"><b>1,284</b> across 6 sites</span>
        </div>
        <div class="admin-stat">
          <button class="admin-stat__btn" type="button">Pending invites</button>
          <span class="admin-stat__metric"><b>37</b> awaiting reply</span>
        </div>
        <div class="admin-stat">
          <button class="admin-stat__btn" type="button">Failed jobs</button>
          <span class="admin-stat__metric"><b>4</b> in the last hour</span>
        </div>
      </div>
    </div>
  </div>

  <div>
    <div class="admin-banner">
      <span class="material-symbols-rounded" aria-hidden="true">info</span>
      <div>
        <strong>Scheduled maintenance</strong>
        <p style="margin:.125rem 0 0">Sunday 02:00–04:00 UTC.</p>
      </div>
    </div>
    <p class="admin-note" style="margin-top:1rem">Changes here apply to every workspace in
       the tenant.</p>
  </div>
</div>
```

`.admin-field` is the read-out row, and it is worth knowing that `praxis-rfield.css` gives it [the static-field treatment automatically](#four-gotchas-each-learned-the-hard-way), selected with `:has(> .admin-field__value)` — so generated admin pages needed no markup change to pick up the record-form look.

#### Settings rows and drill-downs

```html
<div class="admin-settings-grid">
  <div class="admin-setting-card">
    <div class="admin-setting-row">
      <div>
        <strong>Require two-factor</strong>
        <p class="admin-note" style="margin:.125rem 0 0">For every account in the tenant.</p>
      </div>
      <span class="switch">
        <input type="checkbox" checked>
        <span class="track"></span><span class="thumb"></span>
      </span>
    </div>
    <div class="admin-setting-row">
      <div>
        <strong>Allow personal API tokens</strong>
        <p class="admin-note" style="margin:.125rem 0 0">Tokens inherit the user's role.</p>
      </div>
      <span class="switch">
        <input type="checkbox">
        <span class="track"></span><span class="thumb"></span>
      </span>
    </div>
    <a class="admin-drill" href="#">
      Reporting authorities
      <span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
    </a>
  </div>
</div>
```

### States

- **Tab active** — `.admin-tab--active`, teal ink and a 2px border. No focus rule; see Accessibility.
- **Nav item active** — `.adminnav__item--active`, a teal tint plus a 3px left bar, remapped to cyan in dark.
- **Row selected** — `.admin-table__row--selected`, using the amber `--admin-row-selected`.
- **Row hover** — `--px-hover`.
- **Pill states** — `--ok`, `--off`, `--lock`, `--info`, `--warning`.
- **Empty table** — `.admin-table__empty`.

### Responsive behavior

| Viewport | Behaviour |
|---|---|
| ≤1024px | `.admin-cols` variants collapse to one column; `--4` and `--6` grids to two |
| ≤768px | `--adminnav-w` drops to 224px; `--2` and `--3` grids and the settings grid collapse |
](#nav-drawer-and-rail-flyouts)| ≤640px | The side nav collapses to a 60px icon rail — and under the Praxis variant `praxis-core.css` hides it outright, because 60px of unlabelled icons is unusable and it offsets the header and content so they cannot line up with the full-width app bar. Its destinations fold into [the nav drawer |
| ≤480px | `--4`, `--6` and the drill stats go to one column; the app switcher hides |

### Interactive demo

#### Tables

Three wrappers, and they are not interchangeable: `.admin-table-wrap` is the outer container, `.admin-table-scroll` adds the horizontal scroll for wide column sets, and `.admin-tabletools` is the control strip above.

```html
<div class="admin-card">
  <div class="admin-tabs">
    <button class="admin-tab admin-tab--active" type="button">All users</button>
    <button class="admin-tab" type="button">Pending</button>
    <button class="admin-tab" type="button">Disabled</button>
  </div>
  <div class="admin-tabletools">
    <button class="admin-ghostbtn" type="button">
      <span class="material-symbols-rounded" aria-hidden="true">add</span> Invite user
    </button>
  </div>
  <div class="admin-table-wrap">
    <div class="admin-table-scroll">
      <table class="admin-table">
        <thead>
          <tr><th>Name</th><th>Role</th><th>Site</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Marcus Silva</td><td>EHS coordinator</td><td>Teesside works</td>
            <td><span class="admin-pill admin-pill--ok">Active</span></td>
            <td><button class="admin-rowx" type="button" aria-label="Remove">
              <span class="material-symbols-rounded" aria-hidden="true">close</span></button></td>
          </tr>
          <tr>
            <td>Aoife Byrne</td><td>Supervisor</td><td>Teesside works</td>
            <td><span class="admin-pill admin-pill--warning">Invited</span></td>
            <td><button class="admin-rowx" type="button" aria-label="Remove">
              <span class="material-symbols-rounded" aria-hidden="true">close</span></button></td>
          </tr>
          <tr>
            <td>Tom Okafor</td><td>Driver</td><td>Rotherham plant</td>
            <td><span class="admin-pill admin-pill--off">Disabled</span></td>
            <td><button class="admin-rowx" type="button" aria-label="Remove">
              <span class="material-symbols-rounded" aria-hidden="true">close</span></button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

Zebra striping is `tbody tr:nth-child(even)`, and the same warning applies as for [in-record tables](#fields): **a hidden empty-state row still counts**. Put it in its own `<tbody>`.

#### Search suggestions

`.ss-pop`, `.ss-sec` and `.ss-row` are the app-bar search suggestion popover, wired by `praxis-admin-chrome.js`. `.ss-row mark` is styled for match highlighting — transparent background, interactive-teal ink, weight 700 — so wrap the matched substring in `<mark>` rather than a span.

`.ss-sec` has no base rule; only `.ss-sec__head` is defined. So the section wrapper is yours, and it appears in the [unkeyed families](#families-praxis-never-keys-a-rule-on) table for that reason.

### Code

`praxis-admin.css` — 520 lines and the largest sheet in the system — plus `praxis-admin-chrome.js`.

**This sheet is not a component library.** It carries the application shell, a bare-element `box-sizing` reset, `html,body{height:100%}`, an `a` rule and its own `.tbtn`. Loading it to get one card restyles your whole page. That is exactly why `praxis-controls.css` exists, and why [Card base](#card) and [Table base](#table) propose moving the canonical definitions to core.

#### Chrome wiring

`praxis-admin-chrome.js` wires the shared chrome for all ten admin pages at once, because they emit an identical shell with the same `ad-` element IDs: the Create New flyout, the search module selector, the Dashboards popout, search suggestions and the Mazlan drawer.

**It is ID-driven, so it only works on markup that uses those exact IDs**, and it **depends on `praxis-create-new.js` being loaded first** for the catalog data. It also deliberately does *not* wire the app switcher, profile menu, theme button or side-nav filter — those stay in each page's own inline script. So loading this file does not give you a working admin header on its own.

### Markup contract

| Item | Requirement |
|---|---|
| Shell | `.app` > `.appbar` + `.main` > rail + `.adminnav` + `.content`. `.content` sets `--ph-pad-x:24px`, which the header, the band and `.admin-body` all inherit |
| `.adminnav` | A labelled `<nav>`. Active item gets `aria-current="page"` alongside the class |
](#tabs)| `.admin-tabs` | Real tab roles, or do not claim them. See [Tabs |
| `.admin-table` | A real table with `scope` on header cells. `__num` for numeric columns |
| `.admin-card__title` | A `<p>` in every current example. Use a heading where the card is a section of the page |
| JS | `praxis-admin-chrome.js`, self-wiring, mutates the document |

### Token reference

#### Everything this sheet defines


| Family | Mentions |
|---|---|
| `.switch` | 30 |
| `.adminnav` | 30 |
| `.ws-item` | 23 |
| `.admin-field` | 15 |
| `.tbtn` | 14 |
| `.admin-table` | 14 |
| `.material-symbols-rounded` | 12 |
| `.admin-grid` | 11 |
| `.appswitch` | 10 |
| `.admin-pill` | 9 |
| `.icon` | 8 |
| `.admin-banner` | 8 |
| `.mazlan-mark` | 8 |
| `.admin-ghostbtn` | 7 |
| `.admin-cols` | 7 |
| `.admin-drill` | 7 |
| `.admin-stat` | 7 |
| `.admin-card` | 5 |
| `.admin-setting-row` | 5 |
| `.admin-menurow` | 5 |
| `.admin-note` | 5 |
| `.px-menu` | 5 |
| `.ws-pop` | 5 |
| `.ss-row` | 5 |
| `.admin-tab` | 4 |
| `.ss-pop` | 4 |
| `.track` | 3 |
| `.px-pop` | 3 |
| `.admin-rowx` | 3 |
| `.admin-settings-grid` | 3 |
| `.thumb` | 2 |
| `.req` | 2 |
| `.admin-table-scroll` | 2 |
| `.admin-panel` | 2 |
| `.admin-setting-card` | 2 |
| `.admin-menulist` | 2 |
| `.admin-addmenu` | 2 |
| `.admin-cngroup` | 2 |
| `.admin-cnbtn` | 2 |
| `.visually-hidden` | 1 |
| `.app` | 1 |
| `.appbar` | 1 |
| `.main` | 1 |
| `.praxis-navrail` | 1 |
| `.content` | 1 |
| `.admin-body` | 1 |
| `.admin-subhead` | 1 |
| `.admin-tabs` | 1 |
| `.admin-tabletools` | 1 |
| `.admin-table-wrap` | 1 |
| `.admin-link` | 1 |
| `.admin-check` | 1 |
| `.admin-preview` | 1 |
| `.admin-cngrid` | 1 |
| `.lg-tm` | 1 |
| `.lg-jv` | 1 |
| `.lg-cs` | 1 |
| `.lg-err` | 1 |
| `.ss-sec` | 1 |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Use `.admin-card`, `.admin-table` and `.admin-pill` — all three are complete, and they are what this reference site is built from.
- Use `.admin-panel` for anything nested inside a card.
- Give the side nav a label and mark the current page.

**Don't**

- Load this sheet for one rule. Read the trap in Code first.
- Rely on the side nav below 640px — it is hidden under the Praxis variant.
- Combine zebra striping with a selected-row fill and expect both to read. The stripe is `tbody tr:nth-child(even)` and the selection is an amber wash; on alternating rows they interact.

### Accessibility

- **`.admin-tab` has no `:focus-visible` rule.** A keyboard user gets the UA outline over a 2px bottom border, which is where it is least visible. This is a live defect, not a planned improvement — tracked on [Tabs](#tabs).
- The tabs also carry no tab roles in the current examples, so they are a row of buttons with tab paint.
- `.adminnav` needs a label and `aria-current`; the 3px active bar is a `::before` and conveys nothing to assistive technology.
- Tables need `scope` on header cells and a name on the table.
- `.admin-pill--ok` and `--lock` were repointed to the audited tone pairs after measuring 3.81:1 and 3.88:1 against a 4.5 requirement at 12px/700. Any new pill variant has to be measured, not eyeballed.
- Row actions like `.admin-rowx` are icon-only and need labels naming the row they act on.

### Dimensions

| Element | Property | Value |
|---|---|---|
| Shell | `--appbar-h` / `--navrail-w` / `--adminnav-w` | 64px / 56px / 260px (224px ≤768px, 60px ≤640px) |
| `.admin-card` | Padding / radius | 20px 22px / 12px |
| `.admin-panel` | Padding | 18px 20px |
| `.admin-table` | Cell padding | 12px 14px body, sticky head |
| `.admin-table-scroll` | Max height | 440px, 560px for `--tall` |
| `.admin-pill` | Height / padding | 22px / 0 9px, 12px/700 |
| `.adminnav__item` | Min height | 40px |
| `.admin-grid` | Gap | 18px 34px |

---

## Page families and part-only names

Fourteen class names praxis-core.css mentions and does not define. Some are page-family hooks doing one job; the rest are components whose parts are styled while the container never was.


Tier: **unstable** · Sheet: `praxis-core.css`
Grep `praxis-core.css` for a class name and you will find several that look like components and are not. They fall into two groups, and neither gives you anything to build with — which is exactly why they are worth a page rather than a footnote.

### Anatomy

This page has no anatomy, because it does not document a component. It is a catalogue of names `praxis-core.css` refers to and does not define — page families, toolbar band variants, container names that were never styled, and interaction-only names.

The sections are kept in the skeleton's order so this page answers the same questions as every other, but several of them answer "not applicable, and here is why".

#### Page families — one job each

`.home`, `.view`, `.record`, `.demo`, `.rm-body`, `.ws-body` and `.admin-body` appear in **exactly one rule** between them:

```html
body[data-variant="praxis"] .home,
body[data-variant="praxis"] .view,
body[data-variant="praxis"] .record,
body[data-variant="praxis"] .demo,
body[data-variant="praxis"] .rm-body,
body[data-variant="praxis"] .ws-body,
body[data-variant="praxis"] .admin-body {
  padding-inline: var(--px-gutter);
}
/* inside @media (max-width: 640px) */
```

That is the whole contribution. They are **markers for which page family you are on**, so the phone gutter applies to the content wrapper whatever it happens to be called on that screen. They carry no layout, no surface and no type.

**What to do with this:** if you are writing a new page, put one of these on your content wrapper — or better, use [`.page`](#card-page-and-texture), which is a real definition — and you inherit the phone inset in step with the app bar and the header. If you were hoping `.record` gave you a record layout, it does not. See [the app shell](#the-app-shell).

### Variants

#### Toolbar band variants

`.rp-toolbar`, `.ws-toolbar` and `.admin-toolbar` are alternative names for the toolbar band on different page families. Core mentions them only in one place: the dark-mode treatment that swaps a primary button inside a toolbar band from the full gradient to the softer `--px-primary-soft`. The band itself is `.toolbar`, defined in [the shell](#the-app-shell).

So they are aliases for the purposes of that one rule. If you name your band `.rp-toolbar` you get the dark primary treatment and nothing else — you still need `.toolbar` for the band.

### States

#### Interaction-only names

A last group appears solely in the shared hover and press lists: `.qa`, `.lg-btn`, `.icon-btn`, `.sortbtn`, `.filter-toggle`, `.pill-btn`. They are covered on [Buttons](#buttons), where the table says which of them has a base and which does not. The short answer is `.tbtn` and `.admin-ghostbtn` only.

### Responsive behavior

The page families carry the phone gutter. Below 640px `--px-gutter` is 16px and `.home`, `.view`, `.record`, `.ws-body`, `.admin-body`, `.rm-body` and `.demo` all take it as inline padding.

That is the one thing on this page that is genuinely defined rather than referenced, and it is the reason the family names matter: one rule sets the content inset for seven page types, so the app bar, the page header and the content all line up on one number.

### Interactive demo

There is nothing to demonstrate — every name on this page is either a container Praxis does not style or a state it only tints. The frame below shows the one visible thing: `.subtab`, a name-only family, rendering as bare buttons.

```html
<div class="subtab">
  <button class="subtab__btn" type="button">Open <span class="subtab__count">4</span></button>
  <button class="subtab__btn" type="button">Closed <span class="subtab__count">17</span></button>
</div>
```

### Code

`praxis-core.css`, which every page loads. Nothing here needs to be imported separately — the point of the page is that these names are already in scope and mostly do not do what their names suggest.

### Markup contract

#### Part-only names — the container was never styled

These seven have **no rule keyed on the bare class at all**. Core styles their *parts* and leaves the container to the page:

| Family | What core actually styles | What you write |
|---|---|---|
| `.pager` | `.pager__btn` hover, and `.pager__btn--active` exclusion | The strip itself — layout, gaps, the button box |
| `.rep` | `.rep__pin` press transform | Everything else |
| `.upnext` | `.upnext__open` press transform | Everything else |
| `.subtab` | Nothing on the bare class | All of it |
| `.capa-prio` | Nothing on the bare class | All of it |
](#mazlan-ai-surfaces)| `.mz-input` | `.mz-input__send` gets the dark primary ink | The input shell — see [Mazlan, and note the drawer markup is not shipped either |
](#nav-drawer-and-rail-flyouts)| `.nav-menu-drawer` | Nothing on the bare class | All of it. Use [`.px-navdrawer`, which is fully defined. |
](#segmented-control)| `.segswitch` | `.segswitch > button` press transform | The switch. Or use [`.segmented`, which is complete. |

**Two of these have a complete alternative and you should prefer it.** `.nav-menu-drawer` → `.px-navdrawer`. `.segswitch` → `.segmented`. Reaching for the part-only name gets you a press animation on an unstyled box, which is a worse starting point than nothing because it looks half-wired.

### Token reference


| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--px-gutter` | `16px` | — |
| `--home-gutter` | `var(--px-gutter)` | — |
| `--sp-gutter` | `var(--px-gutter)` | — |


### Figma adaptation

Not mapped. Praxis has no Figma library.

### Usage guidelines

**Do**

- Use a family name on your page container so it picks up the phone gutter.
- Check this page before assuming a class exists.

**Don't**

- Expect a container from a part-only name.
- Rely on an interaction-only name for anything at rest.
- Invent a new page family. Seven is enough, and each one is a line in a shared media query.

#### Why this page is in the unstable tier

Because none of it is a decision anyone would make on purpose. These names are the residue of extracting a shared sheet from twenty pages: the interaction rules were general enough to promote, the containers were not. The right end state is that each either gets a real definition or stops being mentioned in `src/` — this page exists so the current state is visible instead of surprising, and it is measured by the [unkeyed families](#families-praxis-never-keys-a-rule-on) table on every build.

### Accessibility

Nothing here is a control, so there is little to assess. Two notes that do matter:

- Six of these names have no base rule at all — `.pager`, `.capa-prio`, `.subtab`, `.upnext`, `.rep`, `.qa` — which means anything built on them is unstyled, and unstyled frequently means unfocusable and unlabelled too. `.pager` is pagination and is tracked on [Pagination](#pagination).
- The page-family containers are where a skip-link target belongs. `.px-skip` points at page content, and that content is one of these.

### Dimensions

None defined. These are names, not boxes — which is the whole subject of the page.
