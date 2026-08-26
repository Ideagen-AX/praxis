#!/usr/bin/env python3
"""
Measurement of src/ — the one implementation, shared by every generator.

WHY THIS FILE EXISTS
    build-ds.py measured src/ to inject facts into DESIGN-SYSTEM.md. build-site.py
    needs the same facts to render the reference site. Two copies of "how do you
    find a token definition" is exactly the drift this repo keeps eliminating
    elsewhere, and the regexes involved have both been wrong before in ways that
    were invisible for weeks (see the anchoring note on DEF below).

    So: measurement lives here and returns data. Rendering lives in the callers —
    markdown in build-ds.py, HTML in build-site.py. Nothing here knows about
    either output format.

STDLIB ONLY
    publish.yml documents this build as having nothing to pip install, and the
    Pages deploy relies on the same property. Keep it that way.
"""
import collections
import glob
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')

# A custom-property DECLARATION always starts one: it follows `{`, `;` or a line
# break. Without that anchor this also matches BEM modifiers in selectors —
# `.chip--danger:hover{…}` reads as a token named `--danger` — which inflated
# every count produced before 2026-08-13 (206 reported vs 195 real) and, worse,
# let those phantoms mask genuinely undefined tokens.
#
# The VALUE half is `[^;{}\n]*`, not `[^;}]*`. The latter matches newlines, so a
# line of comment prose shaped like a declaration runs on to the next real
# semicolon and silently eats the comment's closing `*/`.
DEF = re.compile(r'(?:[{;]|^)\s*(--[A-Za-z0-9_-]+)\s*:\s*([^;{}\n]*)', re.M)
USE = re.compile(r'var\(\s*(--[A-Za-z0-9_-]+)')

COMMENT = re.compile(r'/\*.*?\*/', re.S)
URL = re.compile(r'url\([^)]*\)')
QUOTED = re.compile(r'"[^"\n]*"|\'[^\'\n]*\'')


def strip_noise(css):
    """Remove comments, url() values and quoted strings before scanning for classes.

    All three yield phantom class names to a `\\.([a-zA-Z][\\w-]+)` scan:
    `url(fonts/Gilroy-Regular.woff2)` reads as `.woff2`, an SVG namespace
    `http://www.w3.org/2000/svg` as `.w3` and `.org`, and `.css` in prose as a
    family. Unstripped they inflate the apparent surface of the system by half.
    """
    return QUOTED.sub('""', URL.sub('url()', COMMENT.sub('', css)))


# ---------------------------------------------------------------------------
# Reading
# ---------------------------------------------------------------------------

def read_css(path):
    """CSS text from a .css file, or the concatenated <style> blocks of an .html."""
    src = open(path, encoding='utf-8', errors='replace').read()
    if path.endswith('.html'):
        src = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', src, re.S))
    return src


def css_sources(consumer=None):
    """The sheets that ARE Praxis, and optionally a consumer's pages that use it.

    A consumer is never read as source — only to measure real usage. Without one,
    a token defined and never referenced looks identical to one every page needs.
    """
    files = sorted(glob.glob(os.path.join(SRC, '*.css')))
    pages = []
    if consumer:
        pages = [p for p in sorted(glob.glob(os.path.join(consumer, '*.html')))
                 if not os.path.basename(p).startswith('_tmp')]
    return files, pages


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------

def dark_remaps():
    """Token → dark value, from the two dark blocks in praxis-core.css.

    The variant-scoped block wins over the bare one, matching the cascade: both
    are in the same file, and body[data-variant="praxis"][data-theme="dark"] is
    the more specific selector.
    """
    core = read_css(os.path.join(SRC, 'praxis-core.css'))
    dark = {}
    for sel in (r'body\[data-variant="praxis"\]\[data-theme="dark"\]',
                r'body\[data-theme="dark"\]'):
        # Both blocks moved onto :root via :has() on 2026-08-26 so that every
        # token declaration lives on one element; the bare body form is still
        # matched because a consumer sheet may carry one.
        pattern = r'(?::root:has\()?%s\)?\s*\{(.*?)\n\}' % sel
        for m in re.finditer(pattern, core, re.S):
            for d in DEF.finditer(m.group(1)):
                if sel.startswith('body\\[data-variant'):
                    dark[d.group(1)] = d.group(2).strip()
                else:
                    dark.setdefault(d.group(1), d.group(2).strip())
    return dark


