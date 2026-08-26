#!/usr/bin/env python3
"""
Build the Praxis reference site from site/content/ and src/.

WHY THIS EXISTS
    Praxis had no viewer. The only place it rendered was a consumer prototype,
    which shows that application's markup rather than the system, and the tables
    in DESIGN-SYSTEM.md describe the CSS without ever showing it.

    Two properties make the output trustworthy rather than decorative:

    1. It renders the REAL css. dist/ is mirrored into the site and every
       example loads it. There is no second copy of Praxis to keep in step,
       which is the same rule build-package.py enforces for the package.

    2. Each example is rendered and displayed from ONE piece of markup. The
       live frame and the source panel both come from the same <template>, so
       they cannot disagree. That is the failure mode of every hand-maintained
       gallery: the snippet says one thing and the demo does another.

    Facts are measured, never transcribed. Token tables, scales and sheet
    inventories come from praxis_meta, which build-ds.py also uses, so the site
    and DESIGN-SYSTEM.md cannot state different numbers.

    The resolved-value columns are not computed here at all. They are read in
    the browser off two hidden probe documents, one per theme, because what a
    token is declared as is not what it resolves to — the trap recorded in
    CLAUDE.md, where --t-sm looked like it mapped to --praxis-type-size-sm and
    its fallback landed on type-size-base.

STDLIB ONLY
    No pip install, no node_modules. publish.yml documents the build as having
    nothing to install and the Pages deploy relies on the same property.

USAGE
    python3 build-site.py                 build _site/
    python3 build-site.py --serve [port]  build, then serve with rebuild-per-request
    python3 build-site.py --check         build; fail on any content or markup error
    python3 build-site.py --coverage      which class families are not documented yet
    python3 build-site.py --agents-doc    render content to PRAXIS-FOR-AGENTS.generated.md
"""

import collections
import html
import http.server
import json
import os
import re
import shutil
import socketserver
import sys
import textwrap
from html.parser import HTMLParser

import praxis_meta

HERE = praxis_meta.HERE
SRC = praxis_meta.SRC
DIST = os.path.join(HERE, 'dist')
SITE = os.path.join(HERE, 'site')
CONTENT = os.path.join(SITE, 'content')
TEMPLATES = os.path.join(SITE, 'templates')
ASSETS = os.path.join(SITE, 'assets')
OUT = os.path.join(HERE, '_site')

# Nav sections, in order. Component pages are grouped by their `tier`, reusing
# the churn-risk classification the system already documents rather than
# inventing a second one.
SECTIONS = [
    ('overview', 'Overview'),
    ('foundations', 'Foundations'),
    ('ready', 'Components — ready'),
    ('settling', 'Components — settling'),
    ('unstable', 'Components — unstable'),
    # Planned last, and a section of its own rather than a chip on a real page:
    # a reader scanning the nav should be able to tell what EXISTS from what is
    # only intended without opening anything.
    ('planned', 'Components — planned'),
]

TIER_LABEL = {
    'ready': 'Ready · in daily use and load-bearing',
    'settling': 'Settling · real and working, one or two consumers',
    'unstable': 'Unstable · page-scoped, expect reorganisation',
    'planned': 'Planned · nothing is defined in src/ yet — this page is the brief',
}

# The pill in .pageheader__status is 22px tall and holds one word. The long
# labels above stay as the title attribute, which is where the sentence belongs.
TIER_SHORT = {'ready': 'Ready', 'settling': 'Settling', 'unstable': 'Unstable',
              'planned': 'Planned'}

# .admin-pill variant per tier. Reuses the status vocabulary the system already
# has rather than inventing a docs-only one.
TIER_PILL = {'ready': 'ok', 'settling': 'info', 'unstable': 'warning',
             'planned': 'off'}

# A Material Symbols ligature per section, used in .pageheader__icon. Pages
# override with an `icon:` line.
SECTION_ICON = {
    'overview': 'home', 'foundations': 'tune',
    'ready': 'grid_view', 'settling': 'grid_view', 'unstable': 'grid_view',
    'planned': 'construction',
}

GITHUB = 'https://github.com/Ideagen-AX/praxis'

problems = []

# Pages whose <h2> set does not match SKELETON. A GATE — see the block above the
# definition for why extras are allowed and order is not.
skeleton_report = []


def fail(where, message):
    problems.append('%s: %s' % (where, message))


def version():
    return json.loads(open(os.path.join(HERE, 'package.json')).read())['version']


def slugify(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text).lower()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', text)).strip('-')


def read(path):
    return open(path, encoding='utf-8').read()


# ---------------------------------------------------------------------------
# The icon vocabulary, read from the converter rather than transcribed.
#
# praxis-lucide.js maps ~200 Material Symbols ligatures onto Lucide names and
# falls back to a plain circle for anything it does not know. A wrong ligature
# is therefore SILENT: the page renders a circle and nothing says why. So the
# ligature set is parsed out of the script and an unknown `icon:` fails the
# build instead.
# ---------------------------------------------------------------------------

def ligatures():
    if ligatures.cache is None:
        js = read(os.path.join(SRC, 'praxis-lucide.js'))
        m = re.search(r'var MAT2LUCIDE = \{(.*?)\n  \};', js, re.S)
        if not m:
            fail('praxis-lucide.js', 'could not find the MAT2LUCIDE map. The `icon:` '
                                     'metadata is checked against it, so the check is '
                                     'now blind — fix the pattern in ligatures().')
            ligatures.cache = set()
        else:
            ligatures.cache = set(re.findall(r'"([a-z0-9_]+)"\s*:\s*"', m.group(1)))
    return ligatures.cache


ligatures.cache = None


def fill(template, values):
    """Slot substitution. Deliberately not a template language — the site has
    two layouts and a fixed set of slots, so a regex over {{name}} is the whole
    requirement and pulling in Jinja would break the stdlib-only property."""
    def sub(m):
        key = m.group(1)
        if key not in values:
            fail('template', 'no value for slot {{%s}}' % key)
            return ''
        return str(values[key])
    return re.sub(r'\{\{(\w+)\}\}', sub, template)


# ---------------------------------------------------------------------------
# Content files
# ---------------------------------------------------------------------------

META_BLOCK = re.compile(r'^\s*<!--praxis\s*(.*?)-->', re.S)

REQUIRED_META = ('title', 'summary')


def parse_content(path):
    """A content file is a metadata comment followed by body HTML.

    The header is an HTML comment on purpose: the file stays valid HTML and
    opens in a browser on its own, so a half-written page can be checked
    without running the build.
    """
    raw = read(path)
    m = META_BLOCK.match(raw)
    rel = os.path.relpath(path, CONTENT)
    if not m:
        fail(rel, 'no <!--praxis ... --> metadata header')
        return None
    meta = {}
    for line in m.group(1).strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        if ':' not in line:
            fail(rel, 'metadata line is not "key: value": %r' % line)
            continue
        k, v = line.split(':', 1)
        meta[k.strip()] = v.strip()
    for key in REQUIRED_META:
        if not meta.get(key):
            fail(rel, 'metadata is missing %s' % key)

    section = os.path.dirname(rel) or 'overview'
    if section == 'components':
        section = meta.get('tier', 'settling')
        if section not in TIER_LABEL:
            fail(rel, 'tier must be one of %s (got %r)'
                 % (', '.join(sorted(TIER_LABEL)), section))
            section = 'settling'

    # Old paths this page should answer for, so a rename does not 404 a URL
    # someone has already shared. Site-root-relative, comma separated.
    redirects = [r.strip().lstrip('/') for r in (meta.get('redirect_from') or '').split(',')
                 if r.strip()]

    # .pageheader__icon. Checked against the converter's own ligature map, so a
    # typo fails here rather than rendering the fallback circle in silence.
    icon = meta.get('icon') or SECTION_ICON.get(section, 'grid_view')
    known = ligatures()
    if known and icon not in known:
        fail(rel, 'icon: %s is not a ligature praxis-lucide.js knows, so it would '
                  'render as the fallback circle. Pick one it maps, or add it to '
                  'MAT2LUCIDE.' % icon)
    meta['icon'] = icon

    slug = meta.get('slug') or os.path.splitext(os.path.basename(path))[0]
    subdir = os.path.dirname(rel)
    return {
        'path': path, 'rel': rel, 'meta': meta, 'section': section, 'slug': slug,
        'subdir': subdir,
        'href': os.path.join(subdir, slug + '.html').replace(os.sep, '/'),
        'root': '../' if subdir else '',
        'order': int(meta.get('order', '50')),
        'redirects': redirects,
        'body': raw[m.end():],
    }


def load_pages():
    paths = []
    for dirpath, _dirs, files in os.walk(CONTENT):
        for f in sorted(files):
            if f.endswith('.html'):
                paths.append(os.path.join(dirpath, f))
    pages = [p for p in (parse_content(p) for p in sorted(paths)) if p]
    rank = {name: i for i, (name, _) in enumerate(SECTIONS)}
    pages.sort(key=lambda p: (rank.get(p['section'], 99), p['order'], p['meta']['title']))
    return pages


# ---------------------------------------------------------------------------
# Generated blocks
#
# Content asks for measured facts with <praxis-block name="..." ...>. Each
# generator returns HTML for the site and markdown for the agent doc, from the
# same praxis_meta call, so the two renderings cannot state different numbers.
# ---------------------------------------------------------------------------

# Every token name any block on the site rendered. Compared against
# praxis-tokens.css after the build: a token nobody surfaced is a hole in a
# reference whose whole promise is that you can see all of them, and it is
# decidable, so it fails the build rather than going unnoticed.
rendered_tokens = set()


def _group_rows(args):
    """Select tokens by name prefix, falling back to the file's comment headings.

    Prefix is the primary selector because the naming IS the taxonomy and it is
    exact. The comment headings in praxis-tokens.css are uneven — the section
    labelled "Profile-menu motion" is followed by 21 tokens covering glass and
    status tones, because the headings were written as prose for a human reading
    the file top to bottom, not as a grouping key.
    """
    rows = praxis_meta.token_rows()
    # A prefix query searches every place a token can be defined, because "where
    # is --px-surface declared" is exactly the question the reader does not have
    # the answer to. Names are unique across the three, and token_rows wins.
    seen = {r[1] for r in rows}
    rows = rows + [r for r in praxis_meta.material_rows() + praxis_meta.variant_extras()
                   if r[1] not in seen]
    prefix = args.get('prefix')
    group = args.get('group')
    exclude = [e.strip() for e in (args.get('exclude') or '').split('|') if e.strip()]
    if prefix:
        wanted = [w.strip() for w in prefix.split('|') if w.strip()]
        rows = [r for r in rows if any(r[1].startswith(w) for w in wanted)]
    elif group:
        wanted = [g.strip().lower() for g in group.split('|')]
        rows = [r for r in rows if any(w in r[0].lower() for w in wanted)]
    if exclude:
        rows = [r for r in rows if not any(r[1].startswith(e) for e in exclude)]
    rendered_tokens.update(r[1] for r in rows)
    return rows


