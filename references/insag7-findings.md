# INSAG-7 (Russian edition) — findings for the SKALA simulator

Source: IAEA Safety Series 75-INSAG-7, Russian edition (159-page scan supplied by the user). Page numbers are PDF pages.

## Rod map at 01:22:30, 26 April 1986 (Fig. II-6, p.140)
- "Глубины погружения стержней СУЗ в см" — insertion depth of all 211 CPS rods, in cm, as reconstructed by the Soviet working group for its 3D calculations.
- Transcribed to `insag7_fig_II-6_rods_012230.csv` (211 rows: figure row/column, lattice x/y in 25 cm units from core centre, depth in cm).
- Row counts 4,7,8,7,10,11,10,8,12,11,12,9,12,11,12,8,11,11,10,7,8,7,5 = 211. Positions fit the staggered CPS sub-lattice (1 m along a row, alternate rows offset).
- 47 rods inserted at all, total 43.5 m of insertion; deepest 260 cm.
- The figure gives no rod types. Karpan's book marks them (see karpan-findings.md and rbmk4_cps_map.csv): the quartets at 160/140/20 cm are confirmed as the three AR banks.
- 12 regular gaps in rows 4, 8, 12, 16, 20 are the 12 axial in-core detector channels (confirmed by Karpan's maps, marked Н).
- Check: weighting these depths by the pre-accident axial flux shape (Fig. II-5 curve 4) gives ~6.3 equivalent rods, consistent with INSAG's 6–8 rods. A symmetric cosine flux gives only ~2.2.
- Uncertain: one value in row 7 was nudged one column (typesetting offset); row 1 has 4 entries vs row 23's 5.

## Axial flux shape (Fig. II-5, p.138)
- Before the accident (00:30, curve 4) the axial field was double-humped with the larger maximum at the TOP (~1.38 at ~5.5 m height), a lower plateau ~1.05 from 2–4 m.
- After AZ-5 the calculated maximum shifts to the bottom (Fig. II-9, p.143).
- Simulator v1 used a single bottom-peaked shape as a stand-in: right result, wrong reason. Must be fixed.

## Core state (p.128)
- Unit 4 commissioned Dec 1983. Before the 25 April shutdown: 1650 assemblies per this edition. SKALA's own log entry quoted by Karpan says 1659 fuel channels + 1 absorber + 1 water channel = 1661, so 1650 is a misprint (see karpan-findings.md), mean burnup 10.3 MWd/kg, 1 additional absorber, 1 empty channel. 75% first-load assemblies at 10–15 MWd/kg.

## Design data (Table II-I, p.125)
3200 MWt; 2.0% enrichment; 114.7 kg U per assembly; 18 pins × 13.6 mm; design burnup 20 MWd/kg; peaking Kr 1.48, Kz 1.4; max channel 3000 kW; void coefficient +2.0e-4 per % steam (≈ +0.04 β/%); fast power coefficient −0.5e-6 /MW; fuel temperature −1.2e-5 /°C; graphite temperature +6e-5 /°C; min. CPS worth 10.5%; RR rods worth 7.5% (≈0.1 β per rod).
Actual void coefficient at high burnup with few additional absorbers approached +5 β (p.55).

## SKALA itself (section I-4.3.2, p.77)
- Main reactor parameters calculated about every 5 minutes (limited by the V-3M). PRIZMA and RESTART (state written to tape) also on a ~5 min cycle. PRIZMA results exist only as printouts.
- DREG polls several hundred discrete and analogue signals; input latency <1 s, but DREG is one of the lowest-priority programs so its interval is irregular.
- DREG does NOT record reactor power, reactivity or per-channel flows. Of 211 rods only 9 positions are logged (incl. one per AR group), on a 1-minute cycle.
- DREG had 3 interruptions in the last hour, from SKALA restarts.
- At 01:22:30 PRIZMA was not running. The ORM of 8 rods was computed after the accident from the tape with PRIZMA-ANALOG at Smolensk NPP. Control-room staff did not know the ORM.
- Signal names: "1 ПК-ВВЕРХ" / "1ПК-ВНИЗ" (overcompensation group 1 up/down), on 01:19:39–01:23:30.

## Initial state 01:23 (p.87)
200 MWt; ORM 8 rods (PRIZMA-ANALOG at 01:22:30); coolant 56,000 m³/h; feedwater 200 t/h; stop valves closed 01:23:04; AZ-5 01:23:40.

## Modelling notes
- Three Soviet 3D models gave power surges of 3.5× to ~80×; none reproduced AZM/AZS signals by the 3rd second (p.142).
- A one-group, 50 cm coarse-mesh 3D model (KIYAI, used in VNIIAES's DIKRUS) matched the DREG signals at 3, 6 and 9 s; the Commission rated it among the best available (p.80). This suggests a browser-scale full-core model is a reasonable target.
