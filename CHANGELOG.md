# Changelog

## 0.1.9 — 2026-08-21

**Four things the prototype had four copies of.** A toolbar menu, a panel icon
button, a filter field and a toast — each one duplicated across consumer pages,
in versions that had drifted apart. Nothing here changes an existing Praxis
component; it adds the four that were missing, which is why they kept being
written locally.

### Added

- **`.tb-menu` / `.tb-dropdown` — the toolbar menu** (new sheet,
  `praxis-controls.css`). A
  `.tbtn` that opens a panel under itself: Group, sort and column menus, row
  actions, a layout picker. Twelve pages in the prototype carried a copy in
  three incompatible versions — 12px radius and no border in one, 36px items and
  a hairline in another, `__divider` here and `__sep` there.

  This one closes a real gap rather than merely deduplicating: both
  `praxis-toolbar-compact.css` and `praxis-toolbar-compact.js` already keyed off
  `.tb-menu`, so Praxis was reading a class it never defined. Surface follows
  `.px-pop` exactly, so a menu opened from the toolbar and one opened from the
  nav rail are the same object. Both separator names are kept as an alias —
  cheaper than renaming a hairline in seven files.

  Members: `__item`, `__item--danger`, `__sub`, `__sec`, `__divider` / `__sep`,
  `__empty`, and `--right` for a trigger at the end of the band. Styling only:
  opening, closing, focus and Escape are the consumer's.

- **`.iconbtn` — the 34px panel icon button** (`praxis-controls.css`). Expand all,
  pin, a filter toggle, a collapse chevron: the square that sits in a card
  header rather than in the page toolbar band. Not `.tbtn--icon`, which is 40px
  and belongs beside a labelled toolbar button — the two have never been the
  same size on any screen carrying both. `.iconbtn--on` is the pressed state, in
  the app's pink selection accent.

- **`.filterfield` — type-to-filter beside a list** (`praxis-controls.css`).
  Trailing glyph, because the field refines the list under it rather than
  starting a search; the leading-glyph forms are the app bar and `.cn-find`.
  Sized to `.iconbtn` so a header row of both lines up.

- **`praxis-toast.js` — the transient confirmation.** `praxisToast('Saved')`,
  with `tone` and `duration` options, stacking, and a `role="status"` live
  region created at load rather than with the first message — creating a region
  and its text in the same frame is the reliable way to have the announcement
  dropped, which is what three of the four copies did. Styles itself, on the
  `praxis-lucide.js` argument: a component with no markup until it fires cannot
  be allowed to half-install.

- **`praxis-controls.css`** is the new sheet the three CSS components live in.
  `praxis-admin.css` is where `.tbtn` is and would have been the obvious home,
  but it is the largest sheet in the system and carries the application shell,
  a bare-element reset and its own `.tbtn` — eight of the twelve pages carrying
  a local `.tb-dropdown` do not load it, and adding it to pick up a dropdown
  would restyle their whole toolbar. Consumers of the `praxis.css` barrel get
  it either way.

### Changed

- **`.iconbtn` and `.filterfield` are 8px, not the copies' 9px.**
  `--praxis-radius-sm`. A one-pixel difference, and a design system should not
  ship a value off its own scale to preserve it.

- Consumers adopting `.tb-dropdown` in place of a local copy get **36px minimum
  item height** and a focus ring. The four-page group that used 9px vertical
  padding and no ring will see rows a few pixels taller.

### Docs

Two new pages — **Toolbar menu** and **Toast** — and `.iconbtn` / `.filterfield`
join Buttons and Form controls. 31 pages, still at 100% class-family coverage.

## 0.1.8 — 2026-08-20

**Reverts the filter-panel control borders from 0.1.6 and 0.1.7.** A design
decision, taken with the contrast cost understood and accepted.

### Reverted

