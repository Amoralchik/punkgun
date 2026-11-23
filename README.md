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
- Gamepad: left stick move, right stick aim, RT fire, LT throw, A dash, B reload, X interact, Y quickhack, START pause; D-pad focuses menus, A selects, B backs out

## Current Systems

- One-hit combat, armor plates, Second Heart, 22 cyberware implants with active-ability screen flashes, 19 perks including mutually exclusive capstones, neural-load/cyberpsychosis risk, dash, execution, kill combos and targeted quickhacks
- 12 firearm families, 8 named variants, 11 attachment mods, crafting, loadout presets, case overflow and filters
- Five operator roles, three lifepaths, six investable street businesses with street events, a five-ticker exchange and weapon insurance
- Safehouse stations: contracts, market, supplies, workbench, clinic, fabricator, archive, operator, sanctuary, deploy; confirmed NEW GAME reset, campaign reroll, NG+ (build/gear retained, boss armor/speed/adds scaled) and seeded daily contracts
- Four challenge stamps (Standard, Fists Only, Glass, Rush), faction broker hardware gated by standing, a daily clear bonus, local run history/leaderboard and a first-minute safehouse tour
- 12 contract modifiers, 8 objectives (purge, target, recover, sabotage, extraction, hunt, defense, boss) — the extraction case is a physical burden: x0.78 move speed, dash locked, HUD warning — faction storylines with attribute/reputation/role/lifepath dialogue checks and run boons, insertion approaches, faction reputation, seeded market stock and price drift
- Stealth takedowns, body discovery, fixed patrol routes, explosion noise sources, enemy vision cones, alert propagation, zero-detection ghost-run bonuses, flanking/cover/suppression squad AI and archetype combat-gym coverage
- Hazards: explosive barrels, security cameras, turrets, laser grids, breakable glass and steam vents
- Procedural district weather, holo ads, pooled neon light pools (static per-level lights plus dynamic muzzle/explosion/dash flashes), a film-grade post pass (grain, vignette, chromatic aberration), faction music layers, reload/death reactions, 4-frame walk cycles
- Accessibility: reduced motion, colorblind palettes, subtitles, event log, control presets, per-action key remapping, standard-mapping gamepad
- English/Spanish catalog for objectives, stations, boons, HUD events, manual, tour, authored/boss dialogue, contract taglines, handler lines, venture cards, street events, event replies, station notes, augment descriptions, attribute/path descriptions, role blurbs and archive prose; breach-protocol minigame rendered as a cyberspace dive (perspective grid, ICE cells)
- PWA/offline shell with install, offline and update status toasts, save v2 with three selectable slots, backup/quarantine recovery, export/import, fatal error boundary

## Tests

- `npm test` runs the Vitest suite (186 tests). Coverage includes save migration/recovery, market stock/drift, exchange, rooms, insurance, venture events, daily contracts, challenge modes, NG+, faction broker, lifepaths/endings, economy, inventory, seeding, campaign gates, dialogue checks/boons, objectives, bosses, progression/humanity, modifiers, effects, combat helpers, glass/steam and run settlement — including the extraction case-carry burden. `npm run test:gym` exercises all 16 archetypes against a committed target. `npm run test:balance` prints the three-build clear-rate matrix. `npm run smoke` exercises the production shell, authored dialogue choice, and one live deployment.

## Status

This is an actively developed 0.2.x prototype. The roadmap and remaining milestones are in [ROADMAP.md](./ROADMAP.md). Localization extraction and native Safari certification are not complete; Chromium, Firefox and WebKit-engine smoke paths pass.

## License

No license has been selected yet. Do not redistribute until one is added.