def token_rows():
    """Every foundation token, in file order, grouped by the comment heading above it.

    Returns [(group, name, light, dark)]. `dark` is '' when the token is not
    remapped. praxis-tokens.css is already sectioned by /* Neutrals */-style
    comments, so the grouping is the file's own, not one invented here.
    """
    src = read_css(os.path.join(SRC, 'praxis-tokens.css'))
    dark = dark_remaps()
    rows, group = [], None
    for line in src.split('\n'):
        g = re.match(r'\s*/\*\s*(?:=+\s*)?([A-Z][^*]{2,70}?)\s*(?:=+\s*)?\*/\s*$', line)
        if g and 'GENERATED' not in g.group(1):
            group = g.group(1).strip()
            continue
        for m in DEF.finditer(line):
            name = m.group(1)
            light = m.group(2).split('/*')[0].strip()
            rows.append((group or 'Foundation', name, light, dark.get(name, '')))
    return rows


def token_map():
    """Two flat name → declared-value maps: light and dark.

    Light is praxis-tokens.css plus the light overrides praxis-core.css layers on
    body[data-variant="praxis"]. Dark is light with the dark remaps applied.
    """
    light = {}
    for _, name, value, _ in token_rows():
        light[name] = value
    core = read_css(os.path.join(SRC, 'praxis-core.css'))
    for m in re.finditer(r'body\[data-variant="praxis"\]\s*\{(.*?)\n\}', core, re.S):
        for d in DEF.finditer(m.group(1)):
            light[d.group(1)] = d.group(2).split('/*')[0].strip()
    dark = dict(light)
    dark.update(dark_remaps())
    return light, dark


def variant_block():
    """Everything declared under body[data-variant="praxis"] in praxis-core.css.

    Returns name -> light value. This used to be a whole parallel token layer —
    41 properties, of which 9 overrode praxis-tokens.css at a higher specificity
    than :root, so the token file was the wrong answer to "what colour is this".
    All 41 moved to :root on 2026-08-26; what is left is the four responsive
    layout hooks set on <body> inside @media.

    Kept, rather than deleted, because it is what variant_overrides() and
    body_declared_tokens() measure against: an empty result is the assertion.
    """
    core = read_css(os.path.join(SRC, 'praxis-core.css'))
    out = {}
    for m in re.finditer(
            r'body\[data-variant="praxis"\](?:\[data-theme="light"\])?\s*\{(.*?)\n\}',
            core, re.S):
        for d in DEF.finditer(m.group(1)):
            out.setdefault(d.group(1), d.group(2).split('/*')[0].strip())
    return out


def material_rows():
    """The --px-* material layer: the surfaces and shadows that carry the look.

    They lived in praxis-core.css rather than the token file until 2026-08-26,
    which made them the half of the foundation a reader was most likely to go
    hunting for and not find. Both sources are still read: --px-gutter is set on
    <body> inside @media and is legitimately not in the token file.
    Same (group, name, light, dark) shape as token_rows() so one renderer serves
    both.
    """
    dark = dark_remaps()
    rows = {name: light for _g, name, light, _d in token_rows()}
    rows.update(variant_block())
    return [('Material', name, value, dark.get(name, ''))
            for name, value in sorted(rows.items())
            if name.startswith('--px-')]


def variant_overrides():
    """Tokens praxis-tokens.css declares that praxis-core.css then overrides for
    the Praxis variant. [(name, token_file_value, praxis_value, dark_value)]

    Empty since 2026-08-26, and that is the point: it is measured every build so
    the emptiness is checked rather than asserted. There were nine, and the
    difference was not cosmetic — --praxis-radius-card read 20px in the token
    file and rendered 12px.
    """
    declared = {name: light for _g, name, light, _d in token_rows()}
    dark = dark_remaps()
    out = []
    for name, value in sorted(variant_block().items()):
        if name in declared and declared[name] != value:
            out.append((name, declared[name], value, dark.get(name, '')))
    return out


def variant_extras():
    """Tokens that exist ONLY under the Praxis variant and are not --px-* —
    layout hooks a page is expected to read or set."""
    declared = {name for _g, name, _l, _d in token_rows()}
    dark = dark_remaps()
    return [('Praxis-only', name, value, dark.get(name, ''))
            for name, value in sorted(variant_block().items())
            if name not in declared and not name.startswith('--px-')]


