// What the iPhone Live Activity (lock screen and Dynamic Island) shows for a running workout: the
// next set to do and, during a rest, how long is left. Pure, so it is tested without a browser;
// live-activity-sync.js is the part that talks to the native plugin.

import { t } from './i18n.js'
import { bestWeightForEntry, doneUnits, setUnits } from './history.js'
import { isSideSet, setType } from './workout-model.js'

const num = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))

// What the lifter still has to do in one row: the row itself, or the side of a per-side row that
// is not ticked yet (left first).
function pendingFields(row) {
  if (!isSideSet(row)) return row
  return row.sides.L.done ? row.sides.R : row.sides.L
}

function loadText(fields, unit) {
  const w = fields.w > 0 ? num(fields.w) + ' ' + unit : ''
  const timed = fields.sec > 0 && !(fields.r > 0)
  const work = timed ? fields.sec + 's' : fields.r > 0 ? fields.r : ''
  if (w && work) return timed ? w + ' · ' + work : w + ' × ' + work
  if (w) return w
  if (work) return timed ? work : work + ' ' + t('reps')
  return ''
}

// Every undone row in the order the lifter reaches them: from the current exercise onwards, then
// back at anything before it that was skipped.
function* undoneRows(active) {
  const entries = active?.entries || []
  if (!entries.length) return
  const from = Number.isInteger(active.cur) && active.cur >= 0 && active.cur < entries.length ? active.cur : 0
  for (let k = 0; k < entries.length; k++) {
    const e = (from + k) % entries.length
    const sets = entries[e].sets || []
    for (let s = 0; s < sets.length; s++) if (doneUnits(sets[s]) < setUnits(sets[s])) yield { e, s, entry: entries[e], row: sets[s] }
  }
}

function describe({ s, entry, row }, unit, nameOf) {
  const text = loadText(pendingFields(row), unit)
  return {
    title: nameOf(entry.id),
    detail: t('Set {0}', s + 1 + '/' + (entry.sets || []).length) + (text ? ' · ' + text : ''),
  }
}

// The next undone row. null when every set is done.
export function nextSetSummary(active, { unit = 'kg', nameOf } = {}) {
  for (const hit of undoneRows(active)) return describe(hit, unit, nameOf)
  return null
}

// A row the lock-screen button can tick on its own: a plain straight set of reps with a weight
// already filled in, in an exercise that is not part of a superset (those rest in a different
// rhythm) — nothing that needs typing, a hold, a side, or a drop.
const isSimpleRow = ({ entry, row }) => !entry.sg && !isSideSet(row) && setType(row) === 'straight' && row.r > 0 && !(row.sec > 0)

// The rows the lock-screen button can tick one after another, in order, each with the rest it
// earns. It stops at the first row that needs the app, since ticking past it would skip it.
export function upcomingSets(active, { unit = 'kg', nameOf, restFor = () => 0, max = 20 } = {}) {
  const out = []
  for (const hit of undoneRows(active)) {
    if (!isSimpleRow(hit) || out.length >= max) break
    out.push({ e: hit.e, s: hit.s, ...describe(hit, unit, nameOf), rest: Math.max(0, Math.round(restFor(hit.e, hit.s) || 0)) })
  }
  return out
}

// What ticking a set from the lock screen does to the saved session once the app is back: the
// row is done and, if that finished the exercise, its top weight is captured and the marker
// moves on. No sheets, no rest — the rest was already counting on the lock screen. False when
// there was nothing to tick (already done, gone, or not a plain row).
export function completeSetFromLock(S, e, s) {
  const entries = S?.active?.entries
  const entry = entries?.[e]
  const row = entry?.sets?.[s]
  if (!row || isSideSet(row) || row.done) return false
  row.done = true
  if (row.planSec != null) delete row.planSec
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
export function liveActivityState(active, timer, { unit = 'kg', nameOf, labels, restFor } = {}) {
  if (!active || active.backfill || active.editingWorkoutId) return null
  const next = nextSetSummary(active, { unit, nameOf })
  const state = {
    workoutName: active.name || '',
    title: next ? next.title : active.name || '',
    detail: next ? next.detail : labels.finish,
    restLabel: labels.rest,
    readyLabel: labels.ready,
    doneLabel: labels.done,
    finishLabel: labels.finish,
    sessionId: String(active.id ?? ''),
    queue: upcomingSets(active, { unit, nameOf, restFor }),
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
