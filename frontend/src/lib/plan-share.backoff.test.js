import { describe, expect, it } from 'vitest'
import { buildPlanBundle, mergePlan, parsePlan } from './plan-share.js'

const LIFT = '0818'
const routine = (ex, id = 'r1') => ({ id, name: 'Pull', emoji: '💪', ex })

describe('a plan file with a top set and back-off sets', () => {
  const S = { unit: 'kg', week: { 4: ['r1'] }, customEx: [], routines: [routine([{ id: LIFT, sets: 3, reps: 10, repsMin: 6, prog: 'double', backoff: { pct: 85, repsMin: 10, reps: 14 } }])] }

  it('carries the back-off plan out and back in', () => {
    const bundle = buildPlanBundle(S, 'x')
    expect(bundle.routines[0].ex[0].backoff).toEqual({ pct: 85, repsMin: 10, reps: 14 })
    const parsed = parsePlan(JSON.stringify(bundle), 'kg')
    const draft = { unit: 'kg', routines: [], week: {}, customEx: [] }
    mergePlan(draft, parsed, { schedule: true })
    expect(draft.routines[0].ex[0].backoff).toEqual({ pct: 85, repsMin: 10, reps: 14 })
  })

  it('holds a hand-edited one to the same limits the config sheet has', () => {
    const file = { opengym_plan: 1, unit: 'kg', week: {}, customEx: [], routines: [routine([{ id: LIFT, sets: 3, reps: 10, backoff: { pct: 120, reps: 40 } }])] }
    expect(parsePlan(JSON.stringify(file), 'kg').routines[0].ex[0].backoff).toEqual({ pct: 95, repsMin: 15, reps: 15 })
  })

  it('drops one that is not a back-off plan, and one on a hold', () => {
    const file = { opengym_plan: 1, unit: 'kg', week: {}, customEx: [], routines: [routine([{ id: LIFT, sets: 3, reps: 10, backoff: 'lots' }, { id: LIFT, sets: 3, mode: 'time', sec: 30 }])] }
    const [a] = parsePlan(JSON.stringify(file), 'kg').routines[0].ex
    expect('backoff' in a).toBe(false)
    const out = buildPlanBundle({ ...S, routines: [routine([{ id: LIFT, sets: 3, mode: 'time', sec: 30, backoff: { reps: 10 } }])] }, 'x')
    expect('backoff' in out.routines[0].ex[0]).toBe(false)
  })
})
