# Qybeq Web

The browser port of Qybeq, built independently from the Flutter iOS/Android
application with React, TypeScript, Vite and SVG.

## Current milestone

- responsive main menu and playable 6×6 prototype board;
- all eight canonical polyomino pieces;
- tap-to-rotate and hold-to-drag controls that preserve the exact grab position;
- rotate, flip, move, remove and collision validation;
- five persisted visual themes ported from mobile;
- three-track background playlist, volume controls and gameplay effects;
- persisted English/Russian interface selection;
- Continue for an unfinished puzzle and full keyboard play;
- exact-cover solver and validated mobile reference solution;
- stable daily PRNG and one/two/three-star rules;
- shared versioned JSON parity fixture;
- static privacy and support pages, plus the How to Play lessons as their own page;
- Vitest, Playwright and GitHub Actions foundations.

The full implementation sequence is maintained in the mobile repository at
`../GeniusSquare/docs/WEB_PORT_PLAN.md`.
The current mobile parity gaps are tracked in `docs/MOBILE_PARITY_AUDIT.md`.

## Run

```sh
npm install
npm run dev
```

## Two builds

```sh
npm run build            # the website (GitHub Pages) → dist/
npm run build:yandex     # the Yandex Games archive → release/qybeq-yandex-games-<version>.zip
npm run dev:yandex       # the Yandex build locally, with a stand-in for the SDK
```

The website deploys on every push to `main`; the Yandex Games archive is
built on demand (locally or with the "Yandex Games archive" workflow) and
uploaded in the developer console. See `docs/YANDEX_GAMES.md`.

## Verify

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

Install Chromium once before the browser smoke test:

```sh
npx playwright install chromium
npm run test:e2e
```

## Privacy and release configuration

`public/privacy.html` is a pre-release draft. The permanent domain, owner
contact and web rewarded-ad IDs must be supplied before publication. Mobile
`R-M-*` advertising IDs must never be used by the website.
