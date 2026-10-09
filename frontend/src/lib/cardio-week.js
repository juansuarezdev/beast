// How much cardio the current week holds: the minutes that count toward a weekly goal, with the
// distance and the sessions behind them. Counts only ticked rows with minutes, so a planned run that
// was skipped does not. Pure, so the Home card and the tests read the same rule.

import { weekKey } from './format.js'
import { isWarmupRow } from './workout-model.js'
import { cardioKindFromName, distanceKmOf } from './cardio.js'

export function cardioWeek(workouts, todayIso, ws, nameOf = () => '') {
  const key = weekKey(todayIso, ws)
  const out = { minutes: 0, km: 0, sessions: 0, byKind: {} }
  for (const w of workouts || []) {
    if (!w?.d || weekKey(w.d, ws) !== key) continue
    let any = false
    for (const entry of w.entries || []) {
      const rows = (entry.sets || []).filter(s => s?.done && !isWarmupRow(s) && s.min > 0)
      if (!rows.length) continue
      any = true
      const kind = cardioKindFromName(nameOf(entry.id)) || 'other'
      const slot = out.byKind[kind] || (out.byKind[kind] = { minutes: 0, km: 0 })
      for (const s of rows) {
        const km = kind === 'other' ? 0 : distanceKmOf(s)
        out.minutes += s.min
        out.km += km
        slot.minutes += s.min
        slot.km += km
      }
    }
    if (any) out.sessions++
  }
  out.km = Math.round(out.km * 100) / 100
  for (const slot of Object.values(out.byKind)) slot.km = Math.round(slot.km * 100) / 100
  return out
}

// The share of the goal reached, capped at a full ring; 0 with no goal.
export const goalShare = (minutes, goal) => (goal > 0 ? Math.min(1, minutes / goal) : 0)
