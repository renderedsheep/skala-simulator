# SKALA Simulator Training Manual

Fernand G. · October 2026 · version 3.1

## 1. Introduction

The SKALA simulator lets you sit at the controls of Chernobyl unit 4 and watch what its process computer saw, printed and missed. That includes the night of 26 April 1986. It runs in a web browser and needs no installation.

SKALA (СКАЛА, *Система контроля аппарата Ленинградской атомной*, "Leningrad NPP reactor monitoring system") was the data-logging and calculation computer for each RBMK-1000 unit. It was built around a pair of Soviet V-3M machines. It scanned thousands of sensors and logged discrete signals to its diagnostic recorder (DREG). Every five minutes it ran the PRIZMA program, which computed the power in each fuel channel and the reactor's operating reactivity margin (ORM). It did not control the reactor. The operators did that from the unit control board, using SKALA's numbers to guide them.

This is a **simulator, not an emulator**. The V-3M instruction set and the SKALA software were never published, so no original code can be run. Instead the simulator rebuilds SKALA's behaviour from its surviving output, including:

- printouts and teletype tape;
- message texts and timing;
- operator testimony.

The reactor model underneath uses the real control-rod map of unit 4.

This manual covers:

- how to read each part of the screen;
- how to operate the reactor and query SKALA;
- a set of training exercises, from routine operation to the 1986 sequence;
- a glossary of the Russian terms;
- a frank account of which parts are historical and which are reconstructed.

No background in nuclear engineering is assumed. Terms are explained the first time they appear and collected in the glossary.

### What the simulator is for

There is no score and no winning. The simulator is a way to explore what the operators faced and to test "what if?" questions against the record. There are three useful ways to use it:

- **Replay history.** Follow exercise 4: start the run-down test at 01:23:04, press AZ-5 at 01:23:40, then compare your run with the surviving record.
- **Try to get out of trouble.** From 01:22:30, try to bring the reactor to a safe state. The regulations required a shutdown once the margin fell below 15 rods, and how you do it matters. Inserting rods steadily is safe in this model, while driving in a large share of them at once triggers the same tip effect that destroyed the real reactor.
- **Learn the machine.** Run the full-power scenario, query SKALA, read the printouts and watch how xenon and the axial power shape change over hours.

When a run ends, a short debrief sums it up (section 2).

## 2. Getting started

Open `skala.html` (or `index.html`) in any modern browser (Chrome, Firefox, Edge or Safari) by double-clicking it, or open the published page. The simulation starts immediately, running in real time at the 01:22:30 state of 26 April 1986. Nothing needs installing. The internet is used only for the typefaces.

### The header

- **Scenario** picks the starting state. There are three:
    - *26.04.1986 01:22:30*: 200 MW, every rod where the record puts it.
    - *What-if, rods as at 00:39*: the same plant state, but with the deeper rod pattern of 00:39 (ORM 16.5).
    - *25.04.1986 01:05*: 3100 MW at the start of the power reduction, for routine operation.
- **Speed** runs the simulation paused, in real time (×1), or 10, 60 or 600 times faster. When anything fast happens (a scram, a power surge or a large reactivity change), the speed drops back to ×1 by itself, so you never skip the important seconds.
- **Date / Time** is the plant clock, shown on VFD tubes. Times on the printers follow this clock.

Terms with a dotted underline, including every reading on the unit control board and every lamp on the SKALA status panel, open a short definition when you hover over them or tap them. Many link to further reading. The pumps, the run-down test button and the regulator controls also explain themselves when you hover over them. Changing the scenario restarts it. The red line under the header shows short notices, such as "Run-down test started".

### The four areas of the screen

On a wide screen the page is laid out like a control-room wall in three bays, with two fold-out panels underneath. On a phone the bays stack in the same order.

