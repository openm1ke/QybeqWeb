# Qybeq Web: mobile parity audit

Updated: 28 September 2026.

## Implemented

- responsive menu and playable 6×6 board;
- all eight canonical pieces, rotation, reflection, collision checks and solver;
- pointer controls for mouse and touch, including tap-to-rotate and hold-to-drag;
- five mobile visual themes with star prices, purchase confirmation, persisted ownership and selection;
- three-track music playlist, gameplay effects and persisted audio controls;
- English and Russian interface selection with persisted browser-language fallback;
- bilingual privacy policy and full how-to-play page;
- animated coordinate-dice intro, elapsed timer and 1/2/3-star completion rewards;
- persisted star wallet, solved count and Daily Challenge streak;
- consent-first Yandex Metrica, gameplay goals and settings opt-out;
- stable daily PRNG and reward rules at the game-engine/test level;
- automated unit and desktop/mobile browser tests;
- production build and GitHub Pages deployment workflow.

## Required for mobile feature parity

1. Replace the fixed prototype board with generated coordinate-dice puzzles.
2. Add saved game, resume/discard flow and versioned storage migrations.
3. Connect Daily Challenge to its deterministic daily board, completed-state badge, best streak and midnight countdown.
4. Port hint projection and solution steps; add the web rewarded-ad adapter with free fallback when unavailable.
5. Replace the debug `Preview solution` action with the production result panel and new/view/menu actions.
6. Add the final developer contact to the policy and provide a support page.
7. Complete keyboard controls, screen-reader gameplay labels and real-device Safari/low-end Android performance checks.

Browser reminders remain intentionally out of parity until a separate Web Push service-worker and subscription service are designed.

## Publication status

The current build is suitable for a public development preview and for hosting the privacy-policy URL. It is not yet the feature-complete browser equivalent of the Android/iOS application.
