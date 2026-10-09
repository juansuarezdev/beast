import { describe, expect, it } from 'vitest'
import { compareSetTo, smartRestForSet, smartRestSec } from './set-compare.js'

describe('compareSetTo', () => {
  it('reports a heavier set by its weight, and the same weight by its reps', () => {
    expect(compareSetTo({ w: 60, r: 8 }, { w: 62.5, r: 8 }, 'reps')).toEqual({ dir: 'up', text: '+2.5 kg' })
    expect(compareSetTo({ w: 60, r: 8 }, { w: 60, r: 9 }, 'reps')).toEqual({ dir: 'up', text: '+1 reps' })
    expect(compareSetTo({ w: 60, r: 8 }, { w: 55, r: 12 }, 'reps')).toEqual({ dir: 'down', text: '−5 kg' })
    expect(compareSetTo({ w: 60, r: 8 }, { w: 60, r: 6 }, 'reps')).toEqual({ dir: 'down', text: '−2 reps' })
  })

  it('says the same when nothing moved', () => {
    expect(compareSetTo({ w: 60, r: 8 }, { w: 60, r: 8 }, 'reps')).toEqual({ dir: 'same', text: '=' })
  })

  it('uses the unit it is given', () => {
    expect(compareSetTo({ w: 135, r: 5 }, { w: 140, r: 5 }, 'reps', { unit: 'lb' })).toEqual({ dir: 'up', text: '+5 lb' })
  })

  it('compares a hold by its weight first, then its seconds', () => {
    expect(compareSetTo({ sec: 45, w: 0 }, { sec: 60, w: 0 }, 'time')).toEqual({ dir: 'up', text: '+15s' })
    expect(compareSetTo({ sec: 45, w: 5 }, { sec: 30, w: 10 }, 'time')).toEqual({ dir: 'up', text: '+5 kg' })
  })

  it('compares cardio by minutes first, then speed in the profile unit', () => {
    expect(compareSetTo({ min: 20, speed: 8 }, { min: 25, speed: 8 }, 'cardio')).toEqual({ dir: 'up', text: '+5 min' })
    expect(compareSetTo({ min: 20, speed: 8 }, { min: 20, speed: 9 }, 'cardio')).toEqual({ dir: 'up', text: '+1 km/h' })
    expect(compareSetTo({ min: 20, speed: 8 }, { min: 20, speed: 9.66 }, 'cardio', { speedUnit: 'mph' })).toEqual({ dir: 'up', text: '+1.03 mph' })
  })

  it('counts metres, not reps, for a distance exercise', () => {
    expect(compareSetTo({ w: 40, r: 30 }, { w: 40, r: 40 }, 'reps', { repWord: 'm' })).toEqual({ dir: 'up', text: '+10 m' })
  })

  it('has nothing to say without a reference or without the numbers', () => {
    expect(compareSetTo(null, { w: 60, r: 8 }, 'reps')).toBeNull()
    expect(compareSetTo({ w: 60, r: 8 }, { w: 60, r: 0 }, 'reps')).toBeNull()
    expect(compareSetTo({ min: 0 }, { min: 20 }, 'cardio')).toBeNull()
  })
})

describe('smartRestSec', () => {
  it('rests heavy low-rep sets longer and light high-rep ones shorter than the base', () => {
    expect(smartRestSec({ base: 90, reps: 3 })).toBe(180)
    expect(smartRestSec({ base: 90, reps: 5 })).toBe(160)
    expect(smartRestSec({ base: 90, reps: 8 })).toBe(115)
    expect(smartRestSec({ base: 90, reps: 10 })).toBe(90)
    expect(smartRestSec({ base: 90, reps: 15 })).toBe(70)
  })

  it('never goes beyond five minutes from the base, nor six with the failure bonus', () => {
    expect(smartRestSec({ base: 180, reps: 2 })).toBe(300)
    expect(smartRestSec({ base: 180, reps: 2, rir: 0 })).toBe(330)
    expect(smartRestSec({ base: 300, reps: 1, rpe: 10 })).toBe(330)
    expect(smartRestSec({ base: 330, reps: 1, rir: 0 })).toBe(360)
  })

  it('adds half a minute after a set taken to failure', () => {
    expect(smartRestSec({ base: 90, reps: 10, rir: 0 })).toBe(120)
    expect(smartRestSec({ base: 90, reps: 10, rpe: 9.5 })).toBe(120)
    expect(smartRestSec({ base: 90, reps: 10, rir: 2 })).toBe(90)
  })

  it('leaves the base alone for an exercise with its own rest, a missing base, or no reps', () => {
    expect(smartRestSec({ base: 90, reps: 3, own: true })).toBe(90)
    expect(smartRestSec({ base: 0, reps: 3 })).toBe(0)
    expect(smartRestSec({ base: 90, reps: 0 })).toBe(90)
  })
})

describe('smartRestForSet', () => {
  const entry = { target: {} }

  const on = { smartRest: true }

  it('scales the base for a work row of reps and passes the effort along', () => {
    expect(smartRestForSet(on, entry, { w: 100, r: 3 }, 90)).toBe(180)
    expect(smartRestForSet(on, entry, { w: 100, r: 10, rir: 0 }, 90)).toBe(120)
  })

  it('leaves warm-ups, holds, cardio and an exercise with its own rest alone', () => {
    expect(smartRestForSet(on, entry, { w: 40, r: 3, warmup: true }, 60)).toBe(60)
    expect(smartRestForSet(on, entry, { sec: 45, w: 0 }, 90)).toBe(90)
    expect(smartRestForSet(on, entry, { min: 20, speed: 8 }, 90)).toBe(90)
    expect(smartRestForSet(on, { target: { restSec: 150 } }, { w: 100, r: 3 }, 150)).toBe(150)
  })

  it('is off until the profile switches it on', () => {
    expect(smartRestForSet({ smartRest: false }, entry, { w: 100, r: 3 }, 90)).toBe(90)
    expect(smartRestForSet({}, entry, { w: 100, r: 3 }, 90)).toBe(90)
  })
})
