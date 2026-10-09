// Top set + back-off: the first work set of an exercise is the heavy one, the rest are lighter sets
// at a percentage of its weight for more reps. The top set is the one that decides progression and
// that the weight follows; the back-off weight is worked out from it, never typed separately.
// Pure, so the session builder, the workout screen, the lock-screen queue and the tests all read
// the same rule.

import { snapWeight } from './progression.js'
import { isSideSet, isWarmupRow, WEIGHT_ORIGIN_MANUAL } from './workout-model.js'

export const BACKOFF_DEFAULT_PCT = 85
const PCT_MIN = 50
const PCT_MAX = 95

// A positive whole number, held to lo–hi; 0 for anything that is not one, so a missing value is told
// apart from a value that was too small.
const whole = (v, lo, hi) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? Math.max(lo, Math.min(hi, n)) : 0
}

// What a plan file or a config sheet is allowed to say, kept to the same limits both ways: the pct
// between 50 and 95, the back-off reps a positive number up to 15 — an exercise's own range, from
// the floor to the top, with the top never below the floor. null for anything that is not one.
export function cleanBackoff(x) {
  if (!x || typeof x !== 'object') return null
  const reps = whole(x.reps, 1, 15)
  if (!reps) return null
  const repsMin = x.repsMin != null ? Math.min(reps, whole(x.repsMin, 1, 15) || reps) : reps
  return { pct: whole(x.pct, PCT_MIN, PCT_MAX) || BACKOFF_DEFAULT_PCT, repsMin, reps }
}

// The back-off of an exercise, when it applies: loaded rep work with at least two sets, not a
// per-side or a hold. The target and the plan's config both carry it, so either can be asked.
export function backoffOf(cfg) {
  if (!cfg || (cfg.mode && cfg.mode !== 'reps') || cfg.side) return null
  if (!(cfg.sets >= 2)) return null
  return cleanBackoff(cfg.backoff)
}

// The weight of a back-off set: the given percentage of the top set's, on a weight the bar can
// carry and always below it. 0 when the top set has no weight.
export function backoffWeight(topW, pct, step) {
  if (!(topW > 0) || !(step > 0)) return 0
  const w = snapWeight((topW * pct) / 100, step)
  return w >= topW ? Math.max(step, topW - step) : w
}

// Where a back-off row starts in its rep range: the middle, rounded up — the lifter moves it either way.
export const backoffStartReps = b => Math.ceil((b.repsMin + b.reps) / 2)

const workIndexes = rows => rows.map((r, i) => i).filter(i => !isWarmupRow(rows[i]))

// Which index the top set is: the first work row.
export const topIndex = rows => workIndexes(rows)[0] ?? -1

// 'top' | 'backoff' | null for a row of an entry that has a back-off plan.
export function roleOf(cfg, rows, i) {
  if (!backoffOf(cfg) || isWarmupRow(rows[i]) || isSideSet(rows[i])) return null
  return i === topIndex(rows) ? 'top' : 'backoff'
}

// The rows with the back-off ones recomputed from the top set. Rows already ticked, and back-off
// weights the lifter typed by hand, are left as they are; the reps of an open back-off row start
// at the middle of its range.
export function withBackoff(rows, cfg, step) {
  const b = backoffOf(cfg)
  if (!b) return rows
  if (!(step > 0)) step = 2.5
  const work = workIndexes(rows)
  if (work.length < 2) return rows
  const top = rows[work[0]]
  if (!(top?.w > 0) || isSideSet(top)) return rows
  const w = backoffWeight(top.w, b.pct, step)
  const out = rows.slice()
  for (const i of work.slice(1)) {
    const row = rows[i]
    if (row.done || isSideSet(row)) continue
    out[i] = { ...row, r: backoffStartReps(b), ...(row.weightOrigin === WEIGHT_ORIGIN_MANUAL ? {} : { w }) }
  }
  return out
}
