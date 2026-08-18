# Praxis

The design system for Ideagen EHSQ Enterprise. Plain CSS and vanilla JS — no
framework, no build step for consumers, no runtime dependency.

Published as [`@ideagen-ax/praxis`](https://www.npmjs.com/package/@ideagen-ax/praxis)
(MIT). Extracted from the `groom-lake` prototype on 2026-08-13, with history.

## The four docs

| File | Audience | Regenerated? |
|---|---|---|
| `README.md` | Installing, publishing, fonts, licence | Hand-written |
| `PRAXIS-FOR-AGENTS.md` | Building a prototype: shell, markup, tokens, gaps | **Generated** from `site/content/` by `build-site.py --agents-doc` |
| `DESIGN-SYSTEM.md` | Design rationale + audit history | Partly, via `npm run docs` |
| `CHANGELOG.md` | Release notes | Hand-written |

Both agent-facing surfaces state what is *defined*, not what is intended —
including the classes Praxis references but never defines (`.btn`, `.section`,
`.px-menu`, `.callout`).

**`PRAXIS-FOR-AGENTS.md` is generated. Do not edit it.** It is
`site/content/` rendered to one markdown file, and it still ships in the npm
tarball. After adding or renaming a component, write its page under
`site/content/` and run `python3 build-site.py --agents-doc`. `npm run
site:check` fails if the committed file is stale, because a content edit that
does not reach it publishes a guide that disagrees with the site.

Keep the version strings in `README.md` in step with `package.json` — they drifted
to 0.1.0 while the package was at 0.1.2, so the quickstart's CDN URLs served a
two-version-stale build.

## The one rule

**`src/` is the source of truth. `dist/` is generated and gitignored.**

Never hand-edit `dist/`. Edit the sheet in `src/`, then `npm run build`.

```sh
npm run build     # regenerate dist/ from src/, and verify the output
npm run check     # LOCAL staleness gate — is my working tree's dist/ current?
npm run docs      # regenerate the measured sections of DESIGN-SYSTEM.md
```

**`npm run check` is not a CI gate**, despite how it reads. It compares a
rebuild against the `dist/` already on disk, and `dist/` is gitignored — so in
any fresh clone it exits 1 with "dist/ is missing". CI runs `npm run build`,
which performs the same `verify()` pass (no `--ehsq-*` tokens, no font
binaries, no CDN-breaking relative paths, no unresolvable `var()`, no partial
barrel write). See `.github/workflows/ci.yml`.

## The reference site

The website is the primary reference: every token in both themes, and a page per
component with live examples. Generated, deployed from `main` only, and served at
**<https://ideagen-ax.github.io/praxis/>**.

```sh
npm run site         # build _site/
npm run site:serve   # build, then serve on :8000, rebuilding on each request
npm run site:check   # CI gate — pages build, tokens surfaced, guide current
python3 build-site.py --coverage    # class-family coverage report
python3 build-site.py --agents-doc  # regenerate PRAXIS-FOR-AGENTS.md
```

29 pages as of 2026-08-18, and **every one of the 234 class families in `src/` is
claimed by a page**.

**`site/content/` is the source of the prose. `_site/` is generated and
gitignored.** Same rule as `src/` and `dist/`. Adding a page means adding one file
under `site/content/`; the generator globs the directory, so there is no index or
registry to update.

A content file is a metadata comment followed by body HTML. Two things in it
matter more than the rest:

- **`<template>` is both the live example and the shown source.** The frame and
  the code panel come from the same markup, so they cannot disagree — the failure
  mode of every hand-maintained gallery. `data-height` reserves space; frames
  self-size, so it is not a cap. `data-source-only` shows markup without running
  it. A `<script>` inside a template is inert on the docs page and live in the
  generated example.
- **`redirect_from:` keeps an old URL alive after a rename.** Site-root-relative,
  comma separated. Renaming a content file changes the deployed URL, and Pages
  serves static files only, so the stub is the client-side equivalent of a 301:
  `meta refresh` for the no-JavaScript case, `location.replace` because it fires
  sooner and adds no history entry, a visible link if both are blocked, plus
  `noindex` and a canonical tag. The build **fails** if an old path collides with a
  real page. `colour.html` → `color.html` is the one in use.
- **`<praxis-block name="…">` inserts a measured fact.** Token tables, the palette
  grid, per-hue ramps, role-aware swatches, scales, sheet inventories. All come
  from `praxis_meta.py`, which `build-ds.py` also uses, so the site and
  `DESIGN-SYSTEM.md` cannot state different numbers.

**Colour blocks draw, they do not tabulate.** A grid of identical squares is the
default and it is close to useless for this palette: six semantic tokens are inks
and four are borders, and neither can be judged as a filled square. So
`role-swatches` picks the form from the token's role — inks as text, borders as a
hairline, fills as a control — and draws **both themes, each on the surface its own
theme provides**. That last part is not cosmetic: showing a light-theme ink on
whatever surface the docs chrome happens to be using made
`--praxis-color-text-primary` look unreadable in dark when it is nothing of the
kind. Where an ink genuinely has no contrast on its own surface, the sample moves
to a fill — decided by measuring the contrast ratio, not by guessing from
lightness, which is what got `text-primary` wrong the first time.

Use American spelling in `site/content/` and any user-visible label: **color**, not
colour. The older hand-written docs and the `src/` comments still say colour;
matching them is the wrong instinct for the site.

Every example runs in an **iframe**, and that is not cosmetic:
`praxis-profile-menu.js`, `praxis-navdrawer.js`, `praxis-toolbar-compact.js`,
`praxis-module-chip.js` and `praxis-admin-chrome.js` all auto-init on
`DOMContentLoaded` and mutate the document globally. Inline they would fight the
docs page. The iframe also gives each example its own
`body[data-variant][data-theme]`, which is what makes the theme toggle and the
resize handle work.

**Resolved token values are read in the browser, not computed by the build.** Two
hidden probe documents, one per theme, and `getComputedStyle` off their bodies. A
build can only report what a token is *declared* as, and in this system that is
regularly the wrong answer: `praxis-core.css` overrides nine `--praxis-*` tokens
under `body[data-variant="praxis"]`, at a higher specificity than `:root`.

Four gates that fail the build, all on purpose:

- **Every token defined in `src/` must appear on some page.** A token nobody can
  look up is invisible to every consumer, and it is decidable.
- **Every class family in `src/` must be claimed by a page's `classes:`
  metadata.** This was advisory at 15% coverage and is a gate at 100%, so a new
  component sheet cannot land undocumented. It checks the *claim*, not a mention:
  an earlier version counted `.card` as covered because seven pages said the word
  in prose while it had no page and no example.
- **`PRAXIS-FOR-AGENTS.md` must not be stale.** It ships in the tarball.
- **The markdown conversion must produce no stray HTML and no unreplaced
  placeholder.** That one exists because an unreplaced placeholder wrote NUL bytes
  into the output, which turned the whole document binary and made `grep` stop
  seeing it — silent, and the byte count looked right.

Two things are reported but deliberately **not** gates, because both are defects
in `src/` rather than in the site and failing here would turn `main` red for a
pre-existing bug: `frozen_aliases()` (below) and the used-but-never-defined token
count.

### `frozen_aliases()` — a decidable bug class

`praxis_meta.frozen_aliases()` finds tokens whose dark value **can never apply**:
declared on `:root` as `var(--rung)` while the rung's dark remap is declared on
`body`. Substitution happens at the element where the declaration lives, so the
token computes on `:root` against the light rung and `body` inherits that. Four
tokens are in this state today — `--praxis-color-interactive-active`,
`border-subtle`, `surface-muted` and `status-info`.

It is detected structurally rather than from resolved values on purpose: asking a
resolver for the dark value substitutes the dark rung and reports a difference the
browser never produces, which is exactly why this went unnoticed. The build prints
it as an advisory, **not** a gate — it is a defect in `src/`, and failing here
would have turned `main` red for a pre-existing bug. Make it a gate once fixed.

Do not confuse it with a token that is merely the same in both themes because its
rung has no dark treatment at all. That is an omission; this is a rule violation.
`--praxis-color-text-inverse` is white in both by design.

### Deploy

`.github/workflows/pages.yml`, on push to `main` and on dispatch. Separate from
`ci.yml` because it needs `pages: write` and `id-token: write`, and widening those
onto every pull-request run — including fork runs — is not worth one saved file.
It cannot live in `publish.yml` at all: npm's trusted publisher validates that
file's *name*.

Pull requests get no public URL. They get `build-site.py --check` in `ci.yml`,
which proves the site builds and publishes nothing.

**One-time setup, and the first deploy fails without it:** Settings → Pages →
Source → *GitHub Actions*.

## Consumers

`groom-lake/prototype` is the only consumer today. It does **not** import from
`node_modules` — it vendors a built copy into `prototype/vendor/praxis/` via its
own `sync-praxis.py`, because it is a static directory with no build step.

While working on both, point the prototype at this checkout:

```sh
cd ../groom-lake/prototype && python3 sync-praxis.py --local ../../praxis
```

Editing `groom-lake/prototype/vendor/praxis/*` is always wrong. That is a
generated mirror; the edit belongs here.

## Publishing

**Publishing is automated. Push a version tag.**

```sh
# 1. bump "version" in package.json   2. write the CHANGELOG entry   3. commit
git tag v0.1.3 && git push origin v0.1.3
```

`.github/workflows/publish.yml` builds, verifies that the tag matches
`package.json`, and publishes via **npm trusted publishing** — a short-lived
OIDC credential, no token and no secret in the repo. Provenance is attached
automatically.

Pushing to `main` does not publish. The tag is the trigger, because npm refuses
to republish an existing version and a push-triggered job would be red on every
commit that doesn't bump the version.

The trusted publisher on npmjs.com is bound to the **workflow filename**
(`publish.yml`), which is part of the OIDC `job_workflow_ref` claim. Renaming
that file breaks publishing until the npm config is updated, and it fails as an
OIDC error that reads like a credentials problem.

### Manual fallback

Only if the workflow is broken or unavailable. The npm account uses a
**passkey**, so there is no OTP to pass via `--otp=`. A publish from a non-TTY
shell fails with `EOTP` and redacts the auth URL in both stdout and the debug
log — which is precisely why CI could not do this before trusted publishing.
Run it from a real terminal:

```sh
npm publish --auth-type=web
```

A first `PUT 401` followed by the browser handshake is normal, not a failure.
Confirm from `~/.npm/_logs/`: look for `PUT 200` and `info ok`. The registry's
read side can lag a successful write by several minutes, so a 404 immediately
after publishing does not mean it failed — this applies to the automated path
too.

## Fonts

Praxis sets `font-family: 'Gilroy'` but ships **no font files** — Gilroy is
licensed and cannot be redistributed. The build strips the `@font-face` blocks
and emits `praxis-fonts.example.css` instead. **No font binary may ever enter
this package**; the build fails if one does.

## Two traps, both hit for real

**Matching custom properties with an unanchored regex.** `--[\w-]+\s*:` also
matches BEM modifiers in selectors — `.chip--danger:hover{…}` reads as a token
named `--danger`. This overstated the token count for weeks and let phantom
definitions mask genuinely undefined tokens. Anchor to the start of a
declaration: `(?:[{;]|^)\s*(--[\w-]+)\s*:`.

Related: a value pattern of `[^;}]*` matches **newlines**, so it will run from a
line of comment prose that looks like a declaration through to the next real
semicolon — silently eating a comment's closing `*/`. Use `[^;{}\n]*`.

**Renaming a page-local alias to a canonical token.** Safe only when the token
is *dedicated* to that use. For a general-purpose scale token it turns the
consumer into an override of the scale itself. Renaming `--card-header-pad` to
`--praxis-space-24` produced `--praxis-space-24: var(--praxis-space-24)` — a
cycle, which is invalid at computed-value time, so every use in scope resolved
to `unset`.

A corollary worth keeping: **HTTP 200 proves nothing about rendering.** Both
regressions above passed a green smoke test. Check comment balance, brace
balance, and cyclic definitions.

## Verifying a token change

Never substitute one token for another by name. Check the resolved values in
**both themes** — `--t-sm` looks like it maps to `--praxis-type-size-sm` but its
fallback resolved to `type-size-base`, and `--r-lg` is `1rem` against a canonical
`16px`, equal only because nothing overrides the root font size.

`build-ds.py` measures `src/` alone by default and is blind to real usage. Point
it at a consumer to see how much of the system is actually used:

```sh
python3 build-ds.py --consumer ../groom-lake/prototype
```