| Area | Russian name | What it is for |
| --- | --- | --- |
| Left bay, reactor desk | Положение стержней СУЗ · Приборы БЩУ · Управление | Watching the core and the plant, driving rods, pumps, the test and AZ-5 |
| Middle bay, SKALA console | Вызывное устройство · Мнемосхема СКАЛА · Коды | Asking SKALA for values and programs, and seeing the computer's own state |
| Right bay, printers | Печать | Reading what SKALA printed: teletype, DREG listing, drum printer, and the 1986 archive |
| Fold-out panels | Скрытая физика · What is real here | The physics the operators could not see, and the sources and validation |

The operators' view and the hidden view are deliberately separate. In 1986 the shift saw only the desk, the SKALA console and the printers. The *Скрытая физика* panel shows what nobody in the room could see, such as the reactivity balance and the shape of the neutron flux. Use it to understand what happened, and keep it closed to experience the night as they did.

### When a run ends

A run ends when the reactor is destroyed, or when it has been shut down (below 2 MW) for ten seconds. A debrief then gives a one-line verdict, such as "Shut down safely" or "Survived a surge to about 1,200 MW", and lists:

- when the run-down test started, and whether AZ-5 was pressed or fired automatically;
- the peak power and the shortest reactor period;
- the operating margin at the start and at the end.

It adds a short note on what the result shows. Choose **Restart scenario** to try again or **Keep running** to carry on. If the reactor is destroyed, the debrief appears on the end screen alongside the human cost of the accident.

## 3. The rod-position panel

The large round panel shows all 211 control rods of unit 4 at their real positions, one dial each. It copies the wall of selsyn dial indicators facing the operators in the control room. Each dial shows how deep its rod is in the 7 m core.

### Reading a dial

- The needle points straight up when the rod is fully withdrawn.
- It turns clockwise as the rod goes in, reaching about 330° at full insertion (7 m).
- The УСП rods enter from **below**. Their needles show how far they have been pushed up, out of a maximum of about 3 m.
- Hover over a dial (or tap it on a phone) to see the channel number in the plant's grid, the rod type and its depth in metres. Example: "50-27 · АР 1 · 1,58 м".

### Rod types

| Ring colour | Type | Count | What it does |
| --- | --- | --- | --- |
| Dark grey | РР manual, ЛАР local-automatic, АЗ emergency | 175 | Main control and shutdown rods, driven from above. The sources do not say which is which. |
| Yellow | АР automatic regulator | 12 | Holds power at the setpoint, in three banks of four. |
| Blue | УСП shortened rods | 24 | Inserted from below to shape the power near the bottom of the core. |
| Black plate "Н" | Height detector cell | 12 | Not a rod. Holds detectors that measure the axial power shape. |

All rods except the АР rods carry a 4.5 m graphite "displacer" below the absorber, with a short water column at each end. This design detail is the key to section 7, exercise 4.

### The АР banks

The 12 automatic-regulator rods form three symmetric patterns: a square 2 m from the centre, a diamond 3 m out and a cross 1 m out. Only one bank is active at a time. The simulator numbers them 1, 2 and 3 in that order. The sources do not give the real bank numbers, so this is an assumption.

### Fuel channels

The small squares between the dials are the 1661 fuel channels. With *Fuel channels coloured by relative power* ticked, they shade from grey-green (low) through yellow to red (high). This colouring is an illustrative estimate, refreshed once a second. It is not a full two-dimensional calculation, and the operators had no such picture. Untick it to see the plain lattice. *Plant grid labels* turns the row and column numbers on and off. Rows run 66 to 12 and columns 11 to 65, the plant's own numbering.

### Selecting rods

Click a dial to select that rod for manual driving. To build your own group:

- **Shift-click** (or Ctrl-click, or ⌘-click on a Mac) dials to add or remove them.
- **Drag a box** across the panel with the mouse to select every rod inside it. Hold Shift while dragging to add to the current selection.
- On a phone or tablet, turn on **Multi-select** and tap dials.

