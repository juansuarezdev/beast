// Strength records and training percentages for one exercise: the heaviest weight lifted for at
// least 1, 3, 5, 8 and 10 reps, and a table of what each percentage of the estimated 1RM weighs on
// the bar. Pure, so the exercise sheet and the tests read the same rules.

import { isAssisted } from './exercises.js'
import { entriesForExercise } from './history.js'
import { snapWeight } from './progression.js'
import { isSideSet, isWarmupRow } from './workout-model.js'

export const RECORD_REPS = [1, 3, 5, 8, 10]
export const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50]

// For each target number of reps, the heaviest weight lifted for at least that many — a set of 5
// at 100 kg is also a record for 3 and for 1 — with the set it came from and the day it first
// happened. An exercise that has none for a target leaves that slot null. Warm-ups, per-side rows
// and assistance machines (where less weight is the better one) are left out.
export function repRecords(workouts, exId, targets = RECORD_REPS) {
  if (isAssisted(exId)) return targets.map(() => null)
  const best = targets.map(() => null)
  for (const w of workouts || []) {
    for (const entry of entriesForExercise(w, exId)) {
      for (const s of entry.sets || []) {
        if (!s?.done || isWarmupRow(s) || isSideSet(s) || !(s.w > 0) || !(s.r > 0)) continue
        targets.forEach((n, i) => {
          if (s.r >= n && (!best[i] || s.w > best[i].w)) best[i] = { reps: n, w: s.w, r: s.r, d: w.d }
        })
      }
    }
  }
  return best
}

// What a percentage of the estimated 1RM weighs, landed on a weight the bar can carry.
export function percentTable(oneRM, step, percentages = PERCENTAGES) {
  if (!(oneRM > 0) || !(step > 0)) return []
  return percentages.map(pct => ({ pct, w: snapWeight((oneRM * pct) / 100, step) }))
}
