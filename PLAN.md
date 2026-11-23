# PUNKGUN — Implementation Plan & Status

Last refreshed: 2026-11-23. This file tracks the gap between the backlog and the
shipping build. `ROADMAP.md` remains the long-range design plan; this is the
working checklist.

## Baseline audit (verified)

- TypeScript + Vite + Three.js; 82 unit tests; production build and budget pass.
- Save v2 with three slots, export/import, last-known-good backup, corrupt-payload
  quarantine, and startup recovery reporting.
- PWA app shell, offline fallback, packaged static release.
- Readable one-hit combat, armor plates, stealth, hazards, patrols, boss phases.
- Browser smoke test: boot → board → deploy → pause → return to safehouse.

## Backlog status

| Backlog item | Before | Now | Remaining |
|---|---:|---:|---|
| Combat layouts | 6 | **10** | target met; add combat gym variation |
| Enemy archetypes | 11 | **14** | Hit target; add combat-gym coverage |
| Bosses | 1 | **4** | optional boss-rush/NG+ variants |
| Guns / named | 6 / 4 | **12 / 8** | optional more named paths |
| Cyberware | 10 | **22** | active-ability VFX polish |
| Perks | 4 | **15** | mutually exclusive capstones |
| Attributes + checks | 4 | 4 + derived + dialogue checks | broader skill checks |
| Modifiers | 4 | **12** | setpiece-only modifiers |
| Authored contracts | 3 random + boss/final | **12 authored + 3 random + 4 bosses** | more faction-specific voice |
| Dialogue | linear boss briefing | **faction beats + choices + checks + reputation deltas + story flags + run boons** | more consequence payoffs |
| Objectives | 4 | **8** (purge, target, recover, boss, sabotage, extraction, hunt, defense) | objective-specific bespoke rooms |
| Endings | 1 | **3** (burn, broadcast, vanish) | branch epilogue scenes |
| New game flow | reset only | **confirmed new-game reset + campaign reroll** | ending-screen shortcut |
| Enemy AI | sticky chase bug | **longer memory + close-range reacquire + no enemy-friendly fire** | flanking/cover coordination |
| Combat gym | none | **14-archetype gym + three-build clear-rate matrix** | deeper difficulty tuning |
| Chapters | 1 gate + final | **3 chapters + final** | faction storyline branches |
| Save recovery | none | backup + quarantine + migration | slot UI polish |
| PWA / offline | shell | shell + cache v2 + smoke | offline update prompt |
| Browser matrix / QA | manual | **Chrome + Edge smoke; Firefox/WebKit Playwright harnesses** | Firefox/Safari certification runs |
| Performance budgets | manual | enforced `npm run budget` + smoke heap check | long-session sampling |
| Accessibility | partial | reduced motion, palettes, subtitles, log, control presets | arbitrary key capture |
| Localization readiness | none | **typed catalog: objectives, stations, boons, HUD events** | extract station/manual/dialogue copy, add locale |
| Deep module splits | not started | **world objectives + gym helper; Safehouse workbench; Game dialogue session** | player/AI/bullets/doors; station views |
| Multi-frame animation | 2-frame sway | **4-frame walk** + reload/death | boss-specific choreography |
| Weather / holo ads / lighting | weather | **weather + animated holo ads + contract palettes** | fog volumes, dynamic lights |
| Music / ambience | one bed + boss mode | **faction patterns + intensity + boss layers** | positional SFX panning |
| Onboarding / manual / settings | partial | controls, palettes, subtitles, log | first-minute guided station tour |

## Tranche status

1. **Release guardrails** — done: save backup/quarantine, budget gate, smoke test,
   QA matrix, PWA cache version.
2. **Operator depth** — done: 22 cyberware, 15 perks, humanity/cyberpsychosis,
   ripperdoc rejection risk, 12 weapon families / 8 named, loadout presets,
   stock rotation, price drift, faction discounts across stations.
3. **Contract depth** — done: 8 objectives, 12 modifiers, 12 authored contracts,
   three chapter gates, four bosses, three endings, ending archive entries.
4. **Presentation** — done for this tranche: 4-frame walk, holo ads, contract
   palettes, fog/blackout, faction music layers, positional SFX, subtitles/log.
   Remaining: bespoke boss choreography and full localization extraction.
5. **Scale** — layouts and archetypes hit target; faction storylines and a
   three-ending campaign are in. Remaining: NG+, dailies and challenge modes.
6. **Architecture** — partial: World objectives/gym, Safehouse workbench and Game
   dialogue are split out; continue with World player/AI/bullets/doors and station views.

## Next sequence

1. Tune the three-build clear-rate matrix: shield/flank behavior and encounter density.
2. Continue the split: World player/AI/bullets/doors and Safehouse station views.
3. Extract remaining station/manual/dialogue strings and add a second locale fixture.
4. Install Firefox/WebKit binaries and run the Playwright certification harnesses.
5. Add long-session memory sampling and more consequence payoffs.

## Non-goals (unchanged)

Multiplayer, open world, mobile/console-first controls, full voice acting,
engine rewrite, photoreal art, live-service monetization.
