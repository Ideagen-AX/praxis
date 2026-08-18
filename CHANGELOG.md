# Changelog

## Unreleased

**No CSS or JS changed.** `src/` is untouched, so nothing renders differently for
a consumer. This adds the reference site and the machinery behind it.

### Added

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

### Fixed

- **The class-family measurement counted `url()` paths and quoted strings.** A
  scan for `.name` read `url(fonts/Gilroy-Regular.woff2)` as a class called
  `.woff2` and an SVG namespace as `.w3` and `.org`, on top of the `.css` in prose
  that comment-stripping already had to handle. This inflated the apparent surface
  of the system from 234 real class families to about 370, and it showed in the
  component inventory in `DESIGN-SYSTEM.md`, where `praxis-reset.css` and
  `praxis-tokens.css` appeared to define classes they do not.

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
