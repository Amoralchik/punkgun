# PUNKGUN — Implementation Plan & Status

Last refreshed: 2026-11-23. This file tracks the gap between the backlog and the
shipping build. `ROADMAP.md` remains the long-range design plan; this is the
working checklist.

## Baseline audit (verified)

- TypeScript + Vite + Three.js; 151 unit tests; production build and budget pass.
- Save v2 with three slots, export/import, last-known-good backup, corrupt-payload
  quarantine, and startup recovery reporting.
- PWA app shell, offline fallback, packaged static release.
- Readable one-hit combat, armor plates, stealth, hazards, patrols, boss phases.
- Browser smoke test: boot → board → deploy → pause → return to safehouse.

## Backlog status

| Backlog item | Before | Now | Remaining |
|---|---:|---:|---|
| Combat layouts | 6 | **12** | target exceeded; add district-specific setpieces |
| Enemy archetypes | 11 | **16** | target exceeded; tune squad compositions |
| Bosses | 1 | **6 + all-boss rush + NG+ scaling + intro cards + phase pulses + laser hazards + finale grade** | ending-specific setpieces |
| Guns / named | 6 / 4 | **12 / 8** | optional more named paths |
| Attachments | 4 | **11 with mag/pellet/spread/cooldown/reload/pierce effects** | balance pass |
| Cyberware | 10 | **22** | active-ability VFX polish |
| Operator roles | 0 | **5 roles with distinct economy/combat identity** | role-specific dialogue checks |
| Hacking/breach | none | **Breach grid on terminals, cameras and turrets** | safes and network chains |
| Ventures | 0 | **6 businesses × 3 ranks** | room visuals and event chains |
| Perks | 4 | **17** | mutually exclusive capstones |
| Attributes + checks | 4 | 4 + derived + dialogue checks | broader skill checks |
| Modifiers | 4 | **12** | setpiece-only modifiers |
| Authored contracts | 3 random + boss/final | **12 authored + 3 random + 6 bosses** | more faction-specific voice |
| Dialogue | linear boss briefing | **faction beats + choices + checks + reputation deltas + story flags + run boons** | more consequence payoffs |
| Objectives | 4 | **8** (purge, target, recover, boss, sabotage, extraction, hunt, defense) | objective-specific bespoke rooms |
| Endings | 1 | **4** (burn, broadcast, vanish, remember) | branch epilogue scenes |
| New game flow | reset only | **confirmed reset, lifepath selection, NG+, ending-screen shortcut** | — |
| Enemy AI | sticky chase bug | **longer memory + close-range reacquire + no enemy-friendly fire** | flanking/cover coordination |
| Stealth | takedowns only | **vision cones, body discovery, alert propagation, ghost-run bonus** | patrol routes, noise sources |
| Combat gym | none | **16-archetype gym + three-build matrix + risk-scaled density + high-risk squads** | setpiece tuning |
| Chapters | 1 gate + final | **3 chapters + final** | faction storyline branches |
| Save recovery | none | backup + quarantine + migration | slot UI polish |
| PWA / offline | shell | **shell + cache v2 + smoke + offline/update toast** | native install prompt |
| Browser matrix / QA | manual | **Chrome, Edge, Firefox and WebKit smokes pass** | native Safari remains uncertified |
| Performance budgets | manual | **enforced budget + smoke heap + soak + `soak:long` + scheduled CI long soak** | observed 30-minute pass |
| Accessibility | done for this tranche | **reduced motion, palettes, subtitles, log, presets, remap, gamepad + menu navigation** | text-entry gamepad keyboard |
| Localization readiness | done for this tranche | **English/Spanish catalog for gameplay copy, dialogue, manual, tour, stations, ventures, augments and archive prose** | keep new copy in the catalog |
| Deep module splits | partial | **world player/bullets/objectives/AI/doors/geometry/gym; all Safehouse station views; hub; client boot; settings; breach; dialogue; endings; pause/manual/tour; mission brief** | run flow split |
| Multi-frame animation | 2-frame sway | **4-frame walk** + reload/death | boss-specific choreography |
| Weather / holo ads / lighting | weather | **weather + animated holo ads + contract palettes** | fog volumes, dynamic lights |
| Music / ambience | one bed + boss mode | **faction patterns + intensity + boss layers** | positional SFX panning |
| Onboarding / manual / settings | partial | **localized tour/manual, controls, palettes, subtitles, log, arbitrary key remap** | dialogue localization |

## Tranche status

1. **Release guardrails** — done: save backup/quarantine, budget gate, smoke test,
   QA matrix, PWA cache version.
2. **Operator depth** — done: 22 cyberware, 17 perks, humanity/cyberpsychosis,
   ripperdoc rejection risk, 12 weapon families / 8 named, loadout presets,
   stock rotation, price drift, faction discounts across stations.
3. **Contract depth** — done: 8 objectives, 12 modifiers, 12 authored contracts,
   three chapter gates, six bosses, four endings, ending archive entries.
4. **Presentation** — done for this tranche: 4-frame walk, holo ads, contract
   palettes, fog/blackout, faction music layers, positional SFX, subtitles/log.
   Remaining: bespoke boss choreography and full localization extraction.
5. **Scale** — layouts and archetypes hit target; faction storylines and a
   three-ending campaign are in. Remaining: NG+, dailies and challenge modes.
6. **Architecture** — partial: World objectives/gym, Safehouse workbench and Game
   dialogue are split out; continue with World player/AI/bullets/doors and station views.

## Next sequence

1. Split Game flow orchestration.
2. Extract remaining station/manual/dialogue strings into the catalog.
3. Extend breach interactions to cameras, safes and security networks.
4. Tune encounter density and squad compositions from the 16-archetype gym.
5. Add long-session memory sampling and an ending-screen new-game shortcut.

## 0.2 CITY PRESSURE status

- Core fixes: NaN run counters normalized, overflow extraction preserved, lockdown
  doors close/seat behind the player, sirens shift reinforcement waves.
- Combat: Space dash, kill combo + HUD, stunned-target execution, Z targeted
  quickhack, two mobility perks, hound/medic archetypes, squad flanking, cover and
  suppression.
- Space: 12 combat layouts including rooftops and neon alley; breakable glass,
  steam vents, district palettes/decals, district weather.
- Safehouse/economy: sanctuary room upgrades with diorama, five-ticker exchange
  and dividends, twelve venture events, weapon insurance, faction broker stock,
  case overflow/capacity/filters, seeded daily contract, four challenge stamps,
  NG+ with retained build, local run history/leaderboard, and a first-minute
  safehouse tour.
- Story: three lifepaths, role/lifepath dialogue checks, Sublevel REMEMBER choice,
  fourth secret ending, epilogue overlay, ending archive across campaigns,
  faction sell/clinic consequences.
- Presentation: glass/steam/dash/quickhack VFX, combo HUD, new station CSS,
  manual/README controls.
- Verification: 151 unit tests, 16-archetype gym, three-build balance matrix,
  Chrome/Edge/Firefox/WebKit smoke, budget updated to app 450 KB / total 1120 KB.
- Hacking: Breach Protocol minigame on sabotage terminals; solvable seeded grids,
  row/column turn rules, timer, security shutdown, failure heat and rewards.

## Non-goals (unchanged)

Multiplayer, open world, mobile/console-first controls, full voice acting,
engine rewrite, photoreal art, live-service monetization.
