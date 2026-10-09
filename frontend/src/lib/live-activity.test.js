import { describe, expect, it } from 'vitest'
import { completeSetFromLock, liveActivityState, nextSetSummary, upcomingSets } from './live-activity.js'
import { makeSideSet } from './workout-model.js'

const nameOf = id => ({ bench: 'Bench Press', row: 'Row' }[id] || 'Unknown')
const opts = { unit: 'kg', nameOf }
const set = (extra = {}) => ({ w: 60, r: 8, done: false, ...extra })

describe('nextSetSummary', () => {
  it('points at the first undone set of the current exercise', () => {
    const active = { cur: 0, entries: [{ id: 'bench', sets: [set({ done: true }), set(), set()] }] }
    expect(nextSetSummary(active, opts)).toEqual({ title: 'Bench Press', detail: 'Set 2/3 · 60 kg × 8' })
  })

  it('moves on to the next exercise once the current one is finished', () => {
    const active = {
      cur: 0,
      entries: [{ id: 'bench', sets: [set({ done: true })] }, { id: 'row', sets: [set({ w: 40, r: 10 })] }],
    }
    expect(nextSetSummary(active, opts)).toEqual({ title: 'Row', detail: 'Set 1/1 · 40 kg × 10' })
  })

  it('looks back at exercises before the current one that were left unfinished', () => {
    const active = { cur: 1, entries: [{ id: 'bench', sets: [set()] }, { id: 'row', sets: [set({ done: true })] }] }
    expect(nextSetSummary(active, opts).title).toBe('Bench Press')
  })

  it('says only reps for a bodyweight set and seconds for a timed one', () => {
    const bw = { cur: 0, entries: [{ id: 'row', sets: [set({ w: 0, r: 12 })] }] }
    expect(nextSetSummary(bw, opts).detail).toBe('Set 1/1 · 12 reps')
    const timed = { cur: 0, entries: [{ id: 'row', sets: [{ w: 0, r: 0, sec: 45, done: false }] }] }
    expect(nextSetSummary(timed, opts).detail).toBe('Set 1/1 · 45s')
  })

  it('uses the unit it is given and trims a trailing .0', () => {
    const active = { cur: 0, entries: [{ id: 'bench', sets: [set({ w: 135.0, r: 5 })] }] }
    expect(nextSetSummary(active, { unit: 'lb', nameOf }).detail).toBe('Set 1/1 · 135 lb × 5')
    const frac = { cur: 0, entries: [{ id: 'bench', sets: [set({ w: 62.5, r: 5 })] }] }
    expect(nextSetSummary(frac, opts).detail).toBe('Set 1/1 · 62.5 kg × 5')
  })

  it('reads a per-side set from the side that is still to do', () => {
    const row = makeSideSet({ w: 20, r: 10 })
    row.sides.L.done = true
    const active = { cur: 0, entries: [{ id: 'row', sets: [row] }] }
    // a per-side row splits its reps between the two sides: 10 in total is 5 each
    expect(nextSetSummary(active, opts)).toEqual({ title: 'Row', detail: 'Set 1/1 · 20 kg × 5' })
  })

  it('is null when every set is done or there is nothing to do', () => {
    expect(nextSetSummary({ cur: 0, entries: [{ id: 'bench', sets: [set({ done: true })] }] }, opts)).toBeNull()
    expect(nextSetSummary({ cur: 0, entries: [] }, opts)).toBeNull()
    expect(nextSetSummary(null, opts)).toBeNull()
  })

  it('survives a cur that is missing or out of range', () => {
    const entries = [{ id: 'bench', sets: [set()] }]
    expect(nextSetSummary({ entries }, opts).title).toBe('Bench Press')
    expect(nextSetSummary({ cur: 9, entries }, opts).title).toBe('Bench Press')
  })
})

