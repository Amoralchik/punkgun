# PUNKGUN — Big Plan

Living development plan. Sequenced work, not calendar promises.
Last refreshed: 2026-11-23

> **Status note:** the phases below preserve the original sequencing. Shipped
> implementation status is the baseline above and `PLAN.md`; later phases are
> mostly complete, with remaining gaps called out in the Plan's backlog table.

## North Star

A fast, lethal, readable top-down cyberpunk contract shooter: 15-second fights,
5-minute missions, one more run. The safehouse is a character. The build matters.
The city has teeth.

## Design Pillars

1. **Lethality with legibility.** One hit kills. Every death must be explainable:
   visible shooter, visible shot, visible cover, or visible clock.
2. **Room-to-room rhythm.** Enter, read, commit, reset. No bullet sponges.
3. **Build identity.** Attributes, cyberware, perks, insertion and loadout produce
   recognizably different runs, not cosmetic percentages.
4. **The safehouse as a place.** Stations, fixers, factions and the operator file
   are part of the game, not a menu between games.
5. **Corporate horror, street-level.** The story is about what Helix buried and
   who is holding the shovel.
6. **Style is mechanics.** Neon, sound and motion carry information: laser tells,
   damage direction, blackout light, ability states, boss phases.

## Current Baseline

- TypeScript + Vite + Three.js; 24.4k non-test source lines; production build and
  size budgets pass. `npm run verify`, `smoke`, `soak`, `test:gym` and
  `test:balance` are the release gates.
- Tests: 267 Vitest cases plus Chrome/Edge/Firefox/WebKit smokes.
- Save v2 with three slots, backup/quarantine, migration, export/import.
- Combat: one-hit lethality, armor plates, Second Heart, stealth takedowns,
 16 enemy archetypes, squad AI, hazards, eight objectives, six bosses;
  attack tells now cover aim-window lasers, grenade fuse urgency, hound leaps,
  netrunner channels, boss charges, off-screen edge pips and cyan/mint squad
  route chevrons.
- Content: 12 combat layouts, 12 authored contracts + 3 random + boss/final,
  12 weapon families / 8 named, 11 attachments, 22 cyberware, 19 perks,
  five operator roles, three lifepaths, six ventures, four endings.
- Safehouse: ten stations, attaché case, fabricator, workbench, clinic,
  sanctuary upgrades, exchange, ventures, archive.
- Onboarding: seven-step replayable safehouse tour plus manual; first boot opens
  the tour instead of a full manual dump; first-use field tips retire after one
  showing and can be disabled.
- Build clarity: the clinic previews the exact next-rank stat and neural-load
  delta before a cyberware install or perk train.
- Death legibility: structured report (killer, attack, bearing, range, dash
  state, correction hint) with focusable retry/safehouse actions.
- Accessibility: reduced motion, palettes, subtitles, log, remap, gamepad,
  native Tab/Space/Enter, focus containment inside overlays.
- Hot files: `world.ts` 2,806; `profile.ts` 2,151; `textures.ts` 1,670;
  `renderer.ts` 1,620; `safehouse.ts` 1,460; `world-enemy-actions.ts` 202;
  `world-abilities.ts` 145; `world-attack.ts` 144; `world-perception.ts` 112;
  `world-squad-ai.ts` 81; `world-mission-completion.ts` 71;
  `world-encounters.ts` 65; `world-objective-pressure.ts` 62;
  `world-boss-ai.ts` 55; `game.ts` 843.

## Target End State

| Area | Shipped (2026-11-23) | Next target |
|---|---:|---:|
| Combat layouts | 12 | district-specific setpieces |
| Enemy archetypes | 16 | tuned squads and telegraphs |
| Bosses | 6 | ending-specific arenas |
| Guns / named | 12 / 8 | optional named paths |
| Cyberware | 22 | 22-24 |
| Perks | 19 | 19 |
| Attributes | 4 + derived/checks | broader skill checks |
| Insertion approaches | 5 | 5-6 |
| Contract modifiers | 12 | setpiece-only modifiers |
| Objectives | 8 | fully bespoke authored rooms |
| Setpiece contracts | 12 authored + 3 random + boss/final | faction-specific voice |
| Campaign chapters | 3 + final, 4 endings | faction storyline branches |
| Safehouse stations | 10 | 10-11 |
| Automated tests | 267 unit + browser smokes + soak | cover every new system |

Target experience: a 2-3 hour authored campaign, 10+ hours of contract play,
seeded dailies, NG+, and several viable builds.

---

## Phase 0 — Foundation and Guardrails

**Goal:** make the existing game safe to grow. No visible feature work.

### Work

