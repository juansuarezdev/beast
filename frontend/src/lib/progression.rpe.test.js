import { describe, expect, it } from 'vitest'
import { DEFAULT_RPE_TARGET, nextPrescription, POLICIES_FOR, POLICY_DESC, POLICY_NAME, readSession, weightIncrement } from './progression.js'

const LIFT = '0025'   // barbell bench press
const cfg = { id: LIFT, sets: 3, reps: 5, weight: 100, prog: 'rpe' }
const inc = weightIncrement(cfg, 'kg')

// A history of sessions, each [weight, ...sets] with a set being [reps, effort] — effort an
// { rpe } or { rir } object, or nothing.
const session = (d, w, sets) => ({
  d,
  entries: [{ id: LIFT, target: { sets: 3, reps: 5, weight: w }, sets: sets.map(([r, effort]) => ({ w, r, done: r > 0, ...effort })) }],
})
const S = (...sessions) => ({ unit: 'kg', workouts: sessions })
const rated = (rpe, reps = 5) => [[reps, { rpe }], [reps, { rpe }], [reps, { rpe }]]

describe('the RPE-based rule', () => {
  it('is offered for loaded rep work and named', () => {
    expect(POLICIES_FOR.reps).toContain('rpe')
    expect(POLICIES_FOR.time).not.toContain('rpe')
    expect(POLICY_NAME.rpe).toBe('RPE-based progression')
    expect(POLICY_DESC.rpe).toMatch(/RPE/)
  })

  it('adds one step when the sets felt easier than the effort aimed for', () => {
    const p = nextPrescription(S(session('2026-01-01', 100, rated(7))), cfg)
    expect(p).toMatchObject({ kind: 'up', weight: 100 + inc })
  })

  it('adds two steps when they felt much easier', () => {
    const p = nextPrescription(S(session('2026-01-01', 100, rated(6))), cfg)
    expect(p).toMatchObject({ kind: 'up', weight: 100 + inc * 2 })
  })

  it('holds the weight when the effort was on target', () => {
    expect(nextPrescription(S(session('2026-01-01', 100, rated(8))), cfg)).toMatchObject({ kind: 'hold', weight: 100 })
    expect(nextPrescription(S(session('2026-01-01', 100, rated(8.5))), cfg)).toMatchObject({ kind: 'hold', weight: 100 })
  })

  it('holds the weight when it was harder than aimed for, even with every rep made', () => {
    const p = nextPrescription(S(session('2026-01-01', 100, rated(9.5))), cfg)
    expect(p.kind).toBe('hold')
    expect(p.weight).toBe(100)
    expect(p.why[0]).toMatch(/harder/)
  })

  it('reads a rating given as reps in reserve as the RPE it stands for', () => {
    const rir = [[5, { rir: 3 }], [5, { rir: 3 }], [5, { rir: 3 }]]   // RIR 3 is RPE 7
    expect(nextPrescription(S(session('2026-01-01', 100, rir)), cfg)).toMatchObject({ kind: 'up', weight: 100 + inc })
  })

  it('follows the effort the exercise was given', () => {
    expect(nextPrescription(S(session('2026-01-01', 100, rated(8))), { ...cfg, rpeTarget: 9 })).toMatchObject({ kind: 'up', weight: 100 + inc })
    expect(DEFAULT_RPE_TARGET).toBe(8)
  })

  it('keeps the weight, and says why, when no effort was rated', () => {
    const plain = [[5], [5], [5]]
    const p = nextPrescription(S(session('2026-01-01', 100, plain)), cfg)
    expect(p).toMatchObject({ kind: 'hold', weight: 100 })
    expect(p.why[0]).toMatch(/effort/i)
  })

  it('never adds load after missed reps, and takes weight off after repeated misses', () => {
    const miss = [[5, { rpe: 7 }], [5, { rpe: 7 }], [3, { rpe: 10 }]]
    expect(nextPrescription(S(session('2026-01-01', 100, miss)), cfg)).toMatchObject({ kind: 'hold', weight: 100 })
    const twice = S(session('2026-01-01', 100, miss), session('2026-01-08', 100, miss))
    const p = nextPrescription(twice, cfg)
    expect(p.kind).toBe('deload')
    expect(p.weight).toBeLessThan(100)
  })

  it('says nothing before there is a session to read', () => {
    expect(nextPrescription(S(), cfg).kind).toBe('first')
  })
})

describe('reading the effort of a session', () => {
  const entry = sets => ({ id: LIFT, target: { sets: 3, reps: 5 }, sets })

  it('averages what was rated, counting only the sets done', () => {
    const s = readSession(entry([{ w: 100, r: 5, done: true, rpe: 7 }, { w: 100, r: 5, done: true, rpe: 9 }, { w: 100, r: 0, done: false, rpe: 10 }]))
    expect(s.rpe).toBe(8)
  })

  it('leaves the read exactly as it was when nothing was rated', () => {
    const s = readSession(entry([{ w: 100, r: 5, done: true }, { w: 100, r: 5, done: true }, { w: 100, r: 5, done: true }]))
    expect('rpe' in s).toBe(false)
  })
})
