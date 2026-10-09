import { describe, expect, it } from 'vitest'
import { repStep, setLabel, setsRepsOf } from './history.js'

describe('a set logged by distance', () => {
  it('reads a loaded carry in metres, where reps would be', () => {
    expect(setLabel('bx-ruck', { w: 20, r: 2000, done: true }, { mode: 'reps' }, 'kmh')).toBe('20×2000 m')
    expect(setLabel('2133', { w: 32, r: 40, done: true }, { mode: 'reps' }, 'kmh')).toBe('32×40 m')
    expect(setLabel('0025', { w: 32, r: 40, done: true }, { mode: 'reps' }, 'kmh')).toBe('32×40')
  })

  it('plans a distance exercise as sets × metres and steps it by five', () => {
    expect(setsRepsOf({ id: 'bx-sled-push', mode: 'reps', sets: 4, reps: 20 })).toBe('4 × 20 m')
    expect(setsRepsOf({ id: '0025', mode: 'reps', sets: 4, reps: 20 })).toBe('4 × 20')
    expect([repStep({ id: 'bx-sled-push' }), repStep({ id: '0025' }), repStep({ id: '0025', side: true })]).toEqual([5, 1, 2])
  })
})

describe('a cardio row logged by distance', () => {
  const cardio = { mode: 'cardio' }

  it('reads in the terms of its sport', () => {
    expect(setLabel('bx-run-out', { min: 30, dist: 5, speed: 10 }, cardio, 'kmh')).toBe('30 min · 5 km · 6:00 /km')
    expect(setLabel('bx-run-out', { min: 30, dist: 5, speed: 10 }, cardio, 'mph')).toBe('30 min · 3.11 mi · 9:39 /mi')
    expect(setLabel('bx-swim-free', { min: 30, dist: 1.5, speed: 3 }, cardio, 'kmh')).toBe('30 min · 1500 m · 2:00 /100 m')
    expect(setLabel('bx-rower', { min: 20, dist: 5, speed: 15 }, cardio, 'kmh')).toBe('20 min · 5000 m · 2:00 /500 m')
    expect(setLabel('bx-bike-out', { min: 60, dist: 25, speed: 25 }, cardio, 'kmh')).toBe('60 min · 25 km · 25 km/h')
  })

  it('keeps minutes at a speed for a row without a distance and for other cardio', () => {
    expect(setLabel('bx-run-out', { min: 30, speed: 10 }, cardio, 'kmh')).toBe('30 min @ 10 km/h')
    expect(setLabel('2612', { min: 10, speed: 0 }, cardio, 'kmh')).toBe('10 min @ 0 km/h')
  })
})
