#!/usr/bin/env python3
"""
Build the generated sections of the Praxis design-system docs.

WHY THIS EXISTS
    DESIGN-SYSTEM.md was a hand-maintained description of a second thing (the
    CSS), and the two drifted: the 2026-08-12 audit found the markdown
    asserting token counts that were two weeks stale and a blocker that had
    already been cleared.

    Now the *facts* have one source — the stylesheets in src/ — and this script
    injects them into the markdown. Prose still lives there, written by hand,
    but nothing measurable is transcribed by a human any more.

WHAT IS GENERATED vs WRITTEN
    generated : token tables, the token-surface stats, the component inventory
    written   : every narrative section (principles, patterns, decisions, the
                audit's reasoning). Those live outside the markers and this
                script never touches them.

MEASURING REAL USAGE
    Praxis was extracted from the groom-lake prototype on 2026-08-13, so the
    pages that actually consume it now live in a different repository. Point
    --consumer at one to fold its usage back into the measurements:

        python3 build-ds.py --consumer ../groom-lake/prototype

    Without it the script measures src/ alone, which is honest but blind to
    how much of the system is really used — a token defined and never
    referenced looks identical to one every page depends on. The counts say
    which mode produced them.

USAGE
    python3 build-ds.py            # rewrite the generated blocks
    python3 build-ds.py --check    # non-zero exit if stale (for CI)

Markers:
    <!-- GENERATED:name --> ... <!-- /GENERATED:name -->
"""
import re, sys, glob, os, collections

HERE  = os.path.dirname(os.path.abspath(__file__))
SRC   = os.path.join(HERE, 'src')
MD    = os.path.join(HERE, 'DESIGN-SYSTEM.md')

# Optional consumer checkout, for usage measurement only. Never read as source.
CONSUMER = None
for _i, _a in enumerate(sys.argv):
    if _a == '--consumer' and _i + 1 < len(sys.argv):
        CONSUMER = os.path.abspath(sys.argv[_i + 1])

DEF = re.compile(r'(--[A-Za-z0-9_-]+)\s*:\s*([^;}]+)')
USE = re.compile(r'var\(\s*(--[A-Za-z0-9_-]+)')


def css_sources():
    files = sorted(glob.glob(os.path.join(SRC, '*.css')))
    pages = []
    if CONSUMER:
        pages = [p for p in sorted(glob.glob(os.path.join(CONSUMER, '*.html')))
                 if not os.path.basename(p).startswith('_tmp')]
    return files, pages


def read_css(path):
    src = open(path, encoding='utf-8', errors='replace').read()
    if path.endswith('.html'):
        src = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', src, re.S))
    return src


def measure():
    files, pages = css_sources()
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
    # a token set at runtime by JS is legitimately absent from CSS
    js_files = glob.glob(os.path.join(SRC, '*.js'))
    if CONSUMER:
        js_files += glob.glob(os.path.join(CONSUMER, '*.js'))
    js = ''.join(open(f, encoding='utf-8', errors='replace').read()
                 for f in js_files)
    js += ''.join(read_css(p) + open(p, encoding='utf-8', errors='replace').read() for p in pages)
    undef = [t for t in uses if t not in defs and ("setProperty('%s'" % t) not in js and (t + ':') not in js]
    return {
        'tokens': len(defs), 'uses': total, 'raw': raw, 'hex': hexn, 'rgb': rgbn,
        'coverage': round(100.0 * total / (total + raw)),
        'multi': len([t for t, d in defs.items() if len(d) > 1]),
        'undef': sorted(undef),
        'dead': sorted(t for t in defs if t not in uses),
        'defs': defs, 'pages': len(pages), 'sheets': len(files),
    }


def foundation_table():
    """The single foundation file, grouped by the comment headings it carries."""
    src = open(os.path.join(SRC, 'praxis-tokens.css'), encoding='utf-8').read()
    core = open(os.path.join(SRC, 'praxis-core.css'), encoding='utf-8').read()
    dark = {}
    for m in re.finditer(r'body\[data-variant="praxis"\]\[data-theme="dark"\]\s*\{(.*?)\n\}', core, re.S):
        for d in DEF.finditer(m.group(1)):
            dark[d.group(1)] = d.group(2).strip()
    for m in re.finditer(r'body\[data-theme="dark"\]\s*\{(.*?)\n\}', core, re.S):
        for d in DEF.finditer(m.group(1)):
            dark.setdefault(d.group(1), d.group(2).strip())

    rows, group = [], None
    for line in src.split('\n'):
        g = re.match(r'\s*/\*\s*(?:=+\s*)?([A-Z][^*]{2,70}?)\s*(?:=+\s*)?\*/\s*$', line)
        if g and 'GENERATED' not in g.group(1):
            group = g.group(1).strip()
            continue
        for m in DEF.finditer(line):
            k, v = m.group(1), m.group(2).split('/*')[0].strip()
            rows.append((group or 'Foundation', k, v, dark.get(k, '')))
    out, seen = [], None
    for grp, k, v, dk in rows:
        if grp != seen:
            out.append('\n**%s**\n' % grp)
            out.append('| Token | Light | Dark (via `praxis-core.css`) |')
            out.append('|---|---|---|')
            seen = grp
        out.append('| `%s` | `%s` | %s |' % (k, v, ('`%s`' % dk) if dk else '—'))
    return '\n'.join(out)