The selection appears as the first chip in the *Управление* panel (section 4), for example "Выбрано · 18 стержней", and the ✕ next to it clears it. The panel's header shows the current selection, how many rods it holds and their mean depth, for example "СЕКТОР 1 · 16 · 0,18 М".

## 4. Instruments and controls

The unit control board (БЩУ) shows eight live readings on VFD tubes, a power trend and the axial power bars. Below it, the *Управление* panel holds everything you can operate.

### Readings

A window's frame turns amber for a warning and red for an alarm.

| Reading | Unit | Meaning | Amber / red |
| --- | --- | --- | --- |
| N тепл. | MW | Thermal power | Above 90 % of the overpower trip setting / above it |
| N нейтр. | % of nominal | Neutron power (3200 MW = 100 %) | — / above the trip setting |
| Период | s | Time for power to grow by a factor of e (about 2.7). Dashes mean power is steady or falling. | Under 60 s / under 20 s |
| P БС | kgf/cm² | Steam-drum pressure | Above 70 / above 75 |
| Уровень БС | mm | Steam-drum water level against normal | More than 100 off / below −600 |
| Расход | thousand m³/h | Coolant flow through the core, all pumps | — |
| Пит. вода | t/h | Feedwater flow | — |
| T вход | °C | Coolant temperature entering the core | Within 3 °C of boiling |

The overpower trip (АЗМ) is set at 530 MW in the two 1986 scenarios and 3520 MW at full power. A short period matters as much as high power. A 20 s period means power is multiplying by about 2.7 every 20 s.

The **trend** under the readings plots thermal power over recent plant time. The **ДКЭВ** bars beside it show power in each of seven 1 m slices of the core, top (7) to bottom (1). Watch them for a field that bulges at the top or the bottom.

### Driving rods

1. Pick what to move: a sector chip (*Сектор 1* to *12*, the dark-grey rods in twelve pie slices of the core), *Все РР* (all of them), *УСП*, or your own selection from the dial panel. Sectors are a simulator convenience, not plant groups.
2. Press **▲ Вывод** to withdraw or **▼ Ввод** to insert. Rods move at 0.4 m/s until they reach the end of travel or you press **■ Стоп**. АР rods in a selection are left to the regulator. There is no limit on how many rods move at once, but real operators moved rods singly or in small groups: moving dozens at once can trip the protections, or worse (exercise 7).

Withdrawing rods adds reactivity and inserting removes it. АР rods cannot be driven by hand. After AZ-5, manual drive is locked out.

### The automatic regulator (АР)

- **АР вкл. / откл.** switches the regulator on or off.
- **−100, −10, +10, +100** change its power setpoint in MW. The setpoint shows on the small VFD window.
- The three bars show each bank's depth. The active bank has an amber frame.
- When the active bank nears the top or bottom of its travel, SKALA logs "1 ПК-ВВЕРХ" or "1 ПК-ВНИЗ" on the DREG listing. Those were the real night's warnings that the regulator was running out of room.
- **Помощник СИУР** is a simulator aid, not a plant feature. It moves a few manual rods to keep the АР near mid-travel during long runs. It is on by default only in the full-power scenario.

### Pumps (ГЦН)

The eight main circulation pumps are 11 to 14 (left loop) and 21 to 24 (right loop). Click one to start or stop it. The stripe on the left of each pump shows its state:

- green: running;
- amber: running down with the coasting turbine;
- red: tripped.

A pump trips when its flow falls below 5000 m³/h.

### The run-down test

**Закрыть СРК ТГ-8** closes turbine 8's stop valves, as at 01:23:04. Pumps 13, 14, 23 and 24 are then fed by the coasting generator. As it slows, their flow falls, the water in the core warms towards boiling, and power creeps up.

### AZ-5

The red button scrams the reactor. The first tap lifts the guard cap; the second tap presses the button. Every rod except the УСП then drives in at 0.4 m/s, taking about 18 s for full travel. In 1986 the button had to be held down. Here one press is enough.

