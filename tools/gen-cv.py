#!/usr/bin/env python3
"""
Regenerates the ICT Faculty CV from the website's CV data.

The faculty CV was maintained as a Word document by hand, in parallel with
cv-data.json — so the two drifted. This builds the document from the data
instead: cv-data.json -> Markdown -> .docx (styled from the faculty template)
-> .pdf (rendered by Microsoft Word).

    python3 tools/gen-cv.py                    # docx + pdf into dist/
    python3 tools/gen-cv.py --format docx      # skip the PDF step
    python3 tools/gen-cv.py --reference other.docx

Requirements: pandoc for the .docx step, and Microsoft Word (macOS) for the
PDF step. Without Word, use --format docx and convert by hand.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# The hand-maintained document this output replaces. Only its styles are
# used — headings, body text, list indents — never its content.
DEFAULT_REFERENCE = Path.home() / "Documents/CV/ICT Faculty CV Chaiyong_2026.docx"


# --------------------------------------------------------------------------
# data loading
# --------------------------------------------------------------------------

def load_data(path: Path) -> dict:
    """Reads cv-data.json, or the generated cv-data.js assignment."""
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".json":
        return json.loads(text)
    m = re.search(r"window\.DEFAULT_CV\s*=\s*", text)
    if not m:
        sys.exit(f"{path}: no window.DEFAULT_CV assignment found")
    # The generated file is JS, not JSON: unquoted keys, trailing semicolon.
    # Node is already a dependency of the sync tooling, so let it parse.
    node = shutil.which("node")
    if not node:
        sys.exit("reading cv-data.js needs node on PATH — pass cv-data.json instead")
    out = subprocess.run(
        [node, "-e",
         "const w={};new Function('window',require('fs').readFileSync(process.argv[1],'utf8'))(w);"
         "process.stdout.write(JSON.stringify(w.DEFAULT_CV))",
         str(path)],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        sys.exit(f"could not parse {path}:\n{out.stderr}")
    return json.loads(out.stdout)


# --------------------------------------------------------------------------
# markdown helpers
# --------------------------------------------------------------------------

MD_SPECIAL = re.compile(r"([\\`*_\[\]<>])")


def esc(s) -> str:
    """Escapes text that must survive as literal characters through pandoc."""
    return MD_SPECIAL.sub(r"\\\1", str(s if s is not None else ""))


def em(s) -> str:
    """Italic, the emphasis the faculty template uses for titles and venues."""
    s = esc(s).strip()
    return f"*{s}*" if s else ""


def join(parts, sep=", ") -> str:
    return sep.join(p for p in parts if p)


class Doc:
    """Accumulates markdown blocks, keeping blank-line separation correct."""

    def __init__(self):
        self.blocks = []

    def add(self, text=""):
        if text:
            self.blocks.append(text.rstrip())

    def heading(self, text, level=1):
        self.add(f"{'#' * level} {text}")

    def para(self, text):
        self.add(text)

    def bullets(self, items):
        lines = [f"-   {i}" for i in items if i]
        if lines:
            self.add("\n".join(lines))

    def numbered(self, items):
        lines = [f"{n}. {i}" for n, i in enumerate(items, 1) if i]
        if lines:
            self.add("\n".join(lines))

    def text(self) -> str:
        return "\n\n".join(self.blocks) + "\n"


# --------------------------------------------------------------------------
# sections
# --------------------------------------------------------------------------

def sec_header(d: Doc, cv):
    meta, c = cv.get("meta", {}), cv.get("contact", {})
    d.para(f"**{esc(meta.get('name', ''))}**")

    left = list(c.get("address", []))
    right = []
    if c.get("tel"):
        right.append(f"Tel: {esc(c['tel'])}")
    if c.get("mobile"):
        right.append(f"Mobile: {esc(c['mobile'])}")
    # Only the first email carries the label, the rest sit under it.
    for n, e in enumerate(c.get("emails", [])):
        right.append(f"{'Email: ' if n == 0 else ''}<{e}>")

    d.para("**Address**")
    # Line blocks keep the address and the contact column side by side
    # without drawing a table around them.
    lines = []
    for i in range(max(len(left), len(right))):
        l = esc(left[i]) if i < len(left) else ""
        r = right[i] if i < len(right) else ""
        lines.append(f"| {l}{'   ' + r if r else ''}")
    d.add("\n".join(lines))

    for link in c.get("links", []):
        d.para(f"{esc(link['label'])}: <{link['url']}>")


def sec_interests(d: Doc, cv):
    if cv.get("interests"):
        d.heading("Research Interests")
        d.para(esc(", ".join(cv["interests"])))


def sec_experience(d: Doc, cv):
    if not cv.get("experience"):
        return
    d.heading("Professional Experience")
    for e in cv["experience"]:
        span = join([e.get("start"), e.get("end")], " – ")
        d.para(f"{esc(e.get('role',''))}, {esc(span)}")
        d.para(em(join([e.get("org"), e.get("location")])))


def sec_education(d: Doc, cv):
    if not cv.get("education"):
        return
    d.heading("Education")
    for e in cv["education"]:
        d.para(esc(e.get("degree", "")))
        d.para(join([esc(e.get("department", "")),
                     join([esc(e.get("school", "")), esc(e.get("location", "")),
                           esc(e.get("year", ""))])], "\\\n"))


def sec_honors(d: Doc, cv):
    if cv.get("honors"):
        d.heading("Selected Honors")
        d.bullets(f"{esc(h.get('honor',''))}, {esc(h.get('year',''))}." for h in cv["honors"])
    if cv.get("grants"):
        d.heading("Funded Research Grants", 2)
        d.bullets(f"{esc(g.get('grant',''))}, {esc(g.get('year',''))}." for g in cv["grants"])


# The faculty form asks for these categories; the counts come from the
# publication list so they cannot drift from it.
PUB_KINDS = [
    ("Monographs", None),
    ("Journal Articles", "journal"),
    ("Conference Papers", "conference"),
    ("Book Chapters", "chapter"),
    ("Workshop Papers", "workshop"),
    ("Edited Volumes", None),
]


def sec_pubstats(d: Doc, cv):
    pubs = cv.get("publications", [])
    d.heading("Publication Statistics")
    for label, kind in PUB_KINDS:
        n = sum(1 for p in pubs if p.get("type") == kind) if kind else 0
        d.para(f"{label}: {n}")
    stats = cv.get("pubStats", {})
    cites = [stats[k] for k in ("citations", "citations2") if stats.get(k)]
    if cites:
        d.para("Citations:")
        for c in cites:
            d.para(f"{esc(c.get('source',''))}: {c.get('count','')} with h-index of {c.get('h','')}")


def format_pub(p) -> str:
    """`authors, *title,* venue, year.` — the template's citation shape."""
    venue = p.get("venue", "")
    return join([esc(p.get("authors", "")), em(p.get("title", "")),
                 esc(venue), esc(p.get("year", ""))]) + "."


