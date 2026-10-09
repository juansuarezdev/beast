import { describe, expect, it } from 'vitest'
import { backoffRows } from './backoff.js'

describe('backoffRows', () => {
  it('adds three sets at 85 percent of the top set, on a weight the bar can carry', () => {
    expect(backoffRows({ w: 140, r: 3 })).toEqual([
      { w: 120, r: 5, done: false }, { w: 120, r: 5, done: false }, { w: 120, r: 5, done: false },
    ])
  })

  it('keeps the reps of a top set that already had a working number', () => {
    expect(backoffRows({ w: 100, r: 8 })[0]).toMatchObject({ w: 85, r: 8 })
  })

  it('follows a heavy single with sets of five, not more singles', () => {
    expect(backoffRows({ w: 180, r: 1 })[0].r).toBe(5)
  })

  it('takes the sets, the percentage and the step it is given', () => {
    const rows = backoffRows({ w: 100, r: 5 }, { sets: 2, pct: 90, step: 5 })
    expect(rows).toEqual([{ w: 90, r: 5, done: false }, { w: 90, r: 5, done: false }])
  })

  it('stays below the top set even when the step is too coarse to tell', () => {
    expect(backoffRows({ w: 10, r: 5 }, { step: 5 })[0].w).toBe(5)
    expect(backoffRows({ w: 20, r: 5 }, { pct: 99, step: 2.5 })[0].w).toBe(17.5)
  })

  it('has nothing to add without a weight', () => {
    expect(backoffRows({ w: 0, r: 5 })).toBeNull()
    expect(backoffRows(null)).toBeNull()
  })
})