def block_tokens(args):
    rows = _group_rows(args)
    if not rows:
        fail('block tokens', 'no tokens matched prefix=%r group=%r'
             % (args.get('prefix'), args.get('group')))
    out = ['<div class="admin-table-wrap"><div class="admin-table-scroll">',
           '<table class="admin-table tokentable">',
           '<thead><tr><th>Token</th><th>Declared</th>'
           '<th>Resolved · light</th><th>Resolved · dark</th></tr></thead>', '<tbody>']
    for _grp, name, light, dark in rows:
        declared = html.escape(light) or '<em>empty</em>'
        if dark:
            declared += '<br><span class="sw__val">dark: %s</span>' % html.escape(dark)
        out.append(
            '<tr><td><code>%s</code></td><td>%s</td>'
            '<td data-computed="%s" data-theme="light"></td>'
            '<td data-computed="%s" data-theme="dark"></td></tr>'
            % (html.escape(name), declared, html.escape(name), html.escape(name)))
    out += ['</tbody></table></div></div>']
    return '\n'.join(out)


def block_tokens_md(args):
    rows = _group_rows(args)
    out = ['| Token | Light | Dark (via `praxis-core.css`) |', '|---|---|---|']
    for _grp, name, light, dark in rows:
        out.append('| `%s` | `%s` | %s |' % (name, light, ('`%s`' % dark) if dark else '—'))
    return '\n'.join(out)


def block_swatches(args):
    rows = _group_rows(args)
    if not rows:
        fail('block swatches', 'no tokens matched prefix=%r group=%r'
             % (args.get('prefix'), args.get('group')))
    out = ['<div class="swatches">']
    for _grp, name, light, _dark in rows:
        esc = html.escape(name)
        out.append(
            '<div class="sw"><div class="sw__chip">'
            '<div class="sw__half" data-computed-swatch="%s" data-theme="light"></div>'
            '<div class="sw__half" data-computed-swatch="%s" data-theme="dark"></div>'
            '</div><div class="sw__body"><code class="sw__name">%s</code>'
            '<span class="sw__val">%s</span></div></div>'
            % (esc, esc, esc, html.escape(light)))
    out.append('</div>')
    out.append('<p class="sw__val">Left half light, right half dark, both read from a '
               'live document. A rung that looks identical in both is one the dark '
               'theme does not remap.</p>')
    return '\n'.join(out)


UNIT = re.compile(r'^([\d.]+)\s*(rem|em|px|ms|s)$')


def scale_magnitude(value):
    """A sortable number for a scale step, or None if the value is not a literal.

    A scale listed in file order is not a scale — praxis-tokens.css declares
    space as 12, 16, 24, 32, 4, 8, then 20, 40, 48, because the last three were
    completed later. Ordering by the number is the whole point of the page.
    """
    m = UNIT.match(value.strip())
    if not m:
        return None
    n, unit = float(m.group(1)), m.group(2)
    return n * {'rem': 16, 'em': 16, 'px': 1, 'ms': 1, 's': 1000}[unit]


SCALE_DEMO = {
    'type': '<span class="scale__type" style="font-size:var(%s)">Grid the sample text</span>',
    'space': '<div class="scale__bar" style="width:var(%s)"></div>',
    'radius': '<div class="scale__box" style="border-radius:var(%s)"></div>',
    'chrome': '<div class="scale__bar" style="width:var(%s);max-width:100%%"></div>',
    'elevation': '<div class="scale__shadow" style="box-shadow:var(%s)"></div>',
    'motion': '<div class="scale__motion" style="animation:pxslide var(%s) '
              'var(--praxis-ease-default) infinite alternate"></div>',
}


def block_scale(args):
    kind = args.get('kind', 'space')
    rows = _group_rows(args if (args.get('prefix') or args.get('group'))
                       else dict(args, group=kind))
    demo = SCALE_DEMO.get(kind, SCALE_DEMO['space'])
    if not rows:
        fail('block scale', 'no tokens matched kind=%r group=%r' % (kind, args.get('group')))
    # Numeric steps first, in order; anything non-literal keeps file order after.
    keyed = [(scale_magnitude(r[2]), i, r) for i, r in enumerate(rows)]
    rows = ([r for mag, _i, r in sorted((k for k in keyed if k[0] is not None))]
            + [r for mag, _i, r in keyed if mag is None])
    out = ['<div class="scale">']
    if kind == 'motion':
        out.append('<style>@keyframes pxslide{from{transform:translateX(0)}'
                   'to{transform:translateX(6rem)}}'
                   '@media (prefers-reduced-motion:reduce){'
                   '.scale__motion{animation:none!important}}</style>')
    for _grp, name, light, _dark in rows:
        # The declared value and the resolved one disagree for
        # --praxis-radius-card (20px declared, 12px under Praxis), and the demo
        # box draws the resolved one. Showing only the declared number next to a
        # box drawn from the other value is how that trap stays invisible.
        out.append('<div class="scale__row"><code class="scale__name">%s</code>'
                   '<span class="scale__val">%s</span>'
                   '<span class="scale__val" data-computed="%s" data-theme="light"></span>'
                   '<div class="scale__demo">%s</div></div>'
                   % (html.escape(name), html.escape(light), html.escape(name), demo % name))
    out.append('</div>')
    return '\n'.join(out)


def block_scale_md(args):
    return block_tokens_md(args if (args.get('prefix') or args.get('group'))
                           else dict(args, group=args.get('kind', 'space')))


def _rows_table(rows, note=''):
    out = ['<div class="admin-table-wrap"><div class="admin-table-scroll">',
           '<table class="admin-table tokentable">',
           '<thead><tr><th>Token</th><th>Declared</th>'
           '<th>Resolved · light</th><th>Resolved · dark</th></tr></thead>', '<tbody>']
    for _grp, name, light, dark in rows:
        declared = html.escape(light) or '<em>empty</em>'
        if dark:
            declared += '<br><span class="sw__val">dark: %s</span>' % html.escape(dark)
        out.append(
            '<tr><td><code>%s</code></td><td>%s</td>'
            '<td data-computed="%s" data-theme="light"></td>'
            '<td data-computed="%s" data-theme="dark"></td></tr>'
            % (html.escape(name), declared, html.escape(name), html.escape(name)))
    out.append('</tbody></table></div></div>')
    if note:
        out.append('<p class="sw__val">%s</p>' % note)
    return '\n'.join(out)


def block_materials(args):
    rows = praxis_meta.material_rows()
    rendered_tokens.update(r[1] for r in rows)
    return _rows_table(rows, 'Light values on <code>:root</code> in '
                             '<code>praxis-tokens.css</code>; dark in '
                             '<code>praxis-core.css</code>, also on <code>:root</code>.')


def block_materials_md(args):
    rows = praxis_meta.material_rows()
    rendered_tokens.update(r[1] for r in rows)
    out = ['| Token | Light | Dark |', '|---|---|---|']
    for _g, name, light, dark in rows:
        out.append('| `%s` | `%s` | %s |' % (name, light, ('`%s`' % dark) if dark else '—'))
    return '\n'.join(out)


def block_variant_extras(args):
    rows = praxis_meta.variant_extras()
    rendered_tokens.update(r[1] for r in rows)
    return _rows_table(rows, 'These exist only under the Praxis variant. '
                             '<code>praxis-tokens.css</code> does not declare them.')


def block_variant_extras_md(args):
    return '\n'.join(['| Token | Light |', '|---|---|']
                     + ['| `%s` | `%s` |' % (n, l)
                        for _g, n, l, _d in praxis_meta.variant_extras()])


def block_overrides(args):
    rows = praxis_meta.variant_overrides()
    if not rows:
        return '<p>None — every token resolves to what the token file declares.</p>'
    out = ['<table class="tokentable">',
           '<thead><tr><th>Token</th><th><code>praxis-tokens.css</code> says</th>'
           '<th>Praxis variant says</th><th>Resolved · light</th>'
           '<th>Resolved · dark</th></tr></thead><tbody>']
    for name, declared, praxis, _dark in rows:
        out.append('<tr><td><code>%s</code></td><td>%s</td><td><strong>%s</strong></td>'
                   '<td data-computed="%s" data-theme="light"></td>'
                   '<td data-computed="%s" data-theme="dark"></td></tr>'
                   % (html.escape(name), html.escape(declared), html.escape(praxis),
                      html.escape(name), html.escape(name)))
    out.append('</tbody></table>')
    out.append('<p class="sw__val">The Praxis column is the one that renders: '
               '<code>body[data-variant="praxis"]</code> outranks <code>:root</code> on '
               'specificity regardless of load order. Reading the token file alone gives '
               'the wrong answer for every row here.</p>')
    return '\n'.join(out)


def block_overrides_md(args):
    rows = praxis_meta.variant_overrides()
    if not rows:
        return 'None.'
    return '\n'.join(['| Token | Token file | Under Praxis |', '|---|---|---|']
                     + ['| `%s` | `%s` | **`%s`** |' % (n, a, b) for n, a, b, _d in rows])


def block_frozen_aliases(args):
    rows = praxis_meta.frozen_aliases()
    if not rows:
        return '<p>None. Every aliased token can carry its dark value.</p>'
    out = ['<table><thead><tr><th>Token</th><th>Aliases</th><th>Axis</th>'
           '<th>Value that never applies</th></tr></thead><tbody>']
    for token, rung, axis, value in rows:
        out.append('<tr><td><code>%s</code></td><td><code>%s</code></td>'
                   '<td>%s</td><td><code>%s</code></td></tr>'
                   % (html.escape(token), html.escape(rung), html.escape(axis),
                      html.escape(value)))
    out.append('</tbody></table>')
    out.append('<p class="sw__val">Detected from structure every build, not from the '
               'resolved values \u2014 asking a resolver would give the wrong answer, '
               'because it substitutes the dark rung the browser never reaches.</p>')
    return '\n'.join(out)


