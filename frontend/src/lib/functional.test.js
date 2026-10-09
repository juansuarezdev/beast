import { describe, expect, it } from 'vitest'
import { DISTANCE_STEP, isDistanceLoad, repUnitOf, repWordOf } from './functional.js'

describe('repUnitOf', () => {
  it('reads loaded carries, sled work and rucking as metres by name', () => {
    for (const id of ['2133', 'bx-sled-push', 'bx-sled-drag', 'bx-sandbag-carry', 'bx-suitcase-carry', 'bx-kb-farmers', 'bx-trap-farmers', 'bx-rack-carry', 'bx-oh-carry', 'bx-ruck']) {
      expect(repUnitOf({ id }), id).toBe('m')
    }
  })

  it('keeps reps for everything else, including a sled machine and the unknown', () => {
    for (const id of ['0025', 'bx-lm-press', 'bx-landmine-row', 'nope', undefined]) expect(repUnitOf({ id }), String(id)).toBe('reps')
    expect(repUnitOf(null)).toBe('reps')
  })

  it('lets the config decide either way', () => {
    expect(repUnitOf({ id: '0025', repUnit: 'm' })).toBe('m')
    expect(repUnitOf({ id: '2133', repUnit: 'reps' })).toBe('reps')
    expect(repUnitOf({ id: '2133', repUnit: 'furlongs' })).toBe('m')
  })
})

describe('distance helpers', () => {
  it('names the unit and steps by five metres', () => {
    expect(isDistanceLoad({ id: 'bx-ruck' })).toBe(true)
    expect(isDistanceLoad({ id: '0025' })).toBe(false)
    expect(repWordOf({ id: 'bx-ruck' }, 'reps')).toBe('m')
    expect(repWordOf({ id: '0025' }, 'reps')).toBe('reps')
    expect(DISTANCE_STEP).toBe(5)
  })
})
