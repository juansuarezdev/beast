import { describe, expect, it } from 'vitest'
import { levelFor, strengthLevels, LIFTS, LEVELS } from './strength-level.js'

const workout = (d, id, w, r) => ({ d, start: Date.parse(d), entries: [{ id, sets: [{ w, r, done: true }] }] })
const S = (workouts, extra = {}) => ({ workouts, bodyweight: [{ d: '2026-09-01', w: 80 }], unit: 'kg', ...extra })

describe('levelFor', () => {
  const std = LIFTS.find(l => l.key === 'bench').std   // 0.75 1 1.5 1.75 2
  it('places a ratio on the scale, with what comes next and how far along', () => {
    expect(levelFor(0.5, std, 80)).toEqual({ level: 0, next: { level: 'novice', w: 60 }, progress: expect.closeTo(0.667, 2) })
    expect(levelFor(1.0, std, 80)).toMatchObject({ level: 2, next: { level: 'advanced', w: 120 }, progress: 0 })
    expect(levelFor(1.25, std, 80).progress).toBeCloseTo(0.5, 2)
  })

  it('tops out at beast with nothing left to reach', () => {
    expect(levelFor(2.5, std, 80)).toEqual({ level: 5, next: null, progress: 1 })
    expect(LEVELS[5]).toBe('beast')
  })

  it('scales the thresholds for another profile', () => {
    expect(levelFor(0.5, std, 80, 0.65).level).toBe(1)
  })
})

describe('strengthLevels', () => {
  it('estimates each lift from the best set and relates it to body weight', () => {
    const out = strengthLevels(S([workout('2026-09-10', '0025', 100, 5)]))
    expect(out.bw).toBe(80)
    expect(out.lifts).toHaveLength(1)
    const bench = out.lifts[0]
    expect(bench.key).toBe('bench')
    expect(bench.e1rm).toBe(116.7)             // Epley: 100 × (1 + 5/30)
    expect(bench.ratio).toBe(1.46)
    expect(bench.level).toBe(2)                // past 1.0×, short of 1.5×
    expect(bench.next.level).toBe('advanced')
  })

  it('takes the better of the exercises that count for a lift', () => {
    const out = strengthLevels(S([workout('2026-09-10', '0032', 140, 1), workout('2026-09-11', '0811', 160, 1)]))
    expect(out.lifts[0]).toMatchObject({ key: 'deadlift', e1rm: 160 })
  })

  it('adds the three big lifts into a total only when all three are there', () => {
    expect(strengthLevels(S([workout('2026-09-10', '0025', 100, 1), workout('2026-09-10', '0043', 140, 1)])).total).toBeNull()
    const all = strengthLevels(S([workout('2026-09-10', '0025', 100, 1), workout('2026-09-10', '0043', 140, 1), workout('2026-09-10', '0032', 180, 1)]))
    expect(all.total).toEqual({ w: 420, ratio: 5.25 })
  })

  it('uses the lower thresholds for a profile set to the female figure', () => {
    const w = [workout('2026-09-10', '0025', 59, 1)]
    expect(strengthLevels(S(w)).lifts[0].level).toBe(0)       // novice starts at 0.75× — 60 kg at 80 kg
    expect(strengthLevels(S(w, { body: 'female' })).lifts[0].level).toBe(2)
  })

  it('is null without a body weight, without a lift, or without a usable estimate', () => {
    expect(strengthLevels({ workouts: [workout('2026-09-10', '0025', 100, 5)], bodyweight: [] })).toBeNull()
    expect(strengthLevels(S([]))).toBeNull()
    expect(strengthLevels(S([workout('2026-09-10', '0025', 100, 20)]))).toBeNull()   // too many reps to estimate
  })
})