def block_frozen_aliases_md(args):
    rows = praxis_meta.frozen_aliases()
    if not rows:
        return 'None.'
    return '\n'.join(['| Token | Aliases | Axis | Value that never applies |',
                      '|---|---|---|---|']
                     + ['| `%s` | `%s` | %s | `%s` |' % r for r in rows])


def block_body_tokens(args):
    rows = praxis_meta.body_declared_tokens()
    if not rows:
        return ('<p>None. Every token in <code>src/</code> is declared on '
                '<code>:root</code>, so no alias can be stranded by one — the four '
                'responsive layout hooks set on <code>&lt;body&gt;</code> inside '
                '<code>@media</code> are exempt and nothing aliases them.</p>')
    out = ['<table><thead><tr><th>Token</th><th>Declared on</th><th>Value</th>'
           '</tr></thead><tbody>']
    for token, sel, value in rows:
        out.append('<tr><td><code>%s</code></td><td><code>%s</code></td>'
                   '<td><code>%s</code></td></tr>'
                   % (html.escape(token), html.escape(sel), html.escape(value)))
    out.append('</tbody></table>')
    return '\n'.join(out)


def block_body_tokens_md(args):
    rows = praxis_meta.body_declared_tokens()
    if not rows:
        return 'None. Every token is declared on `:root`.'
    return '\n'.join(['| Token | Declared on | Value |', '|---|---|---|']
                      + ['| `%s` | `%s` | `%s` |' % r for r in rows])


def block_absent_tokens(args):
    """Assert that named tokens do NOT exist, and verify it every build.

    The corrections page claims things like "--praxis-type-weight-* does not
    exist". Transcribed, that claim rots the moment someone adds one — and it
    rots silently, into a reference telling readers not to use a token that now
    works. So the claim is checked instead: the names are listed here and the
    build confirms each is still absent.
    """
    names = [n.strip() for n in (args.get('names') or '').split(',') if n.strip()]
    if not names:
        fail('block absent-tokens', 'names="..." is required')
        return ''
    light, dark = praxis_meta.token_map()
    defined = set(light) | set(dark)
    prefixes = [n[:-1] for n in names if n.endswith('*')]
    exact = [n for n in names if not n.endswith('*')]

    present = [t for t in exact if t in defined]
    for pre in prefixes:
        present += sorted(t for t in defined if t.startswith(pre))
    if present:
        fail('block absent-tokens',
             'this page claims these do not exist, but they are defined in src/: %s. '
             'The claim is now wrong — update the page.' % ', '.join(present))

    out = ['<table><thead><tr><th>Claimed absent</th><th>Verified</th></tr></thead><tbody>']
    for n in names:
        hit = ([t for t in defined if t.startswith(n[:-1])] if n.endswith('*')
               else ([n] if n in defined else []))
        out.append('<tr><td><code>%s</code></td><td>%s</td></tr>'
                   % (html.escape(n),
                      'still absent' if not hit
                      else '<strong>NOW DEFINED — this page is out of date</strong>'))
    out.append('</tbody></table>')
    out.append('<p class="sw__val">Checked against <code>src/</code> on every build. If any '
               'of these is ever defined, the build fails rather than the page quietly '
               'telling you not to use something that works.</p>')
    return '\n'.join(out)


def block_absent_tokens_md(args):
    names = [n.strip() for n in (args.get('names') or '').split(',') if n.strip()]
    return '\n'.join(['| Claimed absent | Verified |', '|---|---|']
                     + ['| `%s` | still absent |' % n for n in names])


def block_media_only(args):
    rows = praxis_meta.media_only_tokens()
    if not rows:
        return '<p>None.</p>'
    out = ['<table><thead><tr><th>Token</th><th>Declared only inside</th>'
           '</tr></thead><tbody>']
    for name, conds in rows:
        out.append('<tr><td><code>%s</code></td><td><code>@media %s</code></td></tr>'
                   % (html.escape(name), html.escape('; '.join(conds))))
    out.append('</tbody></table>')
    out.append('<p class="sw__val">Measured every build. These resolve to nothing at '
               'any other width, which is correct — and it is why their resolved '
               'columns above read <em>unset</em>: the probe documents are at desktop '
               'width.</p>')
    return '\n'.join(out)


def block_media_only_md(args):
    rows = praxis_meta.media_only_tokens()
    if not rows:
        return 'None.'
    return '\n'.join(['| Token | Declared only inside |', '|---|---|']
                     + ['| `%s` | `@media %s` |' % (n, '; '.join(c)) for n, c in rows])


RUNG = re.compile(r'^--praxis-color-([a-z]+)-(\d+)$')


def _colour_rungs():
    """{hue: {rung: token}} over every place a colour token can be defined."""
    out = collections.defaultdict(dict)
    for _g, name, _l, _d in (praxis_meta.token_rows() + praxis_meta.variant_extras()):
        m = RUNG.match(name)
        if m:
            out[m.group(1)][int(m.group(2))] = name
    return out


def block_palette(args):
    """The whole palette at once, hues down and rungs across.

    The point of this block is seeing, not reading: one grid where a hue's
    progression and two hues' relative weight at the same rung are both directly
    comparable. Values live in the tables further down each section.

    Each cell carries two bands, light above dark. Most rungs are identical in
    both themes, so a cell reading as one solid block is information too — it
    says the dark theme does not touch that rung. Only neutral 05 to 20 and three
    teal rungs actually move.
    """
    hues = _colour_rungs()
    rungs = sorted({r for h in hues.values() for r in h})
    out = ['<div class="palette" style="--palette-cols:%d">' % len(rungs)]
    out.append('<span class="palette__corner"></span>')
    for r in rungs:
        out.append('<span class="palette__rung">%d</span>' % r)
    for hue in sorted(hues):
        out.append('<span class="palette__hue">%s</span>' % html.escape(hue))
        for r in rungs:
            token = hues[hue].get(r)
            if not token:
                out.append('<span class="palette__gap" aria-hidden="true"></span>')
                continue
            rendered_tokens.add(token)
            esc = html.escape(token)
            out.append(
                '<span class="palette__cell" title="%s">'
                '<b data-computed-swatch="%s" data-theme="light"></b>'
                '<i data-computed-swatch="%s" data-theme="dark"></i>'
                '</span>' % (esc, esc, esc))
    out.append('</div>')
    out.append('<p class="sw__val">Light above, dark below, in every cell. A cell that '
               'reads as one block is a rung the dark theme does not remap \u2014 which is '
               'most of them. Hover for the token name.</p>')
    return '\n'.join(out)


def block_ramp(args):
    """One hue as a continuous ramp, big enough to judge, with values on the swatch.

    Adjacent rather than gridded: a ramp with gaps between the steps reads as
    separate colours instead of one progression, which is the thing you are
    actually assessing when you pick a rung.
    """
    hue = (args.get('hue') or '').strip()
    hues = _colour_rungs()
    if hue not in hues:
        fail('block ramp', 'hue=%r is not a Praxis colour family. Known: %s'
             % (hue, ', '.join(sorted(hues))))
        return ''
    steps = sorted(hues[hue])
    out = []
    for theme in ('light', 'dark'):
        out.append('<div class="ramp" data-ramp-theme="%s">' % theme)
        for r in steps:
            token = hues[hue][r]
            rendered_tokens.add(token)
            out.append('<span class="ramp__step" data-computed-swatch="%s" data-theme="%s" '
                       'data-ink title="%s"><b>%d</b><small></small></span>'
                       % (html.escape(token), theme, html.escape(token), r))
        out.append('</div>')
        out.append('<p class="ramp__label">%s</p>' % theme)
    return '\n'.join(out)


def block_ramp_md(args):
    hue = (args.get('hue') or '').strip()
    hues = _colour_rungs()
    if hue not in hues:
        return ''
    return block_tokens_md({'prefix': '--praxis-color-%s-' % hue})


# How a colour token should be DRAWN, by what it is for. A text colour shown as a
# filled square tells you almost nothing — you cannot judge an ink without seeing
# it as text, and you cannot judge a border without seeing it as a hairline.
ROLE_FORMS = {
    'surface': 'surface',
    'text': 'ink',
    'border': 'border',
    'interactive': 'fill',
    'status': 'fill',
}


def _role_of(name):
    for key, form in ROLE_FORMS.items():
        if name.startswith('--praxis-color-%s-' % key):
            return form
    return 'surface'


def block_role_swatches(args):
    """Semantic colors drawn as the thing they are for, in both themes.

    Two decisions worth keeping:

    Form follows role. A grid of identical squares is the default and close to
    useless here — six of these tokens are inks and four are borders, and neither
    can be judged as a filled square.

    Both themes, each on its OWN surface. A light-theme ink shown on whatever
    surface the docs happen to be using is worse than useless: with the docs in
    dark, the light value of --praxis-color-text-primary rendered on a dark card
    and read as an unreadable token when it is nothing of the kind. Every sample
    now carries the surface it was designed against, so what you see is what a
    consumer gets.
    """
    rows = _group_rows(args)
    if not rows:
        fail('block role-swatches', 'no tokens matched prefix=%r' % args.get('prefix'))
    out = ['<div class="roleswatches">']
    for _grp, name, _light, _dark in rows:
        form = args.get('form') or _role_of(name)
        esc = html.escape(name)
        out.append('<div class="rs">')
        for theme in ('light', 'dark'):
            demo = {
                'surface': '<span class="rs__block" data-computed-swatch="%s" '
                           'data-theme="%s"></span>' % (esc, theme),
                'ink': '<span class="rs__ink" data-computed-ink="%s" data-theme="%s">'
                       'Aa Sample text</span>' % (esc, theme),
                'border': '<span class="rs__border" data-computed-border="%s" '
                          'data-theme="%s"></span>' % (esc, theme),
                'fill': '<span class="rs__fill" data-computed-swatch="%s" data-theme="%s">'
                        '<span data-computed-ink="--px-primary-fg" data-theme="%s">Action'
                        '</span></span>' % (esc, theme, theme),
            }[form]
            out.append('<div class="rs__sample" data-theme="%s">%s'
                       '<span class="rs__val" data-computed="%s" data-theme="%s"></span>'
                       '</div>' % (theme, demo, esc, theme))
        out.append('<code class="rs__name">%s</code></div>' % esc)
    out.append('</div>')
    return '\n'.join(out)


