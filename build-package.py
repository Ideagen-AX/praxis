#!/usr/bin/env python3
"""
Build the distributable Praxis package from src/.

src/ is the SOURCE OF TRUTH. Nothing in dist/ is hand-written, and dist/ is
gitignored, so there is no second copy of Praxis to keep in step. This is the
same rule build-ds.py follows for the documentation: one authoritative source,
everything else generated.

Until 2026-08-13 these sheets lived in the groom-lake prototype and this script
read them from there. The prototype is now a consumer of the published package
like any other, and edits belong here.

    python3 build-package.py            build dist/
    python3 build-package.py --check    fail if dist/ is missing or stale

Two transforms happen on the way out, and both exist for real reasons:

1. The four @font-face blocks in praxis-admin.css point at relative
   fonts/Gilroy-*.woff2 paths. Gilroy is licensed and MUST NOT ship in a public
   package, and the relative paths would 404 from a CDN besides. They are
   stripped and replaced by praxis-fonts.example.css, which shows a consumer how
   to point the same family at their own licensed copy.

2. The lucide fallback in praxis-lucide.js asked for `lucide@latest` — an
   unpinned dependency that could change under consumers without warning. It is
   repointed at this package's own bundled, version-pinned copy.

Note that praxis-lucide.js resolves `vendor/lucide.min.js` relative to its own
script URL, so shipping vendor/ beside it means the primary path already works
over a CDN with no patching. The fallback is the only thing that needed fixing.
"""

import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = (HERE / "src").resolve()
DIST = HERE / "dist"

# ---------------------------------------------------------------------------
# What ships, in cascade order.
#
# tokens must precede core by the rule stated in praxis-tokens.css. Measured
# 2026-08-12: the 24 properties both files define never collide at the same
# selector (:root vs body[data-variant="praxis"]), so specificity actually
# decides and the order is belt-and-braces — but the barrel should still model
# the documented rule rather than an accident.
# ---------------------------------------------------------------------------
FOUNDATION = ["praxis-tokens.css", "praxis-core.css"]

COMPONENTS = [
    "praxis-appbar.css",
    "praxis-navrail.css",
    "praxis-pageheader.css",
    "praxis-workspace.css",
    "praxis-create-new.css",
    "praxis-module-selector.css",
    "praxis-profile-menu.css",
    "praxis-toolbar-compact.css",
    "praxis-quick-rail.css",
    "praxis-rfield.css",
    "praxis-filters.css",
    "praxis-mazlan.css",
    "praxis-admin.css",
]

# Shipped as a file but deliberately NOT in the praxis.css barrel: it restyles
# bare elements, so folding it into the barrel would let Praxis reach outside
# its own components and clobber a host application's styles. Opt in explicitly.
STANDALONE = ["praxis-reset.css"]

SCRIPTS = [
    "praxis-lucide.js",
    "praxis-mazlan.js",
    "praxis-create-new.js",
    "praxis-module-chip.js",
    "praxis-navdrawer.js",
    "praxis-profile-menu.js",
    "praxis-quick-rail.js",
    "praxis-toolbar-compact.js",
    "praxis-filters.js",
    "praxis-dotfield.js",
    "praxis-breadcrumb-back.js",
    "praxis-admin-chrome.js",
]

VENDOR = ["lucide.min.js"]

# Not part of Praxis. These sheets and scripts sit beside the system in the
# groom-lake prototype and stayed there when Praxis was extracted — each is
# bound to that application rather than to the design system. Recorded here,
# and surfaced in manifest.json, so the boundary stays visible: anyone
# wondering where their favourite file went can see it was a decision.
EXCLUDED = {
    "praxis-chrome-legacy.css": "legacy chrome with one remaining consumer "
    "(contextual-awareness.html); retires with that page",
    "praxis-filters-local.css": "prototype-local overrides on top of "
    "praxis-filters.css, not part of the system",
    "praxis-records.js": "prototype storage client, bound to this app's "
    "/api/records endpoint",
    "praxis-create-new-nav.js": "routes to this prototype's page filenames",
    "praxis-admin-data.js": "invented demo data",
    "praxis-admin-users.js": "invented demo data",
}

