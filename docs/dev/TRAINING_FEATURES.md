# Training features — strength, cardio by sport, carries

Design notes for the training additions in this fork. Every rule that decides a number is a pure
helper in `frontend/src/lib/` with a test beside it; the screens only call them.

## During a set

| Feature | Where | Notes |
|---|---|---|
| Comparison with the last time | `lib/set-compare.js` `compareSetTo`, `Workout.jsx` `deltaLine` | A done work row shows `▲ +2.5 kg`, `▲ +1 reps`, `=` or `▼ −5 kg` against the same set of the reference line (last time, or the best set). Weight is read before reps, minutes before speed. Warm-ups and per-side rows are not compared. |
| Record flash | `Workout.jsx` `toggle` | A weight above the history's best (`beatsWeight`) toasts "New PR:" once per exercise and weight per session. Nothing flashes the first time an exercise is ever logged. |
| Smart rest | `lib/set-compare.js` `smartRestSec`, `smartRestForSet`; Settings → During a workout | Off until switched on (`S.smartRest`). Scales the exercise's rest by reps (≤3 ×2, ≤5 ×1.75, ≤8 ×1.25, ≤12 ×1, more ×0.75, capped at 5 min over the base) and adds 30 s after RIR 0 / RPE ≥ 9.5. An exercise with its own `restSec`, a warm-up, a hold and cardio keep what they had. Also used for the rest on the lock-screen queue. |
| Same as previous set | set menu | Copies `w`, `r`, `sec`, `min`, `speed` from the previous row of the same phase. |
| Back-off sets | `lib/backoff.js`, set menu | On a done work row with weight and reps: 3 rows at 85 % of its weight (snapped to the exercise's step, always below it), at least 5 reps. |

## Cardio by sport

`lib/cardio.js`. A run, ride, row or swim is recognised by the exercise's name (`cardioKindFromName`)
and logs minutes plus a **distance** (km, miles on a profile in mph, metres for a swim or a row)
with the pace of its sport shown under the row: min/km (min/mi), km/h (mph), a split per 500 m, a
time per 100 m. The row still stores `min` and `speed` (km/h) — the speed that follows from the
distance — plus `dist` in km, so history, charts, the muscle model and older readers are unchanged.
Changing the minutes keeps the distance and moves the speed. Other cardio (jump rope, burpees …)
keeps the minutes-and-speed columns. A row without `dist` keeps its old label.

A weekly goal (Settings → Weekly cardio goal, `S.cardioGoalMin`) shows a progress card on Home
(`lib/cardio-week.js`): minutes of ticked cardio rows this week, with the distance.

## Carries, sled work, rucking

`lib/functional.js`. These count metres where reps go: the row keeps `w` and `r`, `r` being
metres. `repUnitOf(cfg)` reads `cfg.repUnit` (`'m'` | `'reps'`), else the exercise's name
(carry, farmers walk, sled push/drag, ruck). The exercise config has a "Distance instead of reps"
switch. Labels read `40×30 m`, the step is 5 m, volume and personal bests work as before.

## Catalogue additions

`lib/extra-exercises.js` — 25 exercises the dataset lacks (swimming strokes, rowing machine, cycling
and running outdoors and indoors, landmine press / row / squat to press / RDL, sled push and drag,
sandbag, suitcase, kettlebell, trap-bar, rack and overhead carries, ruck march). Ids start with
`bx-`. No picture or animation, no translated name. The dataset itself is untouched; `exercises.js`
appends them to `CATALOGUE`, and `equipment.js` includes their equipment in the profile checklist.

## Strength over time

- **Rep records and percentages** (`lib/records.js`): in the exercise history sheet, the heaviest
  weight for at least 1, 3, 5, 8 and 10 reps, and 100–50 % of the estimated 1RM on weights the bar
  can carry.
- **RPE-based progression** (`lib/progression.js`, policy `rpe`): the weight follows the average
  effort of the last session (RPE, or RIR as 10 − RIR) against the exercise's target (default 8):
  ≥ 0.5 below → one step up, ≥ 2 below → two; within 0.5 or harder → same weight; missed reps never
  add load and repeated misses deload (after 2). A session with no effort rated holds the weight.
- **Strength level** (`lib/strength-level.js`, Stats): the estimated 1RM of squat, bench, deadlift,
  overhead press and row as a multiple of the last weigh-in, on a six-step scale from beginner to
  beast, with the next step's weight and the squat + bench + deadlift total. The thresholds are
  rough bodyweight multiples for a man, scaled by 0.65 for a profile set to the female figure — a
  guide, and the card says so.

## Top set + back-off

`lib/topset.js`. An exercise config can carry `backoff: { pct, repsMin, reps }` (percentage 50–95 of the
top set's weight, rep range up to 15). Applies to loaded rep work with two or more sets, not per side.

- The **first work row is the top set**; the other work rows are back-off rows. Their weight is the
  percentage of the top set's, on the exercise's step and always below it; their reps open at the
  middle of the back-off range. `buildSets` and `buildPlannedEntry` apply it (after the prescription,
  which speaks to every open row), and changing the top weight in the workout, or from the lock screen,
  recomputes them. A back-off weight typed by hand, and a ticked row, are left alone.
- **Progression reads the top set alone** (`readSession`): its reps decide `ok` / `low`, its effort
  decides the RPE rule, and the heaviest weight is the top's. The session still has to be finished.
- The rows are headed **Top set** / **Back-off** on the workout screen; the plan line reads
  `1 × 6–10 + 2 × 10–14`; editing the back-off plan counts as a plan change (`planned.bo`).
- Plan files carry it (`cleanBackoff` on the way out and in); the exercise config has the switch
  "Top set + back-off" with the percentage and the rep range. The set menu's "Add back-off sets"
  stays as the manual way to add them after a set.

## Not done

Training blocks with a planned deload week, EMOM / AMRAP / Tabata timers, structured intervals, a
chart of pace per sport and a warning about hard cardio before a heavy leg day are not built. The
Coach (server side) does not know the `rpe` policy.
