(() => {
  const $ = id => document.getElementById(id);
  const P = SIM.P, H = P.H;
  let S, speed = 1, last = 0, evIdx = 0, trend = [], ended = false, endShown = false;
  let sel = { kind: 'group', key: 'RR0' }, az5Armed = 0, noticeT = 0, hpT = 0, fuelT = 0, fuelPow = null;
  let prizmaReq = null, lastClockHour = null;
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
    '-': 'g', '—': 'g', ' ': '', '_': 'd', 'E': 'adefg', 'Е': 'adefg', 'r': 'eg', 'P': 'abefg', 'Р': 'abefg', 'C': 'adef', 'С': 'adef', 'H': 'bcefg', 'Н': 'bcefg',
    'L': 'def', 'П': 'abcef', 'Г': 'aef', 'U': 'bcdef', 'b': 'cdefg', 'Ь': 'cdefg', 'd': 'bcdeg', 'A': 'abcefg', 'А': 'abcefg', 'n': 'ceg', 't': 'defg', 'o': 'cdeg', 'О': 'abcdef' };
  const tubeSvg = () => `<svg viewBox="0 0 36 60" aria-hidden="true"><g class="gh">${SEGS.map(d => `<path d="${d}"/>`).join('')}<circle cx="32.5" cy="54" r="2"/></g><g class="lt">${SEGS.map(d => `<path d="${d}"/>`).join('')}<circle cx="32.5" cy="54" r="2"/></g></svg>`;
  function vfd(el, n) {            // returns {set(text, state)}; text is right-aligned, '.' or ',' or ':' lights the previous tube's point
    el.innerHTML = '<span class="vfdscrew l"></span>' + Array.from({ length: n }, () => `<span class="tube">${tubeSvg()}</span>`).join('') + '<span class="vfdscrew r"></span>';
    const tubes = [...el.querySelectorAll('.tube .lt')].map(g => [...g.children]);
    let last = null, lastState = '';
    return {
      set(text, state = '') {
        text = String(text);
        if (state !== lastState) { el.classList.remove('warn', 'alarm', 'dark'); if (state) el.classList.add(state); lastState = state; }
        el.setAttribute('aria-label', text.trim() || 'blank');
        if (text === last) return; last = text;
        const cells = [];
        for (const ch of text) { if ((ch === '.' || ch === ',' || ch === ':') && cells.length) cells[cells.length - 1].dp = true; else cells.push({ ch, dp: false }); }
        const out = cells.length > n ? Array.from({ length: n }, () => ({ ch: '-', dp: false })) : Array(n - cells.length).fill({ ch: ' ', dp: false }).concat(cells);
        out.forEach((c, i) => { const g = GLYPH[c.ch] ?? GLYPH[String(c.ch).toUpperCase()] ?? ''; tubes[i].forEach((p, k) => p.classList.toggle('on', k < 7 ? g.includes('abcdefg'[k]) : c.dp)); });
      },
    };
  }

  function notice(msg) { $('notice').textContent = msg; noticeT = performance.now() + 7000; }
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
  function ttyQueue(t, text, en, cls) {
    const prev = tty[tty.length - 1];
    const start = Math.max(t, prev ? prev.start + TTY_COLS / TTY_CPS : t);
    const el = document.createElement('div'); el.className = 'pblock ' + (cls || '');
    el.innerHTML = `<div class="pl"></div>${en ? `<div class="gl" hidden>${esc(en)}</div>` : ''}`;
    tty.push({ start, text, el, shown: -1, done: false });
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

  // ---------- codes ----------
  const CODES = [
    { c: '101', ru: 'Тепловая мощность', en: 'Thermal power', u: 'МВТ', f: () => fmt(SIM.thermal(S)) },
    { c: '102', ru: 'Нейтронная мощность', en: 'Neutron power, % of nominal', u: '%', f: () => fmt(S.n * 100, 1) },
    { c: '103', ru: 'Давление в БС', en: 'Drum separator pressure', u: 'КГС/СМ²', f: () => ru(S.p, 1) },
    { c: '104', ru: 'Уровень в БС', en: 'Drum separator level', u: 'ММ', f: () => fmt(S.L) },
    { c: '105', ru: 'Расход через реактор', en: 'Coolant flow, all pumps', u: 'М³/Ч', f: () => fmt(SIM.flowM3(S)) },
    { c: '106', ru: 'Расход питательной воды', en: 'Feedwater flow', u: 'Т/Ч', f: () => fmt(S.Gfw * 3.6) },
    { c: '107', ru: 'Температура на входе', en: 'Coolant inlet temperature', u: '°C', f: () => ru(inletT(), 1) },
    { c: '111', ru: 'Недогрев на входе', en: 'Inlet subcooling', u: '°C', f: () => ru(S.hy ? S.hy.dTsub : 0, 1) },
    { c: '110', ru: 'Положение активной группы АР', en: 'Depth of the active AR bank', u: 'М', f: () => { const r = S.rods.find(r => r.type === 'AR' && r.bank === S.ar.bank); return ru(r.d, 2); } },
    { c: '120', ru: 'ОЗР по положению стержней', en: 'ORM, simple count from rod positions (what the display gave without PRIZMA)', u: 'СТ.РР', f: () => ru(SIM.ormQuick(S), 1) },
    { c: '130', ru: 'Kz по СФКРЭ', en: 'Axial peaking factor from the height detectors', u: '', f: () => ru(SIM.kz(S), 2) },
    { c: '300', ru: 'Расчёт ПРИЗМА', en: 'Request PRIZMA: printed at the end of the next 5-minute SKALA cycle', act: requestPrizma },
    { c: '310', ru: 'Картограмма СУЗ', en: 'Rod depth cartogram (cm) to the drum printer', act: printCartogram },
    { c: '400', ru: 'Срез параметров в ДРЕГ', en: 'Write a parameter snapshot into DREG', act: dregSnap },
    { c: '410', ru: 'Перезарядка ленты ДРЕГ', en: 'Reload the DREG tape: recording stops 60 s', act: dregReload },
    { c: '420', ru: 'Перезапуск СКАЛЫ', en: 'Restart SKALA from punched tape, as done twice that night: DREG off 6 min 39 s', act: skalaRestart },
  ];
  function buildDir() {
    const grp = (title, list) => `<div class="dirhead">${title}</div><ul class="dir">${list.map(k => `<li><button data-code="${k.c}"><code>${k.c}</code><span>${esc(k.ru)}<em>${esc(k.en)}</em></span></button></li>`).join('')}</ul>`;
    $('dir').innerHTML = grp('Вызов параметра · read a value', CODES.filter(k => !k.act)) + grp('Программы · run a program', CODES.filter(k => k.act));
    $('dir').addEventListener('click', e => { const b = e.target.closest('button[data-code]'); if (!b) return; enterCode(b.dataset.code); });
  }

  // ---------- request device ----------
  // Code entry follows the photographed SKALA console: one key column per digit position, keys 0-7.
  const vu = { digs: [null, null, null], code: null, msg: '', val: '', unit: '', lamp: '', readyAt: 0 };
  const TABLO = [['ПРИНЯТ', ''], ['ЖДИТЕ', ''], ['ЗАНЯТО', ''], ['ПЕЧАТЬ', ''], ['ДРЕГ ВЫКЛ', ''], ['ОШИБКА', 'err'], ['НЕТ СИГНАЛА', 'err'], ['ГОТОВ', '']];
  const TABLO_SHORT = { 'НЕТ СИГНАЛА': 'НЕТ СИГН.' };
  let vCode, vVal;
  const entryStr = () => vu.digs.map(d => d === null ? ' ' : d).join('');
  function renderVU() {
    let lamp = vu.lamp;
    if (vu.code && !vu.code.act && vu.digs.every(d => d === null)) {
      if (S.destroyed && S.powerLost) { vu.val = ''; vu.unit = ''; lamp = 'НЕТ СИГНАЛА'; }
      else if (S.t < vu.readyAt) { vu.val = ''; vu.unit = ''; lamp = 'ЖДИТЕ'; }
      else { vu.val = vu.code.f(); vu.unit = vu.code.u; lamp = 'ГОТОВ'; }
    }
    const showCode = vu.digs.some(d => d !== null) ? entryStr() : (vu.code ? vu.code.c : '');
    vCode.set(showCode); vVal.set(vu.val);
    $('vuUnit').textContent = vu.unit; $('vuWhat').textContent = vu.msg;
    document.querySelectorAll('#tablo span').forEach(s => s.classList.toggle('on', s.dataset.l === lamp));
    document.querySelectorAll('#keys .key').forEach(k => k.classList.toggle('on', vu.digs[+k.dataset.col] === +k.dataset.d));
    $('vu').parentElement.classList.toggle('poweroff', !!S.powerLost);
  }
  function key(k) {
    if (ended) return;
    if (/^\d$/.test(k)) {
      if (+k > 7) { vu.msg = 'The keys run 0–7 only.'; renderVU(); return; }
      let i = vu.digs.indexOf(null); if (i < 0) { vu.digs = [null, null, null]; i = 0; }
      vu.digs[i] = +k; vu.lamp = ''; vu.msg = vu.digs.includes(null) ? 'Next digit…' : 'Press ВВОД to request.';
    } else if (/^c\d\d$/.test(k)) {             // a column key: c<column><digit>
      vu.digs[+k[1]] = +k[2]; vu.lamp = ''; vu.msg = vu.digs.includes(null) ? 'Set the remaining columns.' : 'Press ВВОД to request.';
    } else if (k === 'back') { const i = [0, 1, 2].filter(j => vu.digs[j] !== null).pop(); if (i !== undefined) vu.digs[i] = null; }
    else if (k === 'clr') { vu.digs = [null, null, null]; vu.code = null; vu.val = ''; vu.unit = ''; vu.lamp = ''; vu.msg = 'Cleared.'; }
    else if (k === 'ent') {
      if (vu.digs.includes(null)) { vu.lamp = 'ОШИБКА'; vu.msg = 'A code has three digits.'; renderVU(); return; }
      enterCode(vu.digs.join('')); return;
    }
    renderVU();
  }
  const LAMP_OF = { 'ОШ': 'ОШИБКА', 'ЗАНЯТО': 'ЗАНЯТО', 'ЖДИТЕ': 'ЖДИТЕ', 'ПРИНЯТ': 'ПРИНЯТ', 'ПЕЧАТЬ': 'ПЕЧАТЬ', 'ДРЕГ': 'ДРЕГ ВЫКЛ', 'ПУСК': 'ПРИНЯТ' };
  function enterCode(code) {
    const c = CODES.find(x => x.c === code);
    vu.digs = [null, null, null];
    if (!c) { vu.code = null; vu.val = 'Е'; vu.unit = ''; vu.lamp = 'ОШИБКА'; vu.msg = `No code ${code}. See the list below.`; renderVU(); return; }
    vu.code = c; vu.msg = `${c.ru} · ${c.en}`; vu.readyAt = S.t + 1.5; vu.lamp = '';     // the value takes a moment to come up
    if (c.act) { const r = c.act(); vu.val = ''; vu.unit = ''; vu.lamp = LAMP_OF[r[0]] || 'ПРИНЯТ'; if (r[2]) vu.msg += ' · ' + r[2]; }
    renderVU();
  }
  function buildKeys() {
    vCode = vfd($('vuCode'), 3); vVal = vfd($('vuVal'), 7);
    $('tablo').innerHTML = TABLO.map(([l, c]) => `<span data-l="${l}" class="${c}" title="${l}">${TABLO_SHORT[l] || l}</span>`).join('');
    $('keys').innerHTML = [0, 1, 2].map(i => `<div class="colcap">${i + 1}</div>`).join('') +
      [0, 1, 2].map(i => `<div class="col">${[7, 6, 5, 4, 3, 2, 1, 0].map(d => `<button class="key" data-k="c${i}${d}" data-col="${i}" data-d="${d}" aria-label="Digit ${i + 1}: ${d}">${d}</button>`).join('')}</div>`).join('');
    const press = e => { const b = e.target.closest('[data-k]'); if (b) key(b.dataset.k); };
    $('keys').addEventListener('click', press);
    document.querySelector('.fnkeys').addEventListener('click', press);
    $('swBlank').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', String(on)); $('vu').classList.toggle('blank', on); });
    const test = on => $('vu').classList.toggle('lamptest', on);
    $('swTest').addEventListener('pointerdown', () => test(true));
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('swTest').addEventListener(ev, () => test(false)));
    $('swTest').addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') test(true); });
    $('swTest').addEventListener('keyup', () => test(false));
    document.addEventListener('keydown', e => {
      if (e.target.closest('input,select,textarea')) return;
      if (e.target.closest('button') && (e.key === 'Enter' || e.key === ' ')) return;
      if (/^\d$/.test(e.key)) { key(e.key); e.preventDefault(); }
      else if (e.key === 'Enter' && document.activeElement === document.body) { key('ent'); e.preventDefault(); }
      else if (e.key === 'Backspace') { key('back'); e.preventDefault(); }
      else if (e.key === 'Escape') key('clr');
    });
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
  function zoneMap(pw, n) {
    const cells = Array.from({ length: n * n }, () => [0, 0]);
    S.fuel.forEach((f, i) => { const cx = Math.min(n - 1, Math.floor((f.x + 25) / 50 * n)), cy = Math.min(n - 1, Math.floor((f.y + 25) / 50 * n)); const c = cells[cy * n + cx]; c[0] += pw[i]; c[1]++; });
    return cells.map(c => c[1] ? c[0] / c[1] : null);
  }
  function printPrizma(by) {
    if (S.powerLost) return;
    const pw = SIM.channelPower(S), kr = Math.max(...pw), th = SIM.thermal(S), orm = SIM.ormPrizma(S);
    const z = zoneMap(pw, 10);
    const L = [];
    L.push({ ru: '======================== П Р И З М А ========================', en: by === 'СДИВТ' ? 'Scheduled printout, made every two hours on odd hours by the SKALA duty engineer and carried to the control room.' : 'PRIZMA printout requested from the control room.' });
    L.push({ ru: `БЛОК 4   ${S.date}   РАСЧЕТ ${clk(S.t, '.')}   ${S.skalaMode === 'ПАРНЫЙ' ? 'ПАРН.' : 'ПОЛУТ.'}` });
    L.push({ ru: `N ТЕПЛ  = ${fmt(th).padStart(6)} МВТ      N НЕЙТР = ${fmt(S.n * 100, 1).padStart(6)} %`, en: 'Thermal and neutron power.' });
    L.push({ ru: `ОЗР     = ${ru(orm, 1).padStart(6)} СТ.РР`, en: 'Operating reactivity margin: inserted absorber weighted by the axial flux, in equivalent manual rods.' });
    if (orm < 15) L.push({ ru: '***  ОЗР МЕНЕЕ 15 СТ.РР  ***', en: 'Below 15 rods: the regulations required an immediate shutdown.' });
    else if (orm < 26) L.push({ ru: '***  ОЗР МЕНЕЕ 26 СТ.РР  ***', en: "Below 26 rods: operation only with the chief engineer's permission." });
    L.push({ ru: `KR     = ${ru(kr, 2).padStart(6)}          KZ      = ${ru(SIM.kz(S), 2).padStart(6)}`, en: 'Radial and axial peaking factors.' });
    L.push({ ru: `WТК MAX = ${ru(th / 1661 * kr, 2).padStart(6)} МВТ   G КМПЦ  = ${fmt(SIM.flowM3(S)).padStart(6)} М3/Ч`, en: 'Hottest channel power and total coolant flow.' });
    L.push({ ru: `P БС    = ${ru(S.p, 1).padStart(6)}          T ВХ    = ${ru(inletT(), 1).padStart(6)} ГРАД`, en: 'Drum pressure and core inlet temperature.' });
    L.push({ ru: 'ОТН. МОЩНОСТЬ ПО ЗОНАМ (10 X 10, ВЕРХ = РЯД 66)', en: 'Relative channel power by zone. Illustrative: an estimate from rod positions, not a 2D calculation.' });
    for (let j = 0; j < 10; j++) L.push({ ru: '   ' + z.slice(j * 10, j * 10 + 10).map(v => v === null ? '    .' : ru(v, 2).padStart(5)).join('') });
    L.push({ ru: '=========================== КОНЕЦ ===========================' }, { cut: true });
    block('lpt', L); flash('lpt');
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
    $('endov').hidden = false; $('endov').querySelector('.card').scrollTop = 0; $('endRestart').focus({ preventScroll: true });
  }
  $('endRestart').addEventListener('click', () => { $('endov').hidden = true; init($('scenario').value); });
  $('endStay').addEventListener('click', () => { $('endov').hidden = true; });

  // ---------- desk controls ----------
  const GROUPS = [...[0, 1, 2, 3, 4, 5, 6, 7].map(g => ['RR' + g, 'Сектор ' + (g + 1)]), ['ALL', 'Все РР'], ['USP', 'УСП']];
  const groupRods = k => k === 'ALL' ? S.rods.filter(r => r.type === 'RR') : S.rods.filter(r => k.startsWith('RR') ? (r.type === 'RR' && r.group === +k.slice(2)) : r.type === k);
  function selRods() { return sel.kind === 'rod' ? [S.rods[sel.id]] : groupRods(sel.key); }
  function renderGroups() {
    const chips = GROUPS.map(([k, l]) => `<button class="chip" data-g="${k}" aria-pressed="${sel.kind === 'group' && sel.key === k}">${l}</button>`);
    if (sel.kind === 'rod') chips.unshift(`<button class="chip" aria-pressed="true" data-g="rod">Стержень ${S.rods[sel.id].ch}</button>`);
    $('groups').innerHTML = chips.join('');
  }
  $('groups').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b || b.dataset.g === 'rod') return; sel = { kind: 'group', key: b.dataset.g }; renderGroups(); });
  function move(dir) {
    if (S.scram || S.destroyed) { notice('AZ-5 has the rods. Manual drive is locked out.'); return; }
    S.singleMove = null; S.groupMove = {};
    if (!dir) return;
    if (sel.kind === 'rod') {
      const r = S.rods[sel.id];
      if (r.type === 'AR') { notice('AR rods are driven by the automatic regulator.'); return; }
      S.singleMove = { id: sel.id, dir };
      SIM.ev(S, `СТЕРЖЕНЬ ${r.ch} ${dir > 0 ? 'ВВОД' : 'ВЫВОД'}`, `${dir > 0 ? 'Inserting' : 'Withdrawing'} rod ${r.ch}`);
    } else {
      const keys = sel.key === 'ALL' ? [0, 1, 2, 3, 4, 5, 6, 7].map(g => 'RR' + g) : [sel.key];
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
  function buildPumps() { $('pumps').innerHTML = S.pumps.map((p, i) => `<button class="pump" data-p="${i}">ГЦН-${p.id}<b></b></button>`).join(''); }
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
    const moving = sel.kind === 'rod' ? (S.singleMove && S.singleMove.id === sel.id) : Object.keys(S.groupMove).length > 0;
    $('selInfo').textContent = (sel.kind === 'rod' ? `${rs[0].ch} · ${rs[0].type}` : `${GROUPS.find(g => g[0] === sel.key)[1]} · ${rs.length}`) + ` · ${ru(avg, 2)} м${moving ? ' · движение' : ''}`;
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
    if (!h) { tip.hidden = true; return; }
    tip.hidden = false; tip.style.left = h.mx + 'px'; tip.style.top = h.my + 'px';
    tip.textContent = `${h.r.ch} · ${TYPE_RU[h.r.type]}${h.r.type === 'AR' ? ' ' + (h.r.bank + 1) : ''} · ${ru(h.r.d, 2)} м${h.r.type === 'USP' ? ' снизу' : ''}`;
  });
  $('core').addEventListener('mouseleave', () => { $('coretip').hidden = true; });
  $('core').addEventListener('click', ev => { const h = rodAt(ev); if (!h) return; sel = { kind: 'rod', id: h.r.id }; renderGroups(); });
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
      setG('th', fmt(th), th > S.azmSet ? 'alarm' : (th > S.azmSet * 0.9 ? 'warn' : ''));
      setG('nn', fmt(S.n * 100, 1), S.n * P.PNOM > S.azmSet ? 'alarm' : '');
      setG('per', per === Infinity || per > 999 ? '---' : fmt(per, 1), per < 20 ? 'alarm' : per < 60 ? 'warn' : '');
      setG('pbs', ru(S.p, 1), S.p > 75 ? 'alarm' : S.p > 70 ? 'warn' : '');
      setG('lbs', fmt(S.L), S.L < -600 ? 'alarm' : Math.abs(S.L) > 100 ? 'warn' : '');
      setG('gcn', ru(SIM.flowM3(S) / 1000, 1), '');
      setG('gpv', fmt(S.Gfw * 3.6), '');
      setG('tin', ru(inletT(), 1), S.hy && S.hy.dTsub < 3 ? 'warn' : '');
    }
    const ax = SIM.sevenPoint(S);
    ax.forEach((v, i) => { const el = $('ax-' + i); if (el) el.style.width = (dead ? 0 : Math.min(100, v / 2.5 * 100)).toFixed(1) + '%'; });
    document.querySelectorAll('#pumps .pump').forEach((b, i) => {
      const p = S.pumps[i]; b.className = 'pump' + (p.tripped ? ' trip' : p.coast ? ' coast' : p.on ? ' on' : '');
      b.querySelector('b').textContent = p.tripped ? 'ОТКЛ ' + fmt(p.w * S.drk * P.PUMP_M3H) : fmt(p.w * S.drk * P.PUMP_M3H) + (p.coast ? ' выбег' : '');
    });
    $('testBtn').disabled = S.testStarted || S.destroyed;
    if (az5Armed && performance.now() > az5Armed && !S.scram) { $('az5').classList.remove('armed'); az5Armed = 0; }
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
        const d = Math.min(h, simDt); SIM.step(S, d); simDt -= d; n++;
        if (h > 0.05 && transient()) break;
        if (S.events.length > evIdx) drainEvents();
      }
      // SKALA calculation cycle: PRIZMA on request, and the duty engineer's printout on odd hours
      if (prizmaReq && S.t >= prizmaReq.at) { prizmaReq = null; printPrizma('СИУР'); }
      const hr = Math.floor(clockSec(S.t) / 3600);
      if (lastClockHour !== null && hr !== lastClockHour && (hr % 24) % 2 === 1 && !S.restarting) printPrizma('СДИВТ');
      lastClockHour = hr;
      drainEvents();
      if (sel.kind === 'rod' && S.singleMove) { const r = S.rods[S.singleMove.id], max = r.type === 'USP' ? P.USP_MAX : H; if (S.singleMove.dir > 0 ? r.d >= max : r.d <= 0) S.singleMove = null; }
      for (const k of Object.keys(S.groupMove)) { const v = S.groupMove[k], rs = groupRods(k), max = k === 'USP' ? P.USP_MAX : H; if (S.assistMove) continue; if (rs.every(r => v > 0 ? r.d >= max - 1e-6 : r.d <= 1e-6)) delete S.groupMove[k]; }
      if (!S.powerLost) { trend.push({ t: S.t, P: SIM.thermal(S) }); if (trend.length > 900) trend.shift(); }
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
      ? '<div class="pl empty">The drum printer is idle. Code 300 requests PRIZMA; the duty engineer also prints it every two hours on odd hours.</div>'
      : '<div class="pl empty">The last PRIZMA printout was carried to the control room at about 01:00 (ORM 17–19 by testimony, Karpan p.351). PRIZMA was not run again before the test. Code 300 requests one; it prints when the current 5-minute cycle ends.</div>';
    sel = { kind: 'group', key: 'RR0' }; renderGroups();
    $('az5').classList.remove('armed'); az5Armed = 0;
    vu.digs = [null, null, null]; vu.code = null; vu.val = ''; vu.unit = ''; vu.lamp = ''; vu.msg = 'Set a code in the three columns and press ВВОД. The request codes below list what you can ask for; 120 gives the simple ORM count.';
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
  document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('abbr.term'); if (el) { clearTimeout(bubShowT); bubShowT = setTimeout(() => showBub(el), 120); } });
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('abbr.term')) hideBub(); });
  bub.addEventListener('mouseenter', () => clearTimeout(bubHideT));
  bub.addEventListener('mouseleave', () => hideBub());
  document.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('abbr.term')) showBub(e.target); });
  document.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('abbr.term')) hideBub(400); });
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