PUB_SECTIONS = [
    ("Book Chapters", "chapter", False),
    ("Journals", "journal", True),
    ("Conferences", "conference", True),
    ("Workshops", "workshop", True),
    ("Technical Reports", "report", False),
]


def sec_publications(d: Doc, cv):
    pubs = cv.get("publications", [])
    if not pubs:
        return
    link = "https://cragkhit.github.io/research.html"
    d.heading(f"Selected Publications (Full publication list: <{link}>)")
    for label, kind, numbered in PUB_SECTIONS:
        items = [format_pub(p) for p in pubs if p.get("type") == kind]
        if not items:
            continue
        d.para(em(label))
        (d.numbered if numbered else d.bullets)(items)


def sec_supervision(d: Doc, cv):
    sup = cv.get("supervision", {})
    groups = [("Doctoral Student Supervision", "phd"),
              ("Master Student Supervision", "masters"),
              ("Undergraduate Student Supervision", "undergrad")]
    if not any(sup.get(k) for _, k in groups):
        return
    d.para("**Student Supervision**")
    for label, key in groups:
        if not sup.get(key):
            continue
        d.heading(em(label))
        for block in sup[key]:
            d.para(em(block.get("years", "")))
            d.bullets(esc(e) for e in block.get("entries", []))


def sec_teaching(d: Doc, cv):
    if cv.get("curriculum"):
        d.para("**Program and Curriculum Development**")
        d.bullets(esc(c) for c in cv["curriculum"])
    if cv.get("teaching"):
        title = cv.get("meta", {}).get("sectionTitles", {}).get("teaching", "Teaching")
        d.para(f"**{esc(title)}**")
        d.bullets(f"{esc(t.get('code',''))} {esc(t.get('title',''))} {esc(t.get('years',''))}"
                  for t in cv["teaching"])


def sec_evaluations(d: Doc, cv):
    ev = cv.get("evaluations")
    if not ev or not ev.get("courses"):
        return
    years = ev.get("years", [])
    span = f"{years[0]} – {years[-1]}" if years else ""
    d.para(f"**Student Evaluation Scores ({span}) \\***")

    header = ["Subject", "Course"] + [str(y) for y in years]
    widths = [len(h) for h in header]
    rows = []
    for c in ev["courses"]:
        cells = [esc(c.get("code", "")), esc(c.get("title", ""))]
        cells += [("N/A" if s is None else f"{s:g}") for s in c.get("scores", [])]
        rows.append(cells)
        widths = [max(w, len(x)) for w, x in zip(widths, cells)]

    def line(cells):
        return "| " + " | ".join(x.ljust(w) for x, w in zip(cells, widths)) + " |"

    table = [line(header), "|" + "|".join("-" * (w + 2) for w in widths) + "|"]
    table += [line(r) for r in rows]
    d.add("\n".join(table))
    d.para(em(f"\\* The maximum score is {ev.get('scale', 5)}."))