FONT_FAMILIES = ["Gilroy-Regular", "Gilroy-Medium", "Gilroy-SemiBold", "Gilroy-Bold"]


def version():
    return json.loads((HERE / "package.json").read_text())["version"]


def strip_font_faces(css, report):
    """Remove @font-face blocks that reference a relative fonts/ path."""
    kept = []
    removed = 0

    def repl(m):
        nonlocal removed
        block = m.group(0)
        if "fonts/" in block:
            removed += 1
            kept.append(block)
            return ""
        return block

    out = re.sub(r"@font-face\s*\{[^}]*\}\s*", repl, css)
    if removed:
        report.append(
            f"  stripped {removed} @font-face block(s) referencing licensed fonts"
        )
    return out, removed


def fonts_example(ver):
    faces = "\n".join(
        "@font-face {\n"
        "  font-family: 'Gilroy';\n"
        f"  src: url('/fonts/{name}.woff2') format('woff2'),\n"
        f"       url('/fonts/{name}.woff')  format('woff');\n"
        f"  font-weight: {weight};\n"
        "  font-style: normal;\n"
        "  font-display: swap;\n"
        "}"
        for name, weight in zip(FONT_FAMILIES, [400, 500, 600, 700])
    )
    return f"""/* Praxis {ver} — font declarations (example, not loaded by default)
 *
 * Praxis sets font-family: 'Gilroy' but ships NO font files. Gilroy is
 * licensed and cannot be redistributed, so you must supply your own copy
 * under your own licence.
 *
 * Copy this file, point the paths at wherever you host the files, and load it
 * BEFORE praxis.css. If you have no Gilroy licence, delete these blocks and
 * Praxis falls through its stack to Inter and then the system UI font — the
 * layout is unaffected, only the typeface changes.
 */

{faces}
"""


def pin_lucide(js, ver, report):
    """Repoint the unpinned lucide@latest fallback at our bundled copy."""
    needle = "'https://unpkg.com/lucide@latest'"
    if needle not in js:
        return js, 0
    pinned = (
        "(window.PRAXIS_LUCIDE_SRC || "
        f"'https://cdn.jsdelivr.net/npm/@ideagen-ax/praxis@{ver}/dist/vendor/lucide.min.js')"
    )
    report.append("  pinned the lucide CDN fallback to this package's bundled copy")
    return js.replace(needle, pinned), 1


def banner(name, ver):
    return f"\n/* ={'=' * 74}\n   {name}  —  Praxis {ver}\n   {'=' * 74} */\n"


