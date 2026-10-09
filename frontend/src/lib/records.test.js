import { describe, expect, it } from 'vitest'
import { percentTable, repRecords } from './records.js'

const row = (w, r, extra = {}) => ({ w, r, done: true, ...extra })
const day = (d, ...sets) => ({ d, entries: [{ id: '0025', sets }] })

describe('repRecords', () => {
  const workouts = [
    day('2026-09-01', row(100, 5), row(80, 10)),
    day('2026-09-08', row(105, 3), row(100, 5)),
    day('2026-09-15', row(110, 1)),
  ]

  it('gives the heaviest weight lifted for at least each number of reps', () => {
    const [r1, r3, r5, r8, r10] = repRecords(workouts, '0025')
    expect(r1).toEqual({ reps: 1, w: 110, r: 1, d: '2026-09-15' })
    expect(r3).toEqual({ reps: 3, w: 105, r: 3, d: '2026-09-08' })
    expect(r5).toEqual({ reps: 5, w: 100, r: 5, d: '2026-09-01' })
    expect(r8).toEqual({ reps: 8, w: 80, r: 10, d: '2026-09-01' })
    expect(r10).toEqual({ reps: 10, w: 80, r: 10, d: '2026-09-01' })
  })

  it('dates a tie from the first time it happened', () => {
    const [, , r5] = repRecords(workouts, '0025')
    expect(r5.d).toBe('2026-09-01')
  })

  it('leaves a slot empty when there is nothing heavy enough for it', () => {
    const out = repRecords([day('2026-09-01', row(60, 4))], '0025')
    expect(out.map(x => x && x.w)).toEqual([60, 60, null, null, null])
  })

  it('skips sets not done, warm-ups, per-side rows and rows without numbers', () => {
    const out = repRecords([day('2026-09-01',
      { w: 200, r: 5, done: false }, row(150, 5, { warmup: true }), row(120, 5, { sides: { L: {}, R: {} } }), row(0, 8), row(90, 0), row(70, 5),
    )], '0025')
    expect(out[2]).toMatchObject({ w: 70 })
  })

  it('ignores other exercises and copes with no history', () => {
    expect(repRecords([{ d: '2026-09-01', entries: [{ id: '0099', sets: [row(100, 5)] }] }], '0025').every(x => x === null)).toBe(true)
    expect(repRecords(undefined, '0025')).toHaveLength(5)
  })

  it('has no records for an assistance machine, where less weight is the better one', () => {
    expect(repRecords([{ d: '2026-09-01', entries: [{ id: '1431', sets: [row(30, 8)] }] }], '1431').every(x => x === null)).toBe(true)
  })
})

describe('percentTable', () => {
  it('gives each percentage of the 1RM on a weight the bar can carry', () => {
    const t = percentTable(140, 2.5)
    expect(t[0]).toEqual({ pct: 100, w: 140 })
    expect(t.find(x => x.pct === 85).w).toBe(120)
    expect(t.find(x => x.pct === 50).w).toBe(70)
  })

  it('is empty without a 1RM or a step', () => {
    expect(percentTable(0, 2.5)).toEqual([])
    expect(percentTable(140, 0)).toEqual([])
  })
})
