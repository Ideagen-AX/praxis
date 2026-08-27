# Praxis roadmap — patterns and components not yet defined

Not one of [the four docs](CLAUDE.md#the-four-docs). This is the working backlog:
it is for us, it is not generated, and it is **not** in `package.json`'s `files`
array, so it does not ship in the npm tarball. That last part is deliberate — a
published roadmap is a published promise, and every item below is currently
nothing but an intention.

Compiled 2026-08-25 by inventorying `src/` against six design systems read in
full: the [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/)
(30 interaction patterns — the canonical list), [Atlassian](https://atlassian.design/components)
(~90 components), [shadcn/ui](https://ui.shadcn.com/docs/components) (~64),
[GitHub Primer](https://primer.style/components) (~62),
[GOV.UK](https://design-system.service.gov.uk/components/) (35 components and
31 named patterns) and [IBM Carbon](https://github.com/carbon-design-system/carbon/tree/main/packages/react/src/components)
(partial — the file listing truncated at `ProgressIndicator`, so A–P only). Plus
[an enterprise data-table pattern analysis](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
and material on wizard and approval flows.

**Material 3, Fluent 2, Adobe Spectrum and Salesforce Lightning were not read** —
all four render their component index in JavaScript or 404 on it. Recorded here
rather than glossed over. Lightning is the closest enterprise peer to EHSQ
Enterprise and is the one most worth going back for; the other three are unlikely
to add a category the six above missed.

## How to read the tiers

Tier is **evidence of need**, not difficulty. Tier 1 is what the `groom-lake`
prototype is provably hand-writing today or cannot express at all. Tier 2 is
common across the reference set *and* load-bearing for this domain — regulated
EHS and quality work, so incidents, audits, CAPA, MOC and permit to work. Tier 3
is completeness.

## Two findings that reframe the list

**Praxis names by domain, not by component.** A grep for `tooltip`, `modal`,
`tabs`, `badge` finds nothing, which is misleading: the modal is `.cn-modal`, the
tabs are `.admin-tabs`, the badge is `.admin-pill`, and there are six separate
popover surfaces. Any gap analysis that trusts generic names will be wrong. Every
"missing" claim below was checked semantically instead.

**Six more name-only families than `gaps.html` currently lists.** `.pager`,
`.capa-prio`, `.subtab`, `.upnext`, `.rep` and `.qa` have no base rule anywhere —
they exist only as hover, press or dark-mode fix targets, exactly like `.btn`.
`.pager` is the one that matters: that is pagination, and every list view needs
it. These should join the hand-verified table on `gaps.html` whether or not the
components below get built.

---

## Decisions taken 2026-08-25

1. **Scope: all three tiers get a stub page.** A visible backlog beats a tidy
   one. Tier 3 stubs will sit unfilled for a long time and each must say so on
   its face, or a stub reads as a promise.
2. **Promotions are aliases, not renames.** Where a complete component wears a
   page-specific name, define the neutral name as the canonical one and keep the
   old selector as an alias. `groom-lake/prototype` vendors a built copy via its
   own `sync-praxis.py`, so a rename is a coordinated two-repo change; an alias
   costs one selector and breaks nothing.
3. **The domain patterns are first-class Praxis components.** Audit trail,
   comment thread and e-signature attestation are the same shape in every EHSQ
   module. Defining them once here is what the system is for — and the four
   controls promoted in 0.1.9 are the standing evidence of what happens when we
   don't.
4. **All three foundation gaps are in, RTL as an audit first.** Print and
   forced-colors get real rules. RTL gets a page that measures the cost and
   commits to nothing.

---

## Tier 1 — the prototype is hand-writing these now

| # | Item | Why it is a gap | Reference |
|---|---|---|---|
| 1 | **Tooltip** | Zero rules and zero JS. Praxis ships icon-only buttons in four places — `.iconbtn`, `.tbtn--icon`, `.appbar__iconbtn`, the nav rail — with no way to label them on hover. Accessibility gap as much as a visual one | APG *Tooltip*; all six |
| 2 | **Confirm / alert dialog** | `.cn-modal` is the Create New modal and `.filter-drawer` is the filter drawer. There is no generic destructive-action dialog, so voiding a permit or deleting a finding has nowhere to go | APG lists *Alert and Message Dialogs* separately from *Dialog* |
| 3 | **`.btn` base** | Already on `gaps.html`. The single highest-traffic hole in the system: `.btn--primary` styles a fill with no box, so a `.btn` renders as coloured text | all six |
| 4 | **`.card` base** | `.admin-card` is complete but named for one section. Alias per decision 2 | all six |
| 5 | **Pagination** | `.pager` / `.pager__btn` are name-only — hover and disabled states over no base | all six |
| 6 | **Empty state** | Three ad-hoc versions already: `.cf-empty`, `.admin-table__empty`, `.tb-dropdown__empty`. Classic drift-before-promotion signal | Primer *Blankslate*, Atlassian, shadcn |
| 7 | **Error summary** | `.form-alert` and `.req` exist; nothing aggregates a form's errors to the top and links to each field. For regulated data entry this is the difference between a usable form and a guessing game | GOV.UK — their accessibility centrepiece |
| 8 | **Loading states** | Nothing but `.mazlan-typing`. Needs skeleton, spinner and inline loading | all six |

## Tier 2 — common, and this domain needs them

| # | Item | Why it is a gap |
|---|---|---|
| 9 | **Stepper / progress tracker** | `.capa-prio` is name-only. CAPA stages, permit-to-work states and MOC approvals are all staged work, and the staging is the primary affordance |
| 10 | **Accordion / disclosure** | `.section__header` has a tick, a flex `order` and a collapse rotation — and no base. Long audit checklists need this to be a component, not a per-page rebuild |
| 11 | **Tabs, promoted** | `.admin-tabs` works and is admin-named; `.subtab` is name-only |
| 12 | **Date picker and range** | Exists *only* inside the filter system. A record form date field has no picker at all |
| 13 | **Select / combobox** | Same shape of problem: `.filter-select` and `.cf-select` are filter-scoped, and `.rfield` has no select control | 
| 14 | **File upload / attachment** | Nothing. Incident photos, audit evidence, CAPA documents — every module needs it |
| 15 | **Avatar and avatar group** | `.appbar__avatar` only, welded to the app bar. Assignment, comments and sign-off all need it standalone |
| 16 | **Timeline / audit trail** | The most domain-critical miss on the list. Every regulated record needs an immutable, legible history, and Praxis has no way to draw one |
| 17 | **Comment thread** | Nothing. Mazlan is AI conversation, not human annotation on a record |
| 18 | **E-signature / attestation** | Sign-off with attribution and timestamp is a regulated requirement, not a feature. No general design system ships this, which is exactly why it belongs here |

## Tier 3 — robustness

Each of these is real, and none is urgent. A stub that sits unfilled for a year
should say on its face that it is a placeholder.

| # | Item | Note |
|---|---|---|
| 19 | **Tree view** | `.rref` and `.admin-menulist` are adjacent to it; neither is a tree. Org hierarchies, site and asset trees, document folders | 
| 20 | **Data grid extensions** | Column pin, reorder, resize, density control, saved views, row expand. `.colmenu` and `.sortmenu` exist in `praxis-toolbar-compact.css`; density and pinning do not. This is where enterprise tables live or die |
| 21 | **Table base, promoted** | `.admin-table` is complete and admin-named. Alias, per decision 2 |
| 22 | **Slider / range** | Risk matrices and severity scales |
| 23 | **Number input** | Including the stepper affordance |
| 24 | **Character count** | Regulated free-text fields are often capped, and the cap has to be visible before submit |
| 25 | **Inline edit** | Both Atlassian and Carbon ship it; the biggest single win inside a grid |
| 26 | **`kbd` / shortcut hint** | Primer *KeybindingHint*, shadcn *Kbd* |
| 27 | **Command palette** | Power-user navigation in an app with twenty modules |
| 28 | **Copy button** | Reference IDs get copied constantly — `INC-2024-0417` is in every screenshot in the reference site |
| 29 | **Bare `<input type="radio">`** | Praxis styles the bare checkbox in `praxis-core.css` and does not style radio. `.pillset`/`.pill` covers picklists-as-radios, so the asymmetry is in the plain case only |
| 30 | **Separator** | No tokenised rule component |
| 31 | **Breadcrumb overflow** | `.breadcrumb` exists with no truncation behaviour for deep hierarchies |
| 32 | **Meter / gauge** | Compliance percentage, risk score | APG *Meter* |

## Foundations — not components, and they will not fit the stub format

| # | Item | State today |
|---|---|---|
| F1 | **Print stylesheet** | **Zero** `@media print` in `src/`. Regulated records are printed and PDF'd as evidence; in nuclear and pharma that is a functional requirement, not a nicety |
| F2 | **Forced colors / high contrast** | **Zero** `forced-colors` or `prefers-contrast`. Common in industrial and government environments and it appears in procurement checklists. Praxis leans hard on `box-shadow` for structure and shadows vanish entirely in forced-colors — the shell would lose most of its shape |
| F3 | **RTL — audit only** | 82 physical `left:`/`right:` declarations against 12 logical `*-inline` ones. The page measures the cost and commits to nothing; the cost grows every sprint either way |

Credit where it is due: `prefers-reduced-motion` is handled in 7 places and
`focus-visible` in 29. Those were done properly and are not on this list.

---

## Stub page convention

Settled 2026-08-25. Every planned page carries `tier: planned`, which puts it in
a neutral *Planned* pill on its page — it sits in its component layer with
everything else, since the 2026-08-26 restructure grouped the nav by layer
rather than by tier — and
opens with a `.note--planned` callout — the section and the pill are both easy to
miss when a page is deep-linked to, so the status is stated three times on
purpose.

The section skeleton is taken from the previous EHSQ-E design system docs
([example](https://ehsqe-design-system-docs.vercel.app/components/create-new-menu.html)),
which uses the same thirteen headings on every component page. Kept in that order:

1. Anatomy · 2. Variants · 3. States · 4. Responsive behavior ·
5. Interactive demo · 6. Code · 7. **Markup contract** · 8. Token reference ·
9. Figma adaptation · 10. Usage guidelines · 11. Accessibility · 12. Dimensions ·
13. Helix alignment

Two adaptations, both forced by what Praxis is:

- **API → Markup contract.** The reference site's API section is Vue props,
  events and TypeScript interfaces. Praxis ships no framework bindings, so there
  are no props and no events; the contract is the markup, the classes, the ARIA
  attributes and — where a script exists — its entry point. Keeping the heading
  "API" over that content would be describing a thing Praxis does not have.
- **Figma adaptation stays and says "not mapped".** Praxis has no Figma library.
  The section is kept rather than dropped so the absence is recorded once per
  page instead of being silent.

Three rules for the content itself, because a stub that says "TBD" thirteen times
is worse than no page:

- **Every section says something specific.** Where a decision is open, name the
  options and the trade-off. Where a value is proposed, say which existing token
  it comes from.
- **Show the current state, not a mock-up.** Where there is something real to
  look at — the icon buttons that have no tooltip, `.btn` rendering as coloured
  text beside a working `.tbtn` — put it in a live `<template>`. Where there is
  not, say "nothing to demo" and why.
- **Helix alignment is an open question, not a guess.** None of these has been
  checked against Helix. Each says so and names the specific thing to check. This
  needs the `helix-knowledge` reference to close.

### Excluded from PRAXIS-FOR-AGENTS.md

`tier: planned` pages are **not** rendered into the agent guide, and that is not
a size decision. That file ships in the npm tarball and its contract, stated at
the top of `CLAUDE.md`, is that it says what Praxis *defines*, not what it
intends. A planned page describes a component with no rule in `src/`; putting it
in the guide invites an agent to write markup against a class that does not
exist — which is the exact failure `.btn` causes today.

They stay on the site, where a human reads the section heading and the pill. An
agent grepping one markdown file for a class name does not.

## Progress

Complete as of 2026-08-25. All 35 items have a page.

| Tier | Stubbed | Note |
|---|---|---|
| 1 | **8 of 8** | tooltip, dialog, btn, card, pagination, empty-state, error-summary, loading |
| 2 | **10 of 10** | stepper, accordion, tabs, date-picker, select, file-upload, avatar, audit-trail, comments, signature |
| 3 | **14 of 14** | tree, data-grid, table, slider, number-input, character-count, inline-edit, kbd, command-palette, copy-button, radio, separator, breadcrumb-overflow, meter |
| Foundations | **3 of 3** | print, forced-colors, rtl — under `foundations/`, not `components/`, because none of them is a component |

The 32 component stubs sit in their component layer, marked *Planned*. The three
foundation pages sit with the other foundations and **are** in
`PRAXIS-FOR-AGENTS.md`: "Praxis has no print stylesheet" is a fact an agent
benefits from knowing, and each page states it in its opening callout. A planned
*component* is different — that would invite markup against a class that does not
exist.

### Helix alignment removed

Dropped from every page 2026-08-25 on instruction. It had been an open question
on all eight Tier 1 stubs and closed on none of them, so it was a heading with a
placeholder under it thirty-two times over. The section skeleton is now twelve
headings, not thirteen.

### The existing pages were brought into line

All 18 pre-existing component pages were restructured to the same skeleton. Their
prose was preserved verbatim and demoted to `<h3>` under the canonical heading it
belongs to; the sections none of them had — Responsive behavior, Token reference,
Usage guidelines, Accessibility, Dimensions — were written from `src/`.

That pass surfaced defects worth listing separately from the roadmap, because
they are live rather than planned:

- **`.admin-tab` has no `:focus-visible` rule.** A keyboard user gets the UA
  outline over a 2px bottom border, which is where it is least visible. Recorded
  on the admin and tabs pages.
- **`.admin-tabs` in the current examples carry no tab roles**, so they are a row
  of buttons with tab paint.
- **The switch lives in `praxis-admin.css`**, so a record page wanting a toggle
  either loads the whole application shell or writes its own — the same problem
  `praxis-controls.css` was created to solve.
- **`praxis-workspace.css` hard-codes its hover fills** as raw `rgba()` pairs
  rather than tokens, in a sheet that predates the material layer.
- **`praxis-mazlan.css` ships without its markup**, so fifteen class families
  have no contract to build against and its accessibility cannot be assessed
  from this package at all.

### The skeleton is a build gate

`skeleton_problems()` in `build-site.py` fails the build when a component page is
missing a canonical section, has them out of order, or duplicates one. Extra
headings are allowed and expected — the old EHSQ-E nav-rail page inserts three of
its own between Variants and States — so what is checked is that all twelve are
present and in canonical *relative* order.

Foundation pages are exempt. They are essays about the system rather than
documentation of one component, and forcing an "Anatomy" heading onto the colour
page would produce a heading with nothing under it.

The adapter that did the conversion refused to write a file when an existing
section had nowhere to go, which caught three sections that would otherwise have
been silently dropped — `Why this page is in the unstable tier`, `Profile menu`
and `Skip link`.

## Constraints for the stubbing step

Three build gates shape what a stub page may say. All three were checked, not
assumed:

- **`classes:` may name a family that does not exist yet.** `coverage()` runs one
  way only — every family in `src/` must be claimed by a page, not the reverse.
  So a stub page reserves its future class names for free, and the gate starts
  enforcing the moment the CSS lands. This is the useful direction.
- **`sheet:` may NOT name a file that does not exist.** `render_meta()` fails the
  build on a missing sheet. A stub for an unwritten component must omit `sheet:`
  entirely rather than name the sheet it will eventually live in.
- **`icon:` must be one of the 198 ligatures `praxis-lucide.js` maps.** Anything
  else fails the build rather than rendering the fallback circle.

And one that shapes the ordering: adding a class family to `src/` *forces* a page
to claim it. So the aliases in decision 2 cannot land before their pages exist —
which is an argument for stubbing first and filling second, in that order.
