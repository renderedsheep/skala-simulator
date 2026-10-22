// Physics and data checks for the SKALA simulator (v2).
// Run from the tests folder with:  node check.js
// Each line prints PASS or FAIL against the documented value it is checking.

const CORE_DATA = require('../src/data.js');
const SIM = require('../src/sim.js');
let fails = 0;
function check(label, ok, detail) { console.log((ok ? 'PASS ' : 'FAIL ') + label.padEnd(60) + detail); if (!ok) fails++; }

function run(sc, { test = 34, az = 70, dur = 90 } = {}) {
  const S = SIM.scenario(sc), dt = 0.05; let maxP = 0, tAZM = null, tDes = null;
  for (let t = 0; t < dur; t += dt) {
    if (test !== null && Math.abs(t - test) < dt / 2) { S.testStarted = true; S.pumps.filter(p => [13, 14, 23, 24].includes(p.id)).forEach(p => p.coast = true); }
    if (az !== null && Math.abs(t - az) < dt / 2) SIM.scram(S);
    SIM.step(S, dt); maxP = Math.max(maxP, S.n * 3200);
    if (S.tripLatched.azm && tAZM === null) tAZM = S.t;
    if (S.destroyed && tDes === null) tDes = S.t;
    if (S.destroyed && S.t - S.destroyT > 6) break;
  }
  return { S, maxP, tAZM: tAZM === null ? null : tAZM - az, tDes: tDes === null ? null : tDes - az };
}

// Data
const cps = CORE_DATA.cps, count = t => cps.filter(c => c[3] === t).length;
check('CPS map: 211 rods + 12 detectors', cps.length === 223, cps.length + ' cells');
check('12 AR rods in 3 banks of 4', count('AR') === 12 && ['AR-a', 'AR-b', 'AR-c'].every(g => cps.filter(c => c[4] === g).length === 4), count('AR') + ' AR');
check('24 USP shortened rods', count('USP') === 24, count('USP') + ' USP');
check('1661 fuel-lattice cells', CORE_DATA.fuel.length === 1661, CORE_DATA.fuel.length + ' cells');

// Operating margin (ORM), computed by the PRIZMA-style routine
const orm = sc => SIM.ormPrizma(SIM.scenario(sc));
let v = orm('apr26');      check('ORM at 01:22:30 (record: 6-8 rods)', v >= 6 && v <= 8, v.toFixed(1));
v = orm('apr26_0039');     check('ORM with 00:39 rods (record: 16.5)', v >= 13 && v <= 19, v.toFixed(1));
v = orm('nominal');        check('ORM at full power is above the 15-rod limit', v > 15, v.toFixed(1));

// Dynamics
let r = run('nominal', { test: null, az: 5, dur: 40 });
check('Full power + AZ-5: shuts down, no destruction', !r.S.destroyed && r.S.n * 3200 < 400, 'P after 35 s ' + (r.S.n * 3200).toFixed(0) + ' MW');
r = run('apr26', { test: null, az: null, dur: 600 });
check('01:22:30 state holds near 200 MW for 10 min', !r.S.scram && Math.abs(r.S.n * 3200 - 200) < 30, (r.S.n * 3200).toFixed(0) + ' MW');
r = run('apr26');
check('Rundown + AZ-5: overpower trip (record: about +3 s)', r.tAZM !== null && r.tAZM >= 2 && r.tAZM <= 3.5, r.tAZM === null ? 'none' : '+' + r.tAZM.toFixed(1) + ' s');
check('Rundown + AZ-5: reactor destroyed (record: about +5 s)', r.tDes !== null && r.tDes >= 3 && r.tDes <= 9, r.tDes === null ? 'no' : '+' + r.tDes.toFixed(1) + ' s');
r = run('apr26_0039');
check('Same test with the 00:39 rods: no overpower trip', r.tAZM === null && !r.S.destroyed, 'peak ' + r.maxP.toFixed(0) + ' MW');

console.log(fails ? `\n${fails} check(s) failed.` : '\nAll checks passed.');
process.exit(fails ? 1 : 0);