- **Save v2**
  - Versioned schema, migration from `v1`, defensive validation, slots, export/import.
  - Save the active contract, approach, modifiers, seed, run state? Decide run-save policy.
  - Settings and profile split; corrupt-save recovery.
- **Deterministic runs**
  - `RunConfig { contractId, approach, modifiers, seed, loadout }`.
  - Seed all mission rolls, enemy variation, loot, modifiers, shop stock.
  - Show/copy the seed; replay a contract from the operator file.
- **Architecture**
  - Extract `RunConfig` from `Game.beginMission/createWorld`.
  - Split `World` into `player`, `enemy-ai`, `bullets`, `doors`, `objectives`, `effects`.
  - Split `Safehouse` into per-view renderers and per-station controllers.
  - Split `Game` into boot, flow, HUD, results and hub.
  - Keep behavior identical; no UI redesign in this phase.
- **Data-driven content**
  - One source of truth for weapons, attachments, cyberware, perks, approaches,
    modifiers, contracts, factions, dialogue, station stock.
  - Runtime validators for ids, costs, ranks, requirements.
- **Automated tests**
  - Unit: economy, inventory/case, reputation, modifiers, progression, missions,
    save migration, profile validation.
  - Smoke e2e: boot → hub, deploy, win, death, boss gate, dialogue, case, craft.
  - CI command: typecheck + test + build.
- **Build and performance**
  - Split vendor chunk / tree-shake Three imports; set a bundle budget.
  - Profile the world update and renderer; target 60 fps at 1080p.
- **Accessibility baseline**
  - Reduced motion, shake/flash/bloom, colorblind-safe tells, dialogue log,
    screen-edge damage cues, remappable keys, gamepad detection.

### Acceptance

- `v1` save loads and migrates without loss.
- Seeded run reproduces the same contract/enemies/loot.
- Typecheck, unit tests, smoke tests and production build pass in CI.
- No console errors across boot, run, death, win, safehouse.
- The production bundle warning is resolved or explicitly budgeted.
- No player-visible behavior regression.

---

## Phase 1 — Combat Contract

**Goal:** make every fight readable, every weapon distinct and every death fair.

### Work

- **Weapon handling**
  - Magazine/reload/reload-cancel; empty-gun behavior; reload tells and audio.
  - Per-weapon recoil, muzzle flash, shell ejection, tracer thickness, sound family.
  - Melee arcs, lunges, executions, throws, door slams; shield interactions.
- **Threat legibility**
  - Every armed hostile paints a laser while aiming (shipped).
  - Cap firing to the readable frame or add an off-screen threat cue.
  - No invisible enemies: dynamic unit views (shipped) plus reinforcement spawn-in.
  - Damage direction (shipped) and a brief source-acquisition cue.
  - Enemy muzzle wind-up, reload gap and flanking tells.
- **New enemy archetypes**
  - Grenadier: lobs frags, telegraphs the arc.
  - Netrunner: hacks HUD/cameras, applies a timed debuff.
  - Drone/turret: static or hovering threat, EMP/melee counterplay.
  - Blade cyberpsycho: fast, armored, multi-step melee pattern.
- **Hazards and interactions**
  - Cameras, turrets, laser grids, breakable windows, explosive barrels, elevators.
  - Destructible cover; environmental kills; door/window breach options.
- **Stealth**
  - Noise sources, body discovery, patrol routes, takedowns, ghost approach.
  - Detection state readable without a debug overlay.
- **Boss framework**
  - Phase machine, weak points, adds, arena mechanics, intro dialogue.
  - Generalize the current Sublevel plate/add logic for four boss archetypes.

### Acceptance

- A combat gym with every archetype/hazard; no invisible damage.
- Every shot has a visible source or a directional cue.
- Three distinct viable builds tested across all current layouts.
- Hit-stop, camera kick, audio and HUD agree on hit/kill events.
- 60 fps target in a worst-case room.

---

## Phase 2 — Campaign, Factions and Story

**Goal:** turn the contract loop into a campaign with consequences.

### Work

- **Campaign state**
  - Generalize the current 3-clear boss gate into chapter gates per faction.
  - Chapter 1 (street), Chapter 2 (Sublevel), Chapter 3 (Helix Spire).
  - Track clears, boss/final state, faction choices and archive unlocks.
- **Faction storylines**
  - Helix Dynamics, Chrome Teeth, Low Orbit, Night Market, Sublevel.
  - A handler/fixer voice per faction; MOTH remains the through-line.
  - 12-16 authored contracts; 4-6 bosses; 3 endings.
