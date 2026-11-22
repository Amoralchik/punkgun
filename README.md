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
npm run verify      # typecheck + unit tests + production build
npm run package     # build + release/punkgun-<version>/ + .tar.gz
```

The production build is an installable PWA with a service-worker app shell and offline fallback. Deployment instructions and the performance budget are in [RELEASE.md](./RELEASE.md).

## Controls

- `WASD` move, mouse aim
- `LMB` strike/shoot, `R` reload, `RMB` throw weapon
- `E` interact / pick up / backstab / kick doors
- `Q` use packed supply
- `SHIFT` Sandevistan, `C` Optical Camo (when installed)
- `TAB` safehouse terminal, `M` mute

## Current Systems

- One-hit combat, armor plates, Second Heart, cyberware and perks
- Pistol/shotgun/SMG/rifle/AK/LMG, named variants, attachments
- Safehouse stations: contracts, market, supplies, workbench, clinic, fabricator, archive, operator, deploy
- Contract modifiers, insertion approaches, faction reputation, economy
- Boss with armor phases, radial shockwaves, telegraphed charges, and an exposed weak core
- Stealth takedowns, body discovery, enemy vision cones, alert propagation
- Hazards: explosive barrels, security cameras, turrets, laser grids
- Procedural district weather and ambience, reload/death reactions, reduced-motion accessibility
- PWA/offline shell, save export/import, fatal error boundary

## Tests

`npm test` runs the Vitest suite. Current coverage focuses on save migration, economy, inventory, seeding, effects, combat helpers, hazards, and run settlement.

## Status

This is an actively developed 0.1.x prototype. The roadmap and remaining milestones are in [ROADMAP.md](./ROADMAP.md). Localization extraction and cross-browser certification are not complete.

## License

No license has been selected yet. Do not redistribute until one is added.