def rule_blocks(css):
    """Top-level (selector, body) pairs, descending into @media.

    A brace walk rather than a parser: the only nesting in these sheets is
    @media wrapping ordinary rule blocks, and a declaration inside one is still
    a declaration on whatever element the inner selector names.
    """
    out, i = [], 0
    while True:
        b = css.find('{', i)
        if b < 0:
            return out
        cut = max(css.rfind('}', 0, b), css.rfind('{', 0, b))
        sel = ' '.join(css[cut + 1:b].split())
        d, j = 1, b + 1
        while j < len(css) and d:
            if css[j] == '{':
                d += 1
            elif css[j] == '}':
                d -= 1
            j += 1
        if sel.startswith('@'):
            i = b + 1          # step INTO the at-rule
            continue
        out.append((sel, css[b + 1:j - 1]))
        i = j


_HAS = re.compile(r':(?:has|is|not)\([^()]*\)')


def declaration_sites():
    """token -> sorted [(element, selector, value)] for every root/body declaration.

    element is 'root' or 'body'. Selectors that reach past <body> (a descendant
    combinator, a class, an element) are skipped: those are component-scoped and
    cannot strand an inherited alias. Every sheet is read, not just
    praxis-core.css — praxis-workspace.css and praxis-admin.css each carried a
    body-scoped token block too, and a check that only looked at core would have
    called the system clean while they were still there.
    """
    sites = collections.defaultdict(list)
    for path in sorted(glob.glob(os.path.join(SRC, '*.css'))):
        css = COMMENT.sub('', read_css(path))
        for sel, body in rule_blocks(css):
            props = [(d.group(1), d.group(2).strip()) for d in DEF.finditer(body)]
            if not props:
                continue
            for part in sel.split(','):
                bare = _HAS.sub('', part).strip()
                if re.search(r'[>+~\s]', bare):
                    continue                      # reaches past the subject element
                if bare.startswith(':root') or bare == 'html':
                    element = 'root'
                elif re.fullmatch(r'body(\[[^\]]*\])*', bare):
                    element = 'body'
                else:
                    continue
                for name, value in props:
                    sites[name].append((element, ' '.join(part.split()), value))
                break
    return {k: sorted(set(v)) for k, v in sites.items()}


def body_declared_tokens():
    """Tokens declared on <body> rather than :root. [(token, selector, value)]

    THE structural invariant behind frozen_aliases(). Custom-property
    substitution happens at the element where the declaration lives, so a token
    declared on <body> cannot be seen by any :root alias of it. Keeping every
    declaration on :root does not merely fix today's frozen aliases — it makes
    the class impossible.

    Four responsive layout hooks are exempt and named explicitly. They are set
    on <body> inside @media on purpose, nothing aliases them, and moving them to
    :root would not make them any more visible.
    """
    exempt = {'--px-gutter', '--ph-pad-x', '--home-gutter', '--sp-gutter',
              '--navrail-w'}
    out = []
    for token, places in sorted(declaration_sites().items()):
        if token in exempt:
            continue
        for element, sel, value in places:
            if element == 'body':
                out.append((token, sel, value))
    return out


_SEL_ATTR = re.compile(r'\[([a-zA-Z-]+)(?:[~|^$*]?="([^"]*)")?\]')


def _conditions(selector):
    """The attribute conditions a body-level selector requires, as a frozenset.

    data-variant="praxis" is dropped, because it is universally true: only one
    variant exists (Miramar was pruned 2026-08-12) and both README.md and
    PRAXIS-FOR-AGENTS.md state the attribute is required and always "praxis".
    Keeping it made the comparison report a freeze that cannot happen — a rung
    remapped under body[data-theme="dark"] whose token is restated under
    body[data-variant="praxis"][data-theme="dark"] is covered on every page that
    exists. If a second variant is ever added, delete this line first: the
    freeze becomes real again the moment the attribute can hold another value.
    """
    attrs = _SEL_ATTR.findall(_HAS.sub('', selector))
    return frozenset(a for a in attrs if a != ('data-variant', 'praxis'))