- **Dialogue system**
  - Data-driven speaker lines, portraits, choices, attribute/reputation checks.
  - Pre-mission and pre-boss scenes; post-mission consequences.
  - Dialogue log / archive replay.
- **Mission types**
  - Sabotage: destroy marked terminals without raising alarms.
  - Extraction: carry a case/VIP to the exit under pressure.
  - Hunt: track a moving named target.
  - Defense: hold a position for a timer.
  - Existing purge, target, recover, boss.
- **Choice and endings**
  - Faction standing changes which contracts appear.
  - Final chapter branches on rep/choices; three epilogues.
  - Archive entries written per branch, not generic.

### Acceptance

- A complete start-to-ending campaign is playable on at least three paths.
- Every dialogue and contract is data-driven and validated.
- Boss gates and endings are reachable without debug commands.
- Archive reflects the path taken.

---

## Phase 3 — RPG, Build and Economy Depth

**Goal:** give the operator a build worth planning around.

### Work

- **Attributes and skills**
  - Keep BODY/REFLEXES/COOL/TECH; add skill checks in dialogue, entry, crafting,
    hacking and boss mechanics.
  - Attribute points and respec rules; display derived stats (shipped in OPERATOR).
- **Cyberware**
  - Expand to 20-24 implants; slots and humanity/cyberpsychosis risk.
  - Active abilities with cooldown/HUD states; synergy tags (blade, gun, stealth, tech).
  - Ripperdoc upgrades; installation risks; cyberware-specific dialogue checks.
- **Perks**
  - 12-16 perks with real rule changes, not pure percentages.
  - Build-defining capstones; mutually exclusive branches.
- **Crafting**
  - Recipe quality tiers, blueprints, salvage, component rarity.
  - Attachments with meaningful behavior; weapon mods; consumable batches.
  - Fabricator capacity and time.
- **Economy**
  - Faction discounts across all relevant stations, not only the market.
  - Stock refresh, limited quantities, price drift, fixer fees.
  - Money sinks: housing/room upgrades, cyberware, crafting, insurance, rerolls.
  - Contract pay: base + time + rank + modifier + approach + faction rep.
- **Inventory/loadout**
  - Case presets; quick-equip; kit planning; stash capacity pressure.
  - Salvage vs sell decisions; named weapon acquisition paths.

### Acceptance

- Three viable builds with distinct play patterns and weaknesses.
- No single weapon/approach dominates every contract.
- The economy produces real choices for a 60-minute session.
- Attributes, rep, cyberware and dialogue checks visibly affect missions.

---

## Phase 4 — Content Scale and Retention

**Goal:** enough authored and generated content to keep the loop alive.

### Work

- **Layouts**
  - Add 3-4: transit line, arcology atrium, nightclub, dockside freighter.
  - Each with a distinct hazard/cover grammar and enemy mix.
- **Archetypes and bosses**
  - Fill out to 12-15 enemy archetypes; 4-6 bosses with unique arenas.
- **Content setpieces**
  - 12-16 authored contracts across factions/chapters.
  - Setpiece modifiers and bespoke dialogue.
- **Replayability**
  - Seeded daily/weekly contract; offline-safe.
  - Challenge modes (fists only, one life, no armor, ghost).
  - NG+ with elite modifiers and remixed spawns.
  - Unlockable operators with small rule twists.
  - Local leaderboard / run history; boss rush.
- **Procedural guardrails**
  - Contract generator avoids impossible room/guard combinations.
  - Reward/risk distribution curves; difficulty tiers.

### Acceptance

- 10+ hours of varied play without repeating the same authored beat.
- Daily seed completes and is shareable/replayable.
- NG+ and at least three challenge modes.
- No generated contract dead-ends or unreachable exits.

---

## Phase 5 — Presentation, Audio and UX

**Goal:** make it feel like a finished cyberpunk game.

### Work

- **Animation**
  - Multi-frame walk/run, direction-aware tells, reloads, weapon-specific recoil,
    hit reactions, deaths, boss choreography, interaction poses.
  - First-person? No; keep top-down identity.
- **Environment**
  - Rain/fog/snow by district, neon signs, holo ads, puddles, cables, parallax.
  - Destructibles, dynamic lights, blackout/fog variants.
- **Audio**
  - Layered synth tracks per faction/boss, ambient beds, positional gunfire,
    weapon-family shots, UI/foley, dynamic music states.
  - Music and SFX volume; mute.
- **UI/UX**
  - Iconography, weapon/ability cards, map/exit language, onboarding.
  - Station transitions (shipped) extended to dialogue, results, operator.
  - Accessibility: colorblind palettes, subtitles, dialogue log, reduced motion,
    shake/flash controls, remappable input, gamepad.