def build():
    report = []
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "vendor").mkdir(parents=True)
    ver = version()
    manifest = {
        "name": "@ideagen-ax/praxis",
        "version": ver,
        "generatedFrom": "src/",
        "css": [],
        "js": [],
        "vendor": [],
        "excluded": EXCLUDED,
    }
    stripped_total = 0
    barrel = [
        f"/* Praxis {ver} — bundled stylesheet\n"
        " *\n"
        " * Generated by build-package.py from src/. Do not edit: edit the\n"
        " * source sheet and rebuild.\n"
        " *\n"
        " * Contains the foundation (tokens, core) and every component sheet, in\n"
        " * cascade order. praxis-reset.css is NOT included — load it separately\n"
        " * if you want the element resets.\n"
        " */\n"
    ]

    for name in FOUNDATION + COMPONENTS:
        src = SRC / name
        if not src.exists():
            sys.exit(f"missing source stylesheet: {src}")
        css = src.read_text()
        if "@font-face" in css:
            css, n = strip_font_faces(css, report)
            stripped_total += n
        (DIST / name).write_text(css)
        manifest["css"].append(name)
        barrel.append(banner(name, ver))
        barrel.append(css)

    for name in STANDALONE:
        shutil.copy2(SRC / name, DIST / name)
        manifest["css"].append(name)

    (DIST / "praxis.css").write_text("".join(barrel))
    manifest["css"].insert(0, "praxis.css")

    (DIST / "praxis-fonts.example.css").write_text(fonts_example(ver))
    manifest["css"].append("praxis-fonts.example.css")

    for name in SCRIPTS:
        src = SRC / name
        if not src.exists():
            sys.exit(f"missing source script: {src}")
        js = src.read_text()
        if "unpkg.com/lucide" in js:
            js, _ = pin_lucide(js, ver, report)
        (DIST / name).write_text(js)
        manifest["js"].append(name)

    for name in VENDOR:
        shutil.copy2(SRC / "vendor" / name, DIST / "vendor" / name)
        manifest["vendor"].append(f"vendor/{name}")

    (DIST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return ver, manifest, report, stripped_total


def verify(ver, manifest):
    """Assert the invariants that make this package safe to publish."""
    problems = []
    files = [p for p in DIST.rglob("*") if p.is_file()]
    blob = {p: p.read_text(errors="ignore") for p in files if p.suffix in {".css", ".js", ".json"}}

    for p, txt in blob.items():
        if "--ehsq-" in txt:
            problems.append(f"{p.name}: still contains --ehsq- token references")
        if re.search(r"url\(\s*['\"]?fonts/", txt):
            problems.append(f"{p.name}: relative fonts/ url would 404 from a CDN")
        if "lucide@latest" in txt:
            problems.append(f"{p.name}: unpinned lucide@latest reference")
        if 'data-variant="miramar"' in txt:
            problems.append(f"{p.name}: references the pruned miramar variant")

    for name in FONT_FAMILIES:
        for p, txt in blob.items():
            if f"{name}.woff" in txt and p.name != "praxis-fonts.example.css":
                problems.append(f"{p.name}: references licensed font file {name}")
    for p in files:
        if p.suffix in {".woff", ".woff2", ".ttf", ".otf"}:
            problems.append(f"{p.name}: font binary must not ship in this package")

    # Token coverage: every var() referenced in the barrel should resolve from it.
    barrel = (DIST / "praxis.css").read_text()
    defined = set(re.findall(r"(--[\w-]+)\s*:", barrel))
    used = set(re.findall(r"var\(\s*(--[\w-]+)", barrel))
    # Tokens the host app or a runtime script legitimately supplies.
    runtime = {"--reveal-i", "--ph-pad-top", "--praxis-filters-gutter", "--muted"}
    missing = sorted(used - defined - runtime)

    # The barrel must be the concatenation of its parts, not a partial write.
    parts = sum((DIST / n).stat().st_size for n in FOUNDATION + COMPONENTS)
    if (DIST / "praxis.css").stat().st_size < parts:
        problems.append("praxis.css is smaller than the sum of its parts")

    return problems, len(defined), len(used), missing


def main():
    check = "--check" in sys.argv
    if check and not (DIST / "manifest.json").exists():
        print("dist/ is missing — run build-package.py")
        return 1
    before = None
    if check:
        before = {p.relative_to(DIST): p.read_bytes() for p in DIST.rglob("*") if p.is_file()}

    ver, manifest, report, stripped = build()
    problems, defined, used, missing = verify(ver, manifest)

    if check:
        after = {p.relative_to(DIST): p.read_bytes() for p in DIST.rglob("*") if p.is_file()}
        if before != after:
            changed = sorted(
                str(k) for k in set(before) | set(after) if before.get(k) != after.get(k)
            )
            print("dist/ is STALE — rebuild. Differing: " + ", ".join(changed[:8]))
            return 1
        print("up to date")
        return 0

    total = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"Praxis {ver} → dist/")
    print(
        f"  {len(manifest['css'])} stylesheets, {len(manifest['js'])} scripts, "
        f"{len(manifest['vendor'])} vendor, {total / 1024:.0f} KB total"
    )
    print(f"  praxis.css barrel: {(DIST / 'praxis.css').stat().st_size / 1024:.0f} KB")
    print(f"  {defined} tokens defined, {used} referenced in the barrel")
    for line in report:
        print(line)
    print(f"  {len(EXCLUDED)} source files deliberately excluded (see manifest.json)")
    if missing:
        print(f"  note: {len(missing)} token(s) used but not defined here: {', '.join(missing)}")
    if problems:
        print("\nFAILED verification:")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("  verification passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
