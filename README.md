# Praxis

The design system for Ideagen EHSQ Enterprise: design tokens, application chrome
(app bar, nav rail, page header, toolbars) and the record-form field system, as
plain CSS and vanilla JavaScript.

No framework, no build step, no runtime dependency. Drop in a stylesheet and use
the classes. It works the same in a React app, a Vue app, a Rails view or a
static HTML file.

**Building a prototype, with or without an AI agent?** Start from
[PRAXIS-FOR-AGENTS.md](./PRAXIS-FOR-AGENTS.md) — the canonical app shell, the
markup each component expects, the full token list, and what Praxis leaves for
you to define. This README covers installing; that file covers building.

---

> ### Alpha — under active development
>
> Praxis is at `0.1.2` and is **not production-ready**. It is published early so
> the team can build against one shared copy, not because it is finished.
>
> - **Anything can change in any release.** Class names, token names, markup
>   structure and file layout are all still moving. Pre-1.0 releases will contain
>   breaking changes, and they will not always get a deprecation cycle.
> - **Coverage is uneven.** Some parts are in daily use across 27 pages; others
>   have exactly one consumer and have never been tested by a second use. See
>   [Stability](#stability) for the tier-by-tier breakdown, and the known rough
>   edges listed under it.
> - **No support commitment.** There is no release schedule, no LTS, and no
>   guarantee that an issue gets looked at.
> - **Pin the exact version** — `@0.1.2`, never `@0.1`, `^0.1.2` or `@latest`.
>
> If you need something you can rely on not moving underneath you, wait for 1.0.

---

## Install

```sh
npm install @ideagen-ax/praxis
```

```js
import '@ideagen-ax/praxis'            // everything: tokens + core + all components
```

Or over a CDN, with no install at all:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.2/dist/praxis.css">
```

Pin the exact version. `@0.1` or `@latest` will pick up breaking changes while
Praxis is pre-1.0.

## Starting a new project

A complete working page, with nothing else needed. Save it as `index.html` and
open it — no install, no build, no server.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My app</title>

  <!-- The bundle: tokens, materials, dark mode and every component. -->
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.2/dist/praxis.css">
</head>

<!-- Both attributes are required. data-variant is always "praxis". -->
<body data-variant="praxis" data-theme="light">

  <!-- Re-apply the saved theme before render, so it survives navigation
       without a flash of the wrong one. -->
  <script>
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

  <i data-lucide="triangle-alert"></i>

  <!-- Only needed if you use icons. Loads its own pinned copy of Lucide. -->
  <script src="https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@0.1.2/dist/praxis-lucide.js"></script>
</body>
</html>
```

### In a bundled app

Same three requirements — the stylesheet, the two `<body>` attributes, and the
icon script if you want icons.

```sh
npm install @ideagen-ax/praxis@0.1.2
```

```js
// Entry point, before your own styles so you can override them.
import '@ideagen-ax/praxis'
import '@ideagen-ax/praxis/dist/praxis-lucide.js'   // optional, icons only
```

Set the attributes on `<body>` in your host HTML template — in React, that means
`index.html`, not a component, because they must be present before first paint.

```html
<body data-variant="praxis" data-theme="light">
```

Then use the classes directly in your components. Praxis ships no framework
bindings, so there is nothing to wrap:

```jsx
<div className="rfield">
  <label className="rfield__label" htmlFor="ref">Reference</label>
  <input className="rfield__control" id="ref" />
</div>
```

### Checklist

If something looks wrong, it is almost always one of these:

1. `data-variant="praxis"` missing from `<body>` — nothing is styled at all.
2. `data-theme` missing — dark mode never engages.
3. `praxis-tokens.css` loaded after `praxis-core.css` when importing piecemeal.
4. Text renders in the wrong typeface — expected. [Supply your own
   Gilroy](#fonts--you-must-supply-your-own) or accept the Inter fallback.

## Use

Praxis needs two attributes on `<body>`: the variant (always `praxis`) and the
theme.

```html
<body data-variant="praxis" data-theme="light">
```

Set the theme **before first paint**, or the page flashes light before turning
dark. Because the attribute lives on `<body>`, the script has to run inline as
the first thing inside `<body>` — it cannot run from `<head>`, where `body` does
not exist yet:

```html
<body data-variant="praxis" data-theme="light">
<script>
  try {
    var t = localStorage.getItem('gl-theme');
    if (t) document.body.setAttribute('data-theme', t);
  } catch (e) {}
</script>
```

`gl-theme` is the `localStorage` key the shipped profile menu writes when the
user toggles the theme, so reading it here is what makes the choice persist
across navigation. Use a different key and you must write it yourself.

### Only the parts you want

```js
import '@ideagen-ax/praxis/tokens'                     // tokens only
import '@ideagen-ax/praxis/dist/praxis-core.css'       // + materials and dark mode
import '@ideagen-ax/praxis/dist/praxis-rfield.css'     // + the field system
```

`praxis-tokens.css` must load **before** `praxis-core.css`. Everything else can
load in any order.

`praxis-reset.css` is shipped but deliberately **not** in the bundle: it restyles
bare elements, so it would reach outside Praxis's own components and clobber a
host application's styles. Import it explicitly only if you want that.

### Icons

Components that show icons expect [Lucide](https://lucide.dev). `praxis-lucide.js`
converts icon markup at runtime and loads a bundled, version-pinned copy of Lucide
from beside itself — so over a CDN it works with no extra tags. To point it at your
own copy, set `window.PRAXIS_LUCIDE_SRC` before loading it.

### Fonts — you must supply your own

Praxis sets `font-family: 'Gilroy'` but ships **no font files**. Gilroy is
licensed and cannot be redistributed.

- **With a Gilroy licence:** copy `dist/praxis-fonts.example.css`, point the paths
  at your own hosted files, and load it before `praxis.css`.
- **Without one:** do nothing. The stack falls through to Inter and then the
  system UI font. Layout and metrics are unaffected; only the typeface changes.

## Stability

Praxis is extracted from a working prototype, and the parts of it have had very
different amounts of use. Treat these tiers as a guide to what is safe to build
on:

| Tier | What | Notes |
|---|---|---|
| **Stable** | `--praxis-*` tokens, `.rfield` field system, app bar, nav rail, page header | In daily use across 27 pages, and the token layer was consolidated to a single source in Aug 2026. Renames here will get a deprecation cycle. |
| **Settling** | Filters, Mazlan drawer, compact toolbar, quick-filter rail, create-new menu, module selector | Real and working, but each has one or two consumers, so the class names have not been pressure-tested by a second use. |
| **Unstable** | `praxis-admin.css`, `praxis-workspace.css` | Page-scoped layout for specific screens rather than general components. Expect these to be reorganised or split. |

Known rough edges, stated plainly rather than discovered later:

- **The filters sheet themes itself by flipping palette primitives** inside its
  own scope (21 declarations) instead of using the semantic tokens. It works, but
  it means the filter drawer's dark mode does not follow a host theme override the
  way everything else does.
- **`praxis-admin.css` declares its own local `--appbar-h` / `--navrail-w` /
  `--adminnav-w`** for its grid maths, which shadow nothing but duplicate the
  canonical `--praxis-appbar-h`.
- **Two host-supplied layout knobs** are read but never defined here:
  `--praxis-filters-gutter` and `--ph-pad-top`. Both fall back safely; set them if
  you want to control that spacing.
- **No canonical type scale is applied consistently yet.** The
  `--praxis-type-size-*` tokens exist, but plenty of component CSS still carries
  literal `rem` values.

## What is not in this package

Deliberate exclusions, also listed with reasons in `dist/manifest.json`:

- `praxis-chrome-legacy.css` — legacy chrome with one remaining consumer, retiring with it
- `praxis-filters-local.css` — prototype-local overrides
- `praxis-records.js` — a storage client bound to the prototype's own API
- `praxis-create-new-nav.js` — routes to the prototype's page filenames
- `praxis-admin-data.js`, `praxis-admin-users.js` — invented demo data

## Developing

`src/` is the source of truth. `dist/` is **generated** and gitignored, so there
is no second copy of Praxis to keep in step — edit the sheet in `src/` and
rebuild.

```sh
npm run build     # regenerate dist/ from src/, and verify the output
npm run check     # exit non-zero if your local dist/ is stale
npm run docs      # regenerate the measured sections of DESIGN-SYSTEM.md
```

Praxis was extracted from the [groom-lake](https://github.com/ideagen-ehsqe/groom-lake)
prototype on 2026-08-13, with history. That prototype is now a consumer of the
published package like any other — six prototype-bound files stayed behind and
are listed with reasons in `dist/manifest.json`.

`build-ds.py` measures `src/` alone by default, which cannot see how much of the
system is actually used. Point it at a consumer to fold real usage back in:

```sh
python3 build-ds.py --consumer ../groom-lake/prototype
```

The difference is large enough to matter — 206 tokens and 66% tokenization
measured alone, against 299 and 83% once the prototype's own pages are counted.
The generated tables say which mode produced them.

The build strips the licensed `@font-face` blocks, pins the Lucide fallback, and
then verifies its own output: no legacy `--ehsq-*` tokens, no font binaries, no
relative paths that would 404 from a CDN, and no `var()` in the bundle that the
bundle cannot resolve.

## Licence

MIT — see [LICENSE](./LICENSE). Anyone may use, modify and redistribute the
package, including commercially, provided the copyright notice is kept.

This covers the Praxis source only. The Gilroy `@font-face` blocks are stripped
from `dist/` precisely because those fonts are separately licensed and are *not*
granted by this licence — see *Fonts* above.
