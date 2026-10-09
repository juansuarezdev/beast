import { describe, expect, it } from 'vitest'
import { backoffOf, backoffStartReps, backoffWeight, cleanBackoff, roleOf, topIndex, withBackoff } from './topset.js'
import { WEIGHT_ORIGIN_MANUAL } from './workout-model.js'

const bo = { pct: 85, repsMin: 10, reps: 14 }
const cfg = { sets: 3, mode: 'reps', reps: 10, repsMin: 6, backoff: bo }
const row = (w, r, extra = {}) => ({ w, r, done: false, ...extra })

describe('cleanBackoff', () => {
  it('keeps a valid one and fills the gaps', () => {
    expect(cleanBackoff({ pct: 85, repsMin: 10, reps: 14 })).toEqual({ pct: 85, repsMin: 10, reps: 14 })
    expect(cleanBackoff({ reps: 12 })).toEqual({ pct: 85, repsMin: 12, reps: 12 })
  })

  it('holds the percentage to 50–95 and the reps to 1–15, the floor never above the top', () => {
    expect(cleanBackoff({ pct: 120, reps: 20 })).toEqual({ pct: 95, repsMin: 15, reps: 15 })
    expect(cleanBackoff({ pct: 10, reps: 12 }).pct).toBe(50)
    expect(cleanBackoff({ reps: 10, repsMin: 14 })).toEqual({ pct: 85, repsMin: 10, reps: 10 })
  })

  it('is null for anything that is not one', () => {
    for (const bad of [null, undefined, 3, 'x', {}, { pct: 85 }, { reps: 0 }]) expect(cleanBackoff(bad)).toBeNull()
  })
})

describe('backoffOf', () => {
  it('applies to loaded rep work with two or more sets', () => {
    expect(backoffOf(cfg)).toEqual(bo)
    expect(backoffOf({ ...cfg, mode: undefined })).toEqual(bo)
  })

  it('does not apply to one set, a hold, cardio or a per-side exercise', () => {
    expect(backoffOf({ ...cfg, sets: 1 })).toBeNull()
    expect(backoffOf({ ...cfg, mode: 'time' })).toBeNull()
    expect(backoffOf({ ...cfg, mode: 'cardio' })).toBeNull()
    expect(backoffOf({ ...cfg, side: true })).toBeNull()
    expect(backoffOf({ sets: 3, reps: 10 })).toBeNull()
    expect(backoffOf(null)).toBeNull()
  })
})

describe('backoffWeight', () => {
  it('takes the percentage on a weight the bar can carry', () => {
    expect(backoffWeight(100, 85, 2.5)).toBe(85)
    expect(backoffWeight(60, 85, 2.5)).toBe(50)
    expect(backoffWeight(22, 85, 2)).toBe(18)
  })

  it('stays below the top set even when the step is too coarse to tell', () => {
    expect(backoffWeight(10, 90, 5)).toBe(5)
    expect(backoffWeight(20, 95, 2.5)).toBe(17.5)
  })

  it('is 0 without a weight to work from', () => {
    expect(backoffWeight(0, 85, 2.5)).toBe(0)
    expect(backoffWeight(60, 85, 0)).toBe(0)
  })
})

describe('withBackoff', () => {
  it('sets every open back-off row from the top set, at the middle of its rep range', () => {
    const out = withBackoff([row(100, 8), row(100, 8), row(100, 8)], cfg, 2.5)
    expect(out.map(r => [r.w, r.r])).toEqual([[100, 8], [85, backoffStartReps(bo)], [85, backoffStartReps(bo)]])
    expect(backoffStartReps(bo)).toBe(12)
  })

  it('looks past warm-up rows to find the top set', () => {
    const rows = [row(40, 10, { phase: 'warmup' }), row(100, 8), row(100, 8)]
    const out = withBackoff(rows, { ...cfg, sets: 2 }, 2.5)
    expect(out.map(r => r.w)).toEqual([40, 100, 85])
    expect(topIndex(rows)).toBe(1)
  })

  it('leaves a ticked row and a back-off weight typed by hand alone', () => {
    const rows = [row(100, 8), row(70, 12, { done: true }), row(80, 12, { weightOrigin: WEIGHT_ORIGIN_MANUAL })]
    const out = withBackoff(rows, cfg, 2.5)
    expect(out[1]).toEqual(rows[1])
    expect(out[2].w).toBe(80)
  })

  it('follows a changed top set weight', () => {
    const base = withBackoff([row(100, 8), row(100, 8), row(100, 8)], cfg, 2.5)
    const moved = withBackoff([{ ...base[0], w: 110 }, base[1], base[2]], cfg, 2.5)
    expect(moved.map(r => r.w)).toEqual([110, 92.5, 92.5])
  })

  it('does nothing without a plan, without a top weight, or with a single work row', () => {
    const rows = [row(100, 8), row(100, 8)]
    expect(withBackoff(rows, { sets: 2, reps: 8 }, 2.5)).toBe(rows)
    expect(withBackoff([row(0, 8), row(0, 8)], cfg, 2.5).map(r => r.w)).toEqual([0, 0])
    const one = [row(100, 8)]
    expect(withBackoff(one, cfg, 2.5)).toBe(one)
  })
})

describe('roleOf', () => {
  it('names the first work row the top set and the rest back-off', () => {
    const rows = [row(40, 10, { phase: 'warmup' }), row(100, 8), row(85, 12), row(85, 12)]
    expect(rows.map((_, i) => roleOf(cfg, rows, i))).toEqual([null, 'top', 'backoff', 'backoff'])
  })

  it('is null for an exercise without the plan', () => {
    const rows = [row(100, 8), row(85, 12)]
    expect(roleOf({ sets: 2, reps: 8 }, rows, 0)).toBeNull()
  })
})
