import { describe, expect, it } from 'vitest'
import { completeSetFromLock, liveActivityState, nextSetSummary, upcomingSets } from './live-activity.js'
import { makeSideSet, WEIGHT_ORIGIN_MANUAL } from './workout-model.js'

const nameOf = id => ({ bench: 'Bench Press', row: 'Row', plank: 'Plank', run: 'Run', pushup: 'Push-up', curl: 'Curl' }[id] || 'Unknown')
const opts = { unit: 'kg', nameOf }
const set = (extra = {}) => ({ w: 60, r: 8, done: false, ...extra })
const field = (item, k) => item.fields.find(f => f.k === k)

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

  it('reads a cardio row as minutes at a speed, in the unit the profile uses', () => {
    const active = { cur: 0, entries: [{ id: 'run', target: { mode: 'cardio' }, sets: [{ min: 20, speed: 8, done: false }] }] }
    expect(nextSetSummary(active, opts).detail).toBe('Set 1/1 · 20 min · 8 km/h')
    expect(nextSetSummary(active, { ...opts, speedUnit: 'mph' }).detail).toBe('Set 1/1 · 20 min · 4.97 mph')
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
    expect(nextSetSummary(active, opts)).toEqual({ title: 'Row', detail: 'Set 1/1 · R · 20 kg × 5' })
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

describe('upcomingSets', () => {
  const restFor = () => 90

  it('lists the undone sets in order with the rest each earns and the numbers to adjust', () => {
    const active = { cur: 0, entries: [{ id: 'bench', sets: [set({ done: true }), set(), set({ w: 65 })] }, { id: 'row', sets: [set({ w: 40, r: 10 })] }] }
    const out = upcomingSets(active, { ...opts, restFor })
    expect(out.map(x => [x.e, x.s, x.title, x.rest])).toEqual([[0, 1, 'Bench Press', 90], [0, 2, 'Bench Press', 90], [1, 0, 'Row', 90]])
    expect(out[0]).toMatchObject({ setLabel: 'Set 2/3', detail: 'Set 2/3 · 60 kg × 8', side: '' })
    expect(out[0].fields.map(f => [f.k, f.v, f.u])).toEqual([['w', 60, 'kg'], ['r', 8, 'reps']])
    expect(field(out[0], 'w').step).toBeGreaterThan(0)
    expect(field(out[0], 'r').step).toBe(1)
  })

  it('gives a bodyweight exercise reps alone, and adds weight once it carries an added load', () => {
    const bw = { cur: 0, entries: [{ id: 'pushup', target: { bodyweight: true }, sets: [set({ w: 0, r: 12 })] }] }
    expect(upcomingSets(bw, opts)[0].fields.map(f => f.k)).toEqual(['r'])
    const added = { cur: 0, entries: [{ id: 'pushup', target: { bodyweight: true }, sets: [set({ w: 10, r: 12 })] }] }
    expect(upcomingSets(added, opts)[0].fields.map(f => f.k)).toEqual(['w', 'r'])
  })

  it('gives a hold its seconds in steps of five, plus weight when it is loaded', () => {
    const plank = { cur: 0, entries: [{ id: 'plank', target: { mode: 'time' }, sets: [{ sec: 45, w: 0, done: false }] }] }
    const [item] = upcomingSets(plank, opts)
    expect(item.fields).toEqual([{ k: 'sec', v: 45, step: 5, u: 's' }, expect.objectContaining({ k: 'w', v: 0 })])
    const bwPlank = { cur: 0, entries: [{ id: 'plank', target: { mode: 'time', bodyweight: true }, sets: [{ sec: 45, w: 0, done: false }] }] }
    expect(upcomingSets(bwPlank, opts)[0].fields.map(f => f.k)).toEqual(['sec'])
  })

  it('counts a carry or a sled push in metres, in steps of five', () => {
    const carry = { cur: 0, entries: [{ id: 'bx-sled-push', sets: [set({ w: 60, r: 20 })] }] }
    const [item] = upcomingSets(carry, opts)
    expect(item.detail).toBe('Set 1/1 · 60 kg × 20 m')
    expect(item.fields.find(f => f.k === 'r')).toEqual({ k: 'r', v: 20, step: 5, u: 'm' })
  })

  it('gives cardio minutes and speed, the speed in the profile unit', () => {
    const run = { cur: 0, entries: [{ id: 'run', target: { mode: 'cardio' }, sets: [{ min: 20, speed: 8, done: false }] }] }
    expect(upcomingSets(run, opts)[0].fields).toEqual([
      { k: 'min', v: 20, step: 1, u: 'min' },
      { k: 'speed', v: 8, step: 0.5, u: 'km/h' },
    ])
    expect(field(upcomingSets(run, { ...opts, speedUnit: 'mph' })[0], 'speed')).toMatchObject({ v: 4.97, u: 'mph' })
  })

  it('splits a per-side row into its two sides, resting only after the second', () => {
    const row = makeSideSet({ w: 20, r: 10 })
    const active = { cur: 0, entries: [{ id: 'curl', sets: [row] }] }
    const out = upcomingSets(active, { ...opts, restFor })
    expect(out.map(x => [x.side, x.setLabel, x.rest])).toEqual([['L', 'Set 1/1 · L', 0], ['R', 'Set 1/1 · R', 90]])
    expect(field(out[0], 'r')).toMatchObject({ v: 5, step: 1 })
  })

  it('stops at the first row that needs the app, so nothing is ticked out of order', () => {
    const noReps = { w: 0, r: 0, sec: 30, done: false }
    const drop = set({ type: 'dropset', drops: [{ w: 40, r: 8 }] })
    const rp = set({ type: 'restpause' })
    expect(upcomingSets({ cur: 0, entries: [{ id: 'bench', sets: [set(), noReps, set()] }] }, opts).map(x => x.s)).toEqual([0])
    expect(upcomingSets({ cur: 0, entries: [{ id: 'bench', sets: [drop, set()] }] }, opts)).toEqual([])
    expect(upcomingSets({ cur: 0, entries: [{ id: 'bench', sets: [rp, set()] }] }, opts)).toEqual([])
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
    const s = liveActivityState(active, null, { ...opts, labels })
    expect(s).toMatchObject({
      workoutName: 'Push', title: 'Bench Press', detail: 'Set 1/1 · 60 kg × 8',
      restLabel: 'Rest', readyLabel: 'Ready', doneLabel: 'Done', finishLabel: 'Finish workout',
      sessionId: 'a1', restState: 'none', restStartedAt: 0, restEndsAt: 0, pausedLeft: 0,
    })
    expect(s.queue).toHaveLength(1)
    expect(s.queue[0]).toMatchObject({ e: 0, s: 0, title: 'Bench Press', rest: 0 })
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
    expect(s).toMatchObject({ title: 'Push', detail: 'Finish workout', queue: [] })
  })
})

describe('completeSetFromLock', () => {
  const session = () => ({
    active: { cur: 0, entries: [{ id: 'bench', sets: [set({ planSec: 30 }), set(), set()] }, { id: 'row', sets: [set()] }] },
  })

  it('ticks the row and drops the leftover hold plan', () => {
    const S = session()
    expect(completeSetFromLock(S, 0, 0)).toBe(true)
    expect(S.active.entries[0].sets[0]).toEqual({ w: 60, r: 8, done: true })
  })

  it('writes the numbers settled on, and a changed weight carries to the sets still to do', () => {
    const S = session()
    completeSetFromLock(S, 0, 0, { fields: [{ k: 'w', v: 65 }, { k: 'r', v: 6 }] })
    const [a, b, c] = S.active.entries[0].sets
    expect(a).toMatchObject({ w: 65, r: 6, done: true, weightOrigin: WEIGHT_ORIGIN_MANUAL })
    expect([b.w, c.w, b.r]).toEqual([65, 65, 8])
  })

  it('works the back-off sets out from the top set when its weight is changed', () => {
    const bo = { pct: 85, repsMin: 10, reps: 12 }
    const S = { unit: 'kg', active: { cur: 0, entries: [{ id: 'bench', target: { sets: 3, reps: 8, backoff: bo }, sets: [set({ w: 100 }), set({ w: 85, r: 11 }), set({ w: 85, r: 11 })] }] } }
    completeSetFromLock(S, 0, 0, { fields: [{ k: 'w', v: 110 }] })
    expect(S.active.entries[0].sets.map(x => x.w)).toEqual([110, 92.5, 92.5])
    // a back-off set changed does not move the top set or the others
    const S2 = { unit: 'kg', active: { cur: 0, entries: [{ id: 'bench', target: { sets: 3, reps: 8, backoff: bo }, sets: [set({ w: 100, done: true }), set({ w: 85, r: 11 }), set({ w: 85, r: 11 })] }] } }
    completeSetFromLock(S2, 0, 1, { fields: [{ k: 'w', v: 80 }] })
    expect(S2.active.entries[0].sets.map(x => x.w)).toEqual([100, 80, 80])
  })

  it('leaves a weight the lifter did not touch unmarked', () => {
    const S = session()
    completeSetFromLock(S, 0, 0, { fields: [{ k: 'w', v: 60 }, { k: 'r', v: 8 }] })
    expect(S.active.entries[0].sets[0].weightOrigin).toBeUndefined()
  })

  it('takes a hold in seconds and cardio speed back into km/h', () => {
    const S = { active: { cur: 0, entries: [{ id: 'run', target: { mode: 'cardio' }, sets: [{ min: 20, speed: 8, done: false }] }, { id: 'plank', target: { mode: 'time' }, sets: [{ sec: 45, w: 0, planSec: 30, done: false }] }] } }
    completeSetFromLock(S, 0, 0, { fields: [{ k: 'min', v: 25 }, { k: 'speed', v: 4.97 }], speedUnit: 'mph' })
    expect(S.active.entries[0].sets[0]).toMatchObject({ min: 25, speed: 8, done: true })
    completeSetFromLock(S, 1, 0, { fields: [{ k: 'sec', v: 60 }] })
    expect(S.active.entries[1].sets[0]).toEqual({ sec: 60, w: 0, done: true })
  })

  it('ticks one side of a per-side row, then the other, and the row is done with both', () => {
    const S = { active: { cur: 0, entries: [{ id: 'curl', sets: [makeSideSet({ w: 20, r: 10 })] }] } }
    expect(completeSetFromLock(S, 0, 0, { side: 'L', fields: [{ k: 'w', v: 22.5 }, { k: 'r', v: 6 }] })).toBe(true)
    const row = S.active.entries[0].sets[0]
    expect(row.sides.L).toMatchObject({ w: 22.5, r: 6, done: true })
    expect(row.sides.R).toMatchObject({ done: false })
    expect(row.done).toBeFalsy()
    expect(completeSetFromLock(S, 0, 0, { side: 'R' })).toBe(true)
    expect(S.active.entries[0].sets[0].done).toBe(true)
  })

  it('captures the top weight and moves the marker on when an exercise is finished', () => {
    const S = session()
    completeSetFromLock(S, 0, 0)
    completeSetFromLock(S, 0, 1)
    expect(S.active.entries[0].topW).toBeUndefined()
    completeSetFromLock(S, 0, 2)
    expect(S.active.entries[0].topW).toBe(60)
    expect(S.active.cur).toBe(1)
  })

  it('does nothing for a set that is already done, missing, or the wrong shape', () => {
    const S = session()
    S.active.entries[0].sets[0].done = true
    expect(completeSetFromLock(S, 0, 0)).toBe(false)
    expect(completeSetFromLock(S, 5, 0)).toBe(false)
    expect(completeSetFromLock({ active: null }, 0, 0)).toBe(false)
    const side = { active: { cur: 0, entries: [{ id: 'row', sets: [makeSideSet({ w: 20, r: 10 })] }] } }
    expect(completeSetFromLock(side, 0, 0)).toBe(false)
    expect(completeSetFromLock(session(), 0, 0, { side: 'L' })).toBe(false)
  })
})
