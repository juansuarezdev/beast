// @vitest-environment happy-dom
// The history sheet (issue #43) is the one place the workout screen answers "what did I do
// on this last time, and the time before" — worth pinning that it reads the log newest
// first, labels sets the way the rest of the app does, and does not pretend an exercise
// with no sessions has a curve.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { exerciseHistorySheet, exerciseDetailSheet } from './sheets.jsx'
import { EXIDX } from './lib/exercises.js'

const mounted = []

function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}

const EX = Object.keys(EXIDX).find(id => (EXIDX[id].bp || '') !== 'cardio' && !EXIDX[id].custom)
const DAY = 86400000
const T0 = Date.UTC(2026, 2, 2, 9)
const iso = i => new Date(T0 + i * DAY).toISOString().slice(0, 10)
const session = (i, rows) => ({
  id: 'w' + i, d: iso(i), start: T0 + i * DAY, end: T0 + i * DAY + 3600000, name: 'Push', vol: 0,
  entries: [{ id: EX, target: { mode: 'reps', bodyweight: false }, sets: rows }],
})

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  useStore.setState(s => ({ S: { ...s.S, unit: 'kg', workouts: [], active: null } }))
  document.body.innerHTML = ''
})

afterEach(() => {
  act(() => { mounted.splice(0).forEach(root => root.unmount()) })
})

describe('exercise history sheet', () => {
  it('shows an empty state instead of a chart when nothing was logged', () => {
    exerciseHistorySheet(EX)
    const host = renderTop()
    expect(host.querySelector('.empty').textContent).toContain('No sessions logged yet')
    expect(host.querySelector('.chart')).toBeNull()
  })

  it('lists sessions newest first with labelled sets, volume and one PR marker', () => {
    useStore.setState(s => ({ S: { ...s.S, workouts: [
      session(0, [{ w: 40, r: 8, done: true, phase: 'warmup' }, { w: 60, r: 5, done: true }, { w: 60, r: 5, done: true }]),
      session(2, [{ w: 70, r: 5, done: true }]),
      session(4, [{ w: 70, r: 3, done: true }, { w: 90, r: 1, done: false }]),
    ] } }))
    exerciseHistorySheet(EX)
    const host = renderTop()
    const rows = [...host.querySelectorAll('.list:not(.recs) .item')]
    expect(rows).toHaveLength(3)
    // newest first, oldest last; the warm-up and the unfinished set never show up
    expect(rows[0].querySelector('.ss').textContent).toBe('70×3')
    expect(rows[2].querySelector('.ss').textContent).toBe('60×5  ·  60×5')
    expect(rows[2].textContent).toContain('Volume 600 kg')
    // the record was set in the middle session and only that one carries the badge
    expect(rows.map(r => !!r.querySelector('.pr'))).toEqual([false, true, false])
    expect(host.querySelector('.chart svg')).toBeTruthy()
    expect(host.textContent).toContain('Best:')
    expect(host.textContent).toContain('70 kg')
  })

  it('is reachable from the exercise detail sheet once there is history', () => {
    exerciseDetailSheet(EXIDX[EX])
    const before = renderTop()
    expect([...before.querySelectorAll('button')].some(b => b.textContent === 'History')).toBe(false)

    useStore.setState(s => ({ S: { ...s.S, workouts: [session(0, [{ w: 60, r: 5, done: true }])] } }))
    useUI.setState({ sheets: [] })
    exerciseDetailSheet(EXIDX[EX])
    const host = renderTop()
    const btn = [...host.querySelectorAll('button')].find(b => b.textContent === 'History')
    expect(btn).toBeTruthy()
    act(() => { btn.click() })
    expect(useUI.getState().sheets).toHaveLength(2)
    const top = renderTop()
    expect(top.querySelectorAll('.list:not(.recs) .item')).toHaveLength(1)
  })
})

describe('exercise history sheet — records and percentages', () => {
  const BENCH = '0025'
  const bench = (i, rows) => ({ ...session(i, rows), entries: [{ id: BENCH, target: { mode: 'reps', bodyweight: false }, sets: rows }] })

  it('shows the heaviest weight for each number of reps and the percentages of the estimated 1RM', () => {
    useStore.setState(s => ({ S: { ...s.S, unit: 'kg', workouts: [
      bench(0, [{ w: 100, r: 5, done: true }]),
      bench(7, [{ w: 120, r: 1, done: true }]),
    ] } }))
    exerciseHistorySheet(BENCH)
    const host = renderTop()
    const [records, percents] = [...host.querySelectorAll('.list.recs')]
    expect([...records.querySelectorAll('.item .tt')].map(x => x.textContent)).toEqual(['1RM', '3RM', '5RM'])
    expect([...records.querySelectorAll('.item b')].map(x => x.textContent)).toEqual(['120 kg', '100 kg', '100 kg'])
    // the best estimate is the single of 120, so the table starts there
    expect(percents.querySelector('.item .tt').textContent).toBe('100 %')
    expect(percents.querySelector('.item b').textContent).toBe('120 kg')
    expect(percents.querySelectorAll('.item')).toHaveLength(10)
  })

  it('has neither for an exercise that is not a loaded lift', () => {
    useStore.setState(s => ({ S: { ...s.S, unit: 'kg', workouts: [
      { ...session(0, [{ sec: 45, w: 0, done: true }]), entries: [{ id: EX, target: { mode: 'time' }, sets: [{ sec: 45, w: 0, done: true }] }] },
    ] } }))
    exerciseHistorySheet(EX)
    const host = renderTop()
    expect(host.querySelectorAll('.list.recs')).toHaveLength(0)
  })
})
