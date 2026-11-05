# Corrections and contributions

This project tries to be exact about what is documented and honest about what is not. Corrections are the most valuable contribution, especially from people who worked with SKALA or RBMK control rooms, or who hold documents this project has not seen.

## Reporting a correction
Open an issue with:
1. **What is wrong**: the screen, printout, value or claim.
2. **What it should be.**
3. **Your source**: a document with page or figure number, a photograph, or first-hand experience (say which). Corrections without a source are still welcome, but will be marked "unverified" until one turns up.

Most wanted:
- The real SKALA request-code table, or more real codes in the grammar the Chornobyl Family reconstruction shows (for example П0N0000).
- What the console's unlabelled keys (ш, <>, п), the ВКЛ key and the "! ?" window do.
- Raw DREG signal identifiers beyond К06L005.
- An RBMK-1000 control-rod channel-assignment diagram showing which rods were РР, ЛАР and АЗ.
- The real numbering of the three АР banks.
- Photographs of the SIUR's request device on the unit 4 desk.

## Changing code
1. Edit files in `src/`. If you change a CSV in `references/`, run `python3 gen_data.py` in `src/`.
2. Run `python3 build.py` in `src/` to rebuild `index.html`.
3. Run `node tests/check.js`. Every line must say PASS.
4. Commit `src/`, `references/` and `index.html` together.

If a change moves a validated number (see `docs/validation.md`), say so in the pull request and explain why the new value is better supported.

## What not to add
- Scans or PDFs of books and reports. Add a reference with page numbers to `references/sources.md` instead.
- Invented detail presented as fact. If something must be invented to make the simulator work, label it on the page and in `docs/validation.md`.

## Licensing of contributions
By contributing, you agree that code you add is licensed under the Apache License 2.0 and content (documentation, data, translations) under CC BY-SA 4.0, as set out in [NOTICE](NOTICE). Do not add third-party material under other terms without saying so in your pull request.