- **Onboarding**
  - Seven-step first safehouse tour: the room, board, loadout, combat, objective,
    extraction, and the upgrade loop. Dismissible, replayable from the TOUR button.
  - First-use field tips: armor break, empty magazine, executable stun and opening
    deploy; each retires permanently and respects the Settings toggle.
  - Manual and tactical glossary remain the reference, updated per phase.

### Acceptance

- A style bible exists and is followed across maps, HUD and stations.
- No flashing above safe thresholds; reduced-motion path complete.
- All critical text readable at 1080p; keyboard-only path works.
- At least three music states/faction themes.

---

## Phase 6 — Release Hardening

**Goal:** ship a stable build.

### Work

- Browser matrix; WebGL fallback; 60 fps target.
- PWA/offline; packaging target decided (web / Tauri / Steam wrapper).
- Save export/import; version migration; corrupt-save recovery.
- Crash/error boundaries; logging; no console errors in production.
- Performance: asset atlases, chunk splitting, level preload, memory budget.
- Full QA pass: every station, every objective, every boss, all endings.
- Localization readiness (string extraction), content warnings, credits.
- Balance pass from telemetry-free playtests.

### Acceptance

- 30+ minute session without errors or save loss.
- All campaign paths and endings reachable in a release build.
- No softlocks; no invisible damage; no lost loadout on exit.
- Bundle and memory budgets met; production console clean.

---

## Milestones and Gates

| Gate | Meaning | Blocking evidence |
|---|---|---|
| M0 Foundation | Safe to grow | save migration, tests, CI, split modules |
| M1 Combat | Fight system is done | gym pass, no invisible damage, 3 builds |
| M2 Chapter 1 | First complete campaign act | 4-6 authored contracts, chapter gate |
| M3 Campaign | Full story | 3 paths, 3 endings, archive |
| M4 Meta | Build/economy complete | 3 builds, full economy loop |
| M5 Scale | Content target | 9-10 layouts, 12+ enemies, dailies, NG+ |
| M6 Presentation | Finished feel | animation/audio/a11y pass |
| M7 Release | Shippable | QA, save, build, packaging |

## Immediate Next Work

1. Write save v2 with migration and slots.
2. Introduce `RunConfig` + deterministic seeds.
3. Add Vitest + Playwright smoke suite and CI command.
4. Extract `RunConfig` from `Game`; split `World` systems.
5. Split `Safehouse` into station controllers.
6. Move content tables to validated data files.
7. Add reload/reload-cancel and weapon-family animation/audio.
8. Generalize chapter gates and add dialogue choices/checks.
9. Implement sabotage and extraction objectives.
10. Apply faction discounts to clinic/workbench/supplies and add stock refresh.
11. Build the combat gym and run the three-build balance pass.
12. Add rain/ambience, station holos, and the reduced-motion path.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Monolithic files (`world`, `safehouse`, `game`) | Slow, regression-prone | Continue the incremental splits; keep behavior tests per extraction |
| Test drift | Invisible regressions | 267 unit tests + browser smokes + soak in CI; add cases with new systems |
| Save drift | Lost progression | Versioned v2 schema + slots + migration + export/import |
| One-hit + ranged enemies | Unfair deaths | Range caps, laser tells, damage direction, structured death report, spawn grace |
| Content volume | Repetition | Data-driven modifiers + authored setpieces + dailies |
| Visual/audio scope | Endless polish | Style bible, budgets, per-phase presentation gate |
| Three.js bundle | Load time | Vendor split, tree-shake, budget |
| Dark/fog/blackout readability | Unplayable stealth | Player light, enemy tells, accessibility options |
| Scope creep | Never ships | Non-goals below; phase gates |

## Non-Goals

- Multiplayer, co-op or PvP.
- Open world / seamless city.
- Mobile or console-first controls in this plan.
- Live-service monetization, battle passes or gacha.
- Full voice acting.
- Engine rewrite (keep Three.js).
- Photoreal art or first-person mode.

## Success Metrics

- 60 fps at 1080p in worst-case rooms.
- Zero unexplained deaths in a recorded 30-minute playtest.
- Save v1 → v2 migration succeeds 100% in tests.
- Three distinct builds with comparable clear rates.
- No console errors in production.
- A full campaign path playable without debug tools.
- Accessibility path complete: keyboard-only, reduced motion, no unguarded flashes.

## Definition of Done (whole game)

The player can boot into the safehouse, plan a build, craft gear, choose a contract,
choose an insertion, read the threat, fight, die or extract, advance a faction,
unlock and beat a boss, reach an ending, and start NG+ — without a debug command,
without a softlock, and with every death explainable.
