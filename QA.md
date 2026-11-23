# PUNKGUN QA & Compatibility

## Commands

```bash
npm run verify   # typecheck + Vitest + production build + budget
npm run package  # build + budget + release folder/tarball/SHA256SUMS
npm run smoke    # production preview + headless Chrome boot/deploy/pause smoke
```

Smoke output is `tmp-smoke/smoke.png`; it is disposable and gitignored.

## Browser matrix

| Browser | Target | Status |
|---|---|---|
| Chrome (evergreen, Windows) | primary | Smoke-tested headless (Chrome 157) + manual |
| Edge (evergreen, Windows) | primary Chromium | Smoke-tested headless (`npm run smoke:edge`) |
| Firefox (evergreen) | supported | Smoke-tested headless via Playwright (`npm run smoke:firefox`) |
| WebKit / Safari engine | QA target | Smoke-tested headless via Playwright (`npm run smoke:webkit`); native Safari not certified |
| Safari (macOS/iOS) | QA target, not a claim | WebKit engine proxy only; native Safari app not certified |
| WebGL unavailable | fail closed | `SIGNAL LOST` boot screen |
| WebGL context lost | recover | fatal boundary + reload CTA |

Minimum target: WebGL2-capable evergreen browser with ES2022 modules. The
service worker is scoped to `/`; a sub-path deploy requires manifest/SW URL
changes.

## Smoke coverage

`npm run smoke` boots the **production build** in headless Chrome, then verifies:

- no fatal overlay, canvas present, hub visible;
- browser selector: Chrome default, Edge with `--browser=edge`;
- Playwright browsers installed with `npx playwright install firefox webkit`;
- daily contract on the board, challenge selector, faction broker, run-history rendering, sanctuary diorama, exchange ticker/buy button, first-minute tour and lifepath new-game reset render;
- Chrome/Edge smoke covers the full hub path; Firefox/WebKit smoke covers boot/deploy;
- board has at least three contracts and save export is v2;
- every combat layout has a reachable exit and every cache/weapon spawn is reachable (unit test);
- deploy a non-boss contract, authored dialogue choice, simulation advance, HUD objective render;
- Escape opens the pause overlay and resume returns to play;
- return to safehouse restores the hub;
- NEW GAME arms, confirms, resets money/level and rebuilds the board;
- Workbench, Ventures and role selection render and act;
- no page exceptions or console errors along the path;
- screenshot captured for visual review.

It does not replace a human QA pass for audio, game feel, or all objective
types.

## Manual QA checklist

### Boot / shell
- [ ] Boot in a fresh profile with no save/localStorage.
- [ ] First-run manual opens; closing it sets `tutorialSeen`.
- [ ] Reload restores save/settings; theme/scanline settings persist.
- [ ] Service worker registers only in production; offline reload serves app shell.
- [ ] Corrupt primary save recovers from `.bak`; corrupt payload is quarantined.

### Hub / operator
- [ ] TAB terminal, E station interaction, ESC close.
- [ ] Contract board shows authored, generated, boss, and final states correctly.
- [ ] Chapter gate requires 3/6/9 clears and names the correct boss.
- [ ] Market stock counts decrease; refresh costs $50; rotation after two runs.
- [ ] Clinic shows neural load, risk %, capacity block, and rejection message.
- [ ] Presets save/equip/clear without duplicating stash items.
- [ ] Attachment mods apply magazine, pellet, spread, cooldown, reload and pierce effects.
- [ ] Role selection changes derived stats and survives save/reload.
- [ ] Ventures buy/upgrade, show costs/income, and pay after a clear.
- [ ] Archive unlocks dossiers and ending files.
- [ ] NEW GAME arms, confirms, wipes the slot, rerolls the campaign board and returns to the hub.
- [ ] NEW GAME does not change settings, keybinds, palette or volume.

### Contract / combat
- [ ] Authored contracts open faction dialogue; attribute/reputation choices show READY/LOCKED and apply boons.
- [ ] PAY, ARMOR, QUIET and COMPONENTS boons show in the brief and affect settlement/vision/plates.
- [ ] Purge, target, recover, sabotage, extraction, hunt, defense all complete.
- [ ] Every archetype attacks and closes correctly: `npm run test:gym`.
- [ ] Post-finale legendary bosses SERAPH and THE ARCHIVIST appear and their arenas are reachable.
- [ ] Three-build matrix prints and stays within its band: `npm run test:balance`.
- [ ] A committed enemy reacquires a close player instead of going idle behind its cone.
- [ ] Sabotage terminals and extraction case are visible and interactable.
- [ ] Defense timer only advances inside the marked zone; waves spawn.
- [ ] Hunt target flees and still shoots.
- [ ] Every boss has the right name/armor and phase adds.
- [ ] Rush timer, fog, sirens, swarm, black ice, no plates, overclocked,
      cyberpsycho, lockdown all apply.
- [ ] Exit opens only after the objective; extraction pays and returns gear.

### Accessibility
- [ ] Reduced motion disables shake, hit-stop, death slow-mo, slides, flashes.
- [ ] Colorblind palettes change UI and world tell colors.
- [ ] Subtitles can be disabled; dialogue/event log can be disabled.
- [ ] Control presets WASD/ESDF/ARROWS move and act correctly.
- [ ] Keyboard-only path: boot → terminal → deploy → pause → results.

### Performance
- [ ] 1080p target 60 fps in worst-case rooms; no unbounded pooling.
- [ ] `npm run budget` passes: app JS, vendor JS, total JS, CSS, initial gzip,
      largest chunk.
- [ ] `npm run smoke` samples JS heap under 160 MB (currently ~9 MB headless).
- [ ] No console errors on boot, run, death, win, safehouse.
- [ ] 30-minute session without save loss or softlock.
- [ ] `npm run soak` stays under the heap/growth limits with zero console errors.
- [ ] `npm run soak:long` completes 30 minutes without unbounded heap growth.
- [ ] CI verify/browser/soak/package jobs pass on the selected Node version.
- [ ] Scheduled 30-minute soak job completes with zero errors and bounded heap.

## Save recovery policy

- Primary key: `punkgun.save.v2` (slot 1), `.slot.2`, `.slot.3`.
- Previous known-good payload: `.bak`.
- Rejected payload: `.corrupt` (preserved for manual recovery).
- Future versions are rejected rather than coerced.
- v1 legacy raw profiles migrate to v2; legacy key is untouched.
- `OPERATOR → SAVE DATA` exports/imports validated JSON through the same sanitizer.

## Known limitations

- Firefox/Safari certification harness exists but the browser binaries were unavailable in this environment;
  Edge is certified and Chrome is smoke-tested.
- Localization extraction is underway: objectives, station labels/titles, boons and
  HUD event copy route through `src/core/i18n.ts`; station/manual/dialogue copy remains inline.
- Positional audio panning covers gameplay SFX through a stereo panner; music and ambience are centered beds.
- Deep module splits are partial: world objectives/doors/geometry/gym helpers, the
  Safehouse workbench and Game dialogue state are extracted; `world.ts`, `safehouse.ts`, and
  `game.ts` still carry the combat loop, station views and flow.
- Unknown/unsupported browsers fail to the fatal boundary rather than offering a
  reduced renderer.
