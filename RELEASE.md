# PUNKGUN Release Notes

Packaging decision: **static web / installable PWA**. No Electron or Tauri wrapper in 0.2.0.
The build targets evergreen Chromium, Firefox and WebKit-engine browsers with WebGL; native
Safari remains a QA target, not a certification claim.

## Build

```bash
npm run verify      # typecheck + unit tests + production build
npm run package     # build + release/punkgun-<version>/ + .tar.gz
```

Deploy the contents of `release/punkgun-<version>/` to any static host over HTTPS.
The service worker is scoped to `/`; do not host the game under a sub-path without changing
the manifest/SW URLs.

## Performance Budget

`npm run budget` is enforced by `verify` and `package`.

| Artifact | Current | Budget |
|---|---:|---:|
| App JS | ~396 kB | 450 kB |
| Vendor JS | ~541 kB across 3 chunks | 620 kB total |
| Total JS | ~937 kB | 1120 kB |
| CSS | ~64 kB | 90 kB |
| Initial gzip (JS + CSS + HTML) | ~273 kB | 340 kB |
| Largest single chunk | ~396 kB | 480 kB |
| Smoke JS heap (headless) | ~9 MB | 160 MB |
| Worst-case runtime | 60 fps target | 1080p |

Vendor code is split into sub-360 kB chunks by Rolldown. The previous >500 kB warning is gone.
`scripts/check-budget.mjs` fails CI when any row is exceeded. The app-JS
budget was raised for the 0.2 content expansion (campaign, bosses, objectives,
23 cyberware/perk additions); it is not an open-ended allowance.

## PWA / Offline

- `manifest.webmanifest`, `icon.svg`, `offline.html`, `sw.js`.
- Service worker caches the app shell on install and runtime-caches hashed assets.
- Navigation is network-first with cached `index.html` fallback; then `offline.html`.
- The SW is registered only in production builds.
- A status toast reports offline mode and a waiting update; RELOAD applies the update.
- Offline state can be recovered by reconnecting and reloading.

## Save Recovery

- Primary save: `punkgun.save.v2` (slots 1–3 namespaced).
- Previous payload: `.bak`; rejected payload: `.corrupt`.
- Corrupt primary is quarantined, then the backup is loaded; the hub reports the recovery.
- Future versions are rejected rather than coerced.
- `OPERATOR → SAVE DATA` exports a validated v2 JSON snapshot.
- Import accepts v1/v2 and runs through the same sanitizer as normal loads.
- Current save is v2; legacy v1 remains untouched after migration.

## Compatibility / WebGL

- Client boot is isolated in `game/boot.ts` and wrapped in a fatal boundary.
- WebGL context loss stops the frame loop and presents `RELOAD CLIENT`.
- No WebGL => `SIGNAL LOST` boot failure, not a black canvas.
- Reduced motion disables shake, hit-stop, death slow-mo, death slides, flashes and CSS motion.
- Colorblind palettes cover UI and world tells; subtitles/event log and control presets are in Settings.
- Gameplay SFX pan left/right from their world position; music/ambience stay centered.
- Standard-mapping gamepad: sticks, triggers, face buttons, D-pad abilities and Start pause; D-pad focus/A select/B back in menus; keyboard/mouse remain active.

## QA Checklist

- `npm run verify` (typecheck + 148 unit tests + build + budget)
- `npm run smoke` (Chrome production preview boot/deploy/pause/boss rush/new game)
- `npm run smoke:edge` (same flow in Edge)
- `npm run smoke:firefox` / `smoke:webkit` after `npx playwright install firefox webkit`
  (both engines smoke-tested in this environment)
- `npm run test:gym` (16 archetypes vs a committed target)
- `npm run test:balance` (three-build clear-rate matrix)
- `npm run soak` (60s headless heap/error soak; `SOAK_MS` / `--minutes` override)
- `npm run soak:long` (30-minute profile; not run in this environment)
- `npm run package`
- Full matrix and manual checklist: [QA.md](./QA.md)
- Production preview: boot, deploy, reload, pause, operator import/export, boss rush, NEW GAME reset.
- Offline preview: service worker controlled (cache `punkgun-v2`), network disabled, cached shell loads.
- Save migration: v1 → v2 money/level/stash/equipped preserved; corrupt primary recovers from `.bak`.
- Console clean on boot, run, death, win, safehouse.
- Boss missions and boss-rush waves present the encounter intro card without blocking input.
- Ghost run: zero detections adds the ghost payout line and breaks on any enemy/camera/turret detection.
- NG+: boss armor, speed and plate-break adds scale with the cycle; the brief shows `NG+n`.
- Reduced motion on/off; palette/subtitles/log toggles; control presets.
- Weather/fog modifiers and holo ads on/off.

## Localization Readiness

- Document language is `en`; manifest declares `en`.
- English and Spanish catalogs cover objectives, station labels/titles, boon copy,
  HUD events, the full manual, the safehouse tour, authored dialogue, boss briefings
  and dialogue choices.
- Contract taglines, generated board taglines, daily taglines, handler lines, venture cards,
  street events, event replies, station notes, augment descriptions, attributes, lifepaths and
  role blurbs are localized. Archive prose remains inline.

## Credits

- Design/code: PUNKGUN project.
- Engine: Three.js.
- All art, textures, audio and SFX are procedural; no external asset packs.
- No third-party fonts are bundled; system-condensed/monospace fallbacks are used.