- **`praxis-filters.css` and `praxis-toolbar-compact.css` return to their 0.1.5
  state**, byte for byte. Nine control boundaries go back under the 1.4.11 3:1
  floor — `neutral-20` at 1.57:1 for `.segmented`, `.filter-type-buttons`,
  `.filter-select`/`.filter-date`, `.filter-search input`, `.filter-view-switch`;
  `neutral-30` at 2.01:1 for `.qfilter__check`, `.select-menu__check`,
  `.cf-group__add button`; and `border-default` at 1.26:1 for
  `.tb-options__search input`.

  **Why.** The app's search pill is drawn with a `rgba(16,36,58,.08)` shadow ring
  rather than a border, so it was never in scope and never moved. Raising the
  filter panel to 3:1 while the pill stayed put made the two read as different
  systems sitting side by side, and the panel is the more visible of the pair.
  Weighed against that, a conformant filter panel that looks broken next to the
  app's primary control was judged the worse outcome.

  The fill cannot rescue this: `--px-surface-2` measures **1.08:1** against
  `--px-surface` in light and 1.12:1 in dark, so the border is the only thing
  identifying these controls and 1.4.11 lands entirely on it. Reaching 3:1 by
  fill alone needs roughly `#767b80`, which is not a light theme. There is no
  version of this that is both conformant and visually unchanged — that is the
  actual trade, and it was made deliberately.

  **The real fix is a design change, not a token change.** Moving these controls
  to a treatment that carries contrast on one edge — a filled field with a 3:1
  underline — would conform without the four-sided weight, but it has to happen
  to the search pill and the filter panel together or the mismatch simply moves.

### Kept

Everything outside the filter panel stands: `--praxis-color-border-strong` at
`neutral-50` (3.84:1), `--praxis-color-status-warning` at `orange-70`, and
`--praxis-tone-warning-fg` at `orange-90`. `border-strong` still serves
`.sm-opt__box`, `.save-field__input` and `--px-check-stroke` in consuming apps,
none of which were part of the objection.

## 0.1.7 — 2026-08-20

**One line of CSS, for a reason worth writing down.** 0.1.6 raised the filter
checkboxes' border from 2.01:1 to 3.84:1 and left the thickness at 2px. Contrast
and thickness multiply, so the visible weight nearly doubled and the controls read
as heavy — reported from review, not from a measurement.

### Fixed

- **`.qfilter__check` and `.select-menu__check` drop 2px → 1.5px.** They were the
  only checkboxes in the system at 2px; `.sm-opt__box`, the 18px box used across
  the record pages, has always been 1.5px. So this is the house convention being
  applied, not a contrast trade-off — the border still measures 3.84:1 on
  `surface-default` and 3.55:1 on `surface-subtle`, unchanged from 0.1.6.

  Worth stating the general rule, because 0.1.6 got it wrong: raising a border's
  contrast to clear 1.4.11 raises its visible weight by the same factor. If the
  stroke was already thicker than it needed to be, the fix lands twice. Check the
  thickness at the same time as the colour.

## 0.1.6 — 2026-08-20

**`src/` changed.** Three colour tokens move and nine control borders darken, all of
it WCAG 1.4.11 (non-text contrast). Light mode only — every dark value is unchanged.

**What a consumer will notice.** Checkbox boxes, segmented controls, select/date
triggers and search inputs get a visibly darker outline; warning icons and warning
state-borders go one step deeper in the orange ramp; warning text on a warning chip
darkens a lot. Nothing moves in dark.

### Fixed

- **`--praxis-color-border-strong` was 2.95:1 on white** — a rounding error short of
  the 3:1 floor for a UI-component boundary. It is the control-boundary token
  (checkbox boxes, input underlines, `--px-check-stroke`), so the floor applies.
  Repointed from `neutral-40` to `neutral-50`: 3.84:1 on `surface-default`, 3.36:1 on
  `surface-subtle`, 4.09:1 on the dark card, so it needs no dark remap of its own.

  Repointed rather than editing the `neutral-40` rung, because
  `--praxis-color-text-disabled` resolves to that same rung and must not move with it.
  It is still `#8898a9`.

- **Nine control boundaries reached past the token to a palette rung**, and every one
  landed under 3:1 — `neutral-20` at 1.57:1 or `neutral-30` at 2.01:1. On an unchecked
  `.qfilter__check` or `.select-menu__check` the border *is* the control, so a 2.01:1
  box is the whole affordance failing. All nine now use `--praxis-color-border-strong`:
  `.segmented`, `.qfilter__check`, `.select-menu__check`, `.filter-type-buttons`,
  `.filter-select` / `.filter-date`, `.filter-search input`, `.filter-view-switch`,
  `.cf-group__add button`, and `.tb-options__search input`.

  `.filter-select:hover` moved to `neutral-60`, because its old `neutral-30` hover was
  now *lighter* than the resting border and the state read backwards.

