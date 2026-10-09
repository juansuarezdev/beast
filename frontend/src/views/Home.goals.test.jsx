// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import Home from './Home.jsx'

const mocks = vi.hoisted(() => ({ goalsSheet: vi.fn() }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), goalsSheet: mocks.goalsSheet, dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), bwDeltaColor: () => '', weighInsSheet: vi.fn(),
}))

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mocks.goalsSheet.mockClear()
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const mountWith = patch => {
  useStore.setState(s => ({
    S: { ...s.S, routines: [], workouts: [], bodyweight: [], dayPlan: {}, week: {}, active: null, targetW: null, sessionsGoal: 0, cardioGoalMin: 0, liftGoals: [], timeGoals: [], ...patch },
    user: null,
  }))
  act(() => root.render(<Home />))
}
const goalsCard = () => [...host.querySelectorAll('.card')].find(c => c.querySelector('h2')?.textContent === 'Goals')
const rows = () => [...goalsCard().querySelectorAll('[role="progressbar"]')].map(bar => bar.parentElement.querySelector('.row').textContent)

describe('Home goals card', () => {
  it('is not there with no goal set', () => {
    mountWith({})
    expect(goalsCard()).toBeFalsy()
  })

  it('lists every goal that is set, besides body weight', () => {
    const today = new Date().toISOString().slice(0, 10)
    mountWith({
      unit: 'kg', bodyweight: [{ d: '2026-01-01', w: 60 }, { d: '2026-10-01', w: 65 }], targetW: 70,
      sessionsGoal: 5, cardioGoalMin: 75,
      liftGoals: [{ id: 'l1', exId: '0025', target: 100 }],
      timeGoals: [{ id: 't1', km: 5, minutes: 30 }],
      workouts: [{ d: today, entries: [{ id: '0025', sets: [{ w: 80, r: 5, done: true }] }] }],
    })
    const text = rows()
    expect(text).toHaveLength(5)
    expect(text[0]).toContain('Body weight')
    expect(text[0]).toContain('65 → 70 kg')
    expect(text[1]).toContain('Sessions this week')
    expect(text[1]).toContain('1 / 5')
    expect(text[2]).toContain('Cardio this week')
    expect(text[3]).toContain('Est. 1RM')
    expect(text[3]).toContain('→ 100 kg')
    expect(text[4]).toContain('5 km')
    expect(text[4]).toContain('— → 30:00')
  })

  it('opens the goals sheet from its button', () => {
    mountWith({ sessionsGoal: 4 })
    act(() => { [...goalsCard().querySelectorAll('button')].find(b => b.textContent.includes('Edit goals')).click() })
    expect(mocks.goalsSheet).toHaveBeenCalled()
  })
})
