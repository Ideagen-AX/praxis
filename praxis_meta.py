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
    for m in re.finditer(r'body\[data-variant="praxis"\]\[data-theme="dark"\]\s*\{(.*?)\n\}',
                         core, re.S):
        for d in DEF.finditer(m.group(1)):
            dark[d.group(1)] = d.group(2).strip()
    for m in re.finditer(r'body\[data-theme="dark"\]\s*\{(.*?)\n\}', core, re.S):
        for d in DEF.finditer(m.group(1)):
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

    Returns name -> light value. This is the layer that actually renders, and it
    is not a subset of praxis-tokens.css: it both ADDS tokens (the --px-*
    materials, --praxis-color-purple-60) and OVERRIDES some the token file
    already declared, at a higher specificity than :root. So the value in
    praxis-tokens.css can be the wrong answer to "what colour is this".
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

    They live in praxis-core.css, not the token file, which makes them the half
    of the foundation a reader is most likely to go hunting for and not find.
    Same (group, name, light, dark) shape as token_rows() so one renderer serves
    both.
    """
    dark = dark_remaps()
    return [('Material', name, value, dark.get(name, ''))
            for name, value in sorted(variant_block().items())
            if name.startswith('--px-')]


def variant_overrides():
    """Tokens praxis-tokens.css declares that praxis-core.css then overrides for
    the Praxis variant. [(name, token_file_value, praxis_value, dark_value)]

    Worth surfacing on its own page: reading the token file alone gives the wrong
    answer for every one of these, and the difference is not cosmetic —
    --praxis-radius-card is 20px in the token file and 12px under Praxis.
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
