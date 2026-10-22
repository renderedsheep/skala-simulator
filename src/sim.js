// ===== SKALA simulator v2: RBMK-1000 unit 4 on the real CPS map, axial one-group diffusion =====
// Reactivity in Δk unless noted; dollars = Δk / BETA. Power in MW(th). Lengths in m. z measured from the TOP of the core.
// Core map: references/rbmk4_cps_map.csv (Karpan 2005, INSAG-7). Physics parameters: see PARAMS and README.
const SIM = (() => {
  const DATA = (typeof CORE_DATA !== 'undefined') ? CORE_DATA : require('./data.js');

  // ---------------- parameters ----------------
  const P = {
    H: 7.0, N: 28, PNOM: 3200, PITCH: 0.25,
    BETA: 0.005, LAMBDA: 0.0009, LAMBDA_D: 0.08,       // βeff, prompt generation time (s), 1-group precursor decay (1/s)
    M2: 0.025, DELTA: 0.5,                               // axial migration area (m²), extrapolation distance (m)
    A_ROD: 5.0e-4,                                       // Δk of one average rod fully inserted (≈0.1 β, INSAG-7 Table II-I: 139 RR = 7.5 %)
    WR: 0.30,                                            // water column absorption relative to B4C absorber (tuned)
    ALPHA_V: 2.6e-4,                                     // Δk per % steam void (design value 2.0e-4; ~+5 β total at low ORM)
    ALPHA_D: -1.2e-5,                                    // Δk per °C fuel temperature (INSAG-7 Table II-I)
    XE_W: 0.026,                                         // Δk of full-power equilibrium xenon
    BURN: 0.065,                                        // axial burnup dip: ends less burned than mid-height (tuned to Kz≈1.2-1.4 at power)
    R_FUEL: 0.13, TAU_FUEL: 2.0, TAU_VOID: 0.5, DIRECT: 0.05,
    ABS_LEN: 6.2, WATER_TOP: 1.25, DISP_LEN: 4.5, USP_MAX: 3.05, ROD_SPEED: 0.4,
    CP: 5.4, HFG: 1505, TSAT: 284, PUMP_M3H: 7000, KG_PER_M3: 0.2056,
    AR_KP: 5, AR_KD: 20, AR_DEAD: 0.02,
    PUMP_TRIP_M3H: 5000,
    KR_EST: 1.45, W_CRIT: 3.2, RUPTURE_VOID_RATE: 60,   // hottest-channel factor; channel critical power (MW); steam ingress after rupture (% void per s)
  };
  const { H, N, PNOM, BETA } = P;
  const h = H / N;
  const LAM_I = 2.87e-5, LAM_X = 2.09e-5, SIGPHI = 5 * LAM_X, G_X = 0.0357;

  // ---------------- core layout ----------------
  const RAD_EXT = 6.8;                                       // extrapolated radius (m)
  function j0(x) { // Bessel J0 (Abramowitz-Stegun polynomial, |x|<=3)
    const y = (x / 3) ** 2;
    return 1 - 2.2499997 * y + 1.2656208 * y ** 2 - 0.3163866 * y ** 3 + 0.0444479 * y ** 4 - 0.0039444 * y ** 5 + 0.00021 * y ** 6;
  }
  function buildCore() {
    const rods = [], dets = [];
    for (const [ch, x, y, type, arg, d39, d1, dI, r7] of DATA.cps) {
      const rm = Math.hypot(x, y) * P.PITCH;
      const cell = { ch, x, y, rm, nx: x / 26, ny: y / 26, d0039: d39, d012230: d1, dInsag: dI };
      if (type === 'DET') { dets.push(cell); continue; }
      const t = type === 'RR/LAR/AZ' ? 'RR' : type;     // РР, ЛАР and АЗ rods are not distinguished in the sources
      Object.assign(cell, { type: t, reads7: !!r7, bank: arg ? 'abc'.indexOf(arg.slice(-1)) : -1, d: 0, v: 0, jam: false });
      cell.wr = j0(2.405 * rm / RAD_EXT) ** 2;
      rods.push(cell);
    }
    const mean = rods.reduce((a, r) => a + r.wr, 0) / rods.length;
    rods.forEach((r, i) => { r.wr /= mean; r.id = i; r.ang = (Math.atan2(r.y, r.x) + 2 * Math.PI) % (2 * Math.PI); });
    // manual-drive sectors (simulator convenience, not a plant grouping)
    rods.filter(r => r.type === 'RR').forEach(r => r.group = Math.floor(r.ang / (2 * Math.PI) * 8) % 8);
    const fuel = DATA.fuel.map(([x, y]) => ({ x, y, nx: x / 26, ny: y / 26, rm: Math.hypot(x, y) * P.PITCH }));
    return { rods, dets, fuel };
  }

  // ---------------- rod geometry per axial node ----------------
  const ov = (a, b, k) => Math.max(0, Math.min(b, (k + 1) * h) - Math.max(a, k * h)) / h;
  function rodNodes(r, absOut, watOut) {   // fills absorber and water fractions for each node
    const d = r.d;
    for (let k = 0; k < N; k++) {
      let a = 0, w = 0;
      if (r.type === 'USP') { a = ov(H - d, H, k); w = ov(0, H - d, k); }
      else if (r.type === 'AR') { a = ov(d - P.ABS_LEN, d, k); w = 1 - a; }
      else { a = ov(d - P.ABS_LEN, d, k); w = ov(0, d - P.ABS_LEN, k) + ov(d, d + P.WATER_TOP, k) + ov(d + P.WATER_TOP + P.DISP_LEN, H, k); }
      absOut[k] = a; watOut[k] = w;
    }
  }
  const tmpA = new Float64Array(N), tmpW = new Float64Array(N);
  function rodDk(S) {          // per-node Δk∞ from all CPS channels; also absorber map for ORM (cached per rod)
    const dk = S.dkRod; dk.fill(0); S.absW.fill(0);
    for (const r of S.rods) {
      if (!r.cA) { r.cA = new Float64Array(N); r.cW = new Float64Array(N); r.cD = NaN; }
      if (r.cD !== r.d) { rodNodes(r, r.cA, r.cW); r.cD = r.d; }
      const cA = r.cA, cW = r.cW, w = P.A_ROD * r.wr;
      for (let k = 0; k < N; k++) {
        dk[k] -= w * (cA[k] + P.WR * cW[k]);
        S.absW[k] += r.wr * cA[k];
      }
    }
  }

  // ---------------- axial eigenvalue problem: -M² φ'' + φ = λ k∞ φ ----------------
  const cOff = P.M2 / (h * h), cEdge = P.M2 / (h * (h / 2 + P.DELTA));
  const dia = new Float64Array(N);
  for (let k = 0; k < N; k++) dia[k] = 1 + (k === 0 || k === N - 1 ? cOff + cEdge : 2 * cOff);
  const tA = new Float64Array(N), tB = new Float64Array(N), tC = new Float64Array(N), tR = new Float64Array(N), cp = new Float64Array(N), dp = new Float64Array(N);
  function solveTri(a, b, c, r, x) {   // a sub, b diag, c super
    cp[0] = c[0] / b[0]; dp[0] = r[0] / b[0];
    for (let i = 1; i < N; i++) { const m = b[i] - a[i] * cp[i - 1]; cp[i] = c[i] / m; dp[i] = (r[i] - a[i] * dp[i - 1]) / m; }
    x[N - 1] = dp[N - 1];
    for (let i = N - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
  }
  const psi = new Float64Array(N);
  function eigen(S, iters = 12) {
    const kinf = S.kinf, phi = S.phi;
    let lam = S.lam;
    for (let it = 0; it < iters; it++) {
      const sig = lam - 0.004;
      for (let k = 0; k < N; k++) { tA[k] = -cOff; tC[k] = -cOff; tB[k] = dia[k] - sig * kinf[k]; tR[k] = kinf[k] * phi[k]; }
      solveTri(tA, tB, tC, tR, psi);
      let nrm = 0; for (let k = 0; k < N; k++) nrm += psi[k];
      if (!isFinite(nrm) || nrm === 0) { psi.fill(1); nrm = N; }
      let dmax = 0;
      for (let k = 0; k < N; k++) { const v = Math.max(1e-9, psi[k] * N / nrm); dmax = Math.max(dmax, Math.abs(v - phi[k])); phi[k] = v; }
      // Rayleigh quotient λ = <φ,Tφ>/<φ,Kφ>
      let num = 0, den = 0;
      for (let k = 0; k < N; k++) {
        const tp = dia[k] * phi[k] - (k > 0 ? cOff * phi[k - 1] : 0) - (k < N - 1 ? cOff * phi[k + 1] : 0);
        num += phi[k] * tp; den += phi[k] * kinf[k] * phi[k];
      }
      lam = num / den; if (dmax < 1e-7) break;
    }
    S.lam = lam;
    return lam;
  }

  // ---------------- local k∞ assembly ----------------
  const burnShape = new Float64Array(N);
  (() => { let m = 0; for (let k = 0; k < N; k++) { burnShape[k] = Math.sin(Math.PI * ((k + 0.5) * h + P.DELTA) / (H + 2 * P.DELTA)); m += burnShape[k]; } m /= N; for (let k = 0; k < N; k++) burnShape[k] -= m; })();
  function buildKinf(S) {
    rodDk(S);
    for (let k = 0; k < N; k++) {
      S.kinf[k] = 1 + S.c0 - P.BURN * burnShape[k] + S.dkRod[k]
        + P.ALPHA_V * S.vd[k] + P.ALPHA_D * (S.tf[k] - P.TSAT) - P.XE_W * S.xe[k];
    }
  }

  // ---------------- thermal hydraulics ----------------
  const alphaQ = (x, p) => { const r = 0.049 * p / 68, Sl = 1.6; return x <= 0 ? 0 : x / (x + (1 - x) * r * Sl); };
  const tfw = q => 140 + 50 * Math.min(1, q / PNOM);
  function hydro(S, G) {          // per-node void from enthalpy rise, coolant flows upward (bottom node = N-1)
    const qTot = S.q.reduce((a, b) => a + b, 0) + P.DIRECT * S.n * PNOM;
    const dTsub = Math.max(0, S.Gfw / G * (P.TSAT - tfw(qTot)));
    const sub = P.CP * dTsub;
    let hcum = 0, zb = null;
    for (let k = N - 1; k >= 0; k--) {
      const qk = S.q[k] + P.DIRECT * S.n * PNOM / N;
      const hin = hcum; hcum += qk * 1000 / G;
      const hmid = (hin + hcum) / 2;
      const x = Math.max(0, (hmid - sub) / P.HFG);
      S.vdT[k] = 100 * alphaQ(x, S.p);
      if (zb === null && hcum > sub) zb = k;
    }
    const Gs = Math.max(0, (qTot * 1000 - G * sub) / P.HFG);
    return { dTsub, Gs, qTot, zb };
  }

  // ---------------- state ----------------
  function create() {
    const core = buildCore();
    return {
      ...core, t: 0, clock0: 0, date: '', n: 1, C: 1, lam: 1, c0: 0, rho: 0, lnRate: 0, period: Infinity,
      phi: new Float64Array(N).fill(1), kinf: new Float64Array(N), dkRod: new Float64Array(N), absW: new Float64Array(N),
      tf: new Float64Array(N).fill(P.TSAT), q: new Float64Array(N), vd: new Float64Array(N), vdT: new Float64Array(N),
      xe: new Float64Array(N), io: new Float64Array(N),
      p: 65, L: 0, Gfw: 1500, GsF: 1500, hy: null,
      pumps: [11, 12, 13, 14, 21, 22, 23, 24].map((id, k) => ({ id, side: k < 4 ? 'Л' : 'П', on: true, w: 1, coast: false, tripped: false })),
      drk: 1, ar: { on: true, set: 3100, bank: 0, pk: '' }, groupMove: {}, singleMove: null, scram: false, scramT: null,
      destroyed: false, destroyT: null, powerOffT: null, azmSet: 3520, prot: true, tripLatched: {},
      events: [], dregPending: [], dregOnline: true, dregOfflineUntil: 0, dregNextPoll: 2.5, dregCycle: 1, dregRodNext: 60,
      testStarted: false, prizmaNext: 300, skalaMode: 'ПАРНЫЙ', signals: {},
    };
  }

  // ---------------- signals (DREG on/off with "=0" clearing) ----------------
  function ev(S, ru, en, opts = {}) {
    if (opts.tty) S.events.push({ t: S.t, kind: 'tty', ru: opts.ttyRu || ru, en: opts.ttyEn || en });
    if (opts.ttyOnly) return;
    S.dregPending.push({ t: S.t, ru, en, code: opts.code });
  }
  function signal(S, key, on, ru, en) {           // level signal: logs on rise, "=0 …" on fall
    if (!!S.signals[key] === on) return;
    S.signals[key] = on;
    if (on) ev(S, ru, en); else ev(S, '=0 ' + ru, 'Cleared: ' + en);
  }

  // ---------------- AZ-5 ----------------
  function scram(S, cause) {
    if (S.destroyed) return;
    if (!S.scram) {
      S.scram = true; S.scramT = S.t; S.ar.on = false;
      for (const r of S.rods) if (!r.jam) r.v = r.type === 'USP' ? -P.ROD_SPEED : P.ROD_SPEED;   // USP were not part of AZ in 1986 (Karpan p.370): they stay
      for (const r of S.rods) if (r.type === 'USP') r.v = 0;
      S.groupMove = {}; S.singleMove = null;
      ev(S, 'АЗ-5 СУЗ', 'AZ-5 command to the control and protection system', { tty: true, ttyRu: 'АВАР ЗАЩИТА 5', ttyEn: 'EMERGENCY PROTECTION 5' });
      ev(S, 'СТЕРЖНИ СОШЛИ С ВК', 'Rods left their upper limit switches');
      ev(S, 'НЕГОТОВНОСТЬ АЗ', 'Emergency protection not ready (AZ rods off upper limits)');
      ev(S, 'ОТКЛЮЧЕНИЕ АР ПО НЕИСПРАВНОСТИ', 'Automatic regulator disconnected');
      ev(S, 'РАЗГРУЗКА ТГ ПРИ АЗ-5', 'Turbine-generator unloading on AZ-5');
    }
    if (cause) ev(S, cause.ru, cause.en);
  }

  // ---------------- one step ----------------
  function step(S, dt) {
    if (S.destroyed) { afterDestroy(S, dt); S.t += dt; return; }
    // pumps: coasting units slow with the turbine (≈20 % in 36 s), DRK valves close after AZ-5 at low power
    if (S.scram && S.n < 0.2) S.drk = Math.max(0.85, S.drk - 0.05 * dt);
    for (const pm of S.pumps) {
      if (pm.tripped) pm.w = Math.max(0, pm.w - 0.018 * dt);            // run-down after trip: ≈500 m³/h per s over 4 pumps (Karpan p.337)
      else if (pm.coast) pm.w = Math.max(0, pm.w - 0.0055 * dt);        // turbine run-down: total flow 56 800 → 51 000 m³/h in 35 s (DREG)
      else if (pm.on) pm.w += (1 - pm.w) / 8 * dt; else pm.w += -pm.w / 12 * dt;
      const m3h = pm.w * S.drk * P.PUMP_M3H;
      if (pm.on && !pm.tripped && pm.w > 0.3 && m3h < P.PUMP_TRIP_M3H && (pm.coast || S.drk < 1)) {
        pm.tripped = true; pm.on = false;
        ev(S, `ОТКЛЮЧЕНИЕ ГЦН-${pm.id} ПО РАСХОДУ`, `MCP-${pm.id} tripped on low flow (<5000 m³/h)`);
        const side = S.pumps.filter(q => q.side === pm.side && q.tripped).length;
        if (side >= 2 && !S.tripLatched['az1' + pm.side]) { S.tripLatched['az1' + pm.side] = true; S.events.push({ t: S.t, kind: 'tty', ru: 'АВАР ЗАЩИТА 1', en: 'EMERGENCY PROTECTION 1 (2 of 4 pumps tripped on one side)' }); }
      }
    }
    const G = Math.max(150, flowKg(S));
    // rods
    if (S.ar.on && !S.scram) arControl(S, dt);
    if (S.assist && S.ar.on && !S.scram) siurAssist(S);
    for (const r of S.rods) {
      if (r.jam) continue;
      let v = 0;
      if (S.scram) v = r.v;
      else if (r.type === 'AR') continue;
      else if (S.singleMove && S.singleMove.id === r.id) v = S.singleMove.dir * P.ROD_SPEED;
      else if (S.assistMove && S.assistMove.ids.includes(r.id)) v = S.assistMove.dir * P.ROD_SPEED * 0.5;
      else { const g = r.type === 'RR' ? 'RR' + r.group : r.type; if (S.groupMove[g]) v = S.groupMove[g] * P.ROD_SPEED; }
      const max = r.type === 'USP' ? P.USP_MAX : H;
      r.d = Math.max(0, Math.min(max, r.d + v * dt));
    }
    // neutronics: shape (adiabatic) + amplitude (point kinetics)
    buildKinf(S);
    const lam = eigen(S, S.scram ? 16 : 8);
    const rho = (1 - lam) / BETA;                         // dollars
    S.rho = rho;
    const K = BETA / P.LAMBDA;
    let left = dt; const n0 = S.n;
    while (left > 1e-12) {
      const hs = Math.min(left, 0.05 / (K * Math.abs(rho - 1) + 1));
      S.n = (S.n + hs * K * S.C + hs * 1e-10) / (1 - hs * K * (rho - 1));
      S.C = (S.C + hs * P.LAMBDA_D * S.n) / (1 + hs * P.LAMBDA_D);
      left -= hs;
    }
    S.n = Math.max(1e-9, S.n);
    const lr = Math.log(S.n / n0) / dt; S.lnRate += (lr - S.lnRate) * Math.min(1, dt / 0.5);
    S.period = S.lnRate > 1e-4 ? 1 / S.lnRate : Infinity;
    // fuel temperature per node
    const Pf = S.n * PNOM, cf = P.TAU_FUEL / (P.R_FUEL * N);
    for (let k = 0; k < N; k++) {
      const pk = (1 - P.DIRECT) * Pf * S.phi[k] / N;
      S.q[k] = (S.tf[k] - P.TSAT) / (P.R_FUEL * N);
      S.tf[k] += (pk - S.q[k]) / cf * dt;
    }
    // void, feedwater, drum level and pressure
    const hy = hydro(S, G); S.hy = hy;
    for (let k = 0; k < N; k++) S.vd[k] += (S.vdT[k] - S.vd[k]) * Math.min(1, dt / P.TAU_VOID);
    S.Gfw += (Math.max(0, hy.Gs - 0.6 * S.L) - S.Gfw) * Math.min(1, dt / 12);
    S.L += (S.Gfw - hy.Gs) / 40 * dt;
    S.GsF += (hy.Gs - S.GsF) * Math.min(1, dt / 5);
    const Gout = Math.max(0, Math.min(2000, S.GsF + 40 * (S.p - 65)));
    S.p += (hy.Gs - Gout) / 300 * dt;
    // xenon / iodine per node
    for (let k = 0; k < N; k++) {
      const pp = S.n * S.phi[k];
      S.io[k] += LAM_I * (pp - S.io[k]) * dt;
      S.xe[k] += ((LAM_X + SIGPHI) * (G_X * pp + (1 - G_X) * S.io[k]) - (LAM_X + SIGPHI * pp) * S.xe[k]) * dt;
    }
    if (S.prot) protections(S, Pf);
    // boiling crisis in the hottest channel -> fuel channels rupture, rods jam, steam floods the core (labelled model, not a code)
    const wtk = Pf / 1661 * P.KR_EST, wcrit = P.W_CRIT * Math.pow(Math.max(0.2, G / (48000 * P.KG_PER_M3)), 0.4);
    S.wtk = wtk;
    if (!S.crisis && wtk > wcrit) {
      S.crisis = true; S.crisisT = S.t;
      for (const r of S.rods) { r.jam = true; r.v = 0; }
    }
    if (S.crisis) for (let k = 0; k < N; k++) S.vd[k] = Math.min(95, S.vd[k] + P.RUPTURE_VOID_RATE * Math.min(1, S.n * S.phi[k] / 2) * dt);
    if (Pf > 32000 || (S.crisis && S.t - S.crisisT > 2.0)) destroy(S);   // reactor-space overpressure lifts the upper plate
    skalaTick(S, dt);
    S.t += dt;
  }

  function flowKg(S) { return S.pumps.reduce((a, pm) => a + pm.w * S.drk * P.PUMP_M3H * P.KG_PER_M3, 0); }

  function arControl(S, dt) {
    const bank = b => S.rods.filter(r => r.type === 'AR' && r.bank === b);
    const Pn = S.n * PNOM;
    const u = P.AR_KP * (Pn - S.ar.set) / S.ar.set + P.AR_KD * S.lnRate;
    let b = S.ar.bank, rods = bank(b);
    const dAvg = rods.reduce((a, r) => a + r.d, 0) / rods.length;
    signal(S, 'pkup', dAvg < 1.4, `${b + 1} ПК-ВВЕРХ`, `Overcompensation ${b + 1}: AR rods near upper limit`);
    signal(S, 'pkdn', dAvg > 5.6, `${b + 1} ПК-ВНИЗ`, `Overcompensation ${b + 1}: AR rods near lower limit`);
    if (Math.abs(u) < P.AR_DEAD) return;
    const v = Math.max(-1, Math.min(1, u)) * P.ROD_SPEED;
    const atTop = rods.every(r => r.d <= 0.001), atBot = rods.every(r => r.d >= H - 0.001);
    if ((v < 0 && atTop) || (v > 0 && atBot)) {
      ev(S, `${b + 1}АР НА ${v < 0 ? 'ВК' : 'НК'}`, `${b + 1}AR bank at ${v < 0 ? 'upper' : 'lower'} limit switch`);
      const next = [0, 1, 2].find(k => k !== b && bank(k).some(r => v < 0 ? r.d > 0.001 : r.d < H - 0.001));
      if (next === undefined) { S.ar.on = false; ev(S, 'ОТКЛЮЧЕНИЕ АР ПО НЕИСПРАВНОСТИ', 'Automatic regulator disconnected (out of range)'); return; }
      S.ar.bank = next; ev(S, `${next + 1}АР В РЕЖИМЕ АВТ.`, `${next + 1}AR bank switched to automatic`); rods = bank(next);
    }
    for (const r of rods) r.d = Math.max(0, Math.min(H, r.d + v * dt));
  }

  // Simulator convenience: re-compensate with manual rods so the AR stays mid-range (the SIUR did this by hand).
  function siurAssist(S) {
    const ar = S.rods.filter(r => r.type === 'AR' && r.bank === S.ar.bank);
    const dAvg = ar.reduce((a, r) => a + r.d, 0) / ar.length;
    const cur = S.assistMove;
    if (cur) {
      const maxOf = id => S.rods[id].type === 'USP' ? P.USP_MAX : H;
      const atEnd = cur.ids.every(id => { const r = S.rods[id]; return cur.dir < 0 ? r.d <= 0 : r.d >= maxOf(id); });
      const done = atEnd || (cur.shape ? (S.assistT = (S.assistT || 0) + 1) > 24 : ((cur.dir < 0 && dAvg > 3.0) || (cur.dir > 0 && dAvg < 4.0)));
      if (done) S.assistT = 0;
      if (done) S.assistMove = null;
      return;
    }
    // axial offset: (upper half - lower half) / total
    let up = 0, lo = 0; for (let k = 0; k < N; k++) { if (k < N / 2) up += S.phi[k]; else lo += S.phi[k]; }
    const ao = (up - lo) / (up + lo);
    const rr = S.rods.filter(r => r.type === 'RR'), usp = S.rods.filter(r => r.type === 'USP');
    let pick = null, dir = 0;
    if (dAvg < 1.5) {           // regulator nearly out: add reactivity
      dir = -1;
      const u = usp.filter(r => r.d > 0.01), m = rr.filter(r => r.d > 0.01);
      pick = (ao > 0.05 && u.length) ? u.sort((a, b) => b.d - a.d) : m.sort((a, b) => b.d * b.wr - a.d * a.wr);
    } else if (dAvg > 5.5) {    // regulator nearly in: remove reactivity
      dir = 1;
      const u = usp.filter(r => r.d < P.USP_MAX - 0.01), m = rr.filter(r => r.d < H - 0.01);
      pick = (ao < -0.05 && u.length) ? u.sort((a, b) => a.d - b.d) : m.sort((a, b) => a.d - b.d || b.wr - a.wr);
    }
    if (pick && pick.length) {
      const ids = pick.slice(0, 3).map(r => r.id);
      S.assistMove = { ids, dir, shape: dAvg >= 1.0 && dAvg <= 6.0 };
      const kind = S.rods[ids[0]].type === 'USP' ? 'УСП' : 'РР';
      ev(S, `${dir < 0 ? 'ВЫВОД' : 'ВВОД'} ${kind} ${ids.map(i => S.rods[i].ch).join(' ')} (СИУР)`, `SIUR assist: ${dir < 0 ? 'withdrawing' : 'inserting'} three ${kind === 'УСП' ? 'shortened (bottom)' : 'manual'} rods`);
    }
  }

  function protections(S, Pf) {
    const L = S.tripLatched;
    if (Pf > S.azmSet && !L.azm) {
      L.azm = true; S.events.push({ t: S.t, kind: 'tty', ru: 'АВАР ЗАЩИТА 5', en: 'EMERGENCY PROTECTION 5 (overpower AZM)' });
      scram(S, { ru: 'АЗМ (ПРЕВ. МОЩН. В ОСНОВН. ДИАПАЗОНЕ)', en: 'AZM: power above setpoint, main range' });
      ['2УЗМ-1', '2УЗМ-2', '2УЗМ-3', '2УЗМ-4', '1УЗМ-1', '1УЗМ-2', '1УЗМ-3', '1УЗМ-4'].forEach((c, i) => ev(S, `ПРЕВЫШЕНИЕ N АВАРИЙНЫЙ В ${c}`, i ? '' : 'Emergency power excess on each of the eight power-protection channels'));
    }
    if (S.period < 20 && Pf > 30 && !L.azs) { L.azs = true; scram(S, { ru: 'АЗСР (СНИЖ. ПЕРИОДА В ОСНОВН. ДИАПАЗОНЕ)', en: 'AZSR: reactor period below 20 s, main range' }); }
    if (S.p > 75 && !L.pbs) { L.pbs = true; ev(S, 'ПРЕВЫШЕНИЕ ДАВЛЕНИЯ В БС ПРАВ.', 'Drum separator pressure high, right'); ev(S, 'ПРЕВЫШЕНИЕ ДАВЛЕНИЯ В БС ЛЕВ.', 'Drum separator pressure high, left'); }
    if (S.p > 71.5 && !L.bruk) { L.bruk = true; ev(S, 'СРАБАТЫВАНИЕ БРУ-К1', 'Fast steam dump to condenser 1 opened'); }
    signal(S, 'lvl', S.L < -600, 'АВАРИЙНОЕ ОТКЛОНЕНИЕ УРОВНЯ В БС', 'Emergency deviation of drum separator level');
  }

  function destroy(S) {
    S.destroyed = true; S.destroyT = S.t; S.powerOffT = S.t + 3.6;
    for (const r of S.rods) { r.jam = true; r.v = 0; }
    S.pumps.forEach(pm => { pm.on = false; });
    S.pendingDestroy = [
      [1.5, () => { ev(S, 'НЕИСПРАВН. ИЗМЕРИТЕЛ. ЧАСТИ АР-1', 'AR-1 measuring channel fault'); ev(S, 'НЕИСПРАВН. ИЗМЕРИТЕЛ. ЧАСТИ АР-2', 'AR-2 measuring channel fault'); ev(S, 'АВАРИЙНОЕ ОТКЛОНЕНИЕ УРОВНЯ В БС', 'Emergency deviation of drum separator level'); ev(S, 'ПРЕВЫШЕНИЕ ДАВЛЕНИЯ В БС ПРАВ.', 'Drum separator pressure high, right'); ev(S, 'ПРЕВЫШЕНИЕ ДАВЛЕНИЯ В БС ЛЕВ.', 'Drum separator pressure high, left'); }],
      [2.5, () => { ev(S, 'СРАБАТЫВАНИЕ БРУ-К1', 'Fast steam dump to condenser 1 opened'); }],
      [3.5, () => { ev(S, 'РОСТ ДАВЛЕНИЯ В РП', 'Pressure rise in reactor space: fuel channels ruptured', { code: 'К06L005 =1' }); ev(S, 'НЕТ НАПРЯЖЕНИЯ 48В 1СШ', 'No 48 V on bus 1SSh: rod clutch power lost'); ev(S, 'НЕИСПРАВН. ИСПОЛНИТ. ЧАСТИ 1АР', '1AR actuator fault'); ev(S, 'НЕИСПРАВН. ИСПОЛНИТ. ЧАСТИ 2АР', '2AR actuator fault'); }],
    ];
  }
  function afterDestroy(S, dt) {
    S.n *= Math.exp(-dt / 0.6); S.p += 6 * dt;
    const el = S.t - S.destroyT;
    while (S.pendingDestroy.length && el >= S.pendingDestroy[0][0]) S.pendingDestroy.shift()[1]();
    if (S.t >= S.powerOffT && !S.powerLost) {
      S.powerLost = true; flushDreg(S);
      S.events.push({ t: S.t, kind: 'poweroff' });
      return;
    }
    if (!S.powerLost && S.t >= S.dregNextPoll) flushDreg(S);
  }

  // ---------------- SKALA programs ----------------
  function flushDreg(S) {
    const span = S.t - (S.lastPoll ?? S.t - 2);
    S.lastPoll = S.t;
    S.dregNextPoll = S.t + 2 + Math.random() * 2;     // DREG is low priority: 2-4 s cycles
    if (!S.dregOnline) { S.dregPending.length = 0; return; }
    if (!S.dregPending.length) { S.dregCycle++; return; }
    S.events.push({ t: S.t, kind: 'dreg', cycle: S.dregCycle++, span, lines: S.dregPending.splice(0) });
  }
  const ROD_LOG = ['44-37', '50-27', '54-37', '40-23', '46-35', '32-31', '44-53', '34-13', '62-31'];   // 9 logged rods: one per AR bank, plain rods and two УСП; which 9 were logged is not documented
  function skalaTick(S, dt) {
    if (S.dregOfflineUntil && S.t >= S.dregOfflineUntil) {
      S.dregOfflineUntil = 0; S.dregOnline = true;
      S.events.push({ t: S.t, kind: 'sys', ru: 'ДРЕГ: ЗАПИСЬ ВОЗОБНОВЛЕНА', en: 'DREG recording resumed' });
      if (S.restarting) {
        S.restarting = false; S.skalaMode = 'ПАРНЫЙ';
        const [d, m, y] = S.date.split('.');
        S.events.push({ t: S.t, kind: 'tty', ru: `ДАТА ${+d}.${+m}.${y} ПАРН`, en: 'SKALA restarted in paired mode (banner as on the 01:36 tape)' });
      }
    }
    if (S.t >= S.dregNextPoll) flushDreg(S);
    if (S.t >= S.dregRodNext) {
      S.dregRodNext = S.t + 60;
      if (S.dregOnline) {
        const m = Object.fromEntries(S.rods.map(r => [r.ch, r]));
        const cells = ROD_LOG.filter(c => m[c]).map(c => `${c}:${m[c].d.toFixed(1).replace('.', ',')}`);
        S.dregPending.push({ t: S.t, ru: 'ПОЛОЖЕНИЕ СТЕРЖНЕЙ, М', en: '' });
        for (let i = 0; i < cells.length; i += 3)       // three rods per printed line, so the listing fits the page width
          S.dregPending.push({ t: S.t, ru: cells.slice(i, i + 3).join(' '), en: i + 3 >= cells.length ? 'Positions of the 9 logged rods in metres, channel:depth (1-minute cycle)' : '' });
      }
    }
  }

  // ---------------- derived quantities ----------------
  function ormPrizma(S) {     // flux-weighted equivalent fully inserted rods (PRIZMA definition), AZ excluded
    let num = 0, den = 0;
    for (let k = 0; k < N; k++) { const w = S.phi[k] ** 2; num += S.absW[k] * w; den += w; }
    return num / den;
  }
  function ormQuick(S) {      // simple count from rod positions: inserted absorber length / core height
    let o = 0;
    for (const r of S.rods) {
      rodNodes(r, tmpA, tmpW); let a = 0; for (let k = 0; k < N; k++) a += tmpA[k]; o += a / N;
    }
    return o;
  }
  const thermal = S => S.q.reduce((a, b) => a + b, 0) + P.DIRECT * S.n * PNOM;
  const flowM3 = S => S.pumps.reduce((a, pm) => a + pm.w * S.drk * P.PUMP_M3H, 0);
  function sevenPoint(S) {     // 7 axial sections of 1 m (like the ДКЭВ height detectors), top first, relative to mean
    const out = []; for (let s = 0; s < 7; s++) { let a = 0; for (let k = s * 4; k < s * 4 + 4; k++) a += S.phi[k]; out.push(a / 4); }
    return out;
  }
  const kz = S => Math.max(...S.phi);
  function channelPower(S) {   // illustrative radial map: J0 shape depressed by nearby inserted absorber (not a 2D solution)
    const w = Array.from(S.phi, v => v * v), ws = w.reduce((a, b) => a + b, 0);
    const imp = S.rods.map(r => { rodNodes(r, tmpA, tmpW); let a = 0; for (let k = 0; k < N; k++) a += tmpA[k] * w[k]; return a / ws; });
    const vals = S.fuel.map(f => {
      let v = Math.max(0.05, j0(2.405 * f.rm / RAD_EXT));
      for (let i = 0; i < S.rods.length; i++) {
        const r = S.rods[i]; if (imp[i] < 0.01) continue;
        const d2 = ((f.x - r.x) ** 2 + (f.y - r.y) ** 2) * P.PITCH ** 2;
        v *= 1 - 0.55 * imp[i] * Math.exp(-d2 / (2 * 0.55 ** 2));
      }
      return v;
    });
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    return vals.map(v => v / m);
  }

  // ---------------- initialisation ----------------
  function equilibriumXe(S, nrel) {
    for (let k = 0; k < N; k++) {
      const pp = nrel * S.phi[k]; S.io[k] = pp;
      S.xe[k] = (LAM_X + SIGPHI) * pp / (LAM_X + SIGPHI * pp);
    }
  }
  function settleThermal(S, Pth) {
    S.n = S.C = Pth / PNOM;
    for (let k = 0; k < N; k++) { S.q[k] = (1 - P.DIRECT) * Pth * S.phi[k] / N; S.tf[k] = P.TSAT + P.R_FUEL * N * S.q[k]; }
    const G = flowKg(S);
    for (let it = 0; it < 40; it++) { const hy = hydro(S, G); S.Gfw = hy.Gs; }
    const hy = hydro(S, G); S.hy = hy; S.GsF = hy.Gs; S.vd.set(S.vdT); S.L = 0;
  }
  function solveC0(S, opts) {   // find c0 (or xenon scale) so the state is exactly critical, iterating shape/feedback
    for (let outer = 0; outer < 30; outer++) {
      settleThermal(S, opts.P);
      if (opts.xeEq) equilibriumXe(S, opts.P / PNOM);
      // secant on the free parameter
      const f = v => { opts.set(S, v); buildKinf(S); return eigen(S, 400) - 1; };
      let a = opts.guess, b = opts.guess + 0.002, fa = f(a), fb = f(b);
      for (let i = 0; i < 30 && Math.abs(fb) > 1e-10; i++) { const c = b - fb * (b - a) / (fb - fa); a = b; fa = fb; b = c; fb = f(b); }
      opts.guess = b;
    }
  }
  // INSAG-7 Fig. II-5 curve 4: relative flux vs height from the BOTTOM (m), before the accident
  const FIG_II5_C4 = [[0, 0.5], [0.3, 0.56], [0.5, 0.62], [1, 0.85], [1.5, 1.0], [2, 1.05], [3, 1.05], [4, 1.07], [4.5, 1.2], [5, 1.33], [5.5, 1.37], [6, 1.25], [6.5, 1.0], [7, 0.66]];
  function targetPhi(curve) {
    const out = new Float64Array(N);
    for (let k = 0; k < N; k++) {
      const hgt = H - (k + 0.5) * h;
      let i = 0; while (i < curve.length - 2 && curve[i + 1][0] < hgt) i++;
      const [x0, y0] = curve[i], [x1, y1] = curve[i + 1];
      out[k] = y0 + (y1 - y0) * (hgt - x0) / (x1 - x0);
    }
    for (let pass = 0; pass < 6; pass++) {          // smooth the hand-digitised curve so its corners do not become spikes
      const c = out.slice();
      for (let k = 1; k < N - 1; k++) out[k] = 0.25 * c[k - 1] + 0.5 * c[k] + 0.25 * c[k + 1];
    }
    const m = out.reduce((a, b) => a + b, 0) / N; for (let k = 0; k < N; k++) out[k] /= m;
    return out;
  }
  function inferXenon(S, curve, Pth) {
    const T = targetPhi(curve);
    S.phi.set(T);
    for (let it = 0; it < 6; it++) {
      settleThermal(S, Pth);
      S.xe.fill(0); buildKinf(S);                        // k∞ with zero xenon
      for (let k = 0; k < N; k++) {
        const tp = dia[k] * T[k] - (k > 0 ? cOff * T[k - 1] : 0) - (k < N - 1 ? cOff * T[k + 1] : 0);
        const kreq = tp / T[k];                           // local k∞ needed for T to be the critical shape (λ = 1)
        S.xe[k] = Math.max(0, (S.kinf[k] - kreq) / P.XE_W);
      }
    }
    for (let pass = 0; pass < 3; pass++) { const c = S.xe.slice(); for (let k = 1; k < N - 1; k++) S.xe[k] = 0.25 * c[k - 1] + 0.5 * c[k] + 0.25 * c[k + 1]; }
    const mx = S.xe.reduce((a, b) => a + b, 0) / N;
    for (let k = 0; k < N; k++) S.io[k] = 0.45 * S.xe[k] / mx;
    buildKinf(S); S.lam = 1; eigen(S, 400);
    return S.xe.slice();
  }
  let C0 = null;
  function nominalRods(S) {      // constructed full-power configuration (ORM ≈ 31), not a documented map
    const depth = [2.2, 1.9, 1.6, 1.3, 1.0, 0.8, 0.5, 0.3];
    for (const r of S.rods) {
      if (r.reads7) r.d = 0.07;           // the 24 rods that read 7 cm in both recorded maps stay withdrawn
      else if (r.type === 'USP') r.d = 2.6;
      else if (r.type === 'AR') r.d = 3.5;
      else r.d = depth[r.group] + (r.d0039 > 100 ? 0.8 : 0);
    }
  }
  function calibrate() {
    const S = create(); nominalRods(S);
    S.pumps.forEach(pm => { const res = pm.id === 14 || pm.id === 24; pm.on = !res; pm.w = res ? 0 : 1; });
    S.lam = 1;
    solveC0(S, { P: 3100, xeEq: true, guess: 0.05, set: (S, v) => { S.c0 = v; } });
    return S.c0;
  }
  function scenario(name) {
    if (C0 === null) C0 = calibrate();
    const S = create(); S.c0 = C0; S.name = name;
    if (name === 'nominal') {
      S.date = '25.04.86'; S.clock0 = 1 * 3600 + 5 * 60;
      nominalRods(S);
      S.pumps.forEach(pm => { const res = pm.id === 14 || pm.id === 24; pm.on = !res; pm.w = res ? 0 : 1; });
      solveC0(S, { P: 3100, xeEq: true, guess: C0, set: (S, v) => { S.c0 = v; } });
      S.ar.set = 3100; S.azmSet = 3520; S.ar.bank = 0; S.assist = true;
    } else {
      const which = name === 'apr26_0039' ? 'd0039' : 'd012230';
      S.date = '26.04.86'; S.clock0 = 1 * 3600 + 22 * 60 + 30;
      for (const r of S.rods) r.d = (r[which] || 0) / 100;
      S.pumps.forEach(pm => { pm.on = true; pm.w = 1; });
      S.p = 64; S.azmSet = 530;
      // active AR bank: the deepest group (Karpan: AR-1 reached its lower limit by 01:23:30)
      const banks = [0, 1, 2].map(b => S.rods.filter(r => r.type === 'AR' && r.bank === b).reduce((a, r) => a + r.d, 0));
      S.ar.bank = banks.indexOf(Math.max(...banks));
      // The axial xenon distribution at 01:22:30 was never measured (INSAG-7 p.81). The flux shape was:
      // INSAG-7 Fig. II-5 curve 4 (in-core height detectors). Solve for the xenon profile that reproduces it.
      const xenonRef = inferXenon(S, FIG_II5_C4, 200);
      // what-if 00:39 rods use the same xenon field; in both cases a small uniform shift makes the state exactly critical
      solveC0(S, { P: 200, xeEq: false, guess: 0, set: (S, v) => { for (let k = 0; k < N; k++) S.xe[k] = Math.max(0, xenonRef[k] + v); } });
      S.ar.set = 200;
      S.dregCycle = 112;           // so that 01:23:39-43 falls near the historical cycle №135Д
      S.prizmaLast = '01:00';
    }
    S.lam = 1; S.events.push({ t: 0, kind: 'start' });
    return S;
  }

  function clockStr(S, t = S.t, sep = ':', lead = true) {
    let s = Math.floor(S.clock0 + t); s = ((s % 86400) + 86400) % 86400;
    const hh = Math.floor(s / 3600), mm = String(Math.floor(s % 3600 / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
    return `${lead ? String(hh).padStart(2, '0') : hh}${sep}${mm}${sep}${ss}`;
  }

  const fig5 = () => targetPhi(FIG_II5_C4);
  return { P, fig5, scenario, step, scram, ev, signal, ormPrizma, ormQuick, thermal, flowM3, sevenPoint, kz, channelPower, clockStr, rodNodes, eigen, buildKinf, flushDreg };
})();
if (typeof module !== 'undefined') module.exports = SIM;
