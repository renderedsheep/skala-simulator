# SKALA Simulator Training Manual

Fernand G. · October 2026 · version 3.2

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

Terms with a dotted underline, including every reading on the unit control board and every lamp on the SKALA status panel, open a short definition when you hover over them or tap them. Many link to further reading. The pumps, the run-down test button, the regulator controls and every control on the SKALA request device also explain themselves when you hover over them. Changing the scenario restarts it. The red line under the header shows short notices, such as "Run-down test started".

### The four areas of the screen

On a wide screen the page is laid out like a control-room wall in three bays, with two fold-out panels underneath. On a phone the bays stack in the same order.

| Area | Russian name | What it is for |
| --- | --- | --- |
| Left bay, reactor desk | Положение стержней СУЗ · Приборы БЩУ · Управление | Watching the core and the plant, driving rods, pumps, the test and AZ-5 |
| Middle bay, SKALA console | Вызывное устройство · Клавиатура 2 · Мнемосхема СКАЛА · Коды | Asking SKALA for values, running its programs, and seeing the computer's own state |
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

SKALA answered questions; it did not volunteer them. Every reactor operator had a request device (вызывное устройство), and SKALA's own engineers had the same device in the computer room. There were no screens. Answers came up on two indicator assemblies called display sets. ORM, the most important safety figure that night, was not on any continuous display: you had to ask for it.

The layout of the device and the way its codes are built follow the Chornobyl Family reconstruction, made with former Chernobyl staff. It is based on the later, modernized system of unit 3, and section 9 says what else it rests on. In the control room the keyboard and the display sets were separate pieces; here they share one panel, as on the console in the computer hall.

### How a code is built

A request code has seven characters, one from each column of the left keyboard, and narrows from broad to specific:

| Column | Keys | Meaning | Examples |
| --- | --- | --- | --- |
| 1 | М Т Д Н П А Я К (Cyrillic) | The system | Я reactor, П steam generation, Т turbine, Н pumps, К channel by channel |
| 2 | 0–7 | A part of the system | 0 the whole system; 1 and 2 its left and right halves |
| 3 | X K N S H P G t (Latin) | The quantity | N power, G flow, P pressure, S position, t temperature, H level |
| 4–7 | 0–7 | The component or place | 0000 for the whole system, or a channel's coordinates |

So П0N0000 means steam generation, whole system, power: the reactor's thermal power. Channel-by-channel codes start with К, and their last four digits are the channel's coordinates in the plant grid, row then column, as the hover label on each dial shows. К0S5027 gives the depth of the rod in channel 50-27. The coordinates are octal, which is why the grid numbers never contain an 8 or a 9.

### Making a request

1. Press one key in each of the seven columns. Each pressed key stays lit. You can also type the code on a computer keyboard: for the first letter use m, t, d, n, p, a, r (for Я) or k, and for the third x, k, n, s, h, p, g or t. Backspace removes the last character and Escape clears the code.
2. In the row of keys below, choose what you want back. **ПРМ** (parameter) returns the value. The other four return one of its setpoints.
3. Check that **ИЗМ** (measure) is lit, then flip **ЗАМЕР 1** or **ЗАМЕР 2** to send the answer to display set 1 or 2. Enter and Shift+Enter do the same.
4. Wait. The answer takes about 1.5 s of plant time to appear. It then stays live until you replace it.

Clicking a code in the *Коды* list keys it in and measures it on set 1.

### The display sets

Each display set has three rows:

- **Знач.** (value): the answer, with its unit on the black plate beside it. A decimal point is a lit dot after a digit.
- **Откл.** (deviation): how far the value is from the nearest setpoint, in percent. The bar in front of the number sits low when the value is below that setpoint and high when it is above. The real symbol is not documented, so the bars are a stand-in. The row reads 000000 when the parameter has no setpoint.
- **Код**: the request, on alphanumeric tubes.

The **ГАШЕНИЕ** switches blank a set without clearing it.

### Setpoints

A setpoint is a threshold. Crossing a warning setpoint raises an alarm; reaching an emergency setpoint means the state is no longer permitted. The four setpoint keys are:

- ПП: warning, on rising;
- АП: emergency, on rising;
- ПС: warning, on falling;
- АС: emergency, on falling.

For example, П0N0000 with ПП gives 3264 MW, 2 % above nominal, and with АП gives 3520 MW. К0S0000 (ORM) has ПС 26 and АС 15 rods, the limits of 1986 (section 6). SKALA answers with an error code in the deviation row when something is wrong: **301** means there is no such code, and **303** means the parameter has no such setpoint.

