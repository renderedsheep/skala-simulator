# Sources used for the SKALA simulator

Primary documents supplied by the user (not included in this package):
- IAEA, *INSAG-7: The Chernobyl Accident: Updating of INSAG-1*, Safety Series No. 75-INSAG-7, Russian edition (Чернобыльская авария: дополнение к INSAG-1), Vienna, 1993.
- Н.В. Карпан, *Чернобыль. Месть мирного атома* (Chernobyl: Revenge of the Peaceful Atom), Kyiv, CHP Country Life, 2005.
- "Composite Accident Timeline with SKALA Codes" (spreadsheet export, sources INSAG-7 Annex I/II and Karpan).
- "Graphs of DREG reactor parameter data from Skala computer", Chernobyl Witness blog (based on V. Dmitriev, VNIIAES, accidont.ru).

Online sources:
- L. Sturm and R. Plaskov, DREG protocol transcript, CC BY-NC 4.0: https://archive.org/details/dreg-protocol-last-40-seconds-of-chernobyl
- V. Alekseev, Чернобыль: http://v-alekseev.org/chnpp/
- Hackaday, Inside SKALA (Chornobyl Family): https://hackaday.com/2026/03/03/inside-skala-how-chernobyls-reactor-was-actually-controlled/
- Chornobyl Family, "We rebuilt Chernobyl's SKALA | Chernobyl reactor at home, part 2" (video, 2026): https://www.youtube.com/watch?v=1JSP_gVXZTs (Hackaday write-up: https://hackaday.com/2026/07/13/using-your-own-rbmk-reactor-control-center-at-home/). Source of the request-device layout, the code grammar, the display sets, the setpoint keys, error codes 301/303 and the example codes. The builders credit former Chernobyl NPP staff for the details. Their example setpoint values are their own illustrations, and their ORM limits (43 and 30 rods) are the post-1986 rules. Their reconstruction follows the modernized SKALA configuration of unit 3, which operated until 2000, not unit 4 as of April 1986; they say the basic principles stayed largely the same.
- Chornobyl Family, video on SKALA's printers (2026; transcript supplied by the user). Source for: the drum printer's plain white perforated fanfold paper; the teletype's roll paper and about 10 s per line; the PRIZMA cartogram printed in two halves (left, then right) with coordinate rulers and four-character cells holding channel type, projected channel power, coolant flow and boiling-crisis margin; the teletype printing often, including channel flow deviations (time, appeared or cleared, channel, flow, deviation); a start-up sequence of date, diagnostic messages, console ready, printer test and subprograms starting; and the program keys choosing how SKALA presents an answer. In the control room the request keyboard and its displays were separate pieces.
- Habr, СКАЛА — ЭВМ ЧАЭС: https://habr.com/ru/articles/220941/
- eti.su, PRIZMA and ORM: https://eti.su/articles/over/over_1645.html
- Chernobyl Witness DREG graphs: https://chernobylcritical.blogspot.com/p/dreg-reactor-parameter-data-from-skala.html

## Files in this folder
| File | What it is | Status |
|---|---|---|
| rbmk4_cps_map.csv | All 211 rods + 12 detector cells: plant coordinates, type, depth at 00:39 and 01:22:30 (Karpan) and 01:22:30 (INSAG) | Transcribed from PDF text/font data; РР/ЛАР/АЗ not distinguished; `note` marks the 24 rods reading 7 cm |
| insag7_fig_II-6_rods_012230.csv | INSAG-7 Fig. II-6 rod depths at 01:22:30 | Transcribed from scan |
| fuel_lattice_inferred.csv | 1661 fuel-cell positions | Inferred: all lattice cells inside the core outline not used by CPS/detectors |
| oscillogram_chronology_karpan_app3.csv | 23-event electrical/accident chronology with three time bases | Transcribed from scan |
| dreg_table_karpan_app3.csv | Feedwater, drum pressure, drum levels around the 01:12-01:18 DREG break | Transcribed; book has no time column |
| message_catalogue.csv | Teletype and DREG message wording with times and sources | Compiled |
| validation_points.csv | Power, ORM, peaking factors at documented moments | Compiled |
| insag7-findings.md, karpan-findings.md | Notes with page references | |
