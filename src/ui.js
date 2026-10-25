(() => {
  const $ = id => document.getElementById(id);
  const P = SIM.P, H = P.H;
  let S, speed = 1, last = 0, evIdx = 0, trend = [], ended = false, endShown = false;
  let sel = { kind: 'group', key: 'RR0' }, multi = false, drag = null, scramShown = false, az5Armed = 0, noticeT = 0, hpT = 0, fuelT = 0, fuelPow = null;
  let prizmaReq = null, lastClockHour = null, lastCycle = null;
  const marks = {}, firsts = {};

  // ---------- helpers ----------
  const fmt = (v, d = 0) => (v === null || v === undefined || !isFinite(v)) ? '—' : v.toFixed(d);
  const ru = (v, d) => fmt(v, d).replace('.', ',');
  const keep = s => esc(s).replace(/\S*[-–]\S*/g, w => `<span class="nb">${w}</span>`);   // never break a line inside '44-37:1,4' or a time span
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const clk = (t, sep = ':') => SIM.clockStr(S, t, sep);
  const ttyClock = t => SIM.clockStr(S, t, '.', false);
  const inletT = () => S.hy ? P.TSAT - S.hy.dTsub : P.TSAT;
  // ---------- VFD indicator tubes (7 segments + decimal point per glass envelope) ----------
  const SEGS = (() => {
    const h = (x1, x2, y) => `M${x1} ${y}l2.2 -2.2H${x2 - 2.2}l2.2 2.2l-2.2 2.2H${x1 + 2.2}z`;
    const v = (x, y1, y2) => `M${x} ${y1}l2.2 2.2V${y2 - 2.2}l-2.2 2.2l-2.2 -2.2V${y1 + 2.2}z`;
    return [h(9, 27, 7), v(27.6, 7.6, 30), v(27.6, 30, 52.4), h(9, 27, 53), v(8.4, 30, 52.4), v(8.4, 7.6, 30), h(9, 27, 30)];
  })();
  const GLYPH = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
    '-': 'g', '—': 'g', '‾': 'a', ' ': '', '_': 'd', 'E': 'adefg', 'Е': 'adefg', 'r': 'eg', 'P': 'abefg', 'Р': 'abefg', 'C': 'adef', 'С': 'adef', 'H': 'bcefg', 'Н': 'bcefg',
    'L': 'def', 'П': 'abcef', 'Г': 'aef', 'U': 'bcdef', 'b': 'cdefg', 'Ь': 'cdefg', 'd': 'bcdeg', 'A': 'abcefg', 'А': 'abcefg', 'n': 'ceg', 't': 'defg', 'o': 'cdeg', 'О': 'abcdef' };
  const tubeSvg = () => `<svg viewBox="0 0 36 60" aria-hidden="true"><g class="gh">${SEGS.map(d => `<path d="${d}"/>`).join('')}<circle cx="32.5" cy="54" r="2"/></g><g class="lt">${SEGS.map(d => `<path d="${d}"/>`).join('')}<circle cx="32.5" cy="54" r="2"/></g></svg>`;
  function vfd(el, n) {            // returns {set(text, state)}; text is right-aligned, '.' or ',' or ':' lights the previous tube's point
    el.innerHTML = '<span class="vfdscrew l"></span>' + Array.from({ length: n }, () => `<span class="tube">${tubeSvg()}</span>`).join('') + '<span class="vfdscrew r"></span>';
    const tubes = [...el.querySelectorAll('.tube .lt')].map(g => [...g.children]);
    let last = null, lastState = '';
    return {
      set(text, state = '') {
        text = String(text);
        if (state !== lastState) { el.classList.remove('warn', 'alarm', 'dark', 'flash'); if (state) el.classList.add(...state.split(' ')); lastState = state; }
        el.setAttribute('aria-label', text.trim() || 'blank');
        if (text === last) return; last = text;
        const cells = [];
        for (const ch of text) { if ((ch === '.' || ch === ',' || ch === ':') && cells.length) cells[cells.length - 1].dp = true; else cells.push({ ch, dp: false }); }
        const out = cells.length > n ? Array.from({ length: n }, () => ({ ch: '-', dp: false })) : Array(n - cells.length).fill({ ch: ' ', dp: false }).concat(cells);
        out.forEach((c, i) => { const g = GLYPH[c.ch] ?? GLYPH[String(c.ch).toUpperCase()] ?? ''; tubes[i].forEach((p, k) => p.classList.toggle('on', k < 7 ? g.includes('abcdefg'[k]) : c.dp)); });
      },
    };
  }

  // 14-segment alphanumeric tubes (the code row of each display set shows letters)
  const S14 = { a: [7, 5, 29, 5], a2: [18, 5, 29, 5], b: [31, 7, 31, 28], c: [31, 32, 31, 53], d: [7, 55, 29, 55], e: [5, 32, 5, 53], f: [5, 7, 5, 28], g1: [7, 30, 16.5, 30], g2: [19.5, 30, 29, 30],
    h: [8, 8, 16, 27], i: [18, 7, 18, 28], j: [28, 8, 20, 27], k: [8, 52, 16, 33], l: [18, 32, 18, 53], m: [28, 52, 20, 33], n: [17, 7, 6, 53] };
  const BASE14 = ['a', 'b', 'c', 'd', 'e', 'f', 'g1', 'g2', 'h', 'i', 'j', 'k', 'l', 'm'];
  const G14 = { '0': 'a b c d e f', '1': 'b c', '2': 'a b g1 g2 e d', '3': 'a b c d g2 g1', '4': 'f g1 g2 b c', '5': 'a f g1 g2 c d', '6': 'a f e d c g1 g2', '7': 'a b c', '8': 'a b c d e f g1 g2', '9': 'a b c d f g1 g2',
    'Т': 'a i l', 'М': 'f e h j b c', 'Д': 'n a2 b c d', 'Н': 'f e b c g1 g2', 'П': 'a f e b c', 'А': 'a b c e f g1 g2', 'Я': 'a b c f g1 g2 k', 'К': 'f e g1 j m',
    'X': 'h j k m', 'K': 'f e g1 j m', 'N': 'f e h m b c', 'S': 'a f g1 g2 c d', 'H': 'f e b c g1 g2', 'P': 'a b f e g1 g2', 'G': 'a f e d c g2', 't': 'f e d g1', 'E': 'a f e d g1', '-': 'g1 g2', ' ': '' };
  const ln = ([x1, y1, x2, y2], k) => `<line data-s="${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  function vfd14(el, n) {
    el.innerHTML = '<span class="vfdscrew l"></span>' + Array.from({ length: n }, () => `<span class="tube t14"><svg viewBox="0 0 36 60" aria-hidden="true"><g class="gh">${BASE14.map(k => ln(S14[k], k)).join('')}</g><g class="lt">${Object.keys(S14).map(k => ln(S14[k], k)).join('')}</g></svg></span>`).join('') + '<span class="vfdscrew r"></span>';
    const tubes = [...el.querySelectorAll('.lt')].map(g => [...g.children]);
    let last = null;
    return { set(text) { text = String(text); el.setAttribute('aria-label', text.trim() || 'blank'); if (text === last) return; last = text;
      const cells = [...text.padEnd(n).slice(0, n)];
      cells.forEach((c, i) => { const g = (G14[c] ?? '').split(' '); tubes[i].forEach(p => p.classList.toggle('on', g.includes(p.dataset.s))); }); } };
  }

  function notice(msg, ms = 7000) { $('notice').textContent = msg; noticeT = performance.now() + ms; }
  function flash(dev) { marks[dev] = performance.now() + 400; }

  // ---------- paper ----------
  const papers = { tty: $('p-tty'), dreg: $('p-dreg'), lpt: $('p-lpt'), arc: $('p-arc') };
  const sheet = k => papers[k].querySelector('.sheet');
  let activeTab = 'tty';
  function stickBottom(k, fn) {
    const el = papers[k], near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    fn();
    if (near || k !== activeTab) el.scrollTop = el.scrollHeight;
    if (k !== activeTab) { const tab = $('tab-' + k); if (!tab.querySelector('.dot')) tab.insertAdjacentHTML('beforeend', '<span class="dot" aria-label="new output"></span>'); }
  }
  function block(k, lines, cls = '') {
    stickBottom(k, () => {
      const sh = sheet(k), ph = sh.querySelector('.empty'); if (ph) ph.remove();
      const b = document.createElement('div'); b.className = 'pblock ' + cls;
      b.innerHTML = lines.map(l => {
        if (l.cut) return '<div class="cut"></div>';
        if (l.html) return l.html;
        return `<div class="pl">${l.t ? `<span class="t">${esc(l.t)}</span>` : ''}${keep(l.ru)}${l.cyc ? `<span class="cyc">${esc(l.cyc)}</span>` : ''}</div>` + (l.en ? `<div class="gl">${esc(l.en)}</div>` : '');
      }).join('');
      sh.appendChild(b);
    });
  }
  document.querySelectorAll('.tab').forEach(tb => tb.addEventListener('click', () => {
    activeTab = tb.dataset.tab;
    document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', String(x === tb)));
    Object.entries(papers).forEach(([k, el]) => el.hidden = k !== activeTab);
    const d = tb.querySelector('.dot'); if (d) d.remove();
    if (activeTab !== 'arc') papers[activeTab].scrollTop = papers[activeTab].scrollHeight;
  }));
  $('enToggle').addEventListener('change', e => Object.values(papers).forEach(p => p.classList.toggle('noen', !e.target.checked)));

  // ---------- teletype: 7 characters per second, one 64-column line per message (Karpan p.360) ----------
  const TTY_CPS = 7, TTY_COLS = 64;
  let tty = [], ttyOff = null;
  // Protection messages go ahead of setpoint messages that have not started printing yet, so the 1986 sequence keeps its timing.
  function ttyQueue(t, text, en, cls, sp = false) {
    const el = document.createElement('div'); el.className = 'pblock ' + (cls || '');
    el.innerHTML = `<div class="pl"></div>${en ? `<div class="gl" hidden>${esc(en)}</div>` : ''}`;
    const item = { t, start: t, text, el, shown: -1, done: false, sp };
    let at = tty.length;
    if (!sp) while (at > 0 && tty[at - 1].sp && tty[at - 1].start > S.t) at--;
    tty.splice(at, 0, item);
    for (let i = Math.max(0, at); i < tty.length; i++) {
      const prev = tty[i - 1];
      if (tty[i].start <= S.t && i !== at) continue;          // already printing: leave it alone
      tty[i].start = Math.max(tty[i].t, prev ? prev.start + TTY_COLS / TTY_CPS : tty[i].t);
    }
  }
  function ttyRender() {
    const now = ttyOff !== null ? Math.min(S.t, ttyOff) : S.t;
    for (const l of tty) {
      if (l.done) continue;
      if (now < l.start) break;
      if (!l.el.isConnected) stickBottom('tty', () => sheet('tty').appendChild(l.el));
      const n = Math.min(l.text.length, Math.floor((now - l.start) * TTY_CPS));
      if (n !== l.shown) {
        l.shown = n;
        const pl = l.el.querySelector('.pl');
        pl.innerHTML = esc(l.text.slice(0, n)) + (n < l.text.length && ttyOff === null ? '<span class="cursor"></span>' : '');
        if (n > 0) flash('tty');
      }
      if (n >= l.text.length) { l.done = true; const g = l.el.querySelector('.gl'); if (g) g.hidden = false; }
      else if (ttyOff !== null && S.t >= ttyOff) {
        l.done = true;
        l.el.insertAdjacentHTML('beforeend', '<div class="cutoff">Power to the teletypes fails here; the line is never finished.</div>');
      }
    }
  }

  // ---------- archive (static, from the record) ----------
  function buildArchive() {
    const A = sheet('arc'); A.innerHTML = '';
    A.insertAdjacentHTML('beforeend', `<div class="srcnote">What survives of SKALA's own record for unit 4 on 26 April 1986. Teletype lines follow the tape photo in Karpan (p.359). DREG wording follows Karpan as quoted in the composite timeline, the Sturm–Plaskov transcript (<a href="https://archive.org/details/dreg-protocol-last-40-seconds-of-chernobyl" target="_blank" rel="noopener">CC BY-NC 4.0</a>) and INSAG-7. Cycle numbers are given only where a source states them.</div>`);
    block('arc', [{ ru: 'ДРЕГ НЕ РАБОТАЛ: 00.39.32–00.43.35' }, { ru: '                 00.52.35–00.59.54' }, { ru: '                 01.12.10–01.18.49', en: 'DREG gaps: tape preparation, a SKALA restart, and the tape reload for the run-down test (INSAG-7; Karpan p.334).' }], 'sys');
    const D = [
      ['01:19:39', null, [['1 ПК-ВВЕРХ', 'Overcompensation group 1 up: AR rods near their upper limits (until 01:23:30).']]],
      ['01:23:04', null, [['СТОПОРНЫЕ КЛАПАНЫ ЗАКРЫТЫ', 'Stop valves of turbine 8 closed: the run-down test begins. The Sturm transcript logs it at 01:23:08 as "…КРАНЫ ЗАКРЫТЫ".']]],
      ['01:23:11', null, [['СНЯТИЕ СИГНАЛА ПО НЕИСПРАВНОСТИ АР', 'AR fault signal cleared.']]],
      ['01:23:23', null, [['СНИЖ. ДАВЛ. ВОДЫ ВПРЫС. В КНД 1', 'Injection water pressure low, low-pressure condenser 1.']]],
      ['01:23:30', null, [['=0 1 ПК-ВВЕРХ', 'Overcompensation signal clears after 3 min 33 s: the AR rods are now moving down hard.']]],
      ['01:23:40', null, [['АЗ-5 СУЗ', 'AZ-5 to the control and protection system.'], ['СТЕРЖНИ СОШЛИ С ВК', 'Rods leave their upper limit switches.'], ['НЕГОТОВНОСТЬ АЗ', 'Emergency protection not ready.'], ['=0 НЕИСПРАВНОСТЬ ИЗМЕРИТЕЛ. ЧАСТИ 2АР', 'AR-2 measuring fault clears.'], ['РЕГУЛЯТОР П2-1332 ПОДКЛЮЧЕН ПРИ АЗ', 'Regulator P2-1332 engaged on AZ.'], ['РЕГУЛЯТОР П1-1332 ПОДКЛЮЧЕН ПРИ АЗ', 'Regulator P1-1332 engaged on AZ.'], ['РЕГУЛЯТОР П2-1332 В РЕЖИМЕ АВТ.', 'Regulator P2-1332 in automatic.'], ['ОТКЛЮЧЕНИЕ АР ПО НЕИСПРАВНОСТИ', 'Automatic regulator disconnected.'], ['РАЗГРУЗКА ТГ ПРИ АЗ-5', 'Turbine-generator unloading on AZ-5.']]],
      ['01:23:43', '№135Д', [['АЗСР (СНИЖ. ПЕРИОДА В ОСНОВН. ДИАПАЗОНЕ)', 'Period protection, main range. Cycle 135Д covers seconds 39–43.'], ['АЗМ (ПРЕВ. МОЩН. В ОСНОВН. ДИАПАЗОНЕ)', 'Overpower protection, setting about 530 MW.'], ['ПРЕВЫШЕНИЕ N АВАРИЙНЫЙ В 2УЗМ-1…4, 1УЗМ-1…4', 'Emergency power excess on all eight power-protection channels.']]],
      ['01:23:44', null, [['НЕИСПРАВН. 1УЗМ-1…4, 2УЗМ-1…4', 'Power-protection channel faults.']]],
      ['01:23:47', '№137Д', [['НЕИСПРАВН. ИЗМЕРИТ. ЧАСТИ АР-1, АР-2', 'AR measuring channel faults.'], ['АВАРИЙНОЕ ОТКЛОНЕНИЕ УРОВНЯ В БС', 'Emergency deviation of drum separator level.'], ['ПРЕВЫШЕНИЕ ДАВЛЕНИЯ В БС ПРАВ. / ЛЕВ.', 'Drum separator pressure high: 88.2 right, 75.2 left kgf/cm² in cycle 137Д (45–47 s). Main safety valves open at 75.']]],
      ['01:23:48', null, [['=0 РАЗГРУЗКА ТГ ПРИ АЗ-5', 'Turbine unloading signal clears.'], ['СРАБАТЫВАНИЕ БРУ-К1', 'Fast steam dump to condenser 1 opens (setpoint 71.5).']]],
      ['01:23:49', '№138Д', [['РОСТ ДАВЛЕНИЯ В РП   К06L005 =1', 'Pressure rise in the reactor space to 0.15 kgf/cm²: fuel channels have ruptured. The only raw DREG signal code in the sources.'], ['НЕТ НАПРЯЖЕНИЯ 48В 1СШ', 'No 48 V on bus 1SSh: rod clutch power lost.'], ['НЕИСПРАВН. ИСПОЛНИТ. ЧАСТИ 1АР, 2АР', 'AR actuator faults. This is the last DREG cycle SKALA recorded.']]],
    ];
    for (const [t, cyc, ls] of D) block('arc', ls.map((l, i) => ({ t: i === 0 ? t + '  ' : '          ', ru: l[0], cyc: i === 0 && cyc ? '   ' + cyc : '', en: l[1] })));
    block('arc', [{ html: '<div class="pl" style="margin-top:6px"><span class="t">РТА-80</span></div>' },
      { ru: '1.23.39 АВАР ЗАЩИТА 5', en: 'First teletype message. Both teletypes printed it.' },
      { ru: '1.23.41 АВАР З', en: 'Second message, cut off after 15 characters when the teletypes lost power at about 01:23:49 (79 characters at 7 per second, Karpan p.360).' },
      { ru: '1.36 ДАТА 26.4.86 ПАРН…', en: 'SKALA restarted in paired mode on emergency power (partly legible on the tape photo).' }], 'alarm');
    A.insertAdjacentHTML('beforeend', `<div class="srcnote">The SIUR's log at 01:24 records heavy shocks and rods stopped short of their lower limit switches. DREG was off from 01:23:48 to 01:40:35 for lack of power (Karpan p.338).</div>`);
    papers.arc.scrollTop = 0;
  }

  // ---------- request codes ----------
  // Code grammar from the Chornobyl Family reconstruction, built with former Chernobyl NPP staff:
  //   [system: Cyrillic letter] [subdivision: 0-7, 0 = whole, 1/2 = left/right] [quantity: Latin letter] [4 octal digits: component, or channel coordinates]
  // src: 'doc' = code shown in that video; 'inf' = follows a rule stated there; 'inv' = this simulator's own, in the same grammar.
  const K1 = ['М', 'Т', 'Д', 'Н', 'П', 'А', 'Я', 'К'];        // column 1, top to bottom as on the console
  const K3 = ['X', 'K', 'N', 'S', 'H', 'P', 'G', 't'];        // column 3
  const OCT = ['7', '6', '5', '4', '3', '2', '1', '0'];
  const LEFTCOLS = [K1, OCT, K3, OCT, OCT, OCT, OCT];
  const oct2 = n => n.toString(8).padStart(2, '0');
  const chOf = (x, y) => oct2(32 - y) + oct2(31 + x);           // plant grid coordinates are octal: row then column, as in "50-27"
  let fuelIdx = null, fuelFor = null;
  const fuelAt = ch => { if (fuelFor !== S) { fuelIdx = new Map(S.fuel.map((f, i) => [chOf(f.x, f.y), i])); fuelFor = S; } return fuelIdx.get(ch); };
  const online = () => S.name === 'nominal' ? [7, 8] : [8];      // TG-7 was taken off the grid at 13:05 on 25 April
  function elecMW(tg) {                                          // rough estimate: the model has no turbine
    if (S.destroyed || S.powerLost) return 0;
    const on = online();
    if (tg && !on.includes(tg)) return 0;
    if (S.testStarted) {                                          // stop valves shut: the coasting TG-8 only carries its four pumps
      if (tg === 7) return 0;
      const c = S.pumps.filter(p => p.coast && !p.tripped);
      return c.reduce((a, p) => a + 5.5 * p.w ** 3, 0);
    }
    const total = SIM.thermal(S) * 0.31;
    return tg ? total / on.length : total;
  }
  const loopFlow = side => S.pumps.filter(p => p.side === side).reduce((a, p) => a + p.w * S.drk * SIM.P.PUMP_M3H, 0);
  let ormCycle = { v: null, at: null };                          // SKALA's ORM is the last 5-minute calculation, not a live value

  const CODES = [
    { c: 'П0N0000', src: 'doc', ru: 'Тепловая мощность реактора', en: 'Reactor thermal power', u: 'МВТ', f: () => fmt(SIM.thermal(S)) },
    { c: 'Т0N7100', src: 'doc', ru: 'Электрическая мощность блока', en: 'Electrical output of the whole unit (rough estimate: the model has no turbine)', u: 'МВТ', f: () => fmt(elecMW()) },
    { c: 'К0S0000', src: 'doc', ru: 'ОЗР', en: "Operating reactivity margin, from SKALA's last 5-minute calculation", u: 'СТ.РР', f: () => ru(ormCycle.v, 1) },
    { c: 'К5N0000', src: 'doc', ru: 'Максимальная мощность канала', en: 'Highest fuel-channel power in the core (illustrative radial estimate)', u: 'МВТ', f: () => ru(SIM.thermal(S) / 1661 * Math.max(...SIM.channelPower(S)), 2) },
    { c: 'К0S', pat: 'ch', src: 'doc', ex: 'К0S5027', ru: 'Положение стержня СУЗ', en: 'Rod depth in m below its upper limit switch, by channel (УСП: height pushed up from below)', u: 'М', f: ch => { const r = S.rods.find(r => r.ch.replace('-', '') === ch); return r ? ru(r.d, 2) : null; } },
    { c: 'К0G', pat: 'ch', src: 'doc', ex: 'К0G4036', ru: 'Расход через канал', en: 'Coolant flow through one fuel channel. The model has no channel-by-channel flow, so this is the core average.', u: 'М³/Ч', f: ch => fuelAt(ch) === undefined ? null : fmt(SIM.flowM3(S) / 1661) },
    { c: 'К0G0000', src: 'inf', count: true, ru: 'Расход через реактор', en: 'Total coolant flow. SKALA first shows how many channels it counted, then the sum.', u: 'М³/Ч', f: () => fmt(SIM.flowM3(S)) },
    { c: 'К1G0000', src: 'inf', count: true, ru: 'Расход, левая половина', en: 'Coolant flow, left loop (pumps 11–14)', u: 'М³/Ч', f: () => fmt(loopFlow('Л')) },
    { c: 'К2G0000', src: 'inf', count: true, ru: 'Расход, правая половина', en: 'Coolant flow, right loop (pumps 21–24)', u: 'М³/Ч', f: () => fmt(loopFlow('П')) },
    { c: 'К0N', pat: 'ch', src: 'inf', ex: 'К0N4036', ru: 'Мощность канала', en: 'Power of one fuel channel (illustrative radial estimate)', u: 'МВТ', f: ch => { const i = fuelAt(ch); return i === undefined ? null : ru(SIM.thermal(S) / 1661 * SIM.channelPower(S)[i], 2); } },
    { c: 'Я0N0000', src: 'inv', ru: 'Нейтронная мощность', en: 'Neutron power, % of nominal', u: '%', f: () => fmt(S.n * 100, 1) },
    { c: 'Я0K0000', src: 'inv', ru: 'Kz по СФКРЭ', en: 'Axial peaking factor from the height detectors', u: '', f: () => ru(SIM.kz(S), 2) },
    { c: 'П0P0000', src: 'inv', ru: 'Давление в БС', en: 'Steam-drum pressure. П1… and П2… give the left and right drums; the model has one pressure for both.', u: 'КГС/СМ²', f: () => ru(S.p, 1) },
    { c: 'П1P0000', src: 'inv', hide: true, ru: 'Давление в БС, левая', en: 'Left steam-drum pressure (same as the right in this model)', u: 'КГС/СМ²', f: () => ru(S.p, 1) },
    { c: 'П2P0000', src: 'inv', hide: true, ru: 'Давление в БС, правая', en: 'Right steam-drum pressure (same as the left in this model)', u: 'КГС/СМ²', f: () => ru(S.p, 1) },
    { c: 'П0H0000', src: 'inv', ru: 'Уровень в БС', en: 'Steam-drum water level against normal', u: 'ММ', f: () => fmt(S.L) },
    { c: 'П0G0000', src: 'inv', ru: 'Расход питательной воды', en: 'Feedwater flow', u: 'Т/Ч', f: () => fmt(S.Gfw * 3.6) },
    { c: 'Н0t0000', src: 'inv', ru: 'Температура на входе в реактор', en: 'Coolant temperature entering the core', u: '°C', f: () => ru(inletT(), 1) },
    { c: 'Н0G00', pat: 'pump', src: 'inv', ex: 'Н0G0013', ru: 'Расход ГЦН', en: 'Flow of one main circulation pump: the last two digits are its number, 11–14 or 21–24', u: 'М³/Ч', f: n => { const p = S.pumps.find(p => String(p.id) === n); return p ? fmt(p.w * S.drk * SIM.P.PUMP_M3H) : null; } },
    { c: 'Т1N7100', src: 'inv', ru: 'Электрическая мощность ТГ-7', en: 'Electrical output of turbine-generator 7 (rough estimate)', u: 'МВТ', f: () => fmt(elecMW(7)) },
    { c: 'Т2N7100', src: 'inv', ru: 'Электрическая мощность ТГ-8', en: 'Electrical output of turbine-generator 8 (rough estimate)', u: 'МВТ', f: () => fmt(elecMW(8)) },
    { c: 'Я0G4211', src: 'doc', nm: true, ru: 'Расход азотно-гелиевой смеси', en: 'Nitrogen-helium gas flow into the reactor space. A real code from the video; the gas system is not modelled here.' },
    { c: 'Я0P4211', src: 'doc', nm: true, ru: 'Давление смеси на входе', en: 'Gas mixture pressure entering the reactor space. Not modelled here.' },
    { c: 'Я0P4311', src: 'doc', nm: true, ru: 'Давление смеси на выходе', en: 'Gas mixture pressure leaving the reactor space. Not modelled here.' },
  ];
  // SKALA's own setpoint table (what the middle row measures against). Only warnings and limits SKALA knew about;
  // the protections themselves (АЗМ, АЗСР) are hardwired in the control and protection system.
  const SP_DEFAULT = {
    'П0N0000': { ПП: 3264, АП: 3520 },         // video: warning 2 % above nominal, emergency at 3520 MW
    'К5N0000': { ПП: 2.93, АП: 3.0 },          // video
    'К0S0000': { ПС: 26, АС: 15 },             // 1986 regulations. The video's 43 and 30 rods are the post-accident limits.
    'П0P0000': { ПП: 70, АП: 75 }, 'П1P0000': { ПП: 70, АП: 75 }, 'П2P0000': { ПП: 70, АП: 75 },
    'П0H0000': { ПП: 100, ПС: -100, АС: -600 },
  };
  let SP = {};
  const KINDS = { ПРМ: 'the value itself', ПП: 'warning setpoint, rising', АП: 'emergency setpoint, rising', ПС: 'warning setpoint, falling', АС: 'emergency setpoint, falling' };
  function lookup(code) {
    const exact = CODES.find(k => !k.pat && k.c === code);
    if (exact) return { k: exact, arg: null };
    for (const k of CODES.filter(k => k.pat)) if (code.startsWith(k.c)) return { k, arg: code.slice(k.c.length) };
    return null;
  }
  const SRC_TAG = { doc: 'shown in the video', inf: 'follows the video', inv: 'invented' };
  function buildDir() {
    const row = k => `<li><button data-code="${k.ex || k.c}"><code>${k.pat ? k.c + (k.pat === 'ch' ? '<i>ррсс</i>' : '<i>NN</i>') : k.c}</code><span>${esc(k.ru)}<em>${esc(k.en)}</em></span></button></li>`;
    const grp = (title, list) => `<div class="dirhead">${title}</div><ul class="dir">${list.map(row).join('')}</ul>`;
    const vis = CODES.filter(k => !k.hide);
    $('dir').innerHTML = grp('Из видео Chornobyl Family · shown in the video', vis.filter(k => k.src === 'doc'))
      + grp('По правилам из видео · follows its rules', vis.filter(k => k.src === 'inf'))
      + grp('Придуманы для симулятора · invented, same grammar', vis.filter(k => k.src === 'inv'))
      + `<div class="dirhead">Подпрограммы · subprograms (Клавиатура 2)</div><ul class="dir">${SUBPROGS.map(s => `<li><button data-sub="${s.n}"><code>${s.p}·${s.n}</code><span>${esc(s.ru)}<em>${esc(s.en)}</em></span></button></li>`).join('')}</ul>`;
    $('dir').addEventListener('click', e => {
      const b = e.target.closest('button[data-code]');
      if (b) { setLeft(b.dataset.code); vu.kind = 'ПРМ'; vu.mode = 'ИЗМ'; zamer(0); return; }
      const s = e.target.closest('button[data-sub]');
      if (s) { const sp = SUBPROGS.find(x => x.n === s.dataset.sub); vu.left = ['М', null, null, null, null, null, null]; rk.prog = sp.p; rk.sign = 1; rk.d = sp.n.split(''); rk.e = 0; start(); }
    });
  }

  // ---------- request device ----------
  // Two keyboards and two display sets, after the Chornobyl Family reconstruction. Left: one key per column builds the code;
  // the row below picks what to return (ПРМ = the value, or one of four setpoints); ИЗМ measures, ЗАП writes a setpoint;
  // ЗАМЕР 1 / 2 sends the answer to display set 1 or 2. Right: a signed number (black digits, red decimal exponent) and subprograms.
  const vu = { left: Array(7).fill(null), kind: 'ПРМ', mode: 'ИЗМ', msg: '', sets: [null, null], blank: [false, false] };
  const rk = { sign: 1, d: [null, null, null, null], e: null, prog: null };
  const ds = [];                                                  // display-set widgets
  const codeStr = () => vu.left.map(c => c ?? ' ').join('');
  const rkValue = () => rk.d.includes(null) ? null : rk.sign * parseInt(rk.d.join(''), 10) / 10 ** (rk.e || 0);
  const rkStr = () => (rk.sign < 0 ? '−' : '+') + rk.d.map(d => d ?? '·').join('') + (rk.e ? ` × 10^−${rk.e}` : '');
  function setLeft(code) { vu.left = [...code].slice(0, 7); while (vu.left.length < 7) vu.left.push(null); }
  function zamer(i) {
    if (ended) return;
    if (S.powerLost) { vu.msg = 'SKALA has no power.'; return renderVU(); }
    if (S.restarting) { vu.msg = 'SKALA is restarting from punched tape and does not answer requests.'; return renderVU(); }
    if (vu.left.includes(null)) { vu.msg = vu.left[0] === 'М' && vu.left.slice(1).every(c => c === null) ? 'М on its own starts a program: choose it on Клавиатура 2 and press ЗАПУСК.' : 'Press one key in every column of the left keyboard first.'; return renderVU(); }
    const code = codeStr(), hit = lookup(code);
    const set = { code, kind: vu.kind, hit, readyAt: S.t + 1.5, err: null, fixed: null };
    if (vu.mode === 'ЗАП') {
      if (vu.kind === 'ПРМ') { vu.msg = 'ЗАП writes a setpoint: choose ПП, АП, ПС or АС first.'; return renderVU(); }
      const v = rkValue();
      if (v === null) { $('kb2').open = true; vu.msg = 'Enter the setpoint on Клавиатура 2: one key in each of the four black columns, plus a red exponent key if it has decimals.'; return renderVU(); }
      if (!hit || hit.k.nm) { set.err = '301'; vu.msg = `No code ${code} in SKALA's table.`; }
      else { (SP[code] = SP[code] || {})[vu.kind] = v; set.fixed = v; vu.msg = `Setpoint ${vu.kind} for ${code} written: ${ru(v, rk.e || 0)}. Setpoints were entered by SKALA's programmers from the engineers' setpoint charts.`; }
      vu.sets[i] = set; return renderVU();
    }
    if (!hit) { set.err = '301'; vu.msg = `Error 301: there is no code ${code}. The list below shows what this simulator knows.`; }
    else if (hit.k.nm) { set.err = 'nm'; vu.msg = `${hit.k.ru} · ${hit.k.en}`; }
    else if (hit.k.pat && hit.k.f(hit.arg) === null) { set.err = '301'; vu.msg = `Error 301: ${code} names no ${hit.k.pat === 'pump' ? 'pump' : 'suitable channel'}. ${hit.k.pat === 'ch' ? 'The last four digits are the channel’s octal coordinates, row then column, as shown when you hover a dial.' : ''}`; }
    else if (vu.kind !== 'ПРМ' && !(SP[code] && SP[code][vu.kind] !== undefined)) { set.err = '303'; vu.msg = `Error 303: ${code} has no ${KINDS[vu.kind]}.`; }
    else vu.msg = `${hit.k.ru} · ${hit.k.en}${vu.kind !== 'ПРМ' ? ` · ${vu.kind}: ${KINDS[vu.kind]}` : ''}`;
    vu.sets[i] = set; renderVU();
  }
  function devStr(code, v) {                                       // deviation from the nearest setpoint, in %
    const sp = SP[code]; if (!sp || v === null || !isFinite(v)) return '000000';
    let best = null; for (const s of Object.values(sp)) if (best === null || Math.abs(v - s) < Math.abs(v - best)) best = s;
    if (!best) return '000000';
    const p = Math.abs((v - best) / best * 100), sym = v < best ? '_' : '‾';
    return sym + (p < 10 ? fmt(p, 2) : p < 100 ? fmt(p, 1) : p < 10000 ? fmt(p, 0) : '9999');
  }
  function renderSet(i) {
    const w = ds[i], s = vu.sets[i];
    w.el.classList.toggle('blank', vu.blank[i] || !!S.powerLost);
    if (!s) { w.val.set(''); w.dev.set(''); w.code.set(''); w.unit.textContent = ''; return; }
    w.code.set(s.code);
    if (S.powerLost) { w.val.set(''); w.dev.set(''); w.unit.textContent = ''; return; }
    if (S.t < s.readyAt) { w.val.set(''); w.dev.set(''); w.unit.textContent = ''; return; }
    if (s.err === 'nm') { w.val.set('------'); w.dev.set('000000'); w.unit.textContent = ''; return; }
    if (s.err) { w.val.set(''); w.dev.set(s.err); w.unit.textContent = ''; return; }
    const k = s.hit.k;
    w.unit.textContent = k.u;
    if (s.fixed !== null) { w.val.set(ru(s.fixed, rk.e || 0)); w.dev.set('000000'); return; }
    if (s.kind !== 'ПРМ') { const v = SP[s.code][s.kind]; w.val.set(String(v).replace('.', ',')); w.dev.set('000000'); return; }
    if (k.count && S.t < s.readyAt + 1) { w.val.set('1661'); w.dev.set('000000'); w.unit.textContent = 'КАН.'; return; }
    const txt = k.f(s.hit.arg);
    w.val.set(txt ?? '');
    w.dev.set(devStr(s.code, txt === null ? null : parseFloat(String(txt).replace(',', '.'))));
  }
  function renderVU() {
    renderSet(0); renderSet(1);
    $('vuWhat').textContent = vu.msg;
    document.querySelectorAll('#keysL .key').forEach(k => k.classList.toggle('on', vu.left[+k.dataset.col] === k.dataset.v));
    document.querySelectorAll('#kinds .key').forEach(k => k.classList.toggle('on', k.dataset.kind === vu.kind));
    document.querySelectorAll('#modes [data-mode]').forEach(k => k.classList.toggle('on', k.dataset.mode === vu.mode));
    document.querySelectorAll('#keysR .key[data-rc]').forEach(k => k.classList.toggle('on', rk.d[+k.dataset.rc] === k.dataset.v));
    document.querySelectorAll('#keysR .key[data-exp]').forEach(k => k.classList.toggle('on', rk.e === +k.dataset.exp));
    document.querySelectorAll('#keysR .key[data-sign]').forEach(k => k.classList.toggle('on', +k.dataset.sign === rk.sign));
    document.querySelectorAll('#progs .pk').forEach(k => k.classList.toggle('on', rk.prog === +k.dataset.p));
    $('rkWhat').textContent = `Набор · number: ${rkStr()}${rk.prog ? ` · программа ${rk.prog}` : ''}`;
    $('vu').classList.toggle('poweroff', !!S.powerLost);
  }

  // SKALA setpoint monitoring: a teletype line when a measured parameter crosses one of its setpoints, and when it clears.
  // The message layout follows the Chornobyl Family reconstruction (time, code, appeared or cleared, value, deviation);
  // the 1986 wording is not known. ORM and other PRIZMA results are left out: the shift did not know the ORM at 01:22:30.
  const WATCH = ['П0N0000', 'Я0N0000', 'П0P0000', 'П0H0000', 'П0G0000', 'Н0t0000', 'К0G0000', 'К1G0000', 'К2G0000'];
  const SPNAME = { ПП: 'warning setpoint, rising', АП: 'emergency setpoint, rising', ПС: 'warning setpoint, falling', АС: 'emergency setpoint, falling' };
  let spState = {};
  function spWatch(silent) {
    if (S.powerLost || S.restarting || ended) return;
    for (const code of WATCH) {
      const sp = SP[code]; if (!sp) continue;
      const k = CODES.find(x => x.c === code), txt = k.f(), v = parseFloat(String(txt).replace(',', '.'));
      if (!isFinite(v)) continue;
      let hit = null;
      if (sp.АП !== undefined && v >= sp.АП) hit = 'АП'; else if (sp.ПП !== undefined && v >= sp.ПП) hit = 'ПП';
      else if (sp.АС !== undefined && v <= sp.АС) hit = 'АС'; else if (sp.ПС !== undefined && v <= sp.ПС) hit = 'ПС';
      const st = spState[code] || (spState[code] = { kind: null, at: -1e9 });
      if (!hit && st.kind && sp[st.kind] !== undefined) {         // hysteresis: clear only once clearly back inside
        const s = sp[st.kind], m = Math.max(Math.abs(s) * 0.02, 1e-6);
        if (st.kind[1] === 'П' ? v > s - m : v < s + m) hit = st.kind;
      }
      if (hit === st.kind) continue;
      if (!silent && S.t - st.at >= 5) {
        const ref = hit || st.kind, s = sp[ref], dev = (v - s) / Math.abs(s) * 100;
        const devTxt = (dev >= 0 ? '+' : '−') + ru(Math.abs(dev), 1).replace('-', '') + '%';
        const line = hit ? `${ttyClock(S.t)} ${code} ${hit} ВОЗН ${txt} ${k.u} ${devTxt}` : `${ttyClock(S.t)} ${code} ${st.kind} СНЯТ ${txt} ${k.u}`;
        const en = hit ? `${k.en}: passed its ${SPNAME[hit]} (${String(s).replace('.', ',')} ${k.u}). SKALA setpoint message; the layout follows the Chornobyl Family reconstruction, the 1986 wording is not known.` : `${k.en}: back inside its ${SPNAME[st.kind]}.`;
        ttyQueue(S.t, line, en, hit && hit[0] === 'А' ? 'alarm' : '', true);
      }
      spState[code] = { kind: hit, at: S.t };
    }
  }

  // subprograms: run with М alone on the left keyboard, a program key and a four-digit number on the right, then ЗАПУСК.
  // Only 0301 under program 4 or 8 comes from the video; the rest are this simulator's own numbers.
  const SUBPROGS = [
    { p: 1, n: '0300', ru: 'Расчёт ПРИЗМА', en: 'PRIZMA printout, at the end of the current 5-minute cycle (invented number)', f: () => requestPrizma() },
    { p: 1, n: '0310', ru: 'Картограмма СУЗ', en: 'Rod depth cartogram to the drum printer (invented number)', f: () => printCartogram() },
    { p: 1, n: '0400', ru: 'Срез параметров в ДРЕГ', en: 'Parameter snapshot into DREG (invented number)', f: () => dregSnap() },
    { p: 4, n: '0301', ru: 'Поиск каналов со снижением расхода', en: 'Low-flow channel search on МТК display 1 (program 8: display 2). From the video; the МТК is not built here.', f: () => ['', '', 'The low-flow search lights matching channels on the МТК channel display, which this simulator does not have.'] },
  ];
  function start() {
    if (ended) return;
    if (S.powerLost) { vu.msg = 'SKALA has no power.'; return renderVU(); }
    if (vu.left[0] !== 'М' || vu.left.slice(1).some(c => c !== null)) { vu.msg = 'To start a program, press only М on the left keyboard (as in the video), then the program key and number on Клавиатура 2.'; return renderVU(); }
    if (!rk.prog) { vu.msg = 'Choose a program key (1–10) on Клавиатура 2.'; $('kb2').open = true; return renderVU(); }
    const n = rk.d.includes(null) ? null : rk.d.join('');
    if (n === null) { vu.msg = 'Enter the four-digit subprogram number on Клавиатура 2.'; $('kb2').open = true; return renderVU(); }
    const sp = SUBPROGS.find(s => s.n === n && (s.p === rk.prog || (s.n === '0301' && rk.prog === 8)));
    if (!sp) { vu.msg = `Program ${rk.prog}, subprogram ${n}: not simulated. See the subprogram list below.`; return renderVU(); }
    const r = sp.f(); vu.msg = `${sp.ru} · ${r && r[2] ? r[2] : sp.en}`; renderVU();
  }

  function buildKeys() {
    ds[0] = { el: $('dsA'), val: vfd($('vuA'), 8), dev: vfd($('devA'), 6), code: vfd14($('codeA'), 7), unit: $('unitA') };
    ds[1] = { el: $('dsB'), val: vfd($('vuB'), 8), dev: vfd($('devB'), 6), code: vfd14($('codeB'), 7), unit: $('unitB') };
    $('keysL').innerHTML = LEFTCOLS.map((col, i) => `<div class="col">${col.map(v => `<button class="key${i === 0 || i === 2 ? ' let' : ''}" data-col="${i}" data-v="${v}" aria-label="Column ${i + 1}: ${v}">${v}</button>`).join('')}</div>`).join('');
    $('keysL').addEventListener('click', e => { const b = e.target.closest('.key'); if (!b) return; const i = +b.dataset.col; vu.left[i] = vu.left[i] === b.dataset.v ? null : b.dataset.v; vu.msg = vu.left.includes(null) ? `Code so far: ${codeStr().replace(/ /g, '·')}` : `Code ${codeStr()}. Choose what to return, then ЗАМЕР 1 or 2.`; renderVU(); });
    $('kinds').addEventListener('click', e => { const b = e.target.closest('[data-kind]'); if (!b) return; vu.kind = b.dataset.kind; vu.msg = `${vu.kind}: ${KINDS[vu.kind]}.`; renderVU(); });
    $('modes').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; vu.mode = b.dataset.mode; if (vu.mode === 'ЗАП') $('kb2').open = true; vu.msg = vu.mode === 'ЗАП' ? 'ЗАП: write mode. Enter the number on Клавиатура 2 (opened below), choose the setpoint type, then flip ЗАМЕР.' : 'ИЗМ: measurement mode.'; renderVU(); });
    document.querySelectorAll('[data-zamer]').forEach(b => b.addEventListener('click', () => { b.setAttribute('aria-pressed', 'true'); setTimeout(() => b.setAttribute('aria-pressed', 'false'), 220); zamer(+b.dataset.zamer); }));
    document.querySelectorAll('[data-gash]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.gash; vu.blank[i] = !vu.blank[i]; b.setAttribute('aria-pressed', String(vu.blank[i])); renderVU(); }));
    // right keyboard: four decimal columns, sign, red exponent, program keys
    const dcol = i => `<div class="col">${['9', '8', '7', '6', '5', '4', '3', '2', '1', '0'].map(v => `<button class="key sm" data-rc="${i}" data-v="${v}">${v}</button>`).join('')}</div>`;
    $('keysR').innerHTML = `<div class="col sgn"><button class="key sm cream" data-sign="-1" aria-label="minus">−</button><button class="key sm cream" data-sign="1" aria-label="plus">+</button>
      <div class="expcap">10<sup>−n</sup></div>${[4, 3, 2, 1, 0].map(n => `<button class="key sm red" data-exp="${n}">${n}</button>`).join('')}</div>${[0, 1, 2, 3].map(dcol).join('')}`;
    $('progs').innerHTML = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(p => `<div class="prow"><span class="plamp"></span><button class="key sm pk" data-p="${p}">${p}</button></div>`).join('');
    $('keysR').addEventListener('click', e => {
      const b = e.target.closest('.key'); if (!b) return;
      if (b.dataset.sign) rk.sign = +b.dataset.sign;
      else if (b.dataset.exp !== undefined) rk.e = rk.e === +b.dataset.exp ? null : +b.dataset.exp;
      else { const i = +b.dataset.rc; rk.d[i] = rk.d[i] === b.dataset.v ? null : b.dataset.v; }
      renderVU();
    });
    $('progs').addEventListener('click', e => { const b = e.target.closest('.pk'); if (!b) return; rk.prog = rk.prog === +b.dataset.p ? null : +b.dataset.p; renderVU(); });
    $('btnStart').addEventListener('click', start);
    $('btnStop').addEventListener('click', () => { const q = !!prizmaReq; prizmaReq = null; rk.prog = null; vu.msg = q ? 'ПРЕРЫВ: the queued PRIZMA run was cancelled.' : 'ПРЕРЫВ: nothing was running.'; renderVU(); });
    // typing: letters and digits fill the left keyboard column by column (m t d n p a r k for column 1; x k n s h p g t for column 3)
    const C1 = { m: 'М', t: 'Т', d: 'Д', n: 'Н', h: 'Н', p: 'П', a: 'А', r: 'Я', y: 'Я', k: 'К' };
    for (const c of K1) C1[c.toLowerCase()] = c;
    document.addEventListener('keydown', e => {
      if (e.target.closest('input,select,textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
      const inKb = e.target.closest && e.target.closest('#keysL, #kinds, #modes, #keysR, #progs, #dir');
      if (e.key === 'Enter' && inKb) { zamer(e.shiftKey ? 1 : 0); e.preventDefault(); return; }
      if (e.target.closest('button') && (e.key === 'Enter' || e.key === ' ')) return;
      const ch = e.key.length === 1 ? e.key.toLowerCase() : '';
      let i = vu.left.indexOf(null);
      if (ch && /^[0-7a-zа-я]$/.test(ch)) {
        if (i < 0) { vu.left = Array(7).fill(null); i = 0; }
        let v = i === 0 ? C1[ch] : i === 2 ? K3.find(x => x.toLowerCase() === ch) : /[0-7]/.test(ch) ? ch : null;
        if (!v && i !== 0 && C1[ch]) { vu.left = Array(7).fill(null); i = 0; v = C1[ch]; }   // a system letter out of turn starts a new code
        if (!v) return;
        if (document.activeElement && document.activeElement.closest && document.activeElement.closest('button')) document.activeElement.blur();   // so Enter measures instead of re-pressing the last clicked button
        vu.left[i] = v; vu.msg = vu.left.includes(null) ? `Code so far: ${codeStr().replace(/ /g, '·')}` : `Code ${codeStr()}. Enter for ЗАМЕР 1, Shift+Enter for ЗАМЕР 2.`;
        e.preventDefault(); renderVU();
      } else if (e.key === 'Enter' && (document.activeElement === document.body || !document.activeElement)) { zamer(e.shiftKey ? 1 : 0); e.preventDefault(); }
      else if (e.key === 'Backspace') { const j = [...vu.left.keys()].filter(j => vu.left[j] !== null).pop(); if (j !== undefined) vu.left[j] = null; renderVU(); e.preventDefault(); }
      else if (e.key === 'Escape') { vu.left = Array(7).fill(null); renderVU(); }
    });
    document.querySelectorAll('.swv').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'))));
    $('btnRestart').addEventListener('click', () => { const r = skalaRestart(); notice(r[2]); });
    $('btnReload').addEventListener('click', () => { const r = dregReload(); notice(r[2]); });
  }

  // ---------- SKALA programs ----------
  const clockSec = t => S.clock0 + t;
  function requestPrizma() {
    if (S.powerLost) return ['ОШ', '', 'SKALA has no power.'];
    if (S.restarting) return ['ЗАНЯТО', '', 'SKALA is restarting.'];
    if (prizmaReq) return ['ЖДИТЕ', '', `Already queued for ${clk(prizmaReq.at)}.`];
    const at = Math.ceil((clockSec(S.t) + 1) / 300) * 300 - S.clock0;
    prizmaReq = { at, by: 'СИУР' };
    return ['ПРИНЯТ', '', `Printed when the current 5-minute cycle ends, at ${clk(at)}.`];
  }
  // PRIZMA channel cartogram, laid out like the core and printed in two halves (left, then right) with octal coordinate
  // rulers and four-character cells, after the Chornobyl Family reconstruction. Two lines per cell: channel type, power in MW.
  // The real sheet also gave each channel's coolant flow and boiling-crisis margin; the model has neither per channel.
  function cartoHalves(pw) {
    const cell = new Map();
    S.fuel.forEach((f, i) => cell.set(f.x + ',' + f.y, ['ТК', ru(SIM.thermal(S) / 1661 * pw[i], 2)]));
    const T = { RR: 'СУЗ', AR: 'АР', USP: 'УСП' };
    S.rods.forEach(r => cell.set(r.x + ',' + r.y, [T[r.type] || 'СУЗ', '']));
    S.dets.forEach(d => cell.set(d.x + ',' + d.y, ['Н', '']));
    const xs = [...cell.keys()].map(k => +k.split(',')[0]), ys = [...cell.keys()].map(k => +k.split(',')[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const mid = Math.floor((x0 + x1) / 2);
    const out = [];
    for (const [name, a, b] of [['ЛЕВАЯ ПОЛОВИНА', x0, mid], ['ПРАВАЯ ПОЛОВИНА', mid + 1, x1]]) {
      const cols = []; for (let x = a; x <= b; x++) cols.push(x);
      const ruler = '    ' + cols.map(x => oct2(31 + x).padStart(4) + ' ').join('');
      out.push({ ru: `КАРТОГРАММА ЗОНЫ · ${name}` }, { ru: ruler });
      for (let y = y0; y <= y1; y++) {
        const row = cols.map(x => cell.get(x + ',' + y));
        if (row.every(c => !c)) continue;
        out.push({ ru: oct2(32 - y).padStart(3) + ' ' + row.map(c => (c ? c[0] : '').padStart(4) + ' ').join('') });
        out.push({ ru: '    ' + row.map(c => (c ? c[1] : '').padStart(4) + ' ').join('') });
      }
      out.push({ ru: ruler });
    }
    return out;
  }
  function printPrizma(by) {
    if (S.powerLost) return;
    const pw = SIM.channelPower(S), kr = Math.max(...pw), th = SIM.thermal(S), orm = SIM.ormPrizma(S);
    const L = [];
    L.push({ ru: '======================== П Р И З М А ========================', en: by === 'СДИВТ' ? 'Scheduled printout, made every two hours on odd hours by the SKALA duty engineer and carried to the control room.' : 'PRIZMA printout requested from the control room.' });
    L.push({ ru: `БЛОК 4   ${S.date}   РАСЧЕТ ${clk(S.t, '.')}   ${S.skalaMode === 'ПАРНЫЙ' ? 'ПАРН.' : 'ПОЛУТ.'}` });
    L.push({ ru: `N ТЕПЛ  = ${fmt(th).padStart(6)} МВТ      N НЕЙТР = ${ru(S.n * 100, 1).padStart(6)} %`, en: 'Thermal and neutron power.' });
    L.push({ ru: `ОЗР     = ${ru(orm, 1).padStart(6)} СТ.РР`, en: 'Operating reactivity margin: inserted absorber weighted by the axial flux, in equivalent manual rods.' });
    if (orm < 15) L.push({ ru: '***  ОЗР МЕНЕЕ 15 СТ.РР  ***', en: 'Below 15 rods: the regulations required an immediate shutdown.' });
    else if (orm < 26) L.push({ ru: '***  ОЗР МЕНЕЕ 26 СТ.РР  ***', en: "Below 26 rods: operation only with the chief engineer's permission." });
    L.push({ ru: `KR     = ${ru(kr, 2).padStart(6)}          KZ      = ${ru(SIM.kz(S), 2).padStart(6)}`, en: 'Radial and axial peaking factors.' });
    L.push({ ru: `WТК MAX = ${ru(th / 1661 * kr, 2).padStart(6)} МВТ   G КМПЦ  = ${fmt(SIM.flowM3(S)).padStart(6)} М3/Ч`, en: 'Hottest channel power and total coolant flow.' });
    L.push({ ru: `P БС    = ${ru(S.p, 1).padStart(6)}          T ВХ    = ${ru(inletT(), 1).padStart(6)} ГРАД`, en: 'Drum pressure and core inlet temperature.' });
    L.push({ ru: 'ПОКАНАЛЬНАЯ КАРТОГРАММА: ТИП КАНАЛА / МОЩНОСТЬ, МВТ', en: 'Channel cartogram laid out like the core, printed in two halves as on the real PRIZMA sheet (layout after the Chornobyl Family reconstruction; wide, so scroll sideways). Each cell: channel type (ТК fuel, СУЗ control rod, АР, УСП, Н height detector), then power in MW. The real sheet also gave every channel’s coolant flow and boiling-crisis margin; this model has neither per channel, so those lines are left out. Powers are an illustrative radial estimate, not a 2D calculation, and the fuel-channel positions are inferred.' });
    for (const l of cartoHalves(pw)) L.push(l);
    L.push({ ru: '=========================== КОНЕЦ ===========================' }, { cut: true });
    block('lpt', L, 'carto'); flash('lpt');
    notice(`PRIZMA printout on the drum printer (${clk(S.t)}).`);
  }
  function printCartogram() {
    if (S.powerLost) return ['ОШ', '', 'SKALA has no power.'];
    const ROWS = [66, 64, 62, 60, 56, 54, 52, 50, 46, 44, 42, 40, 36, 34, 32, 30, 26, 24, 22, 20, 16, 14, 12];
    const COLS = [11, 13, 15, 17, 21, 23, 25, 27, 31, 33, 35, 37, 41, 43, 45, 47, 51, 53, 55, 57, 61, 63, 65];
    const cell = {};
    S.rods.forEach(r => cell[r.ch] = String(Math.round(r.d * 100)));
    S.dets.forEach(d => cell[d.ch] = 'Н');
    const L = [{ ru: `КАРТОГРАММА ПОГРУЖЕНИЯ СТЕРЖНЕЙ СУЗ (СМ)   ${S.date} ${clk(S.t, '.')}`, en: 'Rod insertion depth in cm on the plant grid. Layout after the maps in Karpan (pp. 362–363). Н = height detector. УСП depths are measured from the bottom.' }];
    L.push({ ru: '    ' + COLS.map(c => String(c).padStart(4)).join('') });
    for (const r of ROWS) L.push({ ru: String(r).padStart(3) + ' ' + COLS.map(c => (cell[`${r}-${c}`] ?? '').padStart(4)).join('') + '  ' + r });
    const top = S.rods.filter(r => r.type !== 'USP' && r.type !== 'AR' && r.d < 1.0).length;
    L.push({ ru: `ВСЕГО ПОГРУЖЕНО ${ru(S.rods.reduce((a, r) => a + r.d, 0), 1)} М   СТЕРЖНЕЙ С ВЫТЕСНИТЕЛЕМ ВЫШЕ 1 М: ${top}`, en: 'Total inserted length, and how many displacer rods start from within 1 m of the top. Each of those pushes a water column out of the bottom of its channel in the first seconds of an AZ-5 (Karpan pp. 364–366).' }, { cut: true });
    block('lpt', L); flash('lpt');
    return ['ПЕЧАТЬ', '', 'Cartogram sent to the drum printer.'];
  }
  function dregSnap() {
    if (S.powerLost) return ['ОШ', '', 'SKALA has no power.'];
    if (!S.dregOnline) return ['ДРЕГ', 'ВЫКЛ', 'DREG is not recording.'];
    S.dregPending.push({ t: S.t, ru: `СРЕЗ: G ПВ ${fmt(S.Gfw * 3.6)} Т/Ч  P БС ${ru(S.p, 1)}  Н БС ${fmt(S.L)} ММ  G ${fmt(SIM.flowM3(S))} М3/Ч`, en: 'Snapshot of directly measured parameters. DREG did not record power or reactivity (INSAG-7 p.77).' });
    return ['ПРИНЯТ', '', 'Logged at the next DREG cycle.'];
  }
  function dregReload() {
    if (!S.dregOnline) return ['ДРЕГ', 'ВЫКЛ', 'DREG is already off.'];
    S.dregOnline = false; S.dregOfflineUntil = S.t + 60; S.dregPending.length = 0;
    S.events.push({ t: S.t, kind: 'sys', ru: 'ДРЕГ: ЗАПИСЬ ОСТАНОВЛЕНА (ПЕРЕЗАРЯДКА ЛЕНТЫ)', en: 'DREG stopped while the tape is reloaded. Events in the next 60 s are lost, as at 01:12:10–01:18:49.' });
    return ['ДРЕГ', 'ВЫКЛ', 'Recording stops for 60 s.'];
  }
  function skalaRestart() {
    if (S.restarting || S.powerLost) return ['ЗАНЯТО', '', 'Not possible now.'];
    S.restarting = true; S.skalaMode = 'ПЕРЕЗАПУСК'; S.dregOnline = false; S.dregOfflineUntil = S.t + 399; S.dregPending.length = 0; prizmaReq = null;
    S.events.push({ t: S.t, kind: 'sys', ru: 'СКАЛА: ОСТАНОВ, ВВОД ПЕРФОЛЕНТЫ ИСПЫТАНИЙ', en: 'SKALA stopped to load the test punched tape left by the programmer (Karpan p.350). DREG is off until the restart completes.' });
    return ['ПУСК', '', 'Restart takes 6 min 39 s of plant time.'];
  }

  // ---------- events → printers ----------
  function drainEvents() {
    while (evIdx < S.events.length) {
      const e = S.events[evIdx++];
      if (e.kind === 'start') {
        block('tty', [{ ru: `СКАЛА  БЛОК 4  ${S.date}`, en: S.note }, { cut: true }], 'sys');
        block('dreg', [{ ru: `ДРЕГ  БЛОК 4  ${S.date}  ${clk(0)}`, en: 'DREG writes to magnetic tape; a printout like this was made from the tape afterwards. Cycles are numbered; times are the end of each 2–4 s cycle.' }, { cut: true }], 'sys');
      } else if (e.kind === 'tty') {
        ttyQueue(e.t, `${ttyClock(e.t)} ${e.ru}`, e.en, 'alarm');
        if (firsts.tty === undefined) firsts.tty = e.t;
      } else if (e.kind === 'dreg') {
        block('dreg', e.lines.map((l, i) => ({ t: i === 0 ? clk(e.t) + '  ' : '          ', ru: l.ru + (l.code ? '   ' + l.code : ''), cyc: i === 0 ? `   №${e.cycle}Д` : '', en: l.en })));
        for (const l of e.lines) { if (/^АЗМ/.test(l.ru) && firsts.azm === undefined) firsts.azm = e.t; if (/РОСТ ДАВЛЕНИЯ В РП/.test(l.ru)) firsts.rp = e.t; }
        flash('tape');
      } else if (e.kind === 'sys') {
        block('dreg', [{ t: clk(e.t) + '  ', ru: e.ru, en: e.en }], 'sys');
      } else if (e.kind === 'poweroff') {
        ttyOff = e.t; ended = true; setTimeout(showEnd, 2200);
      }
    }
  }
  function showEnd() {
    if (endShown) return; endShown = true;
    $('endTxt').textContent = `In this run the teletype began "АВАР ЗАЩИТА 5" at ${firsts.tty !== undefined ? clk(firsts.tty) : '—'}` +
      (firsts.azm !== undefined ? `, DREG logged the overpower trip at ${clk(firsts.azm)}` : '') +
      (firsts.rp !== undefined ? ` and reactor-space pressure at ${clk(firsts.rp)}` : '') +
      `. SKALA lost power at ${clk(S.powerOffT)}.`;
    run.debriefed = true; $('endDebrief').innerHTML = debriefHTML();
    $('endov').hidden = false; $('endov').querySelector('.card').scrollTop = 0; $('endRestart').focus({ preventScroll: true });
  }
  $('endRestart').addEventListener('click', () => { $('endov').hidden = true; init($('scenario').value); });
  $('endStay').addEventListener('click', () => { $('endov').hidden = true; });

  // ---------- run debrief ----------
  // Tracks each run and, when it ends (reactor destroyed, or shut down for 10 s), says what happened in plain terms.
  let run = null;
  const TRIP_NAMES = { azm: 'АЗМ (overpower)', azs: 'АЗСР (short period)' };
  function newRun() { run = { p0: SIM.thermal(S), peak: S.n * P.PNOM, peakT: S.t, minPer: Infinity, trips: {}, test: null, orm0: SIM.ormPrizma(S), lowSince: null, debriefed: false }; }
  function track() {
    const pn = S.n * P.PNOM;
    if (!S.destroyed && pn > run.peak) { run.peak = pn; run.peakT = S.t; }
    if (pn > 1 && S.period > 0 && S.period < run.minPer) run.minPer = S.period;
    for (const k of ['azm', 'azs']) if (S.tripLatched[k] && run.trips[k] === undefined) run.trips[k] = S.t;
    if (S.testStarted && run.test === null) run.test = S.t;
  }
  function debriefHTML() {
    const peak = Math.round(run.peak), trips = Object.keys(run.trips).map(k => TRIP_NAMES[k]);
    const surge = run.peak > Math.max(run.p0 * 1.5, run.p0 + 100);
    let verdict;
    if (S.destroyed) verdict = `Reactor destroyed ${S.scramT !== null ? fmt(S.destroyT - S.scramT, 1) + ' s after AZ-5' : 'without AZ-5'}. Peak power about ${fmt(peak)} MW.`;
    else if (surge && trips.length) verdict = `Survived a surge to about ${fmt(peak)} MW. The ${trips.join(' and ')} protection${trips.length > 1 ? 's' : ''} caught it.`;
    else if (surge) verdict = `Survived a surge to about ${fmt(peak)} MW.`;
    else if (trips.length) verdict = `Shut down after a protection trip: ${trips.join(', ')}. Peak power ${fmt(peak)} MW.`;
    else verdict = `Shut down safely. Peak power ${fmt(peak)} MW, no protection trips.`;
    const az5 = S.scramT === null ? 'not used' : `${S.scramCause ? 'automatic (' + (S.scramCause.key === 'azsr' ? 'АЗСР' : S.scramCause.key === 'azm' ? 'АЗМ' : 'protection') + ')' : 'pressed'} at ${clk(S.scramT)}`;
    const rows = [
      ['Run-down test', run.test === null ? 'not run' : `started at ${clk(run.test)}`],
      ['AZ-5', az5],
      ['Peak power', `${fmt(peak)} MW at ${clk(run.peakT)} (start: ${fmt(run.p0)} MW)`],
      ['Shortest period', run.minPer === Infinity ? '—' : `${fmt(run.minPer, 1)} s`],
      ['Operating margin (ORM)', `${ru(run.orm0, 1)} rods at the start${S.destroyed ? '' : ` · ${ru(SIM.ormPrizma(S), 1)} now`}`],
    ];
    let lesson = '';
    if (S.destroyed) lesson = 'On 26 April 1986 the reactor was destroyed about 5 s after AZ-5, at 01:23:45.';
    else if (surge) lesson = 'The surge is the tip effect: rods entering from the top first push water out of the bottom of the core with their graphite displacers, so power jumps before the absorber arrives. Inserting fewer rods at a time avoids it.';
    else if (run.orm0 < 15) lesson = 'With the margin below 15 rods, the regulations required exactly this: shut the reactor down. Done steadily, it was safe.';
    return `<p class="verdict">${esc(verdict)}</p><table class="dtab">${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>` +
      (lesson ? `<p class="small">${esc(lesson)}</p>` : '') + `<p class="small">The model is very sensitive near the edge of stability; treat a single run as a clue, not a prediction.</p>`;
  }
  function showDebrief() {
    run.debriefed = true;
    $('dbBody').innerHTML = debriefHTML();
    $('debrief').hidden = false; $('dbRestart').focus({ preventScroll: true });
  }
  $('dbRestart').addEventListener('click', () => { $('debrief').hidden = true; init($('scenario').value); });
  $('dbStay').addEventListener('click', () => { $('debrief').hidden = true; });

  // ---------- desk controls ----------
  // 12 slices of the core: a simulator convenience, not a plant grouping
  const NSEC = 12;
  const GROUPS = [...Array.from({ length: NSEC }, (_, g) => ['RR' + g, 'Сектор ' + (g + 1)]), ['ALL', 'Все РР'], ['USP', 'УСП']];
  const groupRods = k => k === 'ALL' ? S.rods.filter(r => r.type === 'RR') : S.rods.filter(r => k.startsWith('RR') ? (r.type === 'RR' && r.group === +k.slice(2)) : r.type === k);
  function selRods() { return sel.kind === 'set' ? sel.ids.map(i => S.rods[i]) : groupRods(sel.key); }
  function renderGroups() {
    const chips = GROUPS.map(([k, l]) => `<button class="chip" data-g="${k}" aria-pressed="${sel.kind === 'group' && sel.key === k}">${l}</button>`);
    if (sel.kind === 'set') {
      const label = sel.ids.length === 1 ? `Стержень ${S.rods[sel.ids[0]].ch}` : `Выбрано · ${sel.ids.length} стержней`;
      chips.unshift(`<button class="chip" aria-pressed="true" data-g="set">${label}</button><button class="chip" data-g="clear" aria-label="Clear the selection">✕</button>`);
    }
    $('groups').innerHTML = chips.join('');
    $('multiSel').setAttribute('aria-pressed', String(multi));
  }
  $('groups').addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b || b.dataset.g === 'set') return;
    sel = b.dataset.g === 'clear' ? { kind: 'group', key: 'RR0' } : { kind: 'group', key: b.dataset.g }; renderGroups();
  });
  $('multiSel').addEventListener('click', () => { multi = !multi; renderGroups(); notice(multi ? 'Multi-select on: tap dials to add or remove them.' : 'Multi-select off.'); });
  function pickRods(ids, add) {                 // set the selection to these rods, or toggle them into the current set
    let cur = add && sel.kind === 'set' ? sel.ids.slice() : [];
    for (const id of ids) { const i = cur.indexOf(id); if (add && i >= 0 && ids.length === 1) cur.splice(i, 1); else if (i < 0) cur.push(id); }
    sel = cur.length ? { kind: 'set', ids: cur } : { kind: 'group', key: 'RR0' }; renderGroups();
  }
  function move(dir) {
    if (S.scram || S.destroyed) { notice('AZ-5 has the rods. Manual drive is locked out.'); return; }
    S.setMove = null; S.groupMove = {};
    if (!dir) return;
    if (sel.kind === 'set') {
      const rods = sel.ids.map(i => S.rods[i]).filter(r => r.type !== 'AR');
      if (!rods.length) { notice('AR rods are driven by the automatic regulator.'); return; }
      if (rods.length < sel.ids.length) notice('AR rods in the selection are left to the automatic regulator.');
      S.setMove = { ids: new Set(rods.map(r => r.id)), dir };
      const what = rods.length === 1 ? `СТЕРЖЕНЬ ${rods[0].ch}` : `ГРУППА ИЗ ${rods.length} СТ.`;
      SIM.ev(S, `${what} ${dir > 0 ? 'ВВОД' : 'ВЫВОД'}`, `${dir > 0 ? 'Inserting' : 'Withdrawing'} ${rods.length === 1 ? 'rod ' + rods[0].ch : rods.length + ' selected rods'}`);
    } else {
      const keys = sel.key === 'ALL' ? Array.from({ length: NSEC }, (_, g) => 'RR' + g) : [sel.key];
      keys.forEach(k => S.groupMove[k] = dir);
      SIM.ev(S, `${GROUPS.find(g => g[0] === sel.key)[1].toUpperCase()} ${dir > 0 ? 'ВВОД' : 'ВЫВОД'}`, `${dir > 0 ? 'Inserting' : 'Withdrawing'} ${GROUPS.find(g => g[0] === sel.key)[1]}`);
    }
  }
  $('mvOut').addEventListener('click', () => move(-1));
  $('mvIn').addEventListener('click', () => move(1));
  $('mvStop').addEventListener('click', () => move(0));
  $('arOn').addEventListener('click', () => {
    if (S.scram || S.destroyed) return;
    S.ar.on = !S.ar.on;
    SIM.ev(S, S.ar.on ? `${S.ar.bank + 1}АР В РЕЖИМЕ АВТ.` : 'АР ОТКЛЮЧЕН ОПЕРАТОРОМ', S.ar.on ? 'Automatic regulator switched on' : 'Automatic regulator switched off by the operator');
  });
  document.querySelectorAll('[data-ars]').forEach(b => b.addEventListener('click', () => { S.ar.set = Math.max(30, Math.min(3200, S.ar.set + +b.dataset.ars)); }));
  $('assist').addEventListener('change', e => { S.assist = e.target.checked; });
  // hovering a pump explains it; .hint elements show the bubble without blocking their own click
  function buildPumps() { $('pumps').innerHTML = S.pumps.map((p, i) => `<button class="pump hint" data-p="${i}" data-k="${[13, 14, 23, 24].includes(p.id) ? 'p_test' : 'p_grid'}">ГЦН-${p.id}<b></b></button>`).join(''); }
  $('pumps').addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b || S.destroyed) return; const p = S.pumps[+b.dataset.p];
    if (p.coast) { notice(`ГЦН-${p.id} is running down with the turbine.`); return; }
    if (p.tripped) { notice(`ГЦН-${p.id} tripped on low flow.`); return; }
    p.on = !p.on; SIM.ev(S, `${p.on ? 'ВКЛЮЧЕН' : 'ОТКЛЮЧЕН'} ГЦН-${p.id}`, `Main circulation pump ${p.id} ${p.on ? 'started' : 'stopped'}`);
  });
  $('testBtn').addEventListener('click', () => {
    if (S.testStarted || S.destroyed) return;
    S.testStarted = true; S.pumps.filter(p => [13, 14, 23, 24].includes(p.id)).forEach(p => { p.coast = true; p.on = true; });
    SIM.ev(S, 'СТОПОРНЫЕ КЛАПАНЫ ЗАКРЫТЫ', 'Turbine 8 stop valves closed: run-down test begins');
    notice('Run-down test started. Pumps 13, 14, 23 and 24 now follow the coasting turbine-generator.');
  });
  $('az5').addEventListener('click', () => {
    const b = $('az5');
    if (!b.classList.contains('armed')) { b.classList.add('armed'); az5Armed = performance.now() + 6000; return; }
    if (!S.scram && !S.destroyed) { SIM.scram(S); notice('AZ-5 pressed.'); }
  });

  // ---------- gauges, axial display, mnemonic ----------
  const GAUGES = [['th', 'N тепл.', 'МВт'], ['nn', 'N нейтр.', '%'], ['per', 'Период', 'с'], ['pbs', 'P БС', 'кгс/см²'], ['lbs', 'Уровень БС', 'мм'], ['gcn', 'Расход', 'тыс. м³/ч'], ['gpv', 'Пит. вода', 'т/ч'], ['tin', 'T вход', '°C']];
  function buildGauges() {
    $('gauges').innerHTML = GAUGES.map(([k, l, u]) => `<div class="g"><div class="lbl"><abbr class="term" data-k="g_${k}" tabindex="0">${l}</abbr></div><div class="vrow"><div class="vfd cyan sm" id="g-${k}"></div><span class="u">${u}</span></div></div>`).join('');
    GAUGES.forEach(([k]) => { gv[k] = vfd($('g-' + k), 5); });
    arV = vfd($('arSet'), 4); dateV = vfd($('date'), 6); timeV = vfd($('time'), 6);
    $('axial7').innerHTML = [7, 6, 5, 4, 3, 2, 1].map((h, i) => `<div class="r"><span>${h}</span><div class="b"><i id="ax-${i}"></i></div></div>`).join('') + '<div class="cap">ДКЭВ · высота, м</div>';
  }
  const gv = {}; let arV, dateV, timeV;
  function setG(k, v, state) { gv[k].set(v, state); }
  const LAMPS = ['В-3М А', 'В-3М Б', 'ПИТАНИЕ', 'ДРЕГ', 'ЛЕНТА', 'ПРИЗМА', 'КРВ', 'РТА-80 №1', 'РТА-80 №2', 'АЦПУ', 'ПЕРФОЛЕНТА', 'ДАТЧИКИ'];
  const LAMP_K = { 'В-3М А': 'l_v3m', 'В-3М Б': 'l_v3m', 'ПИТАНИЕ': 'l_pwr', 'ДРЕГ': 'l_dreg', 'ЛЕНТА': 'l_tape', 'ПРИЗМА': 'l_prizma', 'КРВ': 'l_krv', 'РТА-80 №1': 'l_tty', 'РТА-80 №2': 'l_tty', 'АЦПУ': 'l_lpt', 'ПЕРФОЛЕНТА': 'l_ptape', 'ДАТЧИКИ': 'l_sens' };
  function buildMnemo() { $('mnemo').innerHTML = LAMPS.map((l, i) => `<div class="lamp" id="lamp-${i}"><abbr class="term" data-k="${LAMP_K[l]}" tabindex="0">${l}</abbr></div>`).join(''); }
  function lamp(l, cls) { const el = $('lamp-' + LAMPS.indexOf(l)); if (el) el.className = 'lamp ' + cls; }
  function renderMnemo() {
    const now = performance.now(), dead = S.powerLost;
    if (dead) { LAMPS.forEach(l => lamp(l, 'dark')); lamp('ПИТАНИЕ', 'fault blink'); $('mode').textContent = 'НЕТ ПИТАНИЯ · SKALA has no power'; return; }
    lamp('В-3М А', 'on'); lamp('В-3М Б', S.restarting ? 'busy blink' : 'on'); lamp('ПИТАНИЕ', 'on'); lamp('КРВ', 'on');
    lamp('ДРЕГ', S.dregOnline ? (marks.tape > now ? 'busy' : 'on') : 'busy blink');
    lamp('ЛЕНТА', !S.dregOnline ? 'busy blink' : (marks.tape > now ? 'busy' : 'on'));
    lamp('ПРИЗМА', S.restarting ? 'dark' : prizmaReq ? 'busy blink' : 'on');
    lamp('РТА-80 №1', marks.tty > now ? 'busy' : 'on'); lamp('РТА-80 №2', marks.tty > now ? 'busy' : 'on');
    lamp('АЦПУ', marks.lpt > now ? 'busy' : 'on');
    lamp('ПЕРФОЛЕНТА', S.restarting ? 'busy blink' : 'dark');
    lamp('ДАТЧИКИ', S.destroyed ? 'fault blink' : 'on');
    const nextCyc = Math.ceil((clockSec(S.t) + 0.001) / 300) * 300 - S.clock0;
    $('mode').textContent = `РЕЖИМ: ${S.skalaMode === 'ПАРНЫЙ' ? 'ПАРНЫЙ ВАРИАНТ' : S.skalaMode}  ·  РАСЧЕТ ЧЕРЕЗ ${fmt(nextCyc - S.t)} С  ·  ДРЕГ №${S.dregCycle}Д`;
  }
  function renderBanks() {
    const ar = S.rods.filter(r => r.type === 'AR');
    $('banks').innerHTML = [0, 1, 2].map(b => { const rs = ar.filter(r => r.bank === b), d = rs.reduce((a, r) => a + r.d, 0) / rs.length; return `<div class="bank ${S.ar.on && S.ar.bank === b ? 'act' : ''}"><div class="bar"><i style="height:${(d / H * 100).toFixed(1)}%"></i></div>${b + 1}АР<br><span style="font-family:var(--font-mono)">${ru(d, 1)}</span></div>`; }).join('');
    $('arOn').setAttribute('aria-pressed', String(S.ar.on)); $('arOn').textContent = S.ar.on ? 'АР вкл.' : 'АР откл.';
    arV.set(S.ar.set.toFixed(0));
    $('assist').checked = !!S.assist;
  }

  // ---------- rod position panel ----------
  const RING = { RR: '#3c4542', AR: '#d9b632', USP: '#3f78c8' };
  const ROWS = [66, 64, 62, 60, 56, 54, 52, 50, 46, 44, 42, 40, 36, 34, 32, 30, 26, 24, 22, 20, 16, 14, 12];
  const COLS = [11, 13, 15, 17, 21, 23, 25, 27, 31, 33, 35, 37, 41, 43, 45, 47, 51, 53, 55, 57, 61, 63, 65];
  let geom = null, hover = null;
  function heat(v) {   // relative power -> colour, cool green-grey to warm orange-red
    const t = Math.max(0, Math.min(1, (v - 0.3) / 1.6));
    const a = [140, 166, 150], b = [232, 196, 92], c = [214, 84, 52];
    const m = t < 0.5 ? [a, b, t * 2] : [b, c, (t - 0.5) * 2];
    return `rgb(${m[0].map((x, i) => Math.round(x + (m[1][i] - x) * m[2])).join(',')})`;
  }
  function drawCore() {
    const cv = $('core'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, W);
    const showGrid = $('showGrid').checked, u = W / (showGrid ? 56 : 52), cx = W / 2, cy = W / 2 + (showGrid ? u * 0.6 : 0);
    geom = { u, cx, cy };
    // panel face
    c.fillStyle = '#d6dbd2'; c.beginPath(); c.arc(cx, cy, 25.6 * u, 0, Math.PI * 2); c.fill();
    c.lineWidth = Math.max(1, u * 0.3); c.strokeStyle = '#8d9a8a'; c.stroke();
    if (S.destroyed) { c.fillStyle = 'rgba(160,40,30,0.18)'; c.fill(); }
    // fuel channels
    if ($('showFuel').checked) {
      if (!fuelPow || performance.now() > fuelT) { fuelPow = SIM.channelPower(S); fuelT = performance.now() + 1000; }
      const s = u * 0.82;
      S.fuel.forEach((f, i) => { c.fillStyle = heat(fuelPow[i] * (S.n > 0.002 ? 1 : 0.3)); c.fillRect(cx + f.x * u - s / 2, cy + f.y * u - s / 2, s, s); });
    } else {
      c.fillStyle = '#b9c2b5'; S.fuel.forEach(f => { c.beginPath(); c.arc(cx + f.x * u, cy + f.y * u, u * 0.18, 0, Math.PI * 2); c.fill(); });
    }
    // grid labels
    if (showGrid) {
      c.fillStyle = '#485349'; c.font = `${Math.max(7, u * 0.95)}px "PT Mono", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
      COLS.forEach((col, i) => c.fillText(col, cx + (2 * i - 22) * u, cy - 26.6 * u));
      c.textAlign = 'right'; ROWS.forEach((row, j) => c.fillText(row, cx - 25.2 * u, cy + (2 * j - 22) * u));
      c.textAlign = 'left'; ROWS.forEach((row, j) => c.fillText(row, cx + 25.2 * u, cy + (2 * j - 22) * u));
    }
    // detectors
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const d of S.dets) {
      const x = cx + d.x * u, y = cy + d.y * u, s = u * 1.5;
      c.fillStyle = '#23292a'; c.fillRect(x - s / 2, y - s / 2, s, s);
      c.fillStyle = '#eef0e6'; c.font = `bold ${Math.max(7, u * 1.05)}px "PT Sans Narrow", sans-serif`; c.fillText('Н', x, y + u * 0.05);
    }
    // rod dials
    const R = u * 1.12, srs = new Set(selRods().map(r => r.id));
    for (const r of S.rods) {
      const x = cx + r.x * u, y = cy + r.y * u, f = r.d / (r.type === 'USP' ? P.USP_MAX : H);
      c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.fillStyle = '#f3efe0'; c.fill();
      if (f > 0.003) { c.beginPath(); c.moveTo(x, y); c.arc(x, y, R * 0.92, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2 * 0.92); c.closePath(); c.fillStyle = r.type === 'USP' ? 'rgba(63,120,200,0.32)' : 'rgba(60,69,66,0.22)'; c.fill(); }
      c.lineWidth = Math.max(1.2, R * 0.26); c.strokeStyle = RING[r.type]; c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.stroke();
      const ang = -Math.PI / 2 + f * Math.PI * 2 * 0.92;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * R * 0.85, y + Math.sin(ang) * R * 0.85);
      c.lineWidth = Math.max(1, R * 0.16); c.strokeStyle = r.jam ? '#c8352a' : '#151a17'; c.stroke();
      if (r.type === 'AR' && S.ar.on && r.bank === S.ar.bank) { c.beginPath(); c.arc(x, y, R * 0.28, 0, Math.PI * 2); c.fillStyle = '#d9b632'; c.fill(); }
      if (srs.has(r.id)) { c.beginPath(); c.arc(x, y, R + Math.max(2, R * 0.4), 0, Math.PI * 2); c.lineWidth = 2; c.strokeStyle = '#f0a232'; c.stroke(); }
    }
    const rs = selRods(), avg = rs.reduce((a, r) => a + r.d, 0) / rs.length;
    const moving = sel.kind === 'set' ? !!S.setMove : Object.keys(S.groupMove).length > 0;
    $('selInfo').textContent = (sel.kind === 'set' ? (rs.length === 1 ? `${rs[0].ch} · ${rs[0].type}` : `Выбрано · ${rs.length}`) : `${GROUPS.find(g => g[0] === sel.key)[1]} · ${rs.length}`) + ` · ${ru(avg, 2)} м${moving ? ' · движение' : ''}`;
    if (drag && drag.on) {                       // selection box while dragging
      c.save(); c.setLineDash([5, 4]); c.lineWidth = 1.5; c.strokeStyle = '#f0a232'; c.fillStyle = 'rgba(240,162,50,0.12)';
      const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1), w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
      c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h); c.restore();
    }
  }
  function rodAt(ev) {
    if (!geom) return null;
    const b = $('core').getBoundingClientRect(), mx = ev.clientX - b.left, my = ev.clientY - b.top;
    let best = null, bd = 1.6 * geom.u;
    for (const r of S.rods) { const d = Math.hypot(geom.cx + r.x * geom.u - mx, geom.cy + r.y * geom.u - my); if (d < bd) { bd = d; best = r; } }
    return best ? { r: best, mx, my } : null;
  }
  const TYPE_RU = { RR: 'РР/ЛАР/АЗ', AR: 'АР', USP: 'УСП' };
  $('core').addEventListener('mousemove', ev => {
    const h = rodAt(ev), tip = $('coretip');
    if (!h || (drag && drag.on)) { tip.hidden = true; return; }
    tip.hidden = false; tip.style.left = h.mx + 'px'; tip.style.top = h.my + 'px';
    tip.textContent = `${h.r.ch} · ${TYPE_RU[h.r.type]}${h.r.type === 'AR' ? ' ' + (h.r.bank + 1) : ''} · ${ru(h.r.d, 2)} м${h.r.type === 'USP' ? ' снизу' : ''}`;
  });
  $('core').addEventListener('mouseleave', () => { $('coretip').hidden = true; });
  // click: one rod · shift/ctrl/⌘-click or multi-select mode: add or remove · drag a box (mouse): select every dial inside
  const corePt = ev => { const b = $('core').getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
  $('core').addEventListener('pointerdown', ev => {
    if (ev.pointerType !== 'mouse' || ev.button !== 0) return;
    const [x, y] = corePt(ev); drag = { x0: x, y0: y, x1: x, y1: y, on: false, add: ev.shiftKey || ev.ctrlKey || ev.metaKey || multi };
    $('core').setPointerCapture(ev.pointerId);
  });
  $('core').addEventListener('pointermove', ev => {
    if (!drag) return; const [x, y] = corePt(ev); drag.x1 = x; drag.y1 = y;
    if (!drag.on && Math.hypot(x - drag.x0, y - drag.y0) > 6) { drag.on = true; $('coretip').hidden = true; }
  });
  $('core').addEventListener('pointerup', ev => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.on) return;                          // a plain click: handled by the click listener
    d.dragged = true; lastDrag = performance.now();
    const x0 = Math.min(d.x0, d.x1), x1 = Math.max(d.x0, d.x1), y0 = Math.min(d.y0, d.y1), y1 = Math.max(d.y0, d.y1);
    const ids = S.rods.filter(r => { const x = geom.cx + r.x * geom.u, y = geom.cy + r.y * geom.u; return x >= x0 && x <= x1 && y >= y0 && y <= y1; }).map(r => r.id);
    if (ids.length) { pickRods(ids, d.add); notice(`${ids.length} rods selected.`); }
  });
  let lastDrag = 0;
  $('core').addEventListener('click', ev => {
    if (performance.now() - lastDrag < 250) return;
    const h = rodAt(ev); if (!h) return; pickRods([h.r.id], ev.shiftKey || ev.ctrlKey || ev.metaKey || multi);
  });
  ['showFuel', 'showGrid'].forEach(id => $(id).addEventListener('change', () => { fuelT = 0; }));

  // ---------- trend ----------
  function drawTrend() {
    const cv = $('trend'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, Hh = cv.clientHeight;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hh);
    if (trend.length < 2) return;
    const t0 = trend[0].t, t1 = trend[trend.length - 1].t, span = Math.max(1, t1 - t0);
    let mx = Math.max(...trend.map(p => p.P)), mn = Math.min(...trend.map(p => p.P));
    const pad = Math.max(10, (mx - mn) * 0.15); mx += pad; mn = Math.max(0, mn - pad);
    c.strokeStyle = 'rgba(255,138,58,0.14)'; c.lineWidth = 1;
    for (let k = 1; k < 4; k++) { const y = Hh * k / 4; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.beginPath(); trend.forEach((p, i) => { const x = (p.t - t0) / span * (W - 6) + 3, y = Hh - 8 - (p.P - mn) / (mx - mn) * (Hh - 18); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.strokeStyle = '#ff8a3a'; c.lineWidth = 1.8; c.stroke();
    const lp = trend[trend.length - 1], y = Hh - 8 - (lp.P - mn) / (mx - mn) * (Hh - 18);
    c.beginPath(); c.arc(W - 3, y, 3, 0, Math.PI * 2); c.fillStyle = '#ffb27a'; c.fill();
    c.fillStyle = '#c06a2c'; c.font = '11px "PT Mono", monospace'; c.fillText(mx.toFixed(0), 5, 12); c.fillText(mn.toFixed(0), 5, Hh - 4);
    $('trendInfo').textContent = `Thermal power, MW · last ${span < 120 ? span.toFixed(0) + ' s' : (span / 60).toFixed(1) + ' min'} of plant time`;
  }

  // ---------- hidden physics ----------
  function renderHidden() {
    if (!$('hidden').open) return;
    const N = P.N, w = Array.from(S.phi, v => v * v), ws = w.reduce((a, b) => a + b, 0);
    const avg = f => { let a = 0; for (let k = 0; k < N; k++) a += w[k] * f(k); return a / ws / P.BETA; };
    const rods = avg(k => S.dkRod[k]), vd = avg(k => P.ALPHA_V * S.vd[k]), dop = avg(k => P.ALPHA_D * (S.tf[k] - P.TSAT)), xe = avg(k => -P.XE_W * S.xe[k]);
    const sg = v => (v >= 0 ? '+' : '') + fmt(v, 2) + ' $';
    const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    const vAvg = S.vd.reduce((a, b) => a + b, 0) / N;
    $('rhoTable').innerHTML =
      row('<b>Reactivity</b>', `<b>${sg(S.rho)}</b>`) +
      row('Control rods (absorber, displacers, water)', sg(rods)) + row(`Steam void (core average ${fmt(vAvg, 1)} %)`, sg(vd)) +
      row('Fuel temperature (Doppler)', sg(dop)) + row('Xenon-135', sg(xe)) +
      row('ORM, PRIZMA (flux-weighted) / simple count', `${ru(SIM.ormPrizma(S), 1)} / ${ru(SIM.ormQuick(S), 1)}`) +
      row('Hottest channel power / crisis limit', `${ru(S.wtk || 0, 2)} / ${ru(P.W_CRIT, 1)} MW`) +
      row('Reactor period', S.period === Infinity ? '∞' : fmt(S.period, 1) + ' s') +
      row('Channels ruptured', S.crisis ? `yes, at ${clk(S.crisisT)}` : 'no');
    const cv = $('axial'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, Hh = cv.clientHeight;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, Hh);
    const L = 40, Rm = 12, T = 14, B = 26, yOf = k => T + (k + 0.5) / N * (Hh - T - B);
    c.strokeStyle = '#b6bfb3'; c.lineWidth = 1;
    for (let hgt = 0; hgt <= 7; hgt++) { const y = T + (7 - hgt) / 7 * (Hh - T - B); c.beginPath(); c.moveTo(L, y); c.lineTo(W - Rm, y); c.stroke(); c.fillStyle = '#485349'; c.font = '11px "PT Mono", monospace'; c.textAlign = 'right'; c.fillText(hgt + ' м', L - 6, y + 4); }
    const xOf = (v, max) => L + v / max * (W - L - Rm);
    const line = (vals, max, col, wdt, dash) => { c.beginPath(); vals.forEach((v, k) => { const x = xOf(v, max), y = yOf(k); k ? c.lineTo(x, y) : c.moveTo(x, y); }); c.strokeStyle = col; c.lineWidth = wdt; c.setLineDash(dash || []); c.stroke(); c.setLineDash([]); };
    if (S.name !== 'nominal') line(Array.from(SIM.fig5()), 3, '#7a857a', 1.4, [5, 4]);
    line(Array.from(S.vd, v => v / 100 * 3), 3, '#3f78c8', 1.6);
    line(Array.from(S.xe), 3, '#8a5bb0', 1.4);
    line(Array.from(S.phi), 3, '#c8352a', 2.4);
    c.textAlign = 'left'; c.font = '11px "PT Sans", sans-serif';
    const lg = [['#c8352a', 'flux (mean = 1)'], ['#3f78c8', 'steam void, 0–100 %'], ['#8a5bb0', 'xenon (full-power eq. = 1)']];
    lg.forEach(([col, t], i) => { c.fillStyle = col; c.fillRect(L + 6 + i * ((W - L) / 3), Hh - 14, 10, 3); c.fillStyle = '#485349'; c.fillText(t, L + 20 + i * ((W - L) / 3), Hh - 9); });
    c.fillStyle = '#485349'; c.textAlign = 'right'; c.fillText('0', L + 4, T - 3); c.fillText('3', W - Rm, T - 3);
  }

  // ---------- frame ----------
  function render() {
    dateV.set(S.date.replace(/\./g, '.')); timeV.set(clk(S.t, '.'));
    const th = SIM.thermal(S), per = S.period, dead = S.powerLost;
    if (dead) GAUGES.forEach(([k]) => setG(k, '-----', 'alarm'));
    else {
      const L = S.tripLatched, recent = S.scram && S.t - S.scramT < 12;   // the window behind a trip flashes for 12 s
      const azmF = L.azm && recent, azsF = L.azs && recent;
      setG('th', fmt(th), azmF ? 'alarm flash' : th > S.azmSet ? 'alarm' : (th > S.azmSet * 0.9 ? 'warn' : ''));
      setG('nn', fmt(S.n * 100, 1), azmF ? 'alarm flash' : S.n * P.PNOM > S.azmSet ? 'alarm' : '');
      setG('per', per === Infinity || per > 999 ? '---' : fmt(per, 1), azsF ? 'alarm flash' : per < 20 ? 'alarm' : per < 60 ? 'warn' : '');
      setG('pbs', ru(S.p, 1), S.p > 75 ? 'alarm' : S.p > 70 ? 'warn' : '');
      setG('lbs', fmt(S.L), S.L < -600 ? 'alarm' : Math.abs(S.L) > 100 ? 'warn' : '');
      setG('gcn', ru(SIM.flowM3(S) / 1000, 1), '');
      setG('gpv', fmt(S.Gfw * 3.6), '');
      setG('tin', ru(inletT(), 1), S.hy && S.hy.dTsub < 3 ? 'warn' : '');
    }
    const ax = SIM.sevenPoint(S);
    ax.forEach((v, i) => { const el = $('ax-' + i); if (el) el.style.width = (dead ? 0 : Math.min(100, v / 2.5 * 100)).toFixed(1) + '%'; });
    document.querySelectorAll('#pumps .pump').forEach((b, i) => {
      const p = S.pumps[i]; b.className = 'pump hint' + (p.tripped ? ' trip' : p.coast ? ' coast' : p.on ? ' on' : '');
      b.querySelector('b').textContent = p.tripped ? 'ОТКЛ ' + fmt(p.w * S.drk * P.PUMP_M3H) : fmt(p.w * S.drk * P.PUMP_M3H) + (p.coast ? ' выбег' : '');
    });
    $('testBtn').disabled = S.testStarted || S.destroyed;
    if (az5Armed && performance.now() > az5Armed && !S.scram) { $('az5').classList.remove('armed'); az5Armed = 0; }
    $('az5').classList.toggle('fired', S.scram);
    if (S.scram) $('az5').classList.add('armed');
    if (S.scram && !scramShown) {                // say at once what tripped; the teletype and DREG keep their real delays
      scramShown = true;
      const c = S.scramCause;
      if (c && c.key === 'azsr') notice('АЗСР: reactor period below 20 s · automatic AZ-5. The teletype message follows at 7 characters per second.', 15000);
      else if (c && c.key === 'azm') notice('АЗМ: power above the trip setting · automatic AZ-5. The teletype message follows at 7 characters per second.', 15000);
      else if (c) notice(`${c.ru} · automatic AZ-5`, 15000);
    }
    renderBanks(); drawCore(); drawTrend(); renderMnemo(); renderVU(); ttyRender();
    if (performance.now() > hpT) { renderHidden(); hpT = performance.now() + 250; }
    if (noticeT && performance.now() > noticeT) { $('notice').textContent = ''; noticeT = 0; }
  }
  const transient = () => S.scram || S.crisis || Math.abs(S.lnRate) > 0.02 || S.rho > 0.08;
  function frame(now) {
    const wall = Math.min(0.1, (now - last) / 1000); last = now;
    if (!ended && speed > 0) {
      let eff = speed;
      if (speed > 1 && transient()) { setSpeed(1); eff = 1; notice('Fast transient: speed held at ×1.'); }
      let simDt = wall * eff; const h = eff >= 600 ? 0.25 : eff >= 60 ? 0.1 : 0.05; let n = 0;
      while (simDt > 1e-9 && n < 3000 && !ended) {
        const d = Math.min(h, simDt); SIM.step(S, d); simDt -= d; n++; track();
        if (h > 0.05 && transient()) break;
        if (S.events.length > evIdx) drainEvents();
      }
      // SKALA calculation cycle: PRIZMA on request, and the duty engineer's printout on odd hours
      if (prizmaReq && S.t >= prizmaReq.at) { prizmaReq = null; printPrizma('СИУР'); }
      const hr = Math.floor(clockSec(S.t) / 3600);
      if (lastClockHour !== null && hr !== lastClockHour && (hr % 24) % 2 === 1 && !S.restarting) printPrizma('СДИВТ');
      lastClockHour = hr;
      const cyc = Math.floor(clockSec(S.t) / 300);
      if (lastCycle !== null && cyc !== lastCycle && !S.restarting && !S.powerLost) ormCycle = { v: SIM.ormPrizma(S), at: S.t };
      lastCycle = cyc;
      spWatch(false);
      drainEvents();
      if (S.setMove && [...S.setMove.ids].every(i => { const r = S.rods[i], max = r.type === 'USP' ? P.USP_MAX : H; return S.setMove.dir > 0 ? r.d >= max - 1e-6 : r.d <= 1e-6; })) S.setMove = null;
      for (const k of Object.keys(S.groupMove)) { const v = S.groupMove[k], rs = groupRods(k), max = k === 'USP' ? P.USP_MAX : H; if (S.assistMove) continue; if (rs.every(r => v > 0 ? r.d >= max - 1e-6 : r.d <= 1e-6)) delete S.groupMove[k]; }
      if (!S.powerLost) { trend.push({ t: S.t, P: SIM.thermal(S) }); if (trend.length > 900) trend.shift(); }
      if (!S.destroyed && !run.debriefed && S.n * P.PNOM < 2) { if (run.lowSince === null) run.lowSince = S.t; else if (S.t - run.lowSince > 10) showDebrief(); }
      else if (S.n * P.PNOM >= 2) run.lowSince = null;
    }
    render();
    requestAnimationFrame(frame);
  }
  function setSpeed(v) { speed = v; document.querySelectorAll('#speed button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.s === v))); }
  $('speed').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) setSpeed(+b.dataset.s); });

  const NOTES = {
    apr26: 'Unit 4 at 200 MW thermal at 01:22:30 with every rod where Karpan and INSAG-7 record it (about 48 m of rod in the core in total, an operating margin of 6–8 rods), all eight pumps running, xenon high. Start the run-down test, then decide when to press AZ-5. The real AZ-5 came 36 s after the test began.',
    apr26_0039: 'What-if: the same plant state, but the rods are where they were at 00:39, when ORM was 16.5. More rods sit deep in the core and 23 УСП cover the bottom. Try the same sequence.',
    nominal: 'Unit 4 at 3100 MW as the unloading began on 25 April. Lower the AR setpoint in steps, run at ×600 and watch xenon eat the margin. The SIUR aid keeps the AR centred; the axial field will still drift unless you level it with УСП and manual rods.',
  };
  function init(name) {
    S = SIM.scenario(name); S.note = NOTES[name];
    evIdx = 0; trend = []; ended = false; endShown = false; prizmaReq = null; tty = []; ttyOff = null; fuelT = 0; lastClockHour = null;
    Object.keys(firsts).forEach(k => delete firsts[k]);
    ['tty', 'dreg', 'lpt'].forEach(k => sheet(k).innerHTML = '');
    sheet('lpt').innerHTML = name === 'nominal'
      ? '<div class="pl empty">The drum printer is idle. Subprogram 0300 (program 1) requests PRIZMA; the duty engineer also prints it every two hours on odd hours.</div>'
      : '<div class="pl empty">The last PRIZMA printout was carried to the control room at about 01:00 (ORM 17–19 by testimony, Karpan p.351). PRIZMA was not run again before the test. Subprogram 0300 (program 1) requests one; it prints when the current 5-minute cycle ends.</div>';
    sel = { kind: 'group', key: 'RR0' }; multi = false; drag = null; scramShown = false; renderGroups();
    $('az5').classList.remove('armed'); az5Armed = 0;
    newRun(); $('debrief').hidden = true;
    vu.left = Array(7).fill(null); vu.kind = 'ПРМ'; vu.mode = 'ИЗМ'; vu.sets = [null, null]; rk.sign = 1; rk.d = [null, null, null, null]; rk.e = null; rk.prog = null;
    SP = JSON.parse(JSON.stringify(SP_DEFAULT)); ormCycle = { v: SIM.ormPrizma(S), at: 0 }; lastCycle = null;
    spState = {}; spWatch(true);
    vu.msg = 'Press one key in each column of the left keyboard, then ЗАМЕР 1 or 2. Try П0N0000 (thermal power) or К0S0000 (ORM). You can also type the code.';
    buildPumps(); setSpeed(1); notice(NOTES[name]);
    drainEvents(); render();
  }
  $('scenario').addEventListener('change', e => init(e.target.value));

  // ---------- glossary bubbles ----------
  // Wraps the first mention of each glossary term inside each labelled area in <abbr class="term">,
  // then shows a definition bubble on hover, keyboard focus or tap.
  const GL = Object.fromEntries(GLOSSARY.map(g => [g.k, g]));
  const PK = Object.fromEntries(GLOSSARY.flatMap(g => g.m.map(s => [s, g.k])));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const GRE = new RegExp('(?<![\\p{L}\\p{N}])(' + Object.keys(PK).sort((a, b) => b.length - a.length).map(reEsc).join('|') + ')(?![\\p{L}\\p{N}])', 'gu');
  const GSKIP = 'button:not(#dir button), select, option, input, textarea, label, .vfd, .paper, abbr, a, script, style, canvas, .tablo, #selInfo, #mode, #vuWhat, #notice, .coretip, #rhoTable, .tag';
  function glossify(root) {
    const used = new Set(), nodes = [];
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest(GSKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while (tw.nextNode()) nodes.push(tw.currentNode);
    for (const n of nodes) {
      const s = n.nodeValue; let m, last = 0, frag = null; GRE.lastIndex = 0;
      while ((m = GRE.exec(s))) {
        const k = PK[m[1]];
        if (!k || used.has(k) || (k === 'azrods' && s[m.index + m[1].length] === '-')) continue;
        used.add(k); frag = frag || document.createDocumentFragment();
        frag.append(s.slice(last, m.index));
        const ab = document.createElement('abbr'); ab.className = 'term'; ab.dataset.k = k; ab.tabIndex = 0; ab.textContent = m[1];
        frag.append(ab); last = m.index + m[1].length;
      }
      if (frag) { frag.append(s.slice(last)); n.replaceWith(frag); }
    }
  }
  function glossifyPage() {
    const roots = [...document.querySelectorAll('.brand p, .plate > header h2, .legend, .note, .lbl, .cap, #dir, #mnemo .lamp, #hidden, #aboutBox, .endov .card, footer.thanks')];
    roots.filter(r => !roots.some(o => o !== r && o.contains(r))).forEach(glossify);
  }
  const bub = document.createElement('div'); bub.className = 'gbub'; bub.id = 'gbub'; bub.setAttribute('role', 'tooltip'); bub.hidden = true; document.body.appendChild(bub);
  let bubFor = null, bubShowT = 0, bubHideT = 0;
  function showBub(el) {
    clearTimeout(bubHideT); const g = GL[el.dataset.k]; if (!g) return;
    bub.innerHTML = `<b>${esc(g.t)}</b><span>${esc(g.d)}</span>` + (g.a ? `<a href="${g.a[1]}" target="_blank" rel="noopener">${esc(g.a[0])} ↗</a>` : '');
    bub.hidden = false; bub.classList.remove('below');
    const r = el.getBoundingClientRect(), bw = bub.offsetWidth, bh = bub.offsetHeight;
    const left = Math.max(8, Math.min(innerWidth - bw - 8, r.left + r.width / 2 - bw / 2));
    let top = r.top - bh - 10; if (top < 8) { top = r.bottom + 10; bub.classList.add('below'); }
    bub.style.left = left + 'px'; bub.style.top = top + 'px'; bub.style.setProperty('--ax', (r.left + r.width / 2 - left) + 'px');
    if (bubFor) bubFor.removeAttribute('aria-describedby');
    bubFor = el; el.setAttribute('aria-describedby', 'gbub');
  }
  function hideBub(delay = 220) { clearTimeout(bubShowT); clearTimeout(bubHideT); bubHideT = setTimeout(() => { bub.hidden = true; if (bubFor) bubFor.removeAttribute('aria-describedby'); bubFor = null; }, delay); }
  let bubPending = null;
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('abbr.term, [data-k].hint'); if (!el) return;
    clearTimeout(bubHideT);
    if (el === bubPending || (el === bubFor && !bub.hidden)) return;   // same element (its contents may be redrawn every frame)
    clearTimeout(bubShowT); bubPending = el; bubShowT = setTimeout(() => { bubPending = null; showBub(el); }, 120);
  });
  document.addEventListener('mouseout', e => { const el = e.target.closest && e.target.closest('abbr.term, [data-k].hint'); if (!el) return; if (e.relatedTarget && el.contains(e.relatedTarget)) return; bubPending = null; hideBub(); });
  bub.addEventListener('mouseenter', () => clearTimeout(bubHideT));
  bub.addEventListener('mouseleave', () => hideBub());
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('abbr.term, [data-k].hint')) showBub(e.target); });
  document.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('abbr.term, [data-k].hint')) hideBub(400); });
  document.addEventListener('click', e => {                      // taps: toggle the bubble, and never trigger the button a term sits in
    const el = e.target.closest && e.target.closest('abbr.term');
    if (el) { e.preventDefault(); e.stopPropagation(); if (bubFor === el && !bub.hidden) hideBub(0); else showBub(el); }
    else if (!bub.contains(e.target)) hideBub(0);
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !bub.hidden) hideBub(0); });
  addEventListener('scroll', () => { if (!bub.hidden) hideBub(0); }, { passive: true });

  buildGauges(); buildKeys(); buildDir(); buildMnemo(); buildArchive(); glossifyPage();
  init('apr26');
  last = performance.now(); requestAnimationFrame(frame);
})();