def frozen_aliases():
    """Tokens whose overridden value can never take effect.

    Returns [(token, rung, selector_of_the_unreachable_declaration, value)].

    A precise, decidable bug class. `:root { --a: var(--b) }` with `--b`
    re-declared on `body` cannot work: substitution happens at the element where
    the DECLARATION lives, so `--a` is computed on :root against the :root `--b`,
    and body inherits that computed value. The re-declaration never reaches it.

    TWO THINGS THE FIRST VERSION OF THIS CHECK GOT WRONG, both of which let a
    real bug through:

    1. It only looked at dark remaps. `--b` also got re-declared under the old
       body[data-variant="praxis"] override layer, and that axis strands the
       alias in BOTH themes. --praxis-color-status-info aliases blue-60, the
       variant redefined blue-60 from #4766eb to #4361c4, and the light half
       rendered a blue the palette no longer contained.

    2. It treated "the token is re-declared on body somewhere" as a clean bill of
       health. status-info WAS re-declared on body — in the dark block only — so
       that exemption hid the light half of the very same bug. A restatement only
       covers a rung declaration whose conditions it is a subset of: restating a
       token under body[data-theme="dark"] covers a rung declared under
       body[data-variant="praxis"][data-theme="dark"], but not the reverse, and
       not the unconditional variant block.

    Detected from declaration SITES, never from a merged value table. Flattening
    every declaration into one dict is what hides this in the first place:
    substituting the body value reports a difference the browser never makes.

    Since 2026-08-26 every token declaration lives on :root, so this is empty by
    construction; body_declared_tokens() is the invariant that keeps it that way.
    It is retained because it is cheap and it fires if a body-scoped token block
    is ever reintroduced alongside an alias.

    Known limitation: @media conditions are not modelled, so a rung declared only
    inside an @media block would be reported as if it were unconditional. No
    :root alias references one today, and media_only_tokens() lists them.
    """
    sites = declaration_sites()
    out = []
    for token, places in sorted(sites.items()):
        covers = [_conditions(sel) for el, sel, _v in places if el == 'body']
        for element, _sel, value in places:
            if element != 'root':
                continue
            inner = re.fullmatch(r'var\(\s*(--[A-Za-z0-9_-]+)\s*\)', value)
            if not inner:
                continue
            for el2, sel2, val2 in sites.get(inner.group(1), []):
                if el2 != 'body':
                    continue
                if any(c <= _conditions(sel2) for c in covers):
                    continue        # the token is restated wherever the rung is
                out.append((token, inner.group(1), sel2, val2))
    return out


def media_only_tokens():
    """Tokens declared ONLY inside an @media block. [(name, [conditions])]

    These resolve to nothing at any other width, which is correct but reads as a
    bug on a reference page that shows resolved values: the four layout gutters
    (--px-gutter, --ph-pad-x, --home-gutter, --sp-gutter) exist only inside
    @media (max-width:640px). Measuring it means a reader is told why the cell is
    empty instead of guessing, and a token that accidentally ends up media-only
    shows up here rather than silently falling back forever.
    """
    inside, outside = collections.defaultdict(set), set()
    for path in sorted(glob.glob(os.path.join(SRC, '*.css'))):
        css = COMMENT.sub('', read_css(path))
        # Walk the text tracking @media depth. A brace-counting walk is enough
        # here and avoids a CSS parser: the only nesting in these sheets is
        # @media wrapping ordinary rule blocks.
        depth, media_stack, i = 0, [], 0
        while i < len(css):
            ch = css[i]
            if ch == '@':
                m = re.match(r'@media([^{]*)\{', css[i:])
                if m:
                    media_stack.append((depth, ' '.join(m.group(1).split())))
                    depth += 1
                    i += m.end()
                    continue
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if media_stack and media_stack[-1][0] == depth:
                    media_stack.pop()
            elif ch == '-' and css.startswith('--', i):
                m = DEF.match(css, max(0, i - 1))
                if not m:
                    m = re.match(r'(--[A-Za-z0-9_-]+)\s*:', css[i:])
                    name = m.group(1) if m else None
                else:
                    name = m.group(1)
                if name:
                    if media_stack:
                        inside[name].add(media_stack[-1][1])
                    else:
                        outside.add(name)
            i += 1
    return sorted((name, sorted(conds)) for name, conds in inside.items()
                  if name not in outside)


def resolve(name, table, _seen=None):
    """Follow a var() chain to a literal. Returns (value, note).

    note is 'cycle' if the chain revisits a token — invalid at computed-value
    time, so every use in scope resolves to unset. That failure has happened here
    for real (--card-header-pad renamed onto --praxis-space-24, producing
    `--praxis-space-24: var(--praxis-space-24)`), and it is silent: the page
    still loads 200. So it is reported rather than assumed absent.
    """
    _seen = _seen or set()
    if name in _seen:
        return '', 'cycle'
    if name not in table:
        return '', 'undefined'
    value = table[name]
    m = re.fullmatch(r'var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*(.*?)\s*)?\)', value.strip())
    if not m:
        return value, ''
    inner, note = resolve(m.group(1), table, _seen | {name})
    if note and m.group(2):
        return m.group(2), 'fallback'
    return inner, note


