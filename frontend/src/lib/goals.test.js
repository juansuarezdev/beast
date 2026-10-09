import { describe, expect, it } from 'vitest'
import { bestTimeForDistance, clockOfMinutes, goalsProgress } from './goals.js'

const nameOf = id => ({ run: 'running (outdoor)', swim: 'swimming (freestyle)', bench: 'barbell bench press' }[id] || '')
const TODAY = '2026-10-07'   // a Wednesday; with Monday weeks the week is 5 – 11 October
const row = (extra = {}) => ({ done: true, ...extra })
const w = (d, entries) => ({ d, entries })

describe('clockOfMinutes', () => {
  it('reads minutes as a clock', () => {
    expect(clockOfMinutes(30)).toBe('30:00')
    expect(clockOfMinutes(27.5)).toBe('27:30')
    expect(clockOfMinutes(5.05)).toBe('5:03')
  })
})

describe('bestTimeForDistance', () => {
  const runs = [
    w('2026-09-01', [{ id: 'run', sets: [row({ min: 33, dist: 6 })] }]),
    w('2026-09-08', [{ id: 'run', sets: [row({ min: 31, dist: 5 })] }]),
    w('2026-09-15', [{ id: 'run', sets: [row({ min: 20, dist: 3 })] }]),
    w('2026-09-20', [{ id: 'swim', sets: [row({ min: 10, dist: 5 })] }]),
  ]

  it('scales a longer run to the distance and takes the fastest', () => {
    expect(bestTimeForDistance(runs, 5, nameOf)).toBe(27.5)
  })

  it('ignores runs shorter than the distance, other sports and rows not done', () => {
    expect(bestTimeForDistance([runs[2], runs[3]], 5, nameOf)).toBeNull()
    expect(bestTimeForDistance([w('2026-09-08', [{ id: 'run', sets: [{ min: 20, dist: 5, done: false }] }])], 5, nameOf)).toBeNull()
  })

  it('copes with nothing logged', () => {
    expect(bestTimeForDistance(undefined, 5, nameOf)).toBeNull()
  })
})

describe('goalsProgress', () => {
  const base = { bodyweight: [{ d: '2026-01-01', w: 60 }, { d: '2026-10-01', w: 65 }], workouts: [] }

  it('is empty when no goal is set', () => {
    expect(goalsProgress(base, TODAY, 1, nameOf)).toEqual([])
  })

  it('follows body weight from the first weigh-in to the target', () => {
    const [g] = goalsProgress({ ...base, targetW: 70 }, TODAY, 1, nameOf)
    expect(g).toMatchObject({ kind: 'weight', current: 65, target: 70, share: 0.5, done: false })
    const reached = goalsProgress({ ...base, targetW: 65 }, TODAY, 1, nameOf)[0]
    expect(reached.done).toBe(true)
    // losing weight reads the same way round
    const cut = goalsProgress({ bodyweight: [{ d: 'a', w: 90 }, { d: 'b', w: 85 }], targetW: 80 }, TODAY, 1, nameOf)[0]
    expect(cut.share).toBe(0.5)
  })

  it('counts this week\'s sessions with something done, and no other week', () => {
    const S = { ...base, sessionsGoal: 5, workouts: [
      w('2026-10-05', [{ id: 'bench', sets: [row({ w: 60, r: 5 })] }]),
      w('2026-10-06', [{ id: 'bench', sets: [{ w: 60, r: 5, done: false }] }]),
      w('2026-10-07', [{ id: 'bench', sets: [row({ w: 60, r: 5, phase: 'warmup' })] }]),
      w('2026-09-30', [{ id: 'bench', sets: [row({ w: 60, r: 5 })] }]),
    ] }
    expect(goalsProgress(S, TODAY, 1, nameOf)[0]).toMatchObject({ kind: 'sessions', current: 1, target: 5, share: 0.2, done: false })
  })

  it('counts this week\'s cardio minutes against the weekly goal', () => {
    const S = { ...base, cardioGoalMin: 60, workouts: [w('2026-10-05', [{ id: 'run', sets: [row({ min: 45, dist: 6 })] }])] }
    expect(goalsProgress(S, TODAY, 1, nameOf)[0]).toMatchObject({ kind: 'cardio', current: 45, target: 60, share: 0.75 })
  })

  it('places a lift by its estimated 1RM, and shows a lift with no history at nothing', () => {
    const S = { ...base, liftGoals: [{ id: 'a', exId: 'bench', target: 100 }, { id: 'b', exId: 'squat', target: 120 }],
      workouts: [w('2026-09-01', [{ id: 'bench', sets: [row({ w: 80, r: 5 })] }])] }
    const [bench, squat] = goalsProgress(S, TODAY, 1, nameOf)
    expect(bench).toMatchObject({ kind: 'lift', current: 93.3, target: 100, done: false })
    expect(bench.share).toBeCloseTo(0.933, 2)
    expect(squat).toMatchObject({ current: 0, share: 0, done: false })
  })

  it('tracks the time for a distance, a faster time being the better one', () => {
    const run = w('2026-09-08', [{ id: 'run', sets: [row({ min: 31, dist: 5 })] }])
    const S = { ...base, timeGoals: [{ id: 'k', km: 5, minutes: 30 }], workouts: [run] }
    const [g] = goalsProgress(S, TODAY, 1, nameOf)
    expect(g).toMatchObject({ kind: 'time', km: 5, target: 30, current: 31, done: false })
    expect(g.share).toBeCloseTo(0.968, 2)
    const faster = goalsProgress({ ...S, workouts: [w('2026-09-08', [{ id: 'run', sets: [row({ min: 29, dist: 5 })] }])] }, TODAY, 1, nameOf)[0]
    expect(faster).toMatchObject({ done: true, share: 1 })
    expect(goalsProgress({ ...S, workouts: [] }, TODAY, 1, nameOf)[0]).toMatchObject({ current: null, share: 0, done: false })
  })

  it('skips a goal that is malformed', () => {
    const S = { ...base, liftGoals: [{ id: 'a' }, { id: 'b', exId: 'bench', target: 0 }], timeGoals: [{ id: 'c', km: 0, minutes: 30 }] }
    expect(goalsProgress(S, TODAY, 1, nameOf)).toEqual([])
  })
})
