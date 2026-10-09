// The goals the Home screen tracks, worked out from the log: body weight toward its target, sessions
// and cardio minutes this week, a lift's estimated 1RM toward a target, and the time for a distance
// (a 5 km under 30 minutes). Pure — the Home card, the goals sheet and the tests all read this.

import { weekKey } from './format.js'
import { isWarmupRow } from './workout-model.js'
import { cardioKindFromName } from './cardio.js'
import { cardioWeek } from './cardio-week.js'
import { best1RM } from './onerm.js'

const round1 = n => Math.round(n * 10) / 10
const clamp01 = n => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0)

// "27:30" for 27.5 minutes.
export function clockOfMinutes(min) {
  const total = Math.round(min * 60)
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0')
}

// The fastest time a run of at least `km` implies for `km`: the minutes of the best run at least
// that long, scaled to the distance at the pace it was run — so a 6 km run in 33 minutes says
// 27:30 for 5 km. null with no such run.
export function bestTimeForDistance(workouts, km, nameOf) {
  let best = null
  for (const w of workouts || []) {
    for (const entry of w.entries || []) {
      if (cardioKindFromName(nameOf(entry.id)) !== 'run') continue
      for (const s of entry.sets || []) {
        if (!s?.done || isWarmupRow(s) || !(s.min > 0) || !(s.dist >= km)) continue
        const est = (s.min * km) / s.dist
        if (best == null || est < best) best = est
      }
    }
  }
  return best
}

// Each goal the profile has, in the order the card lists them. `share` is how far along it is, 0 to
// 1; `done` when it is reached. A goal with nothing logged toward it yet still shows, at 0.
export function goalsProgress(S, todayIso, ws, nameOf = () => '') {
  const out = []

  const bw = (S.bodyweight || [])[(S.bodyweight || []).length - 1]
  if (S.targetW > 0 && bw) {
    const start = S.bodyweight[0].w
    const to = S.targetW
    const share = start === to ? 1 : clamp01((bw.w - start) / (to - start))
    out.push({ key: 'weight', kind: 'weight', current: bw.w, target: to, share, done: Math.abs(bw.w - to) < 0.05 })
  }

  if (S.sessionsGoal > 0) {
    const key = weekKey(todayIso, ws)
    const n = (S.workouts || []).filter(w => weekKey(w.d, ws) === key && (w.entries || []).some(e => (e.sets || []).some(x => x?.done && !isWarmupRow(x)))).length
    out.push({ key: 'sessions', kind: 'sessions', current: n, target: S.sessionsGoal, share: clamp01(n / S.sessionsGoal), done: n >= S.sessionsGoal })
  }

  if (S.cardioGoalMin > 0) {
    const minutes = Math.round(cardioWeek(S.workouts, todayIso, ws, nameOf).minutes)
    out.push({ key: 'cardio', kind: 'cardio', current: minutes, target: S.cardioGoalMin, share: clamp01(minutes / S.cardioGoalMin), done: minutes >= S.cardioGoalMin })
  }

  for (const g of S.liftGoals || []) {
    if (!g?.exId || !(g.target > 0)) continue
    const est = best1RM(S, g.exId)
    const current = est ? round1(est.est) : 0
    out.push({ key: 'lift:' + g.id, kind: 'lift', id: g.id, exId: g.exId, current, target: g.target, share: clamp01(current / g.target), done: current >= g.target })
  }

  for (const g of S.timeGoals || []) {
    if (!(g?.km > 0) || !(g.minutes > 0)) continue
    const best = bestTimeForDistance(S.workouts, g.km, nameOf)
    // A faster time is the better one, so the share is the goal over the time, capped at a full bar.
    out.push({ key: 'time:' + g.id, kind: 'time', id: g.id, km: g.km, target: g.minutes, current: best, share: best == null ? 0 : clamp01(g.minutes / best), done: best != null && best <= g.minutes })
  }
  return out
}