def block_tone_pairs(args):
    """The tone pairs as actual chips, both halves at once.

    Showing the background and the foreground separately invites using one
    without the other, which is the documented mistake with these.
    """
    tones = ['neutral', 'info', 'success', 'warning', 'danger']
    out = ['<div class="tonepairs">']
    for tone in tones:
        bg, fg = '--praxis-tone-%s-bg' % tone, '--praxis-tone-%s-fg' % tone
        rendered_tokens.update((bg, fg))
        for theme in ('light', 'dark'):
            # The dark recipes are translucent — the neutral background is
            # rgba(255,255,255,.08) — so a dark chip shown on the light page is
            # invisible. It needs the surface it was designed against.
            out.append('<div class="tone" data-theme="%s">'
                       '<span class="tone__chip" data-computed-swatch="%s" data-theme="%s">'
                       '<span data-computed-ink="%s" data-theme="%s">%s</span></span>'
                       '<span class="tone__theme">%s</span></div>'
                       % (theme, bg, theme, fg, theme,
                          html.escape(tone.capitalize()), theme))
    out.append('</div>')
    return '\n'.join(out)


def block_tone_pairs_md(args):
    return block_tokens_md({'prefix': '--praxis-tone-'})


def block_sheet_classes(args):
    sheet = args.get('sheet')
    path = os.path.join(SRC, sheet or '')
    if not sheet or not os.path.exists(path):
        fail('block sheet-classes', 'sheet=%r does not exist in src/' % sheet)
        return ''
    fams = praxis_meta.class_families(path)
    keyed = praxis_meta.bare_selector_classes(path)
    out = ['<table><thead><tr><th>Family</th><th>Mentions</th>'
           '<th>Keyed on directly</th></tr></thead><tbody>']
    for name, n in fams.most_common():
        out.append('<tr><td><code>.%s</code></td><td>%d</td><td>%s</td></tr>'
                   % (html.escape(name), n,
                      'yes' if name in keyed else 'modifier or descendant only'))
    out.append('</tbody></table>')
    out.append('<p class="sw__val">Measured from <code>%s</code> with comments, '
               '<code>url()</code> values and quoted strings stripped. '
               '"Keyed on directly" means a rule exists whose selector is that '
               'bare class — not that the class has a usable base box.</p>'
               % html.escape(sheet))
    return '\n'.join(out)


def block_sheet_classes_md(args):
    sheet = args.get('sheet', '')
    path = os.path.join(SRC, sheet)
    if not os.path.exists(path):
        return ''
    fams = praxis_meta.class_families(path)
    out = ['| Family | Mentions |', '|---|---|']
    for name, n in fams.most_common():
        out.append('| `.%s` | %d |' % (name, n))
    return '\n'.join(out)


def block_inventory(args):
    out = ['<table><thead><tr><th>Sheet</th><th>Rules</th><th>Families</th>'
           '<th>Main class families</th></tr></thead><tbody>']
    for base, rules, _used, fams in praxis_meta.sheet_inventory():
        top = ', '.join('<code>.%s</code>' % html.escape(r) for r, _ in fams.most_common(5))
        out.append('<tr><td><code>%s</code></td><td>%d</td><td>%d</td><td>%s</td></tr>'
                   % (html.escape(base), rules, len(fams), top or '—'))
    out.append('</tbody></table>')
    return '\n'.join(out)


def block_inventory_md(args):
    out = ['| Sheet | Rules | Main class families |', '|---|---|---|']
    for base, rules, _used, fams in praxis_meta.sheet_inventory():
        top = ', '.join('`.%s`' % r for r, _ in fams.most_common(5))
        out.append('| `%s` | %d | %s |' % (base, rules, top or '—'))
    return '\n'.join(out)


def block_stats(args):
    m = praxis_meta.measure()
    cells = [
        (m['tokens'], 'custom properties defined'),
        (format(m['uses'], ','), 'var() usages'),
        ('%d%%' % m['coverage'], 'tokenized'),
        (m['multi'], 'defined in 2+ files'),
        (len(m['undef']), 'used but never defined'),
        (len(m['dead']), 'defined but never used'),
        (m['sheets'], 'stylesheets'),
        (len(praxis_meta.token_cycles()), 'cyclic var() chains'),
    ]
    out = ['<div class="admin-grid admin-grid--4 stat">']
    for n, k in cells:
        out.append('<div class="admin-card admin-card--flush stat__cell">'
                   '<span class="stat__n">%s</span>'
                   '<span class="stat__k">%s</span></div>' % (n, html.escape(k)))
    out.append('</div>')
    return '\n'.join(out)


def block_stats_md(args):
    m = praxis_meta.measure()
    return '\n'.join([
        '| Measure | Value |', '|---|---|',
        '| Distinct custom properties defined | **%d** |' % m['tokens'],
        '| `var()` usages | **%s** |' % format(m['uses'], ','),
        '| Tokenization coverage | **%d%%** |' % m['coverage'],
        '| Used but never defined | %d |' % len(m['undef']),
        '| Cyclic `var()` chains | %d |' % len(praxis_meta.token_cycles()),
    ])


def block_undefined_tokens(args):
    m = praxis_meta.measure()
    if not m['undef']:
        return '<p>None. Every <code>var()</code> in <code>src/</code> resolves.</p>'
    out = ['<table><thead><tr><th>Token</th><th>Referenced by</th></tr></thead><tbody>']
    for t in m['undef']:
        where = sorted({os.path.basename(f) for f in praxis_meta.css_sources()[0]
                        if ('var(%s' % t) in praxis_meta.read_css(f)})
        out.append('<tr><td><code>%s</code></td><td>%s</td></tr>'
                   % (html.escape(t),
                      ', '.join('<code>%s</code>' % html.escape(w) for w in where)))
    out.append('</tbody></table>')
    return '\n'.join(out)


def block_undefined_tokens_md(args):
    m = praxis_meta.measure()
    if not m['undef']:
        return 'None. Every `var()` in `src/` resolves.'
    return '\n'.join(['| Token |', '|---|'] + ['| `%s` |' % t for t in m['undef']])


def block_unkeyed(args):
    rows = praxis_meta.unkeyed_families()
    if not rows:
        return '<p>None.</p>'
    out = ['<table><thead><tr><th>Family</th><th>Mentioned in</th></tr></thead><tbody>']
    for fam, sheets in rows:
        out.append('<tr><td><code>.%s</code></td><td>%s</td></tr>'
                   % (html.escape(fam),
                      ', '.join('<code>%s</code>' % html.escape(s) for s in sheets)))
    out.append('</tbody></table>')
    return '\n'.join(out)


def block_unkeyed_md(args):
    rows = praxis_meta.unkeyed_families()
    if not rows:
        return 'None.'
    return '\n'.join(['| Family | Mentioned in |', '|---|---|']
                     + ['| `.%s` | %s |' % (f, ', '.join('`%s`' % s for s in sheets))
                        for f, sheets in rows])


def block_manifest(args):
    path = os.path.join(DIST, 'manifest.json')
    if not os.path.exists(path):
        fail('block manifest', 'dist/manifest.json is missing — run npm run build first')
        return ''
    man = json.loads(read(path))
    out = ['<table><thead><tr><th>Kind</th><th>Files</th></tr></thead><tbody>']
    for kind in ('css', 'js', 'vendor'):
        out.append('<tr><td>%s</td><td>%s</td></tr>'
                   % (kind, ', '.join('<code>%s</code>' % html.escape(f) for f in man[kind])))
    out.append('</tbody></table>')
    out.append('<h3>Deliberately excluded</h3>')
    out.append('<table><thead><tr><th>File</th><th>Why</th></tr></thead><tbody>')
    for f, why in sorted(man['excluded'].items()):
        out.append('<tr><td><code>%s</code></td><td>%s</td></tr>'
                   % (html.escape(f), html.escape(why)))
    out.append('</tbody></table>')
    return '\n'.join(out)


def block_manifest_md(args):
    path = os.path.join(DIST, 'manifest.json')
    if not os.path.exists(path):
        return ''
    man = json.loads(read(path))
    return '\n'.join(['| File | Why excluded |', '|---|---|']
                     + ['| `%s` | %s |' % (f, w) for f, w in sorted(man['excluded'].items())])


def block_pages(args):
    """A card grid of other pages. Rendered at build time from the page list, so
    a new content file appears here without anyone updating an index."""
    want = [s.strip() for s in (args.get('section') or '').split(',') if s.strip()]
    pages = block_pages.pages or []
    out = ['<div class="admin-grid admin-grid--2 cardgrid">']
    for p in pages:
        if want and p['section'] not in want:
            continue
        if p['section'] == 'overview':
            continue
        out.append('<a class="admin-card admin-card--flush" href="%s%s">'
                   '<strong>%s</strong><span>%s</span></a>'
                   % (block_pages.root, p['href'],
                      html.escape(p['meta']['title']), html.escape(p['meta']['summary'])))
    out.append('</div>')
    return '\n'.join(out)


block_pages.pages = None
block_pages.root = ''


def block_pages_md(args):
    return ''


BLOCKS = {
    'tokens': (block_tokens, block_tokens_md),
    'swatches': (block_swatches, block_tokens_md),
    'scale': (block_scale, block_scale_md),
    'sheet-classes': (block_sheet_classes, block_sheet_classes_md),
    'inventory': (block_inventory, block_inventory_md),
    'stats': (block_stats, block_stats_md),
    'undefined-tokens': (block_undefined_tokens, block_undefined_tokens_md),
    'unkeyed-families': (block_unkeyed, block_unkeyed_md),
    'palette': (block_palette, block_tokens_md),
    'ramp': (block_ramp, block_ramp_md),
    'role-swatches': (block_role_swatches, block_tokens_md),
    'tone-pairs': (block_tone_pairs, block_tone_pairs_md),
    'materials': (block_materials, block_materials_md),
    'variant-extras': (block_variant_extras, block_variant_extras_md),
    'overrides': (block_overrides, block_overrides_md),
    'media-only-tokens': (block_media_only, block_media_only_md),
    'frozen-aliases': (block_frozen_aliases, block_frozen_aliases_md),
    'body-tokens': (block_body_tokens, block_body_tokens_md),
    'absent-tokens': (block_absent_tokens, block_absent_tokens_md),
    'manifest': (block_manifest, block_manifest_md),
    'pages': (block_pages, block_pages_md),
}

BLOCK_TAG = re.compile(r'<praxis-block\b([^>]*?)\s*/?>(?:\s*</praxis-block>)?')
# Matches attr="value" AND a bare boolean attribute. Bare attributes are the
# natural way to write data-shell / data-full, and a value-only pattern silently
# dropped them: the shell example lost its edge-to-edge padding and nobody would
# have seen a build error.
ATTR = re.compile(r'([\w-]+)(?:\s*=\s*"([^"]*)")?')