def component_inventory():
    """Sheet inventory. The consumer column only appears when one was given —
    an empty 'Pages loading it' column would read as 'nothing uses this'."""
    consumer_pages = (glob.glob(os.path.join(CONSUMER, '*.html'))
                      if CONSUMER else [])
    rows = []
    for f in sorted(glob.glob(os.path.join(SRC, 'praxis-*.css'))):
        src = open(f, encoding='utf-8').read()
        roots = collections.Counter()
        for c in re.findall(r'\.([a-zA-Z][a-zA-Z0-9_-]+)', src):
            roots[re.split(r'__|--', c)[0]] += 1
        top = ', '.join('`.%s`' % r for r, _ in roots.most_common(5))
        cells = ['`%s`' % os.path.basename(f), str(src.count('{'))]
        if CONSUMER:
            cells.append(str(len([
                p for p in consumer_pages
                if os.path.basename(f) in open(p, encoding='utf-8', errors='replace').read()])))
        cells.append(top)
        rows.append('| %s |' % ' | '.join(cells))
    head = ['Sheet', 'Rules'] + (['Pages loading it'] if CONSUMER else []) + ['Main class families']
    return ('| %s |\n|%s|\n' % (' | '.join(head), '---|' * len(head))
            + '\n'.join(rows))


def stats_block(m):
    return '\n'.join([
        '| Measure | Value |',
        '|---|---|',
        '| Distinct custom properties defined | **%d** |' % m['tokens'],
        '| `var()` usages | **%s** |' % format(m['uses'], ','),
        '| Raw colour literals remaining | %s (%d hex / %d rgb·rgba) |' % (format(m['raw'], ','), m['hex'], m['rgb']),
        '| Tokenization coverage | **%d%%** |' % m['coverage'],
        '| Tokens defined in more than one file | %d |' % m['multi'],
        '| Used but never defined (excluding runtime-set) | %d — %s |' % (
            len(m['undef']), ', '.join('`%s`' % t for t in m['undef']) or 'none'),
        '| Defined but never referenced | %d |' % len(m['dead']),
        '| Stylesheets measured | %d |' % m['sheets'],
        '| Consumer pages measured | %s |' % (
            m['pages'] if CONSUMER else 'none — src/ measured in isolation'),
    ])


def inject(path, name, body, comment_style='html'):
    src = open(path, encoding='utf-8').read()
    o, c = '<!-- GENERATED:%s -->' % name, '<!-- /GENERATED:%s -->' % name
    if o not in src:
        return False, 'marker %s absent' % name
    pat = re.compile(re.escape(o) + r'.*?' + re.escape(c), re.S)
    new = pat.sub(o + '\n' + body + '\n' + c, src)
    changed = new != src
    if changed:
        open(path, 'w', encoding='utf-8').write(new)
    return changed, None


def main():
    check = '--check' in sys.argv
    m = measure()
    blocks = {
        'stats':      stats_block(m),
        'foundation': foundation_table(),
        'components': component_inventory(),
    }
    page_blocks = {
        'badges': ('          <span class="ds-badge">%d tokens defined</span>\n'
                   '          <span class="ds-badge">%s var() usages</span>\n'
                   '          <span class="ds-badge">~%d%% tokenized</span>\n'
                   '          <span class="ds-badge">%d defined in 2+ files</span>\n'
                   '          <span class="ds-badge">%d undefined-token bugs</span>\n'
                   '          <span class="ds-badge">generated, not transcribed</span>'
                   % (m['tokens'], format(m['uses'], ','), m['coverage'], m['multi'], len(m['undef']))),
    }
    stale = []
    for name, body in blocks.items():
        changed, err = inject(MD, name, body)
        if err: print('  md: %s' % err)
        elif changed: stale.append('md:' + name)

    # The DS page lives in the consumer, not here. Only touch it if we were
    # pointed at one and it actually has the page.
    page = os.path.join(CONSUMER, 'ds', 'index.html') if CONSUMER else None
    if page and os.path.exists(page):
        for name, body in page_blocks.items():
            changed, err = inject(page, name, body)
            if err: print('  page: %s' % err)
            elif changed: stale.append('page:' + name)

    if check:
        if stale:
            print('STALE — regenerate: %s' % ', '.join(stale)); sys.exit(1)
        print('up to date'); sys.exit(0)
    print('measured %d tokens, %s var() usages, %d%% coverage across %d sheets + %d pages'
          % (m['tokens'], format(m['uses'], ','), m['coverage'], m['sheets'], m['pages']))
    print('rewrote: %s' % (', '.join(stale) if stale else 'nothing (already current)'))


if __name__ == '__main__':
    main()
