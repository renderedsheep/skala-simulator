# Regenerates data.js from the reference CSVs. Run from the src folder: python3 gen_data.py
# (looks for the CSVs in ../references)
import csv, json
from pathlib import Path
here = Path(__file__).parent
ref = here.parent / "references"
num = lambda v: int(v) if v not in ("", None) else None
cps = []
with open(ref / "rbmk4_cps_map.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        cps.append([r["channel"], int(r["x_units"]), int(r["y_units"]), r["type"], r["ar_group"],
                    num(r["depth_0039_karpan"]), num(r["depth_012230_karpan"]), num(r["depth_012230_insag"]), 1 if r.get("note") else 0])
with open(ref / "fuel_lattice_inferred.csv", encoding="utf-8") as f:
    fuel = [[int(r["x_units"]), int(r["y_units"])] for r in csv.DictReader(f)]
out = ("// Generated from references/rbmk4_cps_map.csv and references/fuel_lattice_inferred.csv. Do not edit by hand.\n"
       "// cps rows: [channel, x, y, type, arGroup, depth0039cm, depth012230cm (Karpan), depth012230cm (INSAG), reads7cm flag]; x,y in 25 cm lattice units from core centre\n"
       "const CORE_DATA = " + json.dumps({"cps": cps, "fuel": fuel}, ensure_ascii=False, separators=(",", ":")) + ";\n"
       "if (typeof module !== 'undefined') module.exports = CORE_DATA;\n")
(here / "data.js").write_text(out, encoding="utf-8")
print("Wrote data.js:", len(cps), "CPS cells,", len(fuel), "fuel cells")