describe('liveActivityState', () => {
  const active = { id: 'a1', name: 'Push', cur: 0, entries: [{ id: 'bench', sets: [set()] }] }
  const labels = { rest: 'Rest', ready: 'Ready', done: 'Done', finish: 'Finish workout' }

  it('is null with no workout in progress', () => {
    expect(liveActivityState(null, null, { ...opts, labels })).toBeNull()
  })

  it('is null for a backfilled session or an edit of a saved workout', () => {
    expect(liveActivityState({ ...active, backfill: {} }, null, { ...opts, labels })).toBeNull()
    expect(liveActivityState({ ...active, editingWorkoutId: 'w1' }, null, { ...opts, labels })).toBeNull()
  })

  it('describes the next set with no rest running', () => {
    expect(liveActivityState(active, null, { ...opts, labels })).toEqual({
      workoutName: 'Push', title: 'Bench Press', detail: 'Set 1/1 · 60 kg × 8',
      restLabel: 'Rest', readyLabel: 'Ready', doneLabel: 'Done', finishLabel: 'Finish workout',
      sessionId: 'a1', queue: [{ e: 0, s: 0, title: 'Bench Press', detail: 'Set 1/1 · 60 kg × 8', rest: 0 }],
      restState: 'none', restStartedAt: 0, restEndsAt: 0, pausedLeft: 0,
    })
  })

  it('carries the absolute end of a running rest, so iOS can count it down on its own', () => {
    const timer = { left: 80, total: 90, endsAt: 1_000_090_000 }
    const s = liveActivityState(active, timer, { ...opts, labels })
    expect(s).toMatchObject({ restState: 'running', restEndsAt: 1_000_090_000, restStartedAt: 1_000_000_000 })
  })

  it('holds the remaining seconds while paused', () => {
    const s = liveActivityState(active, { left: 42, total: 90, endsAt: 5, paused: true }, { ...opts, labels })
    expect(s).toMatchObject({ restState: 'paused', pausedLeft: 42, restEndsAt: 0 })
  })

  it('marks a rest that is over as ready', () => {
    const s = liveActivityState(active, { left: 0, total: 90, endsAt: 5, ready: true }, { ...opts, labels })
    expect(s.restState).toBe('ready')
  })

  it('tells the lifter to finish once every set is done', () => {
    const done = { name: 'Push', cur: 0, entries: [{ id: 'bench', sets: [set({ done: true })] }] }
    const s = liveActivityState(done, null, { ...opts, labels })
    expect(s).toMatchObject({ title: 'Push', detail: 'Finish workout' })
  })
})

describe('upcomingSets', () => {
  const restFor = () => 90

  it('lists the undone plain sets in order with the rest each one earns', () => {
    const active = { cur: 0, entries: [{ id: 'bench', sets: [set({ done: true }), set(), set({ w: 65 })] }, { id: 'row', sets: [set({ w: 40, r: 10 })] }] }
    expect(upcomingSets(active, { ...opts, restFor })).toEqual([
      { e: 0, s: 1, title: 'Bench Press', detail: 'Set 2/3 · 60 kg × 8', rest: 90 },
      { e: 0, s: 2, title: 'Bench Press', detail: 'Set 3/3 · 65 kg × 8', rest: 90 },
      { e: 1, s: 0, title: 'Row', detail: 'Set 1/1 · 40 kg × 10', rest: 90 },
    ])
  })

  it('stops at the first row that needs the app, so nothing is ticked out of order', () => {
    const timed = { w: 0, r: 0, sec: 30, done: false }
    const drop = set({ type: 'dropset', drops: [{ w: 40, r: 8 }] })
    const active = { cur: 0, entries: [{ id: 'bench', sets: [set(), timed, set()] }] }
    expect(upcomingSets(active, opts).map(x => x.s)).toEqual([0])
    expect(upcomingSets({ cur: 0, entries: [{ id: 'bench', sets: [drop, set()] }] }, opts)).toEqual([])
    const side = makeSideSet({ w: 20, r: 10 })
    expect(upcomingSets({ cur: 0, entries: [{ id: 'row', sets: [side] }] }, opts)).toEqual([])
  })

  it('leaves out supersets, which rest in their own rhythm', () => {
    const active = { cur: 0, entries: [{ id: 'bench', sg: 'a', sets: [set()] }, { id: 'row', sg: 'a', sets: [set()] }] }
    expect(upcomingSets(active, opts)).toEqual([])
  })

  it('caps the list and floors a missing rest at zero', () => {
    const active = { cur: 0, entries: [{ id: 'bench', sets: Array.from({ length: 30 }, () => set()) }] }
    expect(upcomingSets(active, { ...opts, restFor: () => undefined, max: 5 })).toHaveLength(5)
    expect(upcomingSets(active, { ...opts, restFor: () => undefined, max: 5 })[0].rest).toBe(0)
  })
})

describe('completeSetFromLock', () => {
  const session = () => ({
    active: { cur: 0, entries: [{ id: 'bench', sets: [set({ planSec: 30 }), set()] }, { id: 'row', sets: [set()] }] },
  })

  it('ticks the row and drops the leftover hold plan', () => {
    const S = session()
    expect(completeSetFromLock(S, 0, 0)).toBe(true)
    expect(S.active.entries[0].sets[0]).toEqual({ w: 60, r: 8, done: true })
  })

  it('captures the top weight and moves the marker on when an exercise is finished', () => {
    const S = session()
    completeSetFromLock(S, 0, 0)
    expect(S.active.entries[0].topW).toBeUndefined()
    completeSetFromLock(S, 0, 1)
    expect(S.active.entries[0].topW).toBe(60)
    expect(S.active.cur).toBe(1)
  })

  it('does nothing for a set that is already done, missing, or per-side', () => {
    const S = session()
    S.active.entries[0].sets[0].done = true
    expect(completeSetFromLock(S, 0, 0)).toBe(false)
    expect(completeSetFromLock(S, 5, 0)).toBe(false)
    expect(completeSetFromLock({ active: null }, 0, 0)).toBe(false)
    const side = { active: { cur: 0, entries: [{ id: 'row', sets: [makeSideSet({ w: 20, r: 10 })] }] } }
    expect(completeSetFromLock(side, 0, 0)).toBe(false)
  })
})
