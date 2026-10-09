// What the iPhone Live Activity (lock screen and Dynamic Island) shows for a running workout: the
// next set to do and, during a rest, how long is left, with controls to adjust and tick the set.
// Pure, so it is tested without a browser; live-activity-sync.js is the part that talks to the
// native plugin.

import { t } from './i18n.js'
import { bestWeightForEntry, cascadeWeight, doneUnits, isBw, modeOf, repStep, setUnits } from './history.js'
import { weightIncrement } from './progression.js'
import { fromSpeed, toSpeed } from './speed.js'
import { WEIGHT_ORIGIN_MANUAL, isSideSet, setSideField, toggleSide } from './workout-model.js'

const num = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))
const cfgOf = entry => ({ ...(entry.target || {}), id: entry.id })
const isStraight = x => !x || (x.type !== 'dropset' && x.type !== 'restpause')

// The values of the row still to do: the row itself, or the side of a per-side row.
const valuesOf = ({ row, side }) => (side ? row.sides[side] : row)

// How the load of a row reads, by the kind of exercise it is: weight × reps, reps alone for a
// bodyweight move, a time, or a duration at a speed.
function loadText(mode, v, unit, speedUnit) {
  if (mode === 'cardio') {
    const run = v.min > 0 ? num(v.min) + ' min' : ''
    const speed = v.speed > 0 ? num(toSpeed(v.speed, speedUnit)) + ' ' + (speedUnit === 'mph' ? 'mph' : 'km/h') : ''
    return [run, speed].filter(Boolean).join(' · ')
  }
  const w = v.w > 0 ? num(v.w) + ' ' + unit : ''
  const timed = v.sec > 0 && !(v.r > 0)
  const work = timed ? v.sec + 's' : v.r > 0 ? v.r : ''
  if (w && work) return timed ? w + ' · ' + work : w + ' × ' + work
  if (w) return w
  if (work) return timed ? work : work + ' ' + t('reps')
  return ''
}

// Every undone row, in the order the lifter reaches them: from the current exercise onwards, then
// back at anything before it that was skipped. A per-side row comes out once per side still to do
// (left first), since each side is ticked on its own.
function* undoneRows(active) {
  const entries = active?.entries || []
  if (!entries.length) return
  const from = Number.isInteger(active.cur) && active.cur >= 0 && active.cur < entries.length ? active.cur : 0
  for (let k = 0; k < entries.length; k++) {
    const e = (from + k) % entries.length
    const entry = entries[e]
    const sets = entry.sets || []
    for (let s = 0; s < sets.length; s++) {
      const row = sets[s]
      if (isSideSet(row)) {
        for (const side of ['L', 'R']) if (!row.sides[side].done) yield { e, s, side, entry, row }
      } else if (doneUnits(row) < setUnits(row)) yield { e, s, side: '', entry, row }
    }
  }
}

function describe(hit, { unit, speedUnit, nameOf }) {
  const { s, side, entry } = hit
  const text = loadText(modeOf(cfgOf(entry)), valuesOf(hit), unit, speedUnit)
  const setLabel = t('Set {0}', s + 1 + '/' + (entry.sets || []).length) + (side ? ' · ' + side : '')
  return { title: nameOf(entry.id), setLabel, detail: setLabel + (text ? ' · ' + text : '') }
}

// The next undone row. null when every set is done.
export function nextSetSummary(active, { unit = 'kg', speedUnit = 'kmh', nameOf } = {}) {
  for (const hit of undoneRows(active)) {
    const d = describe(hit, { unit, speedUnit, nameOf })
    return { title: d.title, detail: d.detail }
  }
  return null
}

// What the lock screen lets the lifter adjust on a row, by the kind of exercise — the same columns
// and steps the workout screen shows: weight and reps for a loaded lift, reps alone for a
// bodyweight one (weight too once it carries an added load), seconds for a hold (and its weight),
// minutes and speed for cardio. Speed is shown in the profile's unit and goes back to km/h on
// ticking. null when the row needs the app: a drop set, a rest-pause, or a row without the
// number its kind is about.
function fieldsFor({ entry, row, side }, { unit, speedUnit }) {
  const cfg = cfgOf(entry)
  const mode = modeOf(cfg)
  const v = valuesOf({ row, side })
  if (!isStraight(row) || !isStraight(v)) return null
  const bw = isBw(cfg) && mode !== 'cardio'
  const added = bw && entry.sets.some(x => (isSideSet(x) ? x.sides.L.w > 0 || x.sides.R.w > 0 : x.w > 0))
  const weight = { k: 'w', v: v.w || 0, step: weightIncrement(cfg, unit), u: unit }
  if (mode === 'cardio') {
    if (!(v.min > 0)) return null
    return [
      { k: 'min', v: v.min, step: 1, u: 'min' },
      { k: 'speed', v: toSpeed(v.speed || 0, speedUnit), step: 0.5, u: speedUnit === 'mph' ? 'mph' : 'km/h' },
    ]
  }
  if (mode === 'time') {
    if (!(v.sec > 0)) return null
    return [{ k: 'sec', v: v.sec, step: 5, u: 's' }, ...(bw && !added ? [] : [weight])]
  }
  if (!(v.r > 0)) return null
  const reps = { k: 'r', v: v.r, step: side ? 1 : repStep(cfg), u: t('reps') }
  return bw && !added ? [reps] : [weight, reps]
}