- **`--praxis-color-status-warning` was 2.69:1 on white.** This token draws icons,
  dots and 2px state borders, all of which owe 3:1, so `orange-60` failed at its own
  job. Now `orange-70` — 3.64:1 on `surface-default`, 3.18:1 on `surface-subtle`, and
  still legibly orange. Dark is untouched at `#ffa32e`.

- **`--praxis-tone-warning-fg` was 3.30:1 on its own chip.** The `tone-*-fg` family is
  the text tier and the other four sit near 5:1 on their backgrounds, but orange at the
  `-70` rung is simply too light to get there. Now `orange-90`, 6.28:1 on
  `--praxis-tone-warning-bg`. That matches the rule an earlier consumer-side audit
  already landed on — use the `-90` step for text on a `-10` tint.

  Note the division of labour: `--praxis-color-status-warning` for the graphical layer,
  `--praxis-tone-warning-fg` for text. Using the status ink as a text colour on a chip
  is what failed, and it still will.

### Added

- **`redirect_from:` in content metadata**, and a stub at
  `/foundations/colour.html` pointing at `/foundations/color.html` — that URL 404'd
  from the 0.1.5 rename. Pages serves static files only, so the stub does what a 301
  would: `meta refresh` for the no-JavaScript case, `location.replace` because it
  fires sooner and adds no history entry so Back behaves, a visible link if both are
  blocked, and `noindex` with a canonical tag so the stub stays out of search results
  while the real page keeps any ranking. The build fails if an old path collides with
  a real page.

## 0.1.5 — 2026-08-18

**`src/` changed, and dark mode changed with it.** Ten fixes: six colour tokens, the
toggle switch, disabled buttons, the Create New catalog's reachability, and a usage
comment that told you to do the wrong thing. Every one was found by the reference site
this release also adds — several of them within minutes of a page first rendering.

**What a consumer will notice.** A page that looks right in light and uses
`--praxis-color-interactive-active`, `border-subtle`, `surface-muted`, `status-info`,
`status-danger` or `interactive-hover` **will render differently in dark**, because
those six were wrong there. Nothing changes in light. Toggle to dark and look before
you upgrade.

### Fixed

- **Four tokens had a dark value that could never apply.** Each was declared on
  `:root` as `var(--rung)` while the rung's dark remap was declared on `body`.
  Custom-property substitution happens at the element where the *declaration* lives,
  so each was computed on `:root` against the light rung and `body` inherited that.

  | Token | Was, in dark | Now |
  |---|---|---|
  | `--praxis-color-interactive-active` | `#135d63` — a light-mode ink | `#5CE0E5` |
  | `--praxis-color-border-subtle` | `#edf0f2` | `#222b39` |
  | `--praxis-color-surface-muted` | `#edf0f2` | `#222b39` |
  | `--praxis-color-status-info` | `#4766eb` | `#7a93e0` |

  `interactive-active` is the one that mattered: in dark, a control's resting state
  was bright cyan `#29D2D7` and its pressed state resolved to a dark `#135d63`, so
  pressing it made it go *darker*. `--praxis-color-surface-subtle` aliases the same
  `neutral-10` and never had the bug, because it was always given its own dark value
  rather than relying on the alias to carry the theme — that is the pattern.

  `praxis_meta.frozen_aliases()` detects this class structurally and is now a build
  gate at zero. It is deliberately not derived from resolved values: a resolver asked
  for the dark value substitutes the dark rung and reports a difference the browser
  never produces, which is why this went unseen.

- **`--praxis-color-interactive-hover` restated for dark** (`#42D9DE`), which is a
  deliberate widening of the fix. It was not frozen — it aliases `teal-70`, which has
  no dark treatment — but fixing `active` alone would have produced a triad that goes
  bright, then dark, then bright. The progression now mirrors light in *direction*:
  each interaction step increases contrast against the ink on the fill. Measured with
  `--px-primary-fg`: light `#fff` 4.50 → 5.88 → 7.57; dark `#08313a` 7.48 → 8.08 →
  8.77. `#42D9DE` is the one invented value, the midpoint of the two it sits between.

- **`--praxis-color-status-danger` failed contrast on dark.** At `#e22d38` it measured
  **3.50:1** on the dark card against the 4.5:1 WCAG 1.4.3 asks of text, while
  success, warning and info sat at 7.88, 7.89 and 5.30 — it was the only status ink
  with no dark value. Now `red-40` (`#ed7b82`), an existing rung, at 5.81:1.

