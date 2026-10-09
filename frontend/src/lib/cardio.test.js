import { describe, expect, it } from 'vitest'
import { cardioKindFromName, distanceKmOf, distanceStep, distanceUnit, fromKm, paceText, toKm, withDistanceKm, withMinutes } from './cardio.js'

describe('cardioKindFromName', () => {
  it('tells the four sports apart by name', () => {
    expect(cardioKindFromName('swimming (freestyle)')).toBe('swim')
    expect(cardioKindFromName('rowing machine')).toBe('row')
    expect(cardioKindFromName('cycling (outdoor)')).toBe('bike')
    expect(cardioKindFromName('stationary bike walk')).toBe('bike')
    expect(cardioKindFromName('run')).toBe('run')
    expect(cardioKindFromName('run (equipment)')).toBe('run')
    expect(cardioKindFromName('running (outdoor)')).toBe('run')
  })

  it('leaves other cardio, and exercises that merely mention a sport, on the speed columns', () => {
    for (const n of ['jump rope', 'burpee', 'ski step', 'push to run', 'wheel run', 'barbell bent over row', 'upright row', 'seated cable row', 'air bike', 'mountain climber', '']) {
      expect(cardioKindFromName(n)).toBeNull()
    }
  })
})

describe('distance units', () => {
  it('uses metres in the water and on the rower, km or miles on the road', () => {
    expect(distanceUnit('swim', 'kmh')).toBe('m')
    expect(distanceUnit('row', 'mph')).toBe('m')
    expect(distanceUnit('run', 'kmh')).toBe('km')
    expect(distanceUnit('bike', 'mph')).toBe('mi')
  })

  it('steps by what is natural for each', () => {
    expect([distanceStep('swim'), distanceStep('row'), distanceStep('run', 'kmh'), distanceStep('run', 'mph')]).toEqual([50, 100, 0.5, 0.25])
  })

  it('converts between the number on screen and the stored kilometres', () => {
    expect(toKm(1500, 'swim')).toBe(1.5)
    expect(fromKm(1.5, 'swim')).toBe(1500)
    expect(toKm(5, 'run', 'kmh')).toBe(5)
    expect(toKm(3.1, 'run', 'mph')).toBeCloseTo(4.9889, 3)
    expect(fromKm(5, 'run', 'mph')).toBe(3.11)
    expect(fromKm(10, 'bike', 'kmh')).toBe(10)
  })
})

describe('a cardio row', () => {
  it('has the distance it was given, else minutes at its speed', () => {
    expect(distanceKmOf({ min: 30, speed: 10, dist: 4.5 })).toBe(4.5)
    expect(distanceKmOf({ min: 30, speed: 10 })).toBe(5)
    expect(distanceKmOf({ min: 0, speed: 10 })).toBe(0)
    expect(distanceKmOf(null)).toBe(0)
  })

  it('keeps the speed in step when the distance or the minutes change', () => {
    expect(withDistanceKm({ min: 30, speed: 8 }, 5)).toEqual({ min: 30, speed: 10, dist: 5 })
    expect(withMinutes({ min: 30, speed: 10, dist: 5 }, 25)).toEqual({ min: 25, speed: 12, dist: 5 })
  })

  it('leaves the speed alone until there are both numbers', () => {
    expect(withDistanceKm({ min: 0, speed: 8 }, 5)).toEqual({ min: 0, speed: 8, dist: 5 })
    expect(withMinutes({ min: 30, speed: 0 }, 20)).toEqual({ min: 20, speed: 0 })
  })

  it('keeps the distance it came to when the minutes change on a row that never had one typed', () => {
    expect(withMinutes({ min: 30, speed: 10 }, 25)).toEqual({ min: 25, speed: 12, dist: 5 })
  })
})

describe('paceText', () => {
  it('reads a run per km or per mile', () => {
    expect(paceText('run', 12)).toBe('5:00 /km')
    expect(paceText('run', 10)).toBe('6:00 /km')
    expect(paceText('run', 12, 'mph')).toBe('8:03 /mi')
  })

  it('reads a ride in km/h or mph', () => {
    expect(paceText('bike', 25)).toBe('25 km/h')
    expect(paceText('bike', 24.14, 'mph')).toBe('15 mph')
  })

  it('reads a row per 500 m and a swim per 100 m', () => {
    expect(paceText('row', 15)).toBe('2:00 /500 m')
    expect(paceText('swim', 3)).toBe('2:00 /100 m')
  })

  it('is empty without a speed or for another kind of cardio', () => {
    expect(paceText('run', 0)).toBe('')
    expect(paceText(null, 10)).toBe('')
  })
})