// The rows the lock-screen button can tick one after another, in order, each with the numbers it
// can adjust and the rest it earns. It stops at the first row that needs the app — a drop set, a
// superset member, a row missing its numbers — since ticking past it would skip it.
export function upcomingSets(active, { unit = 'kg', speedUnit = 'kmh', nameOf, restFor = () => 0, max = 20 } = {}) {
  const out = []
  for (const hit of undoneRows(active)) {
    if (out.length >= max || hit.entry.sg) break
    const fields = fieldsFor(hit, { unit, speedUnit })
    if (!fields) break
    // After the left side of a per-side row there is nothing to rest from yet: the rest comes with
    // the right side, which finishes the set.
    const rest = hit.side === 'L' ? 0 : Math.max(0, Math.round(restFor(hit.e, hit.s) || 0))
    out.push({ e: hit.e, s: hit.s, side: hit.side, ...describe(hit, { unit, speedUnit, nameOf }), rest, fields })
  }
  return out
}

// What ticking a set from the lock screen does to the saved session once the app is back: the
// numbers the lifter settled on are written into the row (a changed weight is a typed one, so it
// carries to the sets after it exactly as typing it would), the row is done, and if that finished
// the exercise its top weight is captured and the marker moves on. No sheets, no rest — the rest
// was already counting on the lock screen. False when there was nothing to tick (already done,
// gone, or not a row of the kind the lock screen ticks).
export function completeSetFromLock(S, e, s, { side = '', fields = [], speedUnit = 'kmh' } = {}) {
  const entries = S?.active?.entries
  const entry = entries?.[e]
  let row = entry?.sets?.[s]
  if (!row) return false
  if (isSideSet(row) !== !!side) return false
  if (side ? row.sides[side].done : row.done) return false

  for (const { k, v } of fields) {
    if (!Number.isFinite(v)) continue
    const value = k === 'speed' ? fromSpeed(v, speedUnit) : v
    const was = side ? row.sides[side][k] : row[k]
    if (was === value) continue
    row = side ? setSideField(row, side, k, value) : { ...row, [k]: value }
    if (k === 'sec') delete row.planSec
    if (k === 'w') {
      // A weight changed by hand is a manual one; the sets still to do follow it.
      row = side ? setSideField(row, side, 'weightOrigin', WEIGHT_ORIGIN_MANUAL) : { ...row, weightOrigin: WEIGHT_ORIGIN_MANUAL }
      entry.sets[s] = row
      entry.sets = cascadeWeight(entry.sets, s, value, side || undefined)
      row = entry.sets[s]
    }
  }
  if (side) row = toggleSide(row, side)
  else {
    row = { ...row, done: true }
    if (row.planSec != null) delete row.planSec
  }
  entry.sets[s] = row

  if (entry.sets.every(x => x.done)) {
    entry.topW = bestWeightForEntry(entry) || null
    const nextIdx = entries.findIndex(x => (x.sets || []).some(y => doneUnits(y) < setUnits(y)))
    if (nextIdx >= 0 && S.active.cur === e) S.active.cur = nextIdx
  }
  return true
}

// The whole payload the native side draws. Strings arrive ready (translated and formatted);
// restState says how to read the three time fields. null when no workout is running — a
// backfill or an edit of a saved workout is not a session in progress.
export function liveActivityState(active, timer, { unit = 'kg', speedUnit = 'kmh', nameOf, labels, restFor } = {}) {
  if (!active || active.backfill || active.editingWorkoutId) return null
  const next = nextSetSummary(active, { unit, speedUnit, nameOf })
  const state = {
    workoutName: active.name || '',
    title: next ? next.title : active.name || '',
    detail: next ? next.detail : labels.finish,
    restLabel: labels.rest,
    readyLabel: labels.ready,
    doneLabel: labels.done,
    finishLabel: labels.finish,
    sessionId: String(active.id ?? ''),
    queue: upcomingSets(active, { unit, speedUnit, nameOf, restFor }),
    restState: 'none',
    restStartedAt: 0,
    restEndsAt: 0,
    pausedLeft: 0,
  }
  if (!timer) return state
  if (timer.ready) return { ...state, restState: 'ready' }
  if (timer.paused) return { ...state, restState: 'paused', pausedLeft: Math.max(0, Math.round(timer.left)) }
  return { ...state, restState: 'running', restEndsAt: timer.endsAt, restStartedAt: timer.endsAt - timer.total * 1000 }
}