- **The toggle switch had two markup forms and only one was styled.**
  `praxis-admin.css` defines `.switch` as a wrapper containing `.track` and `.thumb`;
  `praxis-filters.css` reads `.switch:checked`, which only matches with the class on
  the input — and `praxis-filters.js` emits that second form plus `.switch__track`
  and `.switch__thumb`, **neither of which any stylesheet defined**. `class="switch"`
  on the input also excludes it from the Praxis checkbox rules, so the filter
  drawer's On/Off row rendered as a bare browser checkbox between two labels.

  Both forms are now defined from one set of values and render identically —
  verified at 34×20 with `neutral-30` unchecked and `teal-60` checked in all four
  permutations. The **wrapper form is canonical**, because `praxis-core.css` is
  already committed to it: its checkbox exclusion is
  `:not(.switch):not(.switch *)`, and that second clause only means anything if
  `.switch` can have descendants. The sibling form was kept working rather than
  removed because `praxis-filters.css` and its script agree with each other, and
  rewriting either would mean touching JavaScript to fix something CSS could close.
  `.switch__track` / `.switch__thumb` are the canonical part names; `.track` /
  `.thumb` still work and are kept for consumers, but they are about as
  collision-prone as class names get in a shared sheet.

- **Disabled buttons had no appearance.** `praxis-core.css` excludes `:disabled` and
  `[aria-disabled="true"]` from the hover wash and the press transform, so a disabled
  button stopped responding while looking identical to an enabled one at rest.
  `.tbtn` and `.admin-ghostbtn` now take `opacity:.45`, `cursor:not-allowed` and no
  shadow on both. Opacity rather than a flat grey, because it has to work on
  `.tbtn--primary`'s gradient. The other eight named button classes still have no
  base at all, so their disabled state remains yours.

- **`praxis-create-new.js` was unreachable under a bundler.** It declared
  `CREATE_CATALOG` and `CN_TEMPLATES` with top-level `const` and never assigned them,
  which in a classic script creates a global *lexical* binding — readable as a bare
  identifier from another classic script, but not a property of `window`, so
  `if (window.CREATE_CATALOG)` always failed. And because `package.json` declares
  `"type": "module"` with no `export` anywhere in the package, importing the file
  through a bundler made both arrays module-scoped and invisible, with no error:
  `import '@ideagen-ax/praxis/dist/praxis-create-new.js'` was a silent no-op. Both are
  now on `window`; the bare identifiers still work.

- **`praxis-dotfield.js` rendered nothing if you followed its own usage comment,**
  which showed `create` → `setMode` → `setParam` and never mentioned `start()`, which
  the loop requires. The comment now includes it, plus `restart()`, `destroy()` and
  the fact that the dots are drawn white and need a dark backdrop.

### Added

Nothing below here changed CSS or JS. It is the reference site and the machinery
behind it — which is what found every fix above.

- **A reference website, at <https://ideagen-ax.github.io/praxis/>.** Every token
  viewable in both themes, and a page per component with live examples. Deployed
  from `main` only by `.github/workflows/pages.yml`; branches and pull requests get
  no public URL, only the `build-site.py --check` gate in CI.

  Two properties make it trustworthy rather than decorative. It renders the real
  `dist/`, built from `src/` at deploy time, so there is no second copy of Praxis
  to keep in step. And each example's live frame and source panel come from the
  same `<template>`, so they cannot disagree — the failure mode of every
  hand-maintained gallery.

  Resolved token values are read in the browser off two hidden probe documents,
  one per theme, rather than computed by the build. A build can only report what a
  token is *declared* as, and this is a system where that is regularly the wrong
  answer.

- **`build-site.py`** — the generator, plus `--serve` (rebuild on each request),
  `--check` (the CI gate), `--coverage` (undocumented class families) and
  `--agents-doc` (render the content to markdown). Stdlib-only, like the other two
  build scripts.

- **`site/content/`** — the prose, one HTML file per page. This is now the source
  for component documentation. `PRAXIS-FOR-AGENTS.md` stays hand-written and keeps
  shipping in the tarball until the site covers every component, at which point it
  becomes generated from the same content.

- **`praxis_meta.py`** — one measurement implementation, shared by `build-ds.py`
  and `build-site.py`, so the site and `DESIGN-SYSTEM.md` cannot state different
  numbers. It also gained cycle detection over `var()` chains, and extraction of
  the `--px-*` material layer and the nine `--praxis-*` tokens that
  `praxis-core.css` overrides under the Praxis variant.

