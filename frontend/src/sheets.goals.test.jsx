// @vitest-environment happy-dom
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { goalsSheet } from './sheets.jsx'

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
const S = () => useStore.getState().S

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  useStore.setState(s => ({ S: { ...s.S, unit: 'kg', workouts: [], bodyweight: [], targetW: null, sessionsGoal: 0, cardioGoalMin: 0, liftGoals: [], timeGoals: [] }, user: null }))
  document.body.innerHTML = ''
})
afterEach(() => { mounted.splice(0).forEach(r => act(() => r.unmount())) })

const button = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text))

describe('the goals sheet', () => {
  it('sets the sessions and cardio goals with their steppers', () => {
    goalsSheet()
    const host = renderTop()
    const steppers = [...host.querySelectorAll('.stp')]
    act(() => { steppers[0].querySelector('button[aria-label="Increase"]').click() })
    expect(S().sessionsGoal).toBe(1)
    act(() => { steppers[1].querySelector('button[aria-label="Increase"]').click() })
    expect(S().cardioGoalMin).toBe(15)
  })

  it('adds a time goal for 5 km in 30 minutes, edits it and removes it', () => {
    goalsSheet()
    const host = renderTop()
    act(() => { button(host, 'Add a time goal').click() })
    expect(S().timeGoals).toMatchObject([{ km: 5, minutes: 30 }])
    const row = host.querySelector('[aria-label="Remove goal"]').parentElement
    act(() => { row.querySelectorAll('.stp')[1].querySelector('button[aria-label="Decrease"]').click() })
    expect(S().timeGoals[0].minutes).toBe(29)
    act(() => { host.querySelector('[aria-label="Remove goal"]').click() })
    expect(S().timeGoals).toEqual([])
  })

  it('removes a lift goal', () => {
    useStore.setState(s => ({ S: { ...s.S, liftGoals: [{ id: 'a', exId: '0025', target: 100 }] } }))
    goalsSheet()
    const host = renderTop()
    expect(host.textContent).toContain('Est. 1RM')
    act(() => { host.querySelector('[aria-label="Remove goal"]').click() })
    expect(S().liftGoals).toEqual([])
  })
})
