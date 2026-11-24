# PUNKGUN — Implementation Plan & Status

Last refreshed: 2026-11-23. This file tracks the gap between the backlog and the
shipping build. `ROADMAP.md` remains the long-range design plan; this is the
working checklist.

## Baseline audit (verified)

- TypeScript + Vite + Three.js; 267 unit tests; production build and budget pass.
- Save v2 with three slots, export/import, last-known-good backup, corrupt-payload
  quarantine, and startup recovery reporting.
- PWA app shell, offline fallback, packaged static release.
- Readable one-hit combat, armor plates, stealth, hazards, patrols, boss phases.
- Structured death report: responsible enemy/hazard, attack, bearing, range, dash
  state, and one actionable correction; focusable retry/safehouse actions.
- Browser smoke test: boot → guided tour → native keyboard activation and focus
  containment → board → deploy → first-use field tip → pause → death report →
  safehouse → clinic previews → archive asset → off-screen threats.

## Backlog status

| Backlog item | Before | Now | Remaining |
|---|---:|---:|---|
| Combat layouts | 6 | **12 + 3 district setpieces** (blackout security floor, civilian market patrol, defended extraction) | setpiece-specific room dressing |
| Enemy archetypes | 11 | **16** | squad tuning blocked: the three-build matrix is saturated (every build clears every archetype at 1.0) — needs harder gym scenarios before it can drive composition |
| Bosses | 1 | **6 + unique briefings + all-boss rush + NG+ scaling + intro cards + phase pulses + laser hazards + finale grade** | ending-specific setpieces |
| Guns / named | 6 / 4 | **12 / 8** | optional more named paths |
| Attachments | 4 | **11 with mag/pellet/spread/cooldown/reload/pierce effects** | balance pass |
| Cyberware | 10 | **22 + active-ability screen flashes + exact next-rank stat/load deltas in the clinic** | — |
| Operator roles | 0 | **5 roles with distinct economy/combat identity** | role-specific dialogue checks |
| Hacking/breach | none | **Breach grid on terminals, cameras, turrets, locked safes and terminal/camera safe chains** | networked objectives |
| Ventures | 0 | **6 businesses × 3 ranks** | room visuals and event chains |
| Perks | 4 | **19 + mutually exclusive capstones + exact next-rank stat deltas** | — |
| Attributes + checks | 4 | 4 + derived + dialogue checks | broader skill checks |
| Modifiers | 4 | **12** | setpiece-only modifiers |
| Authored contracts | 3 random + boss/final | **12 authored + 3 random + 6 bosses** | more faction-specific voice |
| Dialogue | linear boss briefing | **faction beats + choices + checks + reputation deltas + story flags + run boons** | more consequence payoffs |
| Objectives | 4 | **8** (purge, target, recover, boss, sabotage, extraction, hunt, defense) with room-aware placement (`level-rooms.ts`: case in the farthest non-exit room, terminals spread across guarded rooms, defense zone at the largest room); the extraction case is a physical burden — slower move, dash locked, HUD warning | fully bespoke authored rooms per objective |
| Endings | 1 | **4** (burn, broadcast, vanish, remember) + consequence-aware epilogues | — |
| New game flow | reset only | **confirmed reset, lifepath selection, NG+, ending-screen shortcut** | — |
| Enemy AI | sticky chase bug | **longer memory + close-range reacquire + no enemy-friendly fire + final-window laser aims, leap/hack/charge tells, off-screen edge threat pips, cyan flank/mint cover chevrons** | squad composition tuning |
| Stealth | takedowns only | **vision cones, body discovery, alert propagation, ghost-run bonus, fixed patrol routes, explosion/glass noise** | — |
| Combat gym | none | **16-archetype gym + three-build matrix + risk-scaled density + high-risk squads** | setpiece tuning |
| Chapters | 1 gate + final | **3 chapters + final** | faction storyline branches |
| Save recovery | none | **three selectable slots + backup/quarantine + migration + export/import** | — |
| PWA / offline | shell | **shell + cache v2 + smoke + install/offline/update toasts** | live update cycle observation |
| Browser matrix / QA | manual | **Chrome, Edge, Firefox and WebKit smokes pass; CI packages a release artifact** | native Safari remains uncertified |
| Performance budgets | manual | **enforced budget + smoke heap + soak + `soak:long` + scheduled CI long soak** | observed 30-minute pass |
| Accessibility | done for this tranche | **reduced motion, palettes, subtitles, log, presets, remap, gamepad + menu navigation; native Tab/Space/Enter restored, focus trapped in the top overlay, hidden overlays unfocusable; first-use field tips are toggleable** | text-entry gamepad keyboard |
| Localization readiness | done for this tranche | **English/Spanish catalog for gameplay copy, dialogue, manual, tour, stations, ventures, augments and archive prose** | keep new copy in the catalog |
| Deep module splits | done for this tranche | **world, UI stations, hub flow, boot, settings, breach, dialogue, endings, pause, briefs, specs, results, launcher, menu, keyboard, events, HUD, timing and state machine split out; active cyberware, player attack, archetype actions, squad/boss AI, perception, heat, objective pressure and mission completion split into tested modules; archive prose is a lazy JSON asset** | — (layout data in `level-layouts.ts`, rooms in `level-rooms.ts`, spawn selection in `level-spawns.ts`) |
| Multi-frame animation | 2-frame sway | **4-frame walk** + reload/death | boss-specific choreography |
| Weather / holo ads / lighting | weather | **weather + animated holo ads + contract palettes + pooled neon light pools (statics per level, dynamic muzzle/explosion/dash flashes) + film post-pass (grain, vignette, chromatic aberration)** | fog volumes, dynamic shadow maps |
| Music / ambience | one bed + boss mode | **faction patterns + intensity + boss layers** | positional SFX panning |
| Onboarding / manual / settings | partial | **step-through 7-card tour with progress, keyboard focus and replay; first-use field tips retire after one showing; manual remains the reference; first boot no longer dumps the full manual** | more field-tip triggers |

