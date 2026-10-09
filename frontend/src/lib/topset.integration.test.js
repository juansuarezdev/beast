import { describe, expect, it } from 'vitest'
import { buildSets, setsRepsOf } from './history.js'
import { nextPrescription, planChanged, plannedOf, readSession } from './progression.js'
import { buildPlannedEntry } from './session-start.js'

const LIFT = '0818'   // twin handle parallel grip lat pulldown
const bo = { pct: 85, repsMin: 10, reps: 14 }
const cfg = { id: LIFT, sets: 3, reps: 10, repsMin: 6, weight: 60, prog: 'double', backoff: bo }

const hist = (...sessions) => ({
  unit: 'kg', startFrom: 'plan',
  workouts: sessions.map(([d, sets]) => ({ d, entries: [{ id: LIFT, target: { ...cfg }, sets }] })),
})
const logged = rows => rows.map(([w, r]) => ({ w, r, done: true }))

describe('building a top set with back-off sets', () => {
  it('opens with the top set at the planned weight and the rest worked out from it', () => {
    const rows = buildSets({ unit: 'kg', workouts: [] }, cfg, { step: 2.5, planReps: true })
    expect(rows.map(r => r.w)).toEqual([60, 50, 50])
    expect(rows.map(r => r.r)).toEqual([10, 12, 12])
  })

  it('keeps the back-off sets below a warm-up ramp and counts only work rows', () => {
    const rows = buildSets({ unit: 'kg', workouts: [] }, { ...cfg, warmupSets: 1 }, { step: 2.5, planReps: true })
    expect(rows).toHaveLength(4)
    expect(rows.filter(r => r.phase === 'warmup' || r.warmup)).toHaveLength(1)
    expect(rows.slice(-3).map(r => r.w)).toEqual([60, 50, 50])
  })

  it('leaves an exercise without the plan exactly as it was', () => {
    const plain = { ...cfg, backoff: undefined }
    const rows = buildSets({ unit: 'kg', workouts: [] }, plain, { step: 2.5, planReps: true })
    expect(rows.map(r => [r.w, r.r])).toEqual([[60, 10], [60, 10], [60, 10]])
  })

  it('reads as one top set and the back-off sets in the plan line', () => {
    expect(setsRepsOf(cfg)).toBe('1 × 6–10 + 2 × 10–14')
    expect(setsRepsOf({ ...cfg, backoff: undefined })).toBe('3 × 6–10')
  })
})

describe('progression follows the top set alone', () => {
  it('raises the weight when the top set reaches the top of the range, whatever the back-off sets did', () => {
    const s = hist(['2026-09-01', logged([[60, 10], [50, 9], [50, 8]])])
    const p = nextPrescription(s, cfg)
    expect(p.kind).toBe('up')
    expect(p.weight).toBeGreaterThan(60)
  })

  it('holds and aims for more reps when the top set falls short, even if the back-off sets were good', () => {
    const s = hist(['2026-09-01', logged([[60, 8], [50, 14], [50, 14]])])
    const p = nextPrescription(s, cfg)
    expect(p.kind).toBe('hold')
    expect(p.reps).toBe(9)
  })

  it('reads the top set as the session, with the heaviest weight', () => {
    const r = readSession({ id: LIFT, target: cfg, sets: logged([[60, 9], [50, 12], [50, 12]]) })
    expect(r).toMatchObject({ weight: 60, low: 9, amrap: 9, ok: false })
  })

  it('still needs the whole session done for it to count', () => {
    const r = readSession({ id: LIFT, target: cfg, sets: [{ w: 60, r: 10, done: true }, { w: 50, r: 0, done: false }, { w: 50, r: 0, done: false }] })
    expect(r.ok).toBe(true)
  })

  it('a session on an exercise without the plan is read as before', () => {
    const r = readSession({ id: LIFT, target: { ...cfg, backoff: undefined }, sets: logged([[60, 10], [60, 9], [60, 10]]) })
    expect(r.low).toBe(9)
  })
})

describe('the next session after a raise', () => {
  it('opens with the new top weight and back-off sets from it', () => {
    const s = hist(['2026-09-01', logged([[60, 10], [50, 12], [50, 12]])])
    const entry = buildPlannedEntry(s, { ...cfg, weight: 60 }, undefined)
    const top = entry.sets[0].w
    expect(top).toBeGreaterThan(60)
    expect(entry.sets.slice(1).every(r => r.w < top)).toBe(true)
    expect(entry.sets.slice(1).every(r => r.w === entry.sets[1].w)).toBe(true)
    expect(entry.target.backoff).toEqual(bo)
  })
})

describe('editing the back-off plan', () => {
  it('counts as a plan change, so a session built from the old one is not judged by the new', () => {
    const planned = plannedOf(cfg)
    expect(planned.bo).toBe('85:10:14')
    expect(planChanged(planned, cfg)).toBe(false)
    expect(planChanged(planned, { ...cfg, backoff: { ...bo, pct: 80 } })).toBe(true)
    expect(planChanged(planned, { ...cfg, backoff: undefined })).toBe(true)
  })

  it('does not disturb a plan that never had one', () => {
    const plain = { ...cfg, backoff: undefined }
    expect('bo' in plannedOf(plain)).toBe(false)
    expect(planChanged({ sets: 3, reps: 10, repsMin: 6, weight: 60 }, plain)).toBe(false)
  })
})
