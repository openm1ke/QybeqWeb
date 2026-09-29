# Qybeq on Yandex Games

One codebase, two builds. They are released independently:

| | Web (GitHub Pages) | Yandex Games |
| --- | --- | --- |
| Build | `npm run build` → `dist/` | `npm run build:yandex` → `dist-yandex/` and `release/qybeq-yandex-games-<version>.zip` |
| Released by | every push to `main` (Deploy Qybeq Web) | uploading the zip in the Yandex Games console |
| CI | Qybeq Web CI | Actions → **Yandex Games archive** → Run workflow (or push a `yandex-v*` tag); the zip is the run's artifact |
| Platform code | `src/platform/web.ts` | `src/platform/yandex.ts` |
| Ads | none | rewarded video for an extra hint |
| Analytics | Yandex Metrika after consent | none (the console has its own statistics) |
| Pages outside the game | privacy, support, how-to-play | none |

The build is chosen by `VITE_PLATFORM` (`.env.yandex` sets it for
`--mode yandex`). Web-only UI is guarded by
`import.meta.env.VITE_PLATFORM !== 'yandex'` in place, so the Yandex bundle
does not contain it at all; `scripts/package-yandex.mjs` refuses to pack an
archive that still has an external URL, a web-only page or the Metrika
counter in it.

## Local testing

```sh
npm run dev:yandex        # http://localhost:5173 with a local stand-in for /sdk.js
npm run preview:yandex    # the built dist-yandex/ with the same stand-in
```

`yandex/sdk-mock.js` answers `/sdk.js` locally (it is never packaged). Query
parameters: `ya_lang=en|ru|tr…`, `ya_ad=reward|dismiss|error|none`,
`ya_ad_ms=600`, `ya_no_ads=1`. `window.__yaMock.log` lists every SDK call and
`window.__yaMock.emit('game_api_pause')` simulates a platform pause.
`e2e/yandex.spec.ts` covers this build.

To try the real SDK before publishing, use Yandex's own proxy on the built
folder: `npx @yandex-games/sdk-dev-proxy -p dist-yandex --app-id=<game id>`,
or open the draft with `?game_url=https://localhost` and the debug panel
(`&debug-mode=16`).

## Requirements covered in code

| Requirement | How |
| --- | --- |
| 1.6.1.6, 1.6.2.5 — no system player | Music and effects play through Web Audio (`AudioBufferSourceNode`), never `<audio>`, so browsers show no media controls. This was the earlier warning. |
| 1.3 — sound stops when focus is lost | The AudioContext is suspended on `visibilitychange`/`pagehide`, on `game_api_pause` and during a video ad. |
| 1.19.1 — SDK connection | `<script src="/sdk.js">` in index.html, `YaGames.init()` before the game renders. |
| 1.19.2 — `LoadingAPI.ready()` | Once, when the main menu is interactive. |
| 1.19.3 — `GameplayAPI` | `start()` while a puzzle is on the board, unsolved, with no sheet open and the tab visible; `stop()` otherwise (pause menu, result, rewarded offer and video, platform pause, leaving the game). |
| 1.19.4 — `game_api_pause/resume` | Pause the clock, the sound and the gameplay markup. |
| 2.14 — language from the SDK | `environment.i18n.lang` at launch; CIS languages fall back to Russian, others to English. A language picked in Settings is kept. |
| 1.9 — progress survives a reload | Stars, themes, settings and the unfinished puzzle are saved after each action, in the SDK's safe storage (`ysdk.getStorage()`). |
| 1.6.1.8, 1.6.2.7 — no selection or context menu | `user-select: none`, no touch callout, `contextmenu` prevented. |
| 1.6.2.4 — keyboard independent of layout | Letter shortcuts use `KeyboardEvent.code` (R, F, H work on a Russian layout). |
| 1.10 — no browser scroll | Full-viewport screens with their own scrolling; no page scroll. |
| 4.1, 4.4, 4.5 — ads | Only the SDK's rewarded video, only when the player asks for a hint after the three free ones; the offer says a video will play and what it gives. |
| 4.5.2 — rewards never block play | If no video can be shown, the hint is given anyway (as on mobile). |
| 4.7 — pause during ads | Sound and gameplay stop from the moment the video is requested. |
| 8.4, 3.5 — no external links | No links, no privacy page, no analytics in this build; checked when packing. |
| 1.21, 1.22 — archive | index.html at the root, ASCII file names, size under 100 MB; checked when packing. |

## Console draft checklist

- Languages: English and Russian.
- Monetization: rewarded video (the hint after the three free ones).
- Cloud saves: not used (progress is local, in the SDK safe storage).
- How to play: the game has an in-app tutorial (main menu → How to Play).
- Orientation: portrait and landscape both work.
- Upload `release/qybeq-yandex-games-<version>.zip`; bump `version` in
  `package.json` for each new upload.

## Catalog materials

The game is draft 618209 in the Yandex Games console. Its texts (both
languages, the moderator comment) are kept in `yandex/listing.json`.
Screenshots, gameplay videos, the icon and the covers are captured from the
real Yandex build:

```sh
npm run build:yandex
npm run promo:yandex     # → release/yandex-store/{ru,en}/…, icon, covers
```

`promo/capture.spec.ts` drives the game (a seeded dice roll, solved piece by
piece) and records 1080×1920 / 1920×1080 MP4s under 28 s with the game's
music; `promo/cover.html` draws the cover with the game's renderers.