## Tranche status

1. **Release guardrails** — done: save backup/quarantine, budget gate, smoke test,
   QA matrix, PWA cache version.
2. **Operator depth** — done: 22 cyberware, 19 perks, humanity/cyberpsychosis,
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
7. **Combat legibility and onboarding** — done: structured death report with
   attacker/attack/bearing/range/dash hint, focusable result actions, seven-step
   replayable safehouse tour, first-use field tips that retire, clinic next-rank
   stat/load previews, native keyboard activation, overlay focus trap,
   unfocusable hidden overlays, final-window enemy laser aims, hound leap tells,
   netrunner channel warnings, boss-charge rings, fuse-urgency grenade markers,
   off-screen aim/hack/charge edge pips, cyan flank/mint cover chevrons and a
   lazy archive JSON asset. Remaining: squad composition tuning and more
   field-tip triggers.

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
- Verification: 267 unit tests, 16-archetype gym, three-build balance matrix,
  Chrome/Edge/Firefox/WebKit smoke, app JS 433 KB / 450 KB and total 974 KB /
  1120 KB. Smoke now covers native keyboard activation, focus containment, tour
  replay, the structured death report, a first-use field tip, active cyberware,
  a live player shot, clinic previews, netrunner and boss-charge telegraphs,
  off-screen threat markers, squad intent markers, the lazy archive asset, and
  the safehouse return path.
- Hacking: Breach Protocol minigame on sabotage terminals; solvable seeded grids,
  row/column turn rules, timer, security shutdown, failure heat and rewards. The
  overlay is styled as a cyberspace dive (perspective grid floor, ICE cells,
  chromatic title) — presentation only, logic untouched.
- Presentation tranche: `src/render/lightpool.ts` pooled additive light pools
  (static neon/hazard/objective lights baked on bind; fading dynamic flashes for
  muzzle, explosions, dash, quickhack and exit), `src/render/film-pass.ts` film
  grade (grain/vignette/radial chromatic aberration, damped under reduced motion),
  bloom retuned to threshold 0.55. Extraction case carry: `Player.caseCarried`
  slows movement x0.78 and locks dash with a `caseHeavy` HUD warning (en+es).

## District setpieces + spawn split (2026-11-23)

- `level-layouts.ts` holds the authored layout strings; `map.ts` keeps the
  loader/geometry and re-exports for compatibility.
- `level-spawns.ts`: waves spawn out of the player's sightline, outside their
  room, at a preferred distance, spread apart, never inside geometry; an
  anchor + `anchorRadius` mode holds a defensive ring. Risk-scaled extras are
  snapped to floor (previously a diagonal offset could embed them in walls).
