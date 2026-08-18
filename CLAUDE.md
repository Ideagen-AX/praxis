# Praxis

The design system for Ideagen EHSQ Enterprise. Plain CSS and vanilla JS — no
framework, no build step for consumers, no runtime dependency.

Published as [`@ideagen-ax/praxis`](https://www.npmjs.com/package/@ideagen-ax/praxis)
(MIT). Extracted from the `groom-lake` prototype on 2026-08-13, with history.

## The four docs

| File | Audience | Regenerated? |
|---|---|---|
| `README.md` | Installing, publishing, fonts, licence | Hand-written |
| `PRAXIS-FOR-AGENTS.md` | Building a prototype: shell, markup, tokens, gaps | Hand-written today; **being replaced** by `build-site.py --agents-doc` |
| `DESIGN-SYSTEM.md` | Design rationale + audit history | Partly, via `npm run docs` |
| `CHANGELOG.md` | Release notes | Hand-written |

Both agent-facing docs state what is *defined*, not what is intended — including
the classes Praxis references but never defines (`.btn`, `.section`, `.px-menu`,
`.callout`).

**After adding or renaming a component, write its page under `site/content/`** —
see [The reference site](#the-reference-site). That is where the prose lives now.
`PRAXIS-FOR-AGENTS.md` is still hand-written and still ships in the tarball, and
until the site's coverage is complete it remains the fuller document; keep its
*Corrections to DESIGN-SYSTEM.md* section current. It gets replaced by
`build-site.py --agents-doc` output once every component has a page.

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
npm run site:check   # CI gate — every page builds, every token is surfaced
python3 build-site.py --coverage    # which class families are still undocumented
python3 build-site.py --agents-doc  # render the content to markdown
```

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
- **`<praxis-block name="…">` inserts a measured fact.** Token tables, swatches,
  scales, sheet inventories. All come from `praxis_meta.py`, which `build-ds.py`
  also uses, so the site and `DESIGN-SYSTEM.md` cannot state different numbers.

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

Two gates that fail the build, both on purpose:

- **Every token defined in `src/` must appear on some page.** A token nobody can
  look up is invisible to every consumer, and it is decidable, so it is checked
  rather than hoped for.
- **The markdown conversion must produce no stray HTML and no unreplaced
  placeholder.** `--check` runs it in memory, so CI catches a broken agent doc
  before anyone regenerates the file that ships in the tarball. That check exists
  because an unreplaced placeholder wrote NUL bytes into the output, which turned
  the whole document binary and made `grep` stop seeing it — silent, and the byte
  count looked right.

`--coverage` is advisory, not a gate: 234 class families is a real backlog and a
day-one failure would just get switched off. Make it a gate when the list is
short.

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
