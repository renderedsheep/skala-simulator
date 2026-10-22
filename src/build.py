# Rebuilds ../index.html (the page GitHub Pages serves) from template.html + data.js + glossary.js + sim.js + ui.js.
# Usage, from the src folder:  python3 build.py            (writes ../index.html)
#                             python3 build.py out.html   (writes somewhere else)
from pathlib import Path
import sys
here = Path(__file__).parent
out = Path(sys.argv[1]) if len(sys.argv) > 1 else here.parent / "index.html"
page = (here / "template.html").read_text(encoding="utf-8")
for marker, name in (("/*DATA*/", "data.js"), ("/*GLOSS*/", "glossary.js"), ("/*SIM*/", "sim.js"), ("/*UI*/", "ui.js")):
    page = page.replace(marker, (here / name).read_text(encoding="utf-8"))
if not page.lstrip().lower().startswith("<!doctype"):
    # the template is a fragment (it is also published as a hosted artifact); give the standalone page a proper head
    page = ('<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<meta name="description" content="SKALA: an interactive reconstruction of the Chernobyl unit 4 process computer '
            'and its RBMK-1000 core, built from INSAG-7, Karpan and the surviving DREG record.">\n') + page
out.write_text(page, encoding="utf-8")
print("Wrote", out, len(page), "bytes")
