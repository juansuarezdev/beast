// Back-off sets: after a heavy top set, a few more at a lower percentage of its weight. Pure, so the
// workout screen and the tests read the same rule.

import { snapWeight } from './progression.js'

export const BACKOFF_SETS = 3
export const BACKOFF_PCT = 85
export const BACKOFF_MIN_REPS = 5

// The rows to add after `top` ({ w, r }): `sets` rows at `pct` percent of its weight, on a weight
// the bar can carry and always below the top set's. Reps are what the top set did, but at least a
// working number — a heavy single is followed by sets of five, not more singles. null when the top
// set has no weight to work from.
export function backoffRows(top, { sets = BACKOFF_SETS, pct = BACKOFF_PCT, step = 2.5 } = {}) {
  if (!(top?.w > 0) || !(step > 0) || !(sets > 0)) return null
  let w = snapWeight((top.w * pct) / 100, step)
  if (w >= top.w) w = Math.max(step, top.w - step)
  const r = Math.max(Math.round(top.r) || 0, BACKOFF_MIN_REPS)
  return Array.from({ length: Math.round(sets) }, () => ({ w, r, done: false }))
}
