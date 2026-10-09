// What a set just logged says about the last one: heavier, more reps, the same, or less. Pure, so the
// workout screen and the tests read the same rules. Only the first number that moved is reported
// — weight before reps, minutes before speed — the way a lifter reads progress.

import { t } from './i18n.js'
import { toSpeed } from './speed.js'
import { isWarmupRow } from './workout-model.js'

const num = n => String(Math.round(n * 100) / 100)
const sign = d => (d > 0 ? '+' : '−')

// `ref` and `cur` are plain set rows ({ w, r } | { sec, w } | { min, speed }). null when there is
// nothing to hold the row against or a field it needs is missing.
export function compareSetTo(ref, cur, mode, { unit = 'kg', speedUnit = 'kmh' } = {}) {
  if (!ref || !cur) return null
  const step = (a, b, text) => (a === b ? null : { dir: a > b ? 'up' : 'down', text: sign(a - b) + text(Math.abs(a - b)) })
  let hit = null
  if (mode === 'cardio') {
    if (!(cur.min > 0) || !(ref.min > 0)) return null
    hit = step(cur.min, ref.min, d => num(d) + ' min')
      || step(cur.speed || 0, ref.speed || 0, d => num(toSpeed(d, speedUnit)) + ' ' + (speedUnit === 'mph' ? 'mph' : 'km/h'))
  } else if (mode === 'time') {
    if (!(cur.sec > 0) || !(ref.sec > 0)) return null
    hit = step(cur.w || 0, ref.w || 0, d => ' ' + num(d) + ' ' + unit) || step(cur.sec, ref.sec, d => ' ' + num(d) + 's')
  } else {
    if (!(cur.r > 0) || !(ref.r > 0)) return null
    hit = step(cur.w || 0, ref.w || 0, d => ' ' + num(d) + ' ' + unit) || step(cur.r, ref.r, d => ' ' + num(d) + ' ' + t('reps'))
  }
  return hit ? { dir: hit.dir, text: hit.text.replace(/^([+−])\s+/, '$1') } : { dir: 'same', text: '=' }
}

const round5 = n => Math.round(n / 5) * 5

// The rest a work set earns, scaled from the rest the lifter set for an ordinary set: heavy
// low-rep sets recover slower, light high-rep ones faster, and a set taken to (or past) failure
// asks for a little more. `base` is already what the exercise or the profile asked for; an
// exercise with its own rest, a warm-up, a hold or cardio keeps it untouched.
export function smartRestSec({ base, reps, rir, rpe, own = false }) {
  if (own || !(base > 0) || !(reps > 0)) return base
  const factor = reps <= 3 ? 2 : reps <= 5 ? 1.75 : reps <= 8 ? 1.25 : reps <= 12 ? 1 : 0.75
  let sec = Math.min(round5(base * factor), Math.max(base, 300))
  if ((rir != null && rir <= 0) || (rpe != null && rpe >= 9.5)) sec = Math.min(sec + 30, 360)
  return Math.max(sec, 15)
}

// smartRestSec for a row of a session: only a work row of reps with its own numbers, in a profile
// that has the setting on (it is off until switched on), and only when the exercise does not set
// its own rest time — `base` is what the exercise or the profile asked for.
export function smartRestForSet(S, entry, row, base) {
  if (!S?.smartRest || !row || isWarmupRow(row) || !(row.r > 0) || row.sec > 0 || row.min > 0) return base
  return smartRestSec({ base, reps: row.r, rir: row.rir, rpe: row.rpe, own: entry?.target?.restSec > 0 })
}
