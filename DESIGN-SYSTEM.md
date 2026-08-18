<!-- last-synced: 2026-08-12 (second pass: token consolidation) -->
<!-- method: scripted extraction across 16 CSS files, 16 JS files and inline <style> in 27 HTML pages; component surface measured by rule count per shared sheet; token definitions/usages/dead/undefined counted, and runtime-set tokens separated from genuine bugs by grepping setProperty. The 2026-07-30 sync additionally resolved token values in-browser across 24 pages x 2 themes; that resolution has NOT been re-run at this sync — see §13. -->
<!-- scope: groom-lake prototype only (prototype/**) -->
<!-- previous sync: 2026-07-30 (token adoption sweep, §12) -->

# Praxis Design System — Comprehensive Reference

> **Praxis is the design system for Ideagen EHSQ Enterprise.** Not a layer on top of another
> system: the earlier EHSQ-E Design System project is defunct and Praxis replaced it. Tokens
> are `--praxis-*` in `praxis-tokens.css`; materials and theming are `--px-*` in
> `praxis-core.css`; components are the `praxis-*` sheets.
>
> Praxis carries the Mazlan design language — slate layered elevation with lit edges, frosted
> glass, 12px geometry, full light + dark theming, and the teal→magenta AI signature. This
> document is its reference: what it ships, what every token resolves to, its patterns, and
> the state of its own consolidation. Measured from source, not recalled.
>
> *History, for context only:* the token vocabulary and BEM naming began in EHSQ-E, which had
> itself diverged from Helix. **Both projects are dead.** What they contributed is simply
> Praxis's now, and the `--ehsq-*` prefix was renamed out on 2026-08-12 (§13.7).

---

## 1. Overview

| | |
|---|---|
| **Tech** | HTML + CSS + vanilla JS, **no build step and no `package.json`** — plus **one serverless function** (`prototype/api/records.js`) since 2026-08-12, so the prototype is no longer purely static. Served locally two ways: `dev-server.py` (port 8081, no-cache headers) for UI work, and `vercel dev` for anything touching `/api`. Deployed to Vercel (`groom-lake.vercel.app`, root = `prototype/`). |
| **Persistence** | **Upstash Redis** via the Vercel Marketplace (`groom-lake-records`, free plan), reached over its REST endpoint with `fetch` — no SDK, so the deploy stays install-free. Records created in the prototype survive a reload and a redeploy. `KV_REST_API_URL` / `KV_REST_API_TOKEN` are injected by the integration. **The endpoint is unauthenticated** — invented test data only. |
| **Token layer** | `--praxis-*` foundation in **`praxis-tokens.css`** (single source, §3 Layer 0) + `--px-*` materials/theming in `praxis-core.css`. BEM component naming (`.praxis-{block}__{el}--{mod}`). |
| **Praxis layer** | `--px-*` material tokens + `body[data-variant="praxis"]` scope, defined once in **`praxis-core.css`** (the single source of truth for the Mazlan look). |
| **Theming** | Light + dark via `body[data-theme="light"|"dark"]`; Praxis dark via `body[data-variant="praxis"][data-theme="dark"]`. Persisted in `localStorage('gl-theme')`. |
| **Fonts** | Gilroy (400/500/600/700) → Segoe UI → Roboto → Helvetica Neue → Arial. Default body weight **600 (semibold)**. |
| **Icons** | **Lucide** (runtime SVG converter `praxis-lucide.js`) is the current standard; legacy **Material Symbols Rounded** spans are auto-converted where mapped. `.icon.lucide{fill:none}` guard keeps stroke icons from filling. |
| **Signature** | Mazlan AI gradient **teal `#29D2D7` → magenta `#E30072`**; brand teal `#1b838b`, brand pink `#e30072`. |
| **Geometry** | Praxis **8 / 12 / 16 px** radius scale; 12px cards; lighter 0.5px lit-edge strokes. |

### Token surface at a glance

> Measured, not transcribed. The table below is written by
> `design-system/build-ds.py` straight from the stylesheets — run it after any token
> change, or `--check` it in CI. Coverage rose from 78% at the previous sync mostly by
> deleting duplicated palette blocks, not by substituting literals: ~500 raw hex values
> disappeared with the 11 inline copies.

<!-- GENERATED:stats -->
| Measure | Value |
|---|---|
| Distinct custom properties defined | **224** |
| `var()` usages | **1,510** |
| Raw colour literals remaining | 820 (370 hex / 450 rgb·rgba) |
| Tokenization coverage | **65%** |
| Tokens defined in more than one file | 75 |
| Used but never defined (excluding runtime-set) | 3 — `--muted`, `--ph-pad-top`, `--praxis-filters-gutter` |
| Defined but never referenced | 106 |
| Stylesheets measured | 16 |
| Consumer pages measured | none — src/ measured in isolation |
<!-- /GENERATED:stats -->
- **Tokens defined in more than one file: 130, down from 166.** The foundation now has
  exactly one source (§3, Layer 0).
  Coverage rose 2 points while the token count grew 4% — the new field layer is
  tokenized at ~87% (85 `var()` vs 13 literals, 11 of which are shadow tints).
- Namespaces: `--praxis-*` (161) · `--px-*` (37) · `--tone-*` (10) · `--glass-*` (9) · `--praxis-*` (2) · `--cn-*` (1) · 95 singletons/page-local.
- Coverage held at 78% while the token count grew 46% — the layer expanded (soft-primary,
  hover, dot-clearance families) roughly in step with new UI.
- **A caveat that matters more than the percentage:** most `--praxis-*` and `--px-*` tokens are
  **redefined per theme, and several are redefined per page**. Only `--praxis-color-white` and
  the brand/neutral palette primitives resolve identically everywhere. A literal→token
  substitution is therefore only safe after checking the token's *resolved* value on every
  page in both themes — see §12.
- See **§10 Tokenization Audit** for collisions, **§12** for the 2026-07-30 sweep.

---

## 2. Design Principles

Six principles carry over from the work that preceded Praxis and are now simply its own —
clarity over cleverness, consistency builds confidence, data density with purpose,
accessibility non-negotiable (WCAG 2.1 AA), progressive disclosure, respect the platform
transition — plus the **Mazlan DNA**:

1. **Slate layered elevation with lit edges** — surfaces stack via 0.5px light-edge rings + soft ambient shadow, not hard borders.
2. **Frosted glass for transient surfaces** — drawers, flyouts and menus use backdrop-blur over a translucent slate/white fill.
3. **12px geometry** — rounded, calm, consistent corner language.
4. **Teal→magenta AI signature** — reserved for Mazlan/agentic moments (gradient borders, insight bands, the Mazlan mark).
5. **Brighter cyan in the dark** — the interactive teal shifts from `#1b838b` (light) to `#29D2D7` (dark) so it reads on slate.
6. **Dotted-grid page texture** — a fixed 18px radial dot grid, faded at the page edges, reads as "page material."

---

## 3. Architecture & File Map

Load order matters — later layers remap earlier tokens.

```
LAYER 0  THE FOUNDATION — one file, one definition           (NEW 2026-08-12)
  praxis-tokens.css ........... all 160 --praxis-* foundation tokens: the full palette
                                ramps, semantics, type/space/radius/elevation/motion.
                                Load this FIRST, before praxis-core.css.

  Before this existed, 11 pages each carried a ~73-token :root copy, praxis-admin.css
  carried 67 and concierge-base.css carried 151 — so "the value of --praxis-radius-md"
  was a fact about which page you were on. Those four sources are now gone.

LAYER 1  Base chrome (tokens removed, components retained)
  concierge-base.css .......... appbar, nav rail, buttons, fields (44 KB). Loaded by only
                                4 pages; its palette moved to Layer 0.
  praxis-admin.css ............ admin shell (35 KB). Its 67-token palette moved to Layer 0.

LAYER 2  Praxis material + theming (SINGLE SOURCE OF TRUTH)
  praxis-core.css ............. --px-* tokens (light+dark), Praxis radius/ease overrides,
                                elevation→material remap, dot-grid, global checkbox (8.6 KB)

LAYER 3  Shared components  (16 sheets — 6 added since 2026-07-30)
  praxis-appbar.css · praxis-navrail.css · praxis-pageheader.css
  praxis-mazlan.css (drawer, 42 KB) · praxis-create-new.css · praxis-module-selector.css
  praxis-workspace.css · praxis-profile-menu.css
  praxis-rfield.css ........... the field system, §5A (NEW 2026-08-12)
  praxis-filters.css .......... filter drawer/row/chips, 402 rules — the largest
                                shared sheet after mazlan; a port of the
                                Responsive Search project (do not hand-edit,
                                re-extract to upgrade)
  praxis-filters-local.css .... local overrides on top of the ported filters
  praxis-quick-rail.css ....... quick-filter pill rail (responsive)
  praxis-toolbar-compact.css .. toolbar collapse into a Tools menu at narrow widths

LAYER 4  Per-page inline <style> (largest surface of un-extracted CSS)
  index.html (workspace) · search-page.html · record-page*.html · report-management.html
  process-map-*.html · admin-*.html (generated by build-admin.py) · profile.html
  saved-records.html · record-page-initiate.html

LAYER 5  Behaviour (16 JS files, all vanilla, all self-wiring)
  praxis-lucide.js ............ runtime Material Symbols -> Lucide converter.
                                NOTE: it rewrites those spans into <svg> and
                                injects `svg.material-symbols-rounded{...}` at
                                (0,1,1) — which outranks a plain class selector,
                                so such a span cannot be reliably restyled or
                                hidden from a stylesheet.
  praxis-mazlan.js · praxis-navdrawer.js · praxis-dotfield.js
  praxis-create-new.js (catalog data) · praxis-create-new-nav.js (routing, NEW)
  praxis-records.js (storage client, NEW) · praxis-filters.js · praxis-quick-rail.js
  praxis-toolbar-compact.js · praxis-profile-menu.js · praxis-breadcrumb-back.js
  praxis-module-chip.js · praxis-admin-{chrome,data,users}.js

LAYER 6  Server (NEW 2026-08-12)
  api/records.js .............. GET list / GET ?id / POST save / DELETE, on Upstash
```

> **Key structural finding:** the token layer is centralized (`praxis-core.css`), but a large
> amount of component CSS — and several **re-declared token scales** — live in per-page inline
> `<style>` blocks (esp. `index.html`, `search-page.html`, the record pages). That inline
> layer is where most variances and duplicate naming schemes originate (§10).

---

## 4. Color Tokens

### 4.1 Primitives (`--praxis-color-*`)
| Scale | 10 → 100 |
|---|---|
| neutral | 05 `#f4f5f6` · 10 `#edf0f2` · 15 `#dadfe4` · 20 `#c8cfd7` · 30 `#adb8c4` · 40 `#8898a9` · 50 `#718499` · 60 `#4d657f` · 70 `#465c74` · 80 `#37485a` · 90 `#2a3846` · 100 `#202a35` |
| teal | 10 `#e8f3f3` … **60 `#1b838b`** … 100 `#0c3b3f` |
| blue | 10 `#edf0fd` … 60 `#4766eb` … 100 `#202e6a` |
| green | 10 `#e6f3ee` … 60 `#098b53` … 100 `#043f25` |
| yellow | 10 `#fdf9e6` … 60 `#efc600` … 100 `#6c5900` |
| orange | 10 `#fdf2e6` … 60 `#ef8100` … 100 `#6c3a00` |
| red | 10 `#fceaeb` … 60 `#e22d38` … 100 `#661419` |
| pink | 10 `#fce6f1` … **60 `#e30072`** … 100 `#660033` |
| purple | 60 `#805ad5` *(groom-lake addition, for solution accents)* |

### 4.2 Praxis light-mode overrides (in `praxis-core.css`)
Praxis re-tints a handful of base semantics for the Mazlan light palette:
| Token | Earlier value | Praxis (light) |
|---|---|---|
| `--praxis-color-text-primary` | neutral-90 `#2a3846` | `#2F4051` |
| `--praxis-color-text-secondary` | neutral-60 `#4d657f` | `#5D6977` |
| `--praxis-color-border-default` | neutral-20 `#c8cfd7` | `#E2E5E9` |
| `--praxis-color-blue-60` | `#4766eb` | `#4361c4` |
| `--praxis-color-orange-60` | `#ef8100` | `#ef8100` (same) |
| `--praxis-color-purple-60` | — | `#805ad5` |

### 4.3 Dark theme remaps (`body[data-theme="dark"]` + Praxis dark)
| Token | Dark value |
|---|---|
| `--praxis-color-surface-default` | `#1c2330` |
| `--praxis-color-surface-subtle` | `#161c27` |
| `--praxis-color-neutral-05 / 10 / 15 / 20` | `#10151e` / `#222b39` / `#2a3342` / `#3a4556` |
| `--praxis-color-text-primary / secondary / disabled` | `#e7ebf1` / `#9aa7b4` / `#62707e` |
| `--praxis-color-border-default` | `rgba(255,255,255,.10)` |
| `--praxis-color-interactive-default` | **`#29D2D7`** (brand teal → bright cyan) |
| `--praxis-color-text-link` | `#5CE0E5` |
| `--praxis-color-blue-60 / orange-60 / purple-60` | `#7a93e0` / `#ffa94d` / `#b088e8` (brightened for tinted chips) |

### 4.4 Semantic references
Interactive default/hover/active/focus → teal 60/70/80/50 · Text primary/secondary/disabled/inverse/link · Surface default/subtle/muted/inverse · Border default/strong/focus · Status success/warning/danger/info → green/orange/red/blue 60 (+ `-subtle` = 10).

---

## 5. Praxis Material Tokens (`--px-*`) — the heart of Praxis

Defined in `praxis-core.css`, scoped to `body[data-variant="praxis"]`.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--px-page` | `#F0F2F4` | **`rgb(14,19,36)`** | Page background (under the dot grid). Deep navy since 2026-07-29 — replaced `#11161f`. |
| `--px-surface` | `#ffffff` | **`#192336`** | Card / primary surface. Since 2026-07-29 — replaced `#1c2330`. |
| `--px-surface-2` | `#F4F6F8` | `#232c3b` | Slate raised surface (pinned reports, tiles) |
| `--px-tool` | `#ffffff` | `rgba(255,255,255,.06)` | Toolbar control fill |
| `--px-drawer` | `#ffffff` | `#0e1324` | Mazlan/filter drawer surface (deep navy in dark) |
| `--px-chip` | `#EEF1F4` | `rgba(255,255,255,.07)` | Chip / subtle fill |
| `--px-glass` | `rgba(255,255,255,.82)` | `rgba(26,32,45,.72)` | Frosted-glass panel fill |
| `--px-hover` | `rgba(16,36,58,.025)` | `rgba(255,255,255,.05)` | Row/control hover wash — sized for large row targets |
| `--px-hover-btn` | `rgba(16,36,58,.075)` | `rgba(255,255,255,.10)` | **New.** Button hover wash. `--px-hover` at 2.5% is invisible on a small raised tool, so buttons take a stronger one. |
| `--px-dot-clear` | `192px` (page-overridable) | same | **New.** Distance from the viewport top at which the dot grid starts fading in, so it clears the app bar + page header + toolbar. Pages override on `body[data-variant="praxis"]`. |
| `--px-dot` | `rgba(16,36,58,.11)` | `rgba(255,255,255,.09)` | Dot-grid texture ink |
| `--px-edge` | `rgba(255,255,255,.6)` | `rgba(255,255,255,.08)` | Lit inner edge |
| `--praxis-card` | light lit-edge card shadow | dark ambient card shadow | Card elevation material |
| `--px-tool-shadow` / `-hover` | light | dark | Toolbar control elevation |
| `--px-overlay` | light | dark | Popover/menu elevation |
| `--px-field` | `#EEF1F4` | `#262F3F` | **New 2026-08-12.** Form-field fill. Fields carry no border, so this *is* the affordance — it has to read as a step off `--px-surface` without fighting the value inside it. Opaque in dark on purpose: fields sit on card, drawer and admin surfaces, and a translucent fill would land on a different colour on each. Shared by `.rfield__control` and `.admin-field__control` (§5A). |
| `--px-field-hover` | `#E6EAEF` | `#2C3646` | **New 2026-08-12.** Field hover. |
| `--px-static-field-h` | `64px` | same | **New 2026-08-12.** Height of a static field row, matching the summary card's `.field` (§5A.3). Declared in `praxis-rfield.css`. |
| `--px-toolbar-gutter` | `16px` | same | **New 2026-08-12.** **Vertical** gap between a toolbar band and the first card of page content. One token because it had drifted three ways: 8px on the record page, 6px on admin, 6px on profile. ⚠️ Do not confuse with `--px-gutter`, which is the **horizontal** page gutter and is only defined below 640px. |
| `--px-card-rail` / `--px-card-raised` | light | dark | Card elevation variants (rail-adjacent, raised). |
| `--px-check-fill` / `--px-check-mark` | `text-primary` / `--px-surface` | same refs | Global custom checkbox. |
| `--px-scroll` / `--px-scroll-hover` | `rgba(16,36,58,.28/.45)` | `rgba(255,255,255,.26/.42)` | Custom scrollbar thumb, rest + hover. |
| `--px-gutter` | `16px` *(≤640px only)* | same | Horizontal page gutter below 640px; app bar, toolbar and page header all derive from it. |

### Primary CTA — two families

**Bold primary** — isolated CTAs on their own surface (login, in-dialog confirms).

| Token | Light | Dark |
|---|---|---|
| `--px-primary-grad` | `linear-gradient(180deg,#1f8f97,#1b838b)` | `linear-gradient(180deg,#29d2d7,#1fb4b9)` |
| `--px-primary-fg` | `#fff` | `#08313a` (dark ink on cyan) |
| `--px-primary-shadow` | hairline + contact + teal glow + lit edge | **New (2026-07-29).** Was only ever declared in light; built from navy, it rendered as *nothing* on a dark page. Now retuned: `rgba(41,210,215,.30)` hairline, black contact, cyan glow, white lit edge. |

**Soft primary** *(dark only)* — **New (2026-07-29).** What toolbar CTAs, the quick actions
and the nav-rail Create button use in dark. A bold cyan CTA shouts across a bar of neutral
tools; the soft chip sits among them.

| Token | Value | Role |
|---|---|---|
| `--px-primary-soft` | `linear-gradient(180deg,rgb(19,57,72),rgb(17,38,54))` | Fill. **Opaque** — these are the exact composite of 20%/10% cyan over `--px-page`, so the colour is unchanged from the original translucent version but the dot grid no longer reads through. |
| `--px-primary-soft-fg` | `#5CE0E5` | Label + glyph |
| `--px-primary-soft-shadow` | hairline + contact + glow + lit edge | Single button on a card |
| `--px-primary-soft-shadow-sm` | same, glow cut to `0 4px 10px -8px rgba(41,210,215,.22)` | **Rows** of soft primaries — four quick actions side by side pooled the full glow into a continuous band |
| `--px-primary-soft-hover` / `-shadow-hover` / `-shadow-sm-hover` | brighter fill + stronger glow | Hover |

**Rule:** in dark, a primary button *inside a toolbar* takes the soft family; one isolated on
its own surface keeps the bold family.

### Frosted glass (`--glass-*`, defined per-page in `index.html` / `search-page.html`)
`--glass-bg`, `--glass-blur` (`blur(22–24px) saturate(160–185%)`), `--glass-border`, `--glass-drawer`, `--glass-hover`, `--glass-inset`, `--glass-on`, `--glass-sheen`, `--glass-shadow` — each with light + dark values. **Note:** overlaps conceptually with `--px-glass`/`--px-overlay` (§10).

### Status tones (`--tone-*`, search-page chips)
`--tone-{success,warning,danger,info,neutral}-{bg,fg}` — light maps to `--praxis-color-{color}-10/60`; dark uses bespoke translucent fills + brightened fg. Parallels `--praxis-color-status-*` (§10).

### Texture
Dot grid: `radial-gradient(circle, var(--px-dot) 1px, transparent 1px)` at `18px 18px`,
`background-attachment:fixed`. Two page-colour gradients composite **over** the dots
(compositing, not masking — masking would hide content):

- **Vertical:** opaque to `--px-dot-clear`, then transparent 48px later. Keeps the grid from
  running up behind the toolbar and page header, where it read as part of the chrome.
- **Horizontal:** opaque to the **nav rail's right edge**, then a 7% ramp; and a matching 7%
  ramp at the page's right edge. Anchored to the rail, not the viewport — measured from
  x=0 the rail ate half the left ramp, so the visible fade was half the width of the right
  one. Verified symmetric to within 1 unit by pixel sampling.

---

## 5C. Foundation token reference (generated)

Every `--praxis-*` foundation token, from `praxis-tokens.css`, with the dark value
`praxis-core.css` remaps it to. Generated by `build-ds.py`; do not hand-edit.

<!-- GENERATED:foundation -->

**Neutrals**

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

**Hue scales**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
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

**Semantic — text / surface / border / interactive**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-border-default` | `var(--praxis-color-neutral-20)` | `rgba(255,255,255,.10)` |
| `--praxis-color-border-focus` | `var(--praxis-color-teal-50)` | — |
| `--praxis-color-border-strong` | `var(--praxis-color-neutral-40)` | — |
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

**Semantic — status**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-status-danger` | `var(--praxis-color-red-60)` | `#ed7b82` |
| `--praxis-color-status-info` | `var(--praxis-color-blue-60)` | `#7a93e0` |
| `--praxis-color-status-success` | `var(--praxis-color-green-60)` | `#3ecf8e` |
| `--praxis-color-status-warning` | `var(--praxis-color-orange-60)` | `#ffa32e` |

**Typography**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-type-font-sans` | `'Gilroy','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif` | — |
| `--praxis-type-size-base` | `0.875rem` | — |
| `--praxis-type-size-lg` | `1.125rem` | — |
| `--praxis-type-size-md` | `1rem` | — |
| `--praxis-type-size-sm` | `0.8125rem` | — |
| `--praxis-type-size-xl` | `1.25rem` | — |
| `--praxis-type-size-xs` | `0.75rem` | — |

**Spacing**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-space-12` | `.75rem` | — |
| `--praxis-space-16` | `1rem` | — |
| `--praxis-space-24` | `1.5rem` | — |
| `--praxis-space-32` | `2rem` | — |
| `--praxis-space-4` | `.25rem` | — |
| `--praxis-space-8` | `.5rem` | — |

**Radius**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-radius-full` | `9999px` | — |
| `--praxis-radius-lg` | `16px` | — |
| `--praxis-radius-md` | `12px` | — |
| `--praxis-radius-sm` | `8px` | — |

**Elevation**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-elevation-1` | `0 1px 2px 0 rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-2` | `0 1px 3px 0 rgb(32 42 53 / .1), 0 1px 2px -1px rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-3` | `0 4px 6px -1px rgb(32 42 53 / .1), 0 2px 4px -2px rgb(32 42 53 / .06)` | — |
| `--praxis-elevation-4` | `0 10px 15px -3px rgb(32 42 53 / .1), 0 4px 6px -4px rgb(32 42 53 / .05)` | — |

**Motion**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-motion-normal` | `180ms` | — |
| `--praxis-motion-slow` | `260ms` | — |
| `--praxis-ease-default` | `cubic-bezier(.32,.72,0,1)` | — |
| `--praxis-motion-fast` | `120ms` | — |
| `--praxis-motion-slowest` | `420ms` | — |
| `--praxis-record-rail-w` | `300px` | — |
| `--praxis-control-h` | `32px` | — |

**Chrome metrics**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-navrail-width` | `56px` | — |
| `--praxis-navrail-width-expanded` | `240px` | — |
| `--praxis-elevation-card` | `0 2px 16px -4px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(0, 0, 0, 0.1)` | — |
| `--praxis-elevation-card-raised` | `0 8px 24px -6px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0, 0, 0, 0.1)` | — |
| `--praxis-elevation-popover` | `0 4px 6px rgba(32, 42, 53, 0.07), 0 10px 15px rgba(32, 42, 53, 0.08)` | — |

**Palette rungs completed from the EHSQ-E base**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
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

**Radius completed**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-radius-card` | `20px` | — |
| `--praxis-radius-xl` | `16px` | — |

**Semantic colour completed**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-color-border-subtle` | `var(--praxis-color-neutral-10)` | `#222b39` |
| `--praxis-color-surface-muted` | `var(--praxis-color-neutral-10)` | `#222b39` |

**Spacing completed**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
| `--praxis-space-20` | `1.25rem` | — |
| `--praxis-space-40` | `2.5rem` | — |
| `--praxis-space-48` | `3rem` | — |

**Typography completed**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
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

**Profile-menu motion, from the two pages that animate it.**

| Token | Light | Dark (via `praxis-core.css`) |
|---|---|---|
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
| `--praxis-tone-warning-fg` | `var(--praxis-color-orange-70)` | `#f5b45c` |
| `--praxis-tone-danger-bg` | `var(--praxis-color-red-10)` | `rgba(226,45,56,.18)` |
| `--praxis-tone-danger-fg` | `var(--praxis-color-red-70)` | `#f28b91` |
<!-- /GENERATED:foundation -->

---

## 5A. Fields — the record form system (`praxis-rfield.css`) *(new — 2026-08-12)*

The single largest component addition since the last sync, and the one place where
**every** page that shows data now agrees. Extracted out of `record-page.html`
(where it had been inline since 2026-08-06) into a shared sheet the moment a
second page needed it — the per-page-copy pattern the 2026-08-04 consolidation
pass removed everywhere else.

**Loaded by:** all seven `record-page*.html`, `saved-records.html`, `profile.html`,
and every generated `admin-*.html` (via `build-admin.py`). 124 rules, 85 `var()`
refs, 2 raw hex (both unavoidable — see *Chevron* below).

### 5A.1 The two representations

A field is either **interactive** (this step owns it) or **static** (it belongs to
a passed step, or is a read-only value). They are deliberately different shapes,
because the same record body is editable in one workflow step and frozen in the
next, and the user has to be able to tell at a glance which is which.

| | Interactive | Static |
|---|---|---|
| Layout | Label **above**, control below | Label **beside** value, 200px gutter |
| Class | `.rfield` + `.rfield__control` | `.rfield--locked` / `.admin-field__value` |
| Height | 40px control | **64px row** (`--px-static-field-h`) |
| Affordance | `--px-field` grey fill, **no border** | No fill, no border; hairline rules between rows |
| Type | Label 13px, value 14px | Label **and** value 14px / 21px line-height |
| Label | Sentence case, no colon | **Terminates in a colon** |

### 5A.2 Interactive fields

- **No border.** The `--px-field` fill *is* the affordance (`#EEF1F4` light /
  `#262F3F` dark, `--px-field-hover` on hover). Replaced a 1px `neutral-20`
  edge: a column of outlined boxes reads louder than a column of filled ones.
- **Focus draws an inset ring** (`inset 0 0 0 1px` interactive + a 3px outer
  glow). With no resting border, focus has to come from somewhere; inset means
  the box doesn't change size, so nothing reflows when a field takes focus.
- **`background-color`, never the `background` shorthand** — selects layer a
  chevron image on top and the shorthand wipes it.
- **Placeholders are content** and answer to WCAG 1.4.3 like any other text.
  `--praxis-color-text-disabled` measured **2.73:1 light / 2.77:1 dark** against
  this fill — a clear failure. They take `--praxis-color-text-secondary`
  (**4.94:1 / 5.48:1**), and the weight drop to 500 is what now separates a
  placeholder from a real value.

**Chevron.** A native select arrow pins itself to the control's right edge and no
amount of `padding-right` moves it, so it read as touching the side. Selects take
`appearance:none` and a CSS-drawn caret inset **12px**, matching the text. It is a
data-URI SVG with a literal fill (`#5D6977` light / `#9AA7B4` dark) because
`background-image` cannot take `currentColor` or a `var()` — these are two of the
only raw literals in the sheet, and they are correct as literals. The same
treatment is on `select.admin-field__control`.

Date/time `::-webkit-calendar-picker-indicator` and the `.rref` lookup button are
inset to the same 12px, so every trailing glyph in a column sits on one line.

### 5A.3 Static fields — one representation, everywhere

Generalised from the record summary card's `.field` row, which was the treatment
that already read correctly. Applies to `.rfield--locked` (frozen record fields)
and — selected with `:has(> .admin-field__value)`, so the ten generated admin
pages needed no markup change — the admin and profile read-outs.

- **64px rows** (`--px-static-field-h`). Not 48: `body[data-variant="praxis"]
  .field:not(.field--vertical)` raises the summary card's rows from 48 to 64, so
  a static row built at 48 sat visibly short of the rows it was matching.
- **Baselines align because the metrics match.** Label and value are both
  14px/21px, so each is a single line box and `align-items:center` centres the
  pair *and* puts their baselines on one line. Aligning a 13px label to a 14px
  value needs a magic offset that breaks the moment either size changes.
- **Rules align to the label's left edge** (16px, the row's own padding) — not
  the 24px the summary card originally used, which began 8px inside the label
  and read as a misalignment down the whole card. `.field::before` is corrected
  to match.
- **Top *and* bottom rule**, so a field standing alone is bounded (see the
  profile page's Account card). Stacked rows would then paint two hairlines
  against each other, so consecutive rows **overlap by 1px** via negative
  margin. Done with margin rather than by suppressing one rule: the rows are not
  always DOM-adjacent — a `.rfield__group` sits between them — so a
  sibling-based `:has()` test misses those boundaries.
- **Labels terminate in a colon**, added via `::after` rather than in markup so
  it holds for fields added later and across generated pages. Ordered *before*
  `.req` so a required frozen field reads `Name:*`. `[data-label-nocolon]` opts
  out labels that are already questions — "Was High Energy Present?**:**" is not
  an improvement.
- A frozen **textarea** uses `field-sizing:content` and renders as text at its
  natural height, with no fill, no resize handle and no 96px well. A frozen
  **pill** collapses to the chosen value as text (its 32px shell would otherwise
  make that one row taller than the rest).
- Once frozen, a side-by-side `.rfield__group` **stacks**, so three
  label-above-value columns aren't the one place static fields stop being
  label-beside-value rows.

**Known limit:** two rows in the current record exceed 64px because their content
genuinely does not fit one line — a 62-character question label in the 200px
gutter, and a two-sentence value. `min-height` lets them grow rather than clip.
A hard uniform height needs a wider gutter, shorter wording, or truncation.

### 5A.4 The sub-components

| Component | Class | Notes |
|---|---|---|
| **Picklist** | `.pillset` / `.pill` | Real `<input type="radio">`, not `<button aria-checked>`. The button version carried no state and no keyboard model while looking selectable. Same silhouette; selection, keyboard nav and SR semantics come free. |
| **Reference field** | `.rref` | A lookup against a configured list: typing filters, only a click or Enter commits, and blur reverts uncommitted free text — a reference points at a row, so arbitrary text is the wrong affordance. The committed value lives on the element (`data-committed`), not in a closure, so a value restored from storage survives the next blur. |
| **In-record table** | `.rtable` | Actions row, explicit empty state, zebra striping on `nth-of-type(even)`. **White fill, not the field grey** — a table of rows is content, and the grey read as one large input. `.rtable--locked` keeps the rows and drops the ways to change them. |
| **Sub-section** | `.subsec` | A titled run of fields inside a section (Action Items), lighter than `.section__title` so nesting is legible without a second collapse control. |
| **Mazlan action** | `.mazbtn` | A section-level hand-off to Mazlan (Risk Analysis). Pill-shaped and quiet so it reads as an offer beside the section title rather than competing with Submit. Uses `.mazlan-mark` from `praxis-mazlan.css`. |
| **Validation alert** | `.form-alert` | `role="alert"`, red-tinted, naming each outstanding field as a jump link. Also carries storage failures — both are "your click did not do what you expected, here is why". |
| **Invalid field** | `.rfield--invalid` | 1.5px red **inset** ring (a 1px red line on a grey fill is easy to miss), red label, `aria-invalid`. Inset so a form turning red at once does not reflow. Set only by the save/submit check, never on load. Cleared per field the moment it gets a value. |

### 5A.5 Zebra striping gotcha

`nth-of-type` counts every `<tr>`, including a hidden empty-state row — which made
the first *real* row strike as even. The empty state lives in its **own
`<tbody>`** so the data rows count from one. Worth knowing before adding any
striped table.

---

## 5B. Section headers & workflow steps *(new — 2026-08-12)*

The record body is now step-aware, and this is the pattern for it.

- **`data-step` on a `.section`** names the step that owns it. The page declares
  the record's current step on `body[data-record-step]`. A shared step order
  (`initiate → incident-review → investigation-results → incident-closure →
  close`) decides the rest: any section earlier than the current step arrives
  **collapsed**, with `aria-expanded` and the button label kept in sync. Nothing
  is hard-coded per section, so at Investigation Results both earlier sections
  fold away with no further work.
- **Header order is: teal tick → chevron → title → note.** The tick was drawn as
  `.section__title::before`, i.e. *inside* the title, so nothing could sit between
  the tick and the text; it moved to `.section__header::before` as its own flex
  item. Every child carries an explicit `order`, because a flex item without one
  defaults to 0 and jumps ahead of the chevron.
- The collapse control sits **left** of the title: it is the affordance for the
  thing it precedes, and on a page where passed steps arrive collapsed the
  chevrons form a column you can run down instead of scattering at the right edge.
- A field's step also decides whether it is interactive or static (§5A.1). The
  step that owns a field is the step that can change it.

---

## 6. Typography · Spacing · Radius · Elevation · Motion

| Category | Canonical | Groom-lake aliases in use | Notes |
|---|---|---|---|
| **Type size** | `--praxis-type-size-2xs…3xl` (11/12/13/14/16/18/20/24/30) — **dense, base body = 14px** (regen 2026-07-22; root stays 16px) | `--t-xs…xl` mirror the same values (index/search) | Alias duplicates the scale (§10) |
| **Type weight/leading/tracking** | `--praxis-type-weight/leading/tracking-*` | — | Body default 600 |
| **Spacing** | `--praxis-space-0…96` (8px grid + 4px steps) | `--s-4…32` (index/search) | Alias duplicates (§10) |
| **Radius** | `--praxis-radius-sm/md/lg/xl/full` | `--r-sm/md/lg` | **Two scales** — Praxis overrides sm/md/lg to **8/12/16**; base is 4/8/12; admin uses rem equivalents (§10) |
| **Elevation** | `--praxis-elevation-1…6` + semantic (card/dropdown/popover/dialog/toast) | `--px-*` shadows, `--praxis-card`, `--shadow-1/2/3` | Multiple systems; Praxis remaps `--praxis-elevation-card/popover` → `--px-*` |
| **Motion — duration** | `--praxis-motion-fast/normal/slow` | `--dur-*`, `--d-fast/normal/slow` | **Three systems**, divergent values (§10) |
| **Motion — easing** | `--praxis-ease-default` | `--ease-default/out/spring*` | Two "default" easings differ (§10) |

**Praxis canonical easing:** `cubic-bezier(.32,.72,0,1)` (set in `praxis-core.css`). **Base/record easing:** `cubic-bezier(.2,0,.38,.9)`.

---

## 7. Theming Model

- Root scope: `body[data-variant="praxis"]`. **Only one variant exists now** — the frozen
  "Miramar" comparison view was pruned on 2026-08-12 (§13.7). The attribute and its scoping
  stay because every Praxis selector is written against it; removing it would mean rewriting
  thousands of selectors for no rendering gain.
- Theme: `body[data-theme="light"|"dark"]`. Dark applies in two cascading blocks — `body[data-theme="dark"]` (base token recolor, covers legacy Miramar) then `body[data-variant="praxis"][data-theme="dark"]` (Praxis slate surfaces + materials).
- Bootstrapping: an inline head script applies `localStorage('gl-theme')` **before** first paint so theme-aware components (e.g. Highcharts) render correctly the first time.
- **Load order is `praxis-tokens.css` → `praxis-core.css`.** The foundation declares on
  `:root`; Praxis overrides and dark remaps declare on `body[data-variant="praxis"]`, a
  higher specificity, so they win regardless of order — but keeping the order means the
  cascade reads the way it behaves.
- **A page must not re-declare foundation tokens.** That was the single largest source of
  drift found in the 2026-08-12 audit, and every copy has been removed.
- Primary-CTA dark ink is enforced with a high-specificity rule so per-page `color:#fff` can't override it.

---

### 7.1 Cascade rules for shared sheets *(new — learned 2026-07-29/30)*

`praxis-core.css` loads **before** every page's inline `<style>`, so at equal specificity the
page always wins. Three separate bugs this week came from ignoring that:

1. **Use `:is()`, not `:where()`, when a shared sheet must win.** `:where()` contributes zero
   specificity, so `body[data-variant][data-theme] :where(.toolbar) :where(.btn--primary)`
   ties with a page's `body[data-variant] .btn--primary` and loses on source order. Symptoms:
   a Submit button that wouldn't restyle; admin icons stroking near-black on a dark chip.
2. **Declare page-level token overrides on the same selector the core uses.** The core defines
   `--px-dot-clear` inside `body[data-variant="praxis"]`; a `:root` or bare-`body` override on
   a page loses to it and silently does nothing.
3. **Never re-declare a shared background stack in a page.** `search-page.html` carried its
   own copy of the body background and shadowed the shared rule entirely, so neither
   `--px-dot-clear` nor the rail-anchored edge fade reached it.

---

## 8. Component Inventory

Measured by CSS class-block frequency across all sources. Grouped by area.

### Shared stylesheets (generated)

<!-- GENERATED:components -->
| Sheet | Rules | Main class families |
|---|---|---||
| `praxis-admin.css` | 259 | `.switch`, `.adminnav`, `.ws-item`, `.admin-field`, `.tbtn` |
| `praxis-appbar.css` | 53 | `.appbar`, `.appswitch`, `.msel`, `.iconbtn-ghost` |
| `praxis-core.css` | 46 | `.tbtn`, `.switch`, `.btn`, `.pill-btn`, `.praxis-navrail` |
| `praxis-create-new.css` | 83 | `.cn-group`, `.cn-flyout`, `.cn-row`, `.material-symbols-rounded`, `.cn-tpl` |
| `praxis-filters.css` | 403 | `.filter-row`, `.filter-drawer`, `.select-menu`, `.qfilter`, `.filter-chips` |
| `praxis-mazlan.css` | 270 | `.mazlan-drawer`, `.mazlan-menu`, `.mazlan-reasoning`, `.material-symbols-rounded`, `.mazlan-msg` |
| `praxis-module-selector.css` | 55 | `.msel`, `.cn-group`, `.cn-item`, `.cn-grid`, `.is-sel` |
| `praxis-navrail.css` | 95 | `.praxis-navrail`, `.px-navdrawer`, `.ws-item`, `.ws-pop`, `.px-navtoggle` |
| `praxis-pageheader.css` | 21 | `.pageheader`, `.breadcrumb`, `.toolbar`, `.material-symbols-rounded`, `.icon` |
| `praxis-profile-menu.css` | 27 | `.profile-menu`, `.verswitch`, `.icon`, `.material-symbols-rounded` |
| `praxis-quick-rail.css` | 37 | `.tb-is-compact`, `.qrail-pop`, `.qrail`, `.qfilter`, `.is-open` |
| `praxis-reset.css` | 6 |  |
| `praxis-rfield.css` | 124 | `.rfield`, `.rtable`, `.admin-field`, `.rref`, `.pill` |
| `praxis-tokens.css` | 1 |  |
| `praxis-toolbar-compact.css` | 82 | `.tb-options`, `.tb-compact`, `.viewswitch`, `.tb-display`, `.tb-is-compact` |
| `praxis-workspace.css` | 81 | `.appbar`, `.praxis-navrail`, `.persona-trigger`, `.persona-picker`, `.appswitch` |
<!-- /GENERATED:components -->

### Global chrome
- **App bar** (`.appbar`, `.appswitch`) — global top bar: brand, app switcher, module selector, search, profile. `praxis-appbar.css`.
- **Nav rail** (`.praxis-navrail`) — 56px icon rail: Create New (teal), module icons, Dashboards flyout (`.ws-item` / `.px-menu` / `#*-dash-pop`), Reports. `praxis-navrail.css`. *Cross-domain personas get Quality + EHS workspace items; deep-link `index.html?ws=ehs`.*
- **Page header** (`.pageheader`, `--ph-pad-x`) — breadcrumb + 24px title. `praxis-pageheader.css`.
- **Profile menu** (`.profile-menu`) — avatar dropdown.
- **Popover** (`.px-menu`) — shared frosted flyout material.

### Mazlan (AI) surfaces
- **Mazlan drawer** (`.mazlan-drawer`, `.mz-drawer`, `.mazlan-menu`) — conversational side drawer. `praxis-mazlan.css`.
- **Mazlan mark** (`.mazlan-mark`) — the animated AI signature glyph.
- **Mazlan input** (`.mz-input`, `.mzi-form`) — on-page input routing into the drawer.

### Create / select
- **Create New menu** (`.cn-*`, `--cn-tone`) — record-creation flyout, tabs Shortcuts/All/Templates, per-group solution tone. `praxis-create-new.css`.
- **Module selector** (`.msel`, `.sm-opt`) — search-scope picker reusing the Create New catalog. `praxis-module-selector.css`.

### Workspace / dashboard (`index.html`)
- **Workspace shell** (`.ws-*`, `.ws-topchrome`) — persona-tailored home; customize/edit mode with draggable widgets.
- **Cards** (`.card`, `--card-header-pad`), **quick actions** (`.qa`), **layout/width/export menus**, **Component Library** (`.lib-*`) with the mazlan gradient-border "Create Custom" tile.
- `praxis-workspace.css` + heavy inline styles.

### Record pages (`record-page*.html`, `record-page-initiate.html`)
- **Fields** — the full system in **§5A**: `.field` (the original read-only row, still
  the summary card), `.rfield` (interactive), `.rfield--locked` (static), `.pillset`,
  `.rref`, `.rtable`, `.subsec`, `.mazbtn`, `.form-alert`, `.rfield--invalid`.
- **Toolbar** (`.toolbar`, `.tbtn`, `.tb-dropdown`) — sticky at `z-index:20`; see §9.3.
- **Record guide cards**: **Current Task** (`.ctask`, `.ctask-wf`), **Workflow**
  (`.wf`, `.wftl`), **Required Fields Guide** (`.praxis-rfguide`, `.praxis-rfpopup`) —
  now **live**, counting the current step's required fields rather than a static 58%.
- **Process Tree — two implementations that share almost no markup:** `.ptree` /
  `.ptree__children` (the frozen Miramar view) and `.pm` / `.pm__root` / `.pm__group`
  (the Praxis view, and the **visible** one under `data-variant="praxis"`). Anything
  that manipulates the tree has to handle both, or it will appear to work while only
  touching the hidden one.
- **Summary** (`.summary`) — its `.summary__desc` is now plain static text, not a
  filled well with a drag grip; the one field on the card that cannot be edited had
  been the only one that looked editable.
- **Callout** (`.callout`), **Chip** (`.chip`), **inspection table** (`.insp-table`),
  **record TOC** (`.rtoc`).
- **Saved records** (`saved-records.html`, `.sr-*`) — list of persisted records,
  routing each row to the page for the step it is actually in.

### Filters & toolbar responsiveness *(added since 2026-07-30)*
- **Filter drawer / row / chips** (`.filter-drawer`, `.filter-row`, `.filter-chips`,
  `.select-menu`, `.cf-input`) — `praxis-filters.css`, 402 rules. A **ported** sheet
  from the Responsive Search project: re-extract to upgrade rather than hand-editing,
  with `praxis-filters-local.css` for local overrides. It still carries the **older
  bordered input treatment** (`.filter-search-input` / `.cf-input`) — the last place
  using the pre-2026-08-12 field look (§13).
- **Quick-filter rail** (`.qrail`, `.qfilter`, `.qrail-pop`) — `praxis-quick-rail.css`.
- **Compact toolbar** (`.tb-compact`, `.tb-is-compact`, `.tb-options`, `.viewswitch`,
  `.tb-display`) — collapses toolbar actions into a Tools menu at narrow widths.
- **Module chip** (`praxis-module-chip.js`) — persistent module scope in the chip bar.

### Search (`search-page.html`)
- **View switcher** (`.verswitch`) — list/table/card/calendar/hierarchy/chart (default **list**). **Filter row** (`.filter-row`), **status tones** (`.tone-*`), **calendar** (`.cal-week`), **attachment card** (`.att-card`).

### Process maps (`process-map-*.html`)
- **Process map** (`.pm`) — accordion + drill views. Dark mode **fixed 2026-08-12**: both
  pages already carried `body[data-variant="praxis"][data-theme="dark"]` rules (dark status
  chips, tinted branch highlight) but had a hard-coded `data-theme="light"` and no theme
  bootstrap script, so that styling was unreachable. Adding the bootstrap made the existing
  dark support live — no new CSS was needed.

### Admin (`admin-*.html`, generated by `build-admin.py`)
- **Admin shell** (`.admin-*`, `--adminnav-w`), **admin nav** (`--adminnav-*`), **settings rows** (`.ss-row`), tables (`--admin-row-selected`). `praxis-admin.css`.

### Report Management (`report-management.html`)
- **Report tree** (`.rm-*`) + My Top Reports dashboard.

### Primitives
- **Button** (`.btn`, `.tbtn`, `.pill-btn`), **Switch** (`.switch`), **Toggle** (`.toggle`, `.panel-toggle`), **Chevron button** (`.chevron-btn`), **Icon** (`.icon`, `.material-symbols-rounded` → Lucide), global **checkbox** (Praxis custom appearance, pink checked, surface-colored box).

---

## 9. Patterns

- **Page layout** — App bar (64px) → Nav rail (56px) → page content (surface with dot grid) → page header → toolbar → content card. Only the content card varies per page.
- **Record page** — three columns: guide (Current Task / Required Fields / Workflow) · content (tabs + field rows) · Process Tree.
- **Workspace / dashboard** — persona-driven widget grid; sticky top chrome; customize mode makes all widgets draggable with pink outline; quick-actions bar.
- **Search results** — six view modes, sortable columns, collapsible Fields panel, 50/page pager.
- **Admin** — shared shell + left settings nav + content (tables / forms / tabs).
- **Feedback** — toasts; inline callouts/status banners; (destructive-action confirmation is a known gap — see UX review).

### 9.1 Motion *(new — 2026-07-29/30)*

All entrance motion is ported from the Mazlan prototype (`mazlan-chatbot-v3`) rather than
invented, so the two products share an idiom. Every one is wrapped in
`@media (prefers-reduced-motion: no-preference)`; the reduced path renders the finished
state with `animation-name: none`, not a faster animation.

| Idiom | Where | Parameters | Source |
|---|---|---|---|
| **Board entrance** | Home components | `460ms`, `translateY(14px)`, diagonal stagger (left column leads, right offset half a beat) | — |
| **List cascade** | Search results | `340ms`, `translateY(8px)`, `cubic-bezier(.22,1,.36,1)`, delay `min(i,10) x 32ms` | `.chats-row--enter` |
| **Panel cascade** | Record page | `460ms`, `translateY(12px)`, emphasis curve, **widening** delays `0/40/95/150` so it decelerates rather than ticking | `.setv-card` |
| **Press** | All buttons | `scale(.95)` icon-sized, `scale(.97)` larger, `150ms` | Mazlan press |

Two rules learned the hard way:
- **`backwards` fill is mandatory** on any staggered entrance. Without it each element paints
  at full opacity first, then snaps back to the start of its own animation.
- A component's own `transition` shorthand **resets** a shared `transform` transition. The
  press feedback needed `transform` patched into each component's existing declaration.

### 9.2 Hover
Every interactive control shifts its **background**, not just its glyph. An icon-only colour
change reads as a rendering artefact and disappears for anyone not looking straight at it.
Raised controls (toolbar tools, rail buttons) tint *over* their own surface with
`--px-hover-btn` so they keep reading as raised.

### 9.3 Stacking *(new — 2026-08-12)*

Two rules, both learned from bugs that looked like something else:

1. **`.appbar` is a stacking context.** It is `position:relative; z-index:30`, so
   anything inside it — the profile menu, which asks for `z-index:200` — is trapped
   in the 30 layer and cannot escape it. **Any band given a z-index below the app
   bar must stay under 30.** A sticky toolbar at 30 tied with the app bar, won on
   document order, and ate the top ~60px of the open profile menu. Toolbar bands
   are at **20**.
2. **Every popover stops click propagation inside itself.** `wirePopover` does
   `pop.addEventListener('click', e => e.stopPropagation())` so a click inside does
   not reach the document handler that closes it on an outside click. The
   consequence: **a bubble-phase document delegate never sees a click inside any
   flyout.** Delegated handlers that must (e.g. Create New routing) listen in the
   **capture** phase.

### 9.4 Scrolling — page vs column *(new — 2026-08-12)*

At ≥1025px the record pages historically set `.main{overflow:hidden}` and handed
scrolling to `.record__content`, so the guide and process-tree columns could stay
put. That is only worth it when there *are* side columns. The cost otherwise is
severe: the column becomes a fixed-height window (measured 618px onto 1254px of
record) and, because these columns' scrollbars rest fully transparent, the content
reads as **clipped** rather than scrollable.

Current rule:
- **Page content must be able to flow past the fold.** Give the scroll to `.main`.
- If side columns need to stay in view, make them `position:sticky` with their own
  `max-height` and internal scroll — that is what pinning the scroll to the column
  was trying to achieve anyway.
- A sticky toolbar band offsets those columns by its own height, so they sit below
  it rather than under it.

### 9.5 Required-field validation *(new — 2026-08-12)*

Save and Submit both refuse to proceed while a required field is empty:

- A `role="alert"` banner names the count and lists each outstanding field as a
  jump link (§5A.4).
- Each incomplete field takes `.rfield--invalid` — 1.5px red inset ring, red label,
  `aria-invalid="true"`.
- Focus moves to the first outstanding field.
- State is set **only** on a save/submit attempt, never on load: showing a form as
  broken before it has been touched is its own usability problem.
- Each field clears the moment it gets a value, and the banner retires when the last
  one is filled — the form stops shouting as it gets fixed, not on the next attempt.
- The same banner carries storage failures, and **Submit only advances the workflow
  step if the write succeeded**.

---

## 10. Tokenization Audit & Consolidation Plan

> This is the actionable core for the goal of *maximal token coverage, understanding scope,
> and eliminating variances/collisions* — and for making the future official-DS retrofit a
> token-remap rather than a rewrite.

### 10.1 Coverage *(re-measured 2026-08-12)*
- **≈80% tokenized** (9,809 `var()` vs 2,522 raw colour values). Target ≥95%.
- The two figures in this section disagreed with §1 at the last sync (7,943 vs
  9,064 `var()`); both are now measured the same way, over the same file set.
- **Most-repeated raw values that should be tokens:**
  | Raw value | Count | Should be |
  |---|---|---|
  | `#fff` / `#ffffff` | 205 | `--px-surface` / `--praxis-color-white` / `--px-primary-fg` (by context) |
  | `#1b838b` | 54 | `--praxis-color-teal-60` |
  | `#e30072` | 45 | `--praxis-color-pink-60` |
  | `#29d2d7` | 14 | (brand cyan — needs a named token, e.g. `--praxis-color-teal-accent`) |
  | `rgba(16,36,58,.05/.06/.09/.14/.18)` | ~195 | Praxis "ink" shadow family → shadow tokens |
  | `rgba(255,255,255,.06/.08/.10/.12)` | ~220 | Praxis dark edge/hover family → edge/hover tokens |

### 10.2 Duplicate / colliding naming schemes (consolidate to one)
| Concept | Competing schemes | Recommended canonical |
|---|---|---|
| Radius | `--praxis-radius-*` **+** `--r-*` | `--praxis-radius-*` (drop `--r-*`) |
| Spacing | `--praxis-space-*` **+** `--s-*` | `--praxis-space-*` (drop `--s-*`) |
| Type size | `--praxis-type-size-*` **+** `--t-*` | `--praxis-type-size-*` (drop `--t-*`) |
| Duration | `--praxis-motion-*` **+** `--dur-*` **+** `--d-*` | `--praxis-motion-*` (drop `--dur-*`, `--d-*`) |
| Easing | `--praxis-ease-*` **+** `--ease-*` | `--praxis-ease-*` (drop `--ease-*`) |
| Shadow/elevation | `--praxis-elevation-*` **+** `--px-*` shadows **+** `--shadow-*` **+** `--praxis-card` | Keep `--px-*` as Praxis material; make `--shadow-*`/`--praxis-elevation-*` alias to them |
| Status/tone | `--praxis-color-status-*` **+** `--tone-*` **+** `--praxis-status-*` **+** `--praxis-encoding-*` | `--tone-*` for chips; retire `--praxis-status-*` + `--praxis-encoding-*` (dead) |
| Surface | `--praxis-color-surface-*` **+** `--px-surface*` **+** `--color-surface-*` **+** `--glass-*` | `--px-*` for Praxis surfaces; `--color-surface-*` → alias; keep `--glass-*` distinct (blur material) |

The `--r-*`, `--s-*`, `--t-*`, `--d-*`, `--shadow-*`, `--color-*`, `--dur-*` families are **page-local shorthand aliases** re-declared inside `index.html` / `search-page.html`. They should be deleted and their references pointed at the canonical `--praxis-*` / `--px-*` tokens.

### 10.3 Genuine variances (same token, different real values — resolve)
| Token | Conflicting values | Fix |
|---|---|---|
| ~~`--praxis-radius-sm/md/lg`~~ | 4/8/12 vs 8/12/16 vs rem | ✅ **RESOLVED 2026-08-12** — Praxis 8/12/16 in `praxis-tokens.css`, all other declarations deleted. Was a *source*-only conflict: it already resolved to 8/12/16 on all 27 pages, so the fix was a verified no-op. |
| ~~`--praxis-ease-default`~~ | two curves | ✅ **RESOLVED 2026-08-12** — Praxis `cubic-bezier(.32,.72,0,1)`. Also source-only; already resolved identically everywhere. |
| `--d-fast/normal/slow` | 120/180/260 (index) vs 100/200/300 (search) | Collapse into `--praxis-motion-*`, one set |
| ~~`--praxis-motion-fast`~~ | 100ms (7 pages) vs 120ms (15) | ✅ **RESOLVED 2026-08-12 — 120ms**, by decision. The majority value, so the smallest change; the 7 record pages slowed by 20ms. This one *did* alter rendering, and is the only intended visual change in the consolidation. |
| ~~`--ph-pad-x`~~ | 20 / 24 / 32 px | ✅ **RESOLVED 2026-08-12 — 24px** at the desktop baseline. `index.html` came off 32px (its header still aligns with the widget grid, verified) and `search-page.html` off 20px. Search's narrower steps (16/12/10 at breakpoints) are a deliberate responsive ramp and were left. |
| `--adminnav-w` | 224px vs 260px | Remove the stale value |
| ~~`--praxis-color-surface-subtle`~~ | neutral-05 vs neutral-10 | ✅ **RESOLVED 2026-08-12** — neutral-10, the value 22 of 27 pages already resolved to. |
| `--praxis-type-font-sans` | base adds "Inter" | Align font stacks |
| `--praxis-space-4/8/12`, `--praxis-type-size-xs/sm` | `0.75rem` vs `.75rem` (equal) | Cosmetic only — normalize formatting |

*Contextual (by design, not bugs):* `--cn-tone` (per-group solution color) and `--card-header-pad` (responsive) legitimately take multiple values.

### 10.4 Dead tokens (defined, never referenced) *(re-measured 2026-08-12: **100**, not 30)*

The count grew because the earlier pass under-counted, not because 70 tokens were
added. **Most of the 100 are palette rungs** — `--praxis-color-{blue,green,orange,red,
pink}-{20,30,40,50,80,90,100}` — which are a complete scale by design and should
**not** be pruned; a design system keeps the whole ramp whether or not the current
screens use every step. The genuine prune candidates are the superseded systems
below, plus page-local singletons (`--active`, `--added`, `--custom`, `--clear`,
`--create`, `--current`, `--danger`, `--dot`) re-declared inside individual pages.

Original list (still valid):
`--praxis-encoding-1…6`, `--praxis-status-{good,critical,neutral,warning}(-bg/-strong)`, `--praxis-type-size-display`, `--praxis-color-{teal-90,yellow-60,yellow-90,text-accent,surface-inverse,status-info,interactive-focus}`, `--praxis-radius-xl`, `--praxis-elevation-2`, `--praxis-elevation-card-raised`, `--ease-spring-out`, `--ease-spring-bouncy`.
→ The `--praxis-status-*` / `--praxis-encoding-*` sets appear to be a superseded status system; `--tone-*` won. Remove or document as reserved.

### 10.5 Used-but-undefined *(re-measured 2026-08-12: 7 found, **3 are bugs**)*

A token can be legitimately absent from CSS if JS sets it at runtime. Separating the
two by grepping for `setProperty` — the previous sync's list did not, and got one
wrong:

| Token | Used in | Verdict |
|---|---|---|
| `--praxis-radius-lg` | `contextual-awareness.html` | **Bug** — typo; should be `--praxis-radius-lg` or a px value |
| `--muted` | `praxis-mazlan.css` | **Bug** — defined nowhere |
| `--ph-pad-top` | `praxis-pageheader.css` | **Bug (new)** — a shared sheet reading a token nothing defines |
| `--reveal-i` | `contextual-awareness.html` | **Not a bug** — set per element at runtime (listed as a bug at the last sync; that was wrong) |
| `--asgcard-tone` | `index.html` | Not a bug — set inline per card |
| `--filter-modal-h` | `praxis-filters.css` | Not a bug — set by `praxis-filters.js` |
| `--rm-list-h` | `report-management.html` | Not a bug — set at runtime |

→ Fix the three; leave the four, and **document the runtime-set convention** so the
next audit does not re-flag them.

### 10.6 Recommended roadmap (ordered)
1. **Delete page-local alias scales** (`--r/s/t/d/dur/shadow/color-*`) in `index.html`/`search-page.html`; repoint refs to `--praxis-*` / `--px-*`. (Removes ~40 duplicate tokens, most collisions.)
2. **Fix the 3 undefined tokens** and prune the 30 dead ones.
3. **Resolve the radius + easing + duration variances** to single canonical values.
4. **Tokenize the top raw values** (`#fff`, teal/pink literals, the rgba shadow/edge families) — biggest coverage win.
5. **Extract per-page inline component CSS** into shared files where it's genuinely shared (chrome already is; workspace/record widgets are the largest remaining inline surface).
6. **Add a named brand-cyan token** (`#29D2D7`) and a documented AI-gradient token.

### 10.7 Why this matters

Praxis is the system teammates will consume, so a token has to mean one thing. Once (1)–(4)
are done every surface reads from a single unambiguous set — `--praxis-*` foundations plus
`--px-*` materials — which is what makes the token layer publishable at all, and what makes
a future change a one-file edit rather than a hunt across 27 pages of inline hex.

*(This section previously justified the work as preparation for retrofitting an official
EHSQ-E system. That project is defunct; the work stands on its own merits.)*


---

## 11. Lineage (historical)

Praxis is the design system. This section is kept only so the origins of its vocabulary are
traceable — **neither predecessor is live**:

- **EHSQ-E Design System** — a VitePress/Vue monorepo that supplied the original token
  vocabulary, the BEM convention and the base component set. **Defunct.** Praxis replaced it.
  Its `--ehsq-*` prefix was renamed out on 2026-08-12 (§13.7).
- **Helix** — Ideagen's corporate system, which EHSQ-E had diverged from. **Also defunct.**
  Praxis therefore answers to no upstream: there is no divergence to track and no retrofit
  to prepare for.

What Praxis added on top of that inheritance, and now simply owns:

| Aspect | Inherited | Praxis |
|---|---|---|
| Theming | light only | light **+ dark** (`data-theme`) |
| Elevation | neutral box-shadow scale | slate lit-edge material (`--px-*`, `--praxis-card`) |
| Radius | 4/8/12 | **8/12/16** |
| Icons | Material Symbols | **Lucide** (runtime converter) |
| Signature | — | Mazlan teal→magenta AI gradient |
| Surfaces | flat white/subtle | frosted glass + dot-grid page texture |
| Default easing | `cubic-bezier(.2,0,.38,.9)` | `cubic-bezier(.32,.72,0,1)` |

The archived predecessor references live in `design-system/archive/`.


---

## 12. Token Adoption Sweep — 2026-07-30

**292 hardcoded colour literals replaced with tokens**, verified as a visual no-op against a
baseline of 27,212 rendered elements across 24 pages x 2 themes (26 computed properties per
element, plus a full-page pixel diff): **0 style differences, 0 pixel differences**.

### The safety rules used — and why substitution alone can't finish the job

A literal may only be swapped when **all** hold:

1. The token resolves **identically in light and dark**. Most `--praxis-*` semantics and every
   `--px-*` are theme-varying; swapping one for a literal silently changes the other theme.
2. It resolves to the **same value on every page**. Verified in-browser, not read from source.
3. For a shared stylesheet, the token is defined on **all** pages; for a page's own `<style>`,
   on that page. Four record variants and both process-map pages don't load
   `praxis-core.css`, so a token that exists elsewhere simply doesn't resolve there.
4. Rewrites are confined to `<style>` blocks. A hex inside `<script>` would become a `var()`
   string Highcharts and canvas can't resolve; SVG presentation attributes can't safely take
   `var()` either.

Only **17 tokens** cleared all four — `--praxis-color-white`, the brand teal/pink, and the
neutral + status palette primitives. Everything semantic (`--px-surface`, `--praxis-color-text-*`,
`--praxis-color-border-default`, …) is theme-varying by design and is *correctly* excluded.

### What remains, and why

341 literals stand. They are not all debt:

| Group | Count | Verdict |
|---|---|---|
| Gradient stops, shadow tints, backdrop composites | ~180 | **Correct as literals.** e.g. the opaque soft-primary stops *are* the composite of a translucent cyan over the page; a token would misrepresent them. |
| Theme-sensitive (match one theme's value only) | ~120 | Need a semantic decision, not a substitution. |
| Recurring values with no token | ~40 | Genuine gaps — candidates for new tokens. |

**Conclusion (as written 2026-07-30):** "few if any hardcoded values" is not reachable by
substitution while the token layer is redefined per page. The prerequisite is consolidating
that layer — migrating the four record variants and two process-map pages onto
`praxis-core.css` — after which the swap should be re-run and the clearable set will grow
substantially.

> **Update 2026-08-12 — that prerequisite is now met.** All five `record-page-*` variants
> and both `process-map-*` pages link `praxis-core.css` today (verified by reading the
> `<link>` tags, not the file list). The blocker described above is gone, so **the sweep is
> re-runnable and is the single highest-value token task outstanding** (§13). The
> in-browser resolution pass has *not* been re-run at this sync, so the "only 17 tokens
> clear all four rules" figure is stale in the conservative direction — expect more.

---

## 13. Sync Audit — 2026-08-12

A two-way check: what the app does that this document did not describe, and what
this document claimed that the app no longer does. Everything here was measured
against `prototype/**`, not recalled.

### 13.1 App → doc: what was missing (now added)

| Area | Status |
|---|---|
| **The whole field system** (`praxis-rfield.css`, 124 rules) | Was **entirely absent** — `rfield`, `pillset`, `rref`, `rtable`, `subsec`, `mazbtn`, `form-alert` had zero mentions. Now **§5A**. |
| **Workflow-step model** (`data-step`, step order, collapse-on-pass) | Absent. Now **§5B**. |
| **Filters system** (`praxis-filters.css`, **402 rules** — the largest shared sheet after Mazlan) | Absent from the file map and inventory. Now in **§3 / §8**. |
| **Quick-filter rail**, **compact toolbar**, **profile menu**, **filters-local** | Absent. Now in **§3 / §8**. |
| **Storage + serverless function** | Absent — the doc described a purely static prototype. Now in **§1 / §3 (Layer 6)**. |
| **New pages** `record-page-initiate.html`, `saved-records.html`, `profile.html` | Absent. Now in **§3 / §8**. |
| **8 `--px-*` tokens** incl. `--px-field`, `--px-toolbar-gutter` | Absent from the §5 table. Now listed with light/dark values. |
| **Stacking, scrolling and validation patterns** | Absent. Now **§9.3 / §9.4 / §9.5**. |
| **`praxis-lucide.js` specificity behaviour** | Absent, and it is a trap: the converter injects `svg.material-symbols-rounded{…}` at (0,1,1), which outranks a plain class selector. Now noted in **§3 Layer 5**. |
| **Two process-tree implementations** sharing no markup | Absent, and it caused a real bug this week (a fix applied to the hidden view only). Now flagged in **§8**. |

### 13.2 Doc → app: claims that had gone stale (now corrected)

| Claim (2026-07-30) | Reality (2026-08-12) |
|---|---|
| "Four record variants and both process-map pages don't load `praxis-core.css`" (§12) | **False now.** All seven link it. The stated prerequisite for finishing the token sweep is **met**. |
| Token surface: 302 defined / 9,064 `var()` / 78% | **315 / 9,809 / 80%.** |
| `--px-*` = 29 tokens | **37.** |
| Dead tokens = 30 | **100** — but most are palette rungs that should *not* be pruned (§10.4). |
| Used-but-undefined = 3 bugs, incl. `--reveal-i` | **7 found, 3 are bugs.** `--reveal-i` is set at runtime and was mis-flagged; `--ph-pad-top` is a new, real one. |
| §10.1 said 7,943 `var()` while §1 said 9,064 | The two sections disagreed. Both now measured identically. |
| "Field (`.field`) — record-detail row (8 types)" was the whole field story | `.field` is now one of *two* representations, and the interactive one is a different shape entirely (§5A). |
| Fields described as "1px `neutral-20` border, `--px-surface-2` fill" | Both wrong now: **no border**, `--px-field` fill. |

### 13.3 Real inconsistencies still in the app

Found while auditing; **not** fixed, because each needs a decision rather than an edit.

1. ✅ **RESOLVED 2026-08-12 — `praxis-filters.css` absorbed.** See §13.6.
2. **Three used-but-undefined tokens** (§10.5): `--praxis-radius-lg`, `--muted`,
   `--ph-pad-top`. The last is in a *shared* sheet, so it affects every page that
   loads `praxis-pageheader.css`.
3. **`--px-gutter` vs `--px-toolbar-gutter`** — different axes, confusably similar
   names. Documented in §5; renaming one (e.g. `--px-gutter-x`) would be clearer.
4. **Two summary-card `.field` colour tokens reach for the raw neutral scale**
   (`neutral-70` / `neutral-90`) and need two dark-mode overrides to stay legible.
   The field system uses the semantic tokens instead and needs none. `.field`
   should follow.
5. **`.section__note` was removed** from the record page but the pattern it served —
   telling the user which step owns a frozen section — is now unlabelled. The
   collapse state carries some of that meaning; whether it is enough is a design
   question.
6. **The summary card's Source / Incident Type / Severity / Injuries Involved are
   demo values** nothing captures at Initiate, so a real record shows invented
   classification data.
7. **Two static rows exceed `--px-static-field-h`** where content genuinely cannot
   fit one line (§5A.3).
8. ✅ **RESOLVED 2026-08-12 — the measurable content is generated.** See §13.6.

### 13.5 Consolidation performed — 2026-08-12

The audit above was acted on the same day. What changed, and the evidence.

**One foundation.** `praxis-tokens.css` (160 tokens) is now the only place the `--praxis-*`
foundation is declared. Removed: 11 inline `:root` blocks (~73 tokens each),
`praxis-admin.css`'s 67-token palette, `concierge-base.css`'s 151, and 25 duplicated
theming declarations in each of 4 record variants — those last were **byte-identical** to
`praxis-core.css`, verified before deletion. 25 files link the shared file;
`build-admin.py` was patched so the 10 generated admin pages keep it.

**Tokens defined in 2+ files: 166 → 130.** What remains is intentional:
`praxis-core.css` (25 — the Praxis overrides and dark remaps), `praxis-filters.css` (21 —
the ported sheet, §13.3 #1), `praxis-workspace.css` (9 — dark remaps in a shared sheet),
and a handful of page-level dark component tints.

**Verification.** A baseline was captured *before* any edit — recovered via `git stash` so
it was the true pre-change state — covering **74,770 body elements** across 27 pages × 2
themes at 19 computed properties each. Body-only, deliberately: the `<link>` added to each
page sits in `<head>` and would otherwise shift every index and mask the comparison. (My
first attempt did exactly that and reported a clean pass on the pages it had skipped.)

Every difference is accounted for:

| Difference | Cause |
|---|---|
| 7 record pages | `--praxis-motion-fast` 100 → 120ms — the one intended visual change |
| 13 admin/report/profile pages | `--praxis-color-text-tertiary` **undefined → defined** |
| 3 pages | Nondeterministic between two *identical* captures — entrance animations still running at the 500ms sample. Confirmed by capturing twice with no edits between. |
| Everything else | Byte-identical, including the radius and easing collapse |

**Latent bugs the consolidation fixed.** Both were tokens *used* while defined nowhere the
page could see:
- `--praxis-color-text-tertiary` — used in `praxis-navrail.css` and 16 times across
  report-management, profile and saved-records, defined on none of those 13 pages. Its two
  candidate values were not equivalent: **`#616f7e` measures 5.14:1 on white (passes AA)**,
  `#8b98a6` measures **2.94:1 (fails)**. The canonical file takes `#616f7e`, which is also
  the value the earlier system used.
- `--praxis-color-border-subtle` — used unguarded in `praxis-mazlan.css`, defined only in
  `concierge-base.css`, which 23 of 27 pages do not load.

Two others looked broken and were not: `--praxis-navrail-width` carries `, 56px` fallbacks at
all three call sites, and `--praxis-elevation-card` is remapped by `praxis-core.css`.

**Process-map dark mode** — fixed as described in §8. The dark CSS already existed and was
simply unreachable.

**Why this matters for publication.** The reason a published token set could not previously
be trusted is now gone: the values in `praxis-tokens.css` are the resolved values the app
actually renders, from one file, verified against a 74,770-element baseline.

### 13.6 Filters absorbed, and the docs made generated — 2026-08-12

**The filters sheet is now owned here.** `praxis-filters.css` carried a v1.5 adapter block
declaring a parallel `--s/--r/--t/--d/--color/--shadow/--ease` vocabulary mapped onto the
Praxis layer, with "re-extract to upgrade, don't hand-edit" as the standing rule — so one
component had an upstream owner and local fixes were disposable.

- **342 `var()` references rewritten** to canonical tokens; the adapter block is gone.
- `--praxis-motion-normal` (180ms) and `--praxis-motion-slow` (260ms) existed *only* inside that
  adapter. Promoted to `praxis-tokens.css`, values unchanged.
- Its aliases were scoped to the filter roots specifically because `search-page.html`
  declares the same `--s/--r/--t` names for its Calendar module. With the aliases gone that
  collision cannot recur.
- **The field treatment is fixed** — `.filter-search-input input` and `.cf-input` were the
  last surfaces on the pre-2026-08-12 look (1px `neutral-20` on `--px-surface-2`). They now
  take the borderless `--px-field` treatment with the same inset focus ring, hover, and an
  AA-passing placeholder: measured **4.94:1** (was `neutral-50`).
- The header now says the prototype owns the file and that re-extracting would silently
  revert both the de-aliasing and the field treatment.

**Not** done in that sheet: its dark mode works by **flipping palette primitives** inside
the filter scope (`--praxis-color-neutral-100:#f2f5f9`, teal/red/pink brightened — 21
declarations). It is contained and it works, but a component redefining primitives is the
wrong shape for a published system: anything inside that scope has different meanings for
`neutral-90`. Fixing it means rewriting ~189 colour usages in 403 rules onto semantic
tokens. Scoped, documented, and left as a deliberate exception rather than done badly in a
hurry.

**The docs no longer duplicate facts.** `design-system/build-ds.py` measures the
stylesheets and injects the results into both artifacts between `<!-- GENERATED:name -->`
markers:

| Generated | Written by hand |
|---|---|
| token-surface stats, the full foundation token table (light + dark), the shared-sheet inventory, the DS page's badges | every narrative section — principles, patterns, decisions, this audit's reasoning |

`build-ds.py --check` exits non-zero when a generated block is stale, so CI can hold the
line. It also derives the used-but-undefined list itself, filtering tokens that JS sets at
runtime — the exact distinction the 2026-07-30 sync got wrong by hand.

What remains hand-maintained is prose, in one file. The HTML page still renders its swatches
live from the CSS, as it always did.

### 13.7 Praxis becomes the system — 2026-08-12

The EHSQ-E Design System project was confirmed defunct, and Helix with it. Praxis is not an
extension of anything; it is the system. That changed the codebase and this document.

**The prefix is gone.** `--ehsq-*` → `--praxis-*` across **9,067 references**, plus three
component families whose class names carried the old name: `.ehsq-navrail` (832 references),
`.ehsq-rfpopup` (181), `.ehsq-rfguide` (155). No back-compat aliases — the prototype was the
only consumer, so a clean break was cheaper than a deprecation path. `--ehsq-radius-12`, a
typo that had resolved to nothing, was fixed to `--praxis-radius-lg` on the way.

*Proven invisible.* A rename touching 9,000 references needs more than a spot check. Both
pages that a whole-app diff had flagged were re-tested by serving an inverse-renamed copy of
the entire prototype alongside the real one and comparing computed styles element by element:
**1,385 and 1,215 elements, 23 properties each, zero differences.** The flags turned out to be
artifacts — one from a `vercel dev` process that had degraded to `spawn EBADF` mid-capture,
and the first isolation attempt was itself buggy (it renamed a *stylesheet filename*, so the
comparison copy had an unstyled nav rail).

**Miramar pruned.** The frozen "before" comparison variant is gone: 6 hidden guide/tree view
blocks, 14 `body[data-variant="miramar"]` rules, 7 dead variant-switcher JS lines, and the
orphaned comments. `isPraxis()` is now `return true` with its ~44 call sites left inert, to be
deleted mechanically later. `data-variant="praxis"` stays — every Praxis selector is written
against it.

*A mistake worth recording:* removing the switcher's `const verBtns = …` left code that still
called `verBtns`, so seven record pages threw a **runtime** ReferenceError. `node --check`
passed — it is a syntax checker — and the damage only showed as a **175-element drop** in the
DOM, because the Create New flyout and module selector are JS-populated and never rendered.
Element counts caught what a syntax check could not.

**`concierge-base.css` resolved.** Measured which of its 242 rules actually matched anything,
per page: `login`, `animation-lab` and `ds/index` used **6 each** — all generic resets. Those
now load a 20-line `praxis-reset.css` instead of a 44KB legacy sheet, byte-identically.
`contextual-awareness.html` genuinely uses 61 rules, so the remainder was renamed
`praxis-chrome-legacy.css` with a header saying it has one consumer and should die with it.

**21 tokens pruned.** The `--praxis-status-*` / `--praxis-encoding-*` families were retained
"for parity with the EHSQ-E base". Parity with a defunct system is not a reason, and nothing
referenced them.

**Docs reframed.** The opening premise, §1, §2, §4, §6, §7, §10.7 and §11 all asserted that
Praxis was a layer awaiting an official retrofit. §11 is now *Lineage (historical)* and states
plainly that both predecessors are dead. The old references moved to
`design-system/archive/` with a header warning not to re-sync them.

### 13.4 Highest-value outstanding work, ordered

1. **Re-run the token adoption sweep** (§12). Its blocker is gone and it is the
   biggest single coverage win available.
2. **Fix the three undefined tokens**, starting with `--ph-pad-top` (shared sheet).
3. ~~Resolve the filters-sheet field treatment~~ — ✅ done, §13.6.
4. **Delete the page-local alias scales** (`--r/s/t/d/dur/shadow/color-*`) per
   §10.6 (1) — still outstanding from the last sync.
5. **Point `.field` at the semantic text tokens** (13.3 #4), retiring two dark-mode
   overrides.
6. ~~Decide whether `prototype/ds/index.html` is generated~~ — ✅ done, §13.6:
   the facts are generated into both artifacts by `build-ds.py`.

---

*Last synced **2026-08-12** from the groom-lake `prototype/` sources (previous sync
2026-07-30). Token values and counts are measured, not estimated; where a value is
theme-dependent both light and dark are given.*

*What was measured at this sync: file inventory, token definitions/usages/dead/undefined
across 16 CSS + 27 HTML `<style>` blocks, component surface by rule count per shared sheet,
runtime-set tokens separated from genuine bugs, and every §12 claim re-checked against the
`<link>` tags. What was **not** re-run: the in-browser resolution of token values across
pages x themes that the 2026-07-30 sweep performed — so figures that depend on resolved
values (§12's "only 17 tokens clear all four rules") remain stale in the conservative
direction. §13 lists the two-way drift found and what is still inconsistent.*
