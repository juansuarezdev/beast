import { describe, expect, it } from 'vitest'
import { EXDB } from './exercises-data.js'
import { EXTRA_EXERCISES } from './extra-exercises.js'
import { BODYPARTS, EXIDX } from './exercises.js'
import { ALL_EQUIPMENT } from './equipment.js'
import { musclesOf } from './muscles.js'
import { cardioKindFromName } from './cardio.js'

describe('the added exercises', () => {
  it('have their own ids, never one of the dataset', () => {
    const ids = EXTRA_EXERCISES.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const dataset = new Set(EXDB.map(e => e.id))
    for (const id of ids) {
      expect(id.startsWith('bx-')).toBe(true)
      expect(dataset.has(id)).toBe(false)
    }
  })

  it('carry every field the app reads, in the dataset vocabulary', () => {
    const parts = new Set(EXDB.map(e => e.bp))
    for (const e of EXTRA_EXERCISES) {
      for (const k of ['n', 'bp', 'eq', 'tg', 'mg']) expect(typeof e[k], `${e.id} ${k}`).toBe('string')
      expect(e.n).toBe(e.n.toLowerCase())
      expect(parts.has(e.bp), `${e.id} body part ${e.bp}`).toBe(true)
      expect(e.sm.length).toBeGreaterThan(0)
      expect(e.st.length).toBeGreaterThan(0)
      expect(Object.keys(musclesOf(e)).length, `${e.id} muscles`).toBeGreaterThan(0)
    }
  })

  it('are in the catalogue and in the equipment list a profile is built from', () => {
    for (const e of EXTRA_EXERCISES) expect(EXIDX[e.id]).toBe(e)
    expect(BODYPARTS).toContain('cardio')
    for (const eq of ['sled', 'sandbag', 'rowing machine', 'bicycle']) expect(ALL_EQUIPMENT).toContain(eq)
  })

  it('give each sport its own distance and pace columns', () => {
    const kind = id => cardioKindFromName(EXIDX[id].n)
    expect(['bx-swim-free', 'bx-swim-back', 'bx-swim-breast', 'bx-swim-fly', 'bx-swim-mix'].map(kind)).toEqual(Array(5).fill('swim'))
    expect(kind('bx-rower')).toBe('row')
    expect([kind('bx-bike-out'), kind('bx-bike-in')]).toEqual(['bike', 'bike'])
    expect([kind('bx-run-out'), kind('bx-run-tread')]).toEqual(['run', 'run'])
    for (const id of ['bx-swim-free', 'bx-rower', 'bx-bike-out', 'bx-run-out']) expect(EXIDX[id].bp).toBe('cardio')
  })
})