- **Color blocks that draw rather than tabulate.** The full palette as one grid
  (hues down, rungs across, light over dark in each cell, so which rungs the dark
  theme remaps is visible at a glance); each hue as a continuous ramp with its rung
  and hex on every step and the label ink flipping where the rung crosses over; and
  the semantic layer drawn by role — inks as text, borders as a hairline, fills as a
  control — in both themes, each sample on the surface its own theme provides.

- **Every remaining component page — the site now documents all 234 class families
  in `src/`.** Twelve new pages: buttons, form controls, nav drawer and rail flyouts,
  card/page/texture, Create New, module selector, quick-filter rail, compact toolbar,
  workspace chrome, breadcrumb back button, the admin shell, and the page-family and
  part-only names in core. Plus two new foundation pages — naming and state
  conventions, and the corrections to `DESIGN-SYSTEM.md` — and depth on filters
  (the custom-filter expression tree) and Mazlan (the drawer inventory).

- **`PRAXIS-FOR-AGENTS.md` is now generated** from `site/content/`, and grew from 918
  hand-written lines to 3,799. It still ships in the tarball; `site:check` fails if the
  committed file is stale.

- **Class-family coverage is a gate, not advisory.** It went from 15% to 100% while
  those pages were written. It also now checks whether a page *claims* a family in its
  `classes:` metadata rather than whether the string appears anywhere in a content file
  — the looser test counted `.card` as documented because seven pages mentioned it in
  prose while it had no page and no example. Counts are distinct rather than per sheet;
  the old report said 197 where 177 families were real.

- **`praxis_meta.frozen_aliases()`**, which finds tokens whose dark value can never
  apply: declared on `:root` as `var(--rung)` while the rung's dark remap lands on
  `body`. Four tokens are in that state. Detected structurally, because asking a
  resolver would report a difference the browser does not produce. Advisory in the
  build output, not a gate, since it is a defect in `src/` rather than in the site.
  **Now a gate**, at zero, since the four it found are fixed in this release.

### Fixed — measurement

- **The class-family measurement counted `url()` paths and quoted strings.** A
  scan for `.name` read `url(fonts/Gilroy-Regular.woff2)` as a class called
  `.woff2` and an SVG namespace as `.w3` and `.org`, on top of the `.css` in prose
  that comment-stripping already had to handle. This inflated the apparent surface
  of the system from 234 real class families to about 370, and it showed in the
  component inventory in `DESIGN-SYSTEM.md`, where `praxis-reset.css` and
  `praxis-tokens.css` appeared to define classes they do not.

- **The filter drawer's On/Off toggle renders as a bare browser checkbox.**
  `praxis-admin.css` defines `.switch` as a wrapper containing `.track` and `.thumb`;
  `praxis-filters.css` reads `.switch:checked`, which only matches with `.switch` on the
  input — and `praxis-filters.js` emits that second form, plus `.switch__track` and
  `.switch__thumb`, neither of which is defined in any stylesheet. `class="switch"` on
  the input also excludes it from the Praxis checkbox rules, so nothing styles it at
  all. Documented on the form-controls page with both forms side by side; the fix
  belongs in `src/`.

- **`praxis-create-new.js` is unreachable under a bundler.** It declares
  `CREATE_CATALOG` and `CN_TEMPLATES` as top-level `const` and never assigns them to
  `window`, so they are global lexical bindings that another classic `<script>` can read
  but `window.CREATE_CATALOG` cannot. `package.json` declares `"type": "module"` and no
  shipped script has an `export`, so importing that file makes both arrays module-scoped
  and invisible, with no error.

- **`praxis-dotfield.js` renders nothing if you follow its own usage comment.** The
  comment shows `create` → `setMode` → `setParam` and never mentions `start()`, which
  the loop requires. The dots are also drawn white, so it needs a dark backdrop.

- **`.mazlan-mark--xl` is documented in `PRAXIS-FOR-AGENTS.md` as 40px and does not
  exist.** It appears only inside a comment in `praxis-mazlan.css` describing one
  consumer's own page, so using it silently gets the 20px base. The live example on
  the Mazlan page is what caught it.

- **`DESIGN-SYSTEM.md` was one `var()` usage stale** — 1,501 against a real 1,502,
  from the 0.1.4 profile-menu fix landing without `npm run docs` being re-run.

## 0.1.4 — 2026-08-14

### Fixed