def sec_services(d: Doc, cv):
    s = cv.get("services", {})
    if not s:
        return
    d.para("**Selected Professional Services**")

    if s.get("consulting"):
        d.para(em("Consulting"))
        d.bullets(esc(c) for c in s["consulting"])
    if s.get("courses"):
        d.para(em("Online Courses:"))
        d.bullets(f"{esc(c.get('title',''))}, {esc(c.get('host',''))}"
                  + (f" (<{c['url']}>)" if c.get("url") else "")
                  for c in s["courses"])
    if s.get("journals"):
        d.para(em("Reviewer of Software Engineering Journals:"))
        d.bullets(esc(j) for j in s["journals"])
    if s.get("organizing"):
        d.para(em("Organizing Committee of International Conferences and Workshops:"))
        for blk in s["organizing"]:
            d.para(em(blk.get("year", "")))
            d.bullets(esc(i) for i in blk.get("items", []))
    if s.get("pcMembership"):
        d.para(em("Reviewer of International Conferences and Workshops:"))
        for blk in s["pcMembership"]:
            d.para(em(blk.get("year", "")))
            d.bullets(esc(i) for i in blk.get("items", []))
    if s.get("examiner"):
        d.para(em("External Examiner:"))
        d.bullets(esc(e) for e in s["examiner"])
    if s.get("mentoring"):
        d.para(em("Mentoring:"))
        d.bullets(esc(m) for m in s["mentoring"])


def sec_talks(d: Doc, cv):
    if not cv.get("talks"):
        return
    d.para("**Selected Invited Talks and Keynote Addresses**")
    d.bullets(join([em(t.get("title", "")), esc(t.get("host", "")),
                    esc(t.get("location", "")), esc(t.get("date", ""))]) + "."
              for t in cv["talks"])


SECTIONS = [sec_header, sec_interests, sec_experience, sec_education, sec_honors,
            sec_pubstats, sec_publications, sec_supervision, sec_teaching,
            sec_evaluations, sec_services, sec_talks]


def build_markdown(cv) -> str:
    d = Doc()
    for fn in SECTIONS:
        fn(d, cv)
    return d.text()


# --------------------------------------------------------------------------
# rendering
# --------------------------------------------------------------------------

