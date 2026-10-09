// How strong a lifter is for their size: the estimated 1RM of the main lifts as a multiple of body
// weight, placed on a rough six-step scale from beginner to "beast". The thresholds are the usual
// rule-of-thumb bodyweight multiples for a man; a profile set to the female body figure gets them
// scaled down. They are an orientation, not a measurement — the card that shows them says so.

import { best1RM } from './onerm.js'

// Thresholds to reach novice, intermediate, advanced, elite and beast, as multiples of body weight.
export const LIFTS = [
  { key: 'squat', ids: ['0043'], std: [1.0, 1.5, 2.0, 2.5, 3.0] },
  { key: 'bench', ids: ['0025'], std: [0.75, 1.0, 1.5, 1.75, 2.0] },
  { key: 'deadlift', ids: ['0032', '0811'], std: [1.25, 1.75, 2.25, 2.75, 3.25] },
  { key: 'press', ids: ['0091'], std: [0.5, 0.7, 0.9, 1.1, 1.3] },
  { key: 'row', ids: ['0027', '3017'], std: [0.65, 0.9, 1.15, 1.4, 1.65] },
]
export const LEVELS = ['beginner', 'novice', 'intermediate', 'advanced', 'elite', 'beast']
const FEMALE_SCALE = 0.65

const round = n => Math.round(n * 10) / 10

// The best estimated 1RM among the exercises that count for a lift.
const bestOf = (S, ids) => ids.reduce((best, id) => {
  const e = best1RM(S, id)
  return e && (!best || e.est > best.est) ? e : best
}, null)

// The level a ratio reaches on a lift, with what the next one asks for and how far along it you
// are, 0 to 1. `scale` turns the thresholds into the profile's.
export function levelFor(ratio, std, bw, scale = 1) {
  const marks = std.map(m => m * scale)
  let level = 0
  while (level < marks.length && ratio >= marks[level]) level++
  const next = level < marks.length ? { level: LEVELS[level + 1], w: round(marks[level] * bw) } : null
  const from = level === 0 ? 0 : marks[level - 1]
  const progress = next ? Math.max(0, Math.min(1, (ratio - from) / (marks[level] - from))) : 1
  return { level, next, progress }
}

// null without a body weight to relate the lifts to; otherwise each lift that has an estimate, and
// the squat + bench + deadlift total when all three do. Weights are in the profile's unit — the
// body weight and the lifts are logged in the same one, so the ratio needs no conversion.
export function strengthLevels(S) {
  const last = (S.bodyweight || [])[(S.bodyweight || []).length - 1]
  const bw = Number(last?.w)
  if (!(bw > 0)) return null
  const scale = S.body === 'female' ? FEMALE_SCALE : 1
  const lifts = []
  for (const lift of LIFTS) {
    const e = bestOf(S, lift.ids)
    if (!e) continue
    const ratio = e.est / bw
    lifts.push({ key: lift.key, e1rm: round(e.est), ratio: Math.round(ratio * 100) / 100, ...levelFor(ratio, lift.std, bw, scale) })
  }
  if (!lifts.length) return null
  const big = ['squat', 'bench', 'deadlift'].map(k => lifts.find(l => l.key === k))
  const total = big.every(Boolean) ? { w: round(big.reduce((s, l) => s + l.e1rm, 0)), ratio: Math.round((big.reduce((s, l) => s + l.e1rm, 0) / bw) * 100) / 100 } : null
  return { bw, lifts, total }
}
