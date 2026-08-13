<!-- transcribed from src/ at 0.1.3 — 2026-08-13 -->
<!-- method: read every sheet and script in src/, extracted selector structure, JS DOM
     contracts (querySelector/getElementById targets) and token definitions. Not
     render-verified: no page was loaded in a browser for this pass. Where a claim is
     inferred from CSS structure rather than observed, it says so. -->

# Praxis for agents

You are building a prototype with Praxis. This file is the whole brief: what to load,
what markup to emit, which tokens exist, and what Praxis does *not* give you.

Read it before writing markup. It is transcribed from `src/`, which is the source of
truth — not from any prototype that consumes Praxis.

**If you only read one section, read [Non-negotiables](#non-negotiables) and
[The one mental model](#the-one-mental-model).** Nearly every "Praxis looks broken"
report traces to one of those two.

Related docs, and when to prefer them:

| File | Use it for |
|---|---|
| `README.md` | Installing, publishing, fonts, licence |
| `DESIGN-SYSTEM.md` | Design rationale and *why* a component looks the way it does |
| **this file** | Building a page |

`DESIGN-SYSTEM.md` also carries an audit history and a consolidation backlog. Those are
notes to the maintainers, not instructions to you. It has some stale claims; see
[Corrections](#corrections-to-design-systemmd).

---

## Non-negotiables

Six things. Miss any one and the page renders wrong in a way that looks like a Praxis
bug.

1. **`data-variant="praxis"` on `<body>`.** The entire Praxis look — every `--px-*`
   material, the dot grid, the 8/12/16 radius scale, the primary button — is scoped to
   `body[data-variant="praxis"]`. Without it you get the unstyled base layer, not a
   fallback theme.
2. **`data-theme="light"` or `"dark"` on `<body>`.** Dark mode never engages without it.
3. **Set the theme before first paint,** from an inline script that is the first thing
   inside `<body>`. It cannot run from `<head>` — the attribute lives on `<body>`, which
   does not exist yet at that point.
4. **`praxis-tokens.css` loads before `praxis-core.css`.** Using the `praxis.css` bundle
   handles this for you. Do not reorder them if you import piecemeal.
5. **Never redefine a `--praxis-*` or `--px-*` token to point at itself.**
   `--praxis-space-24: var(--praxis-space-24)` is a cycle, invalid at computed-value
   time, and every use of that token in scope silently resolves to `unset`. This has
   happened for real. If you want a page-local name, keep it page-local.
6. **No uppercase text.** No `text-transform: uppercase`, no manually capitalised
   labels — not on section labels, table headers, chips, tabs, buttons or headings.
   Sentence case; get emphasis from weight, size or colour. Acronyms already uppercase
   (EHSQ, CAPA, PDF, NCR) are fine.

---

## The one mental model

**Praxis styles component contents. Your page owns container positioning.**

This is stated explicitly in three sheets. `praxis-appbar.css`: *"this file owns the
header's visual treatment … but deliberately does not set the bar's positioning."*
`praxis-navrail.css`: *"the `.praxis-navrail` container positioning stays per-page."*
`praxis-admin.css`: *"container positioning only — fill/brand/search/right cluster come
from `praxis-appbar.css`."*

The consequence: an `.appbar` with correct children and no shell CSS is a pile of
unpositioned elements. It is not broken — you have not written the shell yet.

The good news is that the shell **is** in the bundle, because `praxis-admin.css` carries
it (`.app`, `.main`, `.content`, `.appbar` positioning, the `.praxis-navrail` container,
`--appbar-h`, `--navrail-w`) and `praxis.css` includes that sheet. So:

> **Load the `praxis.css` bundle and use the shell in
> [The canonical app shell](#the-canonical-app-shell). Do not hand-roll the layout.**

If you import piecemeal and skip `praxis-admin.css`, you lose the shell, `.tbtn`,
`.switch`, `.icon`, `.px-pop`, `.mazlan-mark` and `*{box-sizing:border-box}`. That trap
is real and the sheet's name hides it. Two other bases sit in surprising places too:
`.material-symbols-rounded` is owned by `praxis-create-new.css`, and `.card` / `.page` by
`praxis-workspace.css`. The bundle makes all of this moot — which is the argument for
using it.

---

## Boot: a complete working page

Save as `index.html` and open it. No install, no build, no server.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My prototype</title>
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.3/dist/praxis.css">
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
  <script src="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.3/dist/praxis-lucide.js"></script>
</body>
</html>
```

Pin the exact version. `@0.1`, `^0.1.0` and `@latest` will all pick up breaking changes
while Praxis is pre-1.0.

In a bundled app the requirements are identical — stylesheet, the two `<body>`
attributes, the icon script if you want icons:

```sh
npm install @ideagen-ax/praxis@0.1.3
```

```js
import '@ideagen-ax/praxis'                          // tokens + core + every component
import '@ideagen-ax/praxis/dist/praxis-lucide.js'    // optional, icons only
```

Set the attributes in the host HTML template (in React that means `index.html`, not a
component — they must be present before first paint). Then use the classes directly;
Praxis ships no framework bindings, so there is nothing to wrap.

`praxis-reset.css` is shipped but **deliberately not in the bundle** — it restyles bare
elements and would clobber a host application's own styles. Import it only if you want
that. For a standalone prototype you usually do, and it is safe.

### Diagnosing a broken-looking page

In this order — it is almost always the first item:

1. `data-variant="praxis"` missing → nothing is styled at all.
2. `data-theme` missing → dark mode never engages.
3. Loading component sheets without `praxis-admin.css` → no shell, no `.tbtn`, no
   `box-sizing`.
4. Icons show as words like `expand_more` → `praxis-lucide.js` not loaded.
5. Text in the wrong typeface → expected. Praxis sets `font-family:'Gilroy'` and ships
   **no font files** (licensed, not redistributable). Without a Gilroy licence it falls
   through to Segoe UI / Roboto / Helvetica Neue / Arial. Metrics and layout are
   unaffected; only the typeface changes. With a licence, copy
   `dist/praxis-fonts.example.css`, repoint the paths, load it before `praxis.css`.

---

## The canonical app shell

Every Praxis page is the same four bands. The measured heights, from
`praxis-pageheader.css` and `praxis-admin.css`:

| Band | Height | Token |
|---|---|---|
| App bar | 64px | `--praxis-appbar-h`, and `--appbar-h` locally |
| Nav rail | 56px wide | `--praxis-navrail-width`, and `--navrail-w` locally |
| Page header | 68px min | `--ph-h` |
| Toolbar band | 60px min | `--px-toolbar-h` |

Page content therefore starts at **192px**, and `--px-dot-clear` is set to exactly that
so the dot grid stops short of the chrome. If you change a band height, change the
token — not one page — or the dot grid will cut across your header.

```html
<body data-variant="praxis" data-theme="light">
<script>
  try { var t = localStorage.getItem('gl-theme');
        if (t) document.body.setAttribute('data-theme', t); } catch (e) {}
</script>

<a class="px-skip" href="#content">Skip to content</a>

<div class="app">

  <!-- ============ App bar (64px) ============ -->
  <header class="appbar">
    <a class="appbar__brand" href="index.html">
      <img class="appbar__logo-img appbar__logo-img--onlight" src="logo-light.svg" alt="Ideagen">
      <img class="appbar__logo-img appbar__logo-img--ondark"  src="logo-dark.svg"  alt="">
    </a>

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
          <a class="praxis-navrail__link" href="index.html" aria-label="Home hub">
            <img src="hub.svg" alt="Home hub">
          </a>
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
      </div>
    </nav>

    <!-- ============ Content column ============ -->
    <!-- .content declares --ph-pad-x:24px, which the header, the toolbar band and
         your body all inherit. Change it here, once, to reset the page rhythm. -->
    <div class="content">

      <div class="pageheader">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a class="breadcrumb__home" href="index.html" aria-label="Home">
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
          <div class="pageheader__status">
            <!-- status chips, owner, due date -->
          </div>
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
        <!-- your page -->
      </main>

    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.3/dist/praxis-lucide.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.3/dist/praxis-navdrawer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.3/dist/praxis-profile-menu.js"></script>
</body>
```

### The two rules your page must own

`.app` is `height:100vh; overflow:hidden`, so the page does **not** scroll — the content
column does. Praxis does not style `.page-body` (that name is yours). Add:

```css
.page-body{
  flex:1; min-height:0; overflow:auto;
  padding: var(--px-toolbar-gutter) var(--ph-pad-x) var(--praxis-space-32);
}
```

`--px-toolbar-gutter` (16px) is the canonical gap between the toolbar band and the first
card of content. It exists because that gap was set per section and drifted — 8px on one
page, 6px on another. Use the token.

The body dot grid is `background-attachment:fixed`, so an inner scroll container is
correct: the texture reads as page material and stays put while content moves.

### `.toolbar__inner` — when to use it

Only when your content is a centred max-width column. The band stays full-bleed so its
closing hairline lines up with the page header's; `.toolbar__inner` centres the controls
so they align with the cards below. Set its `max-width` to the same number as your
content column. For a full-width page, put the controls straight in `.toolbar` and drop
the wrapper.

### Icons

Two vocabularies, both work, and `praxis-lucide.js` is what makes them agree:

```html
<span class="material-symbols-rounded">crisis_alert</span>   <!-- ligature, auto-converted -->
<i data-lucide="triangle-alert"></i>                          <!-- Lucide name, direct -->
```

The script maps ~500 Material Symbols ligatures to Lucide names, rewrites the spans to
`<svg>`, and re-runs on a debounced `MutationObserver` so icons you inject later convert
too. It loads a pinned Lucide from beside itself, so over a CDN it needs no extra tag.
Point it elsewhere with `window.PRAXIS_LUCIDE_SRC` before loading it.

**Gotcha, and it will cost you an hour:** the converter injects
`svg.material-symbols-rounded{…}` at specificity (0,1,1), which outranks a plain class
selector. A converted span cannot be reliably restyled or hidden from your stylesheet.
Size it through the existing `.material-symbols-rounded{font-size:Npx}` convention, or
give the element its own wrapper.

### Responsive behaviour you get for free

| Width | What happens |
|---|---|
| ≤1024px | Centred search pill narrows to `min(600px, 100vw - 420px)` |
| ≤1024px, or toolbar overflow | `praxis-toolbar-compact.js` sets `body.tb-is-compact` and collapses the toolbar into a Tools menu — measured, not a fixed breakpoint |
| ≤768px | Search pill goes in-flow; the Mazlan pill is hidden (still reachable from the rail and profile menu) |
| ≤640px | Nav rail hidden, `--navrail-w` zeroed, nav drawer takes over; `--px-gutter` becomes the single 16px inset for app bar, header and content |
| ≤480px | Logo 22px, avatar 30px, tighter app-bar gap |

---

## Tokens

Measured from `src/praxis-tokens.css` and `src/praxis-core.css` at 0.1.3. This is the
complete list of what is *defined* — nothing here is aspirational.

### Reach for these first

Semantic colour, not palette rungs. These are the ones remapped per theme, so using
them is what makes your page theme correctly for free:

```
--praxis-color-text-primary  text-secondary  text-tertiary  text-disabled
--praxis-color-text-inverse  text-link
--praxis-color-surface-default  surface-subtle  surface-muted
--praxis-color-border-default  border-subtle  border-strong  border-focus
--praxis-color-interactive-default  interactive-hover  interactive-active
--praxis-color-status-danger  status-info  status-success  status-warning
```

Praxis material tokens — the surfaces and shadows that carry the look. All defined
twice, once per theme:

```
--px-page  --px-surface  --px-surface-2  --px-drawer  --px-tool  --px-chip  --px-glass
--px-field  --px-field-hover          form-field fill; the field has no border, so
                                       this is the entire affordance
--px-hover        2.5% wash, for large row targets
--px-hover-btn    stronger wash, for small raised controls
--px-card-rail  --praxis-card  --px-card-raised     three elevation tiers, recede →
                                                    default → subject
--px-tool-shadow  --px-tool-shadow-hover  --px-overlay  --px-edge
--px-primary-grad  --px-primary-fg  --px-primary-shadow
--px-primary-soft  --px-primary-soft-fg  --px-primary-soft-shadow  (dark only)
--px-toolbar-gutter  --px-static-field-h  --px-dot  --px-dot-clear  --px-gutter
--px-scroll  --px-scroll-hover
```

Status tone pairs, for chips and badges — always use the pair, never one half:

```
--praxis-tone-{neutral|info|success|warning|danger}-{bg|fg}
```

Glass, for drawers and floating panels:

```
--praxis-glass-{bg|drawer|border|blur|inset|sheen|shadow|hover|on}
```

### Scales, in full

| Scale | Defined steps |
|---|---|
| **Type size** | `2xs` .6875rem · `xs` .75 · `sm` .8125 · `base` .875 · `md` 1 · `lg` 1.125 · `xl` 1.25 · `2xl` 1.5 · `3xl` 1.875 |
| **Space** | `4` .25rem · `8` .5 · `12` .75 · `16` 1 · `20` 1.25 · `24` 1.5 · `32` 2 · `40` 2.5 · `48` 3 |
| **Radius** | `sm` 8px · `md` 12px · `lg` 16px · `xl` 16px · `card` 12px under Praxis · `full` 9999px |
| **Elevation** | `1`–`4` generic; `card`, `card-raised`, `popover` remapped to `--px-*` materials under Praxis |
| **Motion** | `fast` 120ms · `normal` 180ms · `slow` 260ms · `drawer` 280ms · `slowest` 420ms |
| **Easing** | `ease-default` (the Praxis spring, `cubic-bezier(.32,.72,0,1)`) · `ease-spring` · `ease-spring-soft` · `ease-spring-out` · `ease-spring-bouncy` |
| **Chrome** | `appbar-h` 64px · `navrail-width` 56px · `navrail-width-expanded` 240px · `record-rail-w` 300px · `control-h` 32px |

Body type is **14px at weight 600** — a deliberately dense, semibold base. Do not
"fix" it to 16/400.

The palette rungs are `--praxis-color-{neutral|blue|green|orange|pink|red|teal|yellow}-{10…100}`
plus `--praxis-color-white`. Reach for them only when no semantic token fits.

Brand: teal `#1b838b` (`teal-60`), pink `#e30072` (`pink-60`). The Mazlan AI signature is
the teal → magenta gradient, `#29D2D7 → #E30072`, reserved for agentic moments.

### Two live traps with tokens

**Both are from real incidents.** Full versions in `CLAUDE.md`.

*Never substitute one token for another by name.* Check the resolved value in **both
themes** first. `--t-sm` looks like it maps to `--praxis-type-size-sm`, but its fallback
actually resolved to `type-size-base`. `--r-lg` is `1rem` against a canonical `16px` —
equal only because nothing overrides the root font size.

*Interactive teal is a light colour in dark mode.* `--praxis-color-interactive-default`
becomes `#29D2D7`, luminance .55. White text on it as a **fill** measures 1.86:1 against
a 4.5 minimum. Use `--px-primary-fg` (dark ink, 12.4:1) whenever that colour is a fill.
Praxis already does this for the CTAs it defines; if you invent a filled cyan control,
it is on you.

Two more, worth knowing before you go hunting:

- **`--praxis-radius-card` is 20px in the token file and 12px under Praxis.** The Praxis
  override in `praxis-core.css` is the one that renders. 12px is the card geometry.
- **Most `--praxis-*` and `--px-*` tokens are redefined per theme.** Only
  `--praxis-color-white` and the palette primitives resolve identically everywhere.

---

## Components

Tiered by how much use each has actually had. The tiers are a statement about churn
risk, not quality — everything here works.

For each: what the package gives you, the markup it expects, and what you must supply.

### Ready — in daily use, and load-bearing

#### Fields (`.rfield`) — the record form system

The most exercised component in Praxis and the one place every page that shows data
agrees. A field is either **interactive** (this step owns it) or **static** (it belongs
to a passed step, or is read-only). They are deliberately different shapes, because the
same record body is editable in one workflow step and frozen in the next, and the user
has to tell at a glance which is which.

| | Interactive | Static |
|---|---|---|
| Layout | Label above, control below | Label beside value, 200px gutter |
| Class | `.rfield` | `.rfield--locked` |
| Height | 40px control | 64px row (`--px-static-field-h`) |
| Affordance | `--px-field` grey fill, no border | No fill, no border; hairline rules between rows |
| Type | Label 13px, value 14px | Both 14px / 21px line-height |
| Label | Sentence case, no colon | Terminates in a colon (added via `::after`) |

```html
<!-- Interactive -->
<div class="rfield">
  <label class="rfield__label" for="title">Title <span class="req">*</span></label>
  <input class="rfield__control" id="title" type="text">
  <p class="rfield__hint">Shown in the record list.</p>
</div>

<!-- Side by side: a group stacks automatically once locked -->
<div class="rfield__group">
  <div class="rfield">…</div>
  <div class="rfield">…</div>
</div>

<!-- Static / frozen -->
<div class="rfield rfield--locked">
  <label class="rfield__label">Reported by</label>
  <input class="rfield__control" value="Marcus Silva" readonly>
</div>

<!-- Invalid. Set by your save/submit check only — never on load. -->
<div class="rfield rfield--invalid">…</div>

<!-- Validation summary -->
<div class="form-alert" role="alert">
  <span class="form-alert__icon"><i data-lucide="triangle-alert"></i></span>
  <div class="form-alert__body">
    <p class="form-alert__title">Three fields need attention</p>
    <p class="form-alert__detail">Complete them before submitting.</p>
    <ul class="form-alert__list">
      <li><button type="button">Title</button></li>
    </ul>
  </div>
</div>
```

Sub-components, all in `praxis-rfield.css`:

| Component | Class | Markup contract |
|---|---|---|
| Picklist | `.pillset` / `.pill` | `.pill` wraps a real `<input type="radio">` **followed by a `<span>`** — the styling hangs off `input:checked + span`. Not `<button aria-checked>`: that carried no state and no keyboard model while looking selectable. |
| Reference field | `.rref` | `.rref__input` + `.rref__btn` + `.rref__menu[hidden]` containing `.rref__opt` buttons. Options live in markup so each page configures its own list. Typing filters; only click or Enter commits; blur reverts uncommitted free text. Store the committed value in `data-committed` on the element, not a closure, so a value restored from storage survives the next blur. |
| In-record table | `.rtable` | `.rtable__actions` + `<table>`. White fill, not the field grey — a table of rows is content, and the grey read as one large input. `.rtable--locked` keeps rows, drops the controls. |
| Sub-section | `.subsec` | A titled run of fields inside a section. |
| Mazlan hand-off | `.mazbtn` | Quiet pill beside a section title. Uses `.mazlan-mark`, so link `praxis-mazlan.css` too. |

Four gotchas, each learned the hard way:

- **Zebra striping counts hidden rows.** `nth-of-type` counts every `<tr>`, including a
  hidden empty-state row, which made the first *real* row strike as even. Put the empty
  state in its **own `<tbody>`** so data rows count from one.
- **`background-color`, never the `background` shorthand,** on a select. Selects layer a
  chevron image on top and the shorthand wipes it.
- **Placeholders are content** and answer to WCAG 1.4.3 like any other text.
  `--praxis-color-text-disabled` measured 2.73:1 light / 2.77:1 dark on the field fill —
  a clear failure. Placeholders take `--praxis-color-text-secondary` (4.94:1 / 5.48:1);
  the weight drop to 500 is what separates a placeholder from a real value.
- **`[data-label-nocolon]`** opts a static label out of the automatic colon. Use it for
  labels that are already questions — "Was high energy present?**:**" is not an
  improvement.

Praxis also styles `.admin-field` read-outs, selected with `:has(> .admin-field__value)`
so generated pages needed no markup change. If you emit
`.admin-field > .admin-field__value`, you get the static-field treatment automatically.

#### App bar, nav rail, page header, toolbar

Covered in full by [the shell](#the-canonical-app-shell). Notes:

- `.appbar__logo-img--onlight` / `--ondark` swap by theme. Ship both files; give the
  hidden one `alt=""` so screen readers do not hear the brand twice.
- The nav rail's active item is a filled pink square (`--active`); Create is filled teal
  (`--create`). One `--active` per page.
- Every rail item needs `aria-label` or `title` — `praxis-navdrawer.js` reads it for the
  phone drawer label, and falls back to a nested `img[alt]`.

#### Nav drawer — free, from the rail

Include `praxis-navdrawer.js` and nothing else. Below 640px it hides the rail, puts a
hamburger in the app bar's left corner, and **derives the drawer from the live rail** —
it reads your rail's destinations and labels rather than duplicating markup, so a rail
change propagates automatically. It no-ops on pages with no rail. Create leads the list
as a filled action, so the drawer is self-sufficient on pages with no in-page Create
button.

#### Profile menu

You supply the trigger, the `.profile-menu__pop` element and — optionally — a
`.profile-menu__head` carrying your persona's name and role. `praxis-profile-menu.js`
renders everything else inside the pop: navigation, the theme switch, sign out, the
current-page marker, the version footer. It preserves your `.profile-menu__head`,
because the persona is yours, not chrome.

It writes `localStorage['gl-theme']` when the user toggles the theme. That is the key
your boot script reads — use a different one and you must persist it yourself.

You still wire open/close on the trigger yourself. The script deliberately does not
touch the trigger or the pop element, so each page keeps its own binding.

#### Buttons

The canonical primary is one definition for the whole application:

```html
<button class="tbtn tbtn--primary" type="button">Submit</button>   <!-- in a toolbar -->
<button class="btn btn--primary" type="button">Create</button>     <!-- elsewhere -->
<button class="pill-btn" type="button">Run</button>
```

40px tall, 18px padding, radius 10, `--px-primary-grad` fill, lit-edge shadow.
`.btn--primary`, `.tbtn--primary`, `.tbtn--run` and `.pill-btn` all resolve to it. In
dark mode, a primary **inside a toolbar** takes the softer teal chip instead of the bold
cyan, because a toolbar CTA sits among neutral tools and the bold treatment shouted
across the whole bar.

`.tbtn` is the secondary toolbar button: 40px, `--px-tool` fill, tool shadow. Variants
`.tbtn--icon` (40px square), `.tbtn--ghost` (flat).

**`.btn` has no base definition anywhere in Praxis.** `.btn--primary` gives you the fill
and the shadow, but you must supply your own `.btn` base — display, alignment, gap, font.
See [What Praxis does not define](#what-praxis-does-not-define).

Press feedback is automatic and free: buttons scale to .95 (small) or .97 (large) while
held, at specificity 0 via `:where()`, so any class rule of yours overrides it without
`!important`. Wrapped in `prefers-reduced-motion: no-preference`.

Hover is also handled: every control shifts its **background**, not just its glyph. An
icon-only change reads as a rendering artefact and disappears entirely for anyone not
looking straight at it.

#### Checkbox, switch, skip link, scrollbars

- **Checkbox** — styled globally under Praxis, no class needed. The unfilled box takes
  the card surface so it reads as part of the card; checked and indeterminate fill with
  ink and cut the mark out in the surface colour, so the pair inverts with the theme.
  Indeterminate needs an explicit dash because `appearance:none` removes the platform
  control entirely — without it an indeterminate box looked identical to an empty one.
- **Switch** — `.switch` wrapping `<input type="checkbox">` + `.track` + `.thumb`. Note
  the checkbox rules deliberately exclude `.switch`, whose input is a hidden full-size
  hit target.
- **Skip link** — `<a class="px-skip" href="#content">Skip to content</a>` as the first
  element in `<body>`. Off-screen until focused. Every Praxis page opens with an app bar
  and a rail, so a keyboard user traverses ~10 controls before reaching content
  (WCAG 2.4.1). Include it.
- **Scrollbars** — hidden until the scrolling element is hovered or focused within.
  Implemented with `scrollbar-color` only, the one property that does not change the
  gutter, so nothing reflows when the thumb appears. Do not add
  `::-webkit-scrollbar` or `scrollbar-width` rules — either switches those elements to
  classic scrollbars and permanently narrows your content.

### Settling — real and working, one or two consumers each

Class names here have not been pressure-tested by a second use. Expect renames.

#### Filters (`PraxisFilters`) — the largest component

403 rules, a 118KB engine. A centred filter modal, a quick-filter strip and an
active-filter chip bar, where **Standard and Custom are two views onto one expression
tree**. Rich fields live in the custom tree, quick and scope fields in a flat state; no
field is in both, so ANDing the two never double-filters.

```js
PraxisFilters.init({
  records:  RECORDS,                             // the unfiltered set
  fieldMap: { 'Status': r => r.status, … },       // filter name -> accessor
  today:    new Date(2026, 6, 8),                // "now" for relative date operators
  parseDate: str => ms,                          // optional, non-ISO date strings
  onChange: (filtered) => renderResults(filtered),
  // Replace the ported CAPA vocabularies with your own, or the menus offer values
  // your data has never heard of and every selection returns nothing:
  people: […], sites: […], tasks: […], statuses: […], priorities: […],
  actionTypes: […], tree: [{ name, children: [] }],
  options: { /* override outright, by field name */ },
  defaultFavorites: […],
  scopeChip: null,                               // omit entirely if you have no fixed scope
});
```

**The host owns rendering.** `onChange` receives the filtered records; the engine never
touches your results DOM.

Markup contract — four hooks, all data attributes:

```html
<button data-action="open-filter-drawer">Filters</button>
<div data-chips></div>                    <!-- active-filter chip bar -->
<div data-quick-filters></div>            <!-- quick-card host -->
<div data-drawer-scrim hidden></div>
<div data-filter-drawer class="filter-drawer" hidden>
  <div data-filter-list></div>            <!-- the engine renders rows in here -->
</div>
```

`init` returns `null` if `[data-filter-drawer]` is absent, so a page with no modal is
fine. It sets `data-filter-mode="modal"` on `<html>` itself if you have not — the
centred-modal rules are gated on that attribute.

**Three things to know before you commit to filters:**

1. **The drawer's full chrome is not shipped as markup.** The engine renders filter rows
   into `[data-filter-list]`, but the surrounding head, footer and resize handles came
   from the originating prototype's own page. The skeleton above is the minimum the
   engine needs; you will be assembling the rest yourself from `praxis-filters.css`.
2. **This sheet is a port** from the Responsive Search project, now owned here. Do not
   re-extract over it — that would reintroduce the parallel `--s`/`--r`/`--t` token
   vocabulary and silently revert the field treatment.
3. **Its dark mode does not follow a host theme override.** It themes itself by flipping
   palette primitives inside its own scope (21 declarations) instead of using the
   semantic tokens. Everything else in Praxis follows a host override; this does not.
   Known rough edge.

It also adds `.btn--neutral` and `.btn--clear`, scoped to `.filter-drawer` so they cannot
leak into your own button scale — and it expects **your** `.btn` base underneath them.

#### Quick-filter rail and compact toolbar

Two scripts, both self-wiring, both about narrow widths.

`praxis-toolbar-compact.js` collapses the toolbar the moment its contents would no
longer fit on one line — **measured, not at a fixed breakpoint**, because three toolbars
have different natural widths and any single px value is early for one page and late for
another. It sets `body.tb-is-compact`. It collapses to `[back] [Tools ▾] [Filters]
[Options] [▤]`, building the Options popover only when the page actually has sort or
display controls.

`praxis-quick-rail.js` turns the quick-filter strip into a scrolling row of pills, each
opening a popover anchored under it. It **moves** the existing `.qfilter` card out of
`[data-quick-filters]` rather than rebuilding it — `praxis-filters.js` binds every quick-card
interaction by delegation from `document`, so a moved card keeps working with no filter
logic duplicated. It watches the body class rather than a media query, so rail and
toolbar switch at exactly the same moment.

#### Create New menu and module selector

`praxis-create-new.js` is **pure catalog data, no behaviour** — `CREATE_CATALOG`,
`CN_INDEX`, `CN_SHORTCUTS`, `CN_TEMPLATES`. It exposes no globals and self-initialises
nothing. Render logic and wiring are yours.

The catalog is EHSQ record types grouped by solution, each group carrying a brand tone:
`.cn-group--{pink|teal|blue|orange|purple|green}`. Structure is
`.cn-flyout` → `.cn-head` / `.cn-controls` (`.cn-find`, `.cn-seg`) / `.cn-body` →
`.cn-group` → `.cn-grid` → `.cn-item`. Templates use `.cn-tpl-list` → `.cn-tpl`.
`.cn-flyout--wide` widens the grid.

`.msel` is the search-scope module picker, reusing the same catalog:
`.msel__input` + `.msel__caret` + `.msel__scrim` + `.msel__menu` → `.msel__groups`.
Selected items take `.cn-item.is-sel`.

#### Card, page texture, dot field

- **`.card`** gives you radius 12 and the layered slate shadow with a lit top edge —
  and, in dark mode, a `#192336` background. **In light mode it has no background.** Set
  `background: var(--px-surface)` and your own padding.
- **`.page`** is a standalone dot-grid surface, for a page that is not using the body
  texture.
- **`PraxisDotField`** (`praxis-dotfield.js`, 28KB) is an animated canvas dot field —
  `new PraxisDotField.Field(canvas, opts)`. Decorative; for hero and empty-state
  moments.

#### Breadcrumb back button

Include `praxis-breadcrumb-back.js` and your toolbar's back button starts working. It
walks the breadcrumb trail from nearest to furthest and takes the first ancestor that
resolves to a real, different page, terminating at the workspace. It exists because
naive `location.href = lastCrumb.href` left the button dead on the pages people used
most — six of twenty pointed their ancestors at `#`, and some named pages that did not
exist.

If your prototype's page filenames differ from the originating prototype's, the
label-to-page fallback will not resolve and the button lands on the workspace. Give your
breadcrumb ancestors real `href`s and it works properly.

### Unstable — page-scoped, expect reorganisation

#### The admin shell — read this even if you are not building admin

`praxis-admin.css` is named for the admin section but is the sheet that actually supplies
**the app shell every Praxis page needs**: `.app`, `.main`, `.content`, `.appbar`
positioning, the `.praxis-navrail` container, `--appbar-h` / `--navrail-w` /
`--adminnav-w`, plus `.tbtn`, `.switch`, `.icon`, `.px-pop` and
`*{box-sizing:border-box}`.

It is in the `praxis.css` bundle, so if you load the bundle you have all of it. If you
import piecemeal, **you need this sheet regardless of whether your page is admin.**
That is a naming problem, not a design one, and it is the single most likely reason a
piecemeal import looks broken.

Admin-specific parts: `.adminnav` (260px labelled side nav, hidden below 640px and folded
into the nav drawer), `.ss-row` settings rows, `.admin-table`, `--admin-row-selected`.
`praxis-admin-chrome.js` wires the admin app bar and side nav, and expects a set of
`ad-*` element ids.

The sheet also declares its own local `--appbar-h` / `--navrail-w` / `--adminnav-w` for
grid maths, duplicating the canonical `--praxis-appbar-h` and `--praxis-navrail-width`.
They agree today. Prefer the canonical names in your own CSS.

#### Mazlan (AI surfaces) — the one real blocker

`praxis-mazlan.css` is the largest sheet in Praxis (270 rules, 42KB) and covers the
conversational drawer, the menu, reasoning timeline, message bubbles, follow-ups and
content panel.

**You cannot use the drawer from the package alone.** `praxis-mazlan.js` requires a large
fixed-id DOM — `#mazlan-drawer`, `#mazlan-scrim`, `#mazlan-thread`, `#mazlan-welcome`,
`#mazlan-suggestions`, `#mazlan-drawer-textarea`, `#mazlan-primary-btn`,
`#mazlan-menu`, `#mazlan-more` and about a dozen more — and that markup is **not shipped
in this package**. The script queries the ids and returns silently when they are absent,
so the trigger will simply do nothing.

What you *can* use today:

- **`.mazlan-mark`** — the four-dot AI signature glyph. Works standalone, needs no JS,
  but it needs **four empty child spans** — they are the dots, positioned by
  `nth-child`, and an empty `.mazlan-mark` renders nothing:

  ```html
  <span class="mazlan-mark" aria-hidden="true">
    <span></span><span></span><span></span><span></span>
  </span>
  ```

  Dot colours are slate, magenta, cyan, teal, clockwise from top-left; the slate dot
  lightens in dark mode. `.mazlan-mark--sm` is 16px, `--xl` 40px, base 20px. Its base
  rules live in **`praxis-admin.css`**, not `praxis-mazlan.css` — another reason to
  load the bundle. Inside the drawer, `.mazlan-welcome__logo > span` adds a calm 3.2s
  breathing animation, amplitude deliberately held to 8% for a regulated-industry
  context, and switched off under `prefers-reduced-motion`.
- **`.mazbtn`** — the quiet section-level hand-off pill (from `praxis-rfield.css`).
- **The teal → magenta gradient** for agentic moments, gradient borders, insight bands.
- **`window.MAZLAN_CONFIG`** — `{ greeting, suggestions: [{icon, cat, text, reply,
  action}], scope }`, read lazily on each open, so you can refresh it on the trigger
  click. This only matters once you have the drawer markup.

The drawer is a prototype surface with canned replies, not an LLM integration. It
references no host globals directly; it uses `window.announce` when present and
optionally `window.openAgentic` / `window.closeDetailPanel`.

**If your prototype needs the Mazlan drawer, raise it** — the markup should be extracted
into the package rather than reinvented per prototype.

---

## What Praxis does not define

Verified absent from `src/` at 0.1.3. These class names appear in Praxis selectors — so
they look supported — but have **no base definition**. If you use one, you write it.

| Class | Status |
|---|---|
| `.btn` | No base. `.btn--primary` styles the fill only. `praxis-filters.css` says outright that its variants sit "on top of the host's `.btn` set". |
| `.section`, `.section__header`, `.section__title` | No base. Praxis only adds the teal tick, the flex `order` across the header, and the collapse rotation. Layout is yours. |
| `.chevron-btn` | No base. Positioned by the section-header rules only. |
| `.callout`, `.toggle`, `.viewswitch`, `.chip` | No base outside `praxis-filters.css`'s own scoped `.chip`. |
| `.px-menu`, `.px-menu__head` | **Not defined**, but referenced by `praxis-navrail.css` for the dashboards flyout. Use `.px-pop` (defined in `praxis-admin.css`) instead. |
| `.field` | Only the Praxis rule correcting `::before` alignment and raising rows to 64px. The base row is not here. |
| `--praxis-filters-gutter`, `--ph-pad-top`, `--muted` | Read but never defined. All fall back safely; set them to control that spacing. |
| `--px-phone` | Named in a comment as 640px; not defined as a token. The breakpoint is hard-coded in media queries. |

Also not in the package, by deliberate exclusion (reasons in `dist/manifest.json`): the
legacy chrome sheet, prototype-local filter overrides, the prototype's storage client,
its Create New routing, and its invented demo data.

---

## Before you call it done

Run this list. It is short because each item catches a failure that a green page load
does not.

- [ ] `data-variant="praxis"` and `data-theme` both on `<body>`.
- [ ] Theme bootstrap is the first thing inside `<body>`, not in `<head>`.
- [ ] **Toggled to dark and looked at it.** Most regressions are dark-only: a token with
      no dark treatment, a light-mode ink on a dark panel, white text on a cyan fill.
- [ ] Checked at 390px, 834px and full width. The toolbar collapse is measured, not
      breakpointed, so it can fire above 1024px.
- [ ] No uppercase text anywhere, and no `text-transform: uppercase`.
- [ ] No token redefined as `var()` of itself. Grep your own CSS for it — a cycle is
      invalid at computed-value time and resolves the token to `unset` everywhere in
      scope, silently.
- [ ] Every token you used is in [Tokens](#tokens). A `var()` naming something undefined
      renders as nothing, with no error.
- [ ] Comment and brace balance in any CSS you wrote. An unclosed `/*` swallows
      everything to the next `*/` and still returns HTTP 200.
- [ ] Placeholders on `--praxis-color-text-secondary`, not `text-disabled`.
- [ ] Every nav-rail item has `aria-label` or `title` — the phone drawer reads it.
- [ ] `.px-skip` present as the first element in `<body>`.
- [ ] Zebra-striped tables keep their empty state in its own `<tbody>`.

**Two claims never to make.** HTTP 200 proves nothing about rendering — both traps in
`CLAUDE.md` passed a green smoke test. And "matches the design system" is not
established by class names matching; it requires looking at the rendered page in both
themes.

---

## Corrections to `DESIGN-SYSTEM.md`

Measured against `src/` at 0.1.3. Trust this file over that one on these points:

- **`--praxis-type-weight-*`, `--praxis-type-leading-*` and `--praxis-type-tracking-*` do
  not exist.** §6 lists them. Nothing in `src/` defines any of the three. Use
  `font-weight` directly; body default is 600.
- **The space scale is nine steps, 4 to 48** — not `--praxis-space-0…96` as §6 says.
  There is no `space-0`, `space-64` or `space-96`.
- **The type scale has no numeric steps.** §6 gives `2xs…3xl` as 11/12/13/14/16/18/20/24/30
  px; the defined tokens are rem values and there is no `--praxis-type-size-18` style
  name.
- **`.px-menu` is described in §8 as the "shared frosted flyout material"** but is not
  defined in the package. `.px-pop` is.
- **Scope.** `DESIGN-SYSTEM.md` line 3 declares itself `scope: groom-lake prototype
  only`. Its component inventory, file map and patterns describe that prototype's pages
  — `index.html`, `search-page.html`, `record-page*.html`, `api/records.js`, Upstash
  Redis, `build-admin.py`. None of that exists in your prototype. Read it for design
  rationale, not for structure.
- **Its §10–§13 are an audit history** — dead-token counts, known bugs, a consolidation
  roadmap, "highest-value outstanding work". Notes to the maintainers. Do not treat them
  as instructions.
