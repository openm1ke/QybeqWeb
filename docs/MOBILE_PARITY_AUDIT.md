# Qybeq Web: mobile parity audit

Updated: 28 September 2026.

## Implemented

- responsive menu and playable 6×6 board;
- all eight canonical pieces, rotation, reflection, collision checks and solver;
- pointer controls for mouse and touch, including tap-to-rotate and hold-to-drag;
- five mobile visual themes with persisted selection;
- three-track music playlist, gameplay effects and persisted audio controls;
- English and Russian interface selection with persisted browser-language fallback;
- bilingual privacy policy plus static support and how-to-play pages;
- stable daily PRNG and reward rules at the game-engine/test level;
- automated unit and desktop/mobile browser tests;
- production build and GitHub Pages deployment workflow.

## Required for mobile feature parity

1. Replace the fixed prototype board with the real coordinate-dice start flow and generated puzzles.
2. Add the elapsed timer, saved game, resume/discard flow and versioned storage migrations.
3. Connect solved count, star wallet and 1/2/3-star completion awards to the UI and persistence.
4. Lock paid themes, add purchase confirmation and deduct earned stars.
5. Connect Daily Challenge to its deterministic daily board, completed state, current/best streak and countdown.
6. Port hint projection and solution steps; add the web rewarded-ad adapter with free fallback when unavailable.
7. Replace the debug `Preview solution` action with the production result panel and new/view/menu actions.
8. Add consent-first Yandex Metrica with the mobile event taxonomy and a settings opt-out.
9. Localize the static how-to-play and support pages and replace the store-contact placeholder with the final developer contact.
10. Complete keyboard controls, screen-reader gameplay labels and real-device Safari/low-end Android performance checks.

Browser reminders remain intentionally out of parity until a separate Web Push service-worker and subscription service are designed.

## Publication status

The current build is suitable for a public development preview and for hosting the privacy-policy URL. It is not yet the feature-complete browser equivalent of the Android/iOS application.