- **The profile menu scrolls instead of running off the bottom of the window.**
  `.profile-menu__pop` had no height limit, and its contents are set by the page
  rather than by the component: admin pages add six "Switch to" links, the
  record pages add the Appearance row, the workspace adds "Viewing as". On a
  laptop viewport the tallest of those extended past the bottom edge, so Sign
  out — the last row — could not be reached at all. The panel is now capped at
  the room below the app bar, `calc(100vh - var(--praxis-appbar-h) - 24px)`,
  and scrolls its overflow, matching the cap `.cn-flyout` already used.

  It scrolls the panel itself rather than an inner body, as the module selector
  does, because there is no sticky header in this menu to hold in place.
  `overscroll-behavior:contain` keeps a flick past the last row from scrolling
  the page underneath.

## 0.1.3 — 2026-08-13

**No CSS or JS changed.** `src/` is byte-identical to 0.1.2, so nothing renders
differently — `dist/` differs only in its version stamp. This release exists to
put a build guide in the tarball and to make publishing reproducible.

### Added

- **`PRAXIS-FOR-AGENTS.md`, and it now ships in the package.** The doc a
  teammate — or their coding agent — reads to build a prototype: the canonical
  app shell as literal markup, per-component markup contracts, the measured
  token list, and the classes Praxis references but never defines. It was
  missing from `files`, so installing from npm rather than cloning got you the
  README and nothing else.

  Three things it records that were not written down anywhere:
  `praxis-admin.css` owns the app shell every page needs (`.app`, `.main`,
  `.content`, app-bar positioning, the rail container, `.tbtn`, `.switch`,
  `.mazlan-mark`, `box-sizing`) despite its name; `.btn` has **no base
  definition** in the package, only `.btn--primary`; and the Mazlan drawer
  cannot be used at all from the package, because `praxis-mazlan.js` needs
  ~20 fixed element ids whose markup is not shipped and it no-ops silently
  without them.

- **Automated publishing.** A `v*` tag now builds, verifies and publishes via
  npm trusted publishing — OIDC, no token, provenance attached. Previously
  impossible from CI: the npm account uses a passkey, so a non-TTY publish died
  with `EOTP`.

- **CI on every pull request**, running the build's own verification — no font
  binary in the package, no surviving `--ehsq-*` token, no CDN-breaking relative
  path, no unresolvable `var()` in the barrel.

### Fixed

- **The README pinned `0.1.0` while the package was `0.1.2`**, so anyone
  copying the quickstart's CDN URLs got a two-versions-stale build. The CI job
  now warns when the two disagree.

- **`npm run check` was documented as the CI gate** in both the README and
  `CLAUDE.md`. It cannot be: it compares a rebuild against the `dist/` on disk,
  and `dist/` is gitignored, so in any fresh clone it exits 1 with `dist/ is
  missing`. It is a local staleness check. CI runs `npm run build`, which
  performs the same verification.

## 0.1.2 — 2026-08-13

The first release with new material in it. Extracting Praxis made visible how
much of the system the consuming prototype was still carrying itself: 88 custom
properties defined in page `<head>`s. Most were aliases for tokens that already
existed here. These were not.

### Added

- **Motion**: `--praxis-motion-slowest` (420ms), the one step of a competing
  page-level scale that had no equivalent in `--praxis-motion-*`.
- **Easing**: `--praxis-ease-spring-out`, `--praxis-ease-spring-bouncy`. The
  spring family was two-thirds present; pages supplied the rest.
- **Quick-rail motion**: `--praxis-rail-duration`, `--praxis-rail-ease`,
  `--praxis-rail-travel`. Seven pages defined these identically.
- **Menu motion**: `--praxis-menu-duration`, `--praxis-menu-ease`.
- **Glass material**: nine `--praxis-glass-*` tokens, light and dark. A frosted
  translucent surface three pages each had a slightly different recipe for.
- **Status tones**: ten `--praxis-tone-{neutral,info,success,warning,danger}-{bg,fg}`
  pairs, light and dark.
- **Layout**: `--praxis-record-rail-w` (300px) and `--praxis-control-h` (32px),
  each identical everywhere it appeared.

### Fixed

- **The teal scale had no dark treatment.** `--praxis-color-teal-80` is a
  light-mode ink and measured 1.55:1 on a dark panel — illegible — while
  teal-10/20 are near-white and glared as light blocks. Four pages were each
  patching this locally. Now remapped in the dark theme, alongside the status
  inks. **This changes dark rendering anywhere teal-10/20/80 is used**, which is
  the point: those surfaces were displaying the bug.
