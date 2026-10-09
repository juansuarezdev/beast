// What the iPhone Live Activity (lock screen and Dynamic Island) shows for a running workout: the
// next set to do and, during a rest, how long is left. Pure, so it is tested without a browser;
// live-activity-sync.js is the part that talks to the native plugin.

import { t } from './i18n.js'
import { doneUnits, setUnits } from './history.js'
import { isSideSet } from './workout-model.js'

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

// The next undone row, looking from the current exercise onwards and then back at anything
// before it that was skipped. null when every set is done.
export function nextSetSummary(active, { unit = 'kg', nameOf } = {}) {
  const entries = active?.entries || []
  if (!entries.length) return null
  const from = Number.isInteger(active.cur) && active.cur >= 0 && active.cur < entries.length ? active.cur : 0
  for (let k = 0; k < entries.length; k++) {
    const entry = entries[(from + k) % entries.length]
    const sets = entry.sets || []
    const at = sets.findIndex(s => doneUnits(s) < setUnits(s))
    if (at < 0) continue
    const text = loadText(pendingFields(sets[at]), unit)
    return {
      title: nameOf(entry.id),
      detail: t('Set {0}', at + 1 + '/' + sets.length) + (text ? ' · ' + text : ''),
    }
  }
  return null
}

// The whole payload the native side draws. Strings arrive ready (translated and formatted);
// restState says how to read the three time fields. null when no workout is running — a
// backfill or an edit of a saved workout is not a session in progress.
export function liveActivityState(active, timer, { unit = 'kg', nameOf, labels } = {}) {
  if (!active || active.backfill || active.editingWorkoutId) return null
  const next = nextSetSummary(active, { unit, nameOf })
  const state = {
    workoutName: active.name || '',
    title: next ? next.title : active.name || '',
    detail: next ? next.detail : labels.finish,
    restLabel: labels.rest,
    readyLabel: labels.ready,
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