def token_cycles():
    """Tokens whose var() chain is cyclic, in either theme. Should be empty."""
    light, dark = token_map()
    bad = []
    for theme, table in (('light', light), ('dark', dark)):
        for name in table:
            if resolve(name, table)[1] == 'cycle':
                bad.append((theme, name))
    return bad


# ---------------------------------------------------------------------------
# Classes
# ---------------------------------------------------------------------------

def class_families(path):
    """Class-name families defined by a sheet, comments stripped.

    Stripping matters: `.css` and `.js` in prose are otherwise counted as class
    families, which inflates the surface area of the system by about half
    (370 apparent families vs 238 real).
    """
    src = strip_noise(read_css(path))
    fam = collections.Counter()
    for c in re.findall(r'\.([a-zA-Z][a-zA-Z0-9_-]+)', src):
        fam[re.split(r'__|--', c)[0]] += 1
    return fam


SELECTOR = re.compile(r'([^{}]+)\{')


def bare_selector_classes(path):
    """Classes that appear as a complete simple selector (`.btn`, not `.btn--x`).

    Distinguishes "Praxis has a rule keyed on this class" from "this class only
    ever appears as a modifier". It does NOT prove a class has a usable base
    box — `.btn:hover` is a bare-selector match but styles nothing at rest —
    so the gaps page states the class-level omissions in prose, verified by
    hand, and uses this only to surface families Praxis never keys a rule on at
    all. Deciding "is this a base definition" from a selector is not decidable
    by pattern.
    """
    src = strip_noise(read_css(path))
    out = set()
    for m in SELECTOR.finditer(src):
        sel = m.group(1)
        if sel.lstrip().startswith('@'):
            continue
        out.update(re.findall(r'\.([a-zA-Z][a-zA-Z0-9_-]+)(?![\w-])', sel))
    return out


def unkeyed_families():
    """Families no sheet ever keys a rule on. [(family, [sheets])]"""
    fams, keyed = collections.defaultdict(set), set()
    for f in sorted(glob.glob(os.path.join(SRC, 'praxis-*.css'))):
        base = os.path.basename(f)
        for fam in class_families(f):
            fams[fam].add(base)
        keyed |= bare_selector_classes(f)
    return sorted((fam, sorted(sheets)) for fam, sheets in fams.items() if fam not in keyed)


def sheet_inventory(consumer=None):
    """Per-sheet rows: [(filename, rule_count, consumer_page_count|None, families)]."""
    pages = glob.glob(os.path.join(consumer, '*.html')) if consumer else []
    rows = []
    for f in sorted(glob.glob(os.path.join(SRC, 'praxis-*.css'))):
        src = read_css(f)
        base = os.path.basename(f)
        used = None
        if consumer:
            used = len([p for p in pages
                        if base in open(p, encoding='utf-8', errors='replace').read()])
        rows.append((base, src.count('{'), used, class_families(f)))
    return rows


# ---------------------------------------------------------------------------
# The whole-system measurement
# ---------------------------------------------------------------------------

def measure(consumer=None):
    files, pages = css_sources(consumer)
    defs, uses, total = collections.defaultdict(set), collections.Counter(), 0
    hexn = rgbn = 0
    for f in files + pages:
        src = read_css(f)
        for m in DEF.finditer(src):
            defs[m.group(1)].add(os.path.basename(f))
        for m in USE.finditer(src):
            uses[m.group(1)] += 1
            total += 1
        hexn += len(re.findall(r'#[0-9a-fA-F]{3,8}\b', src))
        rgbn += len(re.findall(r'\brgba?\([^)]*\)', src))
    raw = hexn + rgbn

    # A token set at runtime by JS is legitimately absent from the CSS.
    js_files = glob.glob(os.path.join(SRC, '*.js'))
    if consumer:
        js_files += glob.glob(os.path.join(consumer, '*.js'))
    js = ''.join(open(f, encoding='utf-8', errors='replace').read() for f in js_files)
    js += ''.join(read_css(p) + open(p, encoding='utf-8', errors='replace').read()
                  for p in pages)
    undef = [t for t in uses
             if t not in defs
             and ("setProperty('%s'" % t) not in js
             and (t + ':') not in js]

    return {
        'tokens': len(defs), 'uses': total, 'raw': raw, 'hex': hexn, 'rgb': rgbn,
        'coverage': round(100.0 * total / (total + raw)),
        'multi': len([t for t, d in defs.items() if len(d) > 1]),
        'undef': sorted(undef),
        'dead': sorted(t for t in defs if t not in uses),
        'defs': defs, 'pages': len(pages), 'sheets': len(files),
    }
