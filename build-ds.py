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
import re, sys, os

import praxis_meta
from praxis_meta import measure

MD = os.path.join(praxis_meta.HERE, 'DESIGN-SYSTEM.md')

# Optional consumer checkout, for usage measurement only. Never read as source.
CONSUMER = None
for _i, _a in enumerate(sys.argv):
    if _a == '--consumer' and _i + 1 < len(sys.argv):
        CONSUMER = os.path.abspath(sys.argv[_i + 1])


def foundation_table():
    """The foundation file as markdown, grouped by the comment headings it carries.

    Measurement is praxis_meta.token_rows(); this only renders it.
    """
    out, seen = [], None
    for grp, k, v, dk in praxis_meta.token_rows():
        if grp != seen:
            out.append('\n**%s**\n' % grp)
            out.append('| Token | Light | Dark (via `praxis-core.css`) |')
            out.append('|---|---|---|')
            seen = grp
        out.append('| `%s` | `%s` | %s |' % (k, v, ('`%s`' % dk) if dk else '\u2014'))
    return '\n'.join(out)


def component_inventory():
    """Sheet inventory. The consumer column only appears when one was given \u2014
    an empty 'Pages loading it' column would read as 'nothing uses this'."""
    rows = []
    for base, rules, used, families in praxis_meta.sheet_inventory(CONSUMER):
        top = ', '.join('`.%s`' % r for r, _ in families.most_common(5))
        cells = ['`%s`' % base, str(rules)]
        if CONSUMER:
            cells.append(str(used))
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
    m = measure(CONSUMER)
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
