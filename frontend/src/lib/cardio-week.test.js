import { describe, expect, it } from 'vitest'
import { cardioWeek, goalShare } from './cardio-week.js'

const nameOf = id => ({ run: 'running (outdoor)', swim: 'swimming (freestyle)', rope: 'jump rope', bench: 'bench press' }[id] || '')
const row = (extra = {}) => ({ done: true, ...extra })
// 2026-10-07 is a Wednesday; with Monday weeks the week is 5 – 11 October
const TODAY = '2026-10-07'

describe('cardioWeek', () => {
  const workouts = [
    { d: '2026-10-05', entries: [{ id: 'run', sets: [row({ min: 30, dist: 5, speed: 10 })] }, { id: 'bench', sets: [row({ w: 60, r: 8 })] }] },
    { d: '2026-10-06', entries: [{ id: 'swim', sets: [row({ min: 20, dist: 1, speed: 3 }), row({ min: 10, dist: 0.5, speed: 3 })] }] },
    { d: '2026-10-07', entries: [{ id: 'rope', sets: [row({ min: 10, speed: 0 })] }] },
    { d: '2026-10-04', entries: [{ id: 'run', sets: [row({ min: 60, dist: 10, speed: 10 })] }] },
  ]

  it('adds up the minutes and the distance of the week and its sessions', () => {
    const w = cardioWeek(workouts, TODAY, 1, nameOf)
    expect(w.minutes).toBe(70)
    expect(w.km).toBe(6.5)
    expect(w.sessions).toBe(3)
  })

  it('splits them by sport, with cardio of no sport only in minutes', () => {
    const w = cardioWeek(workouts, TODAY, 1, nameOf)
    expect(w.byKind.run).toEqual({ minutes: 30, km: 5 })
    expect(w.byKind.swim).toEqual({ minutes: 30, km: 1.5 })
    expect(w.byKind.other).toEqual({ minutes: 10, km: 0 })
  })

  it('leaves out other weeks, rows not ticked, and rows without minutes', () => {
    const w = cardioWeek([
      { d: '2026-09-28', entries: [{ id: 'run', sets: [row({ min: 99 })] }] },
      { d: '2026-10-06', entries: [{ id: 'run', sets: [{ min: 40, done: false }, row({ min: 0 }), row({ w: 60, r: 5 })] }] },
    ], TODAY, 1, nameOf)
    expect(w).toEqual({ minutes: 0, km: 0, sessions: 0, byKind: {} })
  })

  it('counts the week from Sunday when the profile starts it there', () => {
    const w = cardioWeek([{ d: '2026-10-04', entries: [{ id: 'run', sets: [row({ min: 25 })] }] }], TODAY, 0, nameOf)
    expect(w.minutes).toBe(25)
  })

  it('copes with no workouts', () => {
    expect(cardioWeek(undefined, TODAY, 1)).toEqual({ minutes: 0, km: 0, sessions: 0, byKind: {} })
  })
})

describe('goalShare', () => {
  it('is the share of the goal reached, capped at one', () => {
    expect(goalShare(75, 150)).toBe(0.5)
    expect(goalShare(200, 150)).toBe(1)
    expect(goalShare(30, 0)).toBe(0)
  })
})
