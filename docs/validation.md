# Validation

The simulator is checked against figures from the historical record by `tests/check.js`. Run it with Node.js from the repository root:

```
node tests/check.js
```

Every line prints PASS or FAIL. The same checks run automatically on every push (`.github/workflows/check.yml`).

## Results (v3)

| Check | Record | Simulator | Tuned? |
|---|---|---|---|
| Operating reactivity margin (ORM) at 01:22:30, from the real rods | 6–8 rods (INSAG-7) | 6.4 | No |
| ORM with the 00:39 rod positions | 16.5 (Karpan) | 14.3 | No |
| ORM at full power (3100 MW) | 30.1 at 00:00 on 25 April (Karpan p.325, SKALA К1К printout) | 23.9 (a constructed rod pattern, not the recorded one) | No |
| Coolant flow just before AZ-5 | 51 000 m³/h | 50 400 | Pump coast-down rate |
| Overpower trip after AZ-5 | about 3 s | 2.7 s | Yes |
| Reactor destroyed after AZ-5 | about 5 s | 5.4 s | Yes |
| Same test with the 00:39 rods | not tested historically | peak 396 MW, no trip | — |
| AZ-5 at 01:23:40 without the run-down | INSAG-7: dangerous | destroyed at +7.3 s | — |
| 10 minutes at 01:22:30, no action | stable | 199 MW | — |

## Where the model is fragile

The timing of the excursion depends on one tuned parameter: how strongly the water columns in the control-rod channels absorb neutrons (`WR = 0.30` in `src/sim.js`).

- At 0.28 (−7 %), the 01:22:30 state no longer explodes.
- At 0.32 (+7 %), the 00:39 rod pattern comes close to tripping.

INSAG-7 (p.142) reports that the Soviet three-dimensional codes were just as sensitive to the starting axial power distribution, and that none reproduced the overpower signal within 3 seconds. So matching the record here shows the reconstruction is consistent with the documents. It does not prove the physics.

## Simplifications

- One axial dimension (28 slices). Rods are weighted by radial position, but the excursion's local character (fuel rows 12–30, Karpan p.380) is not captured.
- One delayed-neutron group instead of six.
- The xenon distribution at 01:22:30 was never measured; it is solved backwards from the measured flux shape (INSAG-7 Fig. II-5).
- Fuel-channel failure is a threshold rule, followed by rod jamming and steam ingress.
- Fuel-channel positions and the coloured power map are estimates.

## Reproducing a sensitivity run

1. In `src/sim.js`, change `WR: 0.30` to the value to test.
2. Run `node tests/check.js` and read the destruction and trip lines.
3. Change it back before committing.