- `setpieces.ts`: derived per contract from seed + district theme +
  objective (45% of eligible boards; RNG order of existing boards untouched).
  Shown on board cards, the detail pane, the briefing and results; pay bonus
  and an 8%/civilian collateral penalty (cap 40%) flow through settlement.
  - BLACKOUT FLOOR (corporate/black-site/housing): cameras dark, enemy vision
    x0.62, two stalkers, floor a stop darker so vision cones read as flashlights.
  - MARKET PATROL (market/alley): 7–9 bystanders (`world-civilians.ts`) with
    umbrella/hood silhouettes, browse within rooms, scatter from any noise;
    they stop rounds; a player kill adds heat, alerts guards and docks pay.
  - DEFENDED EXTRACTION (docks/transit/rooftop): when the exit opens a
    heavy/gunner/marksman squad digs in within 4.5 tiles of it; exit light and
    objective text turn red until the squad is down.
- Map bake: walls are solid slabs with a south face, bevel and soft cast
  shadow; floors are one coherent material with low-frequency grime; run
  floors sit a stop darker so light pools carve the space.
- Verification: 305 unit tests, verify + budget (app JS 446/450 KB — near
  cap), Chrome smoke PASS.

## Noir sight, combat weight, overtime, silhouettes (2026-11-23)

- Line of sight (`render/sight.ts`): a 420-ray DDA visibility polygon from
  the operative through sight-blocking tiles (glass stays clear, closed doors
  block) masks the world at 80% darkness with distance falloff. Enemies and
  bystanders out of sight fade out; laser aims, muzzle flashes, charge rings
  and markers sit above the mask so threats are heard/seen, not their bodies.
- Combat weight: armor/shield hits stagger (frozen, executable, amber ring,
  EXECUTE prompt in reach). Steady aim: planting tightens spread to ~0.5x,
  moving widens to ~1.45x, each shot knocks steadiness down. Cyan laser
  sight shows the line and, via dot size, the current spread; turns magenta
  on a body.
- Overtime: once the exit opens, a stalker+rusher pair drops every 20s you
  linger; objective line counts down `HUNTERS IN Ns`.
- Silhouettes: operative in a wide-brim hat and trench-coat skirt, corp
  enemies in visored helmets, street enemies hooded. Map bake adds rooftop
  AC units, pipes and signage on wall caps plus flat debris/cables/stencils
  along walls (nothing walkable looks solid).
- Budget: app JS cap revised 450 -> 475 KB (456.8 KB now).
- Verification: 309 unit tests, verify + budget, Chrome smoke PASS.

## Sound pings, precise shots, inner monologue (2026-11-23)

- `render/pings.ts`: unseen enemies leak noise through the darkness —
  footsteps within 440px as faint grey rings (louder/faster when closer),
  gunfire as a wide red ring, a guard going hot as an amber ring. Static
  rings under reduced motion.
- Precise shot: a round fired at full steadiness cracks two armor plates;
  the laser dot locks white when it is ready.
- `game/narration.ts`: the operative's inner voice on ten run beats
  (insertion, first kill, plate lost, last stand, stealth kill, body found,
  case secured, exit open, overtime, civilian down), English + Spanish,
  12s cooldown (urgent beats cut through), no repeats per run. Shown as a
  boxless italic line under the subtitles and kept in the log.
- Verification: 314 unit tests, verify + budget (app JS 462/475 KB), smoke PASS.

## AI search + barks, flashlights, wet neon (2026-11-23)

- `world-search.ts`: on losing contact a chaser first tracks where the
  player was heading (last position + 0.9s of last velocity, only through
  open space), then sweeps: each searcher claims a different nearby room,
  pauses on arrival for a flashlight sweep, calls it, moves on; the window
  extends to 12s on the first miss, then they stand down. Drones/hounds/
  netrunners keep their archetype loops (drones still never stand down —
  pre-existing).