def attrs_of(text):
    return {m.group(1): (m.group(2) if m.group(2) is not None else '')
            for m in ATTR.finditer(text)}


def expand_blocks(body, rel, markdown=False, collected=None):
    """Replace each <praxis-block> with its rendered output.

    In markdown mode the output is a multi-line table, and HTMLParser collapses
    whitespace in text nodes — which flattened every generated table onto one
    line. So markdown mode substitutes an opaque placeholder and hands the real
    text back through `collected`, to be restored after conversion.
    """
    def sub(m):
        args = attrs_of(m.group(1))
        name = args.pop('name', '')
        if name not in BLOCKS:
            fail(rel, 'unknown <praxis-block name="%s">. Known: %s'
                 % (name, ', '.join(sorted(BLOCKS))))
            return ''
        out = BLOCKS[name][1 if markdown else 0](args)
        if collected is None:
            return out
        collected.append(out)
        return '<p>\x00BLOCK%d\x00</p>' % (len(collected) - 1)
    return BLOCK_TAG.sub(sub, body)


# ---------------------------------------------------------------------------
# Live examples
# ---------------------------------------------------------------------------

TEMPLATE_TAG = re.compile(r'[ \t]*<template\b([^>]*)>(.*?)</template>[ \t]*\n?', re.S)
SCRIPT_TAG = re.compile(r'[ \t]*<script\b[^>]*>.*?</script>[ \t]*\n?', re.S)

SHELL_SCRIPTS = {
    'lucide': 'praxis-lucide.js',
    'mazlan': 'praxis-mazlan.js',
    'create-new': 'praxis-create-new.js',
    'module-chip': 'praxis-module-chip.js',
    'navdrawer': 'praxis-navdrawer.js',
    'profile-menu': 'praxis-profile-menu.js',
    'quick-rail': 'praxis-quick-rail.js',
    'toolbar-compact': 'praxis-toolbar-compact.js',
    'filters': 'praxis-filters.js',
    'dotfield': 'praxis-dotfield.js',
    'breadcrumb-back': 'praxis-breadcrumb-back.js',
    'admin-chrome': 'praxis-admin-chrome.js',
}


def dedent(markup):
    return textwrap.dedent(markup.strip('\n')).rstrip() + '\n'


def extract_examples(body, page, rel):
    """Replace each <template> with a figure, and collect the example documents.

    The <template> content is the single source for both. A <script> inside one
    is inert in the docs page (template content is never executed) and live in
    the generated example, which is what makes an example that needs an init
    call possible without a second mechanism.
    """
    examples = []

    def sub(m):
        attrs = attrs_of(m.group(1))
        markup = dedent(m.group(2))

        if 'data-source-only' in attrs:
            # No frame and no example document. For markup that cannot sensibly
            # run inside an iframe — a whole <html> boot document, or a snippet
            # whose point is the load order rather than the render.
            return (
                '<figure class="ex ex--src">\n'
                '  <figcaption class="ex__cap">%(cap)s</figcaption>\n'
                '  <pre class="admin-panel ex__src"><code>%(code)s</code></pre>\n'
                '</figure>\n'
            ) % {'cap': html.escape(attrs.get('data-example') or 'Markup'),
                 'code': html.escape(markup)}

        n = len(examples) + 1
        caption = attrs.get('data-example') or '%s example %d' % (page['meta']['title'], n)
        name = '%s-%d' % (page['slug'], n)

        wanted = [s.strip() for s in (attrs.get('data-scripts') or '').split(',') if s.strip()]
        for w in wanted:
            if w not in SHELL_SCRIPTS:
                fail(rel, 'data-scripts="%s" is not a Praxis script. Known: %s'
                     % (w, ', '.join(sorted(SHELL_SCRIPTS))))

        examples.append({
            'name': name, 'caption': caption, 'markup': markup,
            'height': attrs.get('data-height', '180'),
            'theme': attrs.get('data-theme', 'light'),
            'pinned': 'data-theme' in attrs,
            'shell': '1' if 'data-shell' in attrs else '0',
            'scripts': [SHELL_SCRIPTS[w] for w in wanted if w in SHELL_SCRIPTS],
            'root': page['root'],
        })

        src = '%sexamples/%s.html' % (page['root'], name)
        # The bar's controls are .tbtn--ghost and the source panel is
        # .admin-panel — the transparent toolbar button and the recessed
        # --px-surface-2 panel Praxis already defines. Only the frame itself is
        # docs-local, because a resizable viewport is not an app component.
        return (
            '<figure class="ex">\n'
            '  <figcaption class="ex__cap">%(cap)s</figcaption>\n'
            '  <div class="ex__frame" style="--ex-h:%(h)spx">\n'
            '    <iframe data-example="%(name)s" data-pinned="%(pin)s" '
            'data-shell="%(shell)s" src="%(src)s"\n'
            '            title="%(cap)s" loading="lazy"></iframe>\n'
            '  </div>\n'
            '  <div class="ex__bar">\n'
            '    <button class="tbtn tbtn--ghost" type="button" data-src-toggle '
            'aria-pressed="false">'
            '<span class="material-symbols-rounded">data_object</span>Source</button>\n'
            '    <a class="tbtn tbtn--ghost" href="%(src)s" target="_blank" rel="noopener">'
            '<span class="material-symbols-rounded">open_in_new</span>Open on its own</a>\n'
            '    <span class="ex__w"></span>\n'
            '  </div>\n'
            '  <pre class="admin-panel ex__src" hidden><code>%(code)s</code></pre>\n'
            '</figure>\n'
        ) % {'cap': html.escape(caption), 'h': attrs.get('data-height', '180'),
             'name': html.escape(name), 'pin': '1' if 'data-theme' in attrs else '0',
             'shell': '1' if 'data-shell' in attrs else '0',
             'src': html.escape(src), 'code': html.escape(markup)}

    return TEMPLATE_TAG.sub(sub, body), examples


def write_example(ex, template):
    """One standalone document per example.

    Load order note: a <script> the author put inside the template is emitted
    AFTER the Praxis component scripts, not where it was written. Those scripts
    initialise on DOMContentLoaded and an inline script would otherwise run
    first and find nothing to talk to. The source panel shows the authored order,
    because that is the order you would write it in your own page, where you
    control whether the library is deferred.
    """
    markup = SCRIPT_TAG.sub('', ex['markup'])
    scripts = ['<script src="%spraxis/%s"></script>' % (ex['root'], s) for s in ex['scripts']]
    scripts += [m.group(0).strip() for m in SCRIPT_TAG.finditer(ex['markup'])]
    return fill(template, {
        'caption': html.escape(ex['caption']),
        'root': ex['root'],
        'theme': ex['theme'],
        'shell': ex['shell'],
        'pad': '0' if ex['shell'] == '1' else '1.25rem',
        'pinned': 'true' if ex['pinned'] else 'false',
        'markup': markup.rstrip(),
        'scripts': '\n'.join(scripts),
    })


# ---------------------------------------------------------------------------
# The component page skeleton
#
# Every component page carries the same sections in the same order, taken from
# the previous EHSQ-E design system docs. Two adaptations, both forced by what
# Praxis is:
#
#   API -> "Markup contract".  That section is Vue props, events and TypeScript
#   interfaces on the old site. Praxis ships no framework bindings, so there are
#   none; the contract is the markup, the classes, the ARIA attributes and the
#   script entry point. Keeping the old heading over that content would be
#   documenting a thing Praxis does not have.
#
#   "Helix alignment" dropped, 2026-08-25. It was an open question on every page
#   and is no longer relevant.
#
# EXTRA headings are allowed and expected — the old site's nav-rail page inserts
# "Create New button", "Pinned items" and "Visibility rules" between Variants and
# States. What is checked is that all twelve canonical sections are PRESENT and in
# canonical RELATIVE order. That makes the skeleton a real contract without
# forcing every component into exactly twelve sections.
# ---------------------------------------------------------------------------

SKELETON = [
    'Anatomy', 'Variants', 'States', 'Responsive behavior', 'Interactive demo',
    'Code', 'Markup contract', 'Token reference', 'Figma adaptation',
    'Usage guidelines', 'Accessibility', 'Dimensions',
]

# Component tiers only. Foundation pages are essays about the system rather than
# documentation of one component, and forcing an "Anatomy" section onto the colour
# page would produce a heading with nothing under it.
SKELETON_SECTIONS = {'ready', 'settling', 'unstable', 'planned'}

H2 = re.compile(r'<h2>(.*?)</h2>', re.S)


def skeleton_problems(page, body):
    """Which canonical sections a component page is missing or has out of order."""
    if page['section'] not in SKELETON_SECTIONS:
        return []
    found = [re.sub(r'<[^>]+>', '', h).strip() for h in H2.findall(body)]
    out = []
    missing = [s for s in SKELETON if s not in found]
    if missing:
        out.append('missing section(s): %s' % ', '.join(missing))
    # Relative order of the ones that ARE present.
    present = [s for s in found if s in SKELETON]
    expected = [s for s in SKELETON if s in present]
    if present != expected:
        out.append('sections out of order: got %s, expected %s'
                   % (' > '.join(present), ' > '.join(expected)))
    dupes = sorted({s for s in present if present.count(s) > 1})
    if dupes:
        out.append('duplicated section(s): %s' % ', '.join(dupes))
    return out


# ---------------------------------------------------------------------------
# Headings, table of contents
# ---------------------------------------------------------------------------

HEADING = re.compile(r'<h([23])>(.*?)</h\1>', re.S)


def headings(body):
    """Give every h2/h3 a stable id and a permalink, and return the toc."""
    toc, seen = [], {}

    def sub(m):
        level, text = int(m.group(1)), m.group(2).strip()
        slug = slugify(text) or 'section'
        seen[slug] = seen.get(slug, 0) + 1
        if seen[slug] > 1:
            slug = '%s-%d' % (slug, seen[slug])
        toc.append((level, slug, re.sub(r'<[^>]+>', '', text)))
        return ('<h%d id="%s">%s<a class="anchor" href="#%s" '
                'aria-label="Permalink">#</a></h%d>' % (level, slug, text, slug, level))

    body = HEADING.sub(sub, body)
    if not toc:
        return body, ''
    items = ['<p class="toc__title">On this page</p>', '<ol>']
    for level, slug, text in toc:
        pad = ' style="padding-left:1.25rem"' if level == 3 else ''
        items.append('<li><a href="#%s"%s>%s</a></li>' % (slug, pad, html.escape(text)))
    items.append('</ol>')
    return body, '\n'.join(items)