- **The token-counting regex matched BEM modifiers.** Unanchored, it read
  `.chip--danger:hover{…}` as a token named `--danger`. This overstated every
  published count (206 against 195 real) and, more seriously, let phantom
  definitions mask genuinely undefined tokens in the build's own verification.

### Changed

- `--praxis-duration-fast/base/slow`, added earlier the same day, are **removed**
  before anyone could depend on them. They were a third motion scale introduced
  on a misreading: `--praxis-motion-drawer:280ms` is a single drawer value, not
  evidence of a 180/280/420 scale. The canonical scale is `--praxis-motion-*` at
  120/180/260, already referenced 213 times.

## 0.1.1 — 2026-08-13

Praxis now lives in its own repository, `Ideagen-AX/praxis`, and `src/` is the
source of truth. It was extracted from the groom-lake prototype with history —
174 of that repo's 334 commits touched these files — and the sheets are
byte-identical to the ones 0.1.0 shipped.

**No functional change.** The built output differs from 0.1.0 only in two
provenance strings that name the new source, plus the version-pinned Lucide
fallback URL. Nothing a consumer renders changes. This release exists to prove
the pipeline publishes from the new home before anything depends on it.

Six files stayed with the prototype because they are bound to that application
rather than to the design system; `dist/manifest.json` lists them with reasons.

## 0.1.0 — 2026-08-13

First packaged release. Praxis has existed in the prototype for months; this is
the first time it is consumable from outside it.

### Packaging

- `dist/praxis.css` bundles the foundation and all 13 component sheets in cascade
  order. Individual sheets ship alongside it for selective import, with subpath
  exports for the common entry points.
- `dist/` is generated by `build-package.py` from `prototype/`, which stays the
  single source of truth. Nothing is hand-copied, and the build verifies its own
  output before it can be published.
- The licensed Gilroy `@font-face` blocks are stripped on the way out and replaced
  by `praxis-fonts.example.css`. No font binary ships in this package.
- Lucide is bundled and version-pinned. `praxis-lucide.js` previously fell back to
  `unpkg.com/lucide@latest`, an unpinned dependency that could change under
  consumers without warning.
- `praxis-reset.css` ships but is excluded from the bundle, so Praxis cannot
  restyle a host application's bare elements unless asked to.

### Fixed while packaging

Building the package surfaced defects that were invisible inside the prototype,
because two page `<head>`s happened to supply what the shared sheets were missing.

- **The Mazlan drawer had no transition on any page but one.** Its opacity and
  transform transitions referenced `--dur-base`, `--ease-spring` and
  `--ease-spring-soft` with no fallback, and those three were defined only in
  `contextual-awareness.html`. Everywhere else the declarations were invalid at
  computed-value time, so the drawer snapped instead of sliding. The values are
  now canonical tokens (`--praxis-motion-drawer`, `--praxis-ease-spring`,
  `--praxis-ease-spring-soft`).
- **33 alias-token references across seven shared sheets** pointed at a
  `--t-*` / `--s-*` / `--d-*` / `--dur-*` / `--ease-*` / `--color-*` vocabulary
  defined only in page `<head>`s. On the other 23 pages they silently resolved to
  their hard-coded fallbacks. All now use canonical `--praxis-*` tokens; every
  substitution was checked to equal the fallback it replaced, in both themes.
- **`--appbar-height` was canonicalised to `--praxis-appbar-h`.** Three shared
  sheets read it while only two pages and the legacy sheet defined it.
- `--t-sm`'s fallback was `.875rem`, which is `--praxis-type-size-base`, not
  `--praxis-type-size-sm` (`.8125rem`). Mapping by name rather than by value would
  have quietly changed that text size.

### Known limitations

See *Stability* and *Known rough edges* in the README: the filters sheet themes by
flipping palette primitives, `praxis-admin.css` duplicates chrome geometry
locally, and two host-supplied layout knobs are read but not defined here.

### Publication

Published to npmjs.com as `@ideagen-ax/praxis` under MIT, public access.

The scope is the design team's own (`ideagen-ax`), not the company-wide
`ideagen` — which is already taken on npm — and it matches the existing
`Ideagen-AX` GitHub org. The predecessor packages (`@ideagen-ehsqe/*`) went to
GitHub Packages instead; this is the first Ideagen design-system package on the
public registry.
