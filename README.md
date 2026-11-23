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
npm run smoke       # headless production boot/deploy/pause smoke
```

The production build is an installable PWA with a service-worker app shell and offline fallback. Deployment instructions, budgets, and the QA matrix are in [RELEASE.md](./RELEASE.md) and [QA.md](./QA.md). Implementation status is tracked in [PLAN.md](./PLAN.md).

## Controls

- `WASD` move, mouse aim (WASD/ESDF/ARROWS presets in Settings)
- `LMB` strike/shoot, `R` reload, `RMB` throw weapon
- `E` interact / pick up / backstab / kick doors / plant taps / secure cases
- `Q` use packed supply
- `SHIFT` Sandevistan, `C` Optical Camo, `X` EMP, `V` Berserk, `G` Overclock, `H` Intrusion Deck
- `TAB` safehouse terminal, `M` mute

## Current Systems

- One-hit combat, armor plates, Second Heart, 22 cyberware implants, 15 perks, neural-load/cyberpsychosis risk
- 12 firearm families, 8 named variants, attachments, crafting, loadout presets
- Safehouse stations: contracts, market, supplies, workbench, clinic, fabricator, archive, operator, deploy; confirmed NEW GAME reset and campaign reroll
- 12 contract modifiers, 8 objectives (purge, target, recover, sabotage, extraction, hunt, defense, boss), faction storylines with attribute/reputation dialogue checks and run boons, insertion approaches, faction reputation, seeded market stock and price drift
- 10 combat layouts, 14 enemy archetypes, 4 bosses across three campaign chapters plus a branching three-ending finale
- Stealth takedowns, body discovery, enemy vision cones, alert propagation
- Hazards: explosive barrels, security cameras, turrets, laser grids
- Procedural district weather, holo ads, faction music layers, reload/death reactions, 4-frame walk cycles
- Accessibility: reduced motion, colorblind palettes, subtitles, event log, control presets
- PWA/offline shell, save v2 with backup/quarantine recovery, export/import, fatal error boundary

## Tests

`npm test` runs the Vitest suite (75 tests). Coverage includes save migration/recovery, market stock/drift, economy, inventory, seeding, campaign gates, dialogue checks/boons, objectives, bosses, progression/humanity, modifiers, effects, combat helpers, hazards, and run settlement. `npm run smoke` exercises the production shell, authored dialogue choice, and one live deployment.

## Status

This is an actively developed 0.1.x prototype. The roadmap and remaining milestones are in [ROADMAP.md](./ROADMAP.md). Localization extraction and cross-browser certification are not complete.

## License

No license has been selected yet. Do not redistribute until one is added.