# ---------------------------------------------------------------------------
# Navigation
# ---------------------------------------------------------------------------

# A bare prose <table> in a content file, given the Praxis table treatment at
# build time rather than in 30 content files. The content stays plain semantic
# HTML — which the markdown converter needs anyway, since a class attribute is
# noise in PRAXIS-FOR-AGENTS.md — and the site still gets .admin-table.
#
# Non-greedy and anchored on the classless open tag, so it cannot touch the
# token tables (which already carry a class and their own wrapper) and cannot
# re-wrap a table it has already wrapped.
PROSE_TABLE = re.compile(r'<table>(.*?)</table>', re.S)


def praxisify(body):
    return PROSE_TABLE.sub(
        lambda m: ('<div class="admin-table-wrap"><div class="admin-table-scroll">'
                   '<table class="admin-table">%s</table></div></div>' % m.group(1)),
        body)


def render_nav(pages, current):
    """The reference nav as .adminnav — the labelled side nav Praxis already
    ships for exactly this shape: grouped destinations with an active marker,
    beside a filter field. It replaced a hand-rolled .nav__list that reimplemented
    the same three states with different values."""
    out = []
    for key, label in SECTIONS:
        group = [p for p in pages if p['section'] == key]
        if not group:
            continue
        # A classless wrapper, on purpose: the filter hides a whole group when
        # nothing in it matches, and it needs something to hide. Naming it
        # .adminnav__something would be the docs site inventing a part of a
        # Praxis component from the outside.
        out.append('        <div>')
        out.append('          <p class="adminnav__group">%s</p>' % html.escape(label))
        for p in group:
            cur = ' aria-current="page"' if p is current else ''
            active = ' adminnav__item--active' if p is current else ''
            kw = html.escape('%s %s %s' % (p['meta'].get('classes', ''),
                                           p['meta'].get('sheet', ''),
                                           p['meta'].get('keywords', '')))
            # No glyph. .adminnav__item has an icon slot, but every page in a
            # section would carry its section's icon and twelve identical
            # glyphs down one column is noise, not navigation.
            out.append('          <a class="adminnav__item%s" data-keywords="%s" '
                       'href="%s%s"%s><span>%s</span></a>'
                       % (active, kw, current['root'], p['href'], cur,
                          html.escape(p['meta']['title'])))
        out.append('        </div>')
    return '\n'.join(out)


def render_breadcrumb(page):
    """Home glyph, section, current page — the .breadcrumb component's own
    anatomy. The section is not a page, so it is plain text rather than a dead
    link to nothing."""
    label = dict(SECTIONS).get(page['section'], page['section'])
    # The overview page IS home, so it gets the glyph and its own name and no
    # trail: "home > Praxis" on the Praxis page is a crumb pointing at itself.
    if page['section'] == 'overview':
        return ('          <span class="breadcrumb__current">'
                '<span class="material-symbols-rounded">home</span>%s</span>'
                % html.escape(page['meta']['title']))
    parts = ['          <a class="breadcrumb__home" href="%sindex.html" aria-label="Praxis home">'
             '<span class="material-symbols-rounded">home</span></a>' % page['root'],
             '          <span class="breadcrumb__sep">'
             '<span class="material-symbols-rounded">chevron_right</span></span>',
             '          <span>%s</span>' % html.escape(label),
             '          <span class="breadcrumb__sep">'
             '<span class="material-symbols-rounded">chevron_right</span></span>',
             '          <span class="breadcrumb__current">%s</span>'
             % html.escape(page['meta']['title'])]
    return '\n'.join(parts)


def render_status(page):
    """The tier, as an .admin-pill in .pageheader__status. One word in the pill
    and the full sentence in the title attribute — the pill is 22px tall and the
    long label was being truncated."""
    tier = page['meta'].get('tier')
    if not tier:
        return ''
    return ('<span class="admin-pill admin-pill--%s" title="%s">%s</span>'
            % (TIER_PILL.get(tier, 'off'),
               html.escape(TIER_LABEL.get(tier, tier)),
               html.escape(TIER_SHORT.get(tier, tier))))


def render_meta(page):
    """The toolbar band: the sheets and scripts this page documents, as links to
    their source.

    These were decorative chips under the title. Every one of them names a real
    file in src/, so making them .tbtn links to that file turns page metadata
    into the action a reader actually wants next — and the band is what Praxis
    provides for page-level actions."""
    meta, out = page['meta'], []
    for key, glyph, folder in (('sheet', 'draw', 'src'), ('scripts', 'bolt', 'src')):
        for name in [x.strip() for x in (meta.get(key) or '').split(',') if x.strip()]:
            if not os.path.exists(os.path.join(SRC, name)):
                fail(page['rel'], '%s: %s does not exist in src/' % (key, name))
            out.append('        <a class="tbtn tbtn--ghost" href="%s/blob/main/%s/%s">'
                       '<span class="material-symbols-rounded">%s</span>%s</a>'
                       % (GITHUB, folder, name, glyph, html.escape(name)))
    return '\n'.join(out)


def render_pagenav(pages, page, root):
    """Previous / next as .admin-card, the card surface the rest of the system
    uses. They were bespoke bordered boxes with their own hover shadow."""
    i = pages.index(page)
    parts = []
    for label, other in (('Previous', pages[i - 1] if i > 0 else None),
                         ('Next', pages[i + 1] if i < len(pages) - 1 else None)):
        if not other:
            continue
        parts.append('<a class="admin-card admin-card--flush" href="%s%s">'
                     '<span class="pagenav__dir">%s</span>'
                     '<strong>%s</strong></a>'
                     % (root, other['href'], label, html.escape(other['meta']['title'])))
    return '\n'.join(parts)


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def build():
    del problems[:]
    if not os.path.exists(os.path.join(DIST, 'manifest.json')):
        fail('dist', 'dist/ is missing. It is gitignored, so run `npm run build` first — '
                     'the site renders the real package, not a copy of it.')
        return None

    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    # The real package, mirrored. Every example links this, so what the site
    # renders is what a consumer installs.
    shutil.copytree(DIST, os.path.join(OUT, 'praxis'))
    shutil.copytree(ASSETS, os.path.join(OUT, 'assets'))
    os.makedirs(os.path.join(OUT, 'examples'))

    page_tpl = read(os.path.join(TEMPLATES, 'page.html'))
    ex_tpl = read(os.path.join(TEMPLATES, 'example.html'))
    probe_tpl = read(os.path.join(TEMPLATES, 'probe.html'))
    redirect_tpl = read(os.path.join(TEMPLATES, 'redirect.html'))
    ver = version()

    for theme in ('light', 'dark'):
        open(os.path.join(OUT, 'examples', '_probe-%s.html' % theme), 'w',
             encoding='utf-8').write(fill(probe_tpl, {'root': '../', 'theme': theme}))

    pages = load_pages()
    block_pages.pages = pages
    n_examples = 0
    del skeleton_report[:]

    for page in pages:
        block_pages.root = page['root']
        # {{version}} in a content body, so a CDN URL in an example cannot drift
        # from package.json. The README's pins drifted two versions this way
        # before CI started warning about them; content should not be able to.
        body = page['body'].replace('{{version}}', ver)
        body = expand_blocks(body, page['rel'])
        body, examples = extract_examples(body, page, page['rel'])
        # After extract_examples: a <template>'s markup is escaped text by now,
        # so example markup that contains a <table> is not rewritten.
        body = praxisify(body)
        for problem in skeleton_problems(page, body):
            skeleton_report.append('%s: %s' % (page['rel'], problem))
        body, toc = headings(body)

        for ex in examples:
            open(os.path.join(OUT, 'examples', ex['name'] + '.html'), 'w',
                 encoding='utf-8').write(write_example(ex, ex_tpl))
        n_examples += len(examples)

        out_path = os.path.join(OUT, page['href'])
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        open(out_path, 'w', encoding='utf-8').write(fill(page_tpl, {
            'title': html.escape(page['meta']['title']),
            'summary': html.escape(page['meta']['summary']),
            'icon': html.escape(page['meta']['icon']),
            'rel': page['rel'].replace(os.sep, '/'),
            'breadcrumb': render_breadcrumb(page),
            'status': render_status(page),
            'meta': render_meta(page),
            'nav': render_nav(pages, page),
            'pagecount': len(pages),
            'body': body,
            'toc': toc,
            'pagenav': render_pagenav(pages, page, page['root']),
            'version': ver,
            'root': page['root'],
        }))

    # Redirect stubs. Written last so a stub can never overwrite a real page:
    # every real href already exists on disk by this point.
    real = {p['href'] for p in pages}
    n_redirects = 0
    for page in pages:
        for old in page['redirects']:
            if old in real:
                fail(page['rel'], 'redirect_from: %s is a real page on this site. A stub '
                                  'would overwrite it.' % old)
                continue
            old_path = os.path.join(OUT, old)
            if os.path.exists(old_path):
                fail(page['rel'], 'redirect_from: %s already exists in the output' % old)
                continue
            os.makedirs(os.path.dirname(old_path), exist_ok=True)
            # Relative, so the site keeps working under a path prefix — it is
            # served from /praxis/ on Pages, not from the domain root.
            target = os.path.relpath(page['href'], os.path.dirname(old)).replace(os.sep, '/')
            depth = old.count('/')
            open(old_path, 'w', encoding='utf-8').write(fill(redirect_tpl, {
                'target': html.escape(target),
                'targetjson': json.dumps(target),
                'title': html.escape(page['meta']['title']),
                'from': html.escape('/' + old),
                'root': '../' * depth,
            }))
            n_redirects += 1

    # Coverage is a GATE now, not advisory. It went from 15% to 100% while these
    # pages were written; leaving it advisory would let the next component sheet
    # land undocumented and nobody would notice until a teammate could not find
    # the class. The threshold is every family, because that is where it is.
    _everywhere, _claimed, _missing, _states = coverage(pages)
    if _missing or _states:
        fail('coverage', '%d class family/families are not claimed by any page\'s '
                         '`classes:` metadata: %s. Add them to the page that documents '
                         'them, or write that page.'
             % (len(_missing) + len(_states),
                ', '.join('.' + f for f in (_missing + _states)[:10])
                + (' …' if len(_missing) + len(_states) > 10 else '')))

    # A GATE as of 2026-08-18, when the last four were fixed. It was advisory
    # while they existed, because failing here would have turned main red for a
    # pre-existing bug in src/ that nobody had a way to see until this site
    # measured it. At zero there is no reason to let a fifth one in.
    # A GATE. Nine tokens were declared on :root and again under the variant, at a
    # higher specificity, so praxis-tokens.css was the wrong answer for all nine
    # (--praxis-radius-card read 20px and rendered 12px). Folded into :root in
    # 0.1.10; measuring the emptiness is what keeps a tenth from landing.
    dupes = praxis_meta.variant_overrides()
    if dupes:
        fail('duplicate token declarations',
             '%d token(s) are declared in praxis-tokens.css and re-declared under '
             'body[data-variant="praxis"]: %s. The variant wins on specificity, so '
             'the token file states a value that never renders. Only one variant '
             'exists \u2014 put the real value on :root and delete the override.'
             % (len(dupes), ', '.join('%s (%s -> %s)' % (n, a, b)
                                      for n, a, b, _d in dupes[:5])))

    # A GATE, and the one that makes frozen aliases impossible rather than merely
    # absent. Custom-property substitution happens at the element where the
    # declaration lives, so a token declared on <body> cannot be seen by any
    # :root alias of it. 127 declarations were in this state until 2026-08-26.
    on_body = praxis_meta.body_declared_tokens()
    if on_body:
        fail('tokens on body',
             '%d token declaration(s) sit on <body> rather than :root: %s. A :root '
             'alias of any of them silently keeps the pre-override value. Move the '
             'block to :root — use :root:has(body[data-theme="dark"]) if it needs to '
             'see an attribute on <body>, which keeps the markup contract unchanged.'
             % (len(on_body),
                ', '.join('%s (%s)' % (t, sel) for t, sel, _v in on_body[:6])
                + (' \u2026' if len(on_body) > 6 else '')))

    frozen_now = praxis_meta.frozen_aliases()
    if frozen_now:
        fail('frozen aliases',
             '%d token(s) alias a rung that is re-declared on <body>, while the alias '
             'itself is declared on :root — so the re-declaration can never reach '
             'them: %s. Substitution happens where the declaration lives. Fix by '
             'declaring the rung on :root too, not by restating the alias in one '
             'theme: a dark restatement leaves the light half frozen, which is how '
             '--praxis-color-status-info stayed half-broken.'
             % (len(frozen_now),
                ', '.join('%s -> %s (%s)' % (t, r, ax) for t, r, ax, _v in frozen_now)))

    # A GATE. The skeleton is what makes 39 component pages answer the same
    # questions in the same order; a page that quietly drops "Accessibility"
    # looks complete and is not. Checked on the EXPANDED body, so a section
    # emitted by a praxis-block counts.
    if skeleton_report:
        fail('skeleton', '%d component page(s) do not follow the section skeleton:\n    %s'
             % (len({r.split(':')[0] for r in skeleton_report}),
                '\n    '.join(skeleton_report)))

    every = {name for _g, name, _l, _d in praxis_meta.token_rows()}
    every |= {name for _g, name, _l, _d in praxis_meta.material_rows()}
    every |= {name for _g, name, _l, _d in praxis_meta.variant_extras()}
    unseen = sorted(every - rendered_tokens)
    if unseen:
        fail('coverage', '%d token(s) are defined in src/ but on no page: %s. '
                         'Add them to a <praxis-block name="tokens" prefix="..."> — a '
                         'token nobody can look up is invisible to every consumer.'
             % (len(unseen), ', '.join(unseen[:8]) + (' …' if len(unseen) > 8 else '')))

    return {'pages': pages, 'examples': n_examples, 'version': ver,
            'redirects': n_redirects, 'unseen_tokens': unseen}


