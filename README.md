# PUNKGUN

Fast, lethal, top-down cyberpunk contract shooter for the browser. Enter a sector, read the room, kill quickly, extract, upgrade, repeat.

Built with TypeScript, Vite, and Three.js. All art, texture, and audio content is procedural; the repository contains no external asset packs.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Default dev port is `5188`.

## Verify and Package

```bash
npm run verify      # typecheck + unit tests + production build + budget
npm run package     # build + budget + release/punkgun-<version>/ + .tar.gz
npm run smoke         # headless Chrome production boot/deploy/pause smoke
npm run smoke:edge    # same smoke in Edge
npm run smoke:firefox # same smoke in Firefox (Playwright)
npm run smoke:webkit  # WebKit/Safari-engine smoke (Playwright)
npm run soak          # 60s headless heap/error soak (SOAK_MS=25000 for quick)
npm run soak:long     # 30-minute heap/error soak (--minutes=N supported)
# Playwright browsers: npx playwright install firefox webkit
```

CI runs verify, browser smokes, a soak and packaging on push/PR via [.github/workflows/ci.yml](./.github/workflows/ci.yml).

Packaging emits a tarball plus `SHA256SUMS.txt` for artifact verification. The production build is an installable PWA with a service-worker app shell and offline fallback. Deployment instructions, budgets, and the QA matrix are in [RELEASE.md](./RELEASE.md) and [QA.md](./QA.md). Implementation status is tracked in [PLAN.md](./PLAN.md).

## Controls

- `WASD` move, mouse aim (WASD/ESDF/ARROWS presets in Settings)
- `LMB` strike/shoot, `R` reload, `RMB` throw weapon, `SPACE` dash
- `E` interact / pick up / backstab / execute stunned enemies / kick doors / plant taps / secure cases
- `Z` targeted quickhack (requires an Intrusion Deck), `Q` use packed supply
- `SHIFT` Sandevistan, `C` Optical Camo, `X` EMP, `V` Berserk, `G` Overclock, `H` Intrusion Deck
- `TAB` safehouse terminal, `M` mute
- Menus: `TAB` / `SHIFT+TAB` move focus, `ENTER` or `SPACE` activates the focused control, `ESC` backs out; gameplay shortcuts pause while a form control or remap capture has focus
- Gamepad: left stick move, right stick aim, RT fire, LT throw, A dash, B reload, X interact, Y quickhack, START pause; D-pad focuses menus, A selects, B backs out

## Current Systems

- One-hit combat, armor plates, Second Heart, 22 cyberware implants with active-ability screen flashes, 19 perks including mutually exclusive capstones, neural-load/cyberpsychosis risk, dash, execution, kill combos and targeted quickhacks; enemy lasers only ignite in the final aim window and thicken before the shot, grenade markers pulse faster as the fuse ends, hounds flash a leap tell, netrunners announce their channel, boss charges add a dedicated red ring plus warning, off-screen aim/hack/charge threats mark the screen edge, and squad flankers/suppressed troopers paint cyan/mint route chevrons
- Death report names the responsible enemy or hazard, the attack, bearing, range and dash state, then gives one actionable correction; retry and safehouse exits are real focusable buttons
- Seven-step first-run safehouse tour (contract board through extraction and upgrade loop), dismissible, replayable from the safehouse TOUR button, and fully localized
- First-use field tips for armor break, empty magazine, executable stuns and the opening run; each retires permanently, is localized, and can be switched off in Settings
- 12 firearm families, 8 named variants, 11 attachment mods, crafting, loadout presets, case overflow and filters
- Five operator roles, three lifepaths, six investable street businesses with street events, a five-ticker exchange and weapon insurance
- Safehouse stations: contracts, market, supplies, workbench, clinic, fabricator, archive, operator, sanctuary, deploy; the clinic previews the exact next-rank stat delta and neural-load change before purchase; confirmed NEW GAME reset, campaign reroll, NG+ (build/gear retained, boss armor/speed/adds scaled) and seeded daily contracts
- Four challenge stamps (Standard, Fists Only, Glass, Rush), faction broker hardware gated by standing, a daily clear bonus, local run history/leaderboard and a first-minute safehouse tour
- 12 contract modifiers, 8 objectives (purge, target, recover, sabotage, extraction, hunt, defense, boss) placed room-aware — case in the farthest non-exit room, terminals across guarded rooms, defense zone in the largest arena — and the extraction case is a physical burden: x0.78 move speed, dash locked, HUD warning — faction storylines with attribute/reputation/role/lifepath dialogue checks and run boons, insertion approaches, faction reputation, seeded market stock and price drift
- Stealth takedowns, body discovery, fixed patrol routes, explosion noise sources, enemy vision cones, alert propagation, zero-detection ghost-run bonuses, flanking/cover/suppression squad AI and archetype combat-gym coverage
- Hazards: explosive barrels, security cameras, turrets, laser grids, breakable glass and steam vents
- Procedural district weather, holo ads, pooled neon light pools (static per-level lights plus dynamic muzzle/explosion/dash flashes), a film-grade post pass (grain, vignette, chromatic aberration), faction music layers, reload/death reactions, 4-frame walk cycles
- Accessibility: reduced motion, colorblind palettes, subtitles, event log, first-use field tips (toggleable), control presets, per-action key remapping, standard-mapping gamepad
- English/Spanish catalog for objectives, stations, boons, HUD events, manual, tour, authored/boss dialogue, contract taglines, handler lines, venture cards, street events, event replies, station notes, augment descriptions, attribute/path descriptions, role blurbs and archive prose; breach-protocol minigame rendered as a cyberspace dive (perspective grid, ICE cells)
- PWA/offline shell with install, offline and update status toasts, save v2 with three selectable slots, backup/quarantine recovery, export/import, fatal error boundary; archive prose ships as a lazy JSON asset fetched on first archive open

## Tests

- `npm test` runs the Vitest suite (267 tests). Coverage includes save migration/recovery, market stock/drift, exchange, rooms, insurance, venture events, daily contracts, challenge modes, NG+, faction broker, lifepaths/endings, economy, inventory, seeding, campaign gates, dialogue checks/boons, objectives, bosses, progression/humanity, modifiers, effects, combat helpers, glass/steam, run settlement, death-report composition, first-use field tips, upgrade preview deltas, active cyberware activation, player attack/shotgun/suppressed/melee paths, hound/medic/operator/netrunner/grenadier actions, squad cover/flank and boss-charge decisions, perception/alert/body-discovery rules, heat/reinforcement waves, defense/extraction pressure, mission completion/boss-rush exits, enemy aim windows, edge-threat projection, squad intent and keyboard focus rules — including the extraction case-carry burden. `npm run test:gym` exercises all 16 archetypes against a committed target. `npm run test:balance` prints the three-build clear-rate matrix. `npm run smoke` exercises the production shell, native keyboard activation and focus containment, room-based tour replay, a live deployment, a first-use field tip, an active cyberware activation, a live player shot, clinic upgrade previews, netrunner/boss telegraphs, off-screen threat markers, squad intent markers, the lazy archive asset and the structured death overlay.

## Status

This is an actively developed 0.2.x prototype. The roadmap and remaining milestones are in [ROADMAP.md](./ROADMAP.md). Localization extraction and native Safari certification are not complete; Chromium, Firefox and WebKit-engine smoke paths pass.

## License

No license has been selected yet. Do not redistribute until one is added.