- `world-barks.ts` + `render/bark-labels.ts`: callouts (CONTACT, WHAT WAS
  THAT?, MAN DOWN, FRAG OUT, FLANKING, LOST HIM, CLEAR, BACK TO POST,
  PLATE'S GONE, HOLD THE EXIT) driven from one event funnel in World plus
  search/flank/exit-guard hooks; per-enemy 3.5s and global 0.45s
  cooldowns, max 3 on screen, en+es. Unseen speakers show bracketed and
  dimmed ("heard through the wall").
- Vision cones are now flashlight beams: additive, vertex-alpha falloff
  from the guard, brighter alerted and on blackout floors; hidden guards
  keep a dimmed beam.
- Baked neon signage casts colored floor light; in rain districts every
  sizeable light source gets a long vertical wet-floor reflection streak.
- Verification: 318 unit tests, verify + budget (app JS 469.7/475 KB —
  near cap), smoke PASS x2 after one flaky gamepad-focus failure.

## Direction reset: Hotline Miami x old Fallout (2026-11-24)

Decisions (from the user): keep the top-down camera, restyle toward Hotline
Miami's bold patterned interiors crossed with old Fallout's desert and
retro-futurism; every non-story run is procedurally generated (story beats
and bosses keep hand-made "moments"); open world = a Fallout-style travel
map between locations.

Stage 1-2 shipped:
- `levelgen.ts`: four biomes — desert motel (night), city streets (rain),
  megatower floor, dust highway (day). BSP buildings, roads, lots, shacks;
  per-seed rooms, doors, furniture, squads (1-3), loot, weapons, cameras,
  turrets, lasers, barrels, steam. Connectivity pass punches doors into any
  sealed region (or fills it). Verified on 25 seeds per biome.
- Low props (`n`): furniture is cover — blocks movement and bullets, not
  sight; never splits rooms or hosts anchors.
- Board contracts draw only from the biomes and build a fresh map from the
  contract seed; authored layouts remain for story/bosses.
- `render/biome-art.ts`: patterned carpet/checker/marble/planks/office
  tiles/grate, asphalt + lane paint, parking bays, pavers, sand ripples;
  beds, booths, desks, racks, sofas, sedans, dumpsters, crates, boulders,
  cacti, vending, TVs; biome wall caps (stucco, sandstone, tar/brick,
  tower windows onto the night city). Night maps get sodium lamps, room
  ceiling light by material and glowing props; desert is daylight (no night
  grade, light shade outside sight).
- HEIST contract: lift the core unseen for 1.6x; detection blows it (heat
  60, response team, 0.8x).
- Robustness: sight mask skips non-finite frames; player NaN snaps back.
- Budget: render code split into its own chunk; app JS cap 475 -> 520 KB.
- Verification: 334 unit tests, verify + budget, Chrome smoke PASS.

Safehouse + terminal pass (2026-11-24):
- Workbench bug fixed: opening the bench from the room left the game in
  "panel open" after closing it (player frozen). `openWorkbench(fromStation)`
  now keeps the room hand-off; smoke covers it.
- `pickTerminalTiles` placed only one terminal on levels without security
  hazards (Infinity score); capped, with a regression test.
- Hideout rebuilt (14x10): living room, workshop, clinic corner and garage,
  authored floor/prop channels (`floorRows`/`propRows` on any layout),
  stations painted as physical objects with name plates, plum wallpaper,
  room lighting; the camera frames the whole room on any aspect ratio.
- Terminal rebuilt as tabs (CONTRACTS / GEAR / MARKET / RECORD): fixed frame,
  pane scrolls on its own, contract dossier column, boss card no longer
  crushed, NEW GAME + RESET SAVE moved into a RECORD danger zone, hub hides
  instantly under sub-panels (no cross-fade overlap), system toast waits
  while panels are open. Smoke captures hub and room screenshots.

All-menus pass (2026-11-24):
- `npm run shots` (scripts/menu-shots.mjs): headless capture of every
  overlay (tour, terminal tabs, case, workbench, clinic, all stations,
  deploy, lifepath confirm, manual, briefing, dialogue, HUD, pause,
  settings, breach, death) into tmp-menus/ for visual review.
- One design system for every panel: plum frame, warm dark gradient, pink
  accent top bars and rules, pinned headers over scrolling bodies, pink
  scrollbars, consistent close/primary/danger buttons, pink accents on
  settings controls. Breach keeps its cyan cyberspace identity.
- Station kicker + heading tightened into one block; attaché case actions
  regrouped (primary EQUIP, actions row, segmented filters).
- The deploy briefing no longer peeks out behind pause, breach, dialogue,
  manual, death or results screens.

Next stages:
3. Travel map: region map (city, megatowers, motels, highway, outposts),
   travel, road encounters, location-bound contracts and free roam.
4. Character art pass to match (bigger readable sprites, faction outfits).
5. More biomes (outpost compound, mall, sewer, rooftop) and heist variants
   (keycards, vaults, timed guards).

## Non-goals (unchanged)

Multiplayer, open world, mobile/console-first controls, full voice acting,
engine rewrite, photoreal art, live-service monetization.
