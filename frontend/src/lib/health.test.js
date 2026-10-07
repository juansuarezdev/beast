import { describe, expect, it } from 'vitest'
import { healthWorkoutWindow } from './health.js'

describe('healthWorkoutWindow', () => {
  it('returns the session window as epoch milliseconds', () => {
    expect(healthWorkoutWindow({ start: 1000, end: 4_600_000 })).toEqual({ start: 1000, end: 4_600_000 })
  })

  it('rejects a session with no usable start or end', () => {
    expect(healthWorkoutWindow(null)).toBeNull()
    expect(healthWorkoutWindow({})).toBeNull()
    expect(healthWorkoutWindow({ start: 1000 })).toBeNull()
    expect(healthWorkoutWindow({ start: 'x', end: 5000 })).toBeNull()
    expect(healthWorkoutWindow({ start: NaN, end: 5000 })).toBeNull()
  })

  it('rejects an end that is not after the start — HealthKit refuses a zero or negative workout', () => {
    expect(healthWorkoutWindow({ start: 5000, end: 5000 })).toBeNull()
    expect(healthWorkoutWindow({ start: 5000, end: 4000 })).toBeNull()
  })
})