**ЗАП** (write) stores a new setpoint. Key the code, choose the setpoint type, enter the number on the right keyboard, press ЗАП and flip ЗАМЕР. At the plant, SKALA's programmers did this from setpoint charts drawn up by the process engineers. Here a new setpoint only changes SKALA's deviation readout. The overpower and short-period trips (АЗМ and АЗСР) belong to the separate, hardwired protection system and are not affected.

### The codes

| Code | Russian name | What you get | Source |
| --- | --- | --- | --- |
| П0N0000 | Тепловая мощность реактора | Thermal power, MW | video |
| Т0N7100 | Электрическая мощность блока | Electrical output of the unit, MW (rough estimate) | video |
| К0S0000 | ОЗР | ORM in rods, from SKALA's last 5-minute calculation | video |
| К5N0000 | Максимальная мощность канала | Highest fuel-channel power, MW | video |
| К0Sррсс | Положение стержня СУЗ | Depth in m of the rod in channel рр-сс, measured from its upper limit switch | video |
| К0Gррсс | Расход через канал | Flow through one channel, m³/h (the model gives the core average) | video |
| К0Nррсс | Мощность канала | Power of one fuel channel, MW | follows its rules |
| К0G0000, К1G0000, К2G0000 | Расход через реактор | Total coolant flow, then the left and right loops, m³/h. SKALA first shows how many channels it counted. | follows its rules |
| Я0N0000 | Нейтронная мощность | Neutron power, % of nominal | invented |
| Я0K0000 | Kz по СФКРЭ | Axial peaking factor (peak to average power along the height) | invented |
| П0P0000 | Давление в БС | Drum pressure, kgf/cm² (П1… and П2… for the left and right drums) | invented |
| П0H0000 | Уровень в БС | Drum level, mm | invented |
| П0G0000 | Расход питательной воды | Feedwater flow, t/h | invented |
| Н0t0000 | Температура на входе | Core inlet temperature, °C | invented |
| Н0G00NN | Расход ГЦН | Flow of pump NN (11–14, 21–24), m³/h | invented |
| Т1N7100, Т2N7100 | Мощность ТГ-7, ТГ-8 | Output of each turbine-generator, MW (rough estimate) | invented |

"Video" means the code itself appears in the Chornobyl Family video. "Follows its rules" means the code is built by a rule stated there, but the exact code is not shown. "Invented" codes are this simulator's own, written in the same grammar. The video also shows three codes for the nitrogen-helium gas around the graphite (Я0G4211, Я0P4211 and Я0P4311). They are in the list, but that system is not modelled.

**ORM is not live.** К0S0000 shows the result of SKALA's last 5-minute calculation, so it can be up to five minutes old. Watch the countdown on the mode line (see PRIZMA timing below) and ask again after it. The *Скрытая физика* panel shows the live value, which nobody in the control room had.

### The right keyboard: numbers and subprograms

The second keyboard enters numbers and starts programs.

- **Numbers:** one key in each of the four black columns gives the digits, − or + the sign, and a red key 0–4 the decimal exponent, which sets where the decimal point goes. Reading the red key as the number of decimal places (0293 with red 2 is 2.93) is an assumption.
- **Program keys 1–10:** the program selector, which sets how SKALA presents the answer (on which МТК display or printer, for example). The chosen program's lamp lights.
- **ЗАПУСК** starts the program and **ПРЕРЫВ** interrupts it.

To run a subprogram, press only **М** on the left keyboard, choose a program key, set the four-digit subprogram number and press ЗАПУСК. The video's example is program 4 (or 8), subprogram 0301: a search for channels with low coolant flow, which lights them up on one of the two large МТК channel displays. The МТК is not built here, so that search only reports itself. The simulator's own subprograms, all under program 1, are:

| Subprogram | Russian name | What it does |
| --- | --- | --- |
| 0300 | Расчёт ПРИЗМА | Queues a full PRIZMA calculation. It prints when the current 5-minute cycle ends. |
| 0310 | Картограмма СУЗ | Prints a map of every rod's depth in cm on the drum printer |
| 0400 | Срез параметров в ДРЕГ | Writes a snapshot of key parameters to the DREG tape |

Clicking one in the *Коды* list does all the steps for you. ПРЕРЫВ cancels a queued PRIZMA run.

Some controls are on the console but their purpose is not described in the sources: the ВКЛ key, the three unlabelled keys in the setpoint row, the ВКЛ 1 and ВКЛ 2 switches and the small "! ?" window. They do nothing here.

### PRIZMA timing