The protections can also scram the reactor without you. АЗМ trips on overpower, and АЗСР trips when the period falls below 20 s. Both print on the teletype and the DREG listing.

When a protection trips, the desk tells you at once. The AZ-5 button glows red, a notice under the header names the trip (for example "АЗСР: reactor period below 20 s · automatic AZ-5"), and the reading behind it flashes for 12 s: Период for АЗСР, the power readings for АЗМ. The teletype and DREG keep their real delays, so their messages arrive seconds later.

## 5. The SKALA console

SKALA answered questions; it did not volunteer them. To get a value, the senior reactor operator (СИУР) dialled a numeric code on the request device and waited for the number to come up on the digital display. ORM, the most important safety figure that night, was not on any continuous display.

### Making a request

1. Set the code on the column keyboard. Column 1 is the first digit, column 2 the second, column 3 the third. Pressing a key in a column sets that digit, and the pressed key stays lit. You can also type the three digits on a computer keyboard, or click a code in the *Коды* list.
2. Press **ВВОД** (enter). **СБРОС** clears everything and **← ШАГ** removes the last digit.
3. Wait. The value takes about 1.5 s of plant time to appear, with the **ЖДИТЕ** lamp lit. It then updates live, with **ГОТОВ** lit, until you request something else.

The keys run 0 to 7 only, as on the console in the photograph the design follows. That layout suggests octal entry, a common choice on Soviet computers of the period.

### The indicators

- **Код**: the code being set or last accepted, on cyan-filtered tubes.
- **Значение**: the value, on green tubes, with its unit on the black plate beside the caption. A decimal point is a lit dot after a digit.
- The **lamp strip** (табло) reports status:
    - ПРИНЯТ: request accepted;
    - ЖДИТЕ: wait;
    - ЗАНЯТО: SKALA is busy, for example restarting;
    - ПЕЧАТЬ: sent to a printer;
    - ДРЕГ ВЫКЛ: the DREG recorder is off;
    - ОШИБКА: wrong or incomplete code (the value window shows "Е");
    - НЕТ СИГН.: the sensor no longer responds;
    - ГОТОВ: value on display.
- **Гашение** (blanking) is a toggle switch that turns the tubes off. **Контроль индик.** lights every segment while you hold it, to check for dead segments.

### The codes

The real SKALA code table has not been published, so every number below is invented for the simulator. (The one raw SKALA code we do know, К06L005, is a DREG signal identifier, not a request code.)

| Code | Russian name | What you get |
| --- | --- | --- |
| 101 | Тепловая мощность | Thermal power, MW |
| 102 | Нейтронная мощность | Neutron power, % of nominal |
| 103 | Давление в БС | Drum pressure, kgf/cm² |
| 104 | Уровень в БС | Drum level, mm |
| 105 | Расход через реактор | Coolant flow, m³/h |
| 106 | Расход питательной воды | Feedwater flow, t/h |
| 107 | Температура на входе | Core inlet temperature, °C |
| 110 | Положение активной группы АР | Depth of the active АР bank, m |
| 111 | Недогрев на входе | Inlet subcooling: how far below boiling the incoming water is, °C |
| 120 | ОЗР по положению стержней | A quick ORM count from rod positions alone, in rods |
| 130 | Kz по СФКРЭ | Axial peaking factor (peak to average power along the height) |
| 300 | Расчёт ПРИЗМА | Queues a full PRIZMA calculation. It prints when the current 5-minute cycle ends. |
| 310 | Картограмма СУЗ | Prints a map of every rod's depth in cm on the drum printer |
| 400 | Срез параметров в ДРЕГ | Writes a snapshot of key parameters to the DREG tape |
| 410 | Перезарядка ленты ДРЕГ | Reloads the DREG tape. Recording stops for 60 s. |
| 420 | Перезапуск СКАЛЫ | Restarts SKALA from punched tape. DREG is off for 6 min 39 s. |

