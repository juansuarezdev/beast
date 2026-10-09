// @vitest-environment happy-dom
// A run, a ride, a row or a swim is logged by distance with the pace of its sport (lib/cardio.js):
// the row stores minutes, a distance in km and the speed that follows from them.
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Workout from './Workout.jsx'
import { DEF, useStore } from '../store/useStore.js'

vi.mock('../lib/sound.js', () => ({ beep: vi.fn(), vibrate: vi.fn(), unlock: vi.fn() }))
vi.mock('../lib/api.js', () => ({ api: vi.fn(() => Promise.resolve({})) }))

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container

function mount(id, set, settings = {}) {
  if (root) unmount()
  const S = { ...JSON.parse(JSON.stringify(DEF)), ...settings }
  S.active = {
    id: 'dist-test', d: '2026-09-23', start: Date.now(), routineId: null, name: 'Cardio', bw: null, cur: 0,
    entries: [{ id, target: { mode: 'cardio', sets: 1, min: set.min, speed: set.speed }, sets: [{ ...set, done: false }] }],
  }
  useStore.setState({ S, user: null })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<MemoryRouter><Workout /></MemoryRouter>))
}
function unmount() {
  act(() => root.unmount())
  container.remove()
  root = null
}
afterEach(() => { if (root) unmount() })

const cell = n => container.querySelector('.setrow').querySelectorAll('.stp')[n]
const shown = n => cell(n).querySelector('input').value
const header = () => container.querySelector('.sethead .r-sp').textContent
const row = () => useStore.getState().S.active.entries[0].sets[0]
const pace = () => container.querySelector('.setdelta')?.textContent || ''
const tap = (n, label) => act(() => cell(n).querySelector(`button[aria-label="${label}"]`).click())
function type(n, value) {
  const input = cell(n).querySelector('input')
  act(() => {
    Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('a run, logged by distance', () => {
  it('shows the distance its minutes and speed come to, and the pace', () => {
    mount('bx-run-out', { min: 30, speed: 10 })
    expect(header()).toBe('Distance (km)')
    expect(shown(0)).toBe('30')
    expect(shown(1)).toBe('5')
    expect(pace()).toBe('6:00 /km')
  })

  it('keeps the speed in step when the distance is typed or stepped', () => {
    mount('bx-run-out', { min: 30, speed: 10 })
    type(1, '6')
    expect(row()).toMatchObject({ min: 30, dist: 6, speed: 12 })
    expect(pace()).toBe('5:00 /km')
    tap(1, 'Increase')
    expect(row().dist).toBe(6.5)
    expect(row().speed).toBe(13)
  })

  it('keeps the distance and moves the speed when the minutes change', () => {
    mount('bx-run-out', { min: 30, speed: 10 })
    type(0, '25')
    expect(row()).toMatchObject({ min: 25, dist: 5, speed: 12 })
  })

  it('counts miles and a pace per mile on a profile in pounds', () => {
    mount('bx-run-out', { min: 30, speed: 16.09344 }, { unit: 'lb' })
    expect(header()).toBe('Distance (mi)')
    expect(shown(1)).toBe('5')
    expect(pace()).toBe('6:00 /mi')
  })
})

describe('a swim and a row, in metres', () => {
  it('logs a swim in metres with a time per 100 m', () => {
    mount('bx-swim-free', { min: 30, speed: 2.4 })
    expect(header()).toBe('Distance (m)')
    expect(shown(1)).toBe('1200')
    type(1, '1500')
    expect(row()).toMatchObject({ min: 30, dist: 1.5, speed: 3 })
    expect(pace()).toBe('2:00 /100 m')
    tap(1, 'Increase')
    expect(row().dist).toBe(1.55)
    expect(row().speed).toBe(3.1)
  })

  it('logs a row in metres with a split per 500 m', () => {
    mount('bx-rower', { min: 20, speed: 15 })
    expect(shown(1)).toBe('5000')
    expect(pace()).toBe('2:00 /500 m')
  })
})

describe('cardio that is no sport', () => {
  it('keeps the minutes and speed columns', () => {
    mount('2612', { min: 10, speed: 0 })
    expect(header()).toBe('Speed (km/h)')
    expect(pace()).toBe('')
  })
})
