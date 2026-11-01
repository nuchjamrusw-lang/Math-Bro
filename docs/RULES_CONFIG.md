# Rule configuration

Every rule that can vary between tournaments, or that the brief left ambiguous, is data in
[`lib/game-rules/config.ts`](../lib/game-rules/config.ts) (`GameRulesConfig`). The engine reads these values.
It never hard-codes them. A room's rules are built from its settings (`lib/room-settings.ts → rulesFromSettings`).
They are frozen into the match when the game starts, and stored in `Match.rules`.

`buildRules(override)` deep-merges a partial override onto `DEFAULT_RULES`.

## Board & tiles

| Option | Default | Meaning |
|---|---|---|
| `layoutRows` | `STANDARD_LAYOUT_ROWS` | 15 strings of 15 chars: `R`=3× Equation, `Y`=2× Equation, `B`=3× Piece, `O`=2× Piece, `*`=Center Star, `.`=normal. Defined in `lib/game-rules/board-layout.ts`. **⚠ Check this against an official A-Math board before using it in tournaments.** |
| `PREMIUM_INFO.STAR` | 3× piece | What the center star does |
| `STANDARD_TILE_SET` | 100 tiles | Face, count and points (`lib/game-rules/tiles.ts`) |
| `rackSize` | 8 | Tiles per rack |
| `exchangeMinBag` | 5 | The bag must hold at least this many tiles to exchange. You also cannot exchange more tiles than the bag holds. |

## Math (`math`)

| Option | Default | Meaning |
|---|---|---|
| `maxDigitsPerNumber` | 3 | Maximum number of 0–9 tiles joined into one number |
| `allowJoiningTwoDigitTiles` | `false` | Whether tiles 10–20 may be joined with other number tiles |
| `allowUnaryMinus` | `true` | Whether `-` may negate the first number of an equation side (`-6 = 4 - 10`). It is never allowed before 0, after another operator, or as a unary `+`. |
| `allowMultipleEquals` | `true` | Whether chains such as `2 + 2 = 4 = 1 + 3` are allowed |

## Scoring (`scoring`)

| Option | Default | Meaning |
|---|---|---|
| `bingoTileCount` / `bingoBonus` | 8 / 40 | Bonus for playing this many tiles in one move |
| `equationMultiplierStacking` | `MULTIPLY` | How several equation premiums in one equation combine: 2×·3× = 6× (`MULTIPLY`) or 2+3 = 5× (`ADD`) |
| `scoreCrossEquations` | `true` | Whether every equation a move forms is scored (main line plus cross equations) |

## Challenge (`challenge`)

| Option | Default | Meaning |
|---|---|---|
| `rechallengeEnabled` | `true` | Whether the side that lost the first ruling may ask for a second check |
| `rechallengeWindowSeconds` | 20 | Time allowed to request a re-challenge. The clocks are stopped meanwhile. |
| `failedChallengeLosesTurn` | `true` | Whether a challenger who challenges a correct move loses the turn |
| `countLostTurnAsPass` | `false` | Whether a turn lost to a failed challenge counts toward the pass-out rule |
| `countWithdrawnMoveAsPass` | `false` | Whether a withdrawn move counts toward the pass-out rule |
| `showValidityPreview` | `false` | Whether the mover sees ✓/✗ before submitting in Challenge mode. This is always on in Strict mode. |

`validation`: `CHALLENGE` (moves are checked only when challenged) or `STRICT` (incorrect moves are rejected).

## End of game (`endGame`)

| Option | Default | Meaning |
|---|---|---|
| `consecutivePassesToEnd` | 3 | Number of consecutive passes, counted across both sides, that ends the game. A scoring play resets the count. |
| `countExchangeAsPass` | `false` | Whether an exchange counts as a pass. If it does not count, it resets the count. |
| `outBonusMultiplier` | 2 | The player who goes out gains `multiplier × opponent's rack points`. A BLANK counts as 0. |
| `deductFromOpponentOnOut` | `false` | Whether the opponent also loses their rack points when a player goes out |
| `deductRackOnPassEnd` | `true` | Whether each side loses its own rack points when the game ends by passes (no ×2) |
| `deductRackOnTimeoutEnd` | `true` | The same as above, for a timeout end |

## Time (`time`)

| Option | Default | Meaning |
|---|---|---|
| `mode` / `minutesPerSide` | `STANDARD` / 22 | `BLITZ`=5, `RAPID`=12, `STANDARD`=22, `CUSTOM`=1–90 (`CUSTOM_TIME_LIMITS`) |
| `timeoutBehavior` | `OVERTIME_PENALTY` | `OVERTIME_PENALTY` keeps playing with a penalty. `END_GAME` stops the game at 00:00. |
| `penaltyPointsPerMinute` | 10 | Points deducted per started minute of overtime (1 s → 10, 61 s → 20) |
| `maxOvertimeMinutes` | `null` | Overtime cap after which the game ends. `null` means no cap. |
| `warningSeconds` | 60 | When the clock turns to its warning state |
| `allowPause` | `false` | Whether a side may request a pause. The other side must accept, and a referee may pause directly. |

## Score & tile management (`scoreManagement`)

| Value | Score | Tiles |
|---|---|---|
| `AUTO_SCORE_AUTO_TILES` | engine | automatic refill |
| `AUTO_SCORE_ONLY` | engine | the player presses **Draw** (with confirmation) |
| `AUTO_TILES_ONLY` | the player enters the score at submit (with confirmation) | automatic refill |
| `MANUAL` | the player enters the score | the player draws |

Equation validation follows `validation` in every mode. End-of-game adjustments and time penalties are always
calculated automatically for the final summary.
