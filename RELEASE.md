# PUNKGUN Release Notes

Packaging decision: **static web / installable PWA**. No Electron or Tauri wrapper in 0.1.0.
The build targets evergreen Chromium and Firefox with WebGL; Safari support is a QA target,
not a claim.

## Build

```bash
npm run verify      # typecheck + unit tests + production build
npm run package     # build + release/punkgun-<version>/ + .tar.gz
```

Deploy the contents of `release/punkgun-<version>/` to any static host over HTTPS.
The service worker is scoped to `/`; do not host the game under a sub-path without changing
the manifest/SW URLs.

## Performance Budget

| Artifact | Current | Budget |
|---|---:|---:|
| App JS | ~201 kB | 260 kB |
| Vendor JS | ~553 kB across 3 chunks | 650 kB total |
| CSS | ~44 kB | 60 kB |
| Initial gzip | ~194 kB | 240 kB |
| Worst-case runtime | 60 fps target | 1080p |

Vendor code is split into sub-320 kB chunks by Rolldown. The previous >500 kB warning is gone.

## PWA / Offline

- `manifest.webmanifest`, `icon.svg`, `offline.html`, `sw.js`.
- Service worker caches the app shell on install and runtime-caches hashed assets.
- Navigation is network-first with cached `index.html` fallback; then `offline.html`.
- The SW is registered only in production builds.
- Offline state can be recovered by reconnecting and reloading.

## Save Recovery

- `OPERATOR → SAVE DATA` exports a validated v2 JSON snapshot.
- Import accepts v1/v2 and runs through the same sanitizer as normal loads.
- Current save is v2; legacy v1 remains untouched after migration.

## Compatibility / WebGL

- Boot is wrapped in a fatal boundary.
- WebGL context loss stops the frame loop and presents `RELOAD CLIENT`.
- No WebGL => `SIGNAL LOST` boot failure, not a black canvas.
- Reduced motion disables shake, hit-stop, death slow-mo, death slides, flashes and CSS motion.

## QA Checklist

- `npm run verify`
- `npm run package`
- Production preview: boot, deploy, reload, pause, operator import/export.
- Offline preview: service worker controlled, network disabled, cached shell loads.
- Save migration: v1 → v2 money/level/stash/equipped preserved.
- Console clean on boot, run, death, win, safehouse.
- Reduced motion on/off.
- Weather on/off.

## Localization Readiness

- Document language is `en`; manifest declares `en`.
- UI copy is currently inline in TypeScript/HTML. A full extraction pass is not done in 0.1.0.
- Recommended next step: route user-visible strings through a typed message catalog before adding
  a second locale. Do not machine-translate the inline copy in place.

## Credits

- Design/code: PUNKGUN project.
- Engine: Three.js.
- All art, textures, audio and SFX are procedural; no external asset packs.
- No third-party fonts are bundled; system-condensed/monospace fallbacks are used.
