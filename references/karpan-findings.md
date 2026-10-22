# Karpan, *Chernobyl: Revenge of the Peaceful Atom* — findings for the SKALA simulator

Source: Н.В. Карпан, «Чернобыль. Месть мирного атома», Kyiv, CHP Country Life, 2005. PDF supplied by the user (566 pages, Word-generated text layer). Page numbers below are PDF pages; the printed page number is one higher.

## 1. Complete control-rod map with types (Part 4, ch. 6 §9, pp. 362–363)

Karpan's Fig. 2 (00:39, ORM 16.5 rods) and Fig. 3 (01:22:30, ORM 7.5 rods) give every CPS channel in the plant's own grid (rows 66…12, columns 11…65), with depth in cm. Types are encoded typographically and were read from the PDF's font and underline data, not by eye:

| Marker in book | Meaning (book's legend) | Count found |
|---|---|---|
| Н | axial power detector (ДКЭВ) in a CPS lattice cell | 12 |
| underlined | УСП shortened rod, inserted from below | 24 |
| bold italic underlined | АР automatic-regulator rod | 12 |
| plain | РР, ЛАР and АЗ rods, not distinguished | 175 |

All counts match the RBMK-1000 design (24 УСП, 12 АР). Merged file: `rbmk4_cps_map.csv` (223 cells = 211 rods + 12 detectors) with both Karpan maps and the INSAG-7 Fig. II-6 values side by side.

**Cross-checks that pass**
- Lattice positions match INSAG-7 Fig. II-6 cell for cell (211/211).
- Depths at 01:22:30 agree with INSAG within 10 cm except 11 rods where Karpan shows 13–80 cm and INSAG rounds to 0.
- Karpan's own totals: 00:39 = 102 m inserted, 45 rods ≥1 m (we get 103.0 m, 45). 01:22:30 = 48 m, 15 rods ≥1 m (we get 49.1 m; 15 counting 99 cm as 1 m).

**AR banks** (from the map; bank numbers 1–3 are not given, so groups are labelled a/b/c)
- AR-a: four rods at (±8, ±8) lattice units, i.e. a square 2 m from centre. 200 cm at 00:39 → 158 cm at 01:22:30.
- AR-b: four rods at (±12, 0)/(0, ±12), a diamond 3 m out. 10 → 139 cm.
- AR-c: four rods at (±4, 0)/(0, ±4), a cross 1 m from centre. 10 → 20 cm.
- AR rods had no graphite displacers (p.363), so no tip effect from them.
- At 01:23:39 AR-1 was at its lower limit, AR-3 (in overcompensation mode) at 5.6 m, AR-2 moving down past 5 m (p.336, citing NIKIET report).

**Inferences, not stated in the book**
- The 175 plain rods are 139 РР manual + 12 ЛАР local-automatic + 24 АЗ emergency rods. The book does not distinguish them; the CSV types them `RR/LAR/AZ`.
- 24 plain rods read exactly 7 cm at 01:22:30, and 23 of the same rods read 7 cm at 00:39 (the 24th, 24-63, read 0); INSAG-7 rounds all 24 to 0. These carry the note "indicator reads 7 cm" in the CSV.
- **Retracted inference (20 Oct 2026):** these 24 were first tagged `AZ?` because 24 is the АЗ count and АЗ rods sat at their upper limits until AZ-5 (p.336). A symmetry check rules this out. Every group the book identifies is fourfold symmetric (АР 12/12, УСП 24/24, Н 12/12 positions match after a 90° turn), and so are all 175 plain rods together (173/175). The 24 "7 cm" rods match only 5/24. The 7 cm reading is more likely an indicator offset on fully withdrawn rods. The real АЗ positions remain unknown; an RBMK-1000 CPS channel-assignment diagram would settle it.

## 2. The excursion was local (pp. 377–380)
- Rapid flux growth was in the lower core, fuel-channel rows 12 to 30 (one side of the core), driven by displacers pushing water out of the lower CPS channels.
- With ORM ≥15, the bottom of the core is normally covered by inserted УСП rods, which tames the tip effect. At 01:22:30 few УСП were in.
- The double-humped axial field is singled out as especially unstable.
- Water absorbs thermal neutrons ~20–21× more than graphite (pp. 362, 379).

## 3. How SKALA was actually operated (pp. 350–351, testimony of V.F. Verkhovod, SKALA duty engineer, СДИВТ)
- The PRIZMA printout was made by the СДИВТ every two hours, on odd hours, and carried to the control room (copies for SIUR, SIUB, SIUT). On 26 April it was printed around 01:00; the next was due at 03:00.
- Loading the test parameters required a punched tape left by the programmer (M. Borodyansky) and a full stop/restart of SKALA. Verkhovod restarted it twice on orders from the control room (test cancelled, then reinstated).
- A power failure crashed SKALA at the start of the shift; an audible alarm sounds when it stops.
- A false channel-flow (СРВ) signal was first checked on SKALA's request device (вызывное устройство), then by oscilloscope in rooms 706/1,2.
- Dyatlov (p.351): to get ORM the SIUR had to dial a code and wait for it to appear on the digital display; the SIUR had over 4,000 parameters.
- Operating modes named in the logs: "полуторный вариант" (1.5 mode) used for recalculating fuel burnup, 00:39–01:05 and again at 22:50 on 25 April (pp. 325, 329 logs); "парный вариант" (paired mode) restored at 01:36 after the explosion (p.338). DREG was off 01:23:48–01:40:35 (16 min 47 s) for lack of power.
- Reactor loading recorded by SKALA: 1659 fuel channels (РК), 1 additional absorber, 1 water-filled channel. Confirms 1659; INSAG-7 Russian "1650" is a misprint.

## 4. Teletype and DREG mechanics (pp. 336–338, 359–361, 392–393)
- Two SKALA teletypes both printed: "01.23.39 Авар. защита АЗ-5" then "01.23.41 Авар. з…" (cut off).
- Teletype speed 7 characters per second. 25 + 15 characters + 39 carriage-travel spaces = 79 characters ≈ 10 s, so power to the teletypes failed at about 01:23:49.
- The teletype message list has only four messages starting "Авар. з…": АЗ-5, АЗ-3, АЗ-2, АЗ-1. АЗ-1/2/3 are only sent when the CPS power setpoints are above 60/50/20% of nominal. Karpan argues the cut-off line was a repeat АЗ-5 (button released briefly) or an АЗ-1 from 2 of 4 pumps tripping.
- The teletype had higher priority than DREG for protection signals, which is why DREG times run ~1 s late.
- DREG cycles are numbered with a Д suffix: №135Д covers 01:23:39–43, №137Д 45–47 s, №138Д 47–49 s (the last cycle recorded).
- DREG raw signal ID example: **К06L005 =1** = "pressure rise in reactor space to 0.15 kgf/cm²" (fuel channel rupture), cycle №138Д at 01:23:49. This is the only raw ID in the book.
- The "1 ПК вверх" / "1 ПК вниз" overcompensation signals with exact spans (p.334): 00:43:35–00:44:40 up, 00:49:19–00:51:23 down, from 01:19:39 up.
- Drum pressure in cycle №137Д: right 88.2, left 75.2 kgf/cm²; main safety valves open at 75; БРУ-К1 at 71.5.

## 5. SKALA printout "К1К" (p.325)
At 00:00 on 25 April, from the К1К printout: 3100 MWt, ORM 30.1 rods, Kr 1.34, Kz 1.20, Kз.min 1.20, Wтк(max) 2.5 MW, Tc(max) 594 °C, coolant flow 48,000 m³/h. Together with the 22:45 values (1600 MWt, ORM 26.0, Kr 1.41, Kz 1.14, Wтк 1.35 MW, Kз.min 1.88, Tc 525 °C, 50,000 m³/h) these are two full-power and half-power validation points for a full-core PRIZMA.

## 6. Appendices
- App. 1 (p.415): copy of the СФКРЭ "reactor power" chart recorder trace.
- App. 3 (p.416): oscillogram chronology table, 23 events, three time columns (NIKIET report, GPAN 1991 / Ukrainian commission 1995, and Karpan's own sync to DREG end at 01:23:49). Karpan's synced times: stop valves 01:23:04; ДЗ МПА button 01:23:06.5; diesel load steps 19.1 / 24.4 / 29.6 / 34.8 / 39.9 s; pump trips ГЦН-14 42.6, ГЦН-13 42.7, ГЦН-24 42.9, ГЦН-23 43.0 s; AZ-5 39 s teletype / 40 s DREG; AZM/AZSR 43 s; ГЦН flow collapse 46–47 s; reactor-space pressure 47 s; end of recording 49 s.
- App. 3 (p.417): a DREG table of feedwater flow left/right (t/h), drum pressure left/right (kgf/cm²) and four drum level channels (mm), 33 rows around the 01:12–01:18 DREG break. **The time column is empty in the book itself**, so rows can only be aligned approximately against the Chernobyl Witness graphs.
- App. 4 (p.418): graph of parameters that affected reactivity on 26 April.

## What this changes in the simulator
1. Replace the invented core lattice with `rbmk4_cps_map.csv`; start the 01:22:30 scenario from the real rod depths and the real AR bank positions.
2. Pump numbering 11–14 / 21–24; rundown pumps 13, 14, 23, 24; trips at 01:23:42.6–43.0.
3. Teletype at 7 characters per second, two machines, cut-off when power fails.
4. DREG cycles numbered "№NNNД"; signals use K-codes like К06L005 where known.
5. PRIZMA printed every two hours on odd hours by the duty engineer, plus on request; "1.5 mode" and "paired mode" as SKALA states.
