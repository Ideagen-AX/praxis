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
]

TIER_LABEL = {
    'ready': 'Ready · in daily use and load-bearing',
    'settling': 'Settling · real and working, one or two consumers',
    'unstable': 'Unstable · page-scoped, expect reorganisation',
}

problems = []


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
            fail(rel, 'tier must be ready, settling or unstable (got %r)' % section)
            section = 'settling'

    slug = meta.get('slug') or os.path.splitext(os.path.basename(path))[0]
    subdir = os.path.dirname(rel)
    return {
        'path': path, 'rel': rel, 'meta': meta, 'section': section, 'slug': slug,
        'subdir': subdir,
        'href': os.path.join(subdir, slug + '.html').replace(os.sep, '/'),
        'root': '../' if subdir else '',
        'order': int(meta.get('order', '50')),
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
    out = ['<table class="tokentable">',
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
    out += ['</tbody></table>']
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
    out = ['<table class="tokentable">',
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
    out.append('</tbody></table>')
    if note:
        out.append('<p class="sw__val">%s</p>' % note)
    return '\n'.join(out)


def block_materials(args):
    rows = praxis_meta.material_rows()
    rendered_tokens.update(r[1] for r in rows)
    return _rows_table(rows, 'Defined in <code>praxis-core.css</code> under '
                             '<code>body[data-variant="praxis"]</code>, once per theme — '
                             'not in <code>praxis-tokens.css</code>.')


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
    out = ['<table><thead><tr><th>Token</th><th>Aliases</th>'
           '<th>Dark value that never applies</th></tr></thead><tbody>']
    for token, rung, dark in rows:
        out.append('<tr><td><code>%s</code></td><td><code>%s</code></td>'
                   '<td><code>%s</code></td></tr>'
                   % (html.escape(token), html.escape(rung), html.escape(dark)))
    out.append('</tbody></table>')
    out.append('<p class="sw__val">Detected from structure every build, not from the '
               'resolved values \u2014 asking a resolver would give the wrong answer, '
               'because it substitutes the dark rung the browser never reaches.</p>')
    return '\n'.join(out)


def block_frozen_aliases_md(args):
    rows = praxis_meta.frozen_aliases()
    if not rows:
        return 'None.'
    return '\n'.join(['| Token | Aliases | Dark value that never applies |', '|---|---|---|']
                     + ['| `%s` | `%s` | `%s` |' % r for r in rows])


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
    out = ['<div class="stat">']
    for n, k in cells:
        out.append('<div class="stat__cell"><span class="stat__n">%s</span>'
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
    out = ['<div class="cardgrid">']
    for p in pages:
        if want and p['section'] not in want:
            continue
        if p['section'] == 'overview':
            continue
        out.append('<a href="%s%s"><strong>%s</strong><span>%s</span></a>'
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
                '  <pre class="ex__src"><code>%(code)s</code></pre>\n'
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
        return (
            '<figure class="ex">\n'
            '  <figcaption class="ex__cap">%(cap)s</figcaption>\n'
            '  <div class="ex__frame" style="--ex-h:%(h)spx">\n'
            '    <iframe data-example="%(name)s" data-pinned="%(pin)s" '
            'data-shell="%(shell)s" src="%(src)s"\n'
            '            title="%(cap)s" loading="lazy"></iframe>\n'
            '  </div>\n'
            '  <div class="ex__bar">\n'
            '    <button type="button" data-src-toggle aria-pressed="false">Source</button>\n'
            '    <a href="%(src)s" target="_blank" rel="noopener">Open on its own</a>\n'
            '    <span class="ex__w"></span>\n'
            '  </div>\n'
            '  <pre class="ex__src" hidden><code>%(code)s</code></pre>\n'
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

def render_nav(pages, current):
    out = []
    for key, label in SECTIONS:
        group = [p for p in pages if p['section'] == key]
        if not group:
            continue
        out.append('    <div class="nav__section">')
        out.append('      <p class="nav__title">%s</p>' % html.escape(label))
        out.append('      <ul class="nav__list">')
        for p in group:
            cur = ' aria-current="page"' if p is current else ''
            kw = html.escape('%s %s %s' % (p['meta'].get('classes', ''),
                                           p['meta'].get('sheet', ''),
                                           p['meta'].get('keywords', '')))
            out.append('        <li data-keywords="%s"><a href="%s%s"%s>%s</a></li>'
                       % (kw, current['root'], p['href'], cur, html.escape(p['meta']['title'])))
        out.append('      </ul>')
        out.append('    </div>')
    return '\n'.join(out)


def render_meta(page):
    meta, chips = page['meta'], []
    tier = meta.get('tier')
    if tier:
        chips.append('<span class="chip chip--%s">%s</span>'
                     % (tier, html.escape(TIER_LABEL.get(tier, tier))))
    if meta.get('sheet'):
        for sheet in [s.strip() for s in meta['sheet'].split(',') if s.strip()]:
            if not os.path.exists(os.path.join(SRC, sheet)):
                fail(page['rel'], 'sheet: %s does not exist in src/' % sheet)
            chips.append('<span class="chip">%s</span>' % html.escape(sheet))
    if meta.get('scripts'):
        for s in [s.strip() for s in meta['scripts'].split(',') if s.strip()]:
            chips.append('<span class="chip">%s</span>' % html.escape(s))
    return ''.join(chips)


def render_pagenav(pages, page, root):
    i = pages.index(page)
    parts = []
    if i > 0:
        prev = pages[i - 1]
        parts.append('<a href="%s%s"><span>Previous</span><strong>%s</strong></a>'
                     % (root, prev['href'], html.escape(prev['meta']['title'])))
    if i < len(pages) - 1:
        nxt = pages[i + 1]
        parts.append('<a href="%s%s"><span>Next</span><strong>%s</strong></a>'
                     % (root, nxt['href'], html.escape(nxt['meta']['title'])))
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
    ver = version()

    for theme in ('light', 'dark'):
        open(os.path.join(OUT, 'examples', '_probe-%s.html' % theme), 'w',
             encoding='utf-8').write(fill(probe_tpl, {'root': '../', 'theme': theme}))

    pages = load_pages()
    block_pages.pages = pages
    n_examples = 0

    for page in pages:
        block_pages.root = page['root']
        body = expand_blocks(page['body'], page['rel'])
        body, examples = extract_examples(body, page, page['rel'])
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
            'meta': render_meta(page),
            'nav': render_nav(pages, page),
            'body': body,
            'toc': toc,
            'pagenav': render_pagenav(pages, page, page['root']),
            'version': ver,
            'root': page['root'],
        }))

    # The docs script needs to know how far up examples/ is to load the probes.
    for page in pages:
        p = os.path.join(OUT, page['href'])
        s = read(p).replace('<body>', '<body data-root="%s">' % page['root'], 1)
        open(p, 'w', encoding='utf-8').write(s)

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
            'unseen_tokens': unseen}


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
    """Render every content page to one markdown document, in nav order."""
    href_to_anchor = {os.path.basename(p['href']): '#' + slugify(p['meta']['title'])
                      for p in pages}
    parts = []
    for page in pages:
        if page['section'] == 'overview':
            continue
        blocks = []
        body = expand_blocks(page['body'], page['rel'], markdown=True, collected=blocks)
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

def coverage(pages):
    """Which class families no content file mentions yet.

    Advisory, not a gate. 238 families across the sheets is a real backlog and a
    hard failure on day one would just get switched off. Once the list is short
    this becomes a gate, and adding a sheet without documenting it fails CI.
    """
    documented = set()
    for page in pages:
        text = page['body'] + ' ' + page['meta'].get('classes', '')
        for c in re.findall(r'\.?\b([a-z][a-z0-9_-]*)\b', text):
            documented.add(re.split(r'__|--', c)[0])
    rows = []
    for base, _rules, _used, fams in praxis_meta.sheet_inventory():
        missing = sorted(f for f in fams if f not in documented)
        rows.append((base, len(fams), missing))
    return rows


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
        out = os.path.join(HERE, 'PRAXIS-FOR-AGENTS.generated.md')
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
        open(out, 'w', encoding='utf-8').write(doc)
        if problems:
            print('FAILED — %d problem(s) converting content to markdown:' % len(problems))
            for p in problems:
                print('  - %s' % p)
            return 1
        print('wrote %s (%d pages)' % (os.path.basename(out), len(pages) - counts['overview']))
        print('NOT yet promoted over PRAXIS-FOR-AGENTS.md — the hand-written guide '
              'still covers components this site does not. Promote when coverage is complete.')
        return 0

    if '--coverage' in argv:
        rows = coverage(pages)
        total = sum(len(m) for _b, _n, m in rows)
        print('Class families not yet mentioned by any content file:\n')
        for base, n, missing in rows:
            print('  %-28s %3d/%-3d undocumented' % (base, len(missing), n))
            if missing:
                print('      %s' % ', '.join('.' + f for f in missing[:14])
                      + (' …' if len(missing) > 14 else ''))
        print('\n  %d undocumented families. Advisory in this pass.' % total)
        return 0

    print('Praxis %s reference site → _site/' % result['version'])
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
        print('  note: %d token(s) alias a rung the dark theme remaps, on :root, so '
              'their dark value can never apply:' % len(frozen))
        for token, rung, dark in frozen:
            print('        %s -> %s (dark %s)' % (token, rung, dark))
        print('        Advisory: this is a defect in src/, not in the site. Make it a '
              'gate once fixed.')

    if '--check' in argv:
        # Exercise the markdown conversion too, in memory. Otherwise CI can pass
        # while --agents-doc is broken, and the breakage only surfaces when
        # someone regenerates the guide that ships in the tarball.
        agents_doc(pages)
        if problems:
            print('FAILED — %d problem(s) in the agent-doc conversion:' % len(problems))
            for p in problems:
                print('  - %s' % p)
            return 1
        print('  markdown conversion clean')
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
