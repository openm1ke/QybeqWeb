# Qybeq Web: mobile parity audit

Updated: 29 September 2026.

## Visual parity (branch `feat/mobile-visual-parity`)

The game is now drawn by ports of the Flutter painters, not by look-alikes:

- `src/rendering/` — Canvas 2D ports of `PiecePainter` (gloss, neon, ceramic,
  satin metal, crystal and the brand's legacy finish; ghosts, hints, lift,
  glow, tint), `SurfaceDetails`, `BoardWellsPainter`, `BlockedCellWidget`,
  the Roll Dice die and the tumbling-die faces. The piece body is the same
  union of inset cells and bridges as `pieceBodyPath`, so pieces are one
  continuous body with no seams. Blur follows `MaskFilter.blur` sigma,
  colours follow Flutter's `HSLColor`/`Color.lerp` with 8-bit rounding, and
  the sandstone grain uses a bit-exact port of Dart's `Random(7319)`.
- `src/game/diceRoll.ts` — `DiceRollPlan` and `dieFrameAt` value for value;
  `src/rendering/dice3d.ts` — the painter's perspective matrices, applied to
  face canvases with CSS `matrix3d`.
- `src/cosmetics/skins.ts` — all five presets and their fifteen skins with
  the mobile colours and material parameters; appearance is chosen per slot
  (pieces, dice, board) and stored as ids.
- Game screen: `_BoardMetrics`, header, tray bar, `TrayLayout`, lift / snap /
  return / reject shake, placement preview, dashed hints, completion sweep
  and wave, result panel and pause sheet.
- Main menu with the Q mark intro, Customize (live preview, preset strip with
  prices, per-slot skins), Settings with language.
- How to Play: the six mobile lessons on `MiniBoard` and `PieceArt` (rotate
  and flip demos, the Place outline — draggable on the web), in the app and
  as `how-to-play.html` for links from Support (`?lang=en|ru`).
- Continue: the unfinished puzzle (board, orientations, clock, hints) is
  saved as a versioned record, rebuilt with the solver and re-validated on
  load; a regular puzzle and today's Daily Challenge are kept apart.
- Keyboard play: Tab to a piece, Enter to pick it up, arrows to move, R / F
  to rotate and flip, Enter to place, Esc to cancel or pause, H for a hint,
  Delete to send a placed piece back.

Numerical parity is covered by `src/tests/mobileParity.test.ts`: Dart
`Random`, HSL shades, the Daily Challenge boards for fixed dates and the dice
choreography for a fixed seed are compared with values produced by the
Flutter code.

Responsive: phones use the mobile layout unchanged; viewports at least
760 px wide and landscape put the tray beside the board.

## Out of scope for the web

- Rewarded help (watch an ad for a solution): the web version has no ads.
- Browser reminders, until Web Push is designed.
