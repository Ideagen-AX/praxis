# Praxis

The design system for Ideagen EHSQ Enterprise. Plain CSS and vanilla JS — no
framework, no build step for consumers, no runtime dependency.

Published as [`@ideagen-ax/praxis`](https://www.npmjs.com/package/@ideagen-ax/praxis)
(MIT). Extracted from the `groom-lake` prototype on 2026-08-13, with history.

## The four docs

| File | Audience | Regenerated? |
|---|---|---|
| `README.md` | Installing, publishing, fonts, licence | Hand-written |
| `PRAXIS-FOR-AGENTS.md` | Building a prototype: shell, markup, tokens, gaps | Hand-written, transcribed from `src/` |
| `DESIGN-SYSTEM.md` | Design rationale + audit history | Partly, via `npm run docs` |
| `CHANGELOG.md` | Release notes | Hand-written |

`PRAXIS-FOR-AGENTS.md` is measured from `src/` and states what is *defined*, not
what is intended — including the classes Praxis references but never defines
(`.btn`, `.section`, `.px-menu`, `.callout`). After adding or renaming a
component, update it, and re-check its *Corrections to DESIGN-SYSTEM.md*
section, which records where the older reference has gone stale.

Keep the version strings in `README.md` in step with `package.json` — they drifted
to 0.1.0 while the package was at 0.1.2, so the quickstart's CDN URLs served a
two-version-stale build.

## The one rule

**`src/` is the source of truth. `dist/` is generated and gitignored.**

Never hand-edit `dist/`. Edit the sheet in `src/`, then `npm run build`.
`npm run check` exits non-zero when `dist/` is stale.

```sh
npm run build     # regenerate dist/ from src/
npm run check     # CI staleness gate
npm run docs      # regenerate the measured sections of DESIGN-SYSTEM.md
```

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

The npm account uses a **passkey**, so there is no OTP to pass via `--otp=`.
A publish from a non-TTY shell fails with `EOTP` and redacts the auth URL in
both stdout and the debug log. Run it from a real terminal:

```sh
npm publish --auth-type=web
```

A first `PUT 401` followed by the browser handshake is normal, not a failure.
Confirm from `~/.npm/_logs/`: look for `PUT 200` and `info ok`. The registry's
read side can lag a successful write by several minutes, so a 404 immediately
after publishing does not mean it failed.

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