# ---------------------------------------------------------------------------
# The agent doc, rendered from the same content
# ---------------------------------------------------------------------------

ALLOWED = {
    'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'code', 'strong', 'em', 'a', 'blockquote', 'hr', 'br', 'template', 'span', 'div',
}

# Tags that may only appear INSIDE a <template>, where the content is example
# markup rather than prose and is emitted verbatim as a fenced block.
PROSE_ONLY = {'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'thead', 'tbody',
              'tr', 'th', 'td', 'code', 'strong', 'em', 'a', 'blockquote', 'hr', 'br'}


class ToMarkdown(HTMLParser):
    """A converter over a CLOSED tag vocabulary, not a general one.

    Authoring the site in HTML means the agent doc needs HTML to markdown, and a
    general converter is a large hand-rolled parser — exactly the risk worth
    avoiding. This one refuses anything outside ALLOWED, naming the file and the
    tag, so it cannot silently mis-convert: an unrecognised tag is a build
    failure, not a guess.
    """

    def __init__(self, rel):
        super().__init__(convert_charrefs=True)
        self.rel = rel
        self.out = []
        self.stack = []
        self.list_stack = []
        self.row = []
        self.cell = None
        self.in_table = False
        self.header_done = False
        self.in_template = 0
        self.template = []

    def handle_starttag(self, tag, attrs):
        if self.in_template:
            self.template.append(self.get_starttag_text())
            if tag == 'template':
                self.in_template += 1
            return
        if tag == 'praxis-block':
            return  # already expanded before conversion
        if tag not in ALLOWED:
            fail(self.rel, 'tag <%s> is not in the agent-doc whitelist. Allowed: %s'
                 % (tag, ', '.join(sorted(PROSE_ONLY))))
            return
        if tag == 'template':
            self.in_template = 1
            self.template = []
            return
        if tag in ('div', 'span'):
            return
        self.stack.append(tag)
        if tag in ('h2', 'h3', 'h4'):
            # Demoted one level: the page title is the ## in the agent doc, so a
            # content h2 is its child. Flat, they read as siblings and the
            # document loses its structure entirely.
            self.out.append('\n' + '#' * (int(tag[1]) + 1) + ' ')
        elif tag == 'p':
            self.out.append('\n')
        elif tag in ('ul', 'ol'):
            self.list_stack.append([tag, 0])
            self.out.append('\n')
        elif tag == 'li':
            kind, i = self.list_stack[-1] if self.list_stack else ('ul', 0)
            if self.list_stack:
                self.list_stack[-1][1] = i + 1
            indent = '  ' * (len(self.list_stack) - 1)
            self.out.append('\n%s%s ' % (indent, '-' if kind == 'ul' else '%d.' % (i + 1)))
        elif tag == 'blockquote':
            self.out.append('\n> ')
        elif tag == 'hr':
            self.out.append('\n---\n')
        elif tag == 'br':
            self.out.append('  \n')
        elif tag == 'code':
            self.push('`')
        elif tag == 'strong':
            self.push('**')
        elif tag == 'em':
            self.push('*')
        elif tag == 'a':
            self.push('[')
            self.href = dict(attrs).get('href', '')
        elif tag == 'table':
            self.in_table = True
            self.header_done = False
            self.out.append('\n')
        elif tag == 'tr':
            self.row = []
        elif tag in ('th', 'td'):
            self.cell = []

    def handle_endtag(self, tag):
        if self.in_template:
            if tag == 'template':
                self.in_template -= 1
                if self.in_template == 0:
                    body = dedent(''.join(self.template))
                    self.out.append('\n```html\n%s```\n' % body)
                    return
            self.template.append('</%s>' % tag)
            return
        if tag in ('praxis-block', 'div', 'span') or tag not in ALLOWED:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        if tag in ('h2', 'h3', 'h4', 'p', 'blockquote'):
            self.out.append('\n')
        elif tag in ('ul', 'ol'):
            if self.list_stack:
                self.list_stack.pop()
            self.out.append('\n')
        elif tag == 'code':
            self.push('`')
        elif tag == 'strong':
            self.push('**')
        elif tag == 'em':
            self.push('*')
        elif tag == 'a':
            self.out.append('](%s)' % getattr(self, 'href', ''))
        elif tag in ('th', 'td'):
            self.row.append(''.join(self.cell).strip().replace('\n', ' '))
            self.cell = None
        elif tag == 'tr':
            self.out.append('| %s |\n' % ' | '.join(self.row))
            if not self.header_done:
                self.out.append('|%s\n' % ('---|' * len(self.row)))
                self.header_done = True
            self.row = []
        elif tag == 'table':
            self.in_table = False
            self.out.append('\n')

    def push(self, text):
        """Inline output goes to the current table cell when there is one.

        Block-level handlers write to self.out directly; only inline markers use
        this. Without the distinction, a <code> inside a <td> emitted its
        backticks to self.out and they surfaced at the head of the next row.
        """
        if self.cell is not None:
            self.cell.append(text)
        else:
            self.out.append(text)

    def handle_decl(self, decl):
        # <!DOCTYPE html> inside a source-only template is part of the snippet.
        if self.in_template:
            self.template.append('<!%s>' % decl)

    def handle_comment(self, data):
        # Inside a template a comment is part of the example and must survive.
        # In prose it is a note to whoever edits the content file, not output.
        if self.in_template:
            self.template.append('<!--%s-->' % data)

    def handle_data(self, data):
        if self.in_template:
            self.template.append(data)
            return
        if self.cell is not None:
            self.cell.append(data)
            return
        if not data.strip():
            if self.out and not self.out[-1].endswith((' ', '\n')):
                self.out.append(' ')
            return
        self.out.append(re.sub(r'\s+', ' ', data))

    def result(self):
        text = ''.join(self.out)
        text = re.sub(r'[ \t]+\n', '\n', text)
        return re.sub(r'\n{3,}', '\n\n', text).strip() + '\n'


AGENTS_HEADER = """<!-- GENERATED FILE — DO NOT EDIT.

     Rendered from site/content/ by build-site.py --agents-doc. The reference
     site at https://ideagen-ax.github.io/praxis/ and this file are two
     renderings of one source, so they cannot drift.

     To change anything here, edit the matching file under site/content/ and
     re-run:  python3 build-site.py --agents-doc

     Measured from src/ at Praxis %(version)s. Where a statement is inferred from
     CSS structure rather than observed, it says so.
-->

# Praxis for agents

%(summary)s

"""


LINK = re.compile(r'\]\(([^)]+)\)')


def relink(text, href_to_anchor):
    """Rewrite site-relative hrefs to anchors within the single markdown file.

    `foundations/theming.html` means nothing in a file with no directories, and a
    reader following it gets a 404 rather than the section three pages down.
    """
    def sub(m):
        href = m.group(1)
        if href.startswith(('http://', 'https://', '#', 'mailto:')):
            return m.group(0)
        path, _, frag = href.partition('#')
        if frag:
            return '](#%s)' % frag
        key = os.path.basename(path)
        return '](%s)' % href_to_anchor.get(key, '#' + slugify(key.replace('.html', '')))
    return LINK.sub(sub, text)