**Two ORM figures, and why they differ.** Code 120 simply adds up inserted rod length. PRIZMA (code 300) weights each rod by the local neutron flux, which is how the plant defined ORM. A rod sitting where the flux is low counts for less than the quick count suggests. In the full-power scenario the two differ by almost a factor of two (about 44 rods against 24). Request both and compare.

### PRIZMA timing

SKALA recalculated core parameters about every five minutes. The mode line under the mnemonic panel counts down to the next cycle ("РАСЧЕТ ЧЕРЕЗ … С"). The duty engineer (СДИВТ) also printed PRIZMA every two hours, on odd hours, and carried it to the control room. On 26 April the last printout before the test was made at about 01:00.

### The mnemonic panel (Мнемосхема СКАЛА)

Each lamp is one part of the computer system:

- the two V-3M processors (А and Б) and power;
- the DREG program and its tape;
- PRIZMA;
- the two RTA-80 teletypes and the drum printer (АЦПУ);
- the punched-tape reader;
- the sensor inputs.

The colours mean:

- green: working normally;
- amber: busy;
- blinking: waiting or restarting;
- red: fault;
- dark: off.

The КРВ lamp is named in SKALA sources but not simulated. The mode line also shows the operating mode (ПАРНЫЙ ВАРИАНТ, the paired two-machine mode, or the 1.5 mode) and the current DREG cycle number.

## 6. Printers and records

Most of what survives from the night of 26 April is paper. The *Печать* bay has one tab for each output device SKALA drove, plus an archive of the real record. An amber dot on a tab means new output has arrived there. **English gloss** adds an italic translation and explanation under each line. Turn it off to read the printouts as the staff did.

### РТА-80 teletype

The teletype printed urgent messages: emergency protection, system start-up and the restart banner. It is slow. At 7 characters per second, one message takes several seconds, and you watch it type. The time format follows the surviving tape, with no leading zero on the hour, for example `1.23.39 АВАР ЗАЩИТА 5`. If SKALA loses power mid-line, the line stops where it was, as the real second message did after 15 characters.

### ДРЕГ listing

DREG (the diagnostic recorder) logged discrete signals and selected parameters. It was low priority, so it collected events and wrote them in cycles every 2 to 4 s. That is why its times run about a second behind the teletype. DREG wrote to magnetic tape. What people read was a line-printer listing made from that tape, so the tab shows it on fanfold paper. The teletype stays on its paper roll: РТА stands for рулонный телеграфный аппарат, "roll telegraph machine".

- Each cycle starts with its number, such as **№135Д**.
- A line starting with **=0** means that signal has gone off. For example, `=0 НЕИСПРАВНОСТЬ …` means the fault has cleared.
- Once a minute DREG records the positions of nine rods.
- One line carries a raw signal code, **К06L005 =1**: "pressure rise in the reactor space", the sign that fuel channels have burst. It is the only raw DREG code known from the sources. Other lines show the message text only.

Code 410 (tape reload) and code 420 (restart) leave gaps in the tape. On 26 April DREG was off from 01:23:48 to 01:40:35 for lack of power.

### АЦПУ drum printer

The drum printer prints long reports on green-barred fanfold paper.

