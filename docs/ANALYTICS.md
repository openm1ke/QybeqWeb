# Web analytics

Qybeq Web uses Yandex Metrica counter `113110265`. The counter script is not requested until the player allows anonymous analytics. The choice is stored under `qybeq.analytics.v1` and can be changed in Settings. Disabling analytics calls the counter's `destruct` method.

The single-page app sends a manual page view when these screens open:

- `menu`
- `game`
- `customize`
- `settings`

Create JavaScript event goals in Yandex Metrica with these exact identifiers:

| Goal | Parameters | Meaning |
| --- | --- | --- |
| `settings_opened` | — | Settings opened |
| `customization_opened` | `source` | Theme browser opened |
| `theme_selected` | `theme_id` | Theme selected |
| `theme_unlocked` | `theme_id`, `price`, `stars_after` | Theme purchased with stars |
| `dice_roll_started` | `source` | New or daily puzzle requested |
| `dice_roll_completed` | `source`, `skipped` | Dice intro completed or skipped |
| `puzzle_started` | `level_id`, `source` | Pieces became available |
| `first_piece_placed` | `level_id`, `source`, `piece_id` | First valid placement |
| `puzzle_completed` | `level_id`, `source`, `placed_count` | Puzzle solved |
| `stars_earned` | `source`, `stars`, `stars_after`, `elapsed_ms`, `assistance_used` | Completion reward stored |

The first gameplay funnel should use `dice_roll_started` → `puzzle_started` → `first_piece_placed` → `puzzle_completed`. Segment it by `source` to compare regular and Daily Challenge sessions, and by `skipped` to see whether the intro affects progression.