def agents_doc(pages):
    """Render every content page to one markdown document, in nav order.

    `tier: planned` pages are EXCLUDED, and that is not a size decision.
    PRAXIS-FOR-AGENTS.md ships in the npm tarball and its whole contract — stated
    at the top of CLAUDE.md — is that it says what Praxis *defines*, not what it
    intends. A planned page describes a component with no rule in `src/`; putting
    it in the guide invites an agent to write markup against a class that does not
    exist, which is the exact failure the `.btn` gap causes today and the reason
    that gap is documented rather than implied.

    They are still on the SITE, in their own nav section, with a Planned pill and
    an opening callout. A human reading a page titled "Planned" understands it;
    an agent grepping one markdown file for a class name does not.
    """
    href_to_anchor = {os.path.basename(p['href']): '#' + slugify(p['meta']['title'])
                      for p in pages if p['section'] != 'planned'}
    parts = []
    for page in pages:
        if page['section'] in ('overview', 'planned'):
            continue
        blocks = []
        body = page['body'].replace('{{version}}', version())
        body = expand_blocks(body, page['rel'], markdown=True, collected=blocks)
        parser = ToMarkdown(page['rel'])
        parser.feed(body)
        parser.close()
        meta = page['meta']
        head = ['## %s' % meta['title'], '', meta['summary'], '', '']
        facts = []
        if meta.get('tier'):
            facts.append('Tier: **%s**' % meta['tier'])
        if meta.get('sheet'):
            facts.append('Sheet: `%s`' % meta['sheet'])
        if meta.get('scripts'):
            facts.append('Script: `%s`' % meta['scripts'])
        if facts:
            head += [' · '.join(facts), '']
        text = parser.result()
        # The placeholders survive HTMLParser's whitespace collapsing precisely
        # because they contain none; the real multi-line tables go back in here.
        for i, md in enumerate(blocks):
            text = text.replace('\x00BLOCK%d\x00' % i, '\n' + md + '\n')
        parts.append(relink('\n'.join(head) + text, href_to_anchor))
    overview = next((p for p in pages if p['section'] == 'overview'), None)
    summary = overview['meta']['summary'] if overview else ''
    return (AGENTS_HEADER % {'version': version(), 'summary': summary}
            + '\n---\n\n'.join(parts))


# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------

# Modifier conventions shared across sheets, not components. Documented once, in
# one place, rather than counted against every sheet that uses them.
STATE_FAMILIES = {'is-active', 'is-checked', 'is-collapsed', 'is-expanded', 'is-mixed',
                  'is-on', 'is-open', 'is-sel', 'is-selected', 'is-spinning', 'is-current',
                  'is-dragging', 'is-hidden', 'is-loading'}


def coverage(pages):
    """Which class families no page CLAIMS in its `classes:` metadata.

    The first version of this asked whether the family appeared anywhere in a
    content file, which was far too generous: `.card` counted as documented
    because seven pages mention it in prose, while it had no example and no page
    of its own. A page has to claim a family for it to count.

    Counted DISTINCT, not per sheet. The per-sheet count reported 197 where 177
    families were real, because `.appswitch`, `.ws-item` and twelve others appear
    in several sheets and were counted once each time.
    """
    claimed = set()
    for page in pages:
        for c in re.split(r'[,\s]+', page['meta'].get('classes', '')):
            c = c.strip().lstrip('.')
            if c:
                claimed.add(re.split(r'__|--', c)[0])

    everywhere = collections.defaultdict(set)
    for base, _rules, _used, fams in praxis_meta.sheet_inventory():
        for fam in fams:
            everywhere[fam].add(base)

    missing = sorted(f for f in everywhere if f not in claimed and f not in STATE_FAMILIES)
    states = sorted(f for f in everywhere if f in STATE_FAMILIES and f not in claimed)
    return everywhere, claimed, missing, states


# ---------------------------------------------------------------------------
# Serve
# ---------------------------------------------------------------------------

def serve(port):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=OUT, **kw)

        def do_GET(self):
            # Rebuild on every document request, so a browser refresh is the
            # whole dev loop — no watcher to miss a file, no stale cache. The
            # build is string assembly over ~30 files; it costs milliseconds.
            if not os.path.splitext(self.path.split('?')[0])[1] or self.path.endswith('.html'):
                result = build()
                if problems:
                    print('  %d problem(s):' % len(problems))
                    for p in problems:
                        print('    - %s' % p)
                elif result:
                    print('  rebuilt %d pages, %d examples'
                          % (len(result['pages']), result['examples']))
            return super().do_GET()

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

        def log_message(self, fmt, *args):
            pass

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('127.0.0.1', port), Handler) as httpd:
        print('Praxis reference site on http://127.0.0.1:%d/' % port)
        print('Rebuilds on each page request. Ctrl-C to stop.')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nstopped')


# ---------------------------------------------------------------------------

def main():
    argv = sys.argv[1:]
    result = build()

    if problems:
        print('FAILED — %d problem(s):' % len(problems))
        for p in problems:
            print('  - %s' % p)
        return 1

    pages = result['pages']
    counts = {}
    for key, _label in SECTIONS:
        counts[key] = len([p for p in pages if p['section'] == key])

    if '--agents-doc' in argv:
        out = os.path.join(HERE, 'PRAXIS-FOR-AGENTS.md')
        doc = agents_doc(pages)
        # An unreplaced placeholder is silent corruption of exactly the kind this
        # repo keeps getting bitten by: the file writes, the byte count looks
        # right, and a NUL turns the whole document binary so grep stops seeing
        # it. Assert rather than trust.
        if '\x00' in doc or 'BLOCK' in doc.replace('BLOCKQUOTE', ''):
            fail('agents-doc', 'a generated block placeholder was not substituted — '
                               'the output would contain NUL bytes')
        # Fenced blocks are example markup and are SUPPOSED to contain tags, so
        # they come out before this check. Anything left is prose that failed to
        # convert.
        prose = re.sub(r'```.*?```', '', doc, flags=re.S)
        # Inline code too: prose legitimately says "followed by a `<span>`".
        prose = re.sub(r'`[^`\n]*`', '', prose)
        stray = re.findall(r'</?(?:div|span|template|praxis-block|p|table|li)\b', prose)
        if stray:
            fail('agents-doc', 'raw HTML survived conversion to markdown: %s'
                 % ', '.join(sorted(set(stray))))
        if problems:
            print('FAILED — %d problem(s) converting content to markdown:' % len(problems))
            for p in problems:
                print('  - %s' % p)
            return 1
        before = read(out) if os.path.exists(out) else None
        open(out, 'w', encoding='utf-8').write(doc)
        # Count what was WRITTEN, not what was offered. agents_doc() skips the
        # overview and every `tier: planned` page, so subtracting only the
        # overview overstated the total by the size of the backlog.
        rendered = sum(1 for p in pages if p['section'] not in ('overview', 'planned'))
        skipped = counts.get('planned', 0)
        print('wrote %s (%d pages, %d lines%s)%s'
              % (os.path.basename(out), rendered, doc.count('\n'),
                 ', %d planned page(s) excluded' % skipped if skipped else '',
                 '' if before == doc else '  — CHANGED'))
        return 0

    if '--coverage' in argv:
        everywhere, claimed, missing, states = coverage(pages)
        total = len(everywhere)
        done = total - len(missing) - len(states)
        print('Class-family coverage \u2014 a family counts only when a page claims it '
              'in its `classes:` metadata.\n')
        print('  %d of %d distinct families claimed (%d%%)'
              % (done, total, round(100.0 * done / total)))
        if states:
            print('  %d shared state modifier(s) unclaimed: %s'
                  % (len(states), ', '.join('.' + f for f in states)))
        print()
        by_sheet = collections.defaultdict(list)
        for fam in missing:
            for sheet in sorted(everywhere[fam]):
                by_sheet[sheet].append(fam)
        for sheet in sorted(by_sheet):
            fams = by_sheet[sheet]
            print('  %-28s %3d unclaimed' % (sheet, len(fams)))
            line = '      '
            for f in fams:
                if len(line) + len(f) > 92:
                    print(line)
                    line = '      '
                line += '.' + f + ' '
            if line.strip():
                print(line)
        print('\n  %d distinct families unclaimed. Advisory until the list is short.'
              % len(missing))
        return 0

    print('Praxis %s reference site → _site/' % result['version'])
    if result['redirects']:
        print('  %d redirect stub(s) for renamed pages' % result['redirects'])
    print('  %d pages (%s), %d live examples'
          % (len(pages),
             ', '.join('%d %s' % (counts[k], l.lower().replace('components — ', ''))
                       for k, l in SECTIONS if counts[k]),
             result['examples']))
    m = praxis_meta.measure()
    print('  %d tokens measured, %d cyclic var() chains, %d used-but-undefined'
          % (m['tokens'], len(praxis_meta.token_cycles()), len(m['undef'])))
    frozen = praxis_meta.frozen_aliases()
    if frozen:
        print('  %d frozen alias(es) — see the failure above' % len(frozen))

    if '--check' in argv:
        # Exercise the markdown conversion too, in memory. Otherwise CI can pass
        # while --agents-doc is broken, and the breakage only surfaces when
        # someone regenerates the guide that ships in the tarball.
        doc = agents_doc(pages)
        if problems:
            print('FAILED — %d problem(s) in the agent-doc conversion:' % len(problems))
            for p in problems:
                print('  - %s' % p)
            return 1
        guide = os.path.join(HERE, 'PRAXIS-FOR-AGENTS.md')
        if not os.path.exists(guide) or read(guide) != doc:
            print('FAILED — PRAXIS-FOR-AGENTS.md is STALE. It is generated from '
                  'site/content/ and ships in the npm tarball, so a content edit that '
                  'does not reach it publishes a guide that disagrees with the site. '
                  'Run: python3 build-site.py --agents-doc')
            return 1
        print('  markdown conversion clean, PRAXIS-FOR-AGENTS.md current')
        print('  check passed')
        return 0

    for i, a in enumerate(argv):
        if a == '--serve':
            port = int(argv[i + 1]) if i + 1 < len(argv) and argv[i + 1].isdigit() else 8000
            serve(port)
            return 0
    return 0


if __name__ == '__main__':
    sys.exit(main())