- **PRIZMA** (code 300, and on odd hours automatically) gives:
    - thermal and neutron power;
    - ORM, flagged with "ОЗР МЕНЕЕ 26" or "МЕНЕЕ 15" when low (the regulations required an immediate shutdown below 15 rods, and operation below 26 rods needed the chief engineer's permission);
    - the radial and axial peaking factors (KR, KZ);
    - the hottest channel's power and the coolant flow;
    - drum pressure and inlet temperature;
    - a 10 × 10 map of relative power across the core.
- **The rod cartogram** (code 310) prints every rod's depth in cm on the plant grid, in the layout Karpan reproduces. It ends with the total inserted length and the number of displacer rods sitting within 1 m of the top.

The printout layouts are reconstructions. No original PRIZMA sheet layout is reproduced here.

### Архив 26.04.86

This tab is a reference, not a simulation. It holds the surviving teletype lines and the DREG lines of the last seconds, with their cycle numbers, transcribed from Karpan and the Sturm–Plaskov transcript. Compare it with your own run.

## 7. Training exercises

The exercises build from reading the panels to replaying the accident and testing alternatives. Each takes 5 to 15 minutes. Do them in order the first time.

### Exercise 1: Read the plant (01:22:30 scenario)

1. Choose the 01:22:30 scenario and press pause (❚❚).
2. On the dial panel, find the yellow АР rods and the blue УСП rods. Note how few УСП needles have moved, and how close most dark-grey needles sit to the top.
3. Press ×1. Request **101** (power), then **105** (flow), then **111** (subcooling).
4. Request **120**. This is the quick ORM count: about 7 rods.
5. Request **300** and wait for the next 5-minute cycle (watch the mode line). Read the PRIZMA sheet on the АЦПУ tab.

**What to notice.** ORM is far below the 15-rod limit, at which the regulations demanded a shutdown. Nothing on the desk says so. You had to ask.

### Exercise 2: Routine power reduction (full-power scenario)

1. Choose the 25.04.1986 01:05 scenario. The Помощник СИУР aid is on.
2. Lower the АР setpoint by 100 MW at a time, waiting for power to settle each time, down to about 1600 MW.
3. Run at ×600 for an hour or two of plant time. Request **300** every half hour.
4. Watch the ДКЭВ bars and code **130** (Kz).

**What to notice.** Xenon builds up after a power cut and steadily eats the margin, so the АР and the aid must keep withdrawing rods. The axial field also drifts slowly towards the top or the bottom. Try levelling it with the УСП group. This is the slow background to the night.

### Exercise 3: Hold at 01:22:30

1. Choose the 01:22:30 scenario and run at ×10 for ten minutes of plant time without touching anything.
2. Watch the DREG tab for "1 ПК-ВВЕРХ" and the АР bank bars.

**What to notice.** The reactor holds about 200 MW. The state is not visibly unstable. That is what made it dangerous.

### Exercise 4: The 26 April sequence

1. Choose the 01:22:30 scenario and leave the speed at ×1.
2. At **01:23:04** on the clock, press **Закрыть СРК ТГ-8**.
3. Over the next half-minute, watch:
    - flow (Расход) falling;
    - T вход rising towards boiling;
    - power creeping up while the АР fights it.
4. At **01:23:40**, press AZ-5 (two taps).
5. Watch the period and power windows, the teletype and the DREG tab. Do not touch anything else.
6. Read the end screen, which sets out the human cost of the accident and names the 30 people who died in 1986. Then open the Архив tab and compare your run's times with the record.

**What to notice.** Power rises *after* AZ-5. The rods start from near the top, so their graphite displacers first push water out of the bottom of the channels before any absorber arrives. Water absorbs neutrons and graphite does not, so this adds reactivity at the bottom, where the field was already being pushed. The overpower trip (АЗМ) comes about 3 s after AZ-5, as in the record. The core is destroyed about 5 s after AZ-5. The teletype stops mid-message when SKALA loses power. Open *Скрытая физика* and repeat the run to see the reactivity terms and the axial flux during those seconds.

### Exercise 5: The same test with the 00:39 rods

1. Choose the *What-if, rods as at 00:39* scenario.
2. Repeat exercise 4 exactly.

**What to notice.** With more rods deep in the core and most УСП covering the bottom, power peaks at about 400 MW and no protection trips. Same plant, same test, same button. The difference is the rod pattern, which is what ORM measures.

### Exercise 6: AZ-5 without the test

1. Choose the 01:22:30 scenario.
2. Press AZ-5 straight away, without starting the run-down test.

**What to notice.** In this model the core is still destroyed, about 7 s after AZ-5. The state itself, with a low margin and a top-heavy field and rods parked high, was the hazard. The test only set the timing. INSAG-7 reached a similar conclusion: a scram from this state was dangerous whether or not the test ran.

### Exercise 7: Can you rescue it?

This is open exploration. The simulator does not promise an answer. Starting from 01:22:30, try to raise ORM before running the test. For example, insert one sector at a time while the АР holds power, or push in the УСП group. Check your progress with codes **120** and **300**. Then run exercise 4. Record:

- the ORM you reached;
- the power you held;
- whether the run survived.

The debrief at the end tells you whether you shut down cleanly or rode out a surge. Remember that the model is very sensitive near this edge (section 9). Treat a single result as a clue, not a proof.

### Exercise 8: Running SKALA

1. In any scenario, request **420** to restart SKALA from punched tape, as the duty engineer did twice that night.
2. Watch the mnemonic panel: the punched-tape lamp blinks, PRIZMA goes dark and DREG stops for 6 min 39 s.
3. Try code **410** (DREG tape reload) during exercise 4 and see what is missing from the record afterwards.

**What to notice.** The computer was a tool with its own downtime. Every gap in its record is a gap in what investigators could later know.

## 8. Glossary

| Term | Russian | Meaning |
| --- | --- | --- |
| АЗ-5 (AZ-5) | аварийная защита 5-й род | Emergency protection, level 5: full scram, all rods in |
| АЗ-1, -2, -3 | аварийная защита | Partial power reductions to set levels |
| АЗМ | аварийная защита по мощности | Overpower trip |
| АЗСР | аварийная защита по скорости разгона | Trip on a short reactor period (power rising too fast) |
| АР | автоматический регулятор | Automatic power regulator and its 12 rods |
| АЦПУ | алфавитно-цифровое печатающее устройство | Alphanumeric (drum) line printer |
| БС | барабан-сепаратор | Steam drum, where steam is separated from water |
| БЩУ | блочный щит управления | Unit control room / control board |
| ГЦН | главный циркуляционный насос | Main circulation pump |
| ДКЭВ | датчик контроля энерговыделения по высоте | Axial (height) power detector |
| ДРЕГ (DREG) | диагностическая регистрация | SKALA's diagnostic event recorder |
| ЛАР | локальный автоматический регулятор | Local automatic regulator rods. On 26 April control passed from ЛАР to АР at 00:28, when power fell to about 30 MW. |
| ОЗР (ORM) | оперативный запас реактивности | Operating reactivity margin: how much absorber is in the core, in equivalent fully inserted manual rods |
| ПК | перекомпенсация | Overcompensation signal: the АР rods are near the end of their travel |
| ПРИЗМА (PRIZMA) | — | SKALA's core-calculation program, run about every 5 minutes |
| РР | ручное регулирование | Manual control rods |
| РТА-80 | — | The teletype model SKALA printed on |
| СДИВТ | старший дежурный инженер вычислительной техники | SKALA's senior duty engineer, in the computer room |
| СИУР | старший инженер управления реактором | Senior reactor control engineer, the operator at the reactor desk |
| СРК | стопорно-регулирующий клапан | Turbine stop and control valve |
| СУЗ | система управления и защиты | Control and protection system, including all 211 rods |
| ТГ-8 | турбогенератор 8 | Turbine-generator 8, used for the run-down test |
| УСП | укороченные стержни-поглотители | Shortened absorber rods, inserted from below |
| VFD | вакуумный люминесцентный индикатор (ИВ) | Vacuum fluorescent display: the green-glowing digit tubes |
| Period | период реактора | Time for power to grow by a factor of about 2.7 |
| Displacer | вытеснитель | 4.5 m graphite section below each rod's absorber |
| Xenon | ксенон | A fission product that absorbs neutrons strongly. It builds up for hours after a power reduction. |
| $ (dollar) | — | Unit of reactivity. Above +1 $ the reactor runs away on prompt neutrons alone. |

## 9. What is historical and what is reconstructed

The simulator reproduces the documented 1986 sequence, but the reactor model and much of SKALA's interface are reconstructions. Use it to understand the mechanisms, not as evidence of exact numbers.

### From the documents

- All 211 rod positions at 00:39 and 01:22:30, and which rods are АР and УСП, with the 12 detector cells. These come from Karpan's maps, cross-checked cell by cell against INSAG-7.
- The pre-accident axial flux shape (INSAG-7 Fig. II-5), the pump numbering, the run-down pumps and their trip times, and the coolant flow during the test.
- Teletype speed, message format and cut-off. DREG cycle numbering, the "=0" convention, the message texts and the one raw code К06L005.
- PRIZMA's 5-minute cycle and the odd-hour printouts. The SKALA restart time and the paired mode.

### Reconstructed or invented

- **Not an emulator.** The SKALA software and the V-3M instruction set are not public.
- **Invented:**
    - the request code numbers;
    - the printout layouts;
    - which nine rods DREG logs.
- **Console look.** The VFD tubes, the 0–7 column keyboard, the function keys and the Гашение switch follow a photograph of a SKALA console. Its controls (cabinet power-on, subprogram start) suggest it is the duty engineer's panel in the computer room, not the СИУР's request device. Using its style for the request device is a design choice. The digital readouts on the reactor desk are also styled as VFD tubes for consistency. The real desk relied mostly on dial meters and chart recorders.
- **Physics.** The model is a 28-slice model of the core's height with simple kinetics, not a 3D calculation. The fuel-channel positions and their colouring are estimates. The xenon distribution at 01:22:30 was never measured, so it is worked backwards from the measured flux shape.
- **Rod types.** The sources do not separate the 139 РР, 12 ЛАР and 24 АЗ rods. An earlier version guessed that the 24 rods reading 7 cm were the АЗ group. Their scattered layout ruled that out, and the guess was withdrawn.
- **Tuning.** The explosion timing depends on one tuned parameter: how strongly the water in the rod channels absorbs neutrons. Changing it by 7 % either way stops the 01:22:30 explosion or makes the 00:39 case trip. INSAG-7 reports the same extreme sensitivity in the Soviet 3D models.
- **Simulator aids.** The СИУР aid, the rod sectors and the hidden-physics panel did not exist.

### Validation

| Check | Record | Simulator |
| --- | --- | --- |
| ORM at 01:22:30 from the real rods (not tuned) | 6–8 rods | 6.4 |
| ORM from the 00:39 rods | 16.5 | 14.3 |
| Coolant flow just before AZ-5 | 51 000 m³/h | 50 400 |
| Overpower trip after AZ-5 | about 3 s | 2.7 s |
| Core destroyed after AZ-5 | about 5 s | 5.4 s |

### Sources

- IAEA, [INSAG-7: The Chernobyl Accident, Russian edition](https://www-pub.iaea.org/MTCD/Publications/PDF/Pub913r_web.pdf), 1993.
- N.V. Karpan, *Чернобыль. Месть мирного атома*, Kyiv, 2005. Part IV is online at [accidont.ru](http://accidont.ru/memo/Karpan_03.html).
- L. Sturm and R. Plaskov, [DREG protocol transcript](https://archive.org/details/dreg-protocol-last-40-seconds-of-chernobyl), CC BY-NC 4.0.
- A.S. Dyatlov, [Чернобыль. Как это было](http://lib.ru/MEMUARY/CHERNOBYL/dyatlow.txt_with-big-pictures.html).
- Hackaday, [Inside SKALA: How Chornobyl's Reactor Was Actually Controlled](https://hackaday.com/2026/03/03/inside-skala-how-chernobyls-reactor-was-actually-controlled/), 2026, on the Chornobyl Family reconstruction.
- Chornobyl Family, [Exploring SKALA: Chernobyl Reactor Control Computer](https://www.youtube.com/watch?v=ZbaptQh2AM4), 2023. Covers the duty engineer's console and the request devices.
