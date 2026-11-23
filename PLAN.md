# PUNKGUN — Implementation Plan & Status

Last refreshed: 2026-11-23. This file tracks the gap between the backlog and the
shipping build. `ROADMAP.md` remains the long-range design plan; this is the
working checklist.

## Baseline audit (verified)

- TypeScript + Vite + Three.js; 75 unit tests; production build and budget pass.
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
| Dialogue | linear boss briefing | **faction beats + choices + attribute/reputation checks + run boons** | branching consequences and more checks |
| Objectives | 4 | **8** (purge, target, recover, boss, sabotage, extraction, hunt, defense) | objective-specific bespoke rooms |
| Endings | 1 | **3** (burn, broadcast, vanish) | branch epilogue scenes |
| Chapters | 1 gate + final | **3 chapters + final** | faction storyline branches |
| Save recovery | none | backup + quarantine + migration | slot UI polish |
| PWA / offline | shell | shell + cache v2 + smoke | offline update prompt |
| Browser matrix / QA | manual | QA matrix + smoke | Firefox/Safari certification |
| Performance budgets | manual | enforced `npm run budget` + smoke heap check | long-session sampling |
| Accessibility | partial | reduced motion, palettes, subtitles, log, control presets | arbitrary key capture |
| Localization readiness | none | typed catalog seam for event copy | extract remaining UI copy, add locale |
| Deep module splits | not started | not started | World/Safehouse/Game splits |
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
4. **Presentation** — in progress: 4-frame walk, holo ads, contract palettes,
   faction music layers, subtitles/log. Remaining: positional SFX, fog volumes,
   bespoke boss choreography, localization extraction.
5. **Scale** — open: 3–4 new layouts, 1–4 enemy archetypes, faction storylines,
   NG+/dailies/challenge modes.
6. **Architecture** — open: split `World`, `Safehouse`, `Game`; route strings
   through a message catalog.

## Next sequence

1. Build a combat gym for the 14 archetypes, including freighter/nightclub hazards,
   and tune threat tells/clear rates.
2. Add branching dialogue consequences, more checks, and archive entries per path.
3. Split `World` into player/AI/bullets/doors/objectives modules behind the
   existing `World` facade, then repeat for `Safehouse` and `Game`.
4. Extract remaining user-visible strings to the typed catalog and add a second
   locale fixture.
5. Add Firefox/Safari smoke certification and long-session memory sampling.

## Non-goals (unchanged)

Multiplayer, open world, mobile/console-first controls, full voice acting,
engine rewrite, photoreal art, live-service monetization.