def to_docx(md: str, out: Path, reference: Path | None):
    if not shutil.which("pandoc"):
        sys.exit("pandoc not found — install it with `brew install pandoc`")
    cmd = ["pandoc", "-f", "markdown+line_blocks+pipe_tables", "-t", "docx", "-o", str(out)]
    if reference and reference.exists():
        cmd += ["--reference-doc", str(reference)]
    elif reference:
        print(f"  note: reference document not found at {reference}; using pandoc defaults")
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(md)
        tmp = f.name
    try:
        r = subprocess.run(cmd + [tmp], capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(f"pandoc failed:\n{r.stderr}")
    finally:
        Path(tmp).unlink(missing_ok=True)


# Word's first launch can take well over AppleScript's default 120s reply
# limit, which surfaces as a -1712 timeout even though the app is fine.
# The reference document carries its own page header, and pandoc copies it
# verbatim — including the "Latest update:" date, which would otherwise stay
# frozen at whatever the template said.
HEADER_LABEL = "Latest update:"


def stamp_header(docx: Path, last_update: str):
    """Rewrites the header date in place, across runs if Word split it."""
    if not last_update:
        return
    import zipfile

    entries = []
    with zipfile.ZipFile(docx) as z:
        names = z.namelist()
        for n in names:
            entries.append((z.getinfo(n), z.read(n)))

    changed = False
    out = []
    for info, data in entries:
        if re.fullmatch(r"word/header\d*\.xml", info.filename):
            xml = data.decode("utf-8")
            runs = list(re.finditer(r"(<w:t[^>]*>)([^<]*)(</w:t>)", xml))
            if HEADER_LABEL in "".join(m.group(2) for m in runs):
                # Put the whole line in the first run and empty the rest, so a
                # date split across runs cannot leave a stale fragment behind.
                pieces, first = [], True
                last = 0
                for m in runs:
                    pieces.append(xml[last:m.start()])
                    text = f"{HEADER_LABEL} {last_update}" if first else ""
                    pieces.append(m.group(1) + text + m.group(3))
                    first = False
                    last = m.end()
                pieces.append(xml[last:])
                data = "".join(pieces).encode("utf-8")
                changed = True
        out.append((info, data))

    if not changed:
        return
    with zipfile.ZipFile(docx, "w", zipfile.ZIP_DEFLATED) as z:
        for info, data in out:
            z.writestr(info, data)


WORD_SCRIPT = '''
on run argv
    -- The path coercion has to happen outside the `tell` block: inside it,
    -- `POSIX file ... as alias` is sent to Word, which cannot evaluate it.
    set inAlias to (POSIX file (item 1 of argv)) as alias
    set outFile to item 2 of argv
    set docName to item 3 of argv
    tell application "Microsoft Word"
        set wasRunning to running
        with timeout of 600 seconds
            open inAlias
            -- `open` returns before the document is ready, so `active
            -- document` can still be missing or point at another file. Wait
            -- until it is the one just opened.
            set theDoc to missing value
            repeat 60 times
                try
                    if (name of active document) is docName then
                        set theDoc to active document
                        exit repeat
                    end if
                end try
                delay 0.5
            end repeat
            if theDoc is missing value then error "Word did not open " & docName
            save as theDoc file name outFile file format format PDF
            close theDoc saving no
            if not wasRunning then quit
        end timeout
    end tell
    return "ok"
end run
'''


def to_pdf(docx: Path, pdf: Path):
    """Renders via Word, which is what the faculty template was written for.

    Word is sandboxed: driven over AppleScript it can open a document anywhere
    but will only *write* to a few locations, so the PDF is produced in a temp
    directory and moved into place afterwards.
    """
    if not Path("/Applications/Microsoft Word.app").exists():
        print("  skipped: Microsoft Word not installed — convert the .docx by hand")
        return False
    # Word leaves an owner file behind when a previous run died mid-way, and
    # will then open the document read-only, which cannot be saved as PDF.
    lock = docx.parent / f"~${docx.name[2:]}"
    lock.unlink(missing_ok=True)

    with tempfile.NamedTemporaryFile("w", suffix=".applescript", delete=False) as f:
        f.write(WORD_SCRIPT)
        script = f.name
    staging = Path(tempfile.mkdtemp(prefix="gen-cv-")) / pdf.name
    try:
        r = subprocess.run(["osascript", script, str(docx), str(staging), docx.name],
                           capture_output=True, text=True)
        if r.returncode != 0 or not staging.exists():
            print(f"  Word conversion failed:\n{r.stderr.strip()}")
            print("  if Word is showing a dialog, dismiss it and run again")
            return False
        shutil.move(str(staging), str(pdf))
    finally:
        Path(script).unlink(missing_ok=True)
        lock.unlink(missing_ok=True)
        shutil.rmtree(staging.parent, ignore_errors=True)
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, default=REPO / "cv-data.json",
                    help="cv-data.json or cv-data.js (default: cv-data.json)")
    ap.add_argument("--out", type=Path, default=REPO / "dist",
                    help="output directory (default: dist/)")
    ap.add_argument("--name", default="ICT Faculty CV Chaiyong",
                    help="base name for the generated files")
    ap.add_argument("--reference", type=Path, default=DEFAULT_REFERENCE,
                    help="Word document to take styles from")
    ap.add_argument("--format", default="docx,pdf",
                    help="comma-separated: md, docx, pdf (default: docx,pdf)")
    args = ap.parse_args()

    formats = {f.strip() for f in args.format.split(",") if f.strip()}
    unknown = formats - {"md", "docx", "pdf"}
    if unknown:
        sys.exit(f"unknown format(s): {', '.join(sorted(unknown))}")

    cv = load_data(args.data)
    md = build_markdown(cv)
    args.out.mkdir(parents=True, exist_ok=True)
    base = args.out / args.name

    print(f"read {args.data.name}: {len(cv.get('publications', []))} publications, "
          f"last updated {cv.get('meta', {}).get('lastUpdate', '?')}")

    if "md" in formats:
        base.with_suffix(".md").write_text(md, encoding="utf-8")
        print(f"  wrote {base.with_suffix('.md')}")

    if formats & {"docx", "pdf"}:
        docx = base.with_suffix(".docx")
        to_docx(md, docx, args.reference)
        stamp_header(docx, cv.get("meta", {}).get("lastUpdate", ""))
        print(f"  wrote {docx}")
        if "pdf" in formats:
            pdf = base.with_suffix(".pdf")
            if to_pdf(docx, pdf):
                print(f"  wrote {pdf}")
        if "docx" not in formats:
            docx.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