SKALA recalculated core parameters about every five minutes, ORM included. The mode line under the mnemonic panel counts down to the next cycle ("РАСЧЕТ ЧЕРЕЗ … С"). The duty engineer (СДИВТ) also printed PRIZMA every two hours, on odd hours, and carried it to the control room. On 26 April the last printout before the test was made at about 01:00.

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

Two buttons under the panel stand in for jobs the duty engineer did in the computer room: **Перезарядка ленты ДРЕГ** reloads the DREG tape (recording stops for 60 s), and **Перезапуск СКАЛЫ** restarts SKALA from punched tape (DREG is off and SKALA answers no requests for 6 min 39 s). They are simulator shortcuts, not request-device functions.

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

Reloading the tape and restarting SKALA (the two buttons under the mnemonic panel) leave gaps in the tape. On 26 April DREG was off from 01:23:48 to 01:40:35 for lack of power.

### АЦПУ drum printer

The drum printer prints long reports on plain white perforated fanfold paper. Its rotating drum carried every character, and a hammer for each print position struck the paper as the right character came round, so it printed whole lines at once. The machine weighed around 300 kg.

- **PRIZMA** (subprogram 0300, and on odd hours automatically) gives:
    - thermal and neutron power;
    - ORM, flagged with "ОЗР МЕНЕЕ 26" or "МЕНЕЕ 15" when low (the regulations required an immediate shutdown below 15 rods, and operation below 26 rods needed the chief engineer's permission);
    - the radial and axial peaking factors (KR, KZ);
    - the hottest channel's power and the coolant flow;
    - drum pressure and inlet temperature;
    - a 10 × 10 map of relative power across the core.
- **The rod cartogram** (subprogram 0310) prints every rod's depth in cm on the plant grid, in the layout Karpan reproduces. It ends with the total inserted length and the number of displacer rods sitting within 1 m of the top.

The printout layouts are reconstructions. No original PRIZMA sheet layout is reproduced here.

### Архив 26.04.86

This tab is a reference, not a simulation. It holds the surviving teletype lines and the DREG lines of the last seconds, with their cycle numbers, transcribed from Karpan and the Sturm–Plaskov transcript. Compare it with your own run.

## 7. Training exercises

The exercises build from reading the panels to replaying the accident and testing alternatives. Each takes 5 to 15 minutes. Do them in order the first time.

### Exercise 1: Read the plant (01:22:30 scenario)

1. Choose the 01:22:30 scenario and press pause (❚❚).
2. On the dial panel, find the yellow АР rods and the blue УСП rods. Note how few УСП needles have moved, and how close most dark-grey needles sit to the top.
3. Press ×1. Request **П0N0000** (thermal power) on set 1 and **К0G0000** (coolant flow) on set 2. Then put **Н0t0000** (inlet temperature) on set 2.
4. Request **К0S0000** on set 1. ORM is about 6 rods, and the deviation row shows how far below the nearest setpoint it is. Choose **АС** and measure again: 15 rods, the emergency setpoint.
5. Run subprogram **0300** under program 1 and wait for the next 5-minute cycle (watch the mode line). Read the PRIZMA sheet on the АЦПУ tab.

**What to notice.** ORM is far below the 15-rod limit, at which the regulations demanded a shutdown. Nothing on the desk says so. You had to ask.

### Exercise 2: Routine power reduction (full-power scenario)

1. Choose the 25.04.1986 01:05 scenario. The Помощник СИУР aid is on.
2. Lower the АР setpoint by 100 MW at a time, waiting for power to settle each time, down to about 1600 MW.
3. Run at ×600 for an hour or two of plant time. Keep **К0S0000** (ORM) on one display set and print PRIZMA (subprogram 0300) every half hour.
4. Watch the ДКЭВ bars and put **Я0K0000** (Kz) on the other set.

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

This is open exploration. The simulator does not promise an answer. Starting from 01:22:30, try to raise ORM before running the test. For example, insert one sector at a time while the АР holds power, or push in the УСП group. Check your progress with **К0S0000**, remembering that it updates only every 5 minutes, or print PRIZMA. Then run exercise 4. Record:

- the ORM you reached;
- the power you held;
- whether the run survived.

The debrief at the end tells you whether you shut down cleanly or rode out a surge. Remember that the model is very sensitive near this edge (section 9). Treat a single result as a clue, not a proof.

### Exercise 8: Running SKALA

1. In any scenario, press **Перезапуск СКАЛЫ** under the mnemonic panel to restart SKALA from punched tape, as the duty engineer did twice that night.
2. Watch the mnemonic panel: the punched-tape lamp blinks, PRIZMA goes dark and DREG stops for 6 min 39 s. Try a request in the meantime.
3. Press **Перезарядка ленты ДРЕГ** during exercise 4 and see what is missing from the record afterwards.

**What to notice.** The computer was a tool with its own downtime. Every gap in its record is a gap in what investigators could later know.

## 8. Glossary

| Term | Russian | Meaning |
| --- | --- | --- |
| АЗ-5 (AZ-5) | аварийная защита 5-го рода | Emergency protection, level 5: full scram, all rods in |
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
| ЗАМЕР | замер | Measurement: the switch that sends a request and puts the answer on display set 1 or 2 |
| ИЗМ / ЗАП | измерение / запись | Measure or write: the request device's two modes. ЗАП stores a setpoint. |
| Комплект индикации | — | Display set: one of two indicator assemblies showing value, deviation from the nearest setpoint and code |
| ЛАР | локальный автоматический регулятор | Local automatic regulator rods. On 26 April control passed from ЛАР to АР at 00:28, when power fell to about 30 MW. |
| МТК | — | The large wall displays with one lamp per channel, used by SKALA's channel-search programs |
| ОЗР (ORM) | оперативный запас реактивности | Operating reactivity margin: how much absorber is in the core, in equivalent fully inserted manual rods |
| ПК | перекомпенсация | Overcompensation signal: the АР rods are near the end of their travel |
| ПП, АП, ПС, АС | уставки | The four setpoint types: warning and emergency, on rising (ПП, АП) and on falling (ПС, АС) |
| ПРИЗМА (PRIZMA) | — | SKALA's core-calculation program, run about every 5 minutes |
| ПРМ | параметр | The key that returns a parameter's value rather than a setpoint |
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

### From the Chornobyl Family reconstruction

Chornobyl Family rebuilt the request device with help from former Chernobyl staff, and showed how it works in a [video](https://www.youtube.com/watch?v=1JSP_gVXZTs). Their reconstruction follows the modernized SKALA of unit 3, which ran until 2000, not unit 4 as it was in April 1986. They say the basic principles stayed largely the same, but codes and details of 1986 may have differed. From it come:

- the two keyboards and the two display sets, with their three rows;
- the code grammar (system, part, quantity, four digits), and channel coordinates in the last four digits;
- the ПРМ, ПП and АП keys, the ИЗМ and ЗАП modes, and the ЗАМЕР switches;
- error codes 301 and 303, and the 000000 shown when no setpoint is defined;
- the codes П0N0000, Т0N7100, К0S0000, К5N0000, К0S and К0G with channel coordinates, and the three gas-system codes;
- subprogram 0301 under program 4 or 8, and the red keys as a decimal exponent.

The plant grid backs up one detail independently: its numbers never use the digits 8 or 9, so the coordinates are octal. Some details were read from the video's automatic transcript and may be wrong. The transcript calls the reactor letter "R". There is no Р key, so it is taken here to be Я. The setpoint values in the video are the builders' own examples. Its ORM limits, 43 rods for a warning and 30 for a shutdown, are the rules brought in after 1986, so the simulator keeps the 1986 limits of 26 and 15.

### Reconstructed or invented

- **Not an emulator.** The SKALA software and the V-3M instruction set are not public.
- **Invented:**
    - every request code not marked "video" or "follows its rules", and the subprogram numbers 0300, 0310 and 0400;
    - the printout layouts;
    - which nine rods DREG logs.
- **Request device details.** Reading ПС and АС as the falling setpoints, the bars used as the deviation symbol, the red keys as a count of decimal places, and the placement of the two computer-room buttons are guesses or design choices. The look of the tubes is styled, not copied. The digital readouts on the reactor desk are styled as VFD tubes for consistency, although the real desk relied mostly on dial meters and chart recorders.
- **Electrical output.** The model has no turbine, so Т0N7100 is a rough estimate from thermal power, and after the stop valves close, from the load of the four coasting pumps.
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
- Chornobyl Family, [Exploring SKALA: Chernobyl Reactor Control Computer](https://www.youtube.com/watch?v=ZbaptQh2AM4), 2023.
- Chornobyl Family, [We rebuilt Chernobyl's SKALA (Chernobyl reactor at home, part 2)](https://www.youtube.com/watch?v=1JSP_gVXZTs), 2026: the request device and its codes. Hackaday's write-up: [Using Your Own RBMK Reactor Control Center At Home](https://hackaday.com/2026/07/13/using-your-own-rbmk-reactor-control-center-at-home/).
